import React, { useState, useEffect } from 'react';
import { School, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Sparkles, Shield } from 'lucide-react';
import { api } from '../api';
import { ClassGroup, PublicStudentInfo, Student } from '../types';

interface StudentPortalProps {
  onSuccess: (session: { student: Student; token: string; classInfo: ClassGroup }) => void;
  onNavigateToProf?: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  onSuccess,
  onNavigateToProf
}) => {
  const [classes, setClasses] = useState<Array<ClassGroup & { studentCount: number }>>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<PublicStudentInfo[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentPassword, setStudentPassword] = useState<string>('');
  const [showStudentPassword, setShowStudentPassword] = useState<boolean>(false);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(true);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Load classes on mount
  useEffect(() => {
    async function loadClasses() {
      try {
        setLoadingClasses(true);
        const list = await api.getPublicClasses();
        setClasses(list);
        if (list.length > 0) {
          setSelectedClassId(list[0].id);
        }
      } catch (err: any) {
        setError('Erreur de communication avec le serveur local');
      } finally {
        setLoadingClasses(false);
      }
    }
    loadClasses();
  }, []);

  // When class changes, fetch students
  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setSelectedStudentId('');
      return;
    }

    async function loadStudents() {
      try {
        setLoadingStudents(true);
        setSelectedStudentId('');
        setStudentPassword('');
        setError('');
        const list = await api.getPublicStudents(selectedClassId);
        setStudents(list);
        if (list.length > 0) {
          setSelectedStudentId(list[0].id);
        }
      } catch (err: any) {
        setError('Erreur de chargement des élèves');
      } finally {
        setLoadingStudents(false);
      }
    }
    loadStudents();
  }, [selectedClassId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) {
      setError('Veuillez sélectionner votre classe');
      return;
    }
    if (!selectedStudentId) {
      setError('Veuillez choisir votre nom dans la liste');
      return;
    }
    if (!studentPassword.trim()) {
      setError('Veuillez saisir votre mot de passe');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const response = await api.studentLogin(selectedClassId, selectedStudentId, studentPassword.trim());
      onSuccess({
        student: response.profile,
        token: response.token,
        classInfo: response.classInfo
      });
    } catch (err: any) {
      setError(err.message || 'Mot de passe incorrect');
    } finally {
      setSubmitting(false);
    }
  };

  const fillQuickDemo = (classId: string, studentId: string, pwd: string) => {
    setSelectedClassId(classId);
    setTimeout(() => {
      setSelectedStudentId(studentId);
      setStudentPassword(pwd);
      setError('');
    }, 150);
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="w-full max-w-xl mx-auto py-10 px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-8 text-white text-center relative">
          <div className="inline-flex p-3 bg-indigo-600/30 rounded-2xl mb-3 text-indigo-300 ring-1 ring-indigo-500/30">
            <School className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Portail de Connexion Élève</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-md mx-auto">
            Choisissez votre classe et votre nom dans la liste pour accéder à votre profil scolaire.
          </p>
        </div>

        {/* Student Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Classe */}
          <div>
            <label htmlFor="select-student-class" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>1. Choisissez votre classe</span>
              {selectedClass && (
                <span className="text-xs font-normal text-slate-500">
                  {selectedClass.level} • {selectedClass.academicYear}
                </span>
              )}
            </label>

            {loadingClasses ? (
              <div className="h-11 bg-slate-100 animate-pulse rounded-xl"></div>
            ) : (
              <select
                id="select-student-class"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors cursor-pointer"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.studentCount} élèves) - {cls.level}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Nom de l'élève */}
          <div>
            <label htmlFor="select-student-name" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>2. Choisissez votre nom dans la liste</span>
              {selectedStudent && (
                <span className="text-xs font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  N° {selectedStudent.studentNumber}
                </span>
              )}
            </label>

            {loadingStudents ? (
              <div className="h-11 bg-slate-100 animate-pulse rounded-xl"></div>
            ) : students.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                Aucun élève enregistré dans cette classe pour le moment.
              </div>
            ) : (
              <select
                id="select-student-name"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors cursor-pointer"
              >
                <option value="" disabled>-- Sélectionnez votre nom --</option>
                {students.map((std) => (
                  <option key={std.id} value={std.id}>
                    {std.fullName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 3. Mot de passe */}
          <div>
            <label htmlFor="input-student-password" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>3. Saisissez votre mot de passe</span>
              <span className="text-xs font-normal text-slate-500">
                Créé par le professeur
              </span>
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="input-student-password"
                type={showStudentPassword ? 'text' : 'password'}
                value={studentPassword}
                onChange={(e) => setStudentPassword(e.target.value)}
                placeholder="Exemple : soleil42"
                autoComplete="current-password"
                className="w-full h-11 pl-10 pr-11 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors text-sm"
              />
              <button
                type="button"
                id="toggle-pwd-visibility"
                onClick={() => setShowStudentPassword(!showStudentPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                tabIndex={-1}
              >
                {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Mot de passe simple attribué par le professeur lors de la création de la liste.
            </p>
          </div>

          {/* Submit */}
          <button
            id="btn-login-student-submit"
            type="submit"
            disabled={submitting || !selectedStudentId || !studentPassword}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            {submitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Accéder à mon profil élève</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Assist */}
        <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Comptes élèves pour démonstration rapide :</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickDemo('cls-6b', 'std-6b-01', 'soleil42')}
                className="p-2.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-800">Lucas Dupont (6ème B)</div>
                <div className="text-slate-500 font-mono text-[11px]">Mot de passe : <span className="text-indigo-600 font-bold">soleil42</span></div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickDemo('cls-3a', 'std-3a-01', 'robot24')}
                className="p-2.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-800">Sarah Bernard (3ème A)</div>
                <div className="text-slate-500 font-mono text-[11px]">Mot de passe : <span className="text-indigo-600 font-bold">robot24</span></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
