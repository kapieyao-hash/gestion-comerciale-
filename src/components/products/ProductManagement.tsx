import React, { useState, useMemo } from 'react';
import { Product } from '../../types/database.types';
import { ProductFormModal } from './ProductFormModal';
import { EmailSettingsModal } from '../settings/EmailSettingsModal';
import { getEmailSettings } from '../../lib/emailService';
import { EmptyState } from '../layout/EmptyState';
import { formatCurrency } from '../../lib/formatters';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Filter
} from 'lucide-react';

interface ProductManagementProps {
  products: Product[];
  onAddProduct: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateProduct: (id: string, data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  currency?: string;
  onNotification?: (msg: string) => void;
}

export const ProductManagement: React.FC<ProductManagementProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  currency = 'FCFA',
  onNotification,
}) => {
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Suppression dialog state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Recherche & Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Statistiques calculées directement à partir des données réelles (sans fausses données)
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalItemsInStock = products.reduce((acc, p) => acc + p.stock_quantity, 0);
    const totalStockValue = products.reduce((acc, p) => acc + (p.price * p.stock_quantity), 0);
    
    // Alerte stock faible : quantité > 0 mais <= au seuil d'alerte configuré (par défaut 5)
    const lowStockCount = products.filter((p) => {
      const threshold = p.min_stock_alert !== undefined ? p.min_stock_alert : 5;
      return p.stock_quantity > 0 && p.stock_quantity <= threshold;
    }).length;

    const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;

    return {
      totalProducts,
      totalItemsInStock,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  // Filtrage des produits
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      const threshold = product.min_stock_alert !== undefined ? product.min_stock_alert : 5;

      if (stockFilter === 'low') {
        return product.stock_quantity > 0 && product.stock_quantity <= threshold;
      }
      if (stockFilter === 'out') {
        return product.stock_quantity === 0;
      }
      return true;
    });
  }, [products, searchQuery, stockFilter]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, data);
    } else {
      await onAddProduct(data);
    }
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteProduct(productToDelete.id);
      setProductToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Package className="w-7 h-7 text-emerald-600" />
            Gestion des Stocks & Produits
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Ajoutez vos articles, fixez vos prix et suivez l'état exact de votre stock en temps réel.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Produit</span>
          </button>
        </div>
      </div>

      {/* Cartes d'indicateurs réels (Calculés strictement sur les articles réels enregistrés) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Package className="w-4 h-4 text-emerald-600" />
            Références
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalProducts}</div>
          <div className="text-xs text-slate-400 mt-1">produits distincts</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Boxes className="w-4 h-4 text-blue-600" />
            Total Unités
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalItemsInStock}</div>
          <div className="text-xs text-slate-400 mt-1">articles en rayon</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            Valeur du Stock
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatCurrency(stats.totalStockValue, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-1">potentiel de vente</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Stock Faible / Épuisé
          </div>
          <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1.5">
            <span className={stats.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}>
              {stats.lowStockCount}
            </span>
            <span className="text-xs font-normal text-slate-400">/</span>
            <span className={stats.outOfStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}>
              {stats.outOfStockCount}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {stats.outOfStockCount > 0 ? `${stats.outOfStockCount} en rupture totale` : 'aucun article en rupture'}
          </div>
        </div>
      </div>

      {/* Barre d'outils : Recherche et Filtres */}
      {products.length > 0 && (
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom de produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                stockFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({products.length})
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                stockFilter === 'low'
                  ? 'bg-amber-100 text-amber-950 border border-amber-400'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Sous le seuil {stats.lowStockCount > 0 && `(${stats.lowStockCount})`}</span>
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                stockFilter === 'out'
                  ? 'bg-rose-100 text-rose-900 border border-rose-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Rupture (0) {stats.outOfStockCount > 0 && `(${stats.outOfStockCount})`}
            </button>
          </div>
        </div>
      )}

      {/* Affichage des données réelles ou de l'état vide strict */}
      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucun produit dans votre stock"
          description="Votre inventaire est vide pour le moment. Enregistrez votre premier produit avec son prix unitaire et sa quantité pour commencer à suivre vos stocks et réaliser des ventes."
          actionLabel="Ajouter mon premier produit"
          onAction={handleOpenAdd}
        />
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
          <p className="text-slate-600 text-sm font-medium">
            Aucun produit ne correspond à votre recherche ou filtre actuel.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStockFilter('all');
            }}
            className="mt-3 text-xs font-semibold text-emerald-600 hover:underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        /* Tableau / Cartes des produits */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Table pour Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Nom du Produit</th>
                  <th className="py-3.5 px-6">Prix Unitaire</th>
                  <th className="py-3.5 px-6">Quantité en Stock</th>
                  <th className="py-3.5 px-6">Valeur Stock</th>
                  <th className="py-3.5 px-6">Statut</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProducts.map((product) => {
                  const threshold = product.min_stock_alert !== undefined ? product.min_stock_alert : 5;
                  const isOutOfStock = product.stock_quantity === 0;
                  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= threshold;
                  const itemStockValue = product.price * product.stock_quantity;

                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors ${
                        isLowStock
                          ? 'bg-amber-50/50 hover:bg-amber-50/80 border-l-4 border-l-amber-500'
                          : isOutOfStock
                          ? 'bg-rose-50/30 hover:bg-rose-50/60 border-l-4 border-l-rose-500'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{product.name}</span>
                          {isLowStock && (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md"
                              title={`Stock actuel (${product.stock_quantity}) inférieur ou égal au seuil configuré (${threshold})`}
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Alerte &le; {threshold}
                            </span>
                          )}
                        </div>
                        {product.description && (
                          <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {product.description}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        {formatCurrency(product.price, currency)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`font-black text-base ${
                              isOutOfStock
                                ? 'text-rose-600'
                                : isLowStock
                                ? 'text-amber-700'
                                : 'text-slate-900'
                            }`}
                          >
                            {product.stock_quantity}
                          </span>
                          <span className="text-xs text-slate-400">unités</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Seuil: {threshold}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-700 font-medium">
                        {formatCurrency(itemStockValue, currency)}
                      </td>
                      <td className="py-4 px-6">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                            Rupture
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-400 shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            Stock critique ({product.stock_quantity}/{threshold})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Disponible
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="p-2 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Modifier le produit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(product)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Supprimer le produit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Affichage Mobile : Cartes tactiles adaptées aux petits écrans */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredProducts.map((product) => {
              const threshold = product.min_stock_alert !== undefined ? product.min_stock_alert : 5;
              const isOutOfStock = product.stock_quantity === 0;
              const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= threshold;
              const itemStockValue = product.price * product.stock_quantity;

              return (
                <div
                  key={product.id}
                  className={`p-4 space-y-3 transition-colors ${
                    isLowStock
                      ? 'bg-amber-50/40 border-l-4 border-l-amber-500'
                      : isOutOfStock
                      ? 'bg-rose-50/20 border-l-4 border-l-rose-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center flex-wrap gap-1.5">
                        <h4 className="font-bold text-slate-900 text-base">{product.name}</h4>
                        {isLowStock && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Alerte &le; {threshold}
                          </span>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                    {isOutOfStock ? (
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Rupture
                      </span>
                    ) : isLowStock ? (
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-400">
                        Stock critique
                      </span>
                    ) : (
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        En stock
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Prix unitaire</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {formatCurrency(product.price, currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Quantité disponible</span>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`font-black text-sm ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {product.stock_quantity}
                        </span>
                        <span className="text-[11px] text-slate-500">unités</span>
                        <span className="text-[10px] text-slate-400 ml-auto">
                          (Seuil : {threshold})
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
                      <span>Valeur du stock :</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(itemStockValue, currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleOpenEdit(product)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                    <button
                      onClick={() => setProductToDelete(product)}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal d'ajout / modification */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        productToEdit={editingProduct}
        currency={currency}
      />

      {/* Modal de confirmation de suppression */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                Supprimer « {productToDelete.name} » ?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Cette action est irréversible. L'article sera définitivement retiré de votre gestion de stock.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de configuration EmailJS */}
      <EmailSettingsModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        currency={currency}
        onSavedNotification={onNotification}
      />
    </div>
  );
};
