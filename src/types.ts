export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  totalSpent?: number;
  orderCount?: number;
  balance?: number;
  createdAt: any;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  category?: string;
  createdAt: any;
}

export interface GameModality {
  id: string;
  name: string;
  price: number;
  active: boolean;
  isOpenValue?: boolean;
}

export interface GameSession {
  id: string;
  modalityId: string;
  modalityName: string;
  amount: number;
  date: any;
  userId: string;
  userName: string;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  totalAmount: number;
  date: any;
}

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  dueDate: number; // Day of month
  category: string;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  createdAt?: any;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  subcategory?: string;
  description?: string;
  price: number;
  cost: number;
  stock: number;
  minStock?: number;
  unit?: string;
  active?: boolean;
  isOpenValue?: boolean;
  // Dose control fields
  isDoseControl?: boolean;
  volumePerUnit?: number; // ml per bottle
  currentBottleVolume?: number; // ml left in open bottle
  linkedProductId?: string; // ID of the bottle product
  doseSize?: number; // ml of this dose
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
  costPrice?: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerId?: string;
  type: 'table' | 'customer';
  status: 'open' | 'closed' | 'cancelled';
  items: OrderItem[];
  totalAmount: number;
  payments?: {
    method: string;
    amount: number;
    date: any;
  }[];
  createdAt: any;
  closedAt?: any;
  createdBy: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  cost?: number;
  description?: string;
  date: any;
  orderId?: string;
  paymentMethod?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'staff';
  createdAt: any;
}
