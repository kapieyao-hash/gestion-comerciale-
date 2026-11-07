import React, { useState } from 'react';
import { Store } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { translateAuthError } from '../../lib/authErrors';

interface LoginScreenProps {
  onGoToSignup: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGoToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(translateAuthError(signInError.message));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 font-sans text-slate-800">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-slate-900 text-lg leading-tight">Connexion</h1>
            <p className="text-xs text-slate-500">Email et mot de passe</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="login-password">
              Mot de passe
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-rose-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-emerald-600 text-white text-sm font-bold py-2.5 hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          <button
            type="button"
            onClick={onGoToSignup}
            className="font-semibold text-emerald-700 hover:underline cursor-pointer"
          >
            Créer un compte
          </button>
        </p>
      </div>
    </div>
  );
};
