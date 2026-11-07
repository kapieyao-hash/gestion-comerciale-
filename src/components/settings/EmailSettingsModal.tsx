import React, { useState, useEffect } from 'react';
import {
  EmailSettings,
  getEmailSettings,
  saveEmailSettings,
  testEmailConfiguration
} from '../../lib/emailService';
import {
  X,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Send,
  BellRing
} from 'lucide-react';

interface EmailSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
  onSavedNotification?: (msg: string) => void;
}

export const EmailSettingsModal: React.FC<EmailSettingsModalProps> = ({
  isOpen,
  onClose,
  currency = 'FCFA',
  onSavedNotification,
}) => {
  const [settings, setSettings] = useState<EmailSettings>({
    serviceId: '',
    templateId: '',
    publicKey: '',
    managerEmail: '',
    enabled: true,
  });

  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = getEmailSettings();
      setSettings(current);
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveEmailSettings(settings);
    if (onSavedNotification) {
      onSavedNotification('Paramètres de notification par e-mail enregistrés avec succès.');
    }
    onClose();
  };

  const handleTest = async () => {
    setStatusMessage(null);
    setIsTesting(true);
    const result = await testEmailConfiguration(settings, currency);
    setIsTesting(false);

    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message });
      // Sauvegarder automatiquement si le test a réussi
      saveEmailSettings(settings);
    } else {
      setStatusMessage({ type: 'error', text: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Alertes de Stock par E-mail (EmailJS)
              </h2>
              <p className="text-xs text-slate-500">
                Avertit automatiquement le gérant lorsqu'un produit franchit son seuil critique.
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

        {/* Message d'état */}
        {statusMessage && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl border flex items-start gap-2.5 text-xs sm:text-sm shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Formulaire scrollable */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
          {/* Activation switch */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-0.5">
              <label htmlFor="enable_email" className="font-bold text-slate-900 cursor-pointer">
                Activer les notifications automatiques
              </label>
              <p className="text-[11px] text-slate-500">
                Déclenche un e-mail au gérant dès qu'une vente réduit le stock au seuil minimal.
              </p>
            </div>
            <input
              type="checkbox"
              id="enable_email"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="w-5 h-5 rounded-md accent-emerald-600 cursor-pointer"
            />
          </div>

          {/* Email du gérant */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Adresse e-mail du gérant <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="gerant@entreprise.com"
                value={settings.managerEmail}
                onChange={(e) => setSettings({ ...settings, managerEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Cette boîte recevra l'e-mail d'alerte avec le nom du produit, la quantité restante et le seuil fixé.
            </p>
          </div>

          {/* Paramètres EmailJS */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Identifiants EmailJS
              </span>
              <a
                href="https://www.emailjs.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Créer un compte gratuit</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Service ID EmailJS
              </label>
              <input
                type="text"
                placeholder="Ex: service_xxxxx"
                value={settings.serviceId}
                onChange={(e) => setSettings({ ...settings, serviceId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Template ID EmailJS
              </label>
              <input
                type="text"
                placeholder="Ex: template_xxxxx"
                value={settings.templateId}
                onChange={(e) => setSettings({ ...settings, templateId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Clé Publique (Public Key / User ID)
              </label>
              <input
                type="text"
                placeholder="Ex: xxxxxxxxxxxxxxxxxx"
                value={settings.publicKey}
                onChange={(e) => setSettings({ ...settings, publicKey: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-blue-600"
              />
            </div>

            {/* Note explicative template */}
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 space-y-1">
              <span className="font-bold block flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                Variables transmises dans le modèle EmailJS :
              </span>
              <p className="font-mono text-[10px] text-blue-800">
                {`{{product_name}}`}, {`{{current_stock}}`}, {`{{stock_threshold}}`}, {`{{stock_status}}`}, {`{{alert_subject}}`}, {`{{date}}`}, {`{{manager_email}}`}
              </p>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !settings.managerEmail || !settings.serviceId || !settings.templateId || !settings.publicKey}
              className="px-3.5 py-2.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Envoi du test...' : 'Envoyer un e-mail test'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
