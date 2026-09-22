import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  Target,
  Clock,
  Zap,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  FileText,
  Table,
  Code2,
  Keyboard,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  BarChart3,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Filter,
  X,
  Pencil,
  Sparkles,
  School,
  Layers,
  Printer,
  Download,
  Award,
  Check
} from 'lucide-react';
import {
  ClassEvaluationsSummary,
  TypingTest,
  TestEvaluation,
  ClassGroup
} from '../types';
import { api } from '../api';
import { formatPythonCode } from '../utils/pythonFormatter';

interface TeacherEvaluationsSectionProps {
  classId: string;
  className: string;
  token: string;
  classes?: ClassGroup[];
  autoOpenPrint?: boolean;
  onClosePrint?: () => void;
}

export const TeacherEvaluationsSection: React.FC<TeacherEvaluationsSectionProps> = ({
  classId,
  className,
  token,
  classes = [],
  autoOpenPrint = false,
  onClosePrint
}) => {
  const [evalSummary, setEvalSummary] = useState<ClassEvaluationsSummary | null>(null);
  const [tests, setTests] = useState<TypingTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sub tab: 'students' | 'byTest' | 'manageTests'
  const [activeSubTab, setActiveSubTab] = useState<'students' | 'byTest' | 'manageTests'>('students');

  // Search & Filters for TAB 1 (Students)
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilterStatus, setStudentFilterStatus] = useState<'all' | 'passed' | 'no-passed' | 'attempted' | 'none'>('all');
  const [studentSortBy, setStudentSortBy] = useState<'name' | 'studentNumber' | 'passed' | 'avgScore' | 'bestWpm' | 'attempts'>('name');
  const [studentSortOrder, setStudentSortOrder] = useState<'asc' | 'desc'>('asc');

  // Search & Filters for TAB 2 (By Test)
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [testEvalSearch, setTestEvalSearch] = useState('');
  const [testEvalFilterStatus, setTestEvalFilterStatus] = useState<'all' | 'passed' | 'failed'>('all');
  const [testEvalSortBy, setTestEvalSortBy] = useState<'score' | 'wpm' | 'accuracy' | 'mistakes' | 'time' | 'date' | 'student'>('score');
  const [testEvalSortOrder, setTestEvalSortOrder] = useState<'asc' | 'desc'>('desc');

  // Search & Filters for TAB 3 (Manage Tests)
  const [manageTestSearch, setManageTestSearch] = useState('');
  const [manageTestTheme, setManageTestTheme] = useState<'all' | 'Word' | 'Excel' | 'Python' | 'Général'>('all');
  const [manageTestSort, setManageTestSort] = useState<'level-asc' | 'level-desc' | 'title-asc' | 'title-desc' | 'wpm-desc' | 'time-asc'>('level-asc');

  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // New Test Modal / Form state
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTheme, setNewTheme] = useState<'Word' | 'Excel' | 'Python' | 'Général'>('Word');
  const [newLevel, setNewLevel] = useState<number>(1);
  const [newTimeLimit, setNewTimeLimit] = useState<number>(60);
  const [newMinAccuracy, setNewMinAccuracy] = useState<number>(85);
  const [newMinWpm, setNewMinWpm] = useState<number>(20);
  const [newTargetText, setNewTargetText] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newClassIds, setNewClassIds] = useState<string[]>([classId]);
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Test Modal / Form state
  const [editingTest, setEditingTest] = useState<TypingTest | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTheme, setEditTheme] = useState<'Word' | 'Excel' | 'Python' | 'Général'>('Word');
  const [editLevel, setEditLevel] = useState<number>(1);
  const [editTimeLimit, setEditTimeLimit] = useState<number>(60);
  const [editMinAccuracy, setEditMinAccuracy] = useState<number>(85);
  const [editMinWpm, setEditMinWpm] = useState<number>(20);
  const [editTargetText, setEditTargetText] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editClassIds, setEditClassIds] = useState<string[]>([]);
  const [isUpdatingTest, setIsUpdatingTest] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Export PDF / Print Modal state
  const [showPrintResultsModal, setShowPrintResultsModal] = useState(false);
  const [printScope, setPrintScope] = useState<'class' | 'test'>('class');
  const [printViewType, setPrintViewType] = useState<'summary' | 'detailed'>('summary');
  const [printOnlyParticipated, setPrintOnlyParticipated] = useState(false);
  const [printSortOrder, setPrintSortOrder] = useState<'score-desc' | 'name-asc' | 'studentNumber-asc'>('score-desc');

  useEffect(() => {
    if (autoOpenPrint) {
      setShowPrintResultsModal(true);
    }
  }, [autoOpenPrint]);

  const handleClosePrintModal = () => {
    setShowPrintResultsModal(false);
    if (onClosePrint) onClosePrint();
  };

  const getGradeMention = (score: number, attempted: boolean) => {
    if (!attempted) return { label: 'Non évalué', color: 'text-slate-500 bg-slate-100 border-slate-200' };
    if (score >= 16) return { label: 'Très Bien', color: 'text-emerald-800 bg-emerald-50 border-emerald-300' };
    if (score >= 14) return { label: 'Bien', color: 'text-teal-800 bg-teal-50 border-teal-300' };
    if (score >= 12) return { label: 'Assez Bien', color: 'text-indigo-800 bg-indigo-50 border-indigo-300' };
    if (score >= 10) return { label: 'Passable', color: 'text-amber-800 bg-amber-50 border-amber-300' };
    return { label: 'Insuffisant', color: 'text-rose-800 bg-rose-50 border-rose-300' };
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [evals, testList] = await Promise.all([
        api.getClassEvaluations(token, classId),
        api.getTests(token, classId)
      ]);
      setEvalSummary(evals);
      setTests(testList);
      if (testList.length > 0 && !selectedTestId) {
        setSelectedTestId(testList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les évaluations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      fetchData();
    }
  }, [classId]);

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTargetText.trim()) {
      setFormError('Le titre et le texte cible à taper sont obligatoires.');
      return;
    }

    setIsSubmittingTest(true);
    setFormError(null);
    try {
      // Auto-format Python code script to PEP 8 standards
      let finalText = newTargetText.trim();
      if (newTheme === 'Python') {
        finalText = formatPythonCode(finalText);
      }

      await api.teacherCreateTest(token, classId, {
        title: newTitle.trim(),
        theme: newTheme,
        level: Number(newLevel),
        timeLimitSeconds: Number(newTimeLimit),
        targetText: finalText,
        minAccuracyPercent: Number(newMinAccuracy),
        minWpm: Number(newMinWpm),
        description: newDescription.trim(),
        classIds: newClassIds.length > 0 ? newClassIds : [classId]
      });

      setShowAddTestModal(false);
      setNewTitle('');
      setNewTargetText('');
      setNewDescription('');
      setNewClassIds([classId]);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la création du test');
    } finally {
      setIsSubmittingTest(false);
    }
  };

  const handleOpenEditTest = (test: TypingTest) => {
    setEditingTest(test);
    setEditTitle(test.title);
    setEditTheme(test.theme);
    setEditLevel(test.level);
    setEditTimeLimit(test.timeLimitSeconds);
    setEditMinAccuracy(test.minAccuracyPercent);
    setEditMinWpm(test.minWpm);
    setEditTargetText(test.targetText);
    setEditDescription(test.description || '');
    setEditClassIds(test.classIds && test.classIds.length > 0 ? test.classIds : [test.classId || classId]);
    setEditFormError(null);
  };

  const handleUpdateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest || !editTitle.trim() || !editTargetText.trim()) {
      setEditFormError('Le titre et le texte cible à taper sont obligatoires.');
      return;
    }

    setIsUpdatingTest(true);
    setEditFormError(null);
    try {
      let finalText = editTargetText.trim();
      if (editTheme === 'Python') {
        finalText = formatPythonCode(finalText);
      }

      await api.teacherUpdateTest(token, editingTest.id, {
        title: editTitle.trim(),
        theme: editTheme,
        level: Number(editLevel),
        timeLimitSeconds: Number(editTimeLimit),
        targetText: finalText,
        minAccuracyPercent: Number(editMinAccuracy),
        minWpm: Number(editMinWpm),
        description: editDescription.trim(),
        classIds: editClassIds.length > 0 ? editClassIds : [classId]
      });

      setEditingTest(null);
      await fetchData();
    } catch (err: any) {
      setEditFormError(err.message || 'Erreur lors de la modification du test');
    } finally {
      setIsUpdatingTest(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!window.confirm('Supprimer ce test et toutes les évaluations associées ?')) return;

    try {
      await api.teacherDeleteTest(token, testId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'Word':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'Excel':
        return <Table className="w-4 h-4 text-emerald-600" />;
      case 'Python':
        return <Code2 className="w-4 h-4 text-amber-600" />;
      default:
        return <Keyboard className="w-4 h-4 text-indigo-600" />;
    }
  };

  // Filtered & sorted students for 'students' tab
  const filteredStudentSummaries = (evalSummary?.studentSummaries || [])
    .filter((s) => {
      const q = studentSearch.toLowerCase().trim();
      const matchesSearch = !q || (
        s.student.firstName.toLowerCase().includes(q) ||
        s.student.lastName.toLowerCase().includes(q) ||
        s.student.studentNumber.toLowerCase().includes(q)
      );

      let matchesStatus = true;
      if (studentFilterStatus === 'passed') matchesStatus = s.testsPassedCount > 0;
      else if (studentFilterStatus === 'no-passed') matchesStatus = s.testsPassedCount === 0;
      else if (studentFilterStatus === 'attempted') matchesStatus = s.totalTestsAttempted > 0;
      else if (studentFilterStatus === 'none') matchesStatus = s.totalTestsAttempted === 0;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (studentSortBy === 'name') {
        cmp = a.student.lastName.localeCompare(b.student.lastName, 'fr', { sensitivity: 'base' }) ||
              a.student.firstName.localeCompare(b.student.firstName, 'fr', { sensitivity: 'base' });
      } else if (studentSortBy === 'studentNumber') {
        cmp = a.student.studentNumber.localeCompare(b.student.studentNumber, 'fr', { numeric: true });
      } else if (studentSortBy === 'passed') {
        cmp = a.testsPassedCount - b.testsPassedCount;
      } else if (studentSortBy === 'avgScore') {
        cmp = a.averageScore - b.averageScore;
      } else if (studentSortBy === 'bestWpm') {
        cmp = a.bestWpm - b.bestWpm;
      } else if (studentSortBy === 'attempts') {
        cmp = a.totalTestsAttempted - b.totalTestsAttempted;
      }
      return studentSortOrder === 'asc' ? cmp : -cmp;
    });

  const toggleStudentSort = (field: typeof studentSortBy) => {
    if (studentSortBy === field) {
      setStudentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setStudentSortBy(field);
      setStudentSortOrder(field === 'name' || field === 'studentNumber' ? 'asc' : 'desc');
    }
  };

  // Filtered evaluations for 'byTest' tab
  const currentSelectedTest = tests.find((t) => t.id === selectedTestId);
  const rawTestEvaluations = (evalSummary?.evaluations || []).filter((e) => e.testId === selectedTestId);
  const testPassCount = rawTestEvaluations.filter((e) => e.passed).length;
  const testPassRate = rawTestEvaluations.length > 0 ? Math.round((testPassCount / rawTestEvaluations.length) * 100) : 0;
  const testAvgScore = rawTestEvaluations.length > 0 ? Math.round((rawTestEvaluations.reduce((acc, e) => acc + e.score, 0) / rawTestEvaluations.length) * 10) / 10 : 0;
  const testAvgWpm = rawTestEvaluations.length > 0 ? Math.round(rawTestEvaluations.reduce((acc, e) => acc + e.wpm, 0) / rawTestEvaluations.length) : 0;

  const filteredTestEvaluations = rawTestEvaluations
    .filter((e) => {
      const q = testEvalSearch.toLowerCase().trim();
      const matchesSearch = !q || (e.studentName || '').toLowerCase().includes(q);
      const matchesStatus =
        testEvalFilterStatus === 'all' ||
        (testEvalFilterStatus === 'passed' && e.passed) ||
        (testEvalFilterStatus === 'failed' && !e.passed);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (testEvalSortBy === 'score') cmp = a.score - b.score;
      else if (testEvalSortBy === 'wpm') cmp = a.wpm - b.wpm;
      else if (testEvalSortBy === 'accuracy') cmp = a.accuracy - b.accuracy;
      else if (testEvalSortBy === 'mistakes') cmp = a.mistakesCount - b.mistakesCount;
      else if (testEvalSortBy === 'time') cmp = a.timeSpentSeconds - b.timeSpentSeconds;
      else if (testEvalSortBy === 'date') cmp = new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
      else if (testEvalSortBy === 'student') cmp = (a.studentName || '').localeCompare(b.studentName || '', 'fr');
      return testEvalSortOrder === 'asc' ? cmp : -cmp;
    });

  const toggleTestEvalSort = (field: typeof testEvalSortBy) => {
    if (testEvalSortBy === field) {
      setTestEvalSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setTestEvalSortBy(field);
      setTestEvalSortOrder(field === 'score' || field === 'wpm' || field === 'accuracy' || field === 'date' ? 'desc' : 'asc');
    }
  };

  // Filtered & sorted student summaries for Print Modal (.print-area)
  const printableClassStudents = [...(evalSummary?.studentSummaries || [])]
    .filter(s => !printOnlyParticipated || s.totalTestsAttempted > 0)
    .sort((a, b) => {
      if (printSortOrder === 'score-desc') {
        if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
        return b.bestWpm - a.bestWpm;
      }
      if (printSortOrder === 'name-asc') {
        return a.student.lastName.localeCompare(b.student.lastName, 'fr', { sensitivity: 'base' }) ||
               a.student.firstName.localeCompare(b.student.firstName, 'fr', { sensitivity: 'base' });
      }
      return a.student.studentNumber.localeCompare(b.student.studentNumber, 'fr', { numeric: true });
    });

  // Filtered tests for 'manageTests' tab
  const filteredManageTests = tests
    .filter((t) => {
      const q = manageTestSearch.toLowerCase().trim();
      const matchesSearch = !q || (
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.targetText.toLowerCase().includes(q)
      );
      const matchesTheme = manageTestTheme === 'all' || t.theme === manageTestTheme;
      return matchesSearch && matchesTheme;
    })
    .sort((a, b) => {
      if (manageTestSort === 'level-asc') return a.level - b.level || a.title.localeCompare(b.title, 'fr');
      if (manageTestSort === 'level-desc') return b.level - a.level || a.title.localeCompare(b.title, 'fr');
      if (manageTestSort === 'title-asc') return a.title.localeCompare(b.title, 'fr');
      if (manageTestSort === 'title-desc') return b.title.localeCompare(a.title, 'fr');
      if (manageTestSort === 'wpm-desc') return b.minWpm - a.minWpm;
      if (manageTestSort === 'time-asc') return a.timeLimitSeconds - b.timeLimitSeconds;
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Overview Totals & Averages for the Class */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Taux de réussite</span>
          </div>
          <p className="text-2xl font-black font-mono text-slate-900">
            {evalSummary?.passRate ?? 0}%
          </p>
          <span className="text-[11px] text-slate-400">
            {evalSummary?.passedCount ?? 0} validés sur {evalSummary?.totalSubmissions ?? 0}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <span>Moyenne classe</span>
          </div>
          <p className="text-2xl font-black font-mono text-indigo-600">
            {evalSummary?.averageScore ?? 0} <span className="text-xs font-normal text-slate-400">/ 20</span>
          </p>
          <span className="text-[11px] text-slate-400">Notes calculées</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Vitesse moyenne</span>
          </div>
          <p className="text-2xl font-black font-mono text-slate-900">
            {evalSummary?.averageWpm ?? 0} <span className="text-xs font-normal text-slate-400">WPM</span>
          </p>
          <span className="text-[11px] text-slate-400">Mots par minute</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Target className="w-4 h-4 text-emerald-500" />
            <span>Précision moy.</span>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600">
            {evalSummary?.averageAccuracy ?? 0}%
          </p>
          <span className="text-[11px] text-slate-400">Frappe correcte</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span>Élèves classe</span>
          </div>
          <p className="text-2xl font-black font-mono text-slate-900">
            {evalSummary?.studentSummaries.length ?? 0}
          </p>
          <span className="text-[11px] text-slate-400">{className}</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs and Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('students')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'students'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Évaluation Par Élève
          </button>

          <button
            onClick={() => setActiveSubTab('byTest')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'byTest'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Évaluation Par Test
          </button>

          <button
            onClick={() => setActiveSubTab('manageTests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'manageTests'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Gestion des Tests ({tests.length})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-export-pdf-results"
            type="button"
            onClick={() => {
              setPrintScope('class');
              setShowPrintResultsModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/20 cursor-pointer flex-shrink-0"
            title="Générer une version imprimable et exporter les résultats des élèves en PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Exporter en PDF</span>
          </button>

          <button
            onClick={() => setShowAddTestModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 cursor-pointer flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Créer un test de rapidité</span>
          </button>
        </div>
      </div>

      {/* Loading & Error indicators */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Chargement des données d'évaluation...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* TAB 1: PAR ÉLÈVE */}
          {activeSubTab === 'students' && (
            <div className="space-y-4">
              {/* Filter & Sort Bar for Students */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Rechercher un élève..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="h-8 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-56"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[11px]">Statut :</span>
                    <select
                      value={studentFilterStatus}
                      onChange={(e) => setStudentFilterStatus(e.target.value as any)}
                      className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                    >
                      <option value="all">Tous les élèves</option>
                      <option value="passed">Ayant validé ≥ 1 test</option>
                      <option value="no-passed">Aucun test validé</option>
                      <option value="attempted">Au moins 1 tentative</option>
                      <option value="none">Aucune tentative</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500 text-[11px]">Trier :</span>
                    <select
                      value={`${studentSortBy}-${studentSortOrder}`}
                      onChange={(e) => {
                        const [f, o] = e.target.value.split('-') as [any, any];
                        setStudentSortBy(f);
                        setStudentSortOrder(o);
                      }}
                      className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                    >
                      <option value="name-asc">Nom (A → Z)</option>
                      <option value="name-desc">Nom (Z → A)</option>
                      <option value="studentNumber-asc">Identifiant INE</option>
                      <option value="passed-desc">Niveaux validés (décroissant)</option>
                      <option value="avgScore-desc">Moyenne note (décroissant)</option>
                      <option value="bestWpm-desc">Meilleur WPM (décroissant)</option>
                      <option value="attempts-desc">Tentatives (décroissant)</option>
                    </select>
                  </div>

                  {(studentSearch || studentFilterStatus !== 'all') && (
                    <button
                      onClick={() => { setStudentSearch(''); setStudentFilterStatus('all'); }}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Réinitialiser</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-[11px] text-slate-500 font-medium">
                    <strong>{filteredStudentSummaries.length}</strong> sur <strong>{evalSummary?.studentSummaries?.length || 0}</strong> élève{(evalSummary?.studentSummaries?.length || 0) > 1 ? 's' : ''}
                  </div>
                  <button
                    id="btn-export-pdf-students-tab"
                    type="button"
                    onClick={() => {
                      setPrintScope('class');
                      setShowPrintResultsModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    title="Générer une version imprimable et exporter les résultats en PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Exporter en PDF</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold select-none">
                        <th
                          onClick={() => toggleStudentSort('name')}
                          className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Élève</span>
                            {studentSortBy === 'name' ? (
                              studentSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                            ) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                          </div>
                        </th>
                        <th
                          onClick={() => toggleStudentSort('studentNumber')}
                          className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Identifiant</span>
                            {studentSortBy === 'studentNumber' ? (
                              studentSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                            ) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                          </div>
                        </th>
                        <th
                          onClick={() => toggleStudentSort('passed')}
                          className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Niveaux validés</span>
                            {studentSortBy === 'passed' ? (
                              studentSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                            ) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                          </div>
                        </th>
                        <th
                          onClick={() => toggleStudentSort('avgScore')}
                          className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Moyenne (/20)</span>
                            {studentSortBy === 'avgScore' ? (
                              studentSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                            ) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                          </div>
                        </th>
                        <th
                          onClick={() => toggleStudentSort('bestWpm')}
                          className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Meilleur WPM</span>
                            {studentSortBy === 'bestWpm' ? (
                              studentSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                            ) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                          </div>
                        </th>
                        <th
                          onClick={() => toggleStudentSort('attempts')}
                          className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Tentatives</span>
                            {studentSortBy === 'attempts' ? (
                              studentSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                            ) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                          </div>
                        </th>
                        <th className="py-3.5 px-4 text-right">Détails</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudentSummaries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            Aucun élève trouvé.
                          </td>
                        </tr>
                      ) : (
                        filteredStudentSummaries.map((summary) => {
                          const isExpanded = expandedStudentId === summary.student.id;

                          return (
                            <React.Fragment key={summary.student.id}>
                              <tr className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3.5 px-4 font-bold text-slate-900">
                                  {summary.student.lastName.toUpperCase()} {summary.student.firstName}
                                </td>
                                <td className="py-3.5 px-4 font-mono text-slate-500">
                                  {summary.student.studentNumber}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold ${
                                    summary.testsPassedCount > 0
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {summary.testsPassedCount} validés
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center font-bold text-slate-800 font-mono">
                                  {summary.totalTestsAttempted > 0 ? `${summary.averageScore} / 20` : '—'}
                                </td>
                                <td className="py-3.5 px-4 text-center font-bold text-indigo-600 font-mono">
                                  {summary.bestWpm > 0 ? `${summary.bestWpm} WPM` : '—'}
                                </td>
                                <td className="py-3.5 px-4 text-center text-slate-500">
                                  {summary.totalTestsAttempted}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={() =>
                                      setExpandedStudentId(isExpanded ? null : summary.student.id)
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                                  >
                                    <span>{isExpanded ? 'Masquer' : 'Historique'}</span>
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </td>
                              </tr>

                              {/* Expanded Row with student detailed attempts */}
                              {isExpanded && (
                                <tr className="bg-slate-50/90 border-b border-slate-200">
                                  <td colSpan={7} className="p-4">
                                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-indigo-600" />
                                        <span>
                                          Historique détaillé des évaluations de {summary.student.firstName} {summary.student.lastName}
                                        </span>
                                      </h4>

                                      {summary.evaluations.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">
                                          Cet élève n'a pas encore passé de test de frappe.
                                        </p>
                                      ) : (
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-xs text-left">
                                            <thead>
                                              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                                                <th className="py-2 px-2">Épreuve</th>
                                                <th className="py-2 px-2">Matière</th>
                                                <th className="py-2 px-2 text-center">Vitesse</th>
                                                <th className="py-2 px-2 text-center">Précision</th>
                                                <th className="py-2 px-2 text-center">Erreurs</th>
                                                <th className="py-2 px-2 text-center">Temps</th>
                                                <th className="py-2 px-2 text-center">Note</th>
                                                <th className="py-2 px-2 text-center">Statut</th>
                                                <th className="py-2 px-2 text-right">Date</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {summary.evaluations.map((ev) => (
                                                <tr key={ev.id} className="hover:bg-slate-50">
                                                  <td className="py-2 px-2 font-medium text-slate-800">
                                                    {ev.testTitle}
                                                  </td>
                                                  <td className="py-2 px-2">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                      {ev.testTheme} • Niv. {ev.testLevel}
                                                    </span>
                                                  </td>
                                                  <td className="py-2 px-2 text-center font-mono font-bold">
                                                    {ev.wpm} WPM
                                                  </td>
                                                  <td className="py-2 px-2 text-center font-mono">
                                                    {ev.accuracy}%
                                                  </td>
                                                  <td className="py-2 px-2 text-center font-mono text-rose-500">
                                                    {ev.mistakesCount}
                                                  </td>
                                                  <td className="py-2 px-2 text-center font-mono text-slate-500">
                                                    {ev.timeSpentSeconds}s
                                                  </td>
                                                  <td className="py-2 px-2 text-center font-mono font-bold text-indigo-600">
                                                    {ev.score} / 20
                                                  </td>
                                                  <td className="py-2 px-2 text-center">
                                                    {ev.passed ? (
                                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                        Validé
                                                      </span>
                                                    ) : (
                                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                                        <XCircle className="w-3 h-3 text-rose-600" />
                                                        Non validé
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td className="py-2 px-2 text-right text-slate-400">
                                                    {new Date(ev.completedAt).toLocaleString('fr-FR', {
                                                      day: '2-digit',
                                                      month: '2-digit',
                                                      hour: '2-digit',
                                                      minute: '2-digit'
                                                    })}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAR TEST */}
          {activeSubTab === 'byTest' && (
            <div className="space-y-4">
              {/* Select test */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                  Sélectionner un test :
                </label>
                <select
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                  className="w-full sm:max-w-md px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  {tests.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.theme} • Niv. {t.level}] {t.title} ({t.timeLimitSeconds}s)
                    </option>
                  ))}
                </select>
              </div>

              {currentSelectedTest && (
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200/60 text-indigo-800">
                        {currentSelectedTest.theme} • Niveau {currentSelectedTest.level}
                      </span>
                      <span className="text-xs text-slate-500">
                        Temps limite : {currentSelectedTest.timeLimitSeconds}s • Min. {currentSelectedTest.minWpm} WPM • Min. {currentSelectedTest.minAccuracyPercent}%
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {currentSelectedTest.title}
                    </h3>
                  </div>

                  {/* Quick stats for this test */}
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-center">
                      <span className="text-slate-400 block text-[10px]">Taux réussite</span>
                      <span className="font-bold text-slate-900 text-sm">{testPassRate}%</span>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-400 block text-[10px]">Moyenne note</span>
                      <span className="font-bold text-indigo-600 text-sm">{testAvgScore}/20</span>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-400 block text-[10px]">Vitesse moy.</span>
                      <span className="font-bold text-emerald-600 text-sm">{testAvgWpm} WPM</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ByTest Filters and Search Bar */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filtrer par nom d'élève..."
                      value={testEvalSearch}
                      onChange={(e) => setTestEvalSearch(e.target.value)}
                      className="h-8 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-56"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[11px]">Résultat :</span>
                    <select
                      value={testEvalFilterStatus}
                      onChange={(e) => setTestEvalFilterStatus(e.target.value as any)}
                      className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                    >
                      <option value="all">Tous résultats</option>
                      <option value="passed">Validés uniquement</option>
                      <option value="failed">Non validés</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500 text-[11px]">Trier :</span>
                    <select
                      value={`${testEvalSortBy}-${testEvalSortOrder}`}
                      onChange={(e) => {
                        const [f, o] = e.target.value.split('-') as [any, any];
                        setTestEvalSortBy(f);
                        setTestEvalSortOrder(o);
                      }}
                      className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                    >
                      <option value="score-desc">Note la plus haute</option>
                      <option value="score-asc">Note la plus basse</option>
                      <option value="wpm-desc">Vitesse WPM (décroissant)</option>
                      <option value="accuracy-desc">Précision (décroissant)</option>
                      <option value="mistakes-asc">Moins d'erreurs</option>
                      <option value="date-desc">Date la plus récente</option>
                      <option value="date-asc">Date la plus ancienne</option>
                      <option value="student-asc">Élève (A → Z)</option>
                    </select>
                  </div>

                  {(testEvalSearch || testEvalFilterStatus !== 'all') && (
                    <button
                      onClick={() => { setTestEvalSearch(''); setTestEvalFilterStatus('all'); }}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Réinitialiser</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-[11px] text-slate-500 font-medium">
                    <strong>{filteredTestEvaluations.length}</strong> tentative{filteredTestEvaluations.length > 1 ? 's' : ''} affichée{filteredTestEvaluations.length > 1 ? 's' : ''}
                  </div>
                  <button
                    id="btn-export-pdf-test-tab"
                    type="button"
                    onClick={() => {
                      setPrintScope('test');
                      setShowPrintResultsModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    title="Générer une version imprimable et exporter les résultats de ce test en PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Exporter en PDF</span>
                  </button>
                </div>
              </div>

              {/* Table of results for this test */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold select-none">
                        <th
                          onClick={() => toggleTestEvalSort('student')}
                          className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Élève</span>
                            {testEvalSortBy === 'student' ? (
                              testEvalSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                            ) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                          </div>
                        </th>
                        <th
                          onClick={() => toggleTestEvalSort('wpm')}
                          className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Vitesse (WPM)</span>
                            {testEvalSortBy === 'wpm' ? (
                              testEvalSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                            ) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                          </div>
                        </th>
                        <th
                          onClick={() => toggleTestEvalSort('accuracy')}
                          className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Précision</span>
                            {testEvalSortBy === 'accuracy' ? (
                              testEvalSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                            ) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                          </div>
                        </th>
                        <th
                          onClick={() => toggleTestEvalSort('mistakes')}
                          className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Erreurs</span>
                            {testEvalSortBy === 'mistakes' ? (
                              testEvalSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                            ) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                          </div>
                        </th>
                        <th
                          onClick={() => toggleTestEvalSort('time')}
                          className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Temps réalisé</span>
                            {testEvalSortBy === 'time' ? (
                              testEvalSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                            ) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                          </div>
                        </th>
                        <th
                          onClick={() => toggleTestEvalSort('score')}
                          className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Note (/20)</span>
                            {testEvalSortBy === 'score' ? (
                              testEvalSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                            ) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                          </div>
                        </th>
                        <th className="py-3 px-4 text-center">Statut</th>
                        <th
                          onClick={() => toggleTestEvalSort('date')}
                          className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Date de passage</span>
                            {testEvalSortBy === 'date' ? (
                              testEvalSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                            ) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTestEvaluations.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400">
                            <Search className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                            <p className="font-semibold text-slate-700">Aucune évaluation trouvée</p>
                            {rawTestEvaluations.length === 0 ? (
                              <p className="text-xs text-slate-400 mt-1">Aucun élève n’a encore passé cette épreuve.</p>
                            ) : (
                              <button
                                onClick={() => { setTestEvalSearch(''); setTestEvalFilterStatus('all'); }}
                                className="mt-2 text-xs text-indigo-600 hover:underline font-semibold"
                              >
                                Réinitialiser les filtres
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredTestEvaluations.map((ev) => (
                          <tr key={ev.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {ev.studentName}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold">
                              {ev.wpm}
                            </td>
                            <td className="py-3 px-4 text-center font-mono">
                              {ev.accuracy}%
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-rose-500">
                              {ev.mistakesCount}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-slate-500">
                              {ev.timeSpentSeconds}s
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-indigo-600">
                              {ev.score}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {ev.passed ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Validé
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  Non validé
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-400">
                              {new Date(ev.completedAt).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GESTION DES TESTS (MANAGE TESTS) */}
          {activeSubTab === 'manageTests' && (
            <div className="space-y-4">
              {/* Filter and Search Bar for Tests */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Rechercher test..."
                      value={manageTestSearch}
                      onChange={(e) => setManageTestSearch(e.target.value)}
                      className="h-8 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44 sm:w-52"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[11px]">Thème :</span>
                    <select
                      value={manageTestTheme}
                      onChange={(e) => setManageTestTheme(e.target.value as any)}
                      className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                    >
                      <option value="all">Tous thèmes</option>
                      <option value="Word">Word</option>
                      <option value="Excel">Excel</option>
                      <option value="Python">Python</option>
                      <option value="Général">Général</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500 text-[11px]">Trier :</span>
                    <select
                      value={manageTestSort}
                      onChange={(e) => setManageTestSort(e.target.value as any)}
                      className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                    >
                      <option value="level-asc">Niveau croissant (1 → 5)</option>
                      <option value="level-desc">Niveau décroissant (5 → 1)</option>
                      <option value="title-asc">Titre (A → Z)</option>
                      <option value="title-desc">Titre (Z → A)</option>
                      <option value="wpm-desc">Min. WPM requis</option>
                      <option value="time-asc">Temps alloué (croissant)</option>
                    </select>
                  </div>

                  {(manageTestSearch || manageTestTheme !== 'all') && (
                    <button
                      onClick={() => { setManageTestSearch(''); setManageTestTheme('all'); }}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Réinitialiser</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 font-medium">
                  <strong>{filteredManageTests.length}</strong> test{filteredManageTests.length > 1 ? 's' : ''} disponible{filteredManageTests.length > 1 ? 's' : ''}
                </div>
              </div>

              {filteredManageTests.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                  <Keyboard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700 text-sm">Aucun test ne correspond à vos filtres</p>
                  <button
                    onClick={() => { setManageTestSearch(''); setManageTestTheme('all'); }}
                    className="mt-2 text-xs text-indigo-600 hover:underline font-semibold"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredManageTests.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                          {getThemeIcon(t.theme)}
                          <span>{t.theme} • Niveau {t.level}</span>
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditTest(t)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Modifier ce test"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTest(t.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Supprimer ce test"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {t.title}
                      </h4>

                      {t.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {t.description}
                        </p>
                      )}

                      {/* Multi-classes indication */}
                      {t.classIds && t.classIds.length > 1 && (
                        <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-medium">
                          <Layers className="w-3 h-3" />
                          <span>Associé à {t.classIds.length} classes</span>
                        </div>
                      )}

                      {/* Text extract */}
                      <div className="p-2.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] line-clamp-3 leading-relaxed">
                        {t.targetText}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Temps</span>
                        <span className="font-bold text-slate-800">{t.timeLimitSeconds}s</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Min. WPM</span>
                        <span className="font-bold text-slate-800">{t.minWpm}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Précision</span>
                        <span className="font-bold text-slate-800">{t.minAccuracyPercent}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          )}
        </>
      )}

      {/* CREATE NEW TEST MODAL */}
      {showAddTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-indigo-600" />
                <span>Nouveau Test de Rapidité de Frappe pour la classe</span>
              </h3>
              <button
                onClick={() => setShowAddTestModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Titre du test *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Python Niveau 4 : Dictionnaires et boucles while"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Thème / Support *
                  </label>
                  <select
                    value={newTheme}
                    onChange={(e) => setNewTheme(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="Word">Word (Traitement de texte)</option>
                    <option value="Excel">Excel (Formules & Tableaux)</option>
                    <option value="Python">Python (Scripts & Code)</option>
                    <option value="Général">Général</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Niveau * (Progression)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={newLevel}
                    onChange={(e) => setNewLevel(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Temps imparti (sec) *
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="600"
                    step="5"
                    required
                    value={newTimeLimit}
                    onChange={(e) => setNewTimeLimit(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Précision min. requise (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={newMinAccuracy}
                    onChange={(e) => setNewMinAccuracy(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Vitesse min. requise (WPM)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={newMinWpm}
                    onChange={(e) => setNewMinWpm(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Multi-class Association */}
              {classes.length > 0 && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Associer ce test aux classes :</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {classes.map((c) => {
                      const isSelected = newClassIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (newClassIds.length > 1) {
                                setNewClassIds(newClassIds.filter((id) => id !== c.id));
                              }
                            } else {
                              setNewClassIds([...newClassIds, c.id]);
                            }
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '} {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description brève / Objectif pédagogique
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ex: Maîtriser la saisie des guillemets et de l'indentation de 4 espaces"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Texte exact à reproduire au clavier *
                  </label>
                  {newTheme === 'Python' && (
                    <button
                      type="button"
                      onClick={() => {
                        const formatted = formatPythonCode(newTargetText);
                        setNewTargetText(formatted);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition-colors"
                      title="Mettre en forme le code Python aux normes PEP 8"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>Formater script Python (PEP 8)</span>
                    </button>
                  )}
                </div>
                <textarea
                  required
                  rows={4}
                  value={newTargetText}
                  onChange={(e) => setNewTargetText(e.target.value)}
                  placeholder="Tapez le texte ou le script python ou la formule excel que l'élève devra saisir au clavier..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-y"
                />
                {newTheme === 'Python' && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    ✓ Le script sera automatiquement mis en forme aux normes PEP 8 lors de l'enregistrement.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddTestModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTest}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingTest ? 'Création en cours...' : 'Créer et Enregistrer le test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEST MODAL */}
      {editingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-600" />
                <span>Modifier le Test de Frappe</span>
              </h3>
              <button
                onClick={() => setEditingTest(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTest} className="p-6 space-y-4">
              {editFormError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {editFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Titre du test *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Thème / Support *
                  </label>
                  <select
                    value={editTheme}
                    onChange={(e) => setEditTheme(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="Word">Word (Traitement de texte)</option>
                    <option value="Excel">Excel (Formules & Tableaux)</option>
                    <option value="Python">Python (Scripts & Code)</option>
                    <option value="Général">Général</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Niveau *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={editLevel}
                    onChange={(e) => setEditLevel(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Temps imparti (sec) *
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="600"
                    step="5"
                    required
                    value={editTimeLimit}
                    onChange={(e) => setEditTimeLimit(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Précision min. requise (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={editMinAccuracy}
                    onChange={(e) => setEditMinAccuracy(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Vitesse min. requise (WPM)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={editMinWpm}
                    onChange={(e) => setEditMinWpm(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Multi-class Association */}
              {classes.length > 0 && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Classes associées à ce test :</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {classes.map((c) => {
                      const isSelected = editClassIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (editClassIds.length > 1) {
                                setEditClassIds(editClassIds.filter((id) => id !== c.id));
                              }
                            } else {
                              setEditClassIds([...editClassIds, c.id]);
                            }
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '} {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description brève / Objectif pédagogique
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Texte exact à reproduire au clavier *
                  </label>
                  {editTheme === 'Python' && (
                    <button
                      type="button"
                      onClick={() => {
                        const formatted = formatPythonCode(editTargetText);
                        setEditTargetText(formatted);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition-colors"
                      title="Mettre en forme le code Python aux normes PEP 8"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>Formater script Python (PEP 8)</span>
                    </button>
                  )}
                </div>
                <textarea
                  required
                  rows={4}
                  value={editTargetText}
                  onChange={(e) => setEditTargetText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-y"
                />
                {editTheme === 'Python' && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    ✓ Le script sera automatiquement mis en forme aux normes PEP 8 lors de l'enregistrement.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingTest(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTest}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingTest ? 'Mise à jour en cours...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXPORT PDF & VERSION IMPRIMABLE DES RÉSULTATS (.print-area) */}
      {showPrintResultsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto print-modal">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-4 print-card flex flex-col max-h-[92vh]">
            {/* Modal Control Header (Hidden during Print) */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 no-print">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-2xl ring-1 ring-indigo-500/30">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base">
                      Exporter en PDF — Résultats des élèves
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-500/40">
                      .print-area
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Document officiel normalisé prêt pour impression ou enregistrement en PDF ({className})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-launch-print-dialog"
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-colors"
                  title="Ouvrir la boîte d'impression du navigateur (choisir 'Enregistrer au format PDF')"
                >
                  <Printer className="w-4 h-4" />
                  <span>Lancer l'impression / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleClosePrintModal}
                  className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Fermer la prévisualisation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Options Toolbar (Hidden during Print) */}
            <div className="p-3 sm:p-3.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0 no-print">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Scope selector */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-600 font-medium">Contenu :</span>
                  <select
                    value={printScope}
                    onChange={(e) => setPrintScope(e.target.value as any)}
                    className="py-1 px-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="class">Relevé général de la classe ({className})</option>
                    {currentSelectedTest && (
                      <option value="test">Test en cours : {currentSelectedTest.title}</option>
                    )}
                  </select>
                </div>

                {/* Sort selector */}
                {printScope === 'class' && (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-600 font-medium">Trier par :</span>
                    <select
                      value={printSortOrder}
                      onChange={(e) => setPrintSortOrder(e.target.value as any)}
                      className="py-1 px-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="score-desc">Moyenne (décroissante)</option>
                      <option value="name-asc">Nom alphabétique (A → Z)</option>
                      <option value="studentNumber-asc">Identifiant INE</option>
                    </select>
                  </div>
                )}

                {/* Format toggle */}
                {printScope === 'class' && (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-600 font-medium">Format :</span>
                    <select
                      value={printViewType}
                      onChange={(e) => setPrintViewType(e.target.value as any)}
                      className="py-1 px-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="summary">Synthèse (tableau principal)</option>
                      <option value="detailed">Détaillé (avec relevé de chaque test)</option>
                    </select>
                  </div>
                )}

                {/* Participated only filter */}
                {printScope === 'class' && (
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none text-xs">
                    <input
                      type="checkbox"
                      checked={printOnlyParticipated}
                      onChange={(e) => setPrintOnlyParticipated(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <span>Uniquement participants ({(evalSummary?.studentSummaries || []).filter(s => s.totalTestsAttempted > 0).length})</span>
                  </label>
                )}
              </div>

              <div className="text-[11px] text-slate-500 font-medium hidden md:block">
                💡 Sélectionnez <strong>« Enregistrer au format PDF »</strong> dans la boîte d'impression.
              </div>
            </div>

            {/* PRINT AREA CONTAINER: Dedicated printable view using .print-area */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto bg-white text-slate-900 print-area flex-1">
              {/* Institutional Header */}
              <div className="border-b-2 border-slate-900 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      RÉPUBLIQUE TUNISIENNE • MINISTÈRE DE L'ÉDUCATION
                    </p>
                    <h2 className="text-lg font-black text-slate-900 mt-0.5 tracking-tight uppercase">
                      LYCÉE IBN KHALDOUN — LABORATOIRE D'INFORMATIQUE
                    </h2>
                    <p className="text-xs text-slate-700 font-bold mt-1">
                      {printScope === 'class'
                        ? 'RELEVÉ OFFICIEL DES RÉSULTATS & ÉVALUATIONS DE RAPIDITÉ DE FRAPPE'
                        : `RÉSULTATS DE L'ÉVALUATION : ${(currentSelectedTest?.title || '').toUpperCase()}`}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-extrabold text-slate-900 text-sm px-3 py-1 bg-slate-100 rounded-lg inline-block border border-slate-300">
                      Classe : {className}
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1 font-medium">Année scolaire : 2024-2025</p>
                    <p className="text-slate-500 text-[10px]">
                      Édité le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Statistical Synthesis Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl border border-slate-300 bg-slate-50/70">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Moyenne Classe</span>
                  <span className="text-xl font-black text-indigo-900 mt-0.5 block">
                    {printScope === 'class' ? `${evalSummary?.averageScore ?? 0} / 20` : `${testAvgScore} / 20`}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-slate-300 bg-slate-50/70">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Taux de Réussite</span>
                  <span className="text-xl font-black text-emerald-800 mt-0.5 block">
                    {printScope === 'class' ? `${evalSummary?.passRate ?? 0}%` : `${testPassRate}%`}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-slate-300 bg-slate-50/70">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Vitesse Moyenne</span>
                  <span className="text-xl font-black text-amber-800 mt-0.5 block">
                    {printScope === 'class' ? `${evalSummary?.averageWpm ?? 0} WPM` : `${testAvgWpm} WPM`}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-slate-300 bg-slate-50/70">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Élèves Évalués</span>
                  <span className="text-xl font-black text-slate-900 mt-0.5 block">
                    {printScope === 'class'
                      ? `${(evalSummary?.studentSummaries || []).filter(s => s.totalTestsAttempted > 0).length} / ${evalSummary?.studentSummaries?.length ?? 0}`
                      : `${rawTestEvaluations.length} soumission${rawTestEvaluations.length > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>

              {/* General Class Table */}
              {printScope === 'class' ? (
                <div className="overflow-hidden border border-slate-300 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 uppercase tracking-wider font-bold text-[10px]">
                        <th className="py-2.5 px-3 text-center w-12 border-r border-slate-300">Rang</th>
                        <th className="py-2.5 px-3 border-r border-slate-300">Nom & Prénom de l'élève</th>
                        <th className="py-2.5 px-3 border-r border-slate-300 w-28">Identifiant INE</th>
                        <th className="py-2.5 px-2 text-center border-r border-slate-300 w-20">Tests Validés</th>
                        <th className="py-2.5 px-2 text-center border-r border-slate-300 w-24">Note (/20)</th>
                        <th className="py-2.5 px-2 text-center border-r border-slate-300 w-24">Vitesse (WPM)</th>
                        <th className="py-2.5 px-2 text-center border-r border-slate-300 w-20">Précision</th>
                        <th className="py-2.5 px-2 text-center border-r border-slate-300 w-20">Tentatives</th>
                        <th className="py-2.5 px-3 text-center w-28">Mention</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {printableClassStudents.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-500">
                            Aucun résultat disponible pour cette sélection.
                          </td>
                        </tr>
                      ) : (
                        printableClassStudents.map((summary, idx) => {
                          const mention = getGradeMention(summary.averageScore, summary.totalTestsAttempted > 0);
                          const studentAvgAccuracy = summary.evaluations && summary.evaluations.length > 0
                            ? Math.round(summary.evaluations.reduce((acc, ev) => acc + (ev.accuracy || 0), 0) / summary.evaluations.length)
                            : 0;
                          return (
                            <React.Fragment key={summary.student.id}>
                              <tr className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                                <td className="py-2 px-3 text-center font-bold text-slate-600 border-r border-slate-200">
                                  {summary.totalTestsAttempted > 0 ? `${idx + 1}` : '—'}
                                </td>
                                <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200">
                                  {summary.student.lastName.toUpperCase()} {summary.student.firstName}
                                  {summary.student.isRepeating && (
                                    <span className="ml-1.5 text-[9px] font-semibold text-amber-800 bg-amber-100 px-1 py-0.5 rounded border border-amber-300">
                                      Redoublant
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 font-mono text-slate-700 border-r border-slate-200">
                                  {summary.student.studentNumber}
                                </td>
                                <td className="py-2 px-2 text-center font-semibold text-slate-800 border-r border-slate-200">
                                  {summary.testsPassedCount}
                                </td>
                                <td className="py-2 px-2 text-center font-extrabold text-sm border-r border-slate-200 text-indigo-900">
                                  {summary.totalTestsAttempted > 0 ? `${summary.averageScore.toFixed(1)}` : '—'}
                                </td>
                                <td className="py-2 px-2 text-center font-mono text-slate-800 border-r border-slate-200">
                                  {summary.bestWpm > 0 ? `${summary.bestWpm}` : '—'}
                                </td>
                                <td className="py-2 px-2 text-center font-mono text-slate-800 border-r border-slate-200">
                                  {studentAvgAccuracy > 0 ? `${studentAvgAccuracy}%` : '—'}
                                </td>
                                <td className="py-2 px-2 text-center font-mono text-slate-600 border-r border-slate-200">
                                  {summary.totalTestsAttempted}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${mention.color}`}>
                                    {mention.label}
                                  </span>
                                </td>
                              </tr>
                              {printViewType === 'detailed' && summary.evaluations && summary.evaluations.length > 0 && (
                                <tr className="bg-slate-50/80 border-b border-slate-200">
                                  <td colSpan={9} className="p-3 pl-8">
                                    <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                      <span>Tests réalisés ({summary.evaluations.length}) :</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                                      {summary.evaluations.map((ev, eIdx) => (
                                        <div key={eIdx} className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-300">
                                          <span className="font-medium text-slate-800 truncate mr-2">{ev.testTitle}</span>
                                          <div className="flex items-center gap-2 font-mono flex-shrink-0">
                                            <span className="font-bold text-indigo-700">{ev.score}/20</span>
                                            <span className="text-slate-600">{ev.wpm} WPM</span>
                                            <span className="text-slate-600">{ev.accuracy}%</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                              ev.passed ? 'text-emerald-800 bg-emerald-50 border-emerald-300' : 'text-rose-800 bg-rose-50 border-rose-300'
                                            }`}>
                                              {ev.passed ? 'Validé' : 'Non validé'}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* By Specific Test Table */
                <div className="overflow-hidden border border-slate-300 rounded-xl">
                  <div className="bg-slate-50 p-3 border-b border-slate-300 text-xs">
                    <h4 className="font-bold text-slate-900">
                      Critères du test : {currentSelectedTest?.title} ({currentSelectedTest?.theme} • Niveau {currentSelectedTest?.level})
                    </h4>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Temps limite : {currentSelectedTest?.timeLimitSeconds}s • Débit minimum : {currentSelectedTest?.minWpm} WPM • Précision minimum : {currentSelectedTest?.minAccuracyPercent}%
                    </p>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 uppercase tracking-wider font-bold text-[10px]">
                        <th className="py-2.5 px-3 text-center w-12 border-r border-slate-300">N°</th>
                        <th className="py-2.5 px-3 border-r border-slate-300">Nom & Prénom de l'élève</th>
                        <th className="py-2.5 px-3 text-center border-r border-slate-300 w-24">Note (/20)</th>
                        <th className="py-2.5 px-3 text-center border-r border-slate-300 w-24">Vitesse</th>
                        <th className="py-2.5 px-3 text-center border-r border-slate-300 w-20">Précision</th>
                        <th className="py-2.5 px-3 text-center border-r border-slate-300 w-20">Erreurs</th>
                        <th className="py-2.5 px-3 text-center border-r border-slate-300 w-24">Temps</th>
                        <th className="py-2.5 px-3 text-center border-r border-slate-300 w-24">Statut</th>
                        <th className="py-2.5 px-3 text-right">Date de passation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rawTestEvaluations.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-500">
                            Aucun élève n'a encore complété cette évaluation.
                          </td>
                        </tr>
                      ) : (
                        rawTestEvaluations.map((ev, idx) => (
                          <tr key={ev.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                            <td className="py-2 px-3 text-center font-bold text-slate-600 border-r border-slate-200">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200">
                              {ev.studentName}
                            </td>
                            <td className="py-2 px-3 text-center font-extrabold text-sm border-r border-slate-200 text-indigo-900">
                              {ev.score} / 20
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-800 border-r border-slate-200">
                              {ev.wpm} WPM
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-800 border-r border-slate-200">
                              {ev.accuracy}%
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-800 border-r border-slate-200">
                              {ev.mistakesCount}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-800 border-r border-slate-200">
                              {ev.timeSpentSeconds}s
                            </td>
                            <td className="py-2 px-3 text-center border-r border-slate-200">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                ev.passed ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                              }`}>
                                {ev.passed ? 'Validé' : 'Non validé'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600 text-[11px]">
                              {new Date(ev.completedAt).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Document Official Footer */}
              <div className="pt-4 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1.5">
                    Échelle d'évaluation & Mentions officielles
                  </h4>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-700">
                    <div>• 16 à 20 : <strong>Très Bien</strong></div>
                    <div>• 14 à 15.9 : <strong>Bien</strong></div>
                    <div>• 12 à 13.9 : <strong>Assez Bien</strong></div>
                    <div>• 10 à 11.9 : <strong>Passable</strong></div>
                    <div className="col-span-2">• Moins de 10 : <strong>Insuffisant / À consolider</strong></div>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/60 flex flex-col justify-between min-h-[95px]">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                    <span>Observations & Visa du Professeur :</span>
                    <span className="font-normal text-slate-500 text-[10px]">Date et signature :</span>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 italic pt-6">
                    Lycée Ibn Khaldoun • Enseignant d'Informatique
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
