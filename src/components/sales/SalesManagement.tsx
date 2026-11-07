import React, { useState, useMemo } from 'react';
import { Sale, Product, Customer } from '../../types/database.types';
import { NewSaleModal } from './NewSaleModal';
import { EmptyState } from '../layout/EmptyState';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { exportSalesToCsv } from '../../lib/exportCsv';
import {
  ShoppingCart,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  Receipt,
  User,
  CreditCard,
  Eye,
  X,
  Download
} from 'lucide-react';

interface SalesManagementProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  onAddSale: (saleData: {
    customer_id?: string;
    customer_name?: string;
    total_amount: number;
    amount_paid: number;
    remaining_amount: number;
    payment_method: string;
    payment_status: 'paid' | 'partial' | 'unpaid';
    notes?: string;
    items: {
      product_id: string;
      product_name?: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }[];
  }) => Promise<void>;
  currency?: string;
}

export const SalesManagement: React.FC<SalesManagementProps> = ({
  sales,
  products,
  customers,
  onAddSale,
  currency = 'FCFA',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');

  // Synthèse financière réelle (Zéro donnée fictive)
  const stats = useMemo(() => {
    const totalSalesCount = sales.length;
    const totalRevenueTTC = sales.reduce((acc, s) => acc + s.total_amount, 0);
    const totalAmountCollected = sales.reduce((acc, s) => acc + s.amount_paid, 0);
    const totalRemainingDue = sales.reduce((acc, s) => acc + s.remaining_amount, 0);

    return {
      totalSalesCount,
      totalRevenueTTC,
      totalAmountCollected,
      totalRemainingDue,
    };
  }, [sales]);

  // Filtrage des ventes
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const q = searchQuery.toLowerCase();
      const matchCustomer = (sale.customer_name || '').toLowerCase().includes(q);
      const matchNotes = (sale.notes || '').toLowerCase().includes(q);
      const matchItem = sale.items?.some((i) => (i.product_name || '').toLowerCase().includes(q));

      const matchesSearch = !q || matchCustomer || matchNotes || matchItem;
      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      return sale.payment_status === statusFilter;
    });
  }, [sales, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingCart className="w-7 h-7 text-emerald-600" />
            Enregistrement & Historique des Ventes
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Sélectionnez les articles vendus, calculez le total TTC et mettez à jour votre stock instantanément.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {sales.length > 0 && (
            <button
              onClick={() => exportSalesToCsv(sales, currency)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-semibold text-sm shadow-2xs transition-all cursor-pointer"
              title="Télécharger l'historique complet des ventes au format CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Exporter CSV</span>
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Vente</span>
          </button>
        </div>
      </div>

      {/* Cartes d'indicateurs financiers réels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4 text-emerald-600" />
            Ventes Réalisées
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalSalesCount}</div>
          <div className="text-xs text-slate-400 mt-1">ventes enregistrées</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4 text-blue-600" />
            Total Facturé TTC
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatCurrency(stats.totalRevenueTTC, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-1">chiffre d'affaires brut</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Total Encaissé
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatCurrency(stats.totalAmountCollected, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-1">fonds reçus</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Dettes / Restes dus
          </div>
          <div className={`text-2xl font-black ${stats.totalRemainingDue > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {formatCurrency(stats.totalRemainingDue, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {stats.totalRemainingDue > 0 ? 'sommes à récupérer' : 'aucun impayé'}
          </div>
        </div>
      </div>

      {/* Barre d'outils : Recherche et Filtres par Statut */}
      {sales.length > 0 && (
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par client, article ou note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Toutes ({sales.length})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                statusFilter === 'paid'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Payées
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                statusFilter === 'partial'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Partielles (Dettes)
            </button>
          </div>
        </div>
      )}

      {/* État vide ou Liste des ventes */}
      {sales.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Aucune vente enregistrée"
          description="Votre journal des ventes est vide pour l'instant. Enregistrez votre première vente pour déduire vos articles en stock et calculer automatiquement vos montants encaissés."
          actionLabel="Enregistrer une vente"
          onAction={() => setIsModalOpen(true)}
        />
      ) : filteredSales.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
          <p className="text-slate-600 text-sm font-medium">
            Aucune vente ne correspond à vos filtres.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="mt-3 text-xs font-semibold text-emerald-600 hover:underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        /* Tableau / Cartes des ventes */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Table pour Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Client</th>
                  <th className="py-3.5 px-6">Articles</th>
                  <th className="py-3.5 px-6">Total TTC</th>
                  <th className="py-3.5 px-6">Encaissé</th>
                  <th className="py-3.5 px-6">Reste dû</th>
                  <th className="py-3.5 px-6">Statut</th>
                  <th className="py-3.5 px-6 text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSales.map((sale) => {
                  const isPaid = sale.remaining_amount === 0;
                  const isPartial = sale.remaining_amount > 0 && sale.amount_paid > 0;
                  const itemsSummary = sale.items && sale.items.length > 0
                    ? sale.items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')
                    : '1 ou plusieurs articles';

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 text-xs text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(sale.created_at)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {sale.customer_name || 'Client comptant'}
                            </span>
                            {sale.payment_method && (
                              <span className="text-[11px] text-slate-400">
                                {sale.payment_method}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs text-slate-600 line-clamp-1 max-w-[200px]" title={itemsSummary}>
                          {itemsSummary}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {formatCurrency(sale.total_amount, currency)}
                      </td>
                      <td className="py-4 px-6 text-emerald-700 font-semibold">
                        {formatCurrency(sale.amount_paid, currency)}
                      </td>
                      <td className="py-4 px-6">
                        {sale.remaining_amount > 0 ? (
                          <span className="font-bold text-amber-600">
                            {formatCurrency(sale.remaining_amount, currency)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">0 {currency}</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Soldé
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            Acompte
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Non payé
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedSaleDetail(sale)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          title="Voir le reçu détaillé"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Affichage Mobile */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredSales.map((sale) => {
              const isPaid = sale.remaining_amount === 0;

              return (
                <div key={sale.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block text-base">
                        {sale.customer_name || 'Client comptant'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(sale.created_at)}
                      </span>
                    </div>
                    {isPaid ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Soldé
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300">
                        Dette : {formatCurrency(sale.remaining_amount, currency)}
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total vente :</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(sale.total_amount, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Montant versé :</span>
                      <span className="font-semibold text-emerald-700">
                        {formatCurrency(sale.amount_paid, currency)}
                      </span>
                    </div>
                    {sale.items && (
                      <div className="pt-1 border-t border-slate-200/60 text-slate-600 line-clamp-1">
                        {sale.items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => setSelectedSaleDetail(sale)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Voir le reçu
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Nouvelle Vente */}
      <NewSaleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        products={products}
        customers={customers}
        currency={currency}
        onSubmitSale={onAddSale}
      />

      {/* Modal Reçu de Vente / Détails */}
      {selectedSaleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-900 text-base">Reçu de vente</h3>
              </div>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Date de vente :</span>
                <span className="font-medium text-slate-800">{formatDate(selectedSaleDetail.created_at)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Client :</span>
                <span className="font-medium text-slate-800">{selectedSaleDetail.customer_name || 'Client de passage'}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Règlement :</span>
                <span className="font-medium text-slate-800">{selectedSaleDetail.payment_method || 'Espèces'}</span>
              </div>
              {selectedSaleDetail.notes && (
                <div className="flex justify-between text-slate-500 pt-1">
                  <span>Note :</span>
                  <span className="font-medium text-slate-800 italic">{selectedSaleDetail.notes}</span>
                </div>
              )}
            </div>

            {/* Liste des articles du reçu */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-200">
                Articles achetés
              </div>
              {selectedSaleDetail.items && selectedSaleDetail.items.length > 0 ? (
                selectedSaleDetail.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-800">
                    <div>
                      <span className="font-semibold">{it.product_name}</span>
                      <span className="text-slate-400 ml-1.5">({it.quantity} x {formatCurrency(it.unit_price, currency)})</span>
                    </div>
                    <span className="font-bold">{formatCurrency(it.subtotal, currency)}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic">Détails des articles indisponibles</p>
              )}
            </div>

            {/* Totaux financiers */}
            <div className="space-y-1.5 text-xs pt-1">
              <div className="flex justify-between font-bold text-sm text-slate-900">
                <span>Total Facturé TTC :</span>
                <span>{formatCurrency(selectedSaleDetail.total_amount, currency)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Montant Versé :</span>
                <span>{formatCurrency(selectedSaleDetail.amount_paid, currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-600 pt-1 border-t border-slate-100">
                <span>Reste à payer :</span>
                <span>{formatCurrency(selectedSaleDetail.remaining_amount, currency)}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedSaleDetail(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Fermer le reçu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
