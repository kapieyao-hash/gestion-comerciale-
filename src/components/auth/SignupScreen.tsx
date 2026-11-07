import React, { useState } from 'react';
import { Store } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { translateAuthError } from '../../lib/authErrors';

interface SignupScreenProps {
  onGoToLogin: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ onGoToLogin }) => {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne sont pas identiques.');
      return;
    }

    setIsSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: prenom.trim(),
          last_name: nom.trim(),
        },
      },
    });

    setIsSubmitting(false);

    if (signUpError) {
      setError(translateAuthError(signUpError.message));
      return;
    }

    if (!data.session) {
      setSuccess('Compte créé. Vérifiez votre email pour confirmer votre inscription.');
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
            <h1 className="font-black text-slate-900 text-lg leading-tight">Inscription</h1>
            <p className="text-xs text-slate-500">Créer un compte</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="signup-nom">
              Nom
            </label>
            <input
              id="signup-nom"
              type="text"
              autoComplete="family-name"
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="signup-prenom">
              Prénom
            </label>
            <input
              id="signup-prenom"
              type="text"
              autoComplete="given-name"
              required
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="signup-email">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="signup-password">
              Mot de passe
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="signup-confirm-password">
              Confirmation du mot de passe
            </label>
            <input
              id="signup-confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-rose-600">{error}</p>
          )}
          {success && (
            <p className="text-xs font-medium text-emerald-700">{success}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-emerald-600 text-white text-sm font-bold py-2.5 hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? 'Inscription...' : "S'inscrire"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          <button
            type="button"
            onClick={onGoToLogin}
            className="font-semibold text-emerald-700 hover:underline cursor-pointer"
          >
            Déjà inscrit ?
          </button>
        </p>
      </div>
    </div>
  );
};
