/**
 * Formate un montant dans la devise souhaitée (par défaut FCFA sans décimales inutiles)
 */
export function formatCurrency(amount: number, currency: string = 'FCFA'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `0 ${currency}`;
  }
  
  // Utiliser le formateur standard français pour les espaces de milliers
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);

  return `${formatted} ${currency}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
