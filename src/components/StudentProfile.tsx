import React, { useState } from 'react';
import {
  User,
  Calendar,
  Mail,
  Hash,
  Shield,
  CheckCircle2,
  AlertCircle,
  LogOut,
  BookOpen,
  Clock,
  Lock,
  Keyboard,
  Sparkles,
  Award,
  HelpCircle,
  Info
} from 'lucide-react';
import { Student } from '../types';
import { CoursesSection } from './CoursesSection';
import { StudentTestsSection } from './StudentTestsSection';
import { StudentQCMSection } from './StudentQCMSection';

interface StudentProfileProps {
  student: Student;
  token: string;
  onLogout: () => void;
  onProfileUpdated?: (updatedStudent: Student) => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({
  student,
  token,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'tests' | 'courses' | 'qcms' | 'profile'>('tests');

  const initials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Top Banner & Identity Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 h-28 px-6 sm:px-8 relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full text-xs font-bold">
              Portail Numérique Élève
            </span>
          </div>

          <button
            id="btn-profile-logout"
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-semibold transition-all border border-white/20 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Se déconnecter</span>
          </button>
        </div>

        <div className="px-6 sm:px-8 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 sm:-mt-10 gap-4">
            {/* Avatar & Main names */}
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center shadow-lg border-4 border-white flex-shrink-0">
                {initials}
              </div>
              <div className="pt-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    {student.firstName} {student.lastName}
                  </h1>
                  <span className="px-3 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold">
                    {student.className || 'Classe'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    student.isRepeating
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {student.isRepeating ? 'Redoublant' : 'Nouveau'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Identifiant élève : <strong>{student.studentNumber}</strong>
                </p>
              </div>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Profil géré par l'enseignant (non modifiable par l'élève)</span>
              </span>
            </div>
          </div>

          {/* Navigation Rubriques Tabs */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 overflow-x-auto">
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'tests'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>Tests de Frappe Clavier</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'tests' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
                Évaluations
              </span>
            </button>

            <button
              onClick={() => setActiveTab('courses')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'courses'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Rubrique Cours & Documents</span>
            </button>

            <button
              id="tab-student-qcms"
              onClick={() => setActiveTab('qcms')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'qcms'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Questionnaires QCM</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Mon Profil & Compte</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'tests' && (
        <StudentTestsSection classId={student.classId} token={token} />
      )}

      {activeTab === 'courses' && (
        <CoursesSection classId={student.classId} token={token} isTeacher={false} />
      )}

      {activeTab === 'qcms' && (
        <StudentQCMSection classId={student.classId} token={token} />
      )}

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Section 1: Informations Scolaires */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider text-xs">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Informations Scolaires</span>
            </h2>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Classe :</span>
                <span className="font-semibold text-slate-800">{student.className || 'Non assignée'}</span>
              </div>
              {student.level && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Niveau :</span>
                  <span className="font-semibold text-slate-800">{student.level}</span>
                </div>
              )}
              {student.academicYear && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Année scolaire :</span>
                  <span className="font-semibold text-slate-800">{student.academicYear}</span>
                </div>
              )}
              {student.room && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Salle principale :</span>
                  <span className="font-semibold text-slate-800">{student.room}</span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Numéro d’élève (INE) :</span>
                <span className="font-mono font-semibold text-indigo-700">{student.studentNumber}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Données Personnelles & Sécurité */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider text-xs">
              <Shield className="w-4 h-4 text-sky-600" />
              <span>Sécurité & Compte</span>
            </h2>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100 items-center">
                <span className="text-slate-500">Gestion du mot de passe :</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                  <Lock className="w-3.5 h-3.5" /> Créé par le professeur
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100 items-center">
                <span className="text-slate-500">Statut de scolarité :</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  student.isRepeating
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}>
                  {student.isRepeating ? 'Élève Redoublant' : 'Nouvel élève'}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Courriel scolaire :</span>
                <span className="font-medium text-slate-800">{student.email || 'Non renseigné'}</span>
              </div>

              {student.birthDate && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Date de naissance :</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(student.birthDate).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2">
                <span className="text-slate-500">Dernière connexion :</span>
                <span className="text-slate-700 text-xs">
                  {student.lastLogin ? new Date(student.lastLogin).toLocaleString('fr-FR') : 'Aujourd’hui'}
                </span>
              </div>
            </div>
          </div>

          {student.notes && (
            <div className="md:col-span-2 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs sm:text-sm text-indigo-900">
              <span className="font-semibold">Mentions particulières : </span>
              {student.notes}
            </div>
          )}

          <div className="md:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-center gap-2.5">
            <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span>
              Vos informations scolaires et personnelles sont vérifiées et gérées par l'équipe enseignante. L'élève ne peut pas modifier ses informations.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
