import React, { useState } from 'react';
import { Product } from '../../types/database.types';
import { X, AlertCircle } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  productToEdit?: Product | null;
  currency: string;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  productToEdit,
  currency,
}) => {
  const isEditing = Boolean(productToEdit);

  const [name, setName] = useState(productToEdit?.name || '');
  const [description, setDescription] = useState(productToEdit?.description || '');
  const [price, setPrice] = useState<string>(
    productToEdit ? String(productToEdit.price) : ''
  );
  const [stockQuantity, setStockQuantity] = useState<string>(
    productToEdit ? String(productToEdit.stock_quantity) : ''
  );
  const [minStockAlert, setMinStockAlert] = useState<string>(
    productToEdit && productToEdit.min_stock_alert !== undefined
      ? String(productToEdit.min_stock_alert)
      : '5'
  );

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchroniser lors du changement de produit édité
  React.useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setDescription(productToEdit.description || '');
      setPrice(String(productToEdit.price));
      setStockQuantity(String(productToEdit.stock_quantity));
      setMinStockAlert(
        productToEdit.min_stock_alert !== undefined
          ? String(productToEdit.min_stock_alert)
          : '5'
      );
    } else {
      setName('');
      setDescription('');
      setPrice('');
      setStockQuantity('');
      setMinStockAlert('5');
    }
    setError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Veuillez renseigner le nom du produit.');
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setError('Le prix unitaire doit être un nombre supérieur ou égal à 0.');
      return;
    }

    const numericStock = parseInt(stockQuantity, 10);
    if (isNaN(numericStock) || numericStock < 0) {
      setError('La quantité en stock doit être un entier supérieur ou égal à 0.');
      return;
    }

    const numericAlert = parseInt(minStockAlert, 10);
    if (isNaN(numericAlert) || numericAlert < 0) {
      setError('Le seuil d’alerte doit être un entier supérieur ou égal à 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        name: trimmedName,
        description: description.trim() || undefined,
        price: numericPrice,
        stock_quantity: numericStock,
        min_stock_alert: numericAlert,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue lors de l’enregistrement.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEditing ? 'Modifier le produit' : 'Ajouter un produit'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Remplissez les informations réelles pour la gestion de votre inventaire.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom du produit <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Savon noir 200g, Robe fleurie M, Huile 1L..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 text-sm transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prix unitaire ({currency}) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  required
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 text-sm font-semibold transition-all pr-14"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  {currency}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Quantité en stock <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                required
                placeholder="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 text-sm font-semibold transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span>Seuil d'alerte</span>
                <span className="text-[11px] text-amber-600 font-medium">Alerte orange</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                required
                placeholder="5"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 text-sm font-semibold transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description <span className="text-xs text-slate-400">(optionnelle)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Détails supplémentaires, couleur, taille, fournisseur..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 text-sm transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Enregistrement...</span>
              ) : isEditing ? (
                <span>Mettre à jour</span>
              ) : (
                <span>Ajouter au stock</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
