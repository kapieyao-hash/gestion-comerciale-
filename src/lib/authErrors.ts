export function translateAuthError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes('invalid login credentials')) {
    return 'Email ou mot de passe incorrect.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Un compte existe déjà avec cet email.';
  }
  if (m.includes('password should be at least') || m.includes('password is known to be weak')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return 'Adresse email invalide.';
  }
  if (m.includes('email not confirmed')) {
    return 'Veuillez confirmer votre email avant de vous connecter.';
  }
  if (m.includes('signup is disabled')) {
    return 'Les inscriptions sont désactivées.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Trop de tentatives. Réessayez plus tard.';
  }

  return 'Une erreur est survenue. Veuillez réessayer.';
}
