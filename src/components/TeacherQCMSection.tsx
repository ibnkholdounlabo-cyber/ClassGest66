import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Plus,
  Trash2,
  FileText,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  BarChart3,
  Eye,
  Check,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Edit3,
  Printer,
  Download,
  BookOpen,
  School,
  CheckSquare,
  Square,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal
} from 'lucide-react';
import { api } from '../api';
import { QCM, QCMQuestion, QCMEvaluationSummary, QCMSubmission, ClassGroup } from '../types';
import { parseQcmImportText, SAMPLE_QCM_IMPORT, ParsedQuestionRow } from '../utils/qcmParser';

interface TeacherQCMSectionProps {
  classId: string;
  className: string;
  token: string;
  classes?: ClassGroup[];
}

export const TeacherQCMSection: React.FC<TeacherQCMSectionProps> = ({
  classId,
  className,
  token,
  classes
}) => {
  const [qcms, setQcms] = useState<QCM[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');

  // Filter & sort for main QCM list
  const [qcmSearch, setQcmSearch] = useState('');
  const [qcmStatusFilter, setQcmStatusFilter] = useState<'all' | 'active' | 'draft'>('all');
  const [qcmSortBy, setQcmSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'questions-desc' | 'duration-asc'>('date-desc');

  // Filter & sort for questions in managing modal
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionSort, setQuestionSort] = useState<'default' | 'text-asc' | 'points-desc' | 'points-asc'>('default');

  // Filter & sort for submissions in evaluation modal
  const [evalSubSearch, setEvalSubSearch] = useState('');
  const [evalSubScoreFilter, setEvalSubScoreFilter] = useState<'all' | 'pass' | 'fail' | 'high'>('all');
  const [evalSubSortBy, setEvalSubSortBy] = useState<'score-desc' | 'score-asc' | 'name-asc' | 'time-asc' | 'date-desc'>('score-desc');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQcm, setEditingQcm] = useState<QCM | null>(null);

  // Import Modal state
  const [importTargetQcm, setImportTargetQcm] = useState<QCM | null>(null);
  const [importText, setImportText] = useState('');
  const [importReplace, setImportReplace] = useState(true);
  const [importing, setImporting] = useState(false);

  // View / Manage Questions modal state
  const [managingQcm, setManagingQcm] = useState<QCM | null>(null);
  const [managingQuestions, setManagingQuestions] = useState<QCMQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showAddQuestionForm, setShowAddQuestionForm] = useState(false);

  // Add Question form state
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptionA, setNewOptionA] = useState('');
  const [newOptionB, setNewOptionB] = useState('');
  const [newOptionC, setNewOptionC] = useState('');
  const [newOptionD, setNewOptionD] = useState('');
  const [newCorrectOption, setNewCorrectOption] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [newPoints, setNewPoints] = useState<number>(2);
  const [newExplanation, setNewExplanation] = useState('');

  // Results & Evaluations modal state
  const [evaluationQcm, setEvaluationQcm] = useState<QCM | null>(null);
  const [evaluationData, setEvaluationData] = useState<QCMEvaluationSummary | null>(null);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [inspectingSubmission, setInspectingSubmission] = useState<QCMSubmission | null>(null);

  // In-app Delete confirmation state
  const [qcmToDelete, setQcmToDelete] = useState<QCM | null>(null);
  const [deletingQcm, setDeletingQcm] = useState(false);

  // Create/Edit form fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<'Word' | 'Excel' | 'Python' | 'Général'>('Général');
  const [formDescription, setFormDescription] = useState('');
  const [formDurationMinutes, setFormDurationMinutes] = useState<number>(15);
  const [formTotalPoints, setFormTotalPoints] = useState<number>(20);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formInitialQuestions, setFormInitialQuestions] = useState('');
  const [availableClasses, setAvailableClasses] = useState<ClassGroup[]>(classes || []);
  const [formSelectedClassIds, setFormSelectedClassIds] = useState<string[]>([]);

  useEffect(() => {
    if (classes && classes.length > 0) {
      setAvailableClasses(classes);
    } else {
      api.teacherGetClasses(token).then(cls => {
        if (Array.isArray(cls)) {
          setAvailableClasses(cls);
        }
      }).catch(err => console.warn('Erreur chargement classes pour QCM:', err));
    }
  }, [classes, token]);

  const toggleClassSelection = (targetClassId: string) => {
    setFormSelectedClassIds(prev => {
      if (prev.includes(targetClassId)) {
        return prev.filter(id => id !== targetClassId);
      } else {
        return [...prev, targetClassId];
      }
    });
  };

  const selectAllClasses = () => {
    setFormSelectedClassIds(availableClasses.map(c => c.id));
  };

  const deselectAllClasses = () => {
    setFormSelectedClassIds([]);
  };

  const selectCurrentClassOnly = () => {
    setFormSelectedClassIds([classId]);
  };

  useEffect(() => {
    loadQCMs();
  }, [classId, token]);

  const loadQCMs = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const data = await api.getQCMs(token, classId);
      setQcms(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors du chargement des QCM');
    } finally {
      setLoading(false);
    }
  };

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4500);
  };

  const notifyError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const handleOpenCreate = () => {
    setFormTitle('');
    setFormCategory('Général');
    setFormDescription('');
    setFormDurationMinutes(15);
    setFormTotalPoints(20);
    setFormIsActive(true);
    setFormInitialQuestions('');
    setFormSelectedClassIds([classId]);
    setEditingQcm(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (qcm: QCM) => {
    setEditingQcm(qcm);
    setFormTitle(qcm.title);
    setFormCategory(qcm.category);
    setFormDescription(qcm.description || '');
    setFormDurationMinutes(qcm.durationMinutes || 0);
    setFormTotalPoints(qcm.totalPoints || 20);
    setFormIsActive(qcm.isActive);
    setFormInitialQuestions('');
    const assignedIds = qcm.classIds && qcm.classIds.length > 0 ? qcm.classIds : [qcm.classId];
    setFormSelectedClassIds(assignedIds);
    setShowCreateModal(true);
  };

  const handleSaveQCM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      notifyError('Le titre du QCM est obligatoire');
      return;
    }

    if (formSelectedClassIds.length === 0) {
      notifyError('Veuillez cocher au moins une classe autorisée à voir ce QCM.');
      return;
    }

    try {
      if (editingQcm) {
        await api.teacherUpdateQCM(token, editingQcm.id, {
          title: formTitle.trim(),
          category: formCategory,
          description: formDescription.trim(),
          durationMinutes: Number(formDurationMinutes),
          totalPoints: Number(formTotalPoints),
          isActive: formIsActive,
          classIds: formSelectedClassIds
        });
        notifySuccess(`QCM "${formTitle}" mis à jour avec succès (${formSelectedClassIds.length} classe${formSelectedClassIds.length > 1 ? 's' : ''} assignée${formSelectedClassIds.length > 1 ? 's' : ''}).`);
      } else {
        const created = await api.teacherCreateQCM(token, classId, {
          title: formTitle.trim(),
          category: formCategory,
          description: formDescription.trim(),
          durationMinutes: Number(formDurationMinutes),
          totalPoints: Number(formTotalPoints),
          isActive: formIsActive,
          classIds: formSelectedClassIds
        });

        // If user also entered questions in the creation modal, import them now
        if (formInitialQuestions.trim()) {
          try {
            await api.teacherImportQCMQuestions(token, created.id, formInitialQuestions.trim(), true);
          } catch (importErr: any) {
            console.warn('Questions import error after creation:', importErr);
          }
        }
        notifySuccess(`QCM "${formTitle}" créé avec succès (${formSelectedClassIds.length} classe${formSelectedClassIds.length > 1 ? 's' : ''} assignée${formSelectedClassIds.length > 1 ? 's' : ''}) !`);
      }

      setShowCreateModal(false);
      await loadQCMs();
    } catch (err: any) {
      notifyError(err.message || 'Erreur lors de l’enregistrement');
    }
  };

  const handleToggleActive = async (qcm: QCM) => {
    try {
      const updated = await api.teacherUpdateQCM(token, qcm.id, {
        isActive: !qcm.isActive
      });
      setQcms(prev => prev.map(q => (q.id === qcm.id ? { ...q, isActive: updated.isActive } : q)));
      notifySuccess(
        updated.isActive
          ? `Le QCM "${qcm.title}" est maintenant ACTIF pour la classe ${className || ''} (visible et accessible aux élèves).`
          : `Le QCM "${qcm.title}" est maintenant DÉSACTIVÉ pour la classe ${className || ''} (masqué aux élèves).`
      );
    } catch (err: any) {
      notifyError(err.message || 'Erreur lors du changement de visibilité');
    }
  };

  const handleDeleteQCM = (qcm: QCM) => {
    setQcmToDelete(qcm);
  };

  const handleConfirmDeleteQCM = async () => {
    if (!qcmToDelete) return;
    try {
      setDeletingQcm(true);
      await api.teacherDeleteQCM(token, qcmToDelete.id);
      notifySuccess(`QCM "${qcmToDelete.title}" supprimé avec succès.`);
      setQcmToDelete(null);
      await loadQCMs();
    } catch (err: any) {
      notifyError(err.message || 'Erreur de suppression');
    } finally {
      setDeletingQcm(false);
    }
  };

  // Import handler
  const handleOpenImportModal = (qcm: QCM) => {
    setImportTargetQcm(qcm);
    setImportText('');
    setImportReplace(true);
  };

  const handleExecuteImport = async () => {
    if (!importTargetQcm || !importText.trim()) return;

    try {
      setImporting(true);
      const updated = await api.teacherImportQCMQuestions(token, importTargetQcm.id, importText, importReplace);
      notifySuccess(`${updated.questionCount || 0} questions importées avec succès dans "${importTargetQcm.title}" !`);
      setImportTargetQcm(null);
      setImportText('');
      await loadQCMs();
      if (managingQcm && managingQcm.id === importTargetQcm.id) {
        await loadQuestionsForQcm(importTargetQcm.id);
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’importation');
    } finally {
      setImporting(false);
    }
  };

  // Questions management
  const handleOpenQuestions = async (qcm: QCM) => {
    setManagingQcm(qcm);
    setShowAddQuestionForm(false);
    await loadQuestionsForQcm(qcm.id);
  };

  const loadQuestionsForQcm = async (qcmId: string) => {
    try {
      setLoadingQuestions(true);
      const fullQcm = await api.getQCMById(token, qcmId);
      setManagingQuestions(fullQcm.questions || []);
    } catch (err: any) {
      alert(err.message || 'Impossible de charger les questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAddSingleQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingQcm || !newQuestionText.trim() || !newOptionA.trim() || !newOptionB.trim()) {
      alert('La question et au minimum les options A et B sont requises');
      return;
    }

    try {
      await api.teacherAddQCMQuestion(token, managingQcm.id, {
        questionText: newQuestionText.trim(),
        optionA: newOptionA.trim(),
        optionB: newOptionB.trim(),
        optionC: newOptionC.trim() || undefined,
        optionD: newOptionD.trim() || undefined,
        correctOption: newCorrectOption,
        points: Number(newPoints) || 1,
        explanation: newExplanation.trim() || undefined
      });

      notifySuccess('Question ajoutée au QCM');
      // Reset form
      setNewQuestionText('');
      setNewOptionA('');
      setNewOptionB('');
      setNewOptionC('');
      setNewOptionD('');
      setNewCorrectOption('A');
      setNewPoints(2);
      setNewExplanation('');
      setShowAddQuestionForm(false);

      await loadQuestionsForQcm(managingQcm.id);
      await loadQCMs();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’ajout de la question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!managingQcm) return;
    if (!window.confirm('Supprimer cette question ?')) return;

    try {
      await api.teacherDeleteQCMQuestion(token, questionId);
      notifySuccess('Question supprimée');
      await loadQuestionsForQcm(managingQcm.id);
      await loadQCMs();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression de la question');
    }
  };

  // Evaluations / Results
  const handleOpenEvaluations = async (qcm: QCM) => {
    setEvaluationQcm(qcm);
    setInspectingSubmission(null);
    try {
      setLoadingEvaluations(true);
      const summary = await api.teacherGetQCMEvaluations(token, qcm.id);
      setEvaluationData(summary);
    } catch (err: any) {
      alert(err.message || 'Impossible de charger les résultats');
      setEvaluationQcm(null);
    } finally {
      setLoadingEvaluations(false);
    }
  };

  const filteredQcms = qcms
    .filter(q => {
      const query = qcmSearch.toLowerCase().trim();
      const matchesSearch = !query || (
        q.title.toLowerCase().includes(query) ||
        (q.description && q.description.toLowerCase().includes(query)) ||
        q.category.toLowerCase().includes(query)
      );

      const matchesCategory = selectedCategory === 'Tous' || q.category === selectedCategory;
      const matchesStatus =
        qcmStatusFilter === 'all' ||
        (qcmStatusFilter === 'active' && q.isActive) ||
        (qcmStatusFilter === 'draft' && !q.isActive);

      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (qcmSortBy === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (qcmSortBy === 'date-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (qcmSortBy === 'title-asc') return a.title.localeCompare(b.title, 'fr');
      if (qcmSortBy === 'title-desc') return b.title.localeCompare(a.title, 'fr');
      if (qcmSortBy === 'questions-desc') return (b.questions?.length || 0) - (a.questions?.length || 0);
      if (qcmSortBy === 'duration-asc') return a.durationMinutes - b.durationMinutes;
      return 0;
    });

  const filteredManagingQuestions = managingQuestions
    .filter(q => {
      const query = questionSearch.toLowerCase().trim();
      if (!query) return true;
      return (
        q.questionText.toLowerCase().includes(query) ||
        q.optionA.toLowerCase().includes(query) ||
        q.optionB.toLowerCase().includes(query) ||
        (q.optionC && q.optionC.toLowerCase().includes(query)) ||
        (q.optionD && q.optionD.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      if (questionSort === 'text-asc') return a.questionText.localeCompare(b.questionText, 'fr');
      if (questionSort === 'points-desc') return b.points - a.points;
      if (questionSort === 'points-asc') return a.points - b.points;
      return (a.questionOrder ?? 0) - (b.questionOrder ?? 0);
    });

  const filteredSubmissions = (evaluationData?.submissions || [])
    .filter(sub => {
      const q = evalSubSearch.toLowerCase().trim();
      const matchesSearch = !q || (
        sub.studentName.toLowerCase().includes(q) ||
        (sub.studentNumber && sub.studentNumber.toLowerCase().includes(q))
      );
      let matchesScore = true;
      if (evalSubScoreFilter === 'pass') matchesScore = sub.score20 >= 10;
      else if (evalSubScoreFilter === 'fail') matchesScore = sub.score20 < 10;
      else if (evalSubScoreFilter === 'high') matchesScore = sub.score20 >= 16;

      return matchesSearch && matchesScore;
    })
    .sort((a, b) => {
      if (evalSubSortBy === 'score-desc') return b.score20 - a.score20;
      if (evalSubSortBy === 'score-asc') return a.score20 - b.score20;
      if (evalSubSortBy === 'name-asc') return a.studentName.localeCompare(b.studentName, 'fr');
      if (evalSubSortBy === 'time-asc') return a.timeSpentSeconds - b.timeSpentSeconds;
      if (evalSubSortBy === 'date-desc') return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      return 0;
    });

  // Parse preview in import modal
  const importParseResult = importText.trim() ? parseQcmImportText(importText) : null;

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <HelpCircle className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black">Gestion des Questionnaires QCM</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Classe : {className}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1.5 max-w-2xl">
            Créez des questionnaires interactifs, importez rapidement des séries de questions au format texte,
            configurez le chronomètre et visualisez les notes et analyses de réussite par question.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleOpenCreate}
            id="btn-teacher-create-qcm"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Créer un QCM</span>
          </button>
        </div>
      </div>

      {/* Search, Filter & Sort Toolbar for QCMs */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher QCM..."
              value={qcmSearch}
              onChange={(e) => setQcmSearch(e.target.value)}
              className="h-8 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44 sm:w-52"
            />
          </div>

          {/* Categories Filter Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl">
            {['Tous', 'Word', 'Excel', 'Python', 'Général'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 text-[11px]">Statut :</span>
            <select
              value={qcmStatusFilter}
              onChange={(e) => setQcmStatusFilter(e.target.value as any)}
              className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">Tous statuts</option>
              <option value="active">Actif (Ouvert)</option>
              <option value="draft">Brouillon (Masqué)</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 text-[11px]">Trier :</span>
            <select
              value={qcmSortBy}
              onChange={(e) => setQcmSortBy(e.target.value as any)}
              className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="date-desc">Plus récents d'abord</option>
              <option value="date-asc">Plus anciens d'abord</option>
              <option value="title-asc">Titre (A → Z)</option>
              <option value="title-desc">Titre (Z → A)</option>
              <option value="questions-desc">Nb de questions</option>
              <option value="duration-asc">Durée chrono (croissant)</option>
            </select>
          </div>

          {(qcmSearch || selectedCategory !== 'Tous' || qcmStatusFilter !== 'all') && (
            <button
              onClick={() => { setQcmSearch(''); setSelectedCategory('Tous'); setQcmStatusFilter('all'); }}
              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          <strong>{filteredQcms.length}</strong> sur <strong>{qcms.length}</strong> QCM{qcms.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* QCM Cards List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          <p className="text-xs">Chargement des questionnaires QCM...</p>
        </div>
      ) : filteredQcms.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Aucun questionnaire QCM correspondant</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            {qcms.length === 0
              ? 'Vous pouvez créer un nouveau QCM et y importer votre série de questions au format texte.'
              : 'Aucun questionnaire ne correspond à votre recherche ou vos filtres.'}
          </p>
          <div className="flex items-center justify-center gap-2">
            {(qcmSearch || selectedCategory !== 'Tous' || qcmStatusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => { setQcmSearch(''); setSelectedCategory('Tous'); setQcmStatusFilter('all'); }}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm cursor-pointer"
            >
              Créer un QCM maintenant
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQcms.map(qcm => {
            const categoryStyles = {
              Word: 'bg-blue-50 text-blue-700 border-blue-200',
              Excel: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              Python: 'bg-amber-50 text-amber-800 border-amber-200',
              Général: 'bg-purple-50 text-purple-700 border-purple-200'
            }[qcm.category] || 'bg-slate-50 text-slate-700 border-slate-200';

            return (
              <div
                key={qcm.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-2.5 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${categoryStyles}`}>
                        {qcm.category}
                      </span>
                    </div>

                    {/* Prominent Active / Inactive toggle button for the class */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(qcm)}
                      title={
                        qcm.isActive
                          ? `Désactiver ce QCM pour la classe ${className || ''}`
                          : `Activer ce QCM pour la classe ${className || ''}`
                      }
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-sm ${
                        qcm.isActive
                          ? 'bg-emerald-50 hover:bg-rose-50 text-emerald-800 hover:text-rose-700 border-emerald-300 hover:border-rose-300'
                          : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-300 hover:border-emerald-300'
                      }`}
                    >
                      {qcm.isActive ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Actif pour {className || 'la classe'} (Cliquer pour masquer)</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          <span>Désactivé pour {className || 'la classe'} (Cliquer pour activer)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">{qcm.title}</h3>
                  {qcm.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {qcm.description}
                    </p>
                  )}

                  {/* Stats Pill Row */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Questions</p>
                      <p className="text-sm font-black text-slate-800 mt-0.5">{qcm.questionCount || 0}</p>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Durée</p>
                      <p className="text-sm font-black text-slate-800 mt-0.5">
                        {qcm.durationMinutes > 0 ? `${qcm.durationMinutes} min` : 'Libre'}
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Soumissions</p>
                      <p className="text-sm font-black text-indigo-600 mt-0.5">{qcm.submissionsCount || 0}</p>
                    </div>
                  </div>

                  {/* Classes autorisées à voir ce QCM */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <School className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-bold text-slate-700">Classes autorisées :</span>
                      {(() => {
                        const assignedIds = qcm.classIds && qcm.classIds.length > 0 ? qcm.classIds : [qcm.classId];
                        const isAll = availableClasses.length > 1 && assignedIds.length >= availableClasses.length;
                        if (isAll) {
                          return (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[10px]">
                              Toutes les classes ({availableClasses.length})
                            </span>
                          );
                        }
                        return assignedIds.map((cid: string) => {
                          const cObj = availableClasses.find(c => c.id === cid);
                          const cName = cObj ? cObj.name : (cid === classId ? className : cid);
                          return (
                            <span
                              key={cid}
                              className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border ${
                                cid === classId
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {cName}
                            </span>
                          );
                        });
                      })()}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(qcm)}
                      title="Modifier les classes autorisées à voir ce QCM"
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer hover:underline"
                    >
                      Modifier classes
                    </button>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenImportModal(qcm)}
                      title="Importer des questions au format texte"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Importer questions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenQuestions(qcm)}
                      title="Gérer ou modifier les questions une par une"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Questions ({qcm.questionCount || 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEvaluations(qcm)}
                      title="Voir les notes et résultats de la classe"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Résultats ({qcm.submissionsCount || 0})</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(qcm)}
                      title="Modifier les paramètres du QCM"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteQCM(qcm)}
                      title="Supprimer définitivement le QCM"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: IMPORTER DES QUESTIONS (Requested format: Question? | Rép A | ...) */}
      {/* ========================================================================= */}
      {importTargetQcm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-base">Importer des questions dans le QCM</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  QCM cible : <strong className="text-white">{importTargetQcm.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportTargetQcm(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Format Spec Banner */}
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-slate-700 text-xs">
                <p className="font-bold text-indigo-900 flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Format attendu par ligne (séparateur tube « | ») :
                </p>
                <div className="bg-white p-2.5 rounded-xl border border-indigo-200 font-mono text-xs text-slate-800 overflow-x-auto select-all">
                  Question? | Réponse A | Réponse B | Réponse C | Réponse D | Bonne réponse | Points
                </div>
                <div className="mt-2 text-[11px] text-indigo-800/80 flex items-center justify-between flex-wrap gap-2">
                  <span>
                    • Bonne réponse : <strong>A</strong>, <strong>B</strong>, <strong>C</strong> ou <strong>D</strong> (ou le texte exact de la réponse).
                  </span>
                  <button
                    type="button"
                    onClick={() => setImportText(SAMPLE_QCM_IMPORT)}
                    className="font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    Insérer un exemple prêt à l'emploi
                  </button>
                </div>
              </div>

              {/* Textarea Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Collez vos questions ci-dessous (une question par ligne) :
                  </label>
                  {importText && (
                    <button
                      type="button"
                      onClick={() => setImportText('')}
                      className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      Effacer tout
                    </button>
                  )}
                </div>
                <textarea
                  rows={8}
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder={`Quel raccourci permet de sauvegarder ? | Ctrl+C | Ctrl+S | Ctrl+V | Ctrl+P | B | 2\nDans Excel, quelle formule fait la somme ? | =TOTAL() | =SOMME(A1:A10) | =ADD() | =SUM() | B | 2`}
                  className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                ></textarea>
              </div>

              {/* Parsing status bar */}
              {importParseResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      {importParseResult.validCount} question{importParseResult.validCount > 1 ? 's' : ''} valide{importParseResult.validCount > 1 ? 's' : ''}
                    </span>

                    {importParseResult.invalidCount > 0 && (
                      <span className="px-3 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        {importParseResult.invalidCount} ligne{importParseResult.invalidCount > 1 ? 's' : ''} incomplète{importParseResult.invalidCount > 1 ? 's' : ''}
                      </span>
                    )}

                    <span className="px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-xl font-bold flex items-center gap-1.5 ml-auto">
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                      Total : {importParseResult.totalPoints} points
                    </span>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 w-8">#</th>
                          <th className="p-2.5">Question</th>
                          <th className="p-2.5">Options A / B / C / D</th>
                          <th className="p-2.5 text-center w-20">Bonne Rép.</th>
                          <th className="p-2.5 text-center w-16">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importParseResult.questions.map((q, idx) => (
                          <tr key={idx} className={q.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                            <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-medium text-slate-800">
                              {q.questionText}
                              {!q.isValid && q.errorMessage && (
                                <p className="text-[10px] text-rose-600 font-bold mt-0.5">{q.errorMessage}</p>
                              )}
                            </td>
                            <td className="p-2.5 text-[11px] text-slate-600">
                              <span className={q.correctOption === 'A' ? 'font-bold text-emerald-700' : ''}>A: {q.optionA}</span> •{' '}
                              <span className={q.correctOption === 'B' ? 'font-bold text-emerald-700' : ''}>B: {q.optionB}</span>
                              {q.optionC && q.optionC !== '—' && (
                                <> • <span className={q.correctOption === 'C' ? 'font-bold text-emerald-700' : ''}>C: {q.optionC}</span></>
                              )}
                              {q.optionD && q.optionD !== '—' && (
                                <> • <span className={q.correctOption === 'D' ? 'font-bold text-emerald-700' : ''}>D: {q.optionD}</span></>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-100 text-emerald-800">
                                {q.correctOption}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-bold text-slate-700">{q.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Options */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={importReplace}
                    onChange={e => setImportReplace(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span>Remplacer les questions existantes du QCM (sinon ajouter à la suite)</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setImportTargetQcm(null)}
                className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={importing || !importParseResult || importParseResult.validCount === 0}
                onClick={handleExecuteImport}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-colors cursor-pointer flex items-center gap-2"
              >
                {importing && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>
                  Importer {importParseResult?.validCount || 0} question{(importParseResult?.validCount || 0) > 1 ? 's' : ''}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GÉRER LES QUESTIONS DU QCM (Ajouter, Voir, Supprimer)             */}
      {/* ========================================================================= */}
      {managingQcm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-base">Questions du QCM</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  QCM : <strong className="text-white">{managingQcm.title}</strong> • {managingQuestions.length} question{managingQuestions.length > 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenImportModal(managingQcm)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Importer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManagingQcm(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Add Question Toggle Button */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAddQuestionForm(prev => !prev)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddQuestionForm ? 'Masquer le formulaire' : 'Ajouter une question manuellement'}</span>
                </button>
              </div>

              {/* Add Question Form */}
              {showAddQuestionForm && (
                <form onSubmit={handleAddSingleQuestion} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <h4 className="font-bold text-slate-800 text-sm">Nouvelle Question</h4>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Énoncé de la question *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Quel raccourci clavier permet de sauvegarder un document ?"
                      value={newQuestionText}
                      onChange={e => setNewQuestionText(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Option A *</label>
                      <input
                        type="text"
                        required
                        value={newOptionA}
                        onChange={e => setNewOptionA(e.target.value)}
                        placeholder="Ex: Ctrl + C"
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Option B *</label>
                      <input
                        type="text"
                        required
                        value={newOptionB}
                        onChange={e => setNewOptionB(e.target.value)}
                        placeholder="Ex: Ctrl + S"
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Option C (facultatif)</label>
                      <input
                        type="text"
                        value={newOptionC}
                        onChange={e => setNewOptionC(e.target.value)}
                        placeholder="Ex: Ctrl + V"
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Option D (facultatif)</label>
                      <input
                        type="text"
                        value={newOptionD}
                        onChange={e => setNewOptionD(e.target.value)}
                        placeholder="Ex: Ctrl + P"
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Bonne réponse *</label>
                      <select
                        value={newCorrectOption}
                        onChange={e => setNewCorrectOption(e.target.value as any)}
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Points attribués</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={newPoints}
                        onChange={e => setNewPoints(parseFloat(e.target.value) || 1)}
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Explication pédagogique (affichée lors de la correction)</label>
                    <input
                      type="text"
                      value={newExplanation}
                      onChange={e => setNewExplanation(e.target.value)}
                      placeholder="Ex: Ctrl + S permet d'enregistrer instantanément le fichier sans passer par le menu."
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddQuestionForm(false)}
                      className="px-3 py-1.5 bg-white text-slate-600 border border-slate-300 rounded-xl text-xs"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
                    >
                      Ajouter cette question
                    </button>
                  </div>
                </form>
              )}

              {/* Questions List */}
              {/* Filter and search bar for questions */}
              {managingQuestions.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Filtrer questions ou options..."
                        value={questionSearch}
                        onChange={e => setQuestionSearch(e.target.value)}
                        className="h-7 pl-8 pr-2.5 bg-white border border-slate-200 rounded-lg text-xs w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      <span className="text-[11px] text-slate-500">Trier :</span>
                      <select
                        value={questionSort}
                        onChange={e => setQuestionSort(e.target.value as any)}
                        className="h-7 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                      >
                        <option value="default">Ordre initial</option>
                        <option value="text-asc">Énoncé (A → Z)</option>
                        <option value="points-desc">Points (décroissant)</option>
                        <option value="points-asc">Points (croissant)</option>
                      </select>
                    </div>

                    {questionSearch && (
                      <button
                        onClick={() => setQuestionSearch('')}
                        className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                      >
                        Effacer
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-500 font-medium">
                    {filteredManagingQuestions.length} sur {managingQuestions.length} question{managingQuestions.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {loadingQuestions ? (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                  <p className="text-xs">Chargement des questions...</p>
                </div>
              ) : managingQuestions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Aucune question dans ce QCM</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Utilisez le bouton "Importer" pour charger une liste de questions en une seule fois.
                  </p>
                </div>
              ) : filteredManagingQuestions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  <Search className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold">Aucune question ne correspond à votre filtre</p>
                  <button
                    onClick={() => setQuestionSearch('')}
                    className="mt-2 text-indigo-600 font-semibold hover:underline"
                  >
                    Effacer le filtre de recherche
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredManagingQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 leading-snug">{q.questionText}</h5>
                            <span className="text-[11px] text-slate-400 font-medium">
                              Valeur : {q.points} point{q.points > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          title="Supprimer cette question"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div className={`p-2 rounded-xl border flex items-center justify-between ${
                          q.correctOption === 'A'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <span><strong>A.</strong> {q.optionA}</span>
                          {q.correctOption === 'A' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>

                        <div className={`p-2 rounded-xl border flex items-center justify-between ${
                          q.correctOption === 'B'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <span><strong>B.</strong> {q.optionB}</span>
                          {q.correctOption === 'B' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>

                        {q.optionC && (
                          <div className={`p-2 rounded-xl border flex items-center justify-between ${
                            q.correctOption === 'C'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}>
                            <span><strong>C.</strong> {q.optionC}</span>
                            {q.correctOption === 'C' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                          </div>
                        )}

                        {q.optionD && (
                          <div className={`p-2 rounded-xl border flex items-center justify-between ${
                            q.correctOption === 'D'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}>
                            <span><strong>D.</strong> {q.optionD}</span>
                            {q.correctOption === 'D' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                          </div>
                        )}
                      </div>

                      {q.explanation && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                          Explication : {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Total des points : <strong>{managingQuestions.reduce((acc, q) => acc + (q.points || 0), 0)} pts</strong>
              </span>
              <button
                type="button"
                onClick={() => setManagingQcm(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RÉSULTATS & STATISTIQUES DE LA CLASSE                             */}
      {/* ========================================================================= */}
      {evaluationQcm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-base">Résultats & Notes de la Classe</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  QCM : <strong className="text-white">{evaluationQcm.title}</strong> • Classe : {className}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer no-print"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEvaluationQcm(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer no-print"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto print-area">
              {loadingEvaluations ? (
                <div className="p-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <p className="text-xs">Calcul des statistiques et notes...</p>
                </div>
              ) : !evaluationData || evaluationData.totalSubmissions === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-800">Aucune soumission pour ce QCM</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Aucun élève n'a encore validé ce questionnaire. Assurez-vous que le QCM est bien marqué comme "Actif".
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                      <p className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Copies remises</p>
                      <p className="text-2xl font-black text-indigo-900 mt-1">{evaluationData.totalSubmissions}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                      <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Moyenne Classe</p>
                      <p className="text-2xl font-black text-emerald-900 mt-1">{evaluationData.averageScore20} / 20</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 text-center">
                      <p className="text-[10px] uppercase font-bold text-sky-600 tracking-wider">Meilleure Note</p>
                      <p className="text-2xl font-black text-sky-900 mt-1">{evaluationData.highestScore20} / 20</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                      <p className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Note Minimum</p>
                      <p className="text-2xl font-black text-amber-900 mt-1">{evaluationData.lowestScore20} / 20</p>
                    </div>
                  </div>

                  {/* Submissions Table */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Relevé des notes des élèves ({filteredSubmissions.length} / {evaluationData.submissions.length})
                      </h4>

                      {/* Filter/sort bar for submissions */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="relative">
                          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Élève ou identifiant..."
                            value={evalSubSearch}
                            onChange={e => setEvalSubSearch(e.target.value)}
                            className="h-7 pl-7 pr-2 bg-slate-50 border border-slate-200 rounded-lg text-xs w-40 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <select
                          value={evalSubScoreFilter}
                          onChange={e => setEvalSubScoreFilter(e.target.value as any)}
                          className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                        >
                          <option value="all">Toutes notes</option>
                          <option value="pass">Validés (≥ 10/20)</option>
                          <option value="fail">Non validés (&lt; 10/20)</option>
                          <option value="high">Excellents (≥ 16/20)</option>
                        </select>

                        <select
                          value={evalSubSortBy}
                          onChange={e => setEvalSubSortBy(e.target.value as any)}
                          className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                        >
                          <option value="score-desc">Note la plus haute</option>
                          <option value="score-asc">Note la plus basse</option>
                          <option value="name-asc">Élève (A → Z)</option>
                          <option value="time-asc">Temps le plus court</option>
                          <option value="date-desc">Date la plus récente</option>
                        </select>

                        {(evalSubSearch || evalSubScoreFilter !== 'all') && (
                          <button
                            onClick={() => { setEvalSubSearch(''); setEvalSubScoreFilter('all'); }}
                            className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                          >
                            Effacer
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 select-none">
                          <tr>
                            <th
                              onClick={() => setEvalSubSortBy(prev => prev === 'name-asc' ? 'score-desc' : 'name-asc')}
                              className="p-3 cursor-pointer hover:bg-slate-200/70 transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span>Élève</span>
                                {evalSubSortBy === 'name-asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                              </div>
                            </th>
                            <th className="p-3">Identifiant</th>
                            <th
                              onClick={() => setEvalSubSortBy(prev => prev === 'score-desc' ? 'score-asc' : 'score-desc')}
                              className="p-3 text-center cursor-pointer hover:bg-slate-200/70 transition-colors"
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>Note sur 20</span>
                                {evalSubSortBy === 'score-desc' ? (
                                  <ArrowDown className="w-3 h-3 text-indigo-600" />
                                ) : evalSubSortBy === 'score-asc' ? (
                                  <ArrowUp className="w-3 h-3 text-indigo-600" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                                )}
                              </div>
                            </th>
                            <th className="p-3 text-center">Score brut</th>
                            <th
                              onClick={() => setEvalSubSortBy(prev => prev === 'time-asc' ? 'score-desc' : 'time-asc')}
                              className="p-3 text-center cursor-pointer hover:bg-slate-200/70 transition-colors"
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>Temps</span>
                                {evalSubSortBy === 'time-asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                              </div>
                            </th>
                            <th
                              onClick={() => setEvalSubSortBy(prev => prev === 'date-desc' ? 'score-desc' : 'date-desc')}
                              className="p-3 text-right cursor-pointer hover:bg-slate-200/70 transition-colors"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>Date de fin</span>
                                {evalSubSortBy === 'date-desc' ? <ArrowDown className="w-3 h-3 text-indigo-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                              </div>
                            </th>
                            <th className="p-3 text-right no-print">Copie</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredSubmissions.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400">
                                Aucun résultat ne correspond à votre filtre.
                              </td>
                            </tr>
                          ) : (
                            filteredSubmissions.map(sub => {
                            let badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
                            if (sub.score20 >= 16) badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            else if (sub.score20 >= 12) badgeBg = 'bg-sky-50 text-sky-700 border-sky-200';
                            else if (sub.score20 >= 10) badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';

                            return (
                              <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-bold text-slate-900">{sub.studentName}</td>
                                <td className="p-3 font-mono text-[11px] text-slate-500">{sub.studentNumber}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2.5 py-1 rounded-full font-black text-xs border ${badgeBg}`}>
                                    {sub.score20} / 20
                                  </span>
                                </td>
                                <td className="p-3 text-center font-medium text-slate-600">
                                  {sub.totalScore} / {sub.maxScore} pts
                                </td>
                                <td className="p-3 text-center text-slate-500">
                                  {Math.floor(sub.timeSpentSeconds / 60)}m {sub.timeSpentSeconds % 60}s
                                </td>
                                <td className="p-3 text-right text-slate-400 text-[11px]">
                                  {new Date(sub.completedAt).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className="p-3 text-right no-print">
                                  <button
                                    type="button"
                                    onClick={() => setInspectingSubmission(sub)}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                                  >
                                    Voir copie
                                  </button>
                                </td>
                              </tr>
                            );
                          }))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Question Success Rates Analytics */}
                  {evaluationData.questionStats && evaluationData.questionStats.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                        Taux de réussite par question (Pédagogie)
                      </h4>
                      <div className="space-y-2">
                        {evaluationData.questionStats.map((stat, idx) => (
                          <div
                            key={stat.questionId}
                            className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex-1">
                              <p className="font-bold text-slate-800">
                                #{idx + 1}. {stat.questionText}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {stat.correctAnswers} bonne{stat.correctAnswers > 1 ? 's' : ''} réponse{stat.correctAnswers > 1 ? 's' : ''} sur {stat.totalAnswers} réponses
                              </p>
                            </div>

                            <div className="w-full sm:w-48 flex items-center gap-2">
                              <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    stat.successRate >= 75
                                      ? 'bg-emerald-500'
                                      : stat.successRate >= 50
                                      ? 'bg-sky-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${stat.successRate}%` }}
                                ></div>
                              </div>
                              <span className="font-black text-xs text-slate-700 w-10 text-right">
                                {stat.successRate}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setEvaluationQcm(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COPIE INDIVIDUELLE DE L'ÉLÈVE                                     */}
      {/* ========================================================================= */}
      {inspectingSubmission && evaluationQcm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Détail de la copie élève</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Élève : <strong className="text-white">{inspectingSubmission.studentName}</strong> • Note : <strong className="text-emerald-400">{inspectingSubmission.score20} / 20</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingSubmission(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span>Temps de passage : <strong>{Math.floor(inspectingSubmission.timeSpentSeconds / 60)}m {inspectingSubmission.timeSpentSeconds % 60}s</strong></span>
                <span>Points obtenus : <strong>{inspectingSubmission.totalScore} / {inspectingSubmission.maxScore}</strong></span>
              </div>

              <div className="space-y-3">
                {evaluationQcm.questions?.map((q, idx) => {
                  const ans = inspectingSubmission.answersJson[q.id];
                  const isCorrect = ans?.isCorrect;
                  const chosen = ans?.chosen || 'Non répondu';

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border ${
                        isCorrect
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-rose-50/40 border-rose-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-xs font-bold text-slate-800">
                          {idx + 1}. {q.questionText}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isCorrect ? `+${ans?.pointsEarned || q.points} pts` : '0 pt'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mb-2">
                        <div className={`p-1.5 rounded-lg ${q.correctOption === 'A' ? 'font-bold text-emerald-700 bg-emerald-100/60' : ''}`}>A: {q.optionA}</div>
                        <div className={`p-1.5 rounded-lg ${q.correctOption === 'B' ? 'font-bold text-emerald-700 bg-emerald-100/60' : ''}`}>B: {q.optionB}</div>
                        {q.optionC && <div className={`p-1.5 rounded-lg ${q.correctOption === 'C' ? 'font-bold text-emerald-700 bg-emerald-100/60' : ''}`}>C: {q.optionC}</div>}
                        {q.optionD && <div className={`p-1.5 rounded-lg ${q.correctOption === 'D' ? 'font-bold text-emerald-700 bg-emerald-100/60' : ''}`}>D: {q.optionD}</div>}
                      </div>

                      <div className="text-[11px] pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <span>Réponse choisie par l'élève : <strong className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>Option {chosen}</strong></span>
                        <span>Bonne réponse : <strong className="text-emerald-700">Option {q.correctOption}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setInspectingSubmission(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Retour aux résultats
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRÉER / MODIFIER UN QCM                                            */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-6">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">
                  {editingQcm ? 'Modifier le QCM' : 'Créer un nouveau questionnaire QCM'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQCM} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titre du QCM *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ex: Évaluation Word : Typographie et Raccourcis"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Général">Général</option>
                    <option value="Word">Word</option>
                    <option value="Excel">Excel</option>
                    <option value="Python">Python</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Durée proposée</label>
                    <span className="text-[10px] text-indigo-600 font-bold">
                      {formDurationMinutes > 0 ? `${formDurationMinutes} min` : 'Libre (non chronométré)'}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={formDurationMinutes}
                    onChange={e => setFormDurationMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0 = Libre"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    <span className="text-[10px] text-slate-400 mr-1">Raccourcis :</span>
                    {[
                      { label: 'Libre', val: 0 },
                      { label: '5m', val: 5 },
                      { label: '10m', val: 10 },
                      { label: '15m', val: 15 },
                      { label: '20m', val: 20 },
                      { label: '30m', val: 30 },
                      { label: '45m', val: 45 },
                      { label: '60m', val: 60 },
                    ].map(preset => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setFormDurationMinutes(preset.val)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                          formDurationMinutes === preset.val
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description pédagogique</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Ex: Ce QCM évalue les connaissances acquises lors des séances 1 à 4..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              {/* Classes autorisées à voir ce QCM (Cocher / Décocher) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <School className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>Classes autorisées à voir ce QCM</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Cochez ou décochez les classes pour déterminer qui a accès à ce questionnaire
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                      formSelectedClassIds.length > 0
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {formSelectedClassIds.length} / {availableClasses.length || 1} classe{formSelectedClassIds.length > 1 ? 's' : ''} cochée{formSelectedClassIds.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Boutons de sélection rapide */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Sélection rapide :</span>
                  <button
                    type="button"
                    onClick={selectAllClasses}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-pointer shadow-2xs transition-colors"
                  >
                    Tout cocher
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllClasses}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer shadow-2xs transition-colors"
                  >
                    Tout décocher
                  </button>
                  <button
                    type="button"
                    onClick={selectCurrentClassOnly}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer shadow-2xs transition-colors"
                  >
                    Classe active uniquement ({className})
                  </button>
                </div>

                {/* Liste des classes avec cases à cocher */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-52 overflow-y-auto pr-1">
                  {availableClasses.map(c => {
                    const isChecked = formSelectedClassIds.includes(c.id);
                    const isCurrent = c.id === classId;
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer text-xs select-none ${
                          isChecked
                            ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 ring-1 ring-indigo-200 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleClassSelection(c.id)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold truncate">{c.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                Active
                              </span>
                            )}
                          </div>
                          {c.level && (
                            <span className="text-[10px] text-slate-400 block truncate">
                              Niveau : {c.level}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {formSelectedClassIds.length === 0 && (
                  <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5 pt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Attention : Au moins une classe doit être cochée pour que le questionnaire soit assigné.
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={e => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 mt-0.5 cursor-pointer shrink-0"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {formIsActive
                        ? `Activer immédiatement ce QCM pour les classes cochées`
                        : `Laisser ce QCM désactivé (Brouillon masqué aux élèves)`}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formIsActive
                        ? 'Les élèves des classes cochées pourront immédiatement voir et passer ce questionnaire.'
                        : 'Ce questionnaire restera masqué jusqu’à ce que vous décidiez de l’activer.'}
                    </span>
                  </div>
                </label>
              </div>

              {!editingQcm && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Questions initiales (optionnel - copier-coller au format tube) :
                  </label>
                  <textarea
                    rows={4}
                    value={formInitialQuestions}
                    onChange={e => setFormInitialQuestions(e.target.value)}
                    placeholder={`Question? | Réponse A | Réponse B | Réponse C | Réponse D | Bonne réponse | Points`}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                  ></textarea>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Vous pourrez également importer ou ajouter des questions à tout moment par la suite.
                  </p>
                </div>
              )}

              <div className="p-4 bg-slate-50 -mx-6 -mb-6 border-t border-slate-200 flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  {editingQcm ? 'Enregistrer les modifications' : 'Créer le QCM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMATION DE SUPPRESSION D'UN QCM (NO WINDOW.CONFIRM)           */}
      {/* ========================================================================= */}
      {qcmToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Supprimer définitivement ce QCM ?</h3>
              <p className="text-xs text-slate-600 mt-1 font-semibold">« {qcmToDelete.title} »</p>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-left text-xs text-rose-800 space-y-1">
              <p className="font-bold">⚠️ Attention : Cette action est irréversible.</p>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                Toutes les questions ({qcmToDelete.questionCount || 0}), ainsi que les soumissions et notes enregistrées ({qcmToDelete.submissionsCount || 0}) des élèves pour ce QCM seront définitivement supprimées.
              </p>
            </div>

            <div className="flex items-center gap-3 justify-center pt-2">
              <button
                type="button"
                disabled={deletingQcm}
                onClick={() => setQcmToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deletingQcm}
                onClick={handleConfirmDeleteQCM}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-rose-600/20 cursor-pointer"
              >
                {deletingQcm && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Supprimer définitivement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
