import React, { useState, useMemo } from 'react';
import { Product, Customer, Sale, SaleItem } from '../../types/database.types';
import { formatCurrency } from '../../lib/formatters';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  ShoppingCart,
  User,
  Package,
  CreditCard,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

interface CartItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  customers: Customer[];
  currency: string;
  onSubmitSale: (saleData: {
    customer_id?: string;
    customer_name?: string;
    total_amount: number;
    amount_paid: number;
    remaining_amount: number;
    payment_method: string;
    payment_status: 'paid' | 'partial' | 'unpaid';
    notes?: string;
    items: Omit<SaleItem, 'id' | 'sale_id'>[];
  }) => Promise<void>;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  products,
  customers,
  currency,
  onSubmitSale,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Espèces');
  const [notes, setNotes] = useState<string>('');
  const [isFullPayment, setIsFullPayment] = useState<boolean>(true);

  // Pour l'ajout d'article
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantityInput, setQuantityInput] = useState<string>('1');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Réinitialisation lors de l'ouverture
  React.useEffect(() => {
    if (isOpen) {
      setSelectedCustomerId('');
      setCart([]);
      setAmountPaidInput('');
      setPaymentMethod('Espèces');
      setNotes('');
      setIsFullPayment(true);
      setSelectedProductId('');
      setQuantityInput('1');
      setError(null);
    }
  }, [isOpen]);

  // Produits disponibles qui ont un stock > 0
  const availableProducts = useMemo(() => {
    return products.filter((p) => p.stock_quantity > 0);
  }, [products]);

  // Produit actuellement sélectionné pour l'ajout
  const currentSelectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Quantité maximale disponible pour le produit sélectionné
  const maxAvailableForSelected = useMemo(() => {
    if (!currentSelectedProduct) return 0;
    const inCart = cart.find((item) => item.product_id === currentSelectedProduct.id)?.quantity || 0;
    return currentSelectedProduct.stock_quantity - inCart;
  }, [currentSelectedProduct, cart]);

  // Calcul du total TTC
  const totalAmountTTC = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }, [cart]);

  // Gestion du montant payé
  const numericAmountPaid = useMemo(() => {
    if (isFullPayment) return totalAmountTTC;
    const parsed = parseFloat(amountPaidInput);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }, [isFullPayment, amountPaidInput, totalAmountTTC]);

  // Montant restant (dette)
  const remainingAmount = useMemo(() => {
    return Math.max(0, totalAmountTTC - numericAmountPaid);
  }, [totalAmountTTC, numericAmountPaid]);

  if (!isOpen) return null;

  // Ajouter un produit au panier
  const handleAddToCart = () => {
    setError(null);
    if (!selectedProductId || !currentSelectedProduct) {
      setError('Veuillez sélectionner un produit.');
      return;
    }

    const qty = parseInt(quantityInput, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('La quantité doit être supérieure à 0.');
      return;
    }

    const currentInCart = cart.find((i) => i.product_id === selectedProductId)?.quantity || 0;
    if (currentInCart + qty > currentSelectedProduct.stock_quantity) {
      setError(
        `Stock insuffisant pour « ${currentSelectedProduct.name} ». Stock réel disponible : ${currentSelectedProduct.stock_quantity} (déjà ${currentInCart} dans le panier).`
      );
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.product_id === selectedProductId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += qty;
        return updated;
      }
      return [
        ...prev,
        {
          product_id: selectedProductId,
          quantity: qty,
          unit_price: currentSelectedProduct.price,
        },
      ];
    });

    // Réinitialiser la sélection
    setSelectedProductId('');
    setQuantityInput('1');
  };

  // Modifier la quantité dans le panier
  const handleUpdateCartQuantity = (productId: string, newQty: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    if (newQty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }

    if (newQty > prod.stock_quantity) {
      setError(`Quantité max disponible pour ${prod.name} : ${prod.stock_quantity}`);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  // Retirer un produit du panier
  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  // Valider la vente
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (cart.length === 0) {
      setError('Veuillez ajouter au moins un produit dans la vente.');
      return;
    }

    // Si vente à crédit ou partielle, exiger un client
    if (remainingAmount > 0 && !selectedCustomerId) {
      setError(
        'Cette vente comporte un reste à payer. Vous devez obligatoirement sélectionner un client dans votre répertoire pour suivre la dette.'
      );
      return;
    }

    if (numericAmountPaid > totalAmountTTC) {
      setError('Le montant payé ne peut pas dépasser le total TTC de la vente.');
      return;
    }

    // Déterminer le statut de paiement
    let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'paid';
    if (numericAmountPaid === 0) {
      paymentStatus = 'unpaid';
    } else if (numericAmountPaid < totalAmountTTC) {
      paymentStatus = 'partial';
    }

    const customerObj = customers.find((c) => c.id === selectedCustomerId);

    const saleItems = cart.map((item) => {
      const prod = products.find((p) => p.id === item.product_id);
      return {
        product_id: item.product_id,
        product_name: prod?.name || 'Produit',
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
      };
    });

    try {
      setIsSubmitting(true);
      await onSubmitSale({
        customer_id: selectedCustomerId || undefined,
        customer_name: customerObj?.name || 'Client comptant',
        total_amount: totalAmountTTC,
        amount_paid: numericAmountPaid,
        remaining_amount: remainingAmount,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        notes: notes.trim() || undefined,
        items: saleItems,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l’enregistrement de la vente.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">
                Enregistrer une nouvelle vente
              </h2>
              <p className="text-xs text-slate-500">
                Sélectionnez le client, ajoutez les articles et validez le paiement.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm text-red-700 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Corps scrollable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 1. SÉLECTION DU CLIENT */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              Client associé
            </label>
            <div className="relative">
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all appearance-none cursor-pointer"
              >
                <option value="">Client de passage (Vente comptant)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {customers.length === 0 && (
              <p className="text-[11px] text-amber-700 mt-1">
                Aucun client dans votre carnet. Pour les ventes avec paiement différé ou crédit, ajoutez d'abord un client dans l'onglet Clients.
              </p>
            )}
          </div>

          {/* 2. AJOUT D'ARTICLES AU PANIER */}
          <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-600" />
              Ajouter des articles au panier
            </label>

            {availableProducts.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                Aucun produit avec du stock disponible. Veuillez approvisionner vos articles dans l'onglet Stock.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 appearance-none cursor-pointer"
                  >
                    <option value="">-- Choisir un produit en stock --</option>
                    {availableProducts.map((p) => {
                      const inCart = cart.find((i) => i.product_id === p.id)?.quantity || 0;
                      const remain = p.stock_quantity - inCart;
                      return (
                        <option key={p.id} value={p.id} disabled={remain <= 0}>
                          {p.name} - {formatCurrency(p.price, currency)} (Stock dispo: {remain})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="w-full sm:w-28 flex items-center">
                  <input
                    type="number"
                    min="1"
                    max={maxAvailableForSelected > 0 ? maxAvailableForSelected : 1}
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    placeholder="Qté"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 text-center focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!selectedProductId || maxAvailableForSelected <= 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>
              </div>
            )}

            {/* Tableau du Panier */}
            {cart.length > 0 ? (
              <div className="mt-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Article</th>
                      <th className="py-2.5 px-3">Prix U.</th>
                      <th className="py-2.5 px-3 text-center">Quantité</th>
                      <th className="py-2.5 px-3 text-right">Sous-total</th>
                      <th className="py-2.5 px-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item) => {
                      const prod = products.find((p) => p.id === item.product_id);
                      const subtotal = item.quantity * item.unit_price;
                      return (
                        <tr key={item.product_id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {prod?.name || 'Produit inconnu'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {formatCurrency(item.unit_price, currency)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQuantity(item.product_id, item.quantity - 1)}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                              >
                                -
                              </button>
                              <span className="font-bold text-slate-900 w-6 text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQuantity(item.product_id, item.quantity + 1)}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(subtotal, currency)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.product_id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                              title="Retirer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400 py-3 italic">
                Le panier est vide. Choisissez un produit ci-dessus pour composer la vente.
              </p>
            )}
          </div>

          {/* 3. CALCUL DU TOTAL TTC & RÈGLEMENT */}
          <div className="space-y-4 p-4 bg-slate-900 text-white rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">
                  Total de la vente
                </span>
                <span className="text-2xl font-black text-emerald-400 tracking-tight">
                  {formatCurrency(totalAmountTTC, currency)}
                </span>
              </div>
              <div className="text-right text-xs text-slate-400">
                <span>{cart.reduce((sum, i) => sum + i.quantity, 0)} article(s)</span>
              </div>
            </div>

            {/* Mode de règlement */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Type de paiement</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFullPayment(true)}
                    className={`flex-1 py-2 px-2.5 rounded-xl font-bold transition-all text-center ${
                      isFullPayment
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Payé en totalité
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullPayment(false);
                      setAmountPaidInput(String(Math.floor(totalAmountTTC / 2)));
                    }}
                    className={`flex-1 py-2 px-2.5 rounded-xl font-bold transition-all text-center ${
                      !isFullPayment
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Acompte / Crédit
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Moyen d'encaissement</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Mobile Money (Wave)">Mobile Money (Wave)</option>
                  <option value="Mobile Money (Orange)">Mobile Money (Orange)</option>
                  <option value="Mobile Money (MTN)">Mobile Money (MTN)</option>
                  <option value="Mobile Money (Moov)">Mobile Money (Moov)</option>
                  <option value="Virement Bancaire">Virement Bancaire</option>
                  <option value="Chèque">Chèque</option>
                </select>
              </div>
            </div>

            {/* Saisie montant personnalisé si partiel */}
            {!isFullPayment && (
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-medium">Montant encaissé aujourd'hui :</label>
                  <div className="relative w-36">
                    <input
                      type="number"
                      min="0"
                      max={totalAmountTTC}
                      step="any"
                      value={amountPaidInput}
                      onChange={(e) => setAmountPaidInput(e.target.value)}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-white font-bold text-right pr-12 focus:outline-hidden focus:border-emerald-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">
                      {currency}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 font-semibold">
                  <span className="text-amber-400">Reste à payer (Dette client) :</span>
                  <span className="text-amber-300 font-black text-sm">
                    {formatCurrency(remainingAmount, currency)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4. NOTES DE VENTE */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Note interne de vente <span className="text-slate-400">(optionnelle)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Livraison prévue demain, payé par le frère..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* BOUTONS D'ACTION */}
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
              disabled={isSubmitting || cart.length === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Validation...' : 'Valider & Déduire le stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
