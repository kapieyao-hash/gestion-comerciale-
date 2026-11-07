import React, { useEffect, useMemo, useState } from 'react';
import { Product, Customer, Sale } from '../../types/database.types';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { exportSalesToCsv, exportDebtsSummaryToCsv } from '../../lib/exportCsv';
import { EmptyState } from '../layout/EmptyState';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  TrendingUp,
  CreditCard,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  Award,
  ArrowUpRight,
  Clock,
  Layers,
  Sparkles,
  BarChart3,
  Download
} from 'lucide-react';

interface DashboardProps {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  currency?: string;
  onNavigateTab: (tab: 'products' | 'customers' | 'sales' | 'payments') => void;
  onOpenNewSale?: () => void;
}

type DashboardStatsRow = {
  ventes_du_jour: number;
  total_ventes_du_jour: number;
  encaisse_du_jour: number;
  total_dettes: number;
  produits_en_rupture: number;
};

const EMPTY_DASHBOARD_STATS: DashboardStatsRow = {
  ventes_du_jour: 0,
  total_ventes_du_jour: 0,
  encaisse_du_jour: 0,
  total_dettes: 0,
  produits_en_rupture: 0,
};

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  customers,
  sales,
  currency = 'FCFA',
  onNavigateTab,
  onOpenNewSale,
}) => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStatsRow>(EMPTY_DASHBOARD_STATS);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const loadDashboardStats = async () => {
      const { data } = await supabase.from('dashboard_stats').select('*').single();
      if (!data) return;

      setDashboardStats({
        ventes_du_jour: Number(data.ventes_du_jour) || 0,
        total_ventes_du_jour: Number(data.total_ventes_du_jour) || 0,
        encaisse_du_jour: Number(data.encaisse_du_jour) || 0,
        total_dettes: Number(data.total_dettes) || 0,
        produits_en_rupture: Number(data.produits_en_rupture) || 0,
      });
    };

    loadDashboardStats();
  }, []);

  // Calculs stricts basés sur les données réelles (AUCUNE DONNÉE FICTIVE)
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Chiffre d'affaires total TTC
    const totalRevenueTTC = sales.reduce((sum, s) => sum + s.total_amount, 0);

    // 2. Total encaissé & Dettes en cours
    const totalCollected = sales.reduce((sum, s) => sum + s.amount_paid, 0);
    const totalDebts = sales.reduce((sum, s) => sum + s.remaining_amount, 0);

    // 3. Ventes ce mois-ci
    const salesThisMonth = sales.filter((s) => {
      if (!s.created_at) return false;
      const d = new Date(s.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const countSalesThisMonth = salesThisMonth.length;
    const revenueThisMonth = salesThisMonth.reduce((sum, s) => sum + s.total_amount, 0);

    // 4. Produits les plus vendus (calculé en agrégeant les sale_items réels)
    const productSalesMap: {
      [productId: string]: {
        name: string;
        quantitySold: number;
        totalRevenue: number;
        currentStock: number;
      };
    } = {};

    sales.forEach((sale) => {
      sale.items?.forEach((item) => {
        if (!productSalesMap[item.product_id]) {
          const matchedProd = products.find((p) => p.id === item.product_id);
          productSalesMap[item.product_id] = {
            name: item.product_name || matchedProd?.name || 'Produit',
            quantitySold: 0,
            totalRevenue: 0,
            currentStock: matchedProd ? matchedProd.stock_quantity : 0,
          };
        }
        productSalesMap[item.product_id].quantitySold += item.quantity;
        productSalesMap[item.product_id].totalRevenue += item.subtotal;
      });
    });

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5);

    // 5. Alertes de stock
    const lowStockProducts = products.filter((p) => {
      const threshold = p.min_stock_alert !== undefined ? p.min_stock_alert : 5;
      return p.stock_quantity > 0 && p.stock_quantity <= threshold;
    });

    const outOfStockProducts = products.filter((p) => p.stock_quantity === 0);

    // 6. Dernières ventes récentes
    const recentSales = [...sales].slice(0, 5);

    return {
      totalRevenueTTC,
      totalCollected,
      totalDebts,
      countSalesThisMonth,
      revenueThisMonth,
      topSellingProducts,
      lowStockProducts,
      outOfStockProducts,
      recentSales,
      currentMonthName: now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    };
  }, [sales, products]);

  // Si tout est vierge au tout début (commerçant qui vient d'ouvrir son application)
  const isBrandNew = products.length === 0 && sales.length === 0 && customers.length === 0;

  return (
    <div className="space-y-6">
      {/* En-tête du Tableau de Bord */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-emerald-600" />
            Tableau de Bord & Statistiques
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Vue d'ensemble de votre activité, de vos ventes et de votre trésorerie.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sales.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => exportSalesToCsv(sales, currency)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-semibold text-xs shadow-2xs transition-all cursor-pointer"
                title="Exporter toutes les ventes en CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Ventes (CSV)</span>
              </button>

              {stats.totalDebts > 0 && (
                <button
                  onClick={() => exportDebtsSummaryToCsv(sales, customers, currency)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 font-semibold text-xs shadow-2xs transition-all cursor-pointer"
                  title="Exporter le résumé des dettes en CSV"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  <span>Dettes (CSV)</span>
                </button>
              )}
            </div>
          )}

          {onOpenNewSale && (
            <button
              onClick={onOpenNewSale}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Nouvelle Vente</span>
            </button>
          )}
        </div>
      </div>

      {/* Cartes Clés Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              Ventes du jour
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {dashboardStats.ventes_du_jour}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Chiffre d'affaires du jour
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {formatCurrency(dashboardStats.total_ventes_du_jour, 'FCFA')}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Argent encaissé aujourd'hui
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {formatCurrency(dashboardStats.encaisse_du_jour, 'FCFA')}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              Total des dettes clients
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {formatCurrency(dashboardStats.total_dettes, 'FCFA')}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Produits en rupture
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {dashboardStats.produits_en_rupture}
          </div>
        </div>
      </div>

      {/* État vide si aucune donnée réelle n'a encore été enregistrée */}
      {isBrandNew ? (
        <EmptyState
          icon={Sparkles}
          title="Bienvenue dans BoutikPro"
          description="Votre espace est prêt. Commencez par enregistrer vos articles dans l'onglet Stock, puis réalisez vos premières ventes."
          actionLabel="Ajouter des produits au stock"
          onAction={() => onNavigateTab('products')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLONNE GAUCHE : LES PRODUITS LES PLUS VENDUS (Top Sellers) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Produits les plus vendus
                  </h2>
                  <p className="text-xs text-slate-400">
                    Classement par quantité cumulée vendue.
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('products')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Voir le stock</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {stats.topSellingProducts.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Vos produits les plus vendus apparaîtront ici dès vos premières ventes enregistrées.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.topSellingProducts.map((item, index) => {
                  const maxQty = stats.topSellingProducts[0]?.quantitySold || 1;
                  const percent = Math.min(100, Math.round((item.quantitySold / maxQty) * 100));

                  return (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 space-y-2 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                              index === 0
                                ? 'bg-amber-400 text-amber-950 shadow-2xs'
                                : index === 1
                                ? 'bg-slate-300 text-slate-800'
                                : index === 2
                                ? 'bg-amber-700/20 text-amber-900'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-slate-900 text-sm">
                            {item.quantitySold} vendus
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            Total : {formatCurrency(item.totalRevenue, currency)}
                          </span>
                        </div>
                      </div>

                      {/* Barre visuelle de proportion */}
                      <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* COLONNE DROITE : DERNIÈRES VENTES RÉELLES & ACTIONS RAPIDES */}
          <div className="space-y-6">
            {/* Dernières transactions */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Dernières Ventes
                    </h2>
                    <p className="text-xs text-slate-400">
                      Transactions récentes.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab('sales')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <span>Tout voir</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {stats.recentSales.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Aucune vente enregistrée.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {stats.recentSales.map((sale) => (
                    <div key={sale.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {sale.customer_name || 'Client comptant'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(sale.created_at)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 block">
                          {formatCurrency(sale.total_amount, currency)}
                        </span>
                        {sale.remaining_amount > 0 ? (
                          <span className="text-[10px] text-amber-600 font-semibold">
                            Reste {formatCurrency(sale.remaining_amount, currency)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            Payé
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Raccourcis rapides */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-xs space-y-3">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block">
                Navigation Rapide
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <button
                  onClick={() => onNavigateTab('products')}
                  className="p-3 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl flex items-center gap-2 transition-colors text-left"
                >
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span>Gestion Stock</span>
                </button>
                <button
                  onClick={() => onNavigateTab('customers')}
                  className="p-3 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl flex items-center gap-2 transition-colors text-left"
                >
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Carnet Clients</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
