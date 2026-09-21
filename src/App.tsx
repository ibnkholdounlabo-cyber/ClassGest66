import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { StudentPortal } from './components/StudentPortal';
import { TeacherLogin } from './components/TeacherLogin';
import { StudentProfile } from './components/StudentProfile';
import { TeacherDashboard } from './components/TeacherDashboard';
import { Student, TeacherUser, ClassGroup, AuthStudentSession, AuthTeacherSession } from './types';
import { School, AlertTriangle, X } from 'lucide-react';

const SESSION_DURATION_MS = 30 * 60 * 1000; // Limite stricte de 30 minutes par session

export default function App() {
  // Current URL path tracking (e.g. '/' or '/prof')
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  // Message d'alerte lors de l'expiration d'une session de 30 min
  const [expiredNotice, setExpiredNotice] = useState<string | null>(null);

  // Student session avec vérification d'expiration au démarrage
  const [studentSession, setStudentSession] = useState<AuthStudentSession | null>(() => {
    try {
      const saved = localStorage.getItem('intranet_student_session');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      const now = Date.now();
      const expiresAt = parsed.expiresAt || (parsed.loginTime ? parsed.loginTime + SESSION_DURATION_MS : null);
      if (expiresAt && now > expiresAt) {
        localStorage.removeItem('intranet_student_session');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  // Teacher session avec vérification d'expiration au démarrage
  const [teacherSession, setTeacherSession] = useState<AuthTeacherSession | null>(() => {
    try {
      const saved = localStorage.getItem('intranet_teacher_session');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      const now = Date.now();
      const expiresAt = parsed.expiresAt || (parsed.loginTime ? parsed.loginTime + SESSION_DURATION_MS : null);
      if (expiresAt && now > expiresAt) {
        localStorage.removeItem('intranet_teacher_session');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  // Browser navigation (Back / Forward) support & URL detection
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  };

  const handleStudentLogout = useCallback((expiredMessage?: string) => {
    setStudentSession(null);
    try {
      localStorage.removeItem('intranet_student_session');
    } catch (e) {
      console.error(e);
    }
    if (expiredMessage) {
      setExpiredNotice(expiredMessage);
    }
    navigate('/');
  }, []);

  const handleTeacherLogout = useCallback((expiredMessage?: string) => {
    setTeacherSession(null);
    try {
      localStorage.removeItem('intranet_teacher_session');
    } catch (e) {
      console.error(e);
    }
    if (expiredMessage) {
      setExpiredNotice(expiredMessage);
    }
    navigate('/prof');
  }, []);

  // Déconnexion automatique après 30 minutes
  useEffect(() => {
    const checkExpiration = () => {
      const now = Date.now();
      if (studentSession?.expiresAt && now >= studentSession.expiresAt) {
        handleStudentLogout('Votre session élève de 30 minutes a expiré. Pour des raisons de sécurité, veuillez vous reconnecter.');
      } else if (teacherSession?.expiresAt && now >= teacherSession.expiresAt) {
        handleTeacherLogout('Votre session professeur de 30 minutes a expiré. Pour des raisons de sécurité, veuillez vous reconnecter.');
      }
    };

    // Vérifier toutes les 3 secondes
    const interval = setInterval(checkExpiration, 3000);
    return () => clearInterval(interval);
  }, [studentSession?.expiresAt, teacherSession?.expiresAt, handleStudentLogout, handleTeacherLogout]);

  // Écouteur global des événements d'expiration déclenchés par l'API (401)
  useEffect(() => {
    const handleSessionExpiredEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      const msg = customEvent.detail?.message || 'Votre session de 30 minutes est arrivée à échéance. Veuillez vous reconnecter.';
      if (studentSession) {
        handleStudentLogout(msg);
      } else if (teacherSession) {
        handleTeacherLogout(msg);
      } else {
        setExpiredNotice(msg);
      }
    };

    window.addEventListener('intranet:session_expired', handleSessionExpiredEvent);
    return () => window.removeEventListener('intranet:session_expired', handleSessionExpiredEvent);
  }, [studentSession, teacherSession, handleStudentLogout, handleTeacherLogout]);

  const handleStudentLoginSuccess = (session: {
    student: Student;
    token: string;
    classInfo: ClassGroup;
    expiresAt?: number;
    loginTime?: number;
  }) => {
    setExpiredNotice(null);
    const now = Date.now();
    const sessionWithTiming: AuthStudentSession = {
      ...session,
      loginTime: session.loginTime || now,
      expiresAt: session.expiresAt || (now + SESSION_DURATION_MS),
      durationMinutes: 30
    };
    setStudentSession(sessionWithTiming);
    setTeacherSession(null);
    try {
      localStorage.setItem('intranet_student_session', JSON.stringify(sessionWithTiming));
      localStorage.removeItem('intranet_teacher_session');
    } catch (e) {
      console.error(e);
    }
    navigate('/');
  };

  const handleTeacherLoginSuccess = (session: {
    teacher: TeacherUser;
    token: string;
    expiresAt?: number;
    loginTime?: number;
  }) => {
    setExpiredNotice(null);
    const now = Date.now();
    const sessionWithTiming: AuthTeacherSession = {
      ...session,
      loginTime: session.loginTime || now,
      expiresAt: session.expiresAt || (now + SESSION_DURATION_MS),
      durationMinutes: 30
    };
    setTeacherSession(sessionWithTiming);
    setStudentSession(null);
    try {
      localStorage.setItem('intranet_teacher_session', JSON.stringify(sessionWithTiming));
      localStorage.removeItem('intranet_student_session');
    } catch (e) {
      console.error(e);
    }
    navigate('/prof');
  };

  const isProfRoute = currentPath === '/prof' || currentPath.startsWith('/prof/');

  // Compute active view for Header
  const computedHeaderView = isProfRoute
    ? (teacherSession ? 'teacher' : 'teacher-login')
    : (studentSession ? 'student' : 'student-login');

  const currentExpiresAt = teacherSession?.expiresAt || studentSession?.expiresAt || null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 selection:bg-indigo-500 selection:text-white">
      {/* Intranet Navigation Header avec compte à rebours 30 min */}
      <Header
        currentView={computedHeaderView}
        currentPath={currentPath}
        studentSession={studentSession ? { student: studentSession.student, token: studentSession.token, expiresAt: studentSession.expiresAt } : null}
        teacherSession={teacherSession ? { teacher: teacherSession.teacher, token: teacherSession.token, expiresAt: teacherSession.expiresAt } : null}
        sessionExpiresAt={currentExpiresAt}
        onLogoutStudent={() => handleStudentLogout()}
        onLogoutTeacher={() => handleTeacherLogout()}
        onNavigateHome={() => navigate('/')}
        onNavigateToProf={() => navigate('/prof')}
      />

      {/* Notification d'expiration de session (30 min) */}
      {expiredNotice && (
        <div className="bg-amber-500 text-slate-950 px-4 py-3 shadow-md transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-sm font-medium">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-slate-950 shrink-0" />
              <span>{expiredNotice}</span>
            </div>
            <button
              onClick={() => setExpiredNotice(null)}
              className="p-1 hover:bg-amber-600/30 rounded-lg transition-colors cursor-pointer"
              title="Fermer ce message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {isProfRoute ? (
          // URL /prof
          teacherSession ? (
            <TeacherDashboard
              session={teacherSession}
              onLoginSuccess={handleTeacherLoginSuccess}
              onLogout={() => handleTeacherLogout()}
            />
          ) : (
            <TeacherLogin
              onSuccess={handleTeacherLoginSuccess}
              onNavigateHome={() => navigate('/')}
            />
          )
        ) : (
          // URL / (Root: Student space)
          studentSession ? (
            <StudentProfile
              student={studentSession.student}
              token={studentSession.token}
              onLogout={() => handleStudentLogout()}
            />
          ) : (
            <StudentPortal
              onSuccess={handleStudentLoginSuccess}
            />
          )
        )}
      </main>

      {/* Academic Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-300">Intranet Scolaire des Établissements</span>
            <span className="text-slate-600">•</span>
            <span>Réseau local sécurisé (Sessions 30 min)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            {isProfRoute && (
              <button
                onClick={() => navigate('/')}
                className="hover:text-indigo-400 transition-colors cursor-pointer"
              >
                ← Portail Élèves
              </button>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Serveur Express / Node.js
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
