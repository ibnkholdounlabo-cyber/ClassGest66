import React, { useState, useEffect } from 'react';
import {
  Keyboard,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Zap,
  Target,
  Trophy,
  Play,
  RotateCcw,
  Sparkles,
  FileText,
  Table,
  Code2,
  AlertCircle
} from 'lucide-react';
import { StudentTestStatus, TypingTest, TestEvaluation } from '../types';
import { api } from '../api';
import { TypingTestModal } from './TypingTestModal';

interface StudentTestsSectionProps {
  classId: string;
  token: string;
}

export const StudentTestsSection: React.FC<StudentTestsSectionProps> = ({
  classId,
  token
}) => {
  const [testStatuses, setTestStatuses] = useState<StudentTestStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>('Tous');

  // Active test being taken
  const [activeTest, setActiveTest] = useState<TypingTest | null>(null);
  const [justUnlockedLevel, setJustUnlockedLevel] = useState<string | null>(null);

  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudentTestsProgress(token, classId);
      setTestStatuses(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger vos tests de frappe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      fetchProgress();
    }
  }, [classId]);

  const handleEvaluationSuccess = (result: { evaluation: TestEvaluation; passed: boolean; nextLevelUnlocked: boolean }) => {
    if (result.nextLevelUnlocked) {
      setJustUnlockedLevel(`Niveau suivant débloqué avec succès !`);
      setTimeout(() => setJustUnlockedLevel(null), 5000);
    }
    fetchProgress();
  };

  const filteredTests = testStatuses.filter((item) => {
    if (selectedTheme === 'Tous') return true;
    return item.test.theme === selectedTheme;
  });

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'Word':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'Excel':
        return <Table className="w-5 h-5 text-emerald-600" />;
      case 'Python':
        return <Code2 className="w-5 h-5 text-amber-600" />;
      default:
        return <Keyboard className="w-5 h-5 text-indigo-600" />;
    }
  };

  // Stats summaries
  const totalTests = testStatuses.length;
  const passedTests = testStatuses.filter((s) => s.bestEvaluation?.passed).length;
  const highestWpm = testStatuses.reduce((max, s) => Math.max(max, s.bestEvaluation?.wpm || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tests de Rapidité & Précision Clavier</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Entraînement de Frappe Numérique
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Démontrez votre maîtrise de la frappe au clavier sur les formats officiels : traitement de texte Word, formules Excel et scripts Python.
              Chaque niveau validé débloque l’épreuve suivante.
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center min-w-[90px]">
              <span className="text-[11px] text-slate-300 block uppercase font-bold">Progression</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                {passedTests} / {totalTests}
              </span>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center min-w-[90px]">
              <span className="text-[11px] text-slate-300 block uppercase font-bold">Record Vitesse</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">
                {highestWpm} <span className="text-xs font-normal text-slate-300">WPM</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification if unlocked */}
      {justUnlockedLevel && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-3 shadow-sm animate-bounce">
          <Trophy className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{justUnlockedLevel}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
        <div className="flex items-center gap-2">
          {['Tous', 'Word', 'Excel', 'Python'].map((theme) => (
            <button
              key={theme}
              onClick={() => setSelectedTheme(theme)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedTheme === theme
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {theme === 'Tous' ? 'Toutes les matières' : theme}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 hidden sm:inline-block">
          Règle : Niveaux déverrouillés séquentiellement
        </span>
      </div>

      {/* Tests Grid */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Chargement des tests de votre classe...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
          <Keyboard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">Aucun test dans cette catégorie</h3>
          <p className="text-xs text-slate-500 mt-1">
            Votre professeur n’a pas encore configuré de test pour cette matière.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTests.map(({ test, isUnlocked, bestEvaluation }) => {
            const isPassed = bestEvaluation?.passed;

            return (
              <div
                key={test.id}
                className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative ${
                  isUnlocked
                    ? isPassed
                      ? 'bg-white border-emerald-300 shadow-sm hover:shadow-md'
                      : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300'
                    : 'bg-slate-100/90 border-slate-200/80 opacity-70 cursor-not-allowed select-none'
                }`}
              >
                {/* Status bar header */}
                <div
                  className={`px-5 py-3 border-b flex items-center justify-between text-xs font-semibold ${
                    !isUnlocked
                      ? 'bg-slate-200/70 border-slate-300/60 text-slate-500'
                      : isPassed
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-indigo-50/70 border-indigo-100 text-indigo-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {isUnlocked ? (
                      isPassed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Niveau Validé</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4 text-indigo-600" />
                          <span>Niveau Accessible</span>
                        </>
                      )
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-slate-400" />
                        <span>Niveau Verrouillé (Inactif)</span>
                      </>
                    )}
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-white/80 border border-current text-[11px] font-bold">
                    {test.theme} • Niv. {test.level}
                  </span>
                </div>

                {/* Content body */}
                <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 flex-shrink-0">
                        {getThemeIcon(test.theme)}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {test.title}
                      </h3>
                    </div>

                    {test.description && (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {test.description}
                      </p>
                    )}
                  </div>

                  {/* Requirements grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>Temps : <strong>{test.timeLimitSeconds}s</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span>Min. : <strong>{test.minWpm} WPM</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 col-span-2">
                      <Target className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>Précision requise : <strong>≥ {test.minAccuracyPercent}%</strong></span>
                    </div>
                  </div>

                  {/* Previous best score if attempted */}
                  {bestEvaluation && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Meilleur résultat :</span>
                        <span className="font-bold text-slate-800">
                          {bestEvaluation.score} / 20
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-slate-700 text-[11px]">
                        <span>{bestEvaluation.wpm} WPM</span>
                        <span>{bestEvaluation.accuracy}% précision</span>
                      </div>
                    </div>
                  )}

                  {/* Inactive lock message */}
                  {!isUnlocked && (
                    <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>
                        Validez le <strong>Niveau {test.level - 1}</strong> précédent pour débloquer ce test.
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Action Button */}
                <div className="p-4 pt-0">
                  {isUnlocked ? (
                    <button
                      onClick={() => setActiveTest(test)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                        isPassed
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                      }`}
                    >
                      {isPassed ? (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          <span>Améliorer mon score</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Démarrer le test</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Niveau inactif</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Typing Test Modal */}
      {activeTest && (
        <TypingTestModal
          test={activeTest}
          token={token}
          onClose={() => setActiveTest(null)}
          onSuccessEvaluation={handleEvaluationSuccess}
        />
      )}
    </div>
  );
};
