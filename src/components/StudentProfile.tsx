import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Info,
  Paperclip,
  Upload,
  Download,
  Trash2,
  FileCode,
  FileText
} from 'lucide-react';
import { Student, StudentTodayAttendance } from '../types';
import { api } from '../api';
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
  const [todayAttendance, setTodayAttendance] = useState<StudentTodayAttendance | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState<boolean>(true);
  const [isMarking, setIsMarking] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTodayAttendance = useCallback(async () => {
    try {
      const data = await api.studentGetTodayAttendance(token);
      setTodayAttendance(data);
    } catch (err: any) {
      console.warn('Erreur chargement présence du jour:', err);
    } finally {
      setLoadingAttendance(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);

  const handleMarkPresence = async () => {
    if (isMarking || todayAttendance?.hasMarkedToday) return;
    setIsMarking(true);
    setStatusFeedback(null);
    try {
      const res = await api.studentMarkPresenceToday(token);
      setTodayAttendance({
        date: res.session.date,
        session: res.session,
        record: res.record,
        hasMarkedToday: true,
        markedAt: res.record.markedByStudentAt
      });
      setStatusFeedback({
        type: 'success',
        message: 'Votre présence a été validée avec succès pour la séance d’aujourd’hui !'
      });
    } catch (err: any) {
      setStatusFeedback({
        type: 'error',
        message: err.message || 'Impossible de marquer votre présence'
      });
    } finally {
      setIsMarking(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setStatusFeedback({
        type: 'error',
        message: 'Le fichier est trop volumineux. La taille maximale autorisée est de 25 Mo.'
      });
      return;
    }

    setIsUploading(true);
    setStatusFeedback(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileUrl = event.target?.result as string;
      try {
        const res = await api.studentUploadActivityFile(token, {
          fileUrl,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size
        });
        setTodayAttendance(prev => ({
          date: res.session.date,
          session: res.session,
          record: res.record,
          hasMarkedToday: Boolean(res.record.markedByStudentAt || prev?.hasMarkedToday),
          markedAt: res.record.markedByStudentAt || prev?.markedAt
        }));
        setStatusFeedback({
          type: 'success',
          message: `Fichier "${file.name}" déposé avec succès pour cette séance !`
        });
      } catch (err: any) {
        setStatusFeedback({
          type: 'error',
          message: err.message || 'Erreur lors du dépôt du fichier d’activité'
        });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      setIsUploading(false);
      setStatusFeedback({
        type: 'error',
        message: 'Erreur lors de la lecture du fichier'
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteActivityFile = async () => {
    if (!window.confirm('Voulez-vous retirer votre fichier d’activité pour cette séance ?')) {
      return;
    }
    setIsUploading(true);
    setStatusFeedback(null);
    try {
      const res = await api.studentDeleteActivityFile(token);
      if (res.record) {
        setTodayAttendance(prev => prev ? ({
          ...prev,
          record: res.record || null
        }) : null);
      }
      setStatusFeedback({
        type: 'success',
        message: 'Le fichier d’activité a été retiré.'
      });
    } catch (err: any) {
      setStatusFeedback({
        type: 'error',
        message: err.message || 'Erreur lors du retrait du fichier'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 Ko';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const formatTime = (isoStr?: string): string => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

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

                  {/* Bouton de présence pour l'élève en haut à côté du nom */}
                  {todayAttendance?.hasMarkedToday ? (
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 opacity-90 cursor-not-allowed shadow-xs"
                      title={`Présence confirmée pour aujourd’hui (${formatTime(todayAttendance.markedAt) ? `à ${formatTime(todayAttendance.markedAt)}` : 'validée'})`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Présence confirmée {formatTime(todayAttendance.markedAt) ? `(${formatTime(todayAttendance.markedAt)})` : '✓'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="btn-mark-presence-student"
                      onClick={handleMarkPresence}
                      disabled={isMarking || loadingAttendance}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all cursor-pointer shadow-sm hover:shadow ring-2 ring-emerald-300"
                      title="Cliquez pour marquer votre présence pour la séance d’aujourd’hui (sera désactivé après clic)"
                    >
                      {isMarking ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Validation...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Marquer ma présence</span>
                        </>
                      )}
                    </button>
                  )}
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
                <span>Profil géré par l'enseignant</span>
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

      {/* SECTION SÉANCE DU JOUR & ACTIVITÉ ÉLÈVE */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900">
                  {todayAttendance?.session?.title || `Séance du ${new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}`}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                  {todayAttendance?.date || new Date().toISOString().substring(0, 10)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Séance en classe • Présence et dépôt de votre activité / travail pratique
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {todayAttendance?.hasMarkedToday ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Présence confirmée {formatTime(todayAttendance.markedAt) ? `(à ${formatTime(todayAttendance.markedAt)})` : ''}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleMarkPresence}
                disabled={isMarking || loadingAttendance}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isMarking ? 'Validation...' : 'Marquer ma présence'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Message de notification d'action */}
        {statusFeedback && (
          <div className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 border transition-all ${
            statusFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center gap-2">
              {statusFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{statusFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusFeedback(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Zone de fichier d'activité */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                <span>Fichier d’activité de la séance</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Déposez votre fichier de travail pour cette séance (script Python .py, document Word, tableur Excel, PDF, archive .zip...)
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".py,.pdf,.docx,.doc,.xlsx,.xls,.zip,.png,.jpg,.jpeg,.txt,.odt"
            />
          </div>

          {todayAttendance?.record?.activityFileUrl ? (
            <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileCode className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-800 truncate" title={todayAttendance.record.activityFileName}>
                    {todayAttendance.record.activityFileName}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                    <span className="font-mono">{formatFileSize(todayAttendance.record.activityFileSize)}</span>
                    {todayAttendance.record.activityUploadedAt && (
                      <>
                        <span>•</span>
                        <span>Déposé à {formatTime(todayAttendance.record.activityUploadedAt)}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Transmis au professeur
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <a
                  href={todayAttendance.record.activityFileUrl}
                  download={todayAttendance.record.activityFileName || 'mon-activite'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors shadow-2xs"
                  title="Télécharger le fichier déposé"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Télécharger</span>
                </a>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                  title="Remplacer par une version plus récente"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Envoi...' : 'Remplacer'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteActivityFile}
                  disabled={isUploading}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                  title="Supprimer ce fichier"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/30 rounded-2xl p-6 text-center transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                {isUploading ? 'Envoi du fichier en cours...' : 'Cliquez ici pour déposer le fichier de votre activité pour cette séance'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Formats acceptés : script Python (.py), PDF, Word (.docx), Excel (.xlsx), archive (.zip)... (Taille maximale : 25 Mo)
              </p>
            </div>
          )}
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
