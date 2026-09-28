import React, { useState, useEffect, useMemo } from 'react';
import {
  ClassGroup,
  ClassFinalReport,
  TrimesterFinalReport,
  StudentFinalReport
} from '../types';
import { api } from '../api';
import {
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Keyboard,
  Paperclip,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trophy,
  User,
  Users,
  X,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface TeacherFinalReportSectionProps {
  classId: string;
  className: string;
  token: string;
  classes?: ClassGroup[];
}

export const TeacherFinalReportSection: React.FC<TeacherFinalReportSectionProps> = ({
  classId,
  className,
  token,
  classes = []
}) => {
  const [reportData, setReportData] = useState<ClassFinalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active trimester selector: 'annual', 't1', 't2', 't3'
  const [activeTrimesterKey, setActiveTrimesterKey] = useState<'annual' | 't1' | 't2' | 't3'>('annual');

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [profileFilter, setProfileFilter] = useState<'all' | 'nouveau' | 'redoublant'>('all');
  const [sortBy, setSortBy] = useState<'overall-desc' | 'name-asc' | 'total-desc' | 'typing-desc' | 'qcm-desc' | 'attendance-desc' | 'files-desc'>('overall-desc');

  // Selected student for individual report & complete history modal
  const [selectedStudent, setSelectedStudent] = useState<StudentFinalReport | null>(null);
  const [studentModalTab, setStudentModalTab] = useState<'all' | 'sessions' | 'typing' | 'qcms' | 'files'>('all');

  // Load final report from API
  const loadReport = async () => {
    if (!classId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.teacherGetClassFinalReport(token, classId);
      setReportData(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de générer la fiche finale');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [classId]);

  // Current active trimester data
  const currentTrimester: TrimesterFinalReport | null = useMemo(() => {
    if (!reportData?.trimesters) return null;
    return reportData.trimesters[activeTrimesterKey] || null;
  }, [reportData, activeTrimesterKey]);

  // Filtered and sorted students
  const filteredStudents: StudentFinalReport[] = useMemo(() => {
    if (!currentTrimester?.studentReports) return [];

    return currentTrimester.studentReports
      .filter(std => {
        if (profileFilter === 'nouveau' && std.isRepeating) return false;
        if (profileFilter === 'redoublant' && !std.isRepeating) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const fullName = `${std.lastName} ${std.firstName}`.toLowerCase();
          const num = (std.studentNumber || '').toLowerCase();
          if (!fullName.includes(q) && !num.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') {
          return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr');
        }
        if (sortBy === 'total-desc') {
          return b.totalCombinedScore - a.totalCombinedScore;
        }
        if (sortBy === 'typing-desc') {
          return b.typingAverageScore - a.typingAverageScore;
        }
        if (sortBy === 'qcm-desc') {
          return b.qcmAverageScore20 - a.qcmAverageScore20;
        }
        if (sortBy === 'attendance-desc') {
          return b.attendanceRate - a.attendanceRate;
        }
        if (sortBy === 'files-desc') {
          return b.attachedFilesCount - a.attachedFilesCount;
        }
        // Default: overall-desc
        return b.overallAverage20 - a.overallAverage20;
      });
  }, [currentTrimester, searchQuery, profileFilter, sortBy]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!currentTrimester || filteredStudents.length === 0) return;

    const headers = [
      'Rang',
      'Nom',
      'Prénom',
      'Identifiant',
      'Profil',
      'Total Scores (Pts)',
      'Moyenne Frappe (/20)',
      'Tests Frappe',
      'Vitesse Moyenne (MPM)',
      'Précision Moyenne (%)',
      'Moyenne QCM (/20)',
      'QCM Validés',
      'Moyenne Générale (/20)',
      'Séances Présent',
      'Total Séances',
      'Taux Assiduité (%)',
      'Fichiers Déposés'
    ];

    const rows = filteredStudents.map((std, idx) => [
      idx + 1,
      `"${std.lastName}"`,
      `"${std.firstName}"`,
      `"${std.studentNumber || ''}"`,
      std.isRepeating ? 'Redoublant' : 'Nouveau',
      std.totalCombinedScore,
      std.typingAverageScore,
      std.typingTestsCount,
      std.typingAverageWpm,
      std.typingAverageAccuracy,
      std.qcmAverageScore20,
      std.qcmCount,
      std.overallAverage20,
      std.presentCount,
      std.sessionsCount,
      `${std.attendanceRate}%`,
      std.attachedFilesCount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fiche_Finale_${className.replace(/\s+/g, '_')}_${currentTrimester.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
        <h3 className="font-bold text-slate-800 text-sm">Génération de la Fiche Finale de la classe...</h3>
        <p className="text-xs text-slate-400 mt-1">Calcul des totaux, moyennes de frappe, notes QCM et historiques de séances.</p>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="p-8 text-center bg-rose-50 rounded-3xl border border-rose-200 text-rose-800">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
        <h3 className="font-bold text-sm">Erreur de chargement</h3>
        <p className="text-xs mt-1">{error || 'Fiche finale introuvable'}</p>
        <button
          onClick={loadReport}
          className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Fiche Finale & Bilan Pédagogique de la Classe</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Officiel
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Classe : <strong className="text-white">{reportData.classInfo.name}</strong> • Niveau {reportData.classInfo.level}
                {reportData.classInfo.section ? ` • Section ${reportData.classInfo.section}` : ''} • Année {reportData.classInfo.academicYear}
              </p>
            </div>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 flex-wrap no-print">
          <button
            type="button"
            onClick={loadReport}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Actualiser les données"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualiser</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exporter en fichier CSV / Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exporter CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
            title="Imprimer la Fiche Finale au format officiel"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer Fiche (PDF)</span>
          </button>
        </div>
      </div>

      {/* Trimester Tabs */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex items-center gap-1 overflow-x-auto no-print">
        {[
          { key: 'annual', label: 'Bilan Annuel Global', icon: Trophy, badge: 'Année complète' },
          { key: 't1', label: 'Trimestre 1', icon: Calendar, badge: 'Sep - Déc' },
          { key: 't2', label: 'Trimestre 2', icon: Calendar, badge: 'Jan - Mar' },
          { key: 't3', label: 'Trimestre 3', icon: Calendar, badge: 'Avr - Juin' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTrimesterKey === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTrimesterKey(tab.key as any)}
              className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                isActive ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {currentTrimester && (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-center">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Total des Scores</span>
              <p className="text-xl font-black text-indigo-950 mt-1">{currentTrimester.classAverageTotalScore}</p>
              <p className="text-[10px] text-indigo-600 mt-0.5">pts moy. / élève</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-100 text-center">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Moyenne Frappe</span>
              <p className="text-xl font-black text-amber-950 mt-1">{currentTrimester.classAverageTypingScore} / 20</p>
              <p className="text-[10px] text-amber-700 mt-0.5">{currentTrimester.classAverageWpm} MPM • {currentTrimester.classAverageAccuracy}%</p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-100 text-center">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Moyenne QCM</span>
              <p className="text-xl font-black text-purple-950 mt-1">{currentTrimester.classAverageQCMScore} / 20</p>
              <p className="text-[10px] text-purple-700 mt-0.5">{currentTrimester.totalQcms} questionnaire(s)</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 text-center">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Moyenne Générale</span>
              <p className="text-xl font-black text-emerald-950 mt-1">{currentTrimester.classAverageOverall20} / 20</p>
              <p className="text-[10px] text-emerald-700 mt-0.5">Note combinée</p>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-100 text-center">
              <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Assiduité Séances</span>
              <p className="text-xl font-black text-sky-950 mt-1">{currentTrimester.classAttendanceRate}%</p>
              <p className="text-[10px] text-sky-700 mt-0.5">{currentTrimester.totalSessions} séance(s)</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Fichiers Déposés</span>
              <p className="text-xl font-black text-slate-900 mt-1">{currentTrimester.totalAttachedFilesCount}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">travaux élèves</p>
            </div>
          </div>

          {/* Search, Filter & Sort Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs no-print">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher élève..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48"
                />
              </div>

              <select
                value={profileFilter}
                onChange={e => setProfileFilter(e.target.value as any)}
                className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              >
                <option value="all">Tous les profils</option>
                <option value="nouveau">Nouveaux uniquement</option>
                <option value="redoublant">Redoublants uniquement</option>
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              >
                <option value="overall-desc">Moyenne générale (meilleure)</option>
                <option value="total-desc">Total des scores (plus haut)</option>
                <option value="name-asc">Nom élève (A → Z)</option>
                <option value="typing-desc">Note de Frappe (plus haute)</option>
                <option value="qcm-desc">Note de QCM (plus haute)</option>
                <option value="attendance-desc">Taux de présence (plus élevé)</option>
                <option value="files-desc">Fichiers joints remis</option>
              </select>

              {(searchQuery || profileFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setProfileFilter('all'); }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Effacer filtres
                </button>
              )}
            </div>

            <span className="text-xs text-slate-500 font-medium">
              {filteredStudents.length} élève{filteredStudents.length > 1 ? 's' : ''} affiché{filteredStudents.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Main Fiche Finale Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print-area">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {currentTrimester.name} : Tableau récapitulatif & Fiche de notation
                </h3>
                <p className="text-xs text-slate-500">
                  Période : {currentTrimester.period} • Classe : {className}
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Généré le {new Date().toLocaleDateString('fr-FR')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="p-3 text-center w-10">Rang</th>
                    <th className="p-3 min-w-[160px]">Élève</th>
                    <th className="p-3 text-center" title="Somme cumulée des scores Frappe + QCM">Total Scores</th>
                    <th className="p-3 text-center" title="Moyenne des tests de frappe au clavier">Note Frappe /20</th>
                    <th className="p-3 text-center" title="Moyenne des questionnaires QCM">Note QCM /20</th>
                    <th className="p-3 text-center" title="Moyenne générale pondérée de l'élève">Moyenne Générale</th>
                    <th className="p-3 text-center" title="Séances suivies et taux de présence">Séances & Assiduité</th>
                    <th className="p-3 text-center" title="Fichiers de travail déposés par l'élève">Fichiers joints</th>
                    <th className="p-3 text-right no-print">Fiche & Historique</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        Aucun élève ne correspond aux critères de recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((std, idx) => {
                      let badgeOverall = 'bg-rose-50 text-rose-700 border-rose-200';
                      if (std.overallAverage20 >= 16) badgeOverall = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      else if (std.overallAverage20 >= 12) badgeOverall = 'bg-sky-50 text-sky-700 border-sky-200';
                      else if (std.overallAverage20 >= 10) badgeOverall = 'bg-amber-50 text-amber-800 border-amber-200';

                      return (
                        <tr key={std.studentId} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center font-bold text-slate-400">
                            #{idx + 1}
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <strong className="text-slate-900 font-bold">{std.lastName.toUpperCase()} {std.firstName}</strong>
                              {std.isRepeating ? (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  R
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">N° {std.studentNumber || '—'}</span>
                          </td>

                          <td className="p-3 text-center">
                            <span className="font-extrabold text-indigo-700 text-xs">
                              {std.totalCombinedScore} pts
                            </span>
                          </td>

                          <td className="p-3 text-center">
                            {std.typingTestsCount > 0 ? (
                              <div>
                                <span className="font-bold text-amber-900">
                                  {std.typingAverageScore} / 20
                                </span>
                                <span className="block text-[10px] text-slate-400">
                                  {std.typingAverageWpm} MPM ({std.typingTestsCount} test{std.typingTestsCount > 1 ? 's' : ''})
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-mono">—</span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {std.qcmCount > 0 ? (
                              <div>
                                <span className="font-bold text-purple-900">
                                  {std.qcmAverageScore20} / 20
                                </span>
                                <span className="block text-[10px] text-slate-400">
                                  {std.qcmCount} QCM validé{std.qcmCount > 1 ? 's' : ''}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-mono">—</span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full font-black text-xs border ${badgeOverall}`}>
                              {std.overallAverage20} / 20
                            </span>
                          </td>

                          <td className="p-3 text-center">
                            <div>
                              <span className={`font-bold ${
                                std.attendanceRate >= 85 ? 'text-emerald-700' : std.attendanceRate >= 65 ? 'text-amber-700' : 'text-rose-700'
                              }`}>
                                {std.attendanceRate}%
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                {std.presentCount} / {std.sessionsCount} séance{std.sessionsCount > 1 ? 's' : ''}
                              </span>
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            {std.attachedFilesCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudent(std);
                                  setStudentModalTab('files');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold cursor-pointer"
                                title="Voir les fichiers déposés"
                              >
                                <Paperclip className="w-3 h-3 text-indigo-600" />
                                <span>{std.attachedFilesCount}</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 font-mono">0</span>
                            )}
                          </td>

                          <td className="p-3 text-right no-print">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudent(std);
                                setStudentModalTab('all');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
                            >
                              Historique complet
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FICHE INDIVIDUELLE & HISTORIQUE COMPLET DE L'ÉLÈVE                 */}
      {/* ========================================================================= */}
      {selectedStudent && currentTrimester && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base">Fiche individuelle & Historique de l'élève</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/40">
                    {selectedStudent.overallAverage20} / 20
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Élève : <strong className="text-white text-sm">{selectedStudent.lastName.toUpperCase()} {selectedStudent.firstName}</strong> • N° {selectedStudent.studentNumber || '—'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Classe : {className} • {currentTrimester.name} ({currentTrimester.period})
                </p>
              </div>

              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer le bulletin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto print-area">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-center">
                <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100">
                  <span className="text-[10px] text-indigo-500 uppercase font-bold block">Total des Scores</span>
                  <strong className="text-xl font-black text-indigo-900">{selectedStudent.totalCombinedScore} pts</strong>
                  <p className="text-[10px] text-indigo-600 mt-0.5">points cumulés</p>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
                  <span className="text-[10px] text-amber-700 uppercase font-bold block">Moyenne Frappe</span>
                  <strong className="text-xl font-black text-amber-950">{selectedStudent.typingAverageScore} / 20</strong>
                  <p className="text-[10px] text-amber-700 mt-0.5">{selectedStudent.typingAverageWpm} MPM ({selectedStudent.typingTestsCount} tests)</p>
                </div>

                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100">
                  <span className="text-[10px] text-purple-700 uppercase font-bold block">Moyenne QCM</span>
                  <strong className="text-xl font-black text-purple-950">{selectedStudent.qcmAverageScore20} / 20</strong>
                  <p className="text-[10px] text-purple-700 mt-0.5">{selectedStudent.qcmCount} questionnaire(s)</p>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">Assiduité & Présence</span>
                  <strong className="text-xl font-black text-emerald-950">{selectedStudent.attendanceRate}%</strong>
                  <p className="text-[10px] text-emerald-700 mt-0.5">{selectedStudent.presentCount} / {selectedStudent.sessionsCount} séances</p>
                </div>
              </div>

              {/* Sub tabs in student modal */}
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 text-xs font-bold no-print">
                {[
                  { id: 'all', label: 'Vue Complète' },
                  { id: 'sessions', label: `Historique Séances (${selectedStudent.sessionsHistory.length})` },
                  { id: 'typing', label: `Tests de Frappe (${selectedStudent.typingHistory.length})` },
                  { id: 'qcms', label: `Questionnaires QCM (${selectedStudent.qcmHistory.length})` },
                  { id: 'files', label: `Fichiers Déposés (${selectedStudent.attachedFiles.length})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStudentModalTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      studentModalTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 1. SESSIONS HISTORY */}
              {(studentModalTab === 'all' || studentModalTab === 'sessions') && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Historique de toutes les séances d'appel ({selectedStudent.sessionsHistory.length})</span>
                  </h4>

                  {selectedStudent.sessionsHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl">Aucune séance enregistrée pour cette période.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Séance</th>
                            <th className="p-2.5 text-center">Présence</th>
                            <th className="p-2.5">Fichier joint d'activité</th>
                            <th className="p-2.5">Observations</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedStudent.sessionsHistory.map(sess => (
                            <tr key={sess.sessionId} className="hover:bg-slate-50">
                              <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">
                                {sess.sessionDate}
                              </td>
                              <td className="p-2.5 font-bold text-slate-900">
                                {sess.sessionTitle}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sess.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                                  sess.status === 'absent' ? 'bg-rose-100 text-rose-800' :
                                  sess.status === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {sess.status === 'present' ? 'Présent' : sess.status === 'absent' ? 'Absent' : sess.status === 'late' ? 'En retard' : 'Excusé'}
                                </span>
                              </td>
                              <td className="p-2.5">
                                {sess.activityFileUrl ? (
                                  <a
                                    href={sess.activityFileUrl}
                                    download={sess.activityFileName || 'activite'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold border border-indigo-200"
                                  >
                                    <Paperclip className="w-3 h-3 text-indigo-600" />
                                    <span className="truncate max-w-[120px]">{sess.activityFileName}</span>
                                    <Download className="w-2.5 h-2.5 text-indigo-500" />
                                  </a>
                                ) : (
                                  <span className="text-slate-300 italic text-[11px]">Aucun fichier</span>
                                )}
                              </td>
                              <td className="p-2.5 text-slate-500 text-[11px]">
                                {sess.notes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 2. TYPING TESTS HISTORY */}
              {(studentModalTab === 'all' || studentModalTab === 'typing') && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Keyboard className="w-4 h-4 text-amber-600" />
                    <span>Historique des tests de frappe au clavier ({selectedStudent.typingHistory.length})</span>
                  </h4>

                  {selectedStudent.typingHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl">Aucun test de frappe effectué pour cette période.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Test</th>
                            <th className="p-2.5 text-center">Vitesse (MPM)</th>
                            <th className="p-2.5 text-center">Précision</th>
                            <th className="p-2.5 text-center">Note / 20</th>
                            <th className="p-2.5 text-right">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedStudent.typingHistory.map((t, idx) => (
                            <tr key={`${t.testId}-${idx}`} className="hover:bg-slate-50">
                              <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">
                                {new Date(t.completedAt).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="p-2.5 font-bold text-slate-900">
                                {t.testTitle}
                              </td>
                              <td className="p-2.5 text-center font-bold text-amber-900">
                                {t.wpm} MPM
                              </td>
                              <td className="p-2.5 text-center">
                                {t.accuracy}%
                              </td>
                              <td className="p-2.5 text-center font-extrabold text-slate-900">
                                {t.score} / 20
                              </td>
                              <td className="p-2.5 text-right">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  t.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {t.passed ? 'Validé ✓' : 'Non validé'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 3. QCM HISTORY */}
              {(studentModalTab === 'all' || studentModalTab === 'qcms') && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-600" />
                    <span>Historique des questionnaires QCM ({selectedStudent.qcmHistory.length})</span>
                  </h4>

                  {selectedStudent.qcmHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl">Aucun QCM complété pour cette période.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">QCM</th>
                            <th className="p-2.5 text-center">Score brut</th>
                            <th className="p-2.5 text-center">Note sur 20</th>
                            <th className="p-2.5 text-right">Durée</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedStudent.qcmHistory.map((q, idx) => (
                            <tr key={`${q.qcmId}-${idx}`} className="hover:bg-slate-50">
                              <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">
                                {new Date(q.completedAt).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="p-2.5 font-bold text-slate-900">
                                {q.qcmTitle}
                              </td>
                              <td className="p-2.5 text-center text-slate-600">
                                {q.totalScore} / {q.maxScore} pts
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                                  q.score20 >= 16 ? 'bg-emerald-100 text-emerald-800' :
                                  q.score20 >= 10 ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {q.score20} / 20
                                </span>
                              </td>
                              <td className="p-2.5 text-right text-slate-400 font-mono text-[11px]">
                                {Math.floor(q.timeSpentSeconds / 60)}m {q.timeSpentSeconds % 60}s
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 4. ATTACHED FILES */}
              {(studentModalTab === 'all' || studentModalTab === 'files') && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-indigo-600" />
                    <span>Fichiers d'activité déposés pour les séances ({selectedStudent.attachedFiles.length})</span>
                  </h4>

                  {selectedStudent.attachedFiles.length === 0 ? (
                    <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl">Aucun fichier d'activité remis par cet élève.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedStudent.attachedFiles.map((f, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-900 truncate block text-xs">{f.fileName}</span>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              Séance : <strong>{f.sessionTitle}</strong> ({f.sessionDate})
                            </p>
                            <span className="text-[10px] text-slate-400">
                              {f.fileSize ? `${Math.round(f.fileSize / 1024)} Ko` : ''}
                            </span>
                          </div>
                          <a
                            href={f.fileUrl}
                            download={f.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Télécharger</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end no-print">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
