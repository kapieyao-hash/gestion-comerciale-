import React, { useState, useMemo } from 'react';
import { Sale, Payment, Customer } from '../../types/database.types';
import { RecordPaymentModal } from './RecordPaymentModal';
import { EmptyState } from '../layout/EmptyState';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { exportDebtsSummaryToCsv } from '../../lib/exportCsv';
import {
  CreditCard,
  Search,
  CheckCircle,
  AlertTriangle,
  History,
  PlusCircle,
  Clock,
  User,
  ArrowDownRight,
  Receipt,
  Eye,
  X,
  Download
} from 'lucide-react';

interface PaymentHistoryProps {
  sales: Sale[];
  customers?: Customer[];
  onRecordPayment: (
    saleId: string,
    amount: number,
    paymentMethod: string,
    notes?: string
  ) => Promise<void>;
  currency?: string;
  onNavigateToNewSale?: () => void;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  sales,
  customers = [],
  onRecordPayment,
  currency = 'FCFA',
  onNavigateToNewSale,
}) => {
  // Modal de saisie d'un nouveau paiement partiel
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<Sale | null>(null);

  // Modal d'historique détaillé des versements d'une vente
  const [selectedSaleForHistory, setSelectedSaleForHistory] = useState<Sale | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all_debts' | 'partial' | 'unpaid' | 'all_payments'>('all_debts');

  // Ventes ayant un reste dû (dettes actives)
  const salesWithDebt = useMemo(() => {
    return sales.filter((s) => s.remaining_amount > 0);
  }, [sales]);

  // Tous les versements enregistrés dans l'application
  const allRecordedPayments = useMemo(() => {
    const list: {
      id: string;
      sale_id: string;
      customer_name: string;
      total_amount: number;
      amount: number;
      payment_method: string;
      notes?: string;
      created_at?: string;
    }[] = [];

    sales.forEach((s) => {
      s.payments?.forEach((p) => {
        list.push({
          id: p.id,
          sale_id: s.id,
          customer_name: s.customer_name || 'Client comptant',
          total_amount: s.total_amount,
          amount: p.amount,
          payment_method: p.payment_method,
          notes: p.notes,
          created_at: p.created_at,
        });
      });
    });

    return list.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [sales]);

  // Statistiques financières réelles
  const stats = useMemo(() => {
    const totalRemainingDebts = salesWithDebt.reduce((acc, s) => acc + s.remaining_amount, 0);
    const totalCollected = sales.reduce((acc, s) => acc + s.amount_paid, 0);
    const countActiveDebtors = new Set(salesWithDebt.map((s) => s.customer_id || s.id)).size;
    const partialCount = sales.filter((s) => s.payment_status === 'partial').length;
    const unpaidCount = sales.filter((s) => s.payment_status === 'unpaid').length;

    return {
      totalRemainingDebts,
      totalCollected,
      countActiveDebtors,
      partialCount,
      unpaidCount,
      totalPaymentsCount: allRecordedPayments.length,
    };
  }, [sales, salesWithDebt, allRecordedPayments]);

  // Filtrage des ventes avec dettes
  const filteredDebtSales = useMemo(() => {
    return salesWithDebt.filter((sale) => {
      const q = searchQuery.toLowerCase();
      const matchCustomer = (sale.customer_name || '').toLowerCase().includes(q);
      const matchNotes = (sale.notes || '').toLowerCase().includes(q);

      if (!matchCustomer && !matchNotes) return false;

      if (filterType === 'partial') return sale.payment_status === 'partial';
      if (filterType === 'unpaid') return sale.payment_status === 'unpaid';
      return true;
    });
  }, [salesWithDebt, searchQuery, filterType]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-emerald-600" />
            Suivi des Dettes & Historique des Règlements
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Enregistrez les versements partiels sur les ventes à crédit et suivez la mise à jour immédiate des sommes restantes dues.
          </p>
        </div>

        {salesWithDebt.length > 0 && (
          <button
            onClick={() => exportDebtsSummaryToCsv(sales, customers, currency)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-semibold text-sm shadow-2xs transition-all self-start sm:self-auto cursor-pointer"
            title="Télécharger le résumé des créances et dettes clients au format CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exporter Dettes CSV</span>
          </button>
        )}
      </div>

      {/* Cartes d'indicateurs financiers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Total Restant Dû
          </div>
          <div className={`text-2xl font-black ${stats.totalRemainingDebts > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {formatCurrency(stats.totalRemainingDebts, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-1">sommes en attente</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Total Encaissé
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatCurrency(stats.totalCollected, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-1">fonds déjà perçus</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <User className="w-4 h-4 text-blue-600" />
            Ventes en Dette
          </div>
          <div className="text-2xl font-black text-slate-900">
            {salesWithDebt.length}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {stats.partialCount} partielles, {stats.unpaidCount} impayées
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            Versements Enregistrés
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.totalPaymentsCount}
          </div>
          <div className="text-xs text-slate-400 mt-1">règlements enregistrés</div>
        </div>
      </div>

      {/* Barre de navigation entre Dettes en attente et Historique des encaissements */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom de client ou note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setFilterType('all_debts')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'all_debts'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Dettes actives ({salesWithDebt.length})
          </button>
          <button
            onClick={() => setFilterType('partial')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'partial'
                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Acomptes ({stats.partialCount})
          </button>
          <button
            onClick={() => setFilterType('unpaid')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'unpaid'
                ? 'bg-rose-100 text-rose-950 border border-rose-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            100% Impayées ({stats.unpaidCount})
          </button>
          <button
            onClick={() => setFilterType('all_payments')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterType === 'all_payments'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Historique des versements ({allRecordedPayments.length})
          </button>
        </div>
      </div>

      {/* VUE 1 : HISTORIQUE COMPLET DES VERSEMENTS */}
      {filterType === 'all_payments' ? (
        allRecordedPayments.length === 0 ? (
          <EmptyState
            icon={History}
            title="Aucun versement additionnel enregistré"
            description="Lorsqu'un client effectue un paiement pour solder ou réduire une vente à crédit, l'historique complet de ses versements s'affichera ici avec la date et le mode de règlement."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200 font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3.5 px-6">Date de versement</th>
                    <th className="py-3.5 px-6">Client</th>
                    <th className="py-3.5 px-6">Montant Versé</th>
                    <th className="py-3.5 px-6">Moyen de règlement</th>
                    <th className="py-3.5 px-6">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {allRecordedPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6 text-slate-500 text-xs">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(payment.created_at)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-900">
                        {payment.customer_name}
                      </td>
                      <td className="py-3.5 px-6 font-black text-emerald-700">
                        +{formatCurrency(payment.amount, currency)}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {payment.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 text-xs">
                        {payment.notes || <span className="text-slate-300 italic">Aucune note</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* VUE 2 : LISTE DES VENTES EN DETTE (PARTIAL OU UNPAID) AVEC BOUTON D'ENCAISSEMENT */
        salesWithDebt.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Aucune dette en cours !"
            description="Toutes vos ventes enregistrées ont été réglées en totalité. Vos créances clients sont à jour."
          />
        ) : filteredDebtSales.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
            <p className="text-slate-600 text-sm font-medium">
              Aucune vente en dette ne correspond à votre recherche.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {/* Table Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <th className="py-3.5 px-6">Date de vente</th>
                    <th className="py-3.5 px-6">Client débiteur</th>
                    <th className="py-3.5 px-6">Total Vente</th>
                    <th className="py-3.5 px-6">Déjà Versé</th>
                    <th className="py-3.5 px-6">Reste à payer</th>
                    <th className="py-3.5 px-6">Historique versements</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDebtSales.map((sale) => {
                    const paymentsCount = sale.payments?.length || 0;
                    return (
                      <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(sale.created_at)}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-slate-900 block">
                            {sale.customer_name || 'Client de passage'}
                          </span>
                          {sale.notes && (
                            <span className="text-xs text-slate-400 line-clamp-1">
                              {sale.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-900">
                          {formatCurrency(sale.total_amount, currency)}
                        </td>
                        <td className="py-4 px-6 text-emerald-700 font-semibold">
                          {formatCurrency(sale.amount_paid, currency)}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-black text-amber-600 text-base">
                            {formatCurrency(sale.remaining_amount, currency)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {paymentsCount > 0 ? (
                            <button
                              onClick={() => setSelectedSaleForHistory(sale)}
                              className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <span>{paymentsCount} versement(s)</span>
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Aucun acompte</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => setSelectedSaleForPayment(sale)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Encaisser</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredDebtSales.map((sale) => (
                <div key={sale.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{sale.customer_name || 'Client de passage'}</h4>
                      <span className="text-xs text-slate-400">{formatDate(sale.created_at)}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                      Reste {formatCurrency(sale.remaining_amount, currency)}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Montant total de la vente :</span>
                      <span className="font-bold text-slate-900">{formatCurrency(sale.total_amount, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Déjà versé :</span>
                      <span className="font-semibold text-emerald-700">{formatCurrency(sale.amount_paid, currency)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {sale.payments && sale.payments.length > 0 ? (
                      <button
                        onClick={() => setSelectedSaleForHistory(sale)}
                        className="text-xs text-blue-700 font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{sale.payments.length} versement(s)</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Aucun versement antérieur</span>
                    )}

                    <button
                      onClick={() => setSelectedSaleForPayment(sale)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Encaisser</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* MODAL ENREGISTRER UN PAIEMENT */}
      <RecordPaymentModal
        isOpen={Boolean(selectedSaleForPayment)}
        onClose={() => setSelectedSaleForPayment(null)}
        sale={selectedSaleForPayment}
        currency={currency}
        onSubmitPayment={onRecordPayment}
      />

      {/* MODAL HISTORIQUE DES VERSEMENTS D'UNE VENTE PARTICULIÈRE */}
      {selectedSaleForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Versements de {selectedSaleForHistory.customer_name || 'Client'}
                </h3>
                <p className="text-xs text-slate-400">
                  Total facturé : {formatCurrency(selectedSaleForHistory.total_amount, currency)}
                </p>
              </div>
              <button
                onClick={() => setSelectedSaleForHistory(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedSaleForHistory.payments && selectedSaleForHistory.payments.length > 0 ? (
                selectedSaleForHistory.payments.map((p, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-700 text-sm">
                        +{formatCurrency(p.amount, currency)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(p.created_at)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Moyen : {p.payment_method}</span>
                      {p.notes && <span className="italic">{p.notes}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  Aucun versement additionnel pour cette vente.
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
              <span>Reste actuellement dû :</span>
              <span className="text-amber-600 font-black text-sm">
                {formatCurrency(selectedSaleForHistory.remaining_amount, currency)}
              </span>
            </div>

            <button
              onClick={() => setSelectedSaleForHistory(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
