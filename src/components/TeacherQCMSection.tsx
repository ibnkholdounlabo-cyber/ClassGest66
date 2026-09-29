import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Edit3,
  Pencil,
  Copy,
  Save,
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
  SlidersHorizontal,
  Loader2,
  ListOrdered,
  LayoutList,
  Lightbulb
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
  const [evalSubClassFilter, setEvalSubClassFilter] = useState<string>('all');

  // Filter & sort for question stats in evaluation modal
  const [evalQuestionSearch, setEvalQuestionSearch] = useState('');
  const [evalQuestionDifficulty, setEvalQuestionDifficulty] = useState<
    'all' | 'difficult' | 'critical' | 'medium' | 'mastered' | 'perfect' | 'zero' | 'with-errors' | 'no-errors'
  >('all');
  const [evalQuestionSort, setEvalQuestionSort] = useState<
    'order' | 'rate-asc' | 'rate-desc' | 'errors-desc' | 'correct-desc' | 'answers-desc'
  >('order');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Copy inspection states (Voir copie)
  const [copyFilter, setCopyFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');
  const [showAllCopiesModal, setShowAllCopiesModal] = useState(false);

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
  const [questionsViewMode, setQuestionsViewMode] = useState<'list' | 'step'>('list');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [editQuestionError, setEditQuestionError] = useState<string | null>(null);

  // Edit Question form fields
  const [editQuestionText, setEditQuestionText] = useState('');
  const [editOptionA, setEditOptionA] = useState('');
  const [editOptionB, setEditOptionB] = useState('');
  const [editOptionC, setEditOptionC] = useState('');
  const [editOptionD, setEditOptionD] = useState('');
  const [editCorrectOption, setEditCorrectOption] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [editPoints, setEditPoints] = useState<number>(1);
  const [editExplanation, setEditExplanation] = useState('');

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
  const [titleError, setTitleError] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [formCategory, setFormCategory] = useState<'Word' | 'Excel' | 'Python' | 'Général'>('Général');
  const [formDescription, setFormDescription] = useState('');
  const [formDurationMinutes, setFormDurationMinutes] = useState<number>(15);
  const [formTotalPoints, setFormTotalPoints] = useState<number>(20);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formInitialQuestions, setFormInitialQuestions] = useState('');
  const [availableClasses, setAvailableClasses] = useState<ClassGroup[]>(classes || []);
  const [formSelectedClassIds, setFormSelectedClassIds] = useState<string[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  // Robust form & action states
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSavingQcm, setIsSavingQcm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [singleQuestionError, setSingleQuestionError] = useState<string | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  // Live parsed questions for create modal
  const initialParseResult = useMemo(() => {
    if (!formInitialQuestions.trim()) return null;
    return parseQcmImportText(formInitialQuestions);
  }, [formInitialQuestions]);

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
    const cid = classId || (availableClasses[0]?.id ?? '');
    setFormSelectedClassIds(cid ? [cid] : []);
  };

  useEffect(() => {
    loadQCMs();
  }, [classId, selectedClassFilter, token]);

  const loadQCMs = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const target = selectedClassFilter === 'all' ? (classId || 'all') : selectedClassFilter;
      const data = await api.getQCMs(token, target);
      setQcms(data);
    } catch (err: any) {
      console.error('Erreur chargement QCM:', err);
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
    const defaultTitle = className && className !== 'Classe' ? `Évaluation QCM - ${className}` : 'Évaluation QCM';
    setFormTitle(defaultTitle);
    setTitleError('');
    setFormCategory('Général');
    setFormDescription('');
    setFormDurationMinutes(15);
    setFormTotalPoints(20);
    setFormIsActive(true);
    setFormInitialQuestions('');
    setModalError(null);
    setIsSavingQcm(false);

    // Ensure we have at least one valid class selected
    const initialClassId = classId || availableClasses[0]?.id || (classes && classes[0]?.id) || '';
    if (initialClassId) {
      setFormSelectedClassIds([initialClassId]);
    } else if (availableClasses.length > 0) {
      setFormSelectedClassIds(availableClasses.map(c => c.id));
    } else {
      setFormSelectedClassIds([]);
    }

    setEditingQcm(null);
    setShowCreateModal(true);
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 100);
  };

  const handleOpenEdit = (qcm: QCM) => {
    setEditingQcm(qcm);
    setFormTitle(qcm.title);
    setTitleError('');
    setFormCategory(qcm.category);
    setFormDescription(qcm.description || '');
    setFormDurationMinutes(qcm.durationMinutes || 0);
    setFormTotalPoints(qcm.totalPoints || 20);
    setFormIsActive(qcm.isActive);
    setFormInitialQuestions('');
    setModalError(null);
    setIsSavingQcm(false);

    const assignedIds = qcm.classIds && qcm.classIds.length > 0
      ? qcm.classIds
      : (qcm.classId ? [qcm.classId] : []);
    setFormSelectedClassIds(assignedIds.filter(Boolean));
    setShowCreateModal(true);
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
  };

  const handleSaveQCM = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (isSavingQcm) return;
    setModalError(null);
    setTitleError('');

    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) {
      setTitleError('Le titre du QCM est obligatoire.');
      setModalError('Le titre du QCM est obligatoire. Veuillez saisir un intitulé pour ce questionnaire.');
      titleInputRef.current?.focus();
      return;
    }

    // Ensure we have at least one valid class selected, falling back gracefully
    let validClassIds = formSelectedClassIds.filter(Boolean);
    if (validClassIds.length === 0) {
      const fallbackClass = classId || availableClasses[0]?.id || (classes && classes[0]?.id) || '';
      if (fallbackClass) {
        validClassIds = [fallbackClass];
        setFormSelectedClassIds([fallbackClass]);
      } else if (availableClasses.length > 0) {
        validClassIds = availableClasses.map(c => c.id);
        setFormSelectedClassIds(validClassIds);
      }
    }

    try {
      setIsSavingQcm(true);

      if (editingQcm) {
        const updated = await api.teacherUpdateQCM(token, editingQcm.id, {
          title: trimmedTitle,
          category: formCategory,
          description: formDescription.trim(),
          durationMinutes: Number(formDurationMinutes) || 0,
          totalPoints: Number(formTotalPoints) || 20,
          isActive: formIsActive,
          classIds: validClassIds
        });
        setQcms(prev => prev.map(q => (q.id === updated.id ? updated : q)));
        notifySuccess(`QCM « ${trimmedTitle} » mis à jour avec succès (${validClassIds.length} classe${validClassIds.length > 1 ? 's' : ''} assignée${validClassIds.length > 1 ? 's' : ''}).`);
      } else {
        const targetClass = validClassIds[0] || classId || availableClasses[0]?.id || 'all';
        const created = await api.teacherCreateQCM(token, targetClass, {
          title: trimmedTitle,
          category: formCategory,
          description: formDescription.trim(),
          durationMinutes: Number(formDurationMinutes) || 0,
          totalPoints: Number(formTotalPoints) || 20,
          isActive: formIsActive,
          classIds: validClassIds
        });

        // Immediately reflect in state so it appears on screen without delay!
        setQcms(prev => [created, ...prev.filter(q => q.id !== created.id)]);

        // If user also entered questions in the creation modal, import them now
        let importedCount = 0;
        if (formInitialQuestions.trim()) {
          try {
            const importRes = await api.teacherImportQCMQuestions(token, created.id, formInitialQuestions.trim(), true);
            importedCount = importRes.questionCount || 0;
            if (importedCount > 0) {
              setQcms(prev => prev.map(q => q.id === created.id ? { ...q, questionCount: importedCount } : q));
            }
          } catch (importErr: any) {
            console.warn('Questions import error after creation:', importErr);
            notifyError(`Le QCM a été créé avec succès ! Cependant, l'import des questions a échoué (${importErr.message || 'Syntaxe'}). Vous pouvez les ajouter manuellement.`);
          }
        }

        const importMsg = importedCount > 0 ? ` avec ${importedCount} question${importedCount > 1 ? 's' : ''}` : '';
        notifySuccess(`QCM « ${trimmedTitle} » créé avec succès${importMsg} (${validClassIds.length} classe${validClassIds.length > 1 ? 's' : ''}) !`);
      }

      setShowCreateModal(false);
      // Background reload to sync server metrics
      await loadQCMs();
    } catch (err: any) {
      console.error('Erreur enregistrement QCM:', err);
      setModalError(err.message || 'Erreur lors de la création du QCM.');
    } finally {
      setIsSavingQcm(false);
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
    setImportError(null);
  };

  const handleExecuteImport = async () => {
    if (!importTargetQcm || !importText.trim()) return;

    try {
      setImporting(true);
      setImportError(null);
      const updated = await api.teacherImportQCMQuestions(token, importTargetQcm.id, importText, importReplace);
      notifySuccess(`${updated.questionCount || 0} questions importées avec succès dans "${importTargetQcm.title}" !`);
      setImportTargetQcm(null);
      setImportText('');
      await loadQCMs();
      if (managingQcm && managingQcm.id === importTargetQcm.id) {
        await loadQuestionsForQcm(importTargetQcm.id);
      }
    } catch (err: any) {
      setImportError(err.message || 'Erreur lors de l’importation des questions');
    } finally {
      setImporting(false);
    }
  };

  // Questions management
  const populateEditForm = (question: QCMQuestion) => {
    setEditingQuestionId(question.id);
    setEditQuestionText(question.questionText || '');
    setEditOptionA(question.optionA || '');
    setEditOptionB(question.optionB || '');
    setEditOptionC(question.optionC || '');
    setEditOptionD(question.optionD || '');
    setEditCorrectOption((question.correctOption as any) || 'A');
    setEditPoints(question.points !== undefined ? Number(question.points) : 1);
    setEditExplanation(question.explanation || '');
    setEditQuestionError(null);
  };

  const handleOpenQuestions = async (qcm: QCM, startInStepMode = false) => {
    setManagingQcm(qcm);
    setShowAddQuestionForm(false);
    setSingleQuestionError(null);
    setEditingQuestionId(null);
    setEditQuestionError(null);
    setQuestionsViewMode(startInStepMode ? 'step' : 'list');
    setActiveStepIndex(0);
    await loadQuestionsForQcm(qcm.id, startInStepMode);
  };

  const loadQuestionsForQcm = async (qcmId: string, openInStepMode = false) => {
    try {
      setLoadingQuestions(true);
      const fullQcm = await api.getQCMById(token, qcmId);
      const questionsList = fullQcm.questions || [];
      setManagingQuestions(questionsList);
      if (fullQcm) {
        setManagingQcm(prev => prev ? { ...prev, ...fullQcm } : fullQcm);
      }
      if (questionsList.length > 0) {
        if (openInStepMode || questionsViewMode === 'step') {
          populateEditForm(questionsList[0]);
          setActiveStepIndex(0);
        }
      }
    } catch (err: any) {
      notifyError(err.message || 'Impossible de charger les questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleStartEditQuestion = (question: QCMQuestion, openInStepMode = false) => {
    populateEditForm(question);
    const idx = managingQuestions.findIndex(q => q.id === question.id);
    if (idx !== -1) {
      setActiveStepIndex(idx);
    }
    if (openInStepMode) {
      setQuestionsViewMode('step');
    }
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionId(null);
    setEditQuestionError(null);
  };

  const handleSaveQuestion = async (andGoNext = false) => {
    if (!editingQuestionId || !managingQcm) return;
    setEditQuestionError(null);

    if (!editQuestionText.trim()) {
      setEditQuestionError("L'énoncé de la question est obligatoire.");
      return;
    }
    if (!editOptionA.trim() || !editOptionB.trim()) {
      setEditQuestionError("Les options A et B sont obligatoires.");
      return;
    }

    try {
      setIsSavingQuestion(true);
      const updated = await api.teacherUpdateQCMQuestion(token, editingQuestionId, {
        questionText: editQuestionText.trim(),
        optionA: editOptionA.trim(),
        optionB: editOptionB.trim(),
        optionC: editOptionC.trim(),
        optionD: editOptionD.trim(),
        correctOption: editCorrectOption,
        points: Number(editPoints) || 1,
        explanation: editExplanation.trim()
      });

      const updatedList = managingQuestions.map(q => q.id === updated.id ? updated : q);
      setManagingQuestions(updatedList);
      notifySuccess(`Question n°${(updated.questionOrder || (activeStepIndex + 1))} enregistrée avec succès`);
      loadQCMs();

      if (andGoNext) {
        const currentIdx = updatedList.findIndex(q => q.id === updated.id);
        if (currentIdx !== -1 && currentIdx < updatedList.length - 1) {
          const nextIdx = currentIdx + 1;
          setActiveStepIndex(nextIdx);
          populateEditForm(updatedList[nextIdx]);
        } else {
          notifySuccess('Toutes les questions du QCM ont été passées en revue !');
          if (questionsViewMode === 'list') {
            setEditingQuestionId(null);
          }
        }
      } else {
        if (questionsViewMode === 'list') {
          setEditingQuestionId(null);
        }
      }
    } catch (err: any) {
      setEditQuestionError(err.message || 'Erreur lors de la modification de la question');
      notifyError(err.message || 'Erreur lors de la modification de la question');
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleStepNavigate = (targetIdx: number) => {
    if (targetIdx < 0 || targetIdx >= managingQuestions.length) return;
    setActiveStepIndex(targetIdx);
    populateEditForm(managingQuestions[targetIdx]);
  };

  const handleDuplicateQuestion = async (question: QCMQuestion) => {
    if (!managingQcm) return;
    try {
      const duplicated = await api.teacherAddQCMQuestion(token, managingQcm.id, {
        questionText: `${question.questionText} (copie)`,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        correctOption: question.correctOption,
        points: question.points,
        explanation: question.explanation
      });
      notifySuccess('Question dupliquée avec succès');
      const fullQcm = await api.getQCMById(token, managingQcm.id);
      const newQuestions = fullQcm.questions || [];
      setManagingQuestions(newQuestions);
      const newIdx = newQuestions.findIndex(q => q.id === duplicated.id);
      if (newIdx !== -1) {
        setActiveStepIndex(newIdx);
        populateEditForm(newQuestions[newIdx]);
        setQuestionsViewMode('step');
      }
      loadQCMs();
    } catch (err: any) {
      notifyError(err.message || 'Erreur lors de la duplication de la question');
    }
  };

  const handleAddSingleQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleQuestionError(null);
    if (!managingQcm || !newQuestionText.trim() || !newOptionA.trim() || !newOptionB.trim()) {
      setSingleQuestionError('La question et au minimum les options A et B sont requises.');
      return;
    }

    try {
      setIsAddingQuestion(true);
      const created = await api.teacherAddQCMQuestion(token, managingQcm.id, {
        questionText: newQuestionText.trim(),
        optionA: newOptionA.trim(),
        optionB: newOptionB.trim(),
        optionC: newOptionC.trim() || undefined,
        optionD: newOptionD.trim() || undefined,
        correctOption: newCorrectOption,
        points: Number(newPoints) || 1,
        explanation: newExplanation.trim() || undefined
      });

      notifySuccess('Question ajoutée au QCM avec succès');
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
      setSingleQuestionError(err.message || 'Erreur lors de l’ajout de la question');
    } finally {
      setIsAddingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!managingQcm) return;

    try {
      await api.teacherDeleteQCMQuestion(token, questionId);
      notifySuccess('Question supprimée');
      if (editingQuestionId === questionId) {
        setEditingQuestionId(null);
      }
      await loadQuestionsForQcm(managingQcm.id);
      await loadQCMs();
    } catch (err: any) {
      notifyError(err.message || 'Erreur lors de la suppression de la question');
    }
  };

  // Evaluations / Results
  const handleOpenEvaluations = async (qcm: QCM) => {
    setEvaluationQcm(qcm);
    setInspectingSubmission(null);
    setEvalQuestionSearch('');
    setEvalQuestionDifficulty('all');
    setEvalQuestionSort('order');
    setExpandedQuestionId(null);
    setCopyFilter('all');
    setShowAllCopiesModal(false);
    setEvalSubClassFilter(classId && classId !== 'all' ? classId : 'all');
    try {
      setLoadingEvaluations(true);
      const summary = await api.teacherGetQCMEvaluations(token, qcm.id);
      if (!summary?.qcm?.questions || summary.qcm.questions.length === 0) {
        try {
          const fullQcm = await api.getQCMById(token, qcm.id);
          if (summary?.qcm && fullQcm?.questions) {
            summary.qcm.questions = fullQcm.questions;
          }
        } catch {}
      }
      setEvaluationData(summary);
      if (summary?.qcm) {
        setEvaluationQcm(summary.qcm);
      }
    } catch (err: any) {
      notifyError(err.message || 'Impossible de charger les résultats');
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
      const matchesClass =
        selectedClassFilter === 'all' ||
        q.classId === selectedClassFilter ||
        (Array.isArray(q.classIds) && q.classIds.includes(selectedClassFilter));

      return matchesSearch && matchesCategory && matchesStatus && matchesClass;
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

  // Distinct classes that have submissions for this QCM or are assigned to it
  const evalClassesList = useMemo(() => {
    if (!evaluationData?.submissions) return [];
    const map = new Map<string, { id: string; name: string; count: number }>();
    evaluationData.submissions.forEach(sub => {
      const cid = sub.classId || 'unknown';
      const cname = sub.className || availableClasses.find(c => c.id === cid)?.name || 'Classe';
      if (!map.has(cid)) {
        map.set(cid, { id: cid, name: cname, count: 0 });
      }
      map.get(cid)!.count++;
    });
    // Also include any availableClasses that are assigned to the QCM if not in map
    availableClasses.forEach(c => {
      if (!map.has(c.id)) {
        const qcm = evaluationData.qcm || evaluationQcm;
        const isAssigned = qcm?.classId === c.id || (Array.isArray(qcm?.classIds) && qcm.classIds.includes(c.id));
        if (isAssigned) {
          map.set(c.id, { id: c.id, name: c.name, count: 0 });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [evaluationData, availableClasses, evaluationQcm]);

  // Selected class display name
  const selectedClassDisplayName = useMemo(() => {
    if (evalSubClassFilter === 'all') return 'Toutes les classes';
    const found = evalClassesList.find(c => c.id === evalSubClassFilter || c.name === evalSubClassFilter);
    return found ? found.name : (availableClasses.find(c => c.id === evalSubClassFilter)?.name || evalSubClassFilter);
  }, [evalSubClassFilter, evalClassesList, availableClasses]);

  // Submissions filtered strictly by the chosen class filter
  const classFilteredSubmissions = useMemo(() => {
    if (!evaluationData?.submissions) return [];
    if (evalSubClassFilter === 'all') return evaluationData.submissions;
    return evaluationData.submissions.filter(s =>
      s.classId === evalSubClassFilter || s.className === evalSubClassFilter
    );
  }, [evaluationData, evalSubClassFilter]);

  // Evaluation summary metrics dynamically calculated based on class filter
  const evalMetrics = useMemo(() => {
    const subs = classFilteredSubmissions;
    const count = subs.length;
    if (count === 0) {
      return { total: 0, avg20: 0, highest20: 0, lowest20: 0 };
    }
    const sum = subs.reduce((acc, s) => acc + (s.score20 || 0), 0);
    const avg20 = Math.round((sum / count) * 10) / 10;
    const highest20 = Math.max(...subs.map(s => s.score20 || 0));
    const lowest20 = Math.min(...subs.map(s => s.score20 || 0));
    return { total: count, avg20, highest20, lowest20 };
  }, [classFilteredSubmissions]);

  // Submissions filtered by search, score filter and sorted
  const filteredSubmissions = useMemo(() => {
    return classFilteredSubmissions
      .filter(sub => {
        const q = evalSubSearch.toLowerCase().trim();
        const matchesSearch = !q || (
          sub.studentName.toLowerCase().includes(q) ||
          (sub.studentNumber && sub.studentNumber.toLowerCase().includes(q)) ||
          (sub.className && sub.className.toLowerCase().includes(q))
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
  }, [classFilteredSubmissions, evalSubSearch, evalSubScoreFilter, evalSubSortBy]);

  // Pedagogical question stats dynamically recomputed for the selected class filter
  const effectiveQuestionStats = useMemo(() => {
    if (!evaluationData) return [];
    const questions = evaluationData.qcm?.questions || evaluationQcm?.questions || [];
    const subs = classFilteredSubmissions;

    return questions.map((q, idx) => {
      let totalAnswers = 0;
      let correctAnswers = 0;

      subs.forEach(sub => {
        let answersMap: Record<string, any> = {};
        if (typeof sub.answersJson === 'string') {
          try { answersMap = JSON.parse(sub.answersJson); } catch {}
        } else if (sub.answersJson && typeof sub.answersJson === 'object') {
          answersMap = sub.answersJson as any;
        }
        const foundRaw = answersMap[q.id] ?? answersMap[String(q.id)] ?? answersMap[String(q.questionOrder)] ?? answersMap[String(idx + 1)];
        if (foundRaw) {
          totalAnswers++;
          const chosen = (typeof foundRaw === 'string' ? foundRaw : foundRaw?.chosen || '').toUpperCase().trim();
          const isCorrect = foundRaw?.isCorrect !== undefined ? Boolean(foundRaw.isCorrect) : (chosen === q.correctOption);
          if (isCorrect) correctAnswers++;
        }
      });

      const successRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

      return {
        questionId: q.id,
        questionOrder: q.questionOrder ?? (idx + 1),
        questionText: q.questionText,
        totalAnswers,
        correctAnswers,
        successRate
      };
    });
  }, [evaluationData, evaluationQcm, classFilteredSubmissions]);

  const filteredQuestionStats = effectiveQuestionStats
    .filter(stat => {
      const q = evalQuestionSearch.toLowerCase().trim();
      const matchesText = !q || stat.questionText.toLowerCase().includes(q);
      let matchesDiff = true;
      if (evalQuestionDifficulty === 'difficult') matchesDiff = stat.successRate < 50;
      else if (evalQuestionDifficulty === 'critical') matchesDiff = stat.successRate < 30;
      else if (evalQuestionDifficulty === 'medium') matchesDiff = stat.successRate >= 50 && stat.successRate < 75;
      else if (evalQuestionDifficulty === 'mastered') matchesDiff = stat.successRate >= 75;
      else if (evalQuestionDifficulty === 'perfect') matchesDiff = stat.successRate === 100;
      else if (evalQuestionDifficulty === 'zero') matchesDiff = stat.successRate === 0;
      else if (evalQuestionDifficulty === 'with-errors') matchesDiff = (stat.totalAnswers - stat.correctAnswers) > 0;
      else if (evalQuestionDifficulty === 'no-errors') matchesDiff = (stat.totalAnswers - stat.correctAnswers) === 0 && stat.totalAnswers > 0;
      return matchesText && matchesDiff;
    })
    .sort((a, b) => {
      if (evalQuestionSort === 'rate-asc') return a.successRate - b.successRate;
      if (evalQuestionSort === 'rate-desc') return b.successRate - a.successRate;
      if (evalQuestionSort === 'errors-desc') return (b.totalAnswers - b.correctAnswers) - (a.totalAnswers - a.correctAnswers);
      if (evalQuestionSort === 'correct-desc') return b.correctAnswers - a.correctAnswers;
      if (evalQuestionSort === 'answers-desc') return b.totalAnswers - a.totalAnswers;
      return (a.questionOrder ?? 0) - (b.questionOrder ?? 0);
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

          {/* Class Filter */}
          {availableClasses.length > 0 && (
            <div className="flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 text-[11px]">Classe :</span>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
              >
                <option value="all">Toutes ({availableClasses.length})</option>
                {availableClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

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
                      onClick={() => handleOpenQuestions(qcm, false)}
                      title="Modifier ou gérer les questions une par une"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Modifier questions ({qcm.questionCount || 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenQuestions(qcm, true)}
                      title="Modifier les questions une par une (Mode pas à pas)"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                    >
                      <ListOrdered className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Pas à pas</span>
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

              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="flex-1">{importError}</span>
                </div>
              )}
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
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6 transition-all">
            {/* Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                  <h3 className="font-bold text-base">Questions du QCM</h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {managingQuestions.length} question{managingQuestions.length > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  QCM : <strong className="text-white">{managingQcm.title}</strong> • Total :{' '}
                  <strong className="text-emerald-400">
                    {managingQuestions.reduce((acc, q) => acc + (q.points || 0), 0)} pts
                  </strong>
                </p>
              </div>

              {/* View Mode Switcher + Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionsViewMode('list');
                      setEditingQuestionId(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      questionsViewMode === 'list'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    <span>Vue Liste</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (managingQuestions.length > 0) {
                        setQuestionsViewMode('step');
                        const targetIdx = activeStepIndex < managingQuestions.length ? activeStepIndex : 0;
                        setActiveStepIndex(targetIdx);
                        populateEditForm(managingQuestions[targetIdx]);
                      } else {
                        notifyError('Ajoutez ou importez d’abord des questions pour utiliser le mode pas à pas.');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      questionsViewMode === 'step'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>Modifier une par une</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenImportModal(managingQcm)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Importer</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setManagingQcm(null);
                    setEditingQuestionId(null);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              {/* ============================================================= */}
              {/* MODE 1: ÉDITEUR PAS À PAS (UNE PAR UNE - EASY INTERFACE)     */}
              {/* ============================================================= */}
              {questionsViewMode === 'step' && (
                <div className="space-y-4">
                  {managingQuestions.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                      <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700">Aucune question dans ce QCM</p>
                      <p className="text-xs text-slate-400 mt-1 mb-4">
                        Vous pouvez importer une série de questions ou en ajouter une manuellement.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setQuestionsViewMode('list');
                          setShowAddQuestionForm(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Créer la première question</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Top Step Navigator Bar */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <ListOrdered className="w-4 h-4 text-indigo-600" />
                            <span>Sélectionner une question à modifier :</span>
                          </span>
                          <span className="text-slate-500 font-medium">
                            Question <strong className="text-indigo-600">{activeStepIndex + 1}</strong> sur{' '}
                            <strong>{managingQuestions.length}</strong>
                          </span>
                        </div>

                        {/* Question pills carousel */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                          <button
                            type="button"
                            disabled={activeStepIndex === 0}
                            onClick={() => handleStepNavigate(activeStepIndex - 1)}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
                            title="Question précédente"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                            {managingQuestions.map((q, idx) => {
                              const isActive = idx === activeStepIndex;
                              return (
                                <button
                                  key={q.id}
                                  type="button"
                                  onClick={() => handleStepNavigate(idx)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                                    isActive
                                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-400'
                                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  <span>Q{idx + 1}</span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                                      isActive ? 'bg-indigo-700/80 text-indigo-100' : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {q.points || 1}p
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            disabled={activeStepIndex >= managingQuestions.length - 1}
                            onClick={() => handleStepNavigate(activeStepIndex + 1)}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
                            title="Question suivante"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Main Question Edit Card */}
                      <div className="p-5 sm:p-6 rounded-2xl bg-white border-2 border-indigo-100 shadow-sm space-y-4">
                        {/* Card Sub-Header */}
                        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-sm">
                              {activeStepIndex + 1}
                            </span>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">
                                Modification de la Question n°{activeStepIndex + 1}
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                Renseignez l’énoncé, les options, et cochez la bonne réponse en 1 clic.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {managingQuestions[activeStepIndex] && (
                              <button
                                type="button"
                                onClick={() => handleDuplicateQuestion(managingQuestions[activeStepIndex])}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                                title="Dupliquer cette question"
                              >
                                <Copy className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Dupliquer</span>
                              </button>
                            )}

                            {managingQuestions[activeStepIndex] && (
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(managingQuestions[activeStepIndex].id)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                                title="Supprimer cette question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Supprimer</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Error banner */}
                        {editQuestionError && (
                          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span className="flex-1">{editQuestionError}</span>
                          </div>
                        )}

                        {/* Question Text */}
                        <div>
                          <label className="block font-bold text-slate-700 text-xs mb-1.5">
                            Énoncé de la question *
                          </label>
                          <textarea
                            rows={2}
                            required
                            placeholder="Ex: Quel raccourci clavier permet de sauvegarder rapidement un document ?"
                            value={editQuestionText}
                            onChange={e => setEditQuestionText(e.target.value)}
                            className="w-full p-3 bg-slate-50/70 focus:bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                          />
                        </div>

                        {/* Answer Options Grid with 1-click correct answer toggle */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block font-bold text-slate-700 text-xs">
                              Options de réponse & Bonne solution *
                            </label>
                            <span className="text-[11px] text-slate-400">
                              Cliquez sur le bouton vert pour désigner la BONNE réponse
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Option A */}
                            <div
                              className={`p-3 rounded-2xl border transition-all ${
                                editCorrectOption === 'A'
                                  ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/40'
                                  : 'bg-slate-50/70 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                  <span
                                    className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold ${
                                      editCorrectOption === 'A'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    A
                                  </span>
                                  <span>Option A *</span>
                                </span>

                                {editCorrectOption === 'A' ? (
                                  <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-sm">
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Bonne réponse</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditCorrectOption('A')}
                                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg font-semibold text-[11px] cursor-pointer transition-colors"
                                  >
                                    Définir comme bonne
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                required
                                value={editOptionA}
                                onChange={e => setEditOptionA(e.target.value)}
                                placeholder="Ex: Ctrl + C"
                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            {/* Option B */}
                            <div
                              className={`p-3 rounded-2xl border transition-all ${
                                editCorrectOption === 'B'
                                  ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/40'
                                  : 'bg-slate-50/70 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                  <span
                                    className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold ${
                                      editCorrectOption === 'B'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    B
                                  </span>
                                  <span>Option B *</span>
                                </span>

                                {editCorrectOption === 'B' ? (
                                  <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-sm">
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Bonne réponse</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditCorrectOption('B')}
                                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg font-semibold text-[11px] cursor-pointer transition-colors"
                                  >
                                    Définir comme bonne
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                required
                                value={editOptionB}
                                onChange={e => setEditOptionB(e.target.value)}
                                placeholder="Ex: Ctrl + S"
                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            {/* Option C */}
                            <div
                              className={`p-3 rounded-2xl border transition-all ${
                                editCorrectOption === 'C'
                                  ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/40'
                                  : 'bg-slate-50/70 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                  <span
                                    className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold ${
                                      editCorrectOption === 'C'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    C
                                  </span>
                                  <span>Option C (facultatif)</span>
                                </span>

                                {editCorrectOption === 'C' ? (
                                  <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-sm">
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Bonne réponse</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditCorrectOption('C')}
                                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg font-semibold text-[11px] cursor-pointer transition-colors"
                                  >
                                    Définir comme bonne
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                value={editOptionC}
                                onChange={e => setEditOptionC(e.target.value)}
                                placeholder="Ex: Ctrl + V"
                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            {/* Option D */}
                            <div
                              className={`p-3 rounded-2xl border transition-all ${
                                editCorrectOption === 'D'
                                  ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/40'
                                  : 'bg-slate-50/70 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                  <span
                                    className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold ${
                                      editCorrectOption === 'D'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    D
                                  </span>
                                  <span>Option D (facultatif)</span>
                                </span>

                                {editCorrectOption === 'D' ? (
                                  <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-sm">
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Bonne réponse</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditCorrectOption('D')}
                                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg font-semibold text-[11px] cursor-pointer transition-colors"
                                  >
                                    Définir comme bonne
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                value={editOptionD}
                                onChange={e => setEditOptionD(e.target.value)}
                                placeholder="Ex: Ctrl + P"
                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Points & Explanation Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                          {/* Points presets */}
                          <div className="md:col-span-1 space-y-1.5">
                            <label className="block font-bold text-slate-700 text-xs">
                              Points attribués
                            </label>
                            <div className="flex items-center gap-1 flex-wrap">
                              {[0.5, 1, 2, 3, 4, 5].map(pt => (
                                <button
                                  key={pt}
                                  type="button"
                                  onClick={() => setEditPoints(pt)}
                                  className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                    Number(editPoints) === pt
                                      ? 'bg-indigo-600 text-white shadow-sm'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  {pt} pt{pt > 1 ? 's' : ''}
                                </button>
                              ))}
                            </div>
                            <div className="pt-1">
                              <input
                                type="number"
                                min="0.25"
                                step="0.25"
                                value={editPoints}
                                onChange={e => setEditPoints(parseFloat(e.target.value) || 1)}
                                className="w-28 h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>

                          {/* Pedagogical Explanation */}
                          <div className="md:col-span-2 space-y-1.5">
                            <label className="block font-bold text-slate-700 text-xs flex items-center gap-1.5">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                              <span>Explication pédagogique (affichée lors de la correction)</span>
                            </label>
                            <input
                              type="text"
                              value={editExplanation}
                              onChange={e => setEditExplanation(e.target.value)}
                              placeholder="Ex: Le raccourci universel de sauvegarde est Ctrl+S (Save)."
                              className="w-full h-9 px-3 bg-slate-50/70 focus:bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="text-[10px] text-slate-400 italic">
                              Facultatif : aide l'élève à comprendre son erreur après la soumission du QCM.
                            </p>
                          </div>
                        </div>

                        {/* Bottom Navigation and Save Bar */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={activeStepIndex === 0}
                              onClick={() => handleStepNavigate(activeStepIndex - 1)}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              <span>Question précédente</span>
                            </button>

                            {managingQuestions[activeStepIndex] && (
                              <button
                                type="button"
                                onClick={() => populateEditForm(managingQuestions[activeStepIndex])}
                                className="px-3 py-2 bg-white text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer transition-colors"
                              >
                                Rétablir
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isSavingQuestion}
                              onClick={() => handleSaveQuestion(false)}
                              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                            >
                              {isSavingQuestion ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                              ) : (
                                <Save className="w-3.5 h-3.5 text-slate-600" />
                              )}
                              <span>Enregistrer</span>
                            </button>

                            <button
                              type="button"
                              disabled={isSavingQuestion}
                              onClick={() => handleSaveQuestion(true)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-200 transition-colors disabled:opacity-50"
                            >
                              {isSavingQuestion ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {activeStepIndex < managingQuestions.length - 1
                                  ? 'Enregistrer & Suivante →'
                                  : 'Enregistrer & Terminer'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ============================================================= */}
              {/* MODE 2: VUE LISTE COMPLÈTE (AVEC ÉDITION INLINE ET MODIFIER)  */}
              {/* ============================================================= */}
              {questionsViewMode === 'list' && (
                <div className="space-y-4">
                  {/* Banner to switch to Step Mode */}
                  {managingQuestions.length > 0 && (
                    <div className="p-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-indigo-900">
                        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>
                          <strong>Astuce :</strong> Vous pouvez modifier chaque question une par une en plein écran avec notre éditeur guidé.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setQuestionsViewMode('step');
                          const targetIdx = 0;
                          setActiveStepIndex(targetIdx);
                          populateEditForm(managingQuestions[targetIdx]);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shrink-0 transition-colors flex items-center gap-1"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                        <span>Mode Pas à pas</span>
                      </button>
                    </div>
                  )}

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
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-800 text-sm">Nouvelle Question</h4>
                        {singleQuestionError && (
                          <span className="text-[11px] text-rose-600 font-semibold">{singleQuestionError}</span>
                        )}
                      </div>

                      {singleQuestionError && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="flex-1">{singleQuestionError}</span>
                        </div>
                      )}

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
                          disabled={isAddingQuestion}
                          onClick={() => setShowAddQuestionForm(false)}
                          className="px-3 py-1.5 bg-white text-slate-600 border border-slate-300 rounded-xl text-xs disabled:opacity-50 cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={isAddingQuestion}
                          className="px-4 py-1.5 bg-indigo-600 disabled:opacity-60 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 cursor-pointer"
                        >
                          {isAddingQuestion ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Ajout en cours...</span>
                            </>
                          ) : (
                            <span>Ajouter cette question</span>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

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
                      {filteredManagingQuestions.map((q, idx) => {
                        const isEditingThis = editingQuestionId === q.id;

                        if (isEditingThis) {
                          return (
                            /* INLINE EDIT CARD */
                            <div
                              key={q.id}
                              className="p-5 rounded-2xl bg-white border-2 border-indigo-500 shadow-md space-y-3 text-xs animate-in fade-in duration-150"
                            >
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                                    {q.questionOrder || idx + 1}
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    Modifier la question #{q.questionOrder || idx + 1}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditQuestion(q, true)}
                                    className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <ListOrdered className="w-3 h-3" />
                                    <span>Plein écran (Pas à pas)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditQuestion}
                                    className="text-slate-400 hover:text-slate-600 p-1"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {editQuestionError && (
                                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                  <span className="flex-1">{editQuestionError}</span>
                                </div>
                              )}

                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Énoncé *</label>
                                <textarea
                                  rows={2}
                                  value={editQuestionText}
                                  onChange={e => setEditQuestionText(e.target.value)}
                                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {/* Option A */}
                                <div className={`p-2.5 rounded-xl border ${editCorrectOption === 'A' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400' : 'bg-slate-50 border-slate-200'}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-slate-700">Option A *</span>
                                    {editCorrectOption === 'A' ? (
                                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Bonne
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setEditCorrectOption('A')}
                                        className="text-[10px] text-slate-500 hover:text-emerald-700 font-semibold cursor-pointer"
                                      >
                                        Définir bonne
                                      </button>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={editOptionA}
                                    onChange={e => setEditOptionA(e.target.value)}
                                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                                  />
                                </div>

                                {/* Option B */}
                                <div className={`p-2.5 rounded-xl border ${editCorrectOption === 'B' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400' : 'bg-slate-50 border-slate-200'}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-slate-700">Option B *</span>
                                    {editCorrectOption === 'B' ? (
                                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Bonne
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setEditCorrectOption('B')}
                                        className="text-[10px] text-slate-500 hover:text-emerald-700 font-semibold cursor-pointer"
                                      >
                                        Définir bonne
                                      </button>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={editOptionB}
                                    onChange={e => setEditOptionB(e.target.value)}
                                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                                  />
                                </div>

                                {/* Option C */}
                                <div className={`p-2.5 rounded-xl border ${editCorrectOption === 'C' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400' : 'bg-slate-50 border-slate-200'}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-slate-700">Option C (facultatif)</span>
                                    {editCorrectOption === 'C' ? (
                                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Bonne
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setEditCorrectOption('C')}
                                        className="text-[10px] text-slate-500 hover:text-emerald-700 font-semibold cursor-pointer"
                                      >
                                        Définir bonne
                                      </button>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={editOptionC}
                                    onChange={e => setEditOptionC(e.target.value)}
                                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                                  />
                                </div>

                                {/* Option D */}
                                <div className={`p-2.5 rounded-xl border ${editCorrectOption === 'D' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400' : 'bg-slate-50 border-slate-200'}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-slate-700">Option D (facultatif)</span>
                                    {editCorrectOption === 'D' ? (
                                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5" /> Bonne
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setEditCorrectOption('D')}
                                        className="text-[10px] text-slate-500 hover:text-emerald-700 font-semibold cursor-pointer"
                                      >
                                        Définir bonne
                                      </button>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={editOptionD}
                                    onChange={e => setEditOptionD(e.target.value)}
                                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                  <label className="block font-semibold text-slate-700 mb-1">Points</label>
                                  <input
                                    type="number"
                                    min="0.5"
                                    step="0.5"
                                    value={editPoints}
                                    onChange={e => setEditPoints(parseFloat(e.target.value) || 1)}
                                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-700"
                                  />
                                </div>

                                <div>
                                  <label className="block font-semibold text-slate-700 mb-1">Explication</label>
                                  <input
                                    type="text"
                                    value={editExplanation}
                                    onChange={e => setEditExplanation(e.target.value)}
                                    placeholder="Explication affichée à la correction"
                                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={handleCancelEditQuestion}
                                  className="px-3 py-1.5 bg-white text-slate-600 border border-slate-300 rounded-xl text-xs cursor-pointer hover:bg-slate-50"
                                >
                                  Annuler
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingQuestion}
                                  onClick={() => handleSaveQuestion(false)}
                                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                                >
                                  {isSavingQuestion ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  <span>Enregistrer les modifications</span>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        /* STANDARD QUESTION CARD IN LIST */
                        return (
                          <div
                            key={q.id}
                            className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2.5 hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                  {q.questionOrder || idx + 1}
                                </span>
                                <div>
                                  <h5 className="text-xs font-bold text-slate-900 leading-snug">{q.questionText}</h5>
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    Valeur : {q.points} point{q.points > 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditQuestion(q, false)}
                                  title="Modifier cette question"
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3 text-indigo-600" />
                                  <span>Modifier</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStartEditQuestion(q, true)}
                                  title="Ouvrir dans l'éditeur pas à pas"
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <ListOrdered className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDuplicateQuestion(q)}
                                  title="Dupliquer cette question"
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  title="Supprimer cette question"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Options Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                              <div
                                className={`p-2 rounded-xl border flex items-center justify-between ${
                                  q.correctOption === 'A'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <span>
                                  <strong>A.</strong> {q.optionA}
                                </span>
                                {q.correctOption === 'A' && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                              </div>

                              <div
                                className={`p-2 rounded-xl border flex items-center justify-between ${
                                  q.correctOption === 'B'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <span>
                                  <strong>B.</strong> {q.optionB}
                                </span>
                                {q.correctOption === 'B' && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                              </div>

                              {q.optionC && (
                                <div
                                  className={`p-2 rounded-xl border flex items-center justify-between ${
                                    q.correctOption === 'C'
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                      : 'bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span>
                                    <strong>C.</strong> {q.optionC}
                                  </span>
                                  {q.correctOption === 'C' && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                </div>
                              )}

                              {q.optionD && (
                                <div
                                  className={`p-2 rounded-xl border flex items-center justify-between ${
                                    q.correctOption === 'D'
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                      : 'bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span>
                                    <strong>D.</strong> {q.optionD}
                                  </span>
                                  {q.correctOption === 'D' && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                </div>
                              )}
                            </div>

                            {q.explanation && (
                              <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-1.5">
                                <Lightbulb className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>Explication : {q.explanation}</span>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 flex-wrap">
              <span className="text-xs text-slate-500">
                Total des points : <strong>{managingQuestions.reduce((acc, q) => acc + (q.points || 0), 0)} pts</strong>
                {' • '}
                <strong>{managingQuestions.length}</strong> question{managingQuestions.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                {questionsViewMode === 'step' && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionsViewMode('list');
                      setEditingQuestionId(null);
                    }}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5"
                  >
                    <LayoutList className="w-3.5 h-3.5 text-slate-500" />
                    <span>Voir toutes les questions</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setManagingQcm(null);
                    setEditingQuestionId(null);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Fermer
                </button>
              </div>
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
                  QCM : <strong className="text-white">{evaluationQcm.title}</strong> • Classe : <span className="text-indigo-300 font-bold">{selectedClassDisplayName}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer no-print"
                  title="Générer une version imprimable et exporter en PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Exporter en PDF</span>
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
                  {/* Class Filter Bar */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
                        <School className="w-4 h-4 text-indigo-600" />
                        <span>Filtrer par classe :</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEvalSubClassFilter('all')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            evalSubClassFilter === 'all'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>Toutes les classes</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                            evalSubClassFilter === 'all' ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {evaluationData.submissions.length}
                          </span>
                        </button>

                        {evalClassesList.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setEvalSubClassFilter(c.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                              evalSubClassFilter === c.id || evalSubClassFilter === c.name
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>{c.name}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                              (evalSubClassFilter === c.id || evalSubClassFilter === c.name) ? 'bg-indigo-800 text-white' : 'bg-indigo-50 text-indigo-700'
                            }`}>
                              {c.count} {c.count > 1 ? 'copies' : 'copie'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {evalClassesList.length > 2 && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 self-end sm:self-auto">
                        <span className="font-semibold text-slate-500">Sélection :</span>
                        <select
                          value={evalSubClassFilter}
                          onChange={(e) => setEvalSubClassFilter(e.target.value)}
                          className="h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="all">Toutes les classes ({evaluationData.submissions.length})</option>
                          {evalClassesList.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.count} copies)</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                      <p className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">
                        {evalSubClassFilter !== 'all' ? `Copies (${selectedClassDisplayName})` : 'Copies remises'}
                      </p>
                      <p className="text-2xl font-black text-indigo-900 mt-1">{evalMetrics.total}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                      <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                        {evalSubClassFilter !== 'all' ? `Moyenne (${selectedClassDisplayName})` : 'Moyenne Classe'}
                      </p>
                      <p className="text-2xl font-black text-emerald-900 mt-1">{evalMetrics.avg20} / 20</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 text-center">
                      <p className="text-[10px] uppercase font-bold text-sky-600 tracking-wider">Meilleure Note</p>
                      <p className="text-2xl font-black text-sky-900 mt-1">{evalMetrics.highest20} / 20</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                      <p className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Note Minimum</p>
                      <p className="text-2xl font-black text-amber-900 mt-1">{evalMetrics.lowest20} / 20</p>
                    </div>
                  </div>

                  {/* Submissions Table */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Relevé des notes des élèves ({filteredSubmissions.length} / {classFilteredSubmissions.length})
                        </h4>
                        {evalSubClassFilter !== 'all' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            Classe : {selectedClassDisplayName}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowAllCopiesModal(true)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Afficher la grille complète avec toutes les réponses des élèves à chaque question"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Voir toutes les réponses des élèves</span>
                        </button>
                      </div>

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

                        <button
                          type="button"
                          onClick={() => setShowAllCopiesModal(true)}
                          className="h-7 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Consulter toutes les réponses de tous les élèves de la classe"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Vue globale des copies</span>
                        </button>
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
                            <th className="p-3">Classe</th>
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
                              <td colSpan={8} className="p-8 text-center text-slate-400">
                                Aucun résultat ne correspond à votre filtre{evalSubClassFilter !== 'all' ? ` pour la classe ${selectedClassDisplayName}` : ''}.
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
                                <td className="p-3 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                                    {sub.className || availableClasses.find(c => c.id === sub.classId)?.name || 'Classe'}
                                  </span>
                                </td>
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
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                  {/* Question Success Rates Analytics */}
                  {evaluationData.questionStats && evaluationData.questionStats.length > 0 && (
                    <div className="pt-2">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                            <span>Taux de réussite par question (Pédagogie)</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                              {filteredQuestionStats.length} / {effectiveQuestionStats.length}
                            </span>
                            {evalSubClassFilter !== 'all' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 normal-case">
                                Classe : {selectedClassDisplayName}
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Cliquez sur une question pour afficher le détail pédagogique, les options et la répartition des réponses.
                          </p>
                        </div>

                        {/* Filter & Sort Bar for Questions */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <div className="relative">
                            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Rechercher question..."
                              value={evalQuestionSearch}
                              onChange={e => setEvalQuestionSearch(e.target.value)}
                              className="h-7 pl-7 pr-2 bg-slate-50 border border-slate-200 rounded-lg text-xs w-36 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          <select
                            value={evalQuestionDifficulty}
                            onChange={e => setEvalQuestionDifficulty(e.target.value as any)}
                            className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                          >
                            <option value="all">Toutes difficultés</option>
                            <option value="difficult">Difficiles (&lt; 50%)</option>
                            <option value="critical">Critiques (&lt; 30%)</option>
                            <option value="medium">Moyennes (50% - 75%)</option>
                            <option value="mastered">Bien maîtrisées (≥ 75%)</option>
                            <option value="with-errors">Avec erreurs (&gt; 0)</option>
                            <option value="perfect">100% de réussite</option>
                            <option value="zero">0% de réussite</option>
                          </select>

                          <select
                            value={evalQuestionSort}
                            onChange={e => setEvalQuestionSort(e.target.value as any)}
                            className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                          >
                            <option value="order">Ordre du QCM (#1, #2...)</option>
                            <option value="rate-asc">Taux croissant (plus difficile)</option>
                            <option value="rate-desc">Taux décroissant (plus réussi)</option>
                            <option value="errors-desc">Plus d'erreurs d'abord</option>
                            <option value="correct-desc">Plus de réussites d'abord</option>
                            <option value="answers-desc">Nombre de réponses</option>
                          </select>

                          {(evalQuestionSearch || evalQuestionDifficulty !== 'all') && (
                            <button
                              onClick={() => { setEvalQuestionSearch(''); setEvalQuestionDifficulty('all'); }}
                              className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                            >
                              Effacer
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick filter chips for pedagogy */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px]">
                        {[
                          { id: 'all', label: 'Toutes', count: effectiveQuestionStats.length },
                          { id: 'difficult', label: 'Difficiles (< 50%)', count: effectiveQuestionStats.filter(s => s.successRate < 50).length },
                          { id: 'critical', label: 'Critiques (< 30%)', count: effectiveQuestionStats.filter(s => s.successRate < 30).length },
                          { id: 'medium', label: 'Moyennes (50-75%)', count: effectiveQuestionStats.filter(s => s.successRate >= 50 && s.successRate < 75).length },
                          { id: 'mastered', label: 'Maîtrisées (≥ 75%)', count: effectiveQuestionStats.filter(s => s.successRate >= 75).length },
                          { id: 'with-errors', label: 'Avec erreurs', count: effectiveQuestionStats.filter(s => (s.totalAnswers - s.correctAnswers) > 0).length }
                        ].map(chip => (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => setEvalQuestionDifficulty(chip.id as any)}
                            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer inline-flex items-center gap-1 ${
                              evalQuestionDifficulty === chip.id
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <span>{chip.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                              evalQuestionDifficulty === chip.id ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {chip.count}
                            </span>
                          </button>
                        ))}
                      </div>

                      {filteredQuestionStats.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                          Aucune question ne correspond à vos filtres.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {filteredQuestionStats.map((stat, idx) => {
                            const isExpanded = expandedQuestionId === stat.questionId;
                            const fullQuestion = evaluationData.qcm?.questions?.find(q => q.id === stat.questionId) ||
                              evaluationQcm.questions?.find(q => q.id === stat.questionId);

                            // Calculate distribution of student answers for this question
                            const optionCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, 'Non répondu': 0 };
                            const studentsPassed: string[] = [];
                            const studentsFailed: string[] = [];

                            classFilteredSubmissions.forEach(sub => {
                              let ansObj: any = null;
                              if (sub.answersJson && typeof sub.answersJson === 'object') {
                                ansObj = (sub.answersJson as any)[stat.questionId];
                              }
                              const chosen = (typeof ansObj === 'string' ? ansObj : ansObj?.chosen || '').toUpperCase().trim();
                              if (chosen && ['A', 'B', 'C', 'D'].includes(chosen)) {
                                optionCounts[chosen] = (optionCounts[chosen] || 0) + 1;
                              } else {
                                optionCounts['Non répondu'] = (optionCounts['Non répondu'] || 0) + 1;
                              }

                              const isCorrect = ansObj?.isCorrect !== undefined ? ansObj.isCorrect : (fullQuestion ? chosen === fullQuestion.correctOption : false);
                              if (isCorrect) {
                                studentsPassed.push(sub.studentName);
                              } else {
                                studentsFailed.push(sub.studentName);
                              }
                            });

                            return (
                              <div
                                key={stat.questionId}
                                className={`rounded-2xl border transition-all ${
                                  isExpanded
                                    ? 'bg-white border-indigo-300 ring-2 ring-indigo-500/10 shadow-sm'
                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div
                                  onClick={() => setExpandedQuestionId(isExpanded ? null : stat.questionId)}
                                  className="p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                                        Question #{stat.questionOrder || idx + 1}
                                      </span>
                                      {fullQuestion?.points && (
                                        <span className="text-[10px] text-slate-500 font-semibold">
                                          {fullQuestion.points} point{fullQuestion.points > 1 ? 's' : ''}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-slate-400">
                                        (cliquez pour {isExpanded ? 'réduire' : 'détailler'})
                                      </span>
                                    </div>
                                    <p className="font-bold text-slate-900 leading-snug">
                                      {stat.questionText}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-1">
                                      <strong className="text-emerald-700">{stat.correctAnswers} réussite{stat.correctAnswers > 1 ? 's' : ''}</strong> •{' '}
                                      <strong className="text-rose-700">{stat.totalAnswers - stat.correctAnswers} erreur{stat.totalAnswers - stat.correctAnswers > 1 ? 's' : ''}</strong>{' '}
                                      sur {stat.totalAnswers} réponses ({stat.totalAnswers === 0 ? 'Aucune réponse' : `${stat.successRate}%`})
                                    </p>
                                  </div>

                                  <div className="w-full sm:w-52 flex items-center gap-2.5">
                                    <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${
                                          stat.successRate >= 75
                                            ? 'bg-emerald-500'
                                            : stat.successRate >= 50
                                            ? 'bg-sky-500'
                                            : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${stat.successRate}%` }}
                                      ></div>
                                    </div>
                                    <span className={`font-black text-xs w-12 text-right ${
                                      stat.successRate >= 75 ? 'text-emerald-700' : stat.successRate >= 50 ? 'text-sky-700' : 'text-rose-700'
                                    }`}>
                                      {stat.successRate}%
                                    </span>
                                  </div>
                                </div>

                                {/* Expanded Pedagogical Details */}
                                {isExpanded && (
                                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 text-xs space-y-3">
                                    {fullQuestion && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                        {(['A', 'B', 'C', 'D'] as const).map(optKey => {
                                          const optText = fullQuestion[`option${optKey}` as 'optionA'];
                                          if (!optText) return null;
                                          const isCorrect = fullQuestion.correctOption === optKey;
                                          const count = optionCounts[optKey] || 0;
                                          const pct = stat.totalAnswers > 0 ? Math.round((count / stat.totalAnswers) * 100) : 0;

                                          return (
                                            <div
                                              key={optKey}
                                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                                isCorrect
                                                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold'
                                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                                }`}>
                                                  {optKey}
                                                </span>
                                                <span className="truncate">{optText}</span>
                                              </div>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[11px] font-mono text-slate-500 font-bold">
                                                  {count} élève{count > 1 ? 's' : ''} ({pct}%)
                                                </span>
                                                {isCorrect && (
                                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                                                    Bonne réponse ✓
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {fullQuestion?.explanation && (
                                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                                        <span className="font-bold">💡 Explication pédagogique : </span>
                                        {fullQuestion.explanation}
                                      </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                      <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                                        <span className="font-bold text-emerald-800 text-[11px] block mb-1">
                                          Élèves ayant réussi ({studentsPassed.length}) :
                                        </span>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">
                                          {studentsPassed.length > 0 ? studentsPassed.join(', ') : 'Aucun élève'}
                                        </p>
                                      </div>

                                      <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200">
                                        <span className="font-bold text-rose-800 text-[11px] block mb-1">
                                          Élèves ayant fait une erreur ({studentsFailed.length}) :
                                        </span>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">
                                          {studentsFailed.length > 0 ? studentsFailed.join(', ') : 'Aucune erreur'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
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
        (() => {
          const questionsList = (evaluationData?.qcm?.questions && evaluationData.qcm.questions.length > 0)
            ? evaluationData.qcm.questions
            : (evaluationQcm.questions || []);

          let answersMap: Record<string, any> = {};
          if (typeof inspectingSubmission.answersJson === 'string') {
            try { answersMap = JSON.parse(inspectingSubmission.answersJson); } catch {}
          } else if (inspectingSubmission.answersJson && typeof inspectingSubmission.answersJson === 'object') {
            answersMap = inspectingSubmission.answersJson as any;
          }

          const getStudentAnswer = (q: QCMQuestion, idx: number) => {
            const possibleKeys = [q.id, String(q.id), String(q.questionOrder), String(idx + 1), String(idx)];
            let foundRaw: any = undefined;
            for (const k of possibleKeys) {
              if (k in answersMap) {
                foundRaw = answersMap[k];
                break;
              }
            }
            if (foundRaw === undefined) {
              const lowerKeys = Object.keys(answersMap);
              const matched = lowerKeys.find(k => k.toLowerCase() === String(q.id).toLowerCase());
              if (matched) foundRaw = answersMap[matched];
            }

            if (typeof foundRaw === 'string') {
              const chosen = foundRaw.toUpperCase().trim();
              const isCorrect = chosen === q.correctOption;
              const pointsEarned = isCorrect ? (q.points || 1) : 0;
              return { chosen, isCorrect, pointsEarned, hasAnswered: Boolean(chosen) };
            } else if (foundRaw && typeof foundRaw === 'object') {
              const chosen = String(foundRaw.chosen || foundRaw.option || foundRaw.selected || foundRaw.answer || '').toUpperCase().trim();
              const isCorrect = foundRaw.isCorrect !== undefined ? Boolean(foundRaw.isCorrect) : (chosen === q.correctOption);
              const pointsEarned = foundRaw.pointsEarned !== undefined ? Number(foundRaw.pointsEarned) : (isCorrect ? (q.points || 1) : 0);
              return { chosen, isCorrect, pointsEarned, hasAnswered: Boolean(chosen) };
            }
            return { chosen: '', isCorrect: false, pointsEarned: 0, hasAnswered: false };
          };

          // Student navigation
          const subList = filteredSubmissions.length > 0 ? filteredSubmissions : (evaluationData?.submissions || []);
          const currentSubIdx = subList.findIndex(s => s.id === inspectingSubmission.id);
          const hasPrev = currentSubIdx > 0;
          const hasNext = currentSubIdx >= 0 && currentSubIdx < subList.length - 1;

          // Compute counts
          const totalQ = questionsList.length;
          let correctCount = 0;
          let incorrectCount = 0;
          let unansweredCount = 0;

          questionsList.forEach((q, idx) => {
            const ans = getStudentAnswer(q, idx);
            if (!ans.hasAnswered) unansweredCount++;
            else if (ans.isCorrect) correctCount++;
            else incorrectCount++;
          });

          // Filter questions for display
          const displayQuestions = questionsList.filter((q, idx) => {
            const ans = getStudentAnswer(q, idx);
            if (copyFilter === 'correct') return ans.hasAnswered && ans.isCorrect;
            if (copyFilter === 'incorrect') return ans.hasAnswered && !ans.isCorrect;
            if (copyFilter === 'unanswered') return !ans.hasAnswered;
            return true;
          });

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in">
                {/* Header */}
                <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base">Copie complète de l'élève</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/40">
                        {inspectingSubmission.score20} / 20
                      </span>
                      <span className="text-xs text-slate-400">
                        ({inspectingSubmission.totalScore} / {inspectingSubmission.maxScore} pts)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Élève : <strong className="text-white text-sm">{inspectingSubmission.studentName}</strong> • Classe : <span className="text-indigo-300 font-bold">{inspectingSubmission.className || availableClasses.find(c => c.id === inspectingSubmission.classId)?.name || selectedClassDisplayName}</span> • N° {inspectingSubmission.studentNumber || '—'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      QCM : <strong className="text-indigo-300">{evaluationQcm.title}</strong>
                    </p>
                  </div>

                  {/* Navigation controls between students */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                      <button
                        type="button"
                        disabled={!hasPrev}
                        onClick={() => hasPrev && setInspectingSubmission(subList[currentSubIdx - 1])}
                        className="px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-700 cursor-pointer"
                        title="Élève précédent"
                      >
                        ◀ Précédent
                      </button>
                      <span className="text-[11px] text-slate-400 px-1 font-mono">
                        {currentSubIdx >= 0 ? `${currentSubIdx + 1}/${subList.length}` : ''}
                      </span>
                      <button
                        type="button"
                        disabled={!hasNext}
                        onClick={() => hasNext && setInspectingSubmission(subList[currentSubIdx + 1])}
                        className="px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-700 cursor-pointer"
                        title="Élève suivant"
                      >
                        Suivant ▶
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInspectingSubmission(null)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer text-lg leading-none"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                  {/* Summary bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-center">
                    <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100">
                      <span className="text-[10px] text-indigo-500 uppercase font-bold block">Note sur 20</span>
                      <strong className="text-xl font-black text-indigo-900">{inspectingSubmission.score20} / 20</strong>
                      <p className="text-[10px] text-indigo-600 mt-0.5">{inspectingSubmission.totalScore} / {inspectingSubmission.maxScore} points</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                      <span className="text-[10px] text-emerald-600 uppercase font-bold block">Bonnes Réponses</span>
                      <strong className="text-xl font-black text-emerald-800">{correctCount}</strong>
                      <p className="text-[10px] text-emerald-600 mt-0.5">sur {totalQ} questions</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100">
                      <span className="text-[10px] text-rose-600 uppercase font-bold block">Erreurs</span>
                      <strong className="text-xl font-black text-rose-800">{incorrectCount}</strong>
                      <p className="text-[10px] text-rose-600 mt-0.5">à revoir</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Temps & Date</span>
                      <strong className="text-lg font-black text-slate-800">
                        {Math.floor(inspectingSubmission.timeSpentSeconds / 60)}m {inspectingSubmission.timeSpentSeconds % 60}s
                      </strong>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(inspectingSubmission.completedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Filter pills for student's answers */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Toutes les réponses de l'élève ({displayQuestions.length} / {totalQ}) :
                    </h4>

                    <div className="flex items-center gap-1.5 text-xs">
                      {[
                        { id: 'all', label: 'Toutes', count: totalQ },
                        { id: 'correct', label: 'Bonnes réponses', count: correctCount },
                        { id: 'incorrect', label: 'Erreurs', count: incorrectCount },
                        { id: 'unanswered', label: 'Non répondues', count: unansweredCount }
                      ].map(pill => (
                        <button
                          key={pill.id}
                          type="button"
                          onClick={() => setCopyFilter(pill.id as any)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer inline-flex items-center gap-1 ${
                            copyFilter === pill.id
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <span>{pill.label}</span>
                          <span className={`px-1 rounded-full text-[10px] ${
                            copyFilter === pill.id ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {pill.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {displayQuestions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                      Aucune question ne correspond au filtre sélectionné.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {displayQuestions.map((q, idx) => {
                        const ans = getStudentAnswer(q, idx);
                        const isCorrect = ans.isCorrect;
                        const chosen = ans.chosen;
                        const hasAnswered = ans.hasAnswered;

                        return (
                          <div
                            key={q.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              !hasAnswered
                                ? 'bg-slate-50/80 border-slate-200'
                                : isCorrect
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : 'bg-rose-50/40 border-rose-200'
                            }`}
                          >
                            {/* Question Header */}
                            <div className="flex items-start justify-between gap-3 mb-2.5">
                              <div>
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-200/70 text-slate-800 text-[10px] font-bold mr-2">
                                  Question #{q.questionOrder || idx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-900 leading-snug">
                                  {q.questionText}
                                </span>
                              </div>

                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                !hasAnswered
                                  ? 'bg-slate-200 text-slate-700'
                                  : isCorrect
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}>
                                {!hasAnswered
                                  ? 'Non répondu (0 pt)'
                                  : isCorrect
                                  ? `+${ans.pointsEarned || q.points} pt${(ans.pointsEarned || q.points) > 1 ? 's' : ''}`
                                  : `0 / ${q.points} pt`}
                              </span>
                            </div>

                            {/* Options Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                              {(['A', 'B', 'C', 'D'] as const).map(optKey => {
                                const optText = q[`option${optKey}` as 'optionA'];
                                if (!optText) return null;

                                const isThisChosen = chosen === optKey;
                                const isThisCorrect = q.correctOption === optKey;

                                let optStyle = 'bg-white border-slate-200 text-slate-700';
                                if (isThisChosen && isThisCorrect) {
                                  optStyle = 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold ring-2 ring-emerald-500/20';
                                } else if (isThisChosen && !isThisCorrect) {
                                  optStyle = 'bg-rose-100 border-rose-400 text-rose-950 font-bold ring-2 ring-rose-500/20';
                                } else if (isThisCorrect) {
                                  optStyle = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold';
                                }

                                return (
                                  <div
                                    key={optKey}
                                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${optStyle}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-lg bg-slate-900/10 flex items-center justify-center font-bold text-[11px]">
                                        {optKey}
                                      </span>
                                      <span>{optText}</span>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {isThisChosen && (
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                          isThisCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                                        }`}>
                                          Choix élève
                                        </span>
                                      )}
                                      {isThisCorrect && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white">
                                          Bonne réponse ✓
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Question footer info */}
                            <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-[11px] gap-2">
                              <span>
                                Réponse choisie : <strong className={!hasAnswered ? 'text-slate-500 italic' : isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                                  {hasAnswered ? `Option ${chosen}` : 'Aucune réponse (Non répondu)'}
                                </strong>
                              </span>

                              <span>
                                Bonne réponse attendue : <strong className="text-emerald-700">Option {q.correctOption}</strong>
                              </span>
                            </div>

                            {/* Explanation if exists */}
                            {q.explanation && (
                              <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900">
                                <span className="font-bold">💡 Explication pédagogique : </span>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Copie soumise le {new Date(inspectingSubmission.completedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAllCopiesModal(true)}
                      className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      Vue globale de la classe
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectingSubmission(null)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      Fermer la copie
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* ========================================================================= */}
      {/* MODAL: VUE GLOBALE DE TOUTES LES COPIES DE LA CLASSE                      */}
      {/* ========================================================================= */}
      {showAllCopiesModal && evaluationData && evaluationQcm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-base">Vue globale de toutes les réponses de la classe</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  QCM : <strong className="text-white">{evaluationQcm.title}</strong> • Classe : <span className="text-indigo-300 font-bold">{selectedClassDisplayName}</span> • Total : {classFilteredSubmissions.length} copie{classFilteredSubmissions.length > 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer no-print"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllCopiesModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto print-area space-y-4">
              {/* Class filter in global view */}
              {evalClassesList.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs no-print">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <School className="w-4 h-4 text-indigo-600" />
                    Filtrer par classe :
                  </span>
                  <button
                    type="button"
                    onClick={() => setEvalSubClassFilter('all')}
                    className={`px-3 py-1 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      evalSubClassFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Toutes les classes ({evaluationData.submissions.length})
                  </button>
                  {evalClassesList.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setEvalSubClassFilter(c.id)}
                      className={`px-3 py-1 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        evalSubClassFilter === c.id || evalSubClassFilter === c.name
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {c.name} ({c.count})
                    </button>
                  ))}
                </div>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Élève</th>
                      <th className="p-3">Classe</th>
                      <th className="p-3 text-center">Note / 20</th>
                      {(evaluationData.qcm?.questions || evaluationQcm.questions || []).map((q, idx) => (
                        <th key={q.id} className="p-3 text-center min-w-[70px]" title={`Q${idx + 1}: ${q.questionText}`}>
                          Q#{idx + 1}
                          <span className="block text-[10px] text-slate-500 font-normal">({q.correctOption})</span>
                        </th>
                      ))}
                      <th className="p-3 text-right no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classFilteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={(evaluationData.qcm?.questions || evaluationQcm.questions || []).length + 4} className="p-8 text-center text-slate-400">
                          Aucune copie pour la classe sélectionnée ({selectedClassDisplayName}).
                        </td>
                      </tr>
                    ) : (
                      classFilteredSubmissions.map(sub => {
                      const questions = evaluationData.qcm?.questions || evaluationQcm.questions || [];
                      let answersMap: Record<string, any> = {};
                      if (typeof sub.answersJson === 'string') {
                        try { answersMap = JSON.parse(sub.answersJson); } catch {}
                      } else if (sub.answersJson && typeof sub.answersJson === 'object') {
                        answersMap = sub.answersJson as any;
                      }

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <strong className="text-slate-900 block">{sub.studentName}</strong>
                            <span className="text-[11px] text-slate-400 font-mono">N° {sub.studentNumber}</span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                              {sub.className || availableClasses.find(c => c.id === sub.classId)?.name || 'Classe'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-black text-xs ${
                              sub.score20 >= 16 ? 'bg-emerald-100 text-emerald-800' :
                              sub.score20 >= 10 ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {sub.score20} / 20
                            </span>
                          </td>
                          {questions.map((q, idx) => {
                            let foundRaw = answersMap[q.id] ?? answersMap[String(q.id)] ?? answersMap[String(q.questionOrder)] ?? answersMap[String(idx + 1)];
                            const chosen = (typeof foundRaw === 'string' ? foundRaw : foundRaw?.chosen || '').toUpperCase().trim();
                            const isCorrect = foundRaw?.isCorrect !== undefined ? Boolean(foundRaw.isCorrect) : (chosen === q.correctOption);
                            const hasAns = Boolean(chosen);

                            return (
                              <td key={q.id} className="p-2 text-center">
                                {!hasAns ? (
                                  <span className="text-slate-300 font-mono text-[11px]">—</span>
                                ) : (
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-bold text-xs ${
                                    isCorrect ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                                  }`} title={isCorrect ? `Correct: Option ${chosen}` : `Erreur: A choisi ${chosen} au lieu de ${q.correctOption}`}>
                                    {chosen}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-3 text-right no-print">
                            <button
                              type="button"
                              onClick={() => {
                                setInspectingSubmission(sub);
                                setShowAllCopiesModal(false);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 cursor-pointer"
                            >
                              Détail
                            </button>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllCopiesModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Fermer
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

            <form onSubmit={handleSaveQCM} noValidate className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5 font-medium animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="flex-1 font-semibold">{modalError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Titre du QCM <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={formTitle}
                  onChange={e => {
                    setFormTitle(e.target.value);
                    if (titleError) setTitleError('');
                    if (modalError) setModalError(null);
                  }}
                  placeholder="Ex: Évaluation Word : Typographie et Raccourcis"
                  className={`w-full h-10 px-3 bg-slate-50 border rounded-xl text-xs transition-all ${
                    titleError
                      ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/50 text-slate-900'
                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
                {titleError && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{titleError}</span>
                  </p>
                )}
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
                {availableClasses.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Assignation automatique à la classe en cours <strong>({className || 'Classe active'})</strong>.</span>
                  </div>
                ) : (
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
                )}

                {formSelectedClassIds.length === 0 && availableClasses.length > 0 && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-xl font-medium flex items-center gap-1.5 pt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>Astuce : Si aucune case n'est cochée, le QCM sera automatiquement assigné à votre classe active ({className}).</span>
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
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="block font-semibold text-slate-700">
                      Questions initiales (optionnel) :
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFormInitialQuestions(SAMPLE_QCM_IMPORT)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 cursor-pointer transition-colors"
                      >
                        Insérer un exemple
                      </button>
                      {formInitialQuestions.trim() && (
                        <button
                          type="button"
                          onClick={() => setFormInitialQuestions('')}
                          className="text-[10px] text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg border border-slate-200 cursor-pointer"
                        >
                          Effacer
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500">
                    Formats acceptés : séparateur tube <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[9px]">|</code>, copié-collé direct Excel/Google Sheets, CSV point-virgule <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[9px]">;</code> ou blocs <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[9px]">A) ... B) ...</code>
                  </p>

                  <textarea
                    rows={4}
                    value={formInitialQuestions}
                    onChange={e => setFormInitialQuestions(e.target.value)}
                    placeholder={`Exemple :\nQuel raccourci clavier permet de sauvegarder ? | Ctrl + C | Ctrl + S | Ctrl + V | Ctrl + P | B | 2\nLe processeur est le cerveau du PC. | Vrai | Faux | A | 1`}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                  ></textarea>

                  {/* Live parse feedback */}
                  {initialParseResult && formInitialQuestions.trim() && (
                    <div className="space-y-1.5 pt-1">
                      {initialParseResult.validCount > 0 && (
                        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            {initialParseResult.validCount} question{initialParseResult.validCount > 1 ? 's' : ''} valide{initialParseResult.validCount > 1 ? 's' : ''} détectée{initialParseResult.validCount > 1 ? 's' : ''} ({initialParseResult.totalPoints} pts au total)
                          </span>
                        </div>
                      )}
                      {initialParseResult.invalidCount > 0 && (
                        <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            {initialParseResult.invalidCount} ligne{initialParseResult.invalidCount > 1 ? 's' : ''} incomplète{initialParseResult.invalidCount > 1 ? 's' : ''} (vérifiez que la question et les options A et B sont présentes).
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400">
                    Vous pourrez également importer ou modifier des questions à tout moment via le bouton « Gérer les questions ».
                  </p>
                </div>
              )}

              {modalError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5 font-medium animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="flex-1">{modalError}</span>
                </div>
              )}

              <div className="p-4 bg-slate-50 -mx-6 -mb-6 border-t border-slate-200 flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSavingQcm}
                  className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  id="btn-confirm-save-qcm"
                  disabled={isSavingQcm}
                  onClick={(e) => {
                    handleSaveQCM(e);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 cursor-pointer flex items-center gap-2 transition-all"
                >
                  {isSavingQcm ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{editingQcm ? 'Enregistrement...' : 'Création en cours...'}</span>
                    </>
                  ) : (
                    <span>{editingQcm ? 'Enregistrer les modifications' : 'Créer le QCM'}</span>
                  )}
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
