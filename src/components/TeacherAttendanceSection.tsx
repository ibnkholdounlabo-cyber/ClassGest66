import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Plus,
  Trash2,
  Save,
  Users,
  Printer,
  ChevronRight,
  Filter,
  Check,
  Search,
  ArrowLeft,
  CalendarDays,
  Sparkles,
  BarChart3,
  ShieldAlert,
  UserCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X
} from 'lucide-react';
import { api } from '../api';
import { AttendanceRecord, AttendanceSession, AttendanceStatus, Student, StudentAttendanceSummary } from '../types';

interface TeacherAttendanceSectionProps {
  classId: string;
  className?: string;
  token: string;
  students: Student[];
  onRefreshStudents?: () => void;
}

export const TeacherAttendanceSection: React.FC<TeacherAttendanceSectionProps> = ({
  classId,
  className,
  token,
  students
}) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'summary'>('sessions');

  // Sessions list
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionSort, setSessionSort] = useState<'date-desc' | 'date-asc' | 'title-asc'>('date-desc');

  // Active Session Details & Roll Call
  const [currentSession, setCurrentSession] = useState<(AttendanceSession & { records: AttendanceRecord[] }) | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [recordEdits, setRecordEdits] = useState<Record<string, { status: AttendanceStatus; notes: string }>>({});
  const [savingRecords, setSavingRecords] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [rollSearch, setRollSearch] = useState('');
  const [rollStatusFilter, setRollStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [rollRepeatingFilter, setRollRepeatingFilter] = useState<'all' | 'nouveau' | 'redoublant'>('all');
  const [rollSort, setRollSort] = useState<'order' | 'name-asc' | 'status'>('order');

  // New Session Modal
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [newNotes, setNewNotes] = useState('');
  const [newInitialStatus, setNewInitialStatus] = useState<AttendanceStatus>('present');
  const [creatingSession, setCreatingSession] = useState(false);

  // Class Summary
  const [summaryData, setSummaryData] = useState<{ totalSessions: number; studentSummaries: StudentAttendanceSummary[] } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summarySearch, setSummarySearch] = useState('');
  const [summaryFilterRepeating, setSummaryFilterRepeating] = useState<'all' | 'nouveau' | 'redoublant'>('all');
  const [summarySortBy, setSummarySortBy] = useState<'rate-desc' | 'rate-asc' | 'name-asc' | 'absences-desc' | 'lates-desc'>('name-asc');

  // Load sessions on mount or when class changes
  useEffect(() => {
    if (classId) {
      loadSessions();
      if (activeTab === 'summary') {
        loadSummary();
      }
    }
  }, [classId]);

  useEffect(() => {
    if (activeTab === 'summary' && classId) {
      loadSummary();
    }
  }, [activeTab]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await api.teacherGetAttendanceSessions(token, classId);
      setSessions(data);
      // If we had a selected session, reload it, or select the first one if none
      if (selectedSessionId) {
        loadSessionDetails(selectedSessionId);
      }
    } catch (err: any) {
      console.error('Error loading attendance sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSessionDetails = async (sessionId: string) => {
    setLoadingDetails(true);
    try {
      const data = await api.teacherGetAttendanceSessionDetails(token, sessionId);
      setCurrentSession(data);
      setSelectedSessionId(sessionId);

      // Initialize records edits map
      const map: Record<string, { status: AttendanceStatus; notes: string }> = {};
      data.records.forEach((rec) => {
        map[rec.studentId] = {
          status: rec.status,
          notes: rec.notes || ''
        };
      });
      setRecordEdits(map);
    } catch (err: any) {
      console.error('Error loading session details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const data = await api.teacherGetClassAttendanceSummary(token, classId);
      setSummaryData(data);
    } catch (err: any) {
      console.error('Error loading class attendance summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSession(true);
    try {
      const created = await api.teacherCreateAttendanceSession(token, classId, {
        title: newTitle || `Séance du ${newDate}`,
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        notes: newNotes,
        initialStatus: newInitialStatus
      });
      setShowNewSessionModal(false);
      setNewTitle('');
      setNewNotes('');
      await loadSessions();
      await loadSessionDetails(created.id);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création de la séance');
    } finally {
      setCreatingSession(false);
    }
  };

  const handleSaveRecords = async () => {
    if (!currentSession) return;
    setSavingRecords(true);
    setSaveSuccessMessage('');
    try {
      const recordsToSave = Object.entries(recordEdits).map(([studentId, item]) => ({
        studentId,
        status: item.status,
        notes: item.notes
      }));
      const res = await api.teacherSaveAttendanceRecords(token, currentSession.id, recordsToSave);
      setCurrentSession(res.session);
      setSaveSuccessMessage('Feuille d’appel enregistrée avec succès');
      setTimeout(() => setSaveSuccessMessage(''), 4000);
      loadSessions(); // refresh counts
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’enregistrement de l’appel');
    } finally {
      setSavingRecords(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Confirmez-vous la suppression de cette séance et de ses feuilles de présence ?')) {
      return;
    }
    try {
      await api.teacherDeleteAttendanceSession(token, sessionId);
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
        setCurrentSession(null);
      }
      await loadSessions();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleSetAllStatus = (status: AttendanceStatus) => {
    setRecordEdits((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((stdId) => {
        next[stdId] = {
          ...next[stdId],
          status
        };
      });
      return next;
    });
  };

  const updateSingleRecordStatus = (studentId: string, status: AttendanceStatus) => {
    setRecordEdits((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { notes: '' }),
        status
      }
    }));
  };

  const updateSingleRecordNote = (studentId: string, notes: string) => {
    setRecordEdits((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: 'present' }),
        notes
      }
    }));
  };

  // Compute live stats for current session in editor
  const liveStats = React.useMemo(() => {
    const list = Object.values(recordEdits);
    const total = list.length;
    const present = list.filter((r) => r.status === 'present').length;
    const absent = list.filter((r) => r.status === 'absent').length;
    const late = list.filter((r) => r.status === 'late').length;
    const excused = list.filter((r) => r.status === 'excused').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, excused, rate };
  }, [recordEdits]);

  // Filtered & sorted sessions list
  const filteredSessions = React.useMemo(() => {
    return sessions
      .filter((s) => {
        const q = sessionSearch.toLowerCase().trim();
        if (!q) return true;
        return s.title.toLowerCase().includes(q) || s.date.includes(q);
      })
      .sort((a, b) => {
        if (sessionSort === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sessionSort === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sessionSort === 'title-asc') return a.title.localeCompare(b.title, 'fr');
        return 0;
      });
  }, [sessions, sessionSearch, sessionSort]);

  // Filtered & sorted records in the active roll call session
  const filteredRollRecords = React.useMemo(() => {
    if (!currentSession) return [];
    return currentSession.records
      .filter((rec) => {
        const q = rollSearch.toLowerCase().trim();
        const matchesSearch = !q || (
          (rec.studentName || '').toLowerCase().includes(q) ||
          (rec.studentNumber && rec.studentNumber.toLowerCase().includes(q))
        );
        const currentStatus = recordEdits[rec.studentId]?.status ?? rec.status;
        const matchesStatus = rollStatusFilter === 'all' || currentStatus === rollStatusFilter;
        let matchesRepeating = true;
        if (rollRepeatingFilter === 'nouveau') matchesRepeating = !rec.isRepeating;
        if (rollRepeatingFilter === 'redoublant') matchesRepeating = !!rec.isRepeating;

        return matchesSearch && matchesStatus && matchesRepeating;
      })
      .sort((a, b) => {
        if (rollSort === 'name-asc') return (a.studentName || '').localeCompare(b.studentName || '', 'fr');
        if (rollSort === 'status') {
          const statusOrder: Record<AttendanceStatus, number> = { absent: 1, late: 2, excused: 3, present: 4 };
          const statA = recordEdits[a.studentId]?.status ?? a.status;
          const statB = recordEdits[b.studentId]?.status ?? b.status;
          return statusOrder[statA] - statusOrder[statB];
        }
        return 0;
      });
  }, [currentSession, rollSearch, rollStatusFilter, rollRepeatingFilter, rollSort, recordEdits]);

  // Filtered & sorted summaries for the summary tab
  const filteredSummaries = React.useMemo(() => {
    if (!summaryData) return [];
    return summaryData.studentSummaries
      .filter((s) => {
        const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
        const num = (s.studentNumber || '').toLowerCase();
        const matchSearch = fullName.includes(summarySearch.toLowerCase()) || num.includes(summarySearch.toLowerCase());
        if (!matchSearch) return false;
        if (summaryFilterRepeating === 'nouveau') return !s.isRepeating;
        if (summaryFilterRepeating === 'redoublant') return s.isRepeating;
        return true;
      })
      .sort((a, b) => {
        if (summarySortBy === 'rate-desc') return b.attendanceRate - a.attendanceRate;
        if (summarySortBy === 'rate-asc') return a.attendanceRate - b.attendanceRate;
        if (summarySortBy === 'absences-desc') return b.absentCount - a.absentCount;
        if (summarySortBy === 'lates-desc') return b.lateCount - a.lateCount;
        if (summarySortBy === 'name-asc') return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr');
        return 0;
      });
  }, [summaryData, summarySearch, summaryFilterRepeating, summarySortBy]);

  return (
    <div className="space-y-6">
      {/* Top Navigation & Sub-Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <CalendarDays className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Gestion des Présences & Appel - {className || 'Classe'}
              </h2>
              <p className="text-xs text-slate-500">
                Feuilles de présence par séance, calendrier scolaire et suivi des absences / retards
              </p>
            </div>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'sessions'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Séances & Feuilles d'Appel</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Récapitulatif & Taux</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SESSIONS & ROLL CALL */}
      {activeTab === 'sessions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: List of Sessions */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Calendrier des séances ({filteredSessions.length}{filteredSessions.length !== sessions.length ? ` / ${sessions.length}` : ''})
              </span>
              <button
                type="button"
                onClick={() => setShowNewSessionModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouvelle séance</span>
              </button>
            </div>

            {/* Filter and Sort for Sessions */}
            {sessions.length > 0 && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                <div className="relative flex-1 min-w-[130px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrer titre ou date..."
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    className="w-full h-7 pl-8 pr-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <select
                  value={sessionSort}
                  onChange={(e) => setSessionSort(e.target.value as any)}
                  className="h-7 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="date-desc">Plus récente</option>
                  <option value="date-asc">Plus ancienne</option>
                  <option value="title-asc">Titre (A → Z)</option>
                </select>
                {sessionSearch && (
                  <button
                    onClick={() => setSessionSearch('')}
                    className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                  >
                    Effacer
                  </button>
                )}
              </div>
            )}

            {loadingSessions ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                <span className="inline-block w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2"></span>
                Chargement des séances...
              </div>
            ) : sessions.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
                <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Aucune séance enregistrée</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Créez une première séance pour effectuer l'appel de la classe.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Créer une séance
                </button>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                <p className="font-semibold">Aucune séance trouvée</p>
                <button
                  onClick={() => setSessionSearch('')}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  Effacer le filtre
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredSessions.map((sess) => {
                  const isSelected = sess.id === selectedSessionId;
                  const dateFormatted = new Date(sess.date).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  });

                  return (
                    <div
                      key={sess.id}
                      onClick={() => loadSessionDetails(sess.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-300 shadow-sm ring-1 ring-indigo-200'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900 line-clamp-1">{sess.title}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                            <span className="font-medium text-indigo-700 capitalize">{dateFormatted}</span>
                            {sess.startTime && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {sess.startTime} {sess.endTime ? `- ${sess.endTime}` : ''}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(sess.id);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Supprimer la séance"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Mini pill counts */}
                      <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                          {sess.presentCount ?? 0} P
                        </span>
                        {(sess.absentCount ?? 0) > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold border border-rose-100">
                            {sess.absentCount} A
                          </span>
                        )}
                        {(sess.lateCount ?? 0) > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-100">
                            {sess.lateCount} R
                          </span>
                        )}
                        {(sess.excusedCount ?? 0) > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-semibold border border-sky-100">
                            {sess.excusedCount} E
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Roll Call Sheet for Selected Session */}
          <div className="lg:col-span-8">
            {loadingDetails ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                <span className="inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></span>
                <p>Chargement de la feuille d’appel...</p>
              </div>
            ) : !currentSession ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Sélectionnez une séance pour faire l’appel</p>
                <p className="text-xs text-slate-400">
                  Ou créez une nouvelle séance depuis la colonne de gauche.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header of Active Session */}
                <div className="bg-slate-50/80 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                        {currentSession.title}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                        {new Date(currentSession.date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    {currentSession.startTime && (
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Horaire : {currentSession.startTime} à {currentSession.endTime || '--:--'}
                      </p>
                    )}
                  </div>

                  {/* Actions & Save */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="no-print p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                      title="Imprimer la feuille d'appel"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      id="btn-save-attendance-records"
                      onClick={handleSaveRecords}
                      disabled={savingRecords}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      {savingRecords ? (
                        <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Enregistrer l'appel</span>
                    </button>
                  </div>
                </div>

                {/* Success feedback toast */}
                {saveSuccessMessage && (
                  <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{saveSuccessMessage}</span>
                  </div>
                )}

                {/* Live Stats Bar & Batch Actions */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Live Stats */}
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-700">Taux : <span className="text-indigo-600">{liveStats.rate}%</span></span>
                    <span className="text-slate-300">|</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {liveStats.present} Présents
                    </span>
                    <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      {liveStats.absent} Absents
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      {liveStats.late} Retards
                    </span>
                    <span className="inline-flex items-center gap-1 text-sky-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      {liveStats.excused} Excusés
                    </span>
                  </div>

                  {/* Batch buttons */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Actions rapides :</span>
                    <button
                      type="button"
                      onClick={() => handleSetAllStatus('present')}
                      className="px-2 py-1 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded text-[11px] font-semibold text-emerald-700 transition-colors cursor-pointer"
                    >
                      Tout Présent
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllStatus('absent')}
                      className="px-2 py-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded text-[11px] font-semibold text-rose-700 transition-colors cursor-pointer"
                    >
                      Tout Absent
                    </button>
                  </div>
                </div>

                {/* Roll Call Filter & Sort Toolbar */}
                {currentSession.records.length > 0 && (
                  <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Rechercher élève ou N°..."
                          value={rollSearch}
                          onChange={(e) => setRollSearch(e.target.value)}
                          className="h-7 pl-8 pr-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-44 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <select
                        value={rollStatusFilter}
                        onChange={(e) => setRollStatusFilter(e.target.value as any)}
                        className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                      >
                        <option value="all">Tous statuts</option>
                        <option value="present">Présents</option>
                        <option value="absent">Absents</option>
                        <option value="late">Retards</option>
                        <option value="excused">Excusés</option>
                      </select>

                      <select
                        value={rollRepeatingFilter}
                        onChange={(e) => setRollRepeatingFilter(e.target.value as any)}
                        className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                      >
                        <option value="all">Tous profils</option>
                        <option value="nouveau">Nouveaux</option>
                        <option value="redoublant">Redoublants</option>
                      </select>

                      <div className="flex items-center gap-1">
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        <span className="text-[11px] text-slate-500">Trier :</span>
                        <select
                          value={rollSort}
                          onChange={(e) => setRollSort(e.target.value as any)}
                          className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                        >
                          <option value="order">Ordre initial</option>
                          <option value="name-asc">Nom (A → Z)</option>
                          <option value="status">Par statut</option>
                        </select>
                      </div>

                      {(rollSearch || rollStatusFilter !== 'all' || rollRepeatingFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setRollSearch('');
                            setRollStatusFilter('all');
                            setRollRepeatingFilter('all');
                          }}
                          className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                        >
                          Effacer filtres
                        </button>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-500 font-medium">
                      {filteredRollRecords.length} / {currentSession.records.length} élève{currentSession.records.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* Roll Call Students Table */}
                <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
                  {currentSession.records.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Aucun élève dans cette classe. Ajoutez d'abord des élèves à la classe.
                    </div>
                  ) : filteredRollRecords.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 text-slate-500 text-xs space-y-2">
                      <Search className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="font-semibold">Aucun élève ne correspond aux critères de filtre</p>
                      <button
                        onClick={() => {
                          setRollSearch('');
                          setRollStatusFilter('all');
                          setRollRepeatingFilter('all');
                        }}
                        className="text-indigo-600 font-semibold hover:underline"
                      >
                        Réinitialiser les filtres
                      </button>
                    </div>
                  ) : (
                    filteredRollRecords.map((rec, index) => {
                      const edit = recordEdits[rec.studentId] || { status: rec.status, notes: '' };
                      const status = edit.status;
                      const isRepeating = rec.isRepeating;

                      return (
                        <div
                          key={rec.studentId}
                          className="p-3.5 sm:px-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          {/* Student Info */}
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <span className="text-xs font-mono text-slate-400 w-5 text-right">{index + 1}.</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                  {rec.studentName}
                                </span>
                                {/* Nouveau / Redoublant Badge */}
                                {isRepeating ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    Redoublant
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Nouveau
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono">
                                N° {rec.studentNumber}
                              </span>
                            </div>
                          </div>

                          {/* Status Picker Buttons */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateSingleRecordStatus(rec.studentId, 'present')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                status === 'present'
                                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Présent</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateSingleRecordStatus(rec.studentId, 'absent')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                status === 'absent'
                                  ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Absent</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateSingleRecordStatus(rec.studentId, 'late')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                status === 'late'
                                  ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Retard</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateSingleRecordStatus(rec.studentId, 'excused')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                status === 'excused'
                                  ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-300'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Excusé</span>
                            </button>
                          </div>

                          {/* Quick note input */}
                          <div className="sm:w-44">
                            <input
                              type="text"
                              value={edit.notes}
                              onChange={(e) => updateSingleRecordNote(rec.studentId, e.target.value)}
                              placeholder="Motif / observation..."
                              className="w-full text-xs px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-500 text-slate-700"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CLASS ATTENDANCE SUMMARY & RATES */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                Bilan récapitulatif des présences par élève
              </h3>
              <p className="text-xs text-slate-500">
                Total des séances comptabilisées : <strong>{summaryData?.totalSessions || 0} séances</strong>
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={summarySearch}
                  onChange={(e) => setSummarySearch(e.target.value)}
                  placeholder="Rechercher un élève..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Nouveau vs Redoublant filter */}
              <select
                value={summaryFilterRepeating}
                onChange={(e: any) => setSummaryFilterRepeating(e.target.value)}
                className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
              >
                <option value="all">Tous profils</option>
                <option value="nouveau">Nouveaux uniquement</option>
                <option value="redoublant">Redoublants uniquement</option>
              </select>

              {/* Sort by */}
              <div className="flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={summarySortBy}
                  onChange={(e: any) => setSummarySortBy(e.target.value)}
                  className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                >
                  <option value="name-asc">Nom (A → Z)</option>
                  <option value="rate-desc">Taux le plus élevé</option>
                  <option value="rate-asc">Taux le plus faible</option>
                  <option value="absences-desc">Plus d'absences</option>
                  <option value="lates-desc">Plus de retards</option>
                </select>
              </div>

              {(summarySearch || summaryFilterRepeating !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSummarySearch('');
                    setSummaryFilterRepeating('all');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Effacer
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                title="Imprimer le bilan"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loadingSummary ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <span className="inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></span>
              <p>Calcul des statistiques de présence...</p>
            </div>
          ) : filteredSummaries.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Aucun élève trouvé ou aucune donnée de présence pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 select-none">
                  <tr>
                    <th
                      onClick={() => setSummarySortBy('name-asc')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Élève</span>
                        {summarySortBy === 'name-asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                      </div>
                    </th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-center">Séances</th>
                    <th className="py-3 px-4 text-center text-emerald-700">Présences</th>
                    <th
                      onClick={() => setSummarySortBy('absences-desc')}
                      className="py-3 px-4 text-center text-rose-700 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Absences</span>
                        {summarySortBy === 'absences-desc' ? <ArrowDown className="w-3 h-3 text-rose-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                      </div>
                    </th>
                    <th
                      onClick={() => setSummarySortBy('lates-desc')}
                      className="py-3 px-4 text-center text-amber-700 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Retards</span>
                        {summarySortBy === 'lates-desc' ? <ArrowDown className="w-3 h-3 text-amber-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center text-sky-700">Excusés</th>
                    <th
                      onClick={() => setSummarySortBy(prev => prev === 'rate-desc' ? 'rate-asc' : 'rate-desc')}
                      className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Taux de présence</span>
                        {summarySortBy === 'rate-desc' ? (
                          <ArrowDown className="w-3 h-3 text-indigo-600" />
                        ) : summarySortBy === 'rate-asc' ? (
                          <ArrowUp className="w-3 h-3 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSummaries.map((s) => {
                    const isGood = s.attendanceRate >= 85;
                    const isMedium = s.attendanceRate >= 70 && s.attendanceRate < 85;
                    const isAlert = s.attendanceRate < 70;

                    return (
                      <tr key={s.studentId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{s.firstName} {s.lastName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">N° {s.studentNumber}</div>
                        </td>
                        <td className="py-3 px-4">
                          {s.isRepeating ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Redoublant
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Nouveau
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700">{s.totalSessions}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-700">{s.presentCount}</td>
                        <td className="py-3 px-4 text-center font-bold text-rose-700">{s.absentCount}</td>
                        <td className="py-3 px-4 text-center font-bold text-amber-700">{s.lateCount}</td>
                        <td className="py-3 px-4 text-center font-bold text-sky-700">{s.excusedCount}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isGood ? 'bg-emerald-500' : isMedium ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${s.attendanceRate}%` }}
                              ></div>
                            </div>
                            <span
                              className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                                isGood
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : isMedium
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {s.attendanceRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: NEW ATTENDANCE SESSION */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <Calendar className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-base text-slate-900">Nouvelle Séance d'Appel</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewSessionModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Titre de la séance
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={`Séance du ${newDate}`}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Date de la séance *
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Heure début
                  </label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Heure fin
                  </label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Statut initial pour tous les élèves
                </label>
                <select
                  value={newInitialStatus}
                  onChange={(e: any) => setNewInitialStatus(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="present">Présent par défaut (recommandé)</option>
                  <option value="absent">Absent par défaut</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes / Observations de la séance
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ex : Cours en salle informatique 102..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingSession}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {creatingSession ? 'Création...' : 'Créer la séance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
