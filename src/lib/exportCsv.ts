import { Sale, Customer } from '../types/database.types';

/**
 * Fonction utilitaire pour échapper et formater un champ texte au standard CSV RFC 4180
 */
function escapeCsvValue(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Télécharge un fichier CSV dans le navigateur avec BOM UTF-8 (compatible Excel, LibreOffice, Google Sheets)
 */
function downloadCsv(content: string, filename: string): void {
  // \uFEFF ajoute le BOM UTF-8 pour un affichage parfait des accents sous Microsoft Excel
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporte l'historique complet des ventes en CSV (avec détail des articles, montants TTC, encaissements et dettes)
 */
export function exportSalesToCsv(sales: Sale[], currency = 'FCFA'): void {
  const headers = [
    'ID Vente',
    'Date & Heure',
    'Client',
    'Total Articles',
    'Articles vendus (Détails)',
    `Total Facturé TTC (${currency})`,
    `Montant Encaissé (${currency})`,
    `Reste à Payer (${currency})`,
    'Statut Règlement',
    'Moyen de Paiement',
    'Notes',
  ];

  const rows = sales.map((sale) => {
    const formattedDate = sale.created_at
      ? new Date(sale.created_at).toLocaleString('fr-FR')
      : 'Date inconnue';

    const itemsCount = sale.items
      ? sale.items.reduce((sum, item) => sum + item.quantity, 0)
      : 0;

    const itemsSummary = sale.items
      ? sale.items
          .map((item) => `${item.quantity}x ${item.product_name || 'Produit'} (${item.unit_price} ${currency}/u)`)
          .join(' | ')
      : '';

    const statusLabel =
      sale.payment_status === 'paid'
        ? 'Soldé / Payé'
        : sale.payment_status === 'partial'
        ? 'Paiement partiel (Acompte)'
        : 'Non payé (100% Crédit)';

    return [
      escapeCsvValue(sale.id),
      escapeCsvValue(formattedDate),
      escapeCsvValue(sale.customer_name || 'Client de passage'),
      escapeCsvValue(itemsCount),
      escapeCsvValue(itemsSummary),
      escapeCsvValue(sale.total_amount),
      escapeCsvValue(sale.amount_paid),
      escapeCsvValue(sale.remaining_amount),
      escapeCsvValue(statusLabel),
      escapeCsvValue(sale.payment_method || 'Espèces'),
      escapeCsvValue(sale.notes || ''),
    ].join(';');
  });

  const csvContent = [headers.join(';'), ...rows].join('\r\n');
  const now = new Date().toISOString().slice(0, 10);
  downloadCsv(csvContent, `journal_des_ventes_${now}.csv`);
}

/**
 * Exporte le résumé comptable des dettes et créances clients en CSV
 */
export function exportDebtsSummaryToCsv(
  sales: Sale[],
  customers: Customer[],
  currency = 'FCFA'
): void {
  // Filtrer uniquement les ventes ayant un reste dû > 0
  const debtSales = sales.filter((s) => s.remaining_amount > 0);

  // Agrégation par client
  const debtsByCustomer: {
    [key: string]: {
      customerName: string;
      phone: string;
      address: string;
      totalSalesAmount: number;
      totalPaid: number;
      totalRemainingDebt: number;
      unsettledSalesCount: number;
      oldestDebtDate: string;
    };
  } = {};

  debtSales.forEach((sale) => {
    const customerKey = sale.customer_id || sale.customer_name || 'Client inconnu';
    const matchedCustomer = customers.find((c) => c.id === sale.customer_id);

    if (!debtsByCustomer[customerKey]) {
      debtsByCustomer[customerKey] = {
        customerName: sale.customer_name || matchedCustomer?.name || 'Client de passage',
        phone: matchedCustomer?.phone || '',
        address: matchedCustomer?.address || '',
        totalSalesAmount: 0,
        totalPaid: 0,
        totalRemainingDebt: 0,
        unsettledSalesCount: 0,
        oldestDebtDate: sale.created_at || '',
      };
    }

    const entry = debtsByCustomer[customerKey];
    entry.totalSalesAmount += sale.total_amount;
    entry.totalPaid += sale.amount_paid;
    entry.totalRemainingDebt += sale.remaining_amount;
    entry.unsettledSalesCount += 1;

    // Déterminer la date de la dette la plus ancienne
    if (sale.created_at && (!entry.oldestDebtDate || new Date(sale.created_at) < new Date(entry.oldestDebtDate))) {
      entry.oldestDebtDate = sale.created_at;
    }
  });

  const headers = [
    'Client Débiteur',
    'Téléphone / WhatsApp',
    'Adresse / Quartier',
    'Nombre de Factures Impayées',
    `Total Facturé (${currency})`,
    `Total Déjà Versé (${currency})`,
    `Reste Dû Total (${currency})`,
    'Date Première Dette',
    'Statut Créance',
  ];

  const rows = Object.values(debtsByCustomer).map((debt) => {
    const firstDate = debt.oldestDebtDate
      ? new Date(debt.oldestDebtDate).toLocaleDateString('fr-FR')
      : 'Non renseignée';

    return [
      escapeCsvValue(debt.customerName),
      escapeCsvValue(debt.phone),
      escapeCsvValue(debt.address),
      escapeCsvValue(debt.unsettledSalesCount),
      escapeCsvValue(debt.totalSalesAmount),
      escapeCsvValue(debt.totalPaid),
      escapeCsvValue(debt.totalRemainingDebt),
      escapeCsvValue(firstDate),
      escapeCsvValue('Créance active à recouvrer'),
    ].join(';');
  });

  // Ligne de récapitulatif total
  const totalDebtOverall = debtSales.reduce((sum, s) => sum + s.remaining_amount, 0);
  const totalBilledOverall = debtSales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalPaidOverall = debtSales.reduce((sum, s) => sum + s.amount_paid, 0);

  const summaryRow = [
    escapeCsvValue('TOTAL GÉNÉRAL CRÉANCES'),
    escapeCsvValue(''),
    escapeCsvValue(''),
    escapeCsvValue(debtSales.length),
    escapeCsvValue(totalBilledOverall),
    escapeCsvValue(totalPaidOverall),
    escapeCsvValue(totalDebtOverall),
    escapeCsvValue(''),
    escapeCsvValue('À solder'),
  ].join(';');

  const csvContent = [headers.join(';'), ...rows, summaryRow].join('\r\n');
  const now = new Date().toISOString().slice(0, 10);
  downloadCsv(csvContent, `recapitulatif_dettes_clients_${now}.csv`);
}
