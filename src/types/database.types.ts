export interface Product {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  price: number; // Prix unitaire (ex: FCFA ou EUR)
  stock_quantity: number; // Quantité disponible en stock
  min_stock_alert?: number; // Seuil d'alerte de stock personnalisé (par défaut 5)
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  user_id?: string;
  name: string;
  phone?: string;
  address?: string; // Ville, quartier ou adresse physique
  notes?: string;   // Informations complémentaires
  created_at?: string;
  updated_at?: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Payment {
  id: string;
  sale_id: string;
  user_id?: string;
  amount: number;
  payment_method: string;
  notes?: string;
  created_at?: string;
}

export interface Sale {
  id: string;
  user_id?: string;
  customer_id?: string;
  customer_name?: string;
  total_amount: number; // Montant total TTC
  amount_paid: number;  // Montant encaissé
  remaining_amount: number; // Reste à payer / dette
  payment_status?: 'paid' | 'partial' | 'unpaid';
  payment_method?: string; // Espèces, Mobile Money (Wave, Orange, MTN), Chèque, etc.
  notes?: string;
  created_at?: string;
  items?: SaleItem[];
  payments?: Payment[];
}
