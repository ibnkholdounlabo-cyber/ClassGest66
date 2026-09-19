import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, AlertCircle, School, ArrowLeft } from 'lucide-react';
import { api } from '../api';
import { TeacherUser } from '../types';

interface TeacherLoginProps {
  onSuccess: (session: { teacher: TeacherUser; token: string }) => void;
  onNavigateHome?: () => void;
}

export const TeacherLogin: React.FC<TeacherLoginProps> = ({ onSuccess, onNavigateHome }) => {
  const [username, setUsername] = useState('prof');
  const [password, setPassword] = useState('prof1234');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Veuillez renseigner votre identifiant et votre mot de passe.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.teacherLogin(username.trim(), password.trim());
      onSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-12 px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-8 text-white text-center">
          <div className="inline-flex p-3 bg-indigo-600/30 rounded-2xl mb-3 text-indigo-300 ring-1 ring-indigo-500/30">
            <School className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Connexion par identifiant</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Accès sécurisé réservé au personnel administratif et pédagogique
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
            <span>URL : /prof</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="teacher-username" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              Identifiant
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="teacher-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Votre identifiant"
                autoComplete="username"
                className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="teacher-password" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="teacher-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                className="w-full h-11 pl-10 pr-11 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                required
              />
              <button
                type="button"
                id="toggle-teacher-pwd"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="btn-teacher-login-submit"
            type="submit"
            disabled={loading || !username || !password}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo info & Navigation Back */}
        <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 space-y-3">
          <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Compte démo : <strong>prof</strong> / <strong>prof1234</strong>
            </span>
            <button
              type="button"
              id="btn-fill-prof-demo"
              onClick={() => {
                setUsername('prof');
                setPassword('prof1234');
              }}
              className="text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
            >
              Remplir
            </button>
          </div>

          {onNavigateHome && (
            <div className="text-center pt-1">
              <button
                type="button"
                id="btn-back-to-portal"
                onClick={onNavigateHome}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour au portail élèves (accueil)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
