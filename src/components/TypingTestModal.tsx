import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Clock,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  RotateCcw,
  ArrowRight,
  Sparkles,
  FileText,
  Table,
  Code2,
  Keyboard
} from 'lucide-react';
import { TypingTest, TestEvaluation } from '../types';
import { api } from '../api';

interface TypingTestModalProps {
  test: TypingTest;
  token: string;
  onClose: () => void;
  onSuccessEvaluation: (result: { evaluation: TestEvaluation; passed: boolean; nextLevelUnlocked: boolean }) => void;
}

export const TypingTestModal: React.FC<TypingTestModalProps> = ({
  test,
  token,
  onClose,
  onSuccessEvaluation
}) => {
  const [userInput, setUserInput] = useState('');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(test.timeLimitSeconds);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    evaluation: TestEvaluation;
    passed: boolean;
    nextLevelUnlocked: boolean;
  } | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<any>(null);

  const targetText = test.targetText;

  // Auto focus input on start
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [started]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (started && !finished) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            finishTest(userInput);
            return 0;
          }
          return prev - 1;
        });
        setTimeSpent((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, finished, userInput]);

  // Compute live statistics
  const computeStats = (input: string, seconds: number) => {
    const elapsedSeconds = Math.max(1, seconds);
    const elapsedMinutes = elapsedSeconds / 60;

    let correctChars = 0;
    let mistakes = 0;

    for (let i = 0; i < input.length; i++) {
      if (i < targetText.length && input[i] === targetText[i]) {
        correctChars++;
      } else {
        mistakes++;
      }
    }

    const totalTyped = input.length;
    const accuracy = totalTyped > 0 ? Math.max(0, Math.round((correctChars / totalTyped) * 100)) : 100;
    // Standard WPM: (correctChars / 5) / minutes
    const wpm = Math.max(0, Math.round((correctChars / 5) / elapsedMinutes));
    const cpm = Math.max(0, Math.round(correctChars / elapsedMinutes));

    return { correctChars, mistakes, accuracy, wpm, cpm };
  };

  const currentStats = computeStats(userInput, timeSpent);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (finished) return;

    const value = e.target.value;

    if (!started && value.length > 0) {
      setStarted(true);
    }

    setUserInput(value);

    // If student finished typing the entire text
    if (value.length >= targetText.length) {
      finishTest(value);
    }
  };

  const finishTest = async (finalInput: string) => {
    if (finished) return;
    setFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const effectiveTimeSpent = Math.max(1, timeSpent === 0 ? test.timeLimitSeconds - timeLeft : timeSpent);
    const finalStats = computeStats(finalInput, effectiveTimeSpent);

    setIsSubmitting(true);
    try {
      const res = await api.submitTestEvaluation(token, test.id, {
        wpm: finalStats.wpm,
        cpm: finalStats.cpm,
        accuracy: finalStats.accuracy,
        mistakesCount: finalStats.mistakes,
        timeSpentSeconds: effectiveTimeSpent
      });

      setSubmissionResult(res);
      onSuccessEvaluation(res);
    } catch (err: any) {
      console.error('Erreur de soumission:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    setUserInput('');
    setStarted(false);
    setFinished(false);
    setTimeLeft(test.timeLimitSeconds);
    setTimeSpent(0);
    setSubmissionResult(null);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Render character diff
  const renderTextDiff = () => {
    const chars = targetText.split('');
    return (
      <div className="font-mono text-base sm:text-lg leading-relaxed select-none tracking-normal p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-inner min-h-[160px] max-h-[260px] overflow-y-auto whitespace-pre-wrap break-words">
        {chars.map((char, index) => {
          let charClass = 'text-slate-500';
          const isCursor = index === userInput.length;

          if (index < userInput.length) {
            if (userInput[index] === char) {
              charClass = 'text-emerald-400 font-semibold bg-emerald-950/40 rounded-sm';
            } else {
              charClass = 'text-rose-400 bg-rose-950/60 underline decoration-rose-500 rounded-sm';
            }
          }

          return (
            <span
              key={index}
              className={`${charClass} ${isCursor ? 'border-b-2 border-amber-400 animate-pulse bg-amber-400/20 text-white' : ''}`}
            >
              {char}
            </span>
          );
        })}
      </div>
    );
  };

  const getThemeIcon = () => {
    switch (test.theme) {
      case 'Word':
        return <FileText className="w-5 h-5 text-blue-400" />;
      case 'Excel':
        return <Table className="w-5 h-5 text-emerald-400" />;
      case 'Python':
        return <Code2 className="w-5 h-5 text-amber-400" />;
      default:
        return <Keyboard className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
              {getThemeIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {test.theme} • Niveau {test.level}
                </span>
                <span className="text-xs text-slate-400">
                  Objectifs : ≥ {test.minWpm} Mots/min • ≥ {test.minAccuracyPercent}% précision
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">{test.title}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body */}
        <div className="p-6 space-y-5">
          {/* Live Dashboard Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Timer */}
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3">
              <div className={`p-2 rounded-xl ${timeLeft <= 10 ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-indigo-500/20 text-indigo-400'}`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Temps restant</p>
                <p className={`text-xl font-black font-mono ${timeLeft <= 10 ? 'text-rose-400' : 'text-white'}`}>
                  {timeLeft}s
                </p>
              </div>
            </div>

            {/* WPM */}
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Vitesse (WPM)</p>
                <p className="text-xl font-black font-mono text-white">
                  {currentStats.wpm} <span className="text-xs font-normal text-slate-400">mots/min</span>
                </p>
              </div>
            </div>

            {/* Accuracy */}
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Précision</p>
                <p className="text-xl font-black font-mono text-white">
                  {currentStats.accuracy}%
                </p>
              </div>
            </div>

            {/* Mistakes */}
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Erreurs</p>
                <p className="text-xl font-black font-mono text-white">
                  {currentStats.mistakes}
                </p>
              </div>
            </div>
          </div>

          {/* Description banner */}
          {test.description && (
            <div className="px-4 py-2.5 rounded-xl bg-indigo-950/40 border border-indigo-900/60 text-xs text-indigo-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0 text-indigo-400" />
              <span>{test.description}</span>
            </div>
          )}

          {/* Target Text Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Texte cible à reproduire au clavier :</span>
              <span>
                Caractères : {userInput.length} / {targetText.length}
              </span>
            </div>
            {renderTextDiff()}
          </div>

          {/* User Input Field */}
          {!finished ? (
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={userInput}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder={started ? "Continuez à taper..." : "Commencez à taper ici pour démarrer le chronomètre..."}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border-2 border-indigo-500/50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 text-white font-mono text-base resize-none outline-none transition-all placeholder:text-slate-600 shadow-lg"
                  autoFocus
                />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Astuce : Respectez les majuscules, les espaces et la ponctuation exacte pour valider le niveau.
              </p>
            </div>
          ) : (
            /* Result Evaluation Banner */
            <div className={`p-6 rounded-2xl border ${
              submissionResult?.passed
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-100'
                : 'bg-rose-950/40 border-rose-800 text-rose-100'
            } space-y-4`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${
                    submissionResult?.passed ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                  }`}>
                    {submissionResult?.passed ? (
                      <Trophy className="w-8 h-8" />
                    ) : (
                      <AlertTriangle className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold">
                      {submissionResult?.passed
                        ? 'Félicitations ! Niveau Validé avec Succès !'
                        : 'Niveau Non Validé – Objectif non atteint'}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      {submissionResult?.passed
                        ? 'Votre performance est enregistrée dans votre évaluation scolaire. Le niveau suivant est désormais débloqué !'
                        : `Vous devez atteindre au moins ${test.minWpm} WPM et ${test.minAccuracyPercent}% de précision pour débloquer le niveau suivant.`}
                    </p>
                  </div>
                </div>

                {submissionResult && (
                  <div className="text-right flex-shrink-0 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-700">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Note scolaire</span>
                    <span className={`text-2xl font-black font-mono ${submissionResult.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {submissionResult.evaluation.score} <span className="text-sm font-normal text-slate-400">/ 20</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Performance Stats recap */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 block">Vitesse finale :</span>
                  <span className="font-bold text-sm text-white">{currentStats.wpm} Mots/min</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Précision :</span>
                  <span className="font-bold text-sm text-white">{currentStats.accuracy}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Erreurs :</span>
                  <span className="font-bold text-sm text-white">{currentStats.mistakes}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Temps réalisé :</span>
                  <span className="font-bold text-sm text-white">{timeSpent} secondes</span>
                </div>
              </div>

              {/* Actions buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleRestart}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all border border-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Recommencer le test</span>
                </button>

                <button
                  onClick={onClose}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                    submissionResult?.passed
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                  }`}
                >
                  <span>Continuer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
