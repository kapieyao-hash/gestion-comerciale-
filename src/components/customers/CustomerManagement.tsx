import React, { useState, useMemo } from 'react';
import { Customer } from '../../types/database.types';
import { CustomerFormModal } from './CustomerFormModal';
import { EmptyState } from '../layout/EmptyState';
import { formatDate } from '../../lib/formatters';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  FileText,
  MessageCircle,
  Clock
} from 'lucide-react';

interface CustomerManagementProps {
  customers: Customer[];
  onAddCustomer: (data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateCustomer: (id: string, data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Suppression dialog
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Recherche
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrage réel des clients (aucun client fictif)
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const q = searchQuery.toLowerCase();
      const matchName = customer.name.toLowerCase().includes(q);
      const matchPhone = customer.phone ? customer.phone.toLowerCase().includes(q) : false;
      const matchAddress = customer.address ? customer.address.toLowerCase().includes(q) : false;
      return matchName || matchPhone || matchAddress;
    });
  }, [customers, searchQuery]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingCustomer) {
      await onUpdateCustomer(editingCustomer.id, data);
    } else {
      await onAddCustomer(data);
    }
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-600" />
            Répertoire des Clients
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gérez votre carnet d'adresses clients pour faciliter l'attribution des ventes et le suivi des crédits.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm shadow-xs hover:shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nouveau Client</span>
        </button>
      </div>

      {/* Barre de recherche */}
      {customers.length > 0 && (
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, numéro de téléphone ou quartier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
            />
          </div>
          <div className="text-xs font-semibold text-slate-500 ml-4 hidden sm:block">
            {filteredCustomers.length} {filteredCustomers.length > 1 ? 'clients trouvés' : 'client trouvé'}
          </div>
        </div>
      )}

      {/* Affichage des données réelles ou de l'état vide */}
      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun client enregistré"
          description="Votre répertoire de clients est vide pour le moment. Enregistrez vos premiers clients pour associer leurs achats, gérer les paiements échelonnés et retrouver facilement leurs coordonnées."
          actionLabel="Ajouter mon premier client"
          onAction={handleOpenAdd}
        />
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
          <p className="text-slate-600 text-sm font-medium">
            Aucun client ne correspond à votre recherche « {searchQuery} ».
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-3 text-xs font-semibold text-emerald-600 hover:underline"
          >
            Effacer la recherche
          </button>
        </div>
      ) : (
        /* Liste des clients en grille de cartes réactives */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const cleanPhone = customer.phone ? customer.phone.replace(/[^0-9+]/g, '') : null;
            return (
              <div
                key={customer.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center font-black text-emerald-700 text-base shrink-0">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">
                          {customer.name}
                        </h3>
                        {customer.created_at && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>Ajouté le {formatDate(customer.created_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(customer)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCustomerToDelete(customer)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Coordonnées détaillées */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    {customer.phone ? (
                      <div className="flex items-center justify-between text-slate-700">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium">{customer.phone}</span>
                        </div>
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md"
                            title="Ouvrir sur WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400 italic">
                        <Phone className="w-3.5 h-3.5 text-slate-300" />
                        <span>Pas de numéro enregistré</span>
                      </div>
                    )}

                    {customer.address ? (
                      <div className="flex items-start gap-2 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{customer.address}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400 italic">
                        <MapPin className="w-3.5 h-3.5 text-slate-300" />
                        <span>Adresse non renseignée</span>
                      </div>
                    )}

                    {customer.notes && (
                      <div className="mt-2.5 p-2 bg-slate-50 rounded-xl text-slate-600 text-[11px] flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <p className="line-clamp-2">{customer.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Statut : Client actif</span>
                  <button
                    onClick={() => handleOpenEdit(customer)}
                    className="text-emerald-700 font-semibold hover:underline"
                  >
                    Mettre à jour
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal d'ajout / modification de client */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        customerToEdit={editingCustomer}
      />

      {/* Confirmation de suppression */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                Supprimer « {customerToDelete.name} » ?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Le client sera retiré de votre carnet d'adresses.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
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
    </div>
  );
};
