import React, { useState, useEffect } from 'react';
import { GraduationCap, ShieldCheck, LogOut, School, Clock } from 'lucide-react';
import { Student, TeacherUser } from '../types';

interface HeaderProps {
  currentView: 'student' | 'teacher' | 'student-login' | 'teacher-login';
  currentPath: string;
  studentSession: { student: Student; token: string; expiresAt?: number } | null;
  teacherSession: { teacher: TeacherUser; token: string; expiresAt?: number } | null;
  sessionExpiresAt?: number | null;
  onLogoutStudent: () => void;
  onLogoutTeacher: () => void;
  onNavigateHome: () => void;
  onNavigateToProf: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  currentPath,
  studentSession,
  teacherSession,
  sessionExpiresAt,
  onLogoutStudent,
  onLogoutTeacher,
  onNavigateHome
}) => {
  // Session countdown timer state
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionExpiresAt) {
      setRemainingSec(null);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((sessionExpiresAt - Date.now()) / 1000));
      setRemainingSec(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [sessionExpiresAt]);

  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isWarningTime = remainingSec !== null && remainingSec <= 300; // Less than 5 minutes

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Server Info */}
          <div
            onClick={onNavigateHome}
            className="flex items-center gap-3 cursor-pointer group"
            title="Aller au portail élève"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white group-hover:text-indigo-200 transition-colors">Intranet Scolaire</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Serveur Local En Ligne
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Réseau local sécurisé de l'établissement</p>
            </div>
          </div>

          {/* Right Area */}
          <div className="flex items-center gap-3">
            {/* Session Timer Badge when authenticated */}
            {remainingSec !== null && (studentSession || teacherSession) && (
              <div
                title="Durée de session limitée à 30 minutes pour votre sécurité"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors border ${
                  isWarningTime
                    ? 'bg-amber-950/70 border-amber-600/70 text-amber-300 animate-pulse'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 ${isWarningTime ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="hidden md:inline text-[11px] font-sans font-normal text-slate-400 mr-0.5">
                  Session :
                </span>
                <span className="font-semibold">{formatSessionTime(remainingSec)}</span>
              </div>
            )}

            {/* Student Session Active */}
            {studentSession && currentView === 'student' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-900/60 border border-indigo-700/60 text-indigo-200 text-xs font-semibold">
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                  <span>Espace Élève</span>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-semibold text-slate-200">
                    {studentSession.student.firstName} {studentSession.student.lastName}
                  </p>
                  <p className="text-[11px] text-slate-400">{studentSession.student.className || 'Élève'}</p>
                </div>
                <button
                  id="btn-logout-student"
                  onClick={onLogoutStudent}
                  title="Se déconnecter"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </div>
            )}

            {/* Teacher Session Active */}
            {teacherSession && currentView === 'teacher' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-900/60 border border-indigo-700/60 text-indigo-200 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Espace Professeur</span>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-semibold text-slate-200">{teacherSession.teacher.fullName}</p>
                  <p className="text-[11px] text-slate-400">Gestionnaire des classes</p>
                </div>
                <button
                  id="btn-logout-teacher"
                  onClick={onLogoutTeacher}
                  title="Se déconnecter"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </div>
            )}

            {/* When user explicitly accesses /prof, show link back to student space if not logged in */}
            {!studentSession && !teacherSession && currentPath === '/prof' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-indigo-300 font-mono bg-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-800/60">
                  /prof
                </span>
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Portail Élève
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
