import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  RotateCcw,
  Check,
  Sparkles,
  BookOpen,
  RefreshCw
} from 'lucide-react';
import { api } from '../api';
import { StudentQCMStatus, QCM, QCMQuestion, QCMSubmission } from '../types';

interface StudentQCMSectionProps {
  classId: string;
  token: string;
}

export const StudentQCMSection: React.FC<StudentQCMSectionProps> = ({ classId, token }) => {
  const [statuses, setStatuses] = useState<StudentQCMStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Active Quiz Modal state
  const [activeQcm, setActiveQcm] = useState<QCM | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<QCMQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(0);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Practice mode & Confirmation modals
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [officialScoreForPractice, setOfficialScoreForPractice] = useState<number | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Result / Review Modal state
  const [submissionResult, setSubmissionResult] = useState<QCMSubmission | null>(null);
  const [reviewingQcm, setReviewingQcm] = useState<QCM | null>(null);

  useEffect(() => {
    loadQCMsStatus();
  }, [classId, token]);

  const loadQCMsStatus = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const data = await api.studentGetQCMsStatus(token, classId);
      setStatuses(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Impossible de charger les questionnaires QCM');
    } finally {
      setLoading(false);
    }
  };

  // Timer effect during active QCM
  useEffect(() => {
    if (!activeQcm) return;

    const timer = setInterval(() => {
      setTimeSpentSeconds(prev => prev + 1);

      if (activeQcm.durationMinutes > 0) {
        setTimeRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoSubmitOnTimeout();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeQcm]);

  const handleStartQuiz = async (qcm: QCM, practice = false, officialScore?: number) => {
    try {
      setLoadingQuestions(true);
      setSubmitError('');
      const fullQcm = await api.getQCMById(token, qcm.id);
      if (!fullQcm.questions || fullQcm.questions.length === 0) {
        setErrorMessage('Ce QCM ne comporte pas encore de questions. Veuillez prévenir votre enseignant.');
        return;
      }

      setIsPracticeMode(practice);
      setOfficialScoreForPractice(officialScore !== undefined ? officialScore : null);
      setActiveQcm(fullQcm);
      setActiveQuestions(fullQcm.questions);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setTimeSpentSeconds(0);
      setTimeRemainingSeconds(qcm.durationMinutes > 0 ? qcm.durationMinutes * 60 : 0);
      setShowSubmitConfirm(false);
      setShowExitConfirm(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors du démarrage du QCM');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSelectAnswer = (questionId: string, option: 'A' | 'B' | 'C' | 'D') => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleAutoSubmitOnTimeout = async () => {
    await submitActiveQuiz();
  };

  const submitActiveQuiz = async () => {
    if (!activeQcm) return;
    try {
      setSubmitting(true);
      setSubmitError('');
      const result = await api.studentSubmitQCM(token, activeQcm.id, userAnswers, timeSpentSeconds);
      setSubmissionResult(result);
      setReviewingQcm(activeQcm);
      setShowSubmitConfirm(false);
      setActiveQcm(null);
      await loadQCMsStatus();
    } catch (err: any) {
      setSubmitError(err.message || 'Erreur lors de l’envoi de vos réponses');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReview = async (item: StudentQCMStatus) => {
    if (!item.submission) return;
    try {
      setLoadingQuestions(true);
      const fullQcm = await api.getQCMById(token, item.qcm.id);
      setReviewingQcm(fullQcm);
      setSubmissionResult(item.submission);
    } catch (err: any) {
      setErrorMessage(err.message || 'Impossible de charger la copie');
    } finally {
      setLoadingQuestions(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <HelpCircle className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900">Questionnaires QCM & Évaluations</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Testez vos connaissances en répondant aux quiz préparés par votre professeur.
            Chaque questionnaire calcule immédiatement votre note sur 20 avec une correction détaillée.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200">
          <span>{statuses.filter(s => s.isCompleted).length} / {statuses.length} complété(s)</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* QCM Statuses Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          <p className="text-xs">Chargement de vos QCM...</p>
        </div>
      ) : statuses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Aucun QCM disponible actuellement</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Votre enseignant n'a pas encore publié de questionnaire pour cette classe.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {statuses.map(item => {
            const { qcm, isCompleted, submission } = item;
            const categoryColors = {
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
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${categoryColors}`}>
                      {qcm.category}
                    </span>

                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Validé : {submission?.score20} / 20</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>À faire</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{qcm.title}</h3>
                  {qcm.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {qcm.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {qcm.durationMinutes > 0 ? `${qcm.durationMinutes} min` : 'Non chronométré'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      {qcm.questionCount || 0} question{qcm.questionCount && qcm.questionCount > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  {isCompleted ? (
                    <>
                      <div className="text-xs text-slate-500">
                        Note officielle : <strong className="text-emerald-700 font-black">{submission?.score20} / 20</strong>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenReview(item)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Revoir ma copie
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartQuiz(qcm, true, submission?.score20)}
                          title="S'entraîner à nouveau sans modifier la note officielle"
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Répéter (Entraînement)</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-slate-400">Prêt à démarrer</span>
                      <button
                        type="button"
                        onClick={() => handleStartQuiz(qcm, false)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Démarrer le QCM</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INTERACTIVE QUIZ PLAYER                                           */}
      {/* ========================================================================= */}
      {activeQcm && activeQuestions.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6 flex flex-col relative">
            {/* Header bar with Timer & Progress */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm line-clamp-1">{activeQcm.title}</h3>
                  {isPracticeMode && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                      Entraînement
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Question {currentQuestionIndex + 1} sur {activeQuestions.length}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {activeQcm.durationMinutes > 0 && (
                  <div className={`px-3 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 ${
                    timeRemainingSeconds <= 60 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {Math.floor(timeRemainingSeconds / 60)}:
                      {(timeRemainingSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowExitConfirm(true)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Practice mode banner */}
            {isPracticeMode && (
              <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Mode Entraînement :</strong> Vous répétez ce QCM. Seule votre 1ère note officielle (<strong>{officialScoreForPractice !== null ? `${officialScoreForPractice}/20` : 'enregistrée'}</strong>) est conservée pour le professeur.
                </span>
              </div>
            )}

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-100">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / activeQuestions.length) * 100}%` }}
              ></div>
            </div>

            {/* Current Question Body */}
            {(() => {
              const q = activeQuestions[currentQuestionIndex];
              const selectedOption = userAnswers[q.id];

              return (
                <div className="p-6 space-y-6 flex-1">
                  {/* Question Prompt */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                      Question #{currentQuestionIndex + 1} ({q.points || 1} pt{q.points > 1 ? 's' : ''})
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {q.questionText}
                    </h4>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2.5">
                    {[
                      { key: 'A', text: q.optionA },
                      { key: 'B', text: q.optionB },
                      { key: 'C', text: q.optionC },
                      { key: 'D', text: q.optionD }
                    ].filter(opt => opt.text && opt.text !== '—').map(opt => {
                      const isSelected = selectedOption === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelectAnswer(q.id, opt.key as any)}
                          className={`w-full p-3.5 rounded-2xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-600 text-indigo-950 shadow-sm ring-2 ring-indigo-500/20'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-xl font-bold flex items-center justify-center text-xs flex-shrink-0 ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {opt.key}
                            </span>
                            <span className="text-sm font-medium">{opt.text}</span>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Question Jump Pills */}
                  <div className="pt-4 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-medium mr-1">Questions :</span>
                    {activeQuestions.map((ques, idx) => {
                      const isAnswered = Boolean(userAnswers[ques.id]);
                      const isCurrent = idx === currentQuestionIndex;

                      return (
                        <button
                          key={ques.id}
                          type="button"
                          onClick={() => setCurrentQuestionIndex(idx)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/30'
                              : isAnswered
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Modal Controls */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Précédente</span>
                </button>

                {currentQuestionIndex < activeQuestions.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex(prev => Math.min(activeQuestions.length - 1, prev + 1))}
                    className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Suivante</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Robust validation button accessible from all questions */}
              <button
                id="btn-validate-qcm"
                type="button"
                onClick={() => setShowSubmitConfirm(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Valider mon QCM ({Object.keys(userAnswers).length}/{activeQuestions.length})</span>
              </button>
            </div>

            {/* IN-APP CONFIRMATION MODAL (NO BROWSER POPUPS) */}
            {showSubmitConfirm && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Confirmer la validation du QCM ?</h4>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5 text-left">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>Questions répondues :</span>
                      <span>{Object.keys(userAnswers).length} / {activeQuestions.length}</span>
                    </div>

                    {Object.keys(userAnswers).length < activeQuestions.length && (
                      <p className="text-amber-700 font-semibold pt-1 text-[11px]">
                        ⚠️ Il reste {activeQuestions.length - Object.keys(userAnswers).length} question(s) sans réponse choisie.
                      </p>
                    )}

                    {isPracticeMode ? (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 mt-2 text-[11px] leading-relaxed">
                        🔄 <strong>Mode Entraînement :</strong> Seule votre 1ère validation officielle ({officialScoreForPractice !== null ? `${officialScoreForPractice}/20` : 'enregistrée'}) est conservée pour le professeur. Cette répétition est libre et vous permettra d'obtenir la correction complète.
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 mt-2 text-[11px] leading-relaxed">
                        📋 <strong>Première validation officielle :</strong> Votre note sur 20 sera calculée et enregistrée pour votre professeur.
                      </div>
                    )}
                  </div>

                  {submitError && (
                    <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-medium">{submitError}</p>
                  )}

                  <div className="flex items-center gap-3 justify-center pt-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setShowSubmitConfirm(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Poursuivre le QCM
                    </button>
                    <button
                      id="btn-confirm-submit-now"
                      type="button"
                      disabled={submitting}
                      onClick={submitActiveQuiz}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                      <span>Confirmer et valider ma copie</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* EXIT CONFIRMATION MODAL */}
            {showExitConfirm && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 p-6 text-center space-y-4">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Quitter ce questionnaire ?</h4>
                  <p className="text-xs text-slate-500">Votre progression en cours ne sera pas enregistrée si vous quittez maintenant.</p>
                  <div className="flex items-center gap-3 justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setShowExitConfirm(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Rester sur le QCM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowExitConfirm(false);
                        setActiveQcm(null);
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Quitter
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RÉSULTAT DU QCM & CORRECTION COMPLÈTE                              */}
      {/* ========================================================================= */}
      {submissionResult && reviewingQcm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="p-6 bg-slate-900 text-white text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black">Résultat de votre QCM</h3>
              <p className="text-xs text-slate-400 mt-1">{reviewingQcm.title}</p>

              {/* Score Display */}
              <div className="mt-4 inline-block bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20">
                <p className="text-[11px] uppercase font-bold tracking-wider text-indigo-300">
                  {submissionResult.isPractice ? 'Score de cette répétition' : 'Votre note officielle'}
                </p>
                <p className="text-4xl font-black text-white mt-0.5">
                  {submissionResult.score20} <span className="text-xl font-semibold text-slate-300">/ 20</span>
                </p>
                <p className="text-xs text-emerald-400 font-bold mt-1">
                  {submissionResult.score20 >= 16
                    ? '🌟 Excellent travail !'
                    : submissionResult.score20 >= 12
                    ? '👍 Bon résultat !'
                    : submissionResult.score20 >= 10
                    ? '👌 Validation réussie'
                    : '📖 Des notions à revoir'}
                </p>
              </div>

              {/* Practice vs Official Status Banner */}
              <div className="mt-4 max-w-md mx-auto">
                {submissionResult.isPractice ? (
                  <div className="p-3 bg-amber-500/20 border border-amber-400/30 rounded-2xl text-amber-200 text-xs font-medium text-left">
                    <p className="font-bold flex items-center gap-1.5 text-amber-300">
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Répétition pour entraînement</span>
                    </p>
                    <p className="mt-1 text-[11px] text-amber-100/90 leading-relaxed">
                      Ce score d'entraînement ne remplace pas votre note officielle. Votre note enregistrée pour le relevé du professeur reste : <strong>{submissionResult.officialScore20 ?? officialScoreForPractice ?? submissionResult.score20} / 20</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-200 text-xs font-medium text-left">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Note officielle enregistrée</span>
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-100/90 leading-relaxed">
                      Votre première validation ({submissionResult.score20} / 20) est définitivement consignée et transmise à votre professeur.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Detailed correction */}
            <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Correction détaillée des questions
              </h4>

              <div className="space-y-3">
                {reviewingQcm.questions?.map((q, idx) => {
                  const ans = submissionResult.answersJson[q.id];
                  const isCorrect = ans?.isCorrect;
                  const chosen = ans?.chosen || 'Aucune réponse';

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border ${
                        isCorrect ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-xs font-bold text-slate-900">
                          #{idx + 1}. {q.questionText}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isCorrect ? `+${ans?.pointsEarned || q.points} pts` : '0 pt'}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <p className={isCorrect ? 'text-emerald-700 font-bold' : 'text-rose-700 font-semibold'}>
                          Votre réponse : Option {chosen}
                        </p>
                        {!isCorrect && (
                          <p className="text-emerald-700 font-bold">
                            Bonne réponse : Option {q.correctOption}
                          </p>
                        )}
                        {q.explanation && (
                          <p className="text-[11px] text-slate-500 italic mt-1.5 pt-1.5 border-t border-slate-200/60">
                            Explication : {q.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setSubmissionResult(null);
                  setReviewingQcm(null);
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Terminer et fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
