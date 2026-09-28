import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ArrowUpDown,
  Filter,
  Users,
  Clock,
  Sparkles,
  RefreshCw,
  Eye,
  X,
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';
import { api } from '../api';
import { QCMAttempt, QCMGlobalStats, QCMQuestionAnalysis } from '../types';

interface TeacherQCMStatsSectionProps {
  token: string;
  classes?: Array<{ id: string; name: string }>;
}

export const TeacherQCMStatsSection: React.FC<TeacherQCMStatsSectionProps> = ({
  token,
  classes = []
}) => {
  const [globalStats, setGlobalStats] = useState<QCMGlobalStats | null>(null);
  const [questionsAnalysis, setQuestionsAnalysis] = useState<QCMQuestionAnalysis[]>([]);
  const [attempts, setAttempts] = useState<QCMAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: 'analytics' (Questions & Taux) | 'history' (Historique des tentatives)
  const [activeTab, setActiveTab] = useState<'analytics' | 'history'>('analytics');

  // Filters for analytics
  const [selectedQcmFilter, setSelectedQcmFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');
  const [questionSort, setQuestionSort] = useState<'lowest' | 'highest' | 'most_answered'>('lowest');
  const [questionSearch, setQuestionSearch] = useState('');

  // Filters for attempts history
  const [historySearch, setHistorySearch] = useState('');
  const [historyQcmFilter, setHistoryQcmFilter] = useState('all');
  const [historyClassFilter, setHistoryClassFilter] = useState('all');
  const [historySort, setHistorySort] = useState<'date-desc' | 'date-asc' | 'score-desc' | 'score-asc'>('date-desc');

  // Inspection modal for a specific attempt
  const [selectedAttempt, setSelectedAttempt] = useState<QCMAttempt | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, attemptsData] = await Promise.all([
        api.getTeacherQCMStats(token).catch(() => null),
        api.getTeacherQCMAttempts(token).catch(() => [])
      ]);
      if (statsData) {
        setGlobalStats(statsData);
        setQuestionsAnalysis(statsData.questionsAnalysis || []);
        if (Array.isArray(attemptsData) && attemptsData.length > 0) {
          setAttempts(attemptsData);
        } else if (statsData.attempts) {
          setAttempts(statsData.attempts);
        }
      } else {
        setAttempts(attemptsData || []);
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les statistiques des QCM');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Overall totals
  const totalAttemptsCount = attempts.length;
  const avgOverallScore20 = globalStats?.averageScore20 !== undefined
    ? globalStats.averageScore20.toFixed(1)
    : totalAttemptsCount > 0
      ? (attempts.reduce((acc, a) => acc + (a.score20 || 0), 0) / totalAttemptsCount).toFixed(1)
      : '0';
  const avgOverallSuccessRate = globalStats?.averageSuccessRate !== undefined
    ? globalStats.averageSuccessRate
    : totalAttemptsCount > 0
      ? Math.round(attempts.reduce((acc, a) => acc + (a.successRate || 0), 0) / totalAttemptsCount)
      : 0;

  // Distinct QCM list for filtering
  const distinctQcmsMap = new Map<string, string>();
  questionsAnalysis.forEach(q => {
    if (q.qcmId) distinctQcmsMap.set(q.qcmId, q.qcmTitle || 'QCM');
  });
  attempts.forEach(a => {
    if (a.qcmId) distinctQcmsMap.set(a.qcmId, a.qcmTitle || 'QCM');
  });
  const distinctQcms = Array.from(distinctQcmsMap.entries()).map(([qcmId, qcmTitle]) => ({
    qcmId,
    qcmTitle
  }));

  // Filter and sort questions for analytics view
  const allFilteredQuestions = questionsAnalysis.filter(q => {
    if (selectedQcmFilter !== 'all' && q.qcmId !== selectedQcmFilter) return false;
    if (selectedCategoryFilter !== 'all' && q.category !== selectedCategoryFilter) return false;
    if (selectedLevelFilter !== 'all' && q.level !== selectedLevelFilter) return false;
    if (selectedSectionFilter !== 'all' && q.section !== selectedSectionFilter) return false;
    if (questionSearch.trim()) {
      const query = questionSearch.toLowerCase();
      return q.questionText.toLowerCase().includes(query) || q.qcmTitle.toLowerCase().includes(query);
    }
    return true;
  }).sort((a, b) => {
    if (questionSort === 'lowest') return a.successRate - b.successRate;
    if (questionSort === 'highest') return b.successRate - a.successRate;
    if (questionSort === 'most_answered') return b.totalAnswers - a.totalAnswers;
    return 0;
  });

  // Filtered attempts for history view
  const filteredAttempts = attempts.filter(att => {
    if (historyQcmFilter !== 'all' && att.qcmId !== historyQcmFilter) return false;
    if (historyClassFilter !== 'all') {
      if (att.className && att.className !== historyClassFilter) return false;
    }
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      const matchName = (att.studentName || '').toLowerCase().includes(q);
      const matchTitle = (att.qcmTitle || '').toLowerCase().includes(q);
      const matchClass = (att.className || '').toLowerCase().includes(q);
      if (!matchName && !matchTitle && !matchClass) return false;
    }
    return true;
  }).sort((a, b) => {
    if (historySort === 'date-desc') return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    if (historySort === 'date-asc') return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
    if (historySort === 'score-desc') return (b.score20 || 0) - (a.score20 || 0);
    if (historySort === 'score-asc') return (a.score20 || 0) - (b.score20 || 0);
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900">
                Statistiques & Analyse des QCM
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                Analytique
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Analyse détaillée du taux de réussite par question, taux de réponses correctes/incorrectes et historique par élève.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Rafraîchir les données</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Tentatives</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalAttemptsCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Passages enregistrés</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Moyenne Générale</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {avgOverallScore20} <span className="text-sm font-bold text-slate-400">/ 20</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Sur l'ensemble des QCM</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Taux de Réussite</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{avgOverallSuccessRate}%</div>
          <p className="text-[11px] text-slate-500 mt-1">Taux moyen de bonnes réponses</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">QCM Référencés</span>
            <HelpCircle className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{globalStats?.totalQcms ?? distinctQcms.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Questionnaires créés</p>
        </div>
      </div>

      {/* Main Tab Nav */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analyse par Question & Taux</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700">
            {allFilteredQuestions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Historique des Tentatives par Élève</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700">
            {filteredAttempts.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ANALYTICS BY QUESTION */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* QCM filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">QCM :</span>
                <select
                  value={selectedQcmFilter}
                  onChange={(e) => setSelectedQcmFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">Tous les QCM</option>
                  {distinctQcms.map(s => (
                    <option key={s.qcmId} value={s.qcmId}>{s.qcmTitle}</option>
                  ))}
                </select>
              </div>

              {/* Category filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-semibold">Catégorie :</span>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">Toutes</option>
                  <option value="Word">Word</option>
                  <option value="Excel">Excel</option>
                  <option value="Python">Python</option>
                  <option value="Général">Général</option>
                </select>
              </div>

              {/* Sort by success rate */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">Trier par :</span>
                <select
                  value={questionSort}
                  onChange={(e) => setQuestionSort(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="lowest">Plus difficile d'abord (Taux ↑)</option>
                  <option value="highest">Mieux réussie d'abord (Taux ↓)</option>
                  <option value="most_answered">Plus de réponses</option>
                </select>
              </div>
            </div>

            {/* Question search */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une question..."
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Questions list */}
          {loading ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-xs text-slate-500">Chargement de l'analyse...</p>
            </div>
          ) : allFilteredQuestions.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">Aucune question avec des réponses enregistrées</h4>
              <p className="text-xs text-slate-400 mt-1">
                Dès que des élèves répondent aux QCM, les taux de réponses par question s'afficheront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allFilteredQuestions.map((q, idx) => {
                const incorrectRate = 100 - q.successRate;
                const isChallenging = q.successRate < 50;
                const isMastered = q.successRate >= 75;

                return (
                  <div
                    key={`${q.questionId}-${idx}`}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {q.category && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {q.category}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-indigo-600">
                          {q.qcmTitle}
                        </span>
                      </div>

                      {/* Status Tag */}
                      <div>
                        {isChallenging ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Question difficile (À revoir en classe)
                          </span>
                        ) : isMastered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Bien maîtrisée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Taux moyen
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question text */}
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {q.questionText}
                    </p>

                    {/* Rates Visual Bars */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Bonnes réponses : {q.correctAnswers} ({q.successRate}%)
                        </span>
                        <span className="flex items-center gap-1.5 font-semibold text-rose-700">
                          <XCircle className="w-3.5 h-3.5" />
                          Mauvaises réponses : {q.incorrectAnswers} ({incorrectRate}%)
                        </span>
                      </div>

                      {/* Dual Progress Bar */}
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                        <div
                          className="bg-emerald-500 transition-all duration-500"
                          style={{ width: `${q.successRate}%` }}
                          title={`Bonnes réponses : ${q.successRate}%`}
                        />
                        <div
                          className="bg-rose-400 transition-all duration-500"
                          style={{ width: `${incorrectRate}%` }}
                          title={`Mauvaises réponses : ${incorrectRate}%`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Total des réponses : {q.totalAnswers} élève{q.totalAnswers > 1 ? 's' : ''}</span>
                        {q.optionCounts && (
                          <span className="space-x-2">
                            <span>Dist. options :</span>
                            {Object.entries(q.optionCounts).map(([opt, count]) => (
                              <span key={opt} className="font-mono text-slate-600">
                                {opt}:{String(count)}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STUDENT ATTEMPTS HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* History Filters */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* QCM filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">QCM :</span>
                <select
                  value={historyQcmFilter}
                  onChange={(e) => setHistoryQcmFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                >
                  <option value="all">Tous les QCM</option>
                  {distinctQcms.map(s => (
                    <option key={s.qcmId} value={s.qcmId}>{s.qcmTitle}</option>
                  ))}
                </select>
              </div>

              {/* Class filter */}
              {classes.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="font-semibold">Classe :</span>
                  <select
                    value={historyClassFilter}
                    onChange={(e) => setHistoryClassFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                  >
                    <option value="all">Toutes les classes</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">Trier :</span>
                <select
                  value={historySort}
                  onChange={(e) => setHistorySort(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                >
                  <option value="date-desc">Plus récent d'abord</option>
                  <option value="date-asc">Plus ancien d'abord</option>
                  <option value="score-desc">Meilleure note d'abord</option>
                  <option value="score-asc">Moins bonne note d'abord</option>
                </select>
              </div>
            </div>

            {/* Student Search */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par élève ou classe..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-xs">Chargement de l'historique...</p>
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">Aucune tentative trouvée</h4>
              <p className="text-xs text-slate-500 mt-1">
                Aucun élève ne correspond aux critères sélectionnés.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & Heure</th>
                    <th className="py-3 px-4">Élève & Classe</th>
                    <th className="py-3 px-4">QCM concerné</th>
                    <th className="py-3 px-4 text-center">Questions</th>
                    <th className="py-3 px-4 text-center">Correctes / Incorrectes</th>
                    <th className="py-3 px-4 text-center">Taux de réussite</th>
                    <th className="py-3 px-4 text-center">Résultat obtenu</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttempts.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        <div className="font-semibold text-slate-800">
                          {new Date(att.completedAt).toLocaleDateString('fr-FR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(att.completedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{att.studentName || 'Élève'}</div>
                        {att.className && (
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {att.className}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                        {att.qcmTitle}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {att.totalQuestions}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          ✓ {att.correctCount}
                        </span>
                        <span className="mx-1 text-slate-300">/</span>
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                          ✗ {att.incorrectCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          att.successRate >= 70
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : att.successRate >= 50
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {att.successRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={`px-3 py-1 rounded-xl text-xs font-black border ${
                          att.score20 >= 10
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}>
                          {att.score20} / 20
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {att.totalScore} / {att.maxScore} pts
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedAttempt(att)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Détails</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* INSPECT ATTEMPT MODAL */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-6 flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Détail de la tentative élève
                </span>
                <h3 className="text-base font-bold mt-1">
                  {selectedAttempt.studentName} — {selectedAttempt.qcmTitle}
                </h3>
                <p className="text-xs text-slate-400">
                  Passé le {new Date(selectedAttempt.completedAt).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })} à {new Date(selectedAttempt.completedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAttempt(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score Summary */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 block font-semibold">Note obtenue</span>
                <strong className={`text-base font-black ${
                  selectedAttempt.score20 >= 10 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {selectedAttempt.score20} / 20
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 block font-semibold">Taux de réussite</span>
                <strong className="text-base font-black text-indigo-600">
                  {selectedAttempt.successRate}%
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 block font-semibold">Bonnes réponses</span>
                <strong className="text-base font-black text-slate-800">
                  {selectedAttempt.correctCount} / {selectedAttempt.totalQuestions}
                </strong>
              </div>
            </div>

            {/* Answers Breakdown */}
            <div className="p-6 overflow-y-auto max-h-[50vh] space-y-3">
              <h4 className="text-xs font-bold text-slate-700">Détail des questions enregistrées :</h4>
              {selectedAttempt.answersJson ? (
                (() => {
                  try {
                    const parsed = typeof selectedAttempt.answersJson === 'string'
                      ? JSON.parse(selectedAttempt.answersJson)
                      : selectedAttempt.answersJson;
                    const entries = Object.entries(parsed || {});
                    if (entries.length === 0) {
                      return <p className="text-xs text-slate-400">Aucun détail supplémentaire disponible.</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {entries.map(([qId, val]: [string, any], idx) => (
                          <div
                            key={qId}
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                              val.isCorrect
                                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                                : 'bg-rose-50/50 border-rose-200 text-rose-900'
                            }`}
                          >
                            <span className="font-semibold">Question #{idx + 1}</span>
                            <div className="flex items-center gap-3">
                              <span>Réponse choisie : <strong>Option {val.chosen || 'Non répondu'}</strong></span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                val.isCorrect ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                              }`}>
                                {val.isCorrect ? `+${val.pointsEarned ?? 1} pts (Correct)` : 'Incorrect'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  } catch {
                    return <p className="text-xs text-slate-400">Détail non disponible.</p>;
                  }
                })()
              ) : (
                <p className="text-xs text-slate-400">Aucun détail de question disponible pour cette tentative.</p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAttempt(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
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
