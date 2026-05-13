import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFetchCollection } from '../hooks/useFetchCollection';
import { orderBy, limit } from 'firebase/firestore';
import { Product, Customer, Category, GameModality, ExpenseCategory, Supplier, Transaction, RecurringExpense, InstallmentExpense } from '../types';

interface DataContextType {
  products: Product[];
  customers: Customer[];
  categories: Category[];
  gameModalities: GameModality[];
  expenseCategories: ExpenseCategory[];
  suppliers: Supplier[];
  transactions: Transaction[];
  expenses: Transaction[];
  purchases: any[];
  recurringExpenses: RecurringExpense[];
  installmentExpenses: InstallmentExpense[];
  loading: {
    products: boolean;
    customers: boolean;
    categories: boolean;
    gameModalities: boolean;
    expenseCategories: boolean;
    suppliers: boolean;
    transactions: boolean;
    expenses: boolean;
    purchases: boolean;
    recurringExpenses: boolean;
    installmentExpenses: boolean;
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: products, loading: loadingProducts } = useFetchCollection<Product>('products');
  const { data: customers, loading: loadingCustomers } = useFetchCollection<Customer>('customers');
  const { data: categories, loading: loadingCategories } = useFetchCollection<Category>('categories');
  const { data: gameModalities, loading: loadingGameModalities } = useFetchCollection<GameModality>('game_modalities');
  const { data: expenseCategories, loading: loadingExpenseCategories } = useFetchCollection<ExpenseCategory>('expense_categories');
  const { data: suppliers, loading: loadingSuppliers } = useFetchCollection<Supplier>('suppliers');

  // Shared large collections with constraints
  const transConstraints = useMemo(() => [orderBy('date', 'desc'), limit(500)], []);
  const expConstraints = useMemo(() => [orderBy('date', 'desc'), limit(500)], []);
  const purConstraints = useMemo(() => [orderBy('date', 'desc'), limit(100)], []);

  const { data: transactions, loading: loadingTransactions } = useFetchCollection<Transaction>('transactions', { constraints: transConstraints });
  const { data: expenses, loading: loadingExpenses } = useFetchCollection<Transaction>('expenses', { constraints: expConstraints });
  const { data: purchases, loading: loadingPurchases } = useFetchCollection<any>('purchases', { constraints: purConstraints });
  const { data: recurringExpenses, loading: loadingRecurring } = useFetchCollection<RecurringExpense>('recurring_expenses');
  const { data: installmentExpenses, loading: loadingInstallments } = useFetchCollection<InstallmentExpense>('installment_expenses');

  const value = {
    products,
    customers,
    categories,
    gameModalities,
    expenseCategories,
    suppliers,
    transactions,
    expenses,
    purchases,
    recurringExpenses: useMemo(() => recurringExpenses.filter(r => r.status !== 'deleted'), [recurringExpenses]),
    installmentExpenses: useMemo(() => installmentExpenses.filter(i => i.status !== 'deleted'), [installmentExpenses]),
    loading: {
      products: loadingProducts,
      customers: loadingCustomers,
      categories: loadingCategories,
      gameModalities: loadingGameModalities,
      expenseCategories: loadingExpenseCategories,
      suppliers: loadingSuppliers,
      transactions: loadingTransactions,
      expenses: loadingExpenses,
      purchases: loadingPurchases,
      recurringExpenses: loadingRecurring,
      installmentExpenses: loadingInstallments,
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
