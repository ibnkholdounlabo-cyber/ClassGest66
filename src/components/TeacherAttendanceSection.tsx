import React, { useState, useEffect, useMemo } from 'react';
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
  X,
  BookX,
  UserX,
  Briefcase,
  MessageSquare,
  Award,
  ThumbsUp,
  SlidersHorizontal,
  Paperclip,
  Download
} from 'lucide-react';
import { api } from '../api';
import {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  Student,
  StudentAttendanceSummary
} from '../types';

export interface DisciplineOptionDef {
  key: string;
  label: string;
  shortLabel: string;
  defaultDelta: number;
  badgeColor: string;
  activeColor: string;
  iconType: 'cahier' | 'exclu' | 'materiel' | 'devoir' | 'bavardage' | 'bonus' | 'serieux';
}

export const DISCIPLINE_OPTIONS: DisciplineOptionDef[] = [
  {
    key: 'absence_cahier',
    label: "Absence de cahier d'élève",
    shortLabel: 'Sans cahier',
    defaultDelta: -1,
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    activeColor: 'bg-rose-600 text-white border-rose-700 shadow-xs',
    iconType: 'cahier'
  },
  {
    key: 'exclu',
    label: 'Élève exclu de cours',
    shortLabel: 'Exclu',
    defaultDelta: -3,
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    activeColor: 'bg-red-600 text-white border-red-700 shadow-xs',
    iconType: 'exclu'
  },
  {
    key: 'oubli_materiel',
    label: 'Oubli de matériel',
    shortLabel: 'Sans matériel',
    defaultDelta: -1,
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    activeColor: 'bg-amber-600 text-white border-amber-700 shadow-xs',
    iconType: 'materiel'
  },
  {
    key: 'travail_non_fait',
    label: 'Travail non fait',
    shortLabel: 'Travail non fait',
    defaultDelta: -2,
    badgeColor: 'bg-orange-50 text-orange-800 border-orange-200',
    activeColor: 'bg-orange-600 text-white border-orange-700 shadow-xs',
    iconType: 'devoir'
  },
  {
    key: 'bavardage',
    label: 'Bavardage / Perturbation',
    shortLabel: 'Bavardage',
    defaultDelta: -1,
    badgeColor: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    activeColor: 'bg-yellow-600 text-white border-yellow-700 shadow-xs',
    iconType: 'bavardage'
  },
  {
    key: 'participation',
    label: 'Bonne participation (+)',
    shortLabel: '+ Participation',
    defaultDelta: 1,
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    activeColor: 'bg-emerald-600 text-white border-emerald-700 shadow-xs',
    iconType: 'bonus'
  },
  {
    key: 'travail_serieux',
    label: 'Travail remarquable (+)',
    shortLabel: '+ Remarquable',
    defaultDelta: 2,
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    activeColor: 'bg-teal-600 text-white border-teal-700 shadow-xs',
    iconType: 'serieux'
  }
];

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
  const [activeTab, setActiveTab] = useState<'sessions' | 'summary' | 'discipline'>('sessions');

  // Sessions list
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionSort, setSessionSort] = useState<'date-desc' | 'date-asc' | 'title-asc'>('date-desc');

  // Active Session Details & Roll Call
  const [currentSession, setCurrentSession] = useState<(AttendanceSession & { records: AttendanceRecord[] }) | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [recordEdits, setRecordEdits] = useState<Record<string, {
    status: AttendanceStatus;
    notes: string;
    options: string[];
    score: number;
  }>>({});
  const [savingRecords, setSavingRecords] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // Roll call filters
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

  // Class Attendance Summary (Tab 2)
  const [summaryData, setSummaryData] = useState<{ totalSessions: number; studentSummaries: StudentAttendanceSummary[] } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summarySearch, setSummarySearch] = useState('');
  const [summaryFilterRepeating, setSummaryFilterRepeating] = useState<'all' | 'nouveau' | 'redoublant'>('all');
  const [summarySortBy, setSummarySortBy] = useState<'rate-desc' | 'rate-asc' | 'name-asc' | 'absences-desc' | 'lates-desc'>('name-asc');

  // Discipline Summary (Tab 3)
  const [disciplineData, setDisciplineData] = useState<any | null>(null);
  const [loadingDiscipline, setLoadingDiscipline] = useState(false);
  const [disciplineSearch, setDisciplineSearch] = useState('');
  const [disciplineSort, setDisciplineSort] = useState<'score-asc' | 'score-desc' | 'name-asc' | 'exclu-desc' | 'cahier-desc'>('score-asc');

  // Load sessions on mount or when class changes
  useEffect(() => {
    if (classId) {
      loadSessions();
      if (activeTab === 'summary') {
        loadSummary();
      } else if (activeTab === 'discipline') {
        loadDiscipline();
      }
    }
  }, [classId]);

  useEffect(() => {
    if (activeTab === 'summary' && classId) {
      loadSummary();
    } else if (activeTab === 'discipline' && classId) {
      loadDiscipline();
    }
  }, [activeTab]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await api.teacherGetAttendanceSessions(token, classId);
      setSessions(data);
      if (selectedSessionId) {
        loadSessionDetails(selectedSessionId);
      } else if (data.length > 0) {
        loadSessionDetails(data[0].id);
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

      // Initialize records edits map with options and scores
      const map: Record<string, { status: AttendanceStatus; notes: string; options: string[]; score: number }> = {};
      data.records.forEach((rec) => {
        let opts: string[] = [];
        if (rec.optionsJson) {
          try {
            opts = JSON.parse(rec.optionsJson);
          } catch (e) {
            opts = [];
          }
        }
        map[rec.studentId] = {
          status: rec.status,
          notes: rec.notes || '',
          options: opts,
          score: rec.score ?? 0
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

  const loadDiscipline = async () => {
    setLoadingDiscipline(true);
    try {
      const data = await api.teacherGetDisciplineSummary(token, classId);
      setDisciplineData(data);
    } catch (err: any) {
      console.error('Error loading discipline summary:', err);
    } finally {
      setLoadingDiscipline(false);
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
        notes: item.notes,
        options: item.options,
        optionsJson: JSON.stringify(item.options),
        score: item.score
      }));

      const res = await api.teacherSaveAttendanceRecords(token, currentSession.id, recordsToSave);
      setCurrentSession(res.session);
      setSaveSuccessMessage('Feuille d’appel, options disciplinaires et scores enregistrés avec succès !');
      setTimeout(() => setSaveSuccessMessage(''), 4000);
      loadSessions(); // refresh counts
      if (activeTab === 'discipline') {
        loadDiscipline();
      }
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
        ...(prev[studentId] || { notes: '', options: [], score: 0 }),
        status
      }
    }));
  };

  const toggleDisciplineOption = (studentId: string, optionKey: string) => {
    setRecordEdits((prev) => {
      const current = prev[studentId] || { status: 'present', notes: '', options: [], score: 0 };
      const hasOpt = current.options.includes(optionKey);
      const newOpts = hasOpt
        ? current.options.filter((k) => k !== optionKey)
        : [...current.options, optionKey];

      // Automatically recalculate suggested score change based on delta
      const optionDef = DISCIPLINE_OPTIONS.find((o) => o.key === optionKey);
      const delta = optionDef ? optionDef.defaultDelta : 0;
      const newScore = hasOpt ? current.score - delta : current.score + delta;

      // If marked 'exclu', can also mark absent or keep status
      return {
        ...prev,
        [studentId]: {
          ...current,
          options: newOpts,
          score: newScore
        }
      };
    });
  };

  const adjustStudentScore = (studentId: string, delta: number) => {
    setRecordEdits((prev) => {
      const current = prev[studentId] || { status: 'present', notes: '', options: [], score: 0 };
      return {
        ...prev,
        [studentId]: {
          ...current,
          score: (current.score || 0) + delta
        }
      };
    });
  };

  const updateSingleRecordNote = (studentId: string, notes: string) => {
    setRecordEdits((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: 'present', options: [], score: 0 }),
        notes
      }
    }));
  };

  // Filter & Sort Sessions
  const filteredSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        if (!sessionSearch) return true;
        const q = sessionSearch.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.date.includes(q) ||
          (s.notes && s.notes.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sessionSort === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sessionSort === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sessionSort === 'title-asc') return a.title.localeCompare(b.title, 'fr');
        return 0;
      });
  }, [sessions, sessionSearch, sessionSort]);

  // Filter & Sort Roll Call Students
  const filteredRollRecords = useMemo(() => {
    if (!currentSession) return [];

    return currentSession.records
      .filter((rec) => {
        const edit = recordEdits[rec.studentId] || { status: rec.status, notes: '' };
        if (rollStatusFilter !== 'all' && edit.status !== rollStatusFilter) {
          return false;
        }
        if (rollRepeatingFilter === 'nouveau' && rec.isRepeating) return false;
        if (rollRepeatingFilter === 'redoublant' && !rec.isRepeating) return false;

        if (rollSearch) {
          const q = rollSearch.toLowerCase();
          const matchName = (rec.studentName || '').toLowerCase().includes(q);
          const matchNum = (rec.studentNumber || '').toLowerCase().includes(q);
          const matchNote = edit.notes.toLowerCase().includes(q);
          if (!matchName && !matchNum && !matchNote) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (rollSort === 'name-asc') {
          return (a.studentName || '').localeCompare(b.studentName || '', 'fr');
        }
        if (rollSort === 'status') {
          const editA = recordEdits[a.studentId]?.status || a.status;
          const editB = recordEdits[b.studentId]?.status || b.status;
          const order = { absent: 1, late: 2, excused: 3, present: 4 };
          return order[editA] - order[editB];
        }
        return 0; // initial order
      });
  }, [currentSession, recordEdits, rollStatusFilter, rollRepeatingFilter, rollSearch, rollSort]);

  // Filter & Sort Summary
  const filteredSummaries = useMemo(() => {
    if (!summaryData?.studentSummaries) return [];

    return summaryData.studentSummaries
      .filter((s) => {
        if (summaryFilterRepeating === 'nouveau' && s.isRepeating) return false;
        if (summaryFilterRepeating === 'redoublant' && !s.isRepeating) return false;

        if (summarySearch) {
          const q = summarySearch.toLowerCase();
          const fullName = `${s.lastName} ${s.firstName}`.toLowerCase();
          const matchNum = s.studentNumber.toLowerCase().includes(q);
          if (!fullName.includes(q) && !matchNum) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const rateA = a.attendanceRate ?? a.presenceRate ?? 0;
        const rateB = b.attendanceRate ?? b.presenceRate ?? 0;
        if (summarySortBy === 'rate-desc') return rateB - rateA;
        if (summarySortBy === 'rate-asc') return rateA - rateB;
        if (summarySortBy === 'absences-desc') return b.absentCount - a.absentCount;
        if (summarySortBy === 'lates-desc') return b.lateCount - a.lateCount;
        if (summarySortBy === 'name-asc') return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr');
        return 0;
      });
  }, [summaryData, summarySearch, summaryFilterRepeating, summarySortBy]);

  // Filter & Sort Discipline
  const filteredDisciplineStudents = useMemo(() => {
    if (!disciplineData?.studentSummaries) return [];

    return disciplineData.studentSummaries
      .filter((s: any) => {
        if (disciplineSearch) {
          const q = disciplineSearch.toLowerCase();
          const fullName = `${s.lastName} ${s.firstName}`.toLowerCase();
          const matchNum = s.studentNumber?.toLowerCase().includes(q);
          if (!fullName.includes(q) && !matchNum) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        if (disciplineSort === 'score-asc') return a.totalScore - b.totalScore;
        if (disciplineSort === 'score-desc') return b.totalScore - a.totalScore;
        if (disciplineSort === 'exclu-desc') return (b.optionCounts?.exclu || 0) - (a.optionCounts?.exclu || 0);
        if (disciplineSort === 'cahier-desc') return (b.optionCounts?.absence_cahier || 0) - (a.optionCounts?.absence_cahier || 0);
        if (disciplineSort === 'name-asc') return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr');
        return 0;
      });
  }, [disciplineData, disciplineSearch, disciplineSort]);

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
                Gestion des Présences & Discipline - {className || 'Classe'}
              </h2>
              <p className="text-xs text-slate-500">
                Appel en classe, options disciplinaires (cahier, exclusion...), scoring (+/-) et statistiques comportementales
              </p>
            </div>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'sessions'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Séances & Appel</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discipline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'discipline'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Discipline & Scores</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Taux de Présence</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SESSIONS & ROLL CALL */}
      {activeTab === 'sessions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: List of Sessions */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Séances de cours ({filteredSessions.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowNewSessionModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouvelle séance</span>
              </button>
            </div>

            {/* Sessions search & sort */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher une séance..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <select
                value={sessionSort}
                onChange={(e) => setSessionSort(e.target.value as any)}
                className="h-8 px-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              >
                <option value="date-desc">Récent d'abord</option>
                <option value="date-asc">Ancien d'abord</option>
                <option value="title-asc">Titre (A-Z)</option>
              </select>
            </div>

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
                    Créez une première séance pour effectuer l'appel et cocher la discipline.
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
                          ? 'bg-indigo-50/70 border-indigo-300 shadow-sm ring-1 ring-indigo-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-900">
                              {sess.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{dateFormatted}</span>
                            {sess.startTime && (
                              <span className="text-slate-400">
                                • {sess.startTime} - {sess.endTime}
                              </span>
                            )}
                          </p>
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
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                      title="Imprimer la feuille d'appel"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRecords}
                      disabled={savingRecords}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      {savingRecords ? (
                        <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Enregistrer l’appel</span>
                    </button>
                  </div>
                </div>

                {/* Save Feedback Banner */}
                {saveSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{saveSuccessMessage}</span>
                  </div>
                )}

                {/* Batch Actions Toolbar */}
                <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Tout marquer :</span>
                    <button
                      type="button"
                      onClick={() => handleSetAllStatus('present')}
                      className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-semibold text-[11px] border border-emerald-200 cursor-pointer"
                    >
                      Tous Présents
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllStatus('absent')}
                      className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-semibold text-[11px] border border-rose-200 cursor-pointer"
                    >
                      Tous Absents
                    </button>
                  </div>

                  {/* Filter toolbar */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                      <input
                        type="text"
                        placeholder="Filtrer un élève..."
                        value={rollSearch}
                        onChange={(e) => setRollSearch(e.target.value)}
                        className="h-7 pl-7 pr-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-36 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  </div>
                </div>

                {/* Roll Call Students Table */}
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto border-t border-slate-100">
                  {currentSession.records.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Aucun élève dans cette classe. Ajoutez d'abord des élèves à la classe.
                    </div>
                  ) : filteredRollRecords.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 text-slate-500 text-xs space-y-2">
                      <Search className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="font-semibold">Aucun élève ne correspond aux critères de filtre</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs min-w-[1020px]">
                      <thead className="bg-slate-50/95 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px] select-none backdrop-blur-xs">
                        <tr>
                          <th className="py-3 px-2.5 text-center w-10">N°</th>
                          <th className="py-3 px-3 min-w-[180px]">Nom & Prénom</th>
                          <th className="py-3 px-3 text-center min-w-[260px]">Présence / Absence</th>
                          <th className="py-3 px-2 text-center w-28" title="Absence de cahier (-1 pt)">Cahier</th>
                          <th className="py-3 px-2 text-center w-24" title="Élève exclu de cours (-3 pts)">Exclu</th>
                          <th className="py-3 px-2 min-w-[170px]">Autres sanctions / Bonus</th>
                          <th className="py-3 px-2 text-center w-24">Score</th>
                          <th className="py-3 px-3 min-w-[180px]">Observations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredRollRecords.map((rec, index) => {
                          const edit = recordEdits[rec.studentId] || {
                            status: rec.status,
                            notes: '',
                            options: [],
                            score: 0
                          };
                          const status = edit.status;
                          const score = edit.score || 0;
                          const isRepeating = rec.isRepeating;
                          const hasNoCahier = edit.options.includes('absence_cahier');
                          const isExclu = edit.options.includes('exclu');

                          const otherSelectedOptions = edit.options.filter(
                            (k) => k !== 'absence_cahier' && k !== 'exclu'
                          );
                          const availableOptions = DISCIPLINE_OPTIONS.filter(
                            (opt) => opt.key !== 'absence_cahier' && opt.key !== 'exclu' && !edit.options.includes(opt.key)
                          );

                          return (
                            <tr
                              key={rec.studentId}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                status === 'absent'
                                  ? 'bg-rose-50/20'
                                  : isExclu
                                  ? 'bg-red-50/30'
                                  : ''
                              }`}
                            >
                              {/* 1. N° */}
                              <td className="py-2.5 px-2.5 text-center font-mono text-slate-400 font-semibold">
                                {index + 1}
                              </td>

                              {/* 2. Nom & Prénom */}
                              <td className="py-2.5 px-3">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                                      {rec.studentName}
                                    </span>
                                    {isRepeating ? (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                                        Redoublant
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                                        Nouveau
                                      </span>
                                    )}
                                    {rec.markedByStudentAt && (
                                      <span
                                        className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap inline-flex items-center gap-0.5"
                                        title={`Présence validée par l’élève à ${(() => {
                                          try {
                                            return new Date(rec.markedByStudentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                                          } catch {
                                            return rec.markedByStudentAt;
                                          }
                                        })()}`}
                                      >
                                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                        <span>Pointé ({(() => {
                                          try {
                                            return new Date(rec.markedByStudentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                                          } catch {
                                            return '';
                                          }
                                        })()})</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                    <span className="text-[11px] text-slate-500 font-mono">
                                      N° {rec.studentNumber}
                                    </span>
                                    {rec.activityFileUrl && (
                                      <a
                                        href={rec.activityFileUrl}
                                        download={rec.activityFileName || 'activite'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded transition-colors"
                                        title={`Activité déposée : ${rec.activityFileName || 'Fichier'}`}
                                      >
                                        <Paperclip className="w-3 h-3 text-indigo-600" />
                                        <span className="truncate max-w-[110px]">{rec.activityFileName}</span>
                                        <Download className="w-2.5 h-2.5 text-indigo-500" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 3. Présence / Absence */}
                              <td className="py-2.5 px-3 text-center">
                                <div className="inline-flex items-center justify-center p-0.5 bg-slate-100/90 rounded-lg gap-0.5 border border-slate-200/60">
                                  <button
                                    type="button"
                                    onClick={() => updateSingleRecordStatus(rec.studentId, 'present')}
                                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                      status === 'present'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/80'
                                    }`}
                                    title="Marquer Présent"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Présent</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => updateSingleRecordStatus(rec.studentId, 'absent')}
                                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                      status === 'absent'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50/80'
                                    }`}
                                    title="Marquer Absent"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    <span>Absent</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => updateSingleRecordStatus(rec.studentId, 'late')}
                                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                      status === 'late'
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50/80'
                                    }`}
                                    title="Marquer en Retard"
                                  >
                                    <Clock className="w-3 h-3" />
                                    <span>Retard</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => updateSingleRecordStatus(rec.studentId, 'excused')}
                                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                      status === 'excused'
                                        ? 'bg-sky-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/80'
                                    }`}
                                    title="Marquer Excusé"
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>Excusé</span>
                                  </button>
                                </div>
                              </td>

                              {/* 4. Cahier (Sans cahier -1) */}
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleDisciplineOption(rec.studentId, 'absence_cahier')}
                                  className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                                    hasNoCahier
                                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-200'
                                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                                  }`}
                                  title={hasNoCahier ? "Cliquer pour annuler l'oubli de cahier (+1 pt)" : "Signaler une absence de cahier (-1 pt)"}
                                >
                                  {hasNoCahier ? (
                                    <>
                                      <BookX className="w-3 h-3 text-white" />
                                      <span>Oublié (-1)</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-500" />
                                      <span className="text-slate-500 font-medium">Présent</span>
                                    </>
                                  )}
                                </button>
                              </td>

                              {/* 5. Exclu (Exclu de cours -3) */}
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleDisciplineOption(rec.studentId, 'exclu')}
                                  className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                                    isExclu
                                      ? 'bg-red-700 text-white border-red-800 shadow-xs ring-2 ring-red-200'
                                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                                  }`}
                                  title={isExclu ? "Cliquer pour annuler l'exclusion (+3 pts)" : "Exclure l'élève de cours (-3 pts)"}
                                >
                                  {isExclu ? (
                                    <>
                                      <UserX className="w-3 h-3 text-white" />
                                      <span>Exclu (-3)</span>
                                    </>
                                  ) : (
                                    <span className="font-normal">Non</span>
                                  )}
                                </button>
                              </td>

                              {/* 6. Autres sanctions / Bonus */}
                              <td className="py-2.5 px-2">
                                <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
                                  {otherSelectedOptions.map((key) => {
                                    const optDef = DISCIPLINE_OPTIONS.find((o) => o.key === key);
                                    if (!optDef) return null;
                                    return (
                                      <button
                                        key={key}
                                        type="button"
                                        onClick={() => toggleDisciplineOption(rec.studentId, key)}
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-colors ${optDef.activeColor}`}
                                        title={`Cliquer pour retirer : ${optDef.label}`}
                                      >
                                        <span>{optDef.shortLabel} ({optDef.defaultDelta > 0 ? `+${optDef.defaultDelta}` : optDef.defaultDelta})</span>
                                        <X className="w-2.5 h-2.5 opacity-80 hover:opacity-100" />
                                      </button>
                                    );
                                  })}

                                  {availableOptions.length > 0 && (
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          toggleDisciplineOption(rec.studentId, e.target.value);
                                        }
                                      }}
                                      className="h-6 px-1.5 py-0 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 hover:border-slate-300 focus:outline-none cursor-pointer"
                                      title="Ajouter une option disciplinaire ou un bonus"
                                    >
                                      <option value="">+ Option...</option>
                                      {availableOptions.map((opt) => (
                                        <option key={opt.key} value={opt.key}>
                                          {opt.shortLabel} ({opt.defaultDelta > 0 ? `+${opt.defaultDelta}` : opt.defaultDelta})
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </td>

                              {/* 7. Score */}
                              <td className="py-2.5 px-2 text-center">
                                <div className="inline-flex items-center justify-center gap-1 bg-slate-50 border border-slate-200 px-1 py-0.5 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() => adjustStudentScore(rec.studentId, -1)}
                                    className="w-5 h-5 rounded bg-white hover:bg-rose-100 text-slate-600 hover:text-rose-700 font-bold flex items-center justify-center border border-slate-200 cursor-pointer text-xs transition-colors"
                                    title="Diminuer le score (-1)"
                                  >
                                    -
                                  </button>
                                  <span
                                    className={`text-xs font-extrabold min-w-[24px] text-center ${
                                      score > 0
                                        ? 'text-emerald-700'
                                        : score < 0
                                        ? 'text-rose-700'
                                        : 'text-slate-600'
                                    }`}
                                  >
                                    {score > 0 ? `+${score}` : score}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => adjustStudentScore(rec.studentId, +1)}
                                    className="w-5 h-5 rounded bg-white hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 font-bold flex items-center justify-center border border-slate-200 cursor-pointer text-xs transition-colors"
                                    title="Augmenter le score (+1)"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              {/* 8. Observations */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={edit.notes}
                                  onChange={(e) => updateSingleRecordNote(rec.studentId, e.target.value)}
                                  placeholder="Observations..."
                                  className="w-full text-xs px-2.5 py-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg focus:ring-1 focus:ring-indigo-500 text-slate-700 transition-colors"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DISCIPLINE & BEHAVIOR STATISTICS */}
      {activeTab === 'discipline' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Statistiques & Bilan Disciplinaire de la Classe</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Suivi des sanctions (absences de cahiers, exclusions, oublis de matériel) et valorisation du travail sérieux
              </p>
            </div>

            {/* Filter & Sort */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Chercher un élève..."
                  value={disciplineSearch}
                  onChange={(e) => setDisciplineSearch(e.target.value)}
                  className="h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs w-44 focus:bg-white focus:outline-none"
                />
              </div>

              <select
                value={disciplineSort}
                onChange={(e) => setDisciplineSort(e.target.value as any)}
                className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              >
                <option value="score-asc">Score croissant (sanctions d'abord)</option>
                <option value="score-desc">Score décroissant (bonus d'abord)</option>
                <option value="exclu-desc">Nombre d'exclusions</option>
                <option value="cahier-desc">Absences de cahier</option>
                <option value="name-asc">Nom (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Global Discipline Cards */}
          {disciplineData && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-bold uppercase text-rose-800 block">Sans Cahier</span>
                <span className="text-2xl font-black text-rose-900">
                  {disciplineData.globalCounts?.absence_cahier || 0}
                </span>
                <span className="text-[10px] text-rose-600 block mt-0.5">incidents signalés</span>
              </div>

              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200">
                <span className="text-[10px] font-bold uppercase text-red-800 block">Exclusions</span>
                <span className="text-2xl font-black text-red-900">
                  {disciplineData.globalCounts?.exclu || 0}
                </span>
                <span className="text-[10px] text-red-600 block mt-0.5">élèves exclus</span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-bold uppercase text-amber-800 block">Sans Matériel</span>
                <span className="text-2xl font-black text-amber-900">
                  {disciplineData.globalCounts?.oubli_materiel || 0}
                </span>
                <span className="text-[10px] text-amber-600 block mt-0.5">oublis enregistrés</span>
              </div>

              <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200">
                <span className="text-[10px] font-bold uppercase text-orange-800 block">Travail non fait</span>
                <span className="text-2xl font-black text-orange-900">
                  {disciplineData.globalCounts?.travail_non_fait || 0}
                </span>
                <span className="text-[10px] text-orange-600 block mt-0.5">manquements</span>
              </div>

              <div className="p-3.5 rounded-xl bg-yellow-50 border border-yellow-200">
                <span className="text-[10px] font-bold uppercase text-yellow-800 block">Bavardages</span>
                <span className="text-2xl font-black text-yellow-900">
                  {disciplineData.globalCounts?.bavardage || 0}
                </span>
                <span className="text-[10px] text-yellow-600 block mt-0.5">remarques</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">Bonus / Sérieux</span>
                <span className="text-2xl font-black text-emerald-900">
                  {(disciplineData.globalCounts?.participation || 0) + (disciplineData.globalCounts?.travail_serieux || 0)}
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">valorisations</span>
              </div>
            </div>
          )}

          {/* Table by Student */}
          {loadingDiscipline ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <span className="inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></span>
              <p>Chargement des données de discipline...</p>
            </div>
          ) : filteredDisciplineStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
              Aucune donnée de comportement trouvée. Effectuez l’appel et cochez des options pour visualiser les statistiques.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Élève</th>
                    <th className="py-2.5 px-2 text-center">Profil</th>
                    <th className="py-2.5 px-2 text-center text-rose-700">Sans Cahier</th>
                    <th className="py-2.5 px-2 text-center text-red-700">Exclu</th>
                    <th className="py-2.5 px-2 text-center text-amber-700">Sans Matériel</th>
                    <th className="py-2.5 px-2 text-center text-orange-700">Travail non fait</th>
                    <th className="py-2.5 px-2 text-center text-yellow-700">Bavardage</th>
                    <th className="py-2.5 px-2 text-center text-emerald-700">Bonus (+)</th>
                    <th className="py-2.5 px-3 text-center">Score Net</th>
                    <th className="py-2.5 px-3">Dernière remarque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDisciplineStudents.map((std: any) => {
                    const counts = std.optionCounts || {};
                    const score = std.totalScore || 0;
                    return (
                      <tr key={std.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {std.lastName} {std.firstName}
                          <span className="text-[10px] font-mono text-slate-400 block font-normal">
                            N° {std.studentNumber}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {std.isRepeating ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Redoublant
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Nouveau
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-rose-700">
                          {counts.absence_cahier || 0}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-red-700">
                          {counts.exclu || 0}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-amber-700">
                          {counts.oubli_materiel || 0}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-orange-700">
                          {counts.travail_non_fait || 0}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-yellow-700">
                          {counts.bavardage || 0}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-emerald-700">
                          {(counts.participation || 0) + (counts.travail_serieux || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-black ${
                              score > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : score < 0
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {score > 0 ? `+${score}` : score}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500 italic max-w-xs truncate">
                          {std.lastNotes || '—'}
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

      {/* TAB 3: ATTENDANCE RATES & SUMMARY */}
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
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Chercher un élève..."
                  value={summarySearch}
                  onChange={(e) => setSummarySearch(e.target.value)}
                  className="h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs w-44 focus:bg-white focus:outline-none"
                />
              </div>

              <select
                value={summaryFilterRepeating}
                onChange={(e) => setSummaryFilterRepeating(e.target.value as any)}
                className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              >
                <option value="all">Tous profils</option>
                <option value="nouveau">Nouveaux</option>
                <option value="redoublant">Redoublants</option>
              </select>

              <select
                value={summarySortBy}
                onChange={(e) => setSummarySortBy(e.target.value as any)}
                className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              >
                <option value="name-asc">Nom (A-Z)</option>
                <option value="rate-desc">Taux de présence (haut)</option>
                <option value="rate-asc">Taux de présence (bas)</option>
                <option value="absences-desc">Plus d'absences</option>
                <option value="lates-desc">Plus de retards</option>
              </select>
            </div>
          </div>

          {loadingSummary ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <span className="inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></span>
              <p>Calcul des statistiques en cours...</p>
            </div>
          ) : filteredSummaries.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
              Aucune donnée de présence trouvée.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Élève</th>
                    <th className="py-2.5 px-3 text-center">Profil</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">Présences</th>
                    <th className="py-2.5 px-3 text-center text-rose-700">Absences</th>
                    <th className="py-2.5 px-3 text-center text-amber-700">Retards</th>
                    <th className="py-2.5 px-3 text-center text-sky-700">Excusés</th>
                    <th className="py-2.5 px-4 text-right">Taux de Présence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSummaries.map((s) => (
                    <tr key={s.studentId} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {s.lastName} {s.firstName}
                        <span className="text-[10px] font-mono text-slate-400 block font-normal">
                          N° {s.studentNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {s.isRepeating ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Redoublant
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Nouveau
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                        {s.presentCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-700">
                        {s.absentCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                        {s.lateCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-sky-700">
                        {s.excusedCount}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {(() => {
                          const rate = s.attendanceRate ?? s.presenceRate ?? 0;
                          return (
                            <div className="inline-flex items-center gap-2">
                              <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full ${
                                    rate >= 85
                                      ? 'bg-emerald-600'
                                      : rate >= 70
                                      ? 'bg-amber-500'
                                      : 'bg-rose-600'
                                  }`}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                              <span className="font-bold text-slate-800 min-w-[40px] text-right">
                                {rate}%
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE NEW SESSION MODAL */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden my-6">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm">Nouvelle séance de cours</h3>
              </div>
              <button
                onClick={() => setShowNewSessionModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Intitulé de la séance
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={`Ex: Séance du ${newDate}`}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date *</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Heure début</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Heure fin</label>
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
