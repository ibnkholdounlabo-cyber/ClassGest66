import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StudentPortal } from './components/StudentPortal';
import { TeacherLogin } from './components/TeacherLogin';
import { StudentProfile } from './components/StudentProfile';
import { TeacherDashboard } from './components/TeacherDashboard';
import { Student, TeacherUser, ClassGroup } from './types';
import { School } from 'lucide-react';

export default function App() {
  // Current URL path tracking (e.g. '/' or '/prof')
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  // Student session
  const [studentSession, setStudentSession] = useState<{
    student: Student;
    token: string;
    classInfo: ClassGroup;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('intranet_student_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Teacher session
  const [teacherSession, setTeacherSession] = useState<{
    teacher: TeacherUser;
    token: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('intranet_teacher_session');
      return saved ? JSON.parse(saved) : null;
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

  const handleStudentLoginSuccess = (session: { student: Student; token: string; classInfo: ClassGroup }) => {
    setStudentSession(session);
    setTeacherSession(null);
    try {
      localStorage.setItem('intranet_student_session', JSON.stringify(session));
      localStorage.removeItem('intranet_teacher_session');
    } catch (e) {
      console.error(e);
    }
    navigate('/');
  };

  const handleStudentLogout = () => {
    setStudentSession(null);
    try {
      localStorage.removeItem('intranet_student_session');
    } catch (e) {
      console.error(e);
    }
    navigate('/');
  };

  const handleTeacherLoginSuccess = (session: { teacher: TeacherUser; token: string }) => {
    setTeacherSession(session);
    setStudentSession(null);
    try {
      localStorage.setItem('intranet_teacher_session', JSON.stringify(session));
      localStorage.removeItem('intranet_student_session');
    } catch (e) {
      console.error(e);
    }
    navigate('/prof');
  };

  const handleTeacherLogout = () => {
    setTeacherSession(null);
    try {
      localStorage.removeItem('intranet_teacher_session');
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 selection:bg-indigo-500 selection:text-white">
      {/* Intranet Navigation Header */}
      <Header
        currentView={computedHeaderView}
        currentPath={currentPath}
        studentSession={studentSession ? { student: studentSession.student, token: studentSession.token } : null}
        teacherSession={teacherSession}
        onLogoutStudent={handleStudentLogout}
        onLogoutTeacher={handleTeacherLogout}
        onNavigateHome={() => navigate('/')}
        onNavigateToProf={() => navigate('/prof')}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {isProfRoute ? (
          // URL /prof
          teacherSession ? (
            <TeacherDashboard
              session={teacherSession}
              onLoginSuccess={handleTeacherLoginSuccess}
              onLogout={handleTeacherLogout}
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
              onLogout={handleStudentLogout}
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
            <span>Réseau local sécurisé</span>
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
