import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/dashboard/Dashboard';
import { ProductManagement } from './components/products/ProductManagement';
import { CustomerManagement } from './components/customers/CustomerManagement';
import { SalesManagement } from './components/sales/SalesManagement';
import { PaymentHistory } from './components/payments/PaymentHistory';
import { Product, Customer, Sale, Payment } from './types/database.types';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { LoginScreen } from './components/auth/LoginScreen';
import { SignupScreen } from './components/auth/SignupScreen';
import { Store, Info, Package, Users, ShoppingCart, LayoutDashboard, History, LogOut } from 'lucide-react';

const PRODUCTS_STORAGE_KEY = 'commercial_app_products_v1';
const CUSTOMERS_STORAGE_KEY = 'commercial_app_customers_v1';
const SALES_STORAGE_KEY = 'commercial_app_sales_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'customers' | 'sales' | 'payments'>('dashboard');

  // 1. Produits réels (initialement vide, SANS AUCUNE DONNÉE FICTIVE)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignorer
    }
    return [];
  });

  // 2. Clients réels (initialement vide, SANS AUCUNE DONNÉE FICTIVE)
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignorer
    }
    return [];
  });

  // 3. Ventes réelles (initialement vide, SANS AUCUNE DONNÉE FICTIVE)
  const [sales, setSales] = useState<Sale[]>(() => {
    try {
      const saved = localStorage.getItem(SALES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignorer
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [currency] = useState('FCFA');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  // Sauvegardes locales automatiques
  useEffect(() => {
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      console.error('Erreur sauvegarde locale produits:', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
    } catch (e) {
      console.error('Erreur sauvegarde locale clients:', e);
    }
  }, [customers]);

  useEffect(() => {
    try {
      localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales));
    } catch (e) {
      console.error('Erreur sauvegarde locale ventes:', e);
    }
  }, [sales]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Chargement depuis Supabase si configuré et connecté
  useEffect(() => {
    if (!isSupabaseConfigured || !session) return;

    const fetchSupabaseData = async () => {
      try {
        setIsLoading(true);
        const [prodRes, custRes, salesRes] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('customers').select('*'),
          supabase.from('sales').select('*, items:sale_items(*)').order('created_at', { ascending: false }),
        ]);

        if (prodRes.data) setProducts(prodRes.data);
        if (custRes.data) setCustomers(custRes.data);
        if (salesRes.data) setSales(salesRes.data);
      } catch (err) {
        console.warn('Erreur connexion Supabase:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSupabaseData();
  }, [session]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- GESTION DES PRODUITS ---
  const handleAddProduct = async (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'prod_' + Date.now();

    const newProduct: Product = {
      id: newId,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data: inserted, error } = await supabase
        .from('products')
        .insert([{
          name: data.name,
          price: data.price,
          stock_quantity: data.stock_quantity,
          description: data.description,
          min_stock_alert: data.min_stock_alert,
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (inserted) newProduct.id = inserted.id;
    }

    setProducts((prev) => [newProduct, ...prev]);
    showNotification(`Le produit « ${newProduct.name} » a été ajouté au stock.`);
  };

  const handleUpdateProduct = async (id: string, data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('products')
        .update({
          name: data.name,
          price: data.price,
          stock_quantity: data.stock_quantity,
          description: data.description,
          min_stock_alert: data.min_stock_alert,
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p))
    );
    showNotification(`Le produit a été mis à jour avec succès.`);
  };

  const handleDeleteProduct = async (id: string) => {
    const target = products.find((p) => p.id === id);

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
    showNotification(`Le produit ${target ? `« ${target.name} »` : ''} a été supprimé.`);
  };

  // --- GESTION DES CLIENTS ---
  const handleAddCustomer = async (data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'cust_' + Date.now();

    const newCustomer: Customer = {
      id: newId,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data: inserted, error } = await supabase
        .from('customers')
        .insert([{
          name: data.name,
          phone: data.phone,
          address: data.address,
          notes: data.notes,
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (inserted) newCustomer.id = inserted.id;
    }

    setCustomers((prev) => [newCustomer, ...prev]);
    showNotification(`Le client « ${newCustomer.name} » a été enregistré.`);
  };

  const handleUpdateCustomer = async (id: string, data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('customers')
        .update({
          name: data.name,
          phone: data.phone,
          address: data.address,
          notes: data.notes,
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
    }

    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c))
    );
    showNotification(`Les coordonnées de « ${data.name} » ont été mises à jour.`);
  };

  const handleDeleteCustomer = async (id: string) => {
    const target = customers.find((c) => c.id === id);

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    }

    setCustomers((prev) => prev.filter((c) => c.id !== id));
    showNotification(`Le client ${target ? `« ${target.name} »` : ''} a été supprimé.`);
  };

  // --- GESTION DES VENTES (Multi-produits) ---
  const handleAddSale = async (saleData: {
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
  }) => {
    // 1. Vérification stricte des stocks disponibles pour chaque article
    for (const item of saleData.items) {
      const prod = products.find((p) => p.id === item.product_id);
      if (!prod) {
        throw new Error(`Le produit sélectionné n'existe plus.`);
      }
      if (prod.stock_quantity < item.quantity) {
        throw new Error(
          `Stock insuffisant pour « ${prod.name} ». Quantité restante : ${prod.stock_quantity}, demandée : ${item.quantity}.`
        );
      }
    }

    const saleId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'sale_' + Date.now();

    const createdDate = new Date().toISOString();

    const newSale: Sale = {
      id: saleId,
      customer_id: saleData.customer_id,
      customer_name: saleData.customer_name,
      total_amount: saleData.total_amount,
      amount_paid: saleData.amount_paid,
      remaining_amount: saleData.remaining_amount,
      payment_status: saleData.payment_status,
      payment_method: saleData.payment_method,
      notes: saleData.notes,
      created_at: createdDate,
      items: saleData.items.map((i, idx) => ({
        id: `${saleId}_item_${idx}`,
        sale_id: saleId,
        ...i,
      })),
    };

    if (isSupabaseConfigured && supabase) {
      const { data: insertedSale, error: saleErr } = await supabase
        .from('sales')
        .insert([{
          customer_id: saleData.customer_id || null,
          total_amount: saleData.total_amount,
          amount_paid: saleData.amount_paid,
        }])
        .select()
        .single();

      if (saleErr) throw new Error(saleErr.message);

      if (insertedSale) {
        newSale.id = insertedSale.id;
        newSale.items = saleData.items.map((i, idx) => ({
          id: `${insertedSale.id}_item_${idx}`,
          sale_id: insertedSale.id,
          ...i,
        }));

        const { error: itemsErr } = await supabase.from('sale_items').insert(
          saleData.items.map((it) => ({
            sale_id: insertedSale.id,
            product_id: it.product_id,
            quantity: it.quantity,
            unit_price: it.unit_price,
          }))
        );
        if (itemsErr) throw new Error(itemsErr.message);

        if (saleData.amount_paid > 0) {
          const { data: insertedPayment, error: payErr } = await supabase
            .from('payments')
            .insert([{
              sale_id: insertedSale.id,
              customer_id: saleData.customer_id || null,
              amount: saleData.amount_paid,
            }])
            .select()
            .single();

          if (payErr) throw new Error(payErr.message);
          if (insertedPayment) {
            newSale.payments = [insertedPayment as Payment];
          }
        }

        const { data: refreshedProducts } = await supabase.from('products').select('*');
        if (refreshedProducts) setProducts(refreshedProducts);
      }
    }

    setSales((prev) => [newSale, ...prev]);

    showNotification(
      `Vente validée ! Total : ${saleData.total_amount} ${currency}.`
    );
  };

  // --- GESTION DES PAIEMENTS PARTIELS / RÈGLEMENTS DES DETTES ---
  const handleRecordPayment = async (
    saleId: string,
    amount: number,
    paymentMethod: string,
    notes?: string
  ) => {
    const targetSale = sales.find((s) => s.id === saleId);
    if (!targetSale) {
      throw new Error(`La vente correspondante n'a pas été trouvée.`);
    }

    if (amount <= 0) {
      throw new Error('Le montant du versement doit être supérieur à 0.');
    }

    if (amount > targetSale.remaining_amount) {
      throw new Error(
        `Le montant saisi (${amount} ${currency}) dépasse le reste dû (${targetSale.remaining_amount} ${currency}).`
      );
    }

    const paymentId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'pay_' + Date.now();

    const paymentDate = new Date().toISOString();

    const newPayment: Payment = {
      id: paymentId,
      sale_id: saleId,
      amount,
      payment_method: paymentMethod,
      notes,
      created_at: paymentDate,
    };

    const newAmountPaid = targetSale.amount_paid + amount;
    const newRemainingAmount = Math.max(0, targetSale.total_amount - newAmountPaid);
    const newPaymentStatus: 'paid' | 'partial' | 'unpaid' = newRemainingAmount === 0 ? 'paid' : 'partial';

    // Synchronisation Supabase si connecté
    if (isSupabaseConfigured && supabase) {
      const { error: payErr } = await supabase.from('payments').insert([{
        sale_id: saleId,
        amount,
        payment_method: paymentMethod,
        notes,
      }]);
      if (payErr) console.warn('Note Supabase insert payment:', payErr.message);

      const { error: saleUpdateErr } = await supabase
        .from('sales')
        .update({
          amount_paid: newAmountPaid,
          remaining_amount: newRemainingAmount,
          payment_status: newPaymentStatus,
          updated_at: paymentDate,
        })
        .eq('id', saleId);
      if (saleUpdateErr) throw new Error(saleUpdateErr.message);
    }

    // Mise à jour de l'état local des ventes avec le nouveau versement
    setSales((prevSales) =>
      prevSales.map((s) => {
        if (s.id === saleId) {
          const updatedPayments = s.payments ? [newPayment, ...s.payments] : [newPayment];
          return {
            ...s,
            amount_paid: newAmountPaid,
            remaining_amount: newRemainingAmount,
            payment_status: newPaymentStatus,
            payments: updatedPayments,
            updated_at: paymentDate,
          };
        }
        return s;
      })
    );

    showNotification(
      `Paiement de ${amount} ${currency} enregistré pour ${targetSale.customer_name || 'le client'}. Reste dû : ${newRemainingAmount} ${currency}.`
    );
  };

  if (isSupabaseConfigured && !authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isSupabaseConfigured && !session) {
    if (authScreen === 'signup') {
      return <SignupScreen onGoToLogin={() => setAuthScreen('login')} />;
    }
    return <LoginScreen onGoToSignup={() => setAuthScreen('signup')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Header / Barre de navigation */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-slate-900 text-lg tracking-tight block leading-tight">
                Boutik<span className="text-emerald-600">Pro</span>
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 tracking-wide uppercase">
                Stock, Clients & Ventes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Onglets de navigation */}
            <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tableau de bord</span>
              </button>

              <button
                onClick={() => setActiveTab('products')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'products'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                <span>Stock ({products.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('customers')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'customers'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Clients ({customers.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('sales')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'sales'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ventes ({sales.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('payments')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'payments'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dettes & Règlements</span>
              </button>
            </nav>

            {isSupabaseConfigured && session && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Déconnexion
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Bannière "Zéro donnée fictive" */}
      <div className="bg-emerald-950 text-emerald-100 px-4 py-2 text-xs border-b border-emerald-900/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Base réelle :</strong> Aucune donnée fictive. Vos ventes et stocks débutent vides et sont calculés d'après vos encaissements effectifs.
            </span>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2.5 ${
              notification.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-rose-600 text-white border-rose-700'
            }`}
          >
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Chargement des données...</p>
          </div>
        ) : activeTab === 'dashboard' ? (
          <Dashboard
            products={products}
            customers={customers}
            sales={sales}
            currency={currency}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenNewSale={() => setActiveTab('sales')}
            refreshKey={dashboardRefreshKey}
          />
        ) : activeTab === 'products' ? (
          <ProductManagement
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            currency={currency}
            onNotification={(msg) => showNotification(msg)}
          />
        ) : activeTab === 'customers' ? (
          <CustomerManagement
            customers={customers}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onDebtPaymentRecorded={() => setDashboardRefreshKey((key) => key + 1)}
          />
        ) : activeTab === 'sales' ? (
          <SalesManagement
            sales={sales}
            products={products}
            customers={customers}
            onAddSale={handleAddSale}
            currency={currency}
          />
        ) : (
          <PaymentHistory
            sales={sales}
            customers={customers}
            onRecordPayment={handleRecordPayment}
            currency={currency}
            onNavigateToNewSale={() => setActiveTab('sales')}
          />
        )}
      </main>

      {/* Pied de page */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 sm:px-6 text-center text-xs text-slate-500">
        <p>
          BoutikPro &bull; Solution de gestion des ventes, stocks et créances clients
        </p>
      </footer>
    </div>
  );
}
