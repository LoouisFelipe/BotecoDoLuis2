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
  dataExpediente?: string;
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
  dataExpediente?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  subcategories: string[];
  createdAt?: any;
}

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  dueDate: number; // Day of month
  categoryId: string;
  subCategory?: string;
  active: boolean;
  status?: 'active' | 'deleted';
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
  ingredients?: { productId: string; quantity: number }[];
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
  type?: 'debit' | 'credit';
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
    itemAssignments?: {
      itemIndex: number;
      quantity: number;
    }[];
  }[];
  createdAt: any;
  closedAt?: any;
  createdBy: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  categoryId?: string;
  subCategory?: string;
  category?: string; // Legacy support
  amount: number;
  cost?: number;
  feeAmount?: number;
  netAmount?: number;
  description?: string;
  date: any;
  orderId?: string;
  purchaseId?: string;
  customerId?: string;
  paymentMethod?: string;
  isFiado?: boolean;
  isSaldo?: boolean;
  dataExpediente?: string;
  status?: 'active' | 'deleted';
}

export interface PaymentFeeConfig {
  id?: string;
  credit_pct: number;
  debit_pct: number;
  pix_pct?: number;
}

export interface InstallmentExpense {
  id: string;
  description: string;
  totalAmount: number;
  remainingAmount: number;
  installmentsCount: number;
  remainingInstallments: number;
  installmentValue: number;
  nextDueDate: any;
  categoryId: string;
  subCategory?: string;
  createdAt: any;
  active: boolean;
  status?: 'active' | 'deleted';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'staff';
  createdAt: any;
}
