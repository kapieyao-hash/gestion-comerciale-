import emailjs from '@emailjs/browser';
import { Product } from '../types/database.types';

export interface EmailSettings {
  serviceId: string;
  templateId: string;
  publicKey: string;
  managerEmail: string;
  enabled: boolean;
}

const EMAIL_SETTINGS_STORAGE_KEY = 'commercial_app_email_settings_v1';
const SENT_ALERTS_STORAGE_KEY = 'commercial_app_sent_stock_alerts_v1';

// Configuration par défaut ou récupération locale
export function getEmailSettings(): EmailSettings {
  try {
    const saved = localStorage.getItem(EMAIL_SETTINGS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Erreur lecture configuration EmailJS:', e);
  }

  // Vérifier si des variables d'environnement Vite existent
  const envServiceId = (import.meta as any).env?.VITE_EMAILJS_SERVICE_ID || '';
  const envTemplateId = (import.meta as any).env?.VITE_EMAILJS_TEMPLATE_ID || '';
  const envPublicKey = (import.meta as any).env?.VITE_EMAILJS_PUBLIC_KEY || '';
  const envManagerEmail = (import.meta as any).env?.VITE_MANAGER_EMAIL || '';

  return {
    serviceId: envServiceId,
    templateId: envTemplateId,
    publicKey: envPublicKey,
    managerEmail: envManagerEmail,
    enabled: Boolean(envServiceId && envTemplateId && envPublicKey && envManagerEmail),
  };
}

export function saveEmailSettings(settings: EmailSettings): void {
  try {
    localStorage.setItem(EMAIL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Erreur sauvegarde configuration EmailJS:', e);
  }
}

/**
 * Envoie une notification par email au gérant pour un produit ayant atteint ou franchi son seuil critique
 */
export async function sendLowStockEmailAlert(
  product: Product,
  currentStock: number,
  threshold: number,
  currency = 'FCFA'
): Promise<{ success: boolean; message: string }> {
  const settings = getEmailSettings();

  if (!settings.enabled) {
    return {
      success: false,
      message: "Les notifications par e-mail ne sont pas activées ou l'adresse du gérant n'est pas renseignée.",
    };
  }

  if (!settings.serviceId || !settings.templateId || !settings.publicKey || !settings.managerEmail) {
    return {
      success: false,
      message: 'Paramètres EmailJS incomplets (Service ID, Template ID, Clé Publique ou E-mail du gérant manquant).',
    };
  }

  const isOutOfStock = currentStock === 0;
  const alertSubject = isOutOfStock
    ? `🚨 RUPTURE DE STOCK CRITIQUE : ${product.name}`
    : `⚠️ ALERTE SEUIL DE STOCK : ${product.name} (${currentStock} restants)`;

  const templateParams = {
    to_email: settings.managerEmail,
    manager_email: settings.managerEmail,
    product_name: product.name,
    product_price: `${product.price} ${currency}`,
    current_stock: currentStock,
    stock_threshold: threshold,
    stock_status: isOutOfStock ? 'RUPTURE TOTALE (0 en stock)' : 'STOCK CRITIQUE (Inférieur ou égal au seuil)',
    alert_subject: alertSubject,
    date: new Date().toLocaleString('fr-FR'),
  };

  try {
    await emailjs.send(
      settings.serviceId,
      settings.templateId,
      templateParams,
      settings.publicKey
    );

    // Mémoriser que l'alerte a été envoyée pour éviter le spam lors de chaque consultation
    recordSentAlert(product.id, currentStock);

    return {
      success: true,
      message: `Alerte e-mail envoyée avec succès à ${settings.managerEmail} pour « ${product.name} ».`,
    };
  } catch (error: any) {
    console.error("Erreur lors de l'envoi de l'e-mail d'alerte stock:", error);
    const errorText = error?.text || error?.message || 'Erreur inconnue EmailJS';
    return {
      success: false,
      message: `Échec de l'envoi de l'e-mail : ${errorText}`,
    };
  }
}

/**
 * Enregistre l'état des alertes envoyées
 */
function recordSentAlert(productId: string, stock: number): void {
  try {
    const raw = localStorage.getItem(SENT_ALERTS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[productId] = {
      stock,
      timestamp: Date.now(),
    };
    localStorage.setItem(SENT_ALERTS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignorer
  }
}

/**
 * Teste la configuration EmailJS avec un e-mail de démonstration
 */
export async function testEmailConfiguration(
  settings: EmailSettings,
  currency = 'FCFA'
): Promise<{ success: boolean; message: string }> {
  if (!settings.serviceId || !settings.templateId || !settings.publicKey || !settings.managerEmail) {
    return {
      success: false,
      message: 'Veuillez remplir tous les champs EmailJS (Service ID, Template ID, Public Key, E-mail du gérant).',
    };
  }

  const templateParams = {
    to_email: settings.managerEmail,
    manager_email: settings.managerEmail,
    product_name: 'Exemple : Produit Test',
    product_price: `5000 ${currency}`,
    current_stock: 2,
    stock_threshold: 5,
    stock_status: 'TEST DE CONFIGURATION DU SYSTÈME D’ALERTE',
    alert_subject: '🔔 Test réussi des notifications de stock critique - Gestion Commerciale',
    date: new Date().toLocaleString('fr-FR'),
  };

  try {
    await emailjs.send(
      settings.serviceId,
      settings.templateId,
      templateParams,
      settings.publicKey
    );

    return {
      success: true,
      message: `E-mail de test envoyé avec succès à ${settings.managerEmail} ! Vérifiez votre boîte de réception.`,
    };
  } catch (error: any) {
    console.error('Erreur test EmailJS:', error);
    const errDetail = error?.text || error?.message || JSON.stringify(error);
    return {
      success: false,
      message: `Erreur EmailJS : ${errDetail}`,
    };
  }
}
