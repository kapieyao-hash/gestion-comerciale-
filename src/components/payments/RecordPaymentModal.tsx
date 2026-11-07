import React, { useState } from 'react';
import { Sale } from '../../types/database.types';
import { formatCurrency } from '../../lib/formatters';
import { X, AlertCircle, CreditCard, CheckCircle2 } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  currency: string;
  onSubmitPayment: (
    saleId: string,
    amount: number,
    paymentMethod: string,
    notes?: string
  ) => Promise<void>;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  sale,
  currency,
  onSubmitPayment,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Espèces');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (sale) {
      // Proposer par défaut de solder le reste ou laisser libre
      setAmount(String(sale.remaining_amount));
      setPaymentMethod('Espèces');
      setNotes('');
      setError(null);
    }
  }, [sale, isOpen]);

  if (!isOpen || !sale) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Veuillez saisir un montant supérieur à 0.');
      return;
    }

    if (numericAmount > sale.remaining_amount) {
      setError(
        `Le montant saisi (${numericAmount} ${currency}) ne peut pas dépasser le reste dû (${sale.remaining_amount} ${currency}).`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmitPayment(sale.id, numericAmount, paymentMethod, notes.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l’enregistrement de l’encaissement.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const newRemaining = Math.max(0, sale.remaining_amount - parsedAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Encaisser un paiement
              </h3>
              <p className="text-xs text-slate-500">
                {sale.customer_name || 'Client comptant'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Récapitulatif dette */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between text-slate-500">
              <span>Montant initial de la vente :</span>
              <span className="font-medium text-slate-800">{formatCurrency(sale.total_amount, currency)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Déjà payé :</span>
              <span className="font-medium text-emerald-700">{formatCurrency(sale.amount_paid, currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-amber-700 pt-1 border-t border-slate-200">
              <span>Reste actuellement dû :</span>
              <span className="text-sm font-black">{formatCurrency(sale.remaining_amount, currency)}</span>
            </div>
          </div>

          {/* Saisie montant encaissé */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Montant versé aujourd'hui ({currency}) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="1"
                max={sale.remaining_amount}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Montant du versement"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 pr-14"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                {currency}
              </span>
            </div>

            {/* Raccourci solde complet */}
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => setAmount(String(sale.remaining_amount))}
                className="text-emerald-700 font-semibold hover:underline cursor-pointer"
              >
                Payer la totalité ({formatCurrency(sale.remaining_amount, currency)})
              </button>
              <span className="text-slate-400">
                Nouveau reste dû : <strong className="text-slate-700">{formatCurrency(newRemaining, currency)}</strong>
              </span>
            </div>
          </div>

          {/* Moyen de règlement */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Mode de paiement
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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

          {/* Note optionnelle */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Note sur le versement <span className="text-slate-400">(optionnelle)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Acompte n°2, remis en main propre..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Valider l’encaissement'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
