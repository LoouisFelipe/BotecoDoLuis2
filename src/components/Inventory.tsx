import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Product, Category, UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Plus, Edit2, Trash2, Package, Tag, Search, Filter, ChevronDown, ChevronRight, Layers, Info, AlertCircle, TrendingUp, X, Settings, Check, Wine, Droplets, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn } from '../lib/utils';
import { ConfirmDialog } from './ConfirmDialog';
import { ProductForm } from './Product';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Combobox } from './ui/combobox';
import { Textarea } from './ui/textarea';
import { calculateAvailableDoses, isStockCritical } from '../lib/stock-utils';

import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';

export function Inventory({ user }: { user: UserProfile }) {
  const navigate = useNavigate();
  const { products, categories, loading } = useData();
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'critical'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedSubcategories, setExpandedSubcategories] = useState<string[]>([]);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSubcategory = (id: string) => {
    setExpandedSubcategories(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (categoryFilter !== 'all') {
      setExpandedCategories(prev => prev.includes(categoryFilter) ? prev : [...prev, categoryFilter]);
    }
  }, [categoryFilter]);

  const handleSaveCategory = async () => {
    if (!categoryName) return;
    setIsSavingCategory(true);
    try {
      await addDoc(collection(db, 'categories'), { 
        name: categoryName,
        createdAt: serverTimestamp()
      });
      setCategoryName('');
      setIsCategoryModalOpen(false);
      toast.success('Categoria adicionada');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete || !productToDelete.id) {
      toast.error('Erro: ID do produto não encontrado');
      return;
    }
    try {
      await updateDoc(doc(db, 'products', productToDelete.id), {
        active: false,
        updatedAt: serverTimestamp()
      });
      toast.success('Produto desativado (Soft Delete)');
      setProductToDelete(null);
      setIsDeleteConfirmOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${productToDelete.id}`);
    }
  };

  const filteredProducts = products.filter(p => {
    if (p.active === false) return false;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStock = stockFilter === 'critical' ? isStockCritical(p, products) : true;
    const matchesCategory = categoryFilter === 'all' ? true : p.categoryId === categoryFilter;
    return matchesSearch && matchesStock && matchesCategory;
  });

  return (
    <div className="space-y-10">
      {/* Inventory Insights - Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          className={cn(
            "bg-[#05070a]/60 border-white/5 rounded-[40px] overflow-hidden relative group cursor-pointer transition-all hover:bg-white/[0.04] hover:border-red-500/30",
            stockFilter === 'critical' && "ring-2 ring-red-500/50 bg-red-500/10 border-red-500/50"
          )}
          onClick={() => setStockFilter(stockFilter === 'critical' ? 'all' : 'critical')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-8 flex items-center gap-6 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)] group-hover:scale-110 transition-transform">
              <AlertCircle className={cn("w-7 h-7", stockFilter === 'critical' ? "text-red-400" : "text-red-500")} />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.25em] uppercase text-muted-foreground mb-2">Estoque Crítico</p>
              <h3 className="text-3xl font-black text-white leading-none font-mono">
                {products.filter(p => p.active !== false && isStockCritical(p, products)).length} <span className="text-[10px] text-red-500 font-black tracking-widest ml-1">ALERTA</span>
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-[#05070a]/60 border-white/5 rounded-[40px] overflow-hidden relative group cursor-pointer hover:bg-white/[0.04] hover:border-green-500/30"
          onClick={() => navigate('/finances')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-8 flex items-center gap-6 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <TrendingUp className="w-7 h-7 text-green-500" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.25em] uppercase text-muted-foreground mb-2">Custo de Estoque</p>
              <h3 className="text-2xl font-mono tabular-nums font-black text-white leading-none">
                R$ {products.filter(p => p.active !== false).reduce((sum, p) => sum + ((p.cost || 0) * (p.stock || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#05070a]/60 border-white/5 rounded-[40px] overflow-hidden relative group hover:bg-white/[0.04] hover:border-primary/30">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-8 flex items-center gap-6 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(0,112,243,0.1)]">
              <TrendingUp className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.25em] uppercase text-muted-foreground mb-2">Lucro Líquido Real</p>
              <h3 className="text-2xl font-mono tabular-nums font-black text-primary leading-none">
                R$ {products.filter(p => p.active !== false).reduce((sum, p) => {
                  const saleValue = (p.price || 0) * (p.stock || 1);
                  const netSale = saleValue * 0.98; // 2% fee
                  const costValue = (p.cost || 0) * (p.stock || 1);
                  return sum + (netSale - costValue);
                }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#05070a]/60 border-white/5 rounded-[40px] overflow-hidden relative group hover:bg-white/[0.04] hover:border-yellow-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-8 flex items-center gap-6 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
              <Tag className="w-7 h-7 text-yellow-500" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.25em] uppercase text-muted-foreground mb-2">Margem Líquida Média</p>
              <h3 className="text-3xl font-black text-white leading-none font-mono tabular-nums">
                {(() => {
                  const productsWithCost = products.filter(p => p.active !== false && (p.cost || 0) > 0);
                  if (productsWithCost.length === 0) return '0%';
                  const avgMargin = productsWithCost.reduce((sum, p) => {
                    const netPrice = p.price * 0.98;
                    return sum + (((netPrice - p.cost) / p.cost) * 100);
                  }, 0) / productsWithCost.length;
                  return `${avgMargin.toFixed(0)}%`;
                })()}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative flex-1 w-full max-w-2xl group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="PESQUISAR PRODUTO..." 
            className="pl-14 h-14 bg-[#05070a]/60 border-white/5 rounded-2xl text-sm font-bold tracking-[0.25em] focus:ring-primary/20 focus:border-primary transition-all uppercase placeholder:text-muted-foreground/30 text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-row gap-4 w-full md:w-auto">
          <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
            <DialogTrigger render={<Button variant="outline" className="flex-1 md:flex-none h-14 px-6 rounded-2xl gap-3 font-black tracking-[0.2em] uppercase border-white/5 bg-[#05070a]/60 hover:bg-white/5 text-muted-foreground hover:text-white transition-all text-[10px]" />}>
              <Tag className="w-5 h-5" />
              Categorias
            </DialogTrigger>
            <DialogContent className="bg-[#05070a] border-white/10 p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-[40px] shadow-2xl">
              <DialogHeader className="p-10 border-b border-white/5 flex-shrink-0 bg-gradient-to-b from-white/[0.02] to-transparent">
                <DialogTitle className="text-2xl font-black uppercase tracking-[0.3em] text-white">Gerenciar Categorias</DialogTitle>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Organização do cardápio</p>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                <div className="flex gap-3">
                  <Input 
                    placeholder="NOVA CATEGORIA..." 
                    className="h-14 bg-white/[0.02] border-white/10 text-white rounded-xl font-bold tracking-widest uppercase focus:border-primary transition-all"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                  />
                  <Button 
                    onClick={handleSaveCategory} 
                    disabled={isSavingCategory}
                    className="h-14 px-8 font-black uppercase tracking-[0.2em] bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 border border-white/10"
                  >
                    {isSavingCategory ? (
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : 'ADICIONAR'}
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/5 rounded-2xl bg-white/[0.01]">
                  <Table>
                    <TableBody>
                      {categories.map((cat, idx) => (
                        <TableRow key={`cat-table-${cat.id}-${idx}`} className="border-white/5 hover:bg-white/5">
                          <TableCell className="py-5 px-6 font-black uppercase tracking-[0.2em] text-white text-xs">{cat.name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <ProductForm
            isOpen={isProductModalOpen}
            onOpenChange={setIsProductModalOpen}
            editingProduct={editingProduct}
            products={products}
            categories={categories}
            onSaveSuccess={() => {
              setEditingProduct(null);
            }}
          />
          <Button 
            aria-label="Cadastrar Novo Produto"
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="flex-1 md:flex-none h-14 px-8 rounded-2xl gap-3 font-black tracking-[0.2em] uppercase bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/30 text-[10px] border border-white/10"
          >
            <Plus className="w-5 h-5" />
            Novo Produto
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar -mx-2 px-2">
        <Button
          variant={categoryFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setCategoryFilter('all')}
          className={cn(
            "h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all shrink-0 border border-white/5",
            categoryFilter === 'all' 
              ? "bg-primary shadow-xl shadow-primary/30 border-transparent text-white" 
              : "bg-[#05070a]/60 hover:bg-white/5 text-muted-foreground hover:text-white"
          )}
        >
          Todos
        </Button>
        {categories
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(category => (
          <Button
            key={`filter-${category.id}`}
            variant={categoryFilter === category.id ? 'default' : 'outline'}
            onClick={() => setCategoryFilter(category.id)}
            className={cn(
              "h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all shrink-0 border border-white/5",
              categoryFilter === category.id 
                ? "bg-primary shadow-xl shadow-primary/30 border-transparent text-white" 
                : "bg-[#05070a]/60 hover:bg-white/5 text-muted-foreground hover:text-white"
            )}
          >
            {category.name}
          </Button>
        ))}
      </div>

      <div className="space-y-6">
        {(() => {
          const visibleCategories = categories
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .filter(c => categoryFilter === 'all' || c.id === categoryFilter)
            .filter(category => {
              const categoryProducts = filteredProducts.filter(p => p.categoryId === category.id);
              return !(categoryProducts.length === 0 && search);
            });

          const uncategorizedProducts = filteredProducts.filter(p => !categories.find(c => c.id === p.categoryId));
          const hasUncategorized = uncategorizedProducts.length > 0 && (categoryFilter === 'all' || categoryFilter === 'uncategorized');

          if (visibleCategories.length === 0 && !hasUncategorized) {
            return (
              <div className="py-24 text-center bg-card/20 rounded-[40px] border-2 border-dashed border-border/50 animate-in fade-in duration-500">
                <Package className="w-20 h-20 text-muted-foreground mx-auto mb-6 opacity-10" />
                <p className="text-muted-foreground font-black tracking-[0.3em] uppercase text-sm">Nenhum produto encontrado</p>
                <Button 
                  variant="link" 
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('all');
                    setStockFilter('all');
                  }}
                  className="mt-4 text-primary font-black uppercase tracking-[0.2em] text-xs hover:text-primary/80"
                >
                  Limpar todos os filtros
                </Button>
              </div>
            );
          }

          return (
            <>
              {visibleCategories.map((category, catIdx) => {
                const categoryProducts = filteredProducts.filter(p => p.categoryId === category.id);
                const subcategories = Array.from(new Set(categoryProducts.map(p => p.subcategory || 'Sem Subcategoria')))
                  .sort((a, b) => a.localeCompare(b));
                const isExpanded = expandedCategories.includes(category.id);

                return (
                  <div key={`${category.id}-${catIdx}`} className="border border-white/5 bg-[#05070a]/60 rounded-[40px] overflow-hidden transition-all hover:border-white/10 shadow-xl">
                    <button 
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center justify-between p-8 hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all",
                          isExpanded 
                            ? "bg-primary/20 border-primary/30 text-primary" 
                            : "bg-white/5 border-white/10 text-muted-foreground group-hover:text-white"
                        )}>
                          <Package className="w-7 h-7" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-black uppercase tracking-[0.2em] text-xl text-white">{category.name}</h3>
                          <p className="text-[10px] font-black tracking-[0.25em] uppercase text-muted-foreground">{categoryProducts.length} ITENS CADASTRADOS</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="hidden sm:flex flex-col items-end mr-4">
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">CUSTO TOTAL</p>
                            <p className="text-sm font-mono tabular-nums font-black text-white">
                              R$ {categoryProducts.reduce((sum, p) => sum + ((p.cost || 0) * (p.stock || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                         </div>
                         {isExpanded ? <ChevronDown className="w-6 h-6 text-muted-foreground" /> : <ChevronRight className="w-6 h-6 text-muted-foreground" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-8 pb-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        {subcategories.map((subName, subIdx) => {
                          const subProducts = categoryProducts
                            .filter(p => (p.subcategory || 'Sem Subcategoria') === subName)
                            .sort((a, b) => a.name.localeCompare(b.name));
                          const subId = `${category.id}-${subName}-${subIdx}`;
                          const isSubExpanded = expandedSubcategories.includes(subId);

                          return (
                            <div key={subId} className="border border-white/5 bg-black/40 rounded-3xl overflow-hidden">
                              <button 
                                onClick={() => toggleSubcategory(subId)}
                                className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors group"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                                    isSubExpanded ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/10 text-muted-foreground group-hover:text-white"
                                  )}>
                                    <Layers className="w-5 h-5" />
                                  </div>
                                  <div className="text-left">
                                    <h4 className="font-black uppercase tracking-[0.15em] text-sm text-white">{subName}</h4>
                                    <p className="text-[9px] font-black tracking-[0.2em] uppercase text-muted-foreground">{subProducts.length} PRODUTOS</p>
                                  </div>
                                </div>
                                {isSubExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                              </button>

                              {isSubExpanded && (
                                <div className="p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                  {subProducts.map((product, prodIdx) => {
                                    const netPrice = product.price * 0.98;
                                    const margin = product.cost > 0 ? ((netPrice - product.cost) / product.cost) * 100 : 0;
                                    const possibleDoses = calculateAvailableDoses(product, products);
                                    const isCritical = isStockCritical(product, products);
                                    return (
                                      <div key={`${product.id}-${prodIdx}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-black/20 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all group/item gap-6">
                                        <div className="flex items-center gap-5">
                                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover/item:border-primary/30 transition-all flex-shrink-0 relative">
                                            <Package className="w-6 h-6 text-muted-foreground group-hover/item:text-primary" />
                                            {product.isDoseControl && (
                                              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-background shadow-lg">
                                                {product.linkedProductId ? <Wine className="w-3 h-3 text-white" /> : <FlaskConical className="w-3 h-3 text-white" />}
                                              </div>
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-3">
                                              <h5 className="font-black uppercase tracking-tighter text-base text-white truncate">{product.name}</h5>
                                              {product.isOpenValue && (
                                                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-[0.2em] border-primary/30 text-primary bg-primary/5 px-2 py-0.5">VALOR ABERTO</Badge>
                                              )}
                                            </div>
                                            <p className="text-[9px] font-black tracking-[0.25em] uppercase text-muted-foreground truncate">{product.subcategory || category.name}</p>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-6 md:gap-10 border-t sm:border-t-0 pt-4 sm:pt-0 border-white/5">
                                          <div className="hidden md:block text-right">
                                            <p className="text-[8px] font-black tracking-widest uppercase text-muted-foreground/50 mb-1">CUSTO UNIT.</p>
                                            <p className="font-mono tabular-nums font-bold text-xs text-muted-foreground">R$ {(product.cost || 0).toFixed(2)}</p>
                                          </div>
                                          
                                          <div className="text-left sm:text-right">
                                            <p className="text-[8px] font-black tracking-widest uppercase text-muted-foreground/50 mb-1">PREÇO VENDA</p>
                                            <p className="font-mono tabular-nums font-black text-base text-white">R$ {(product.price || 0).toFixed(2)}</p>
                                          </div>

                                          <div className="text-right">
                                            <p className="text-[8px] font-black tracking-widest uppercase text-muted-foreground/50 mb-1">ESTOQUE</p>
                                            <div className="flex flex-col items-end gap-1.5">
                                              <Badge variant="outline" className={cn(
                                                "text-[10px] md:text-xs font-mono tabular-nums font-black uppercase tracking-widest border-none px-3 py-1 rounded-lg",
                                                isCritical ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-green-500/20 text-green-400 border border-green-500/30"
                                              )}>
                                                {product.isDoseControl && product.linkedProductId 
                                                  ? `${possibleDoses} DOSES` 
                                                  : `${(product.stock || 0)} UNID.`}
                                              </Badge>
                                              {product.isDoseControl && !product.linkedProductId && (
                                                <p className="text-[9px] font-mono tabular-nums font-black text-primary uppercase tracking-tighter">
                                                  {(product.currentBottleVolume || 0)}ml RESTANTE
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          <div className="hidden lg:block text-right">
                                            <p className="text-[8px] font-black tracking-widest uppercase text-muted-foreground/50 mb-1">LUCRO REAL</p>
                                            <p className={cn(
                                              "text-sm font-mono tabular-nums font-black uppercase tracking-tighter",
                                              margin >= 50 ? "text-green-400" : margin >= 20 ? "text-yellow-500" : "text-red-500"
                                            )}>
                                              {margin.toFixed(0)}%
                                            </p>
                                          </div>

                                          <div className="flex items-center gap-2 ml-2">
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              aria-label="Editar Produto"
                                              onClick={() => openEditProduct(product)}
                                              className="w-10 h-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground border border-transparent hover:border-primary/20"
                                            >
                                              <Edit2 className="w-5 h-5" />
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              aria-label="Excluir Produto"
                                              onClick={() => {
                                                setProductToDelete(product);
                                                setIsDeleteConfirmOpen(true);
                                              }}
                                              className="w-10 h-10 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all text-muted-foreground border border-transparent hover:border-red-500/20"
                                            >
                                              <Trash2 className="w-5 h-5" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {hasUncategorized && (
                <div className="border border-white/5 bg-[#05070a]/60 rounded-[40px] overflow-hidden transition-all hover:border-white/10 shadow-xl">
                  <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground">
                        <AlertCircle className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="font-black uppercase tracking-[0.2em] text-xl text-white">Outros / Sem Categoria</h3>
                        <p className="text-[10px] font-black tracking-[0.25em] uppercase text-muted-foreground">{uncategorizedProducts.length} ITENS PENDENTES DE CATEGORIA</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-3">
                    {uncategorizedProducts
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((product, idx) => {
                      const netPrice = product.price * 0.98;
                      const margin = product.cost > 0 ? ((netPrice - product.cost) / product.cost) * 100 : 0;
                      const possibleDoses = calculateAvailableDoses(product, products);
                      const isCritical = isStockCritical(product, products);
                      return (
                        <div key={`${product.id}-${idx}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-black/20 border border-white/5 rounded-2xl hover:border-primary/30 transition-all group/item gap-6">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover/item:border-primary/30 transition-all flex-shrink-0 relative">
                              <Package className="w-6 h-6 text-muted-foreground group-hover/item:text-primary" />
                              {product.isDoseControl && (
                                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-background shadow-lg">
                                  {product.linkedProductId ? <Wine className="w-3 h-3 text-white" /> : <FlaskConical className="w-3 h-3 text-white" />}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <h5 className="font-black uppercase tracking-tighter text-base text-white truncate">{product.name}</h5>
                                {product.isOpenValue && (
                                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-[0.2em] border-primary/30 text-primary bg-primary/5 px-2 py-0.5">VALOR ABERTO</Badge>
                                )}
                              </div>
                              <p className="text-[9px] font-black tracking-[0.25em] uppercase text-muted-foreground truncate">{product.subcategory || 'Sem Categoria'}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-6 md:gap-10 border-t sm:border-t-0 pt-4 sm:pt-0 border-white/5">
                            <div className="hidden md:block text-right">
                              <p className="text-[8px] font-black tracking-widest uppercase text-muted-foreground/50 mb-1">CUSTO UNIT.</p>
                              <p className="font-mono tabular-nums font-bold text-xs text-muted-foreground">R$ {(product.cost || 0).toFixed(2)}</p>
                            </div>

                            <div className="hidden lg:block text-right">
                              <p className="text-[8px] font-black tracking-widest uppercase text-muted-foreground/50 mb-1">LUCRO REAL</p>
                              <p className={cn(
                                "text-sm font-mono tabular-nums font-black uppercase tracking-tighter",
                                margin >= 50 ? "text-green-400" : margin >= 20 ? "text-yellow-500" : "text-red-500"
                              )}>
                                {margin.toFixed(0)}%
                              </p>
                            </div>
                            
                            <div className="text-left sm:text-right">
                              <p className="text-[8px] font-black tracking-widest uppercase text-muted-foreground/50 mb-1">PREÇO VENDA</p>
                              <p className="font-mono tabular-nums font-black text-base text-white">R$ {(product.price || 0).toFixed(2)}</p>
                            </div>

                            <div className="text-right">
                              <p className="text-[8px] font-black tracking-widest uppercase text-muted-foreground/50 mb-1">ESTOQUE</p>
                              <div className="flex flex-col items-end gap-1.5">
                                <Badge variant="outline" className={cn(
                                  "text-[10px] md:text-xs font-mono tabular-nums font-black uppercase tracking-widest border-none px-3 py-1 rounded-lg",
                                  isCritical ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-green-500/20 text-green-400 border border-green-500/30"
                                )}>
                                  {product.isDoseControl && product.linkedProductId 
                                    ? `${possibleDoses} DOSES` 
                                    : `${(product.stock || 0)} UNID.`}
                                </Badge>
                                {product.isDoseControl && !product.linkedProductId && (
                                  <p className="text-[9px] font-mono tabular-nums font-black text-primary uppercase tracking-tighter">
                                    {(product.currentBottleVolume || 0)}ml RESTANTE
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                aria-label="Editar Produto"
                                onClick={() => openEditProduct(product)} 
                                className="w-10 h-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground border border-transparent hover:border-primary/20"
                              >
                                <Edit2 className="w-5 h-5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                aria-label="Excluir Produto"
                                onClick={() => {
                                  setProductToDelete(product);
                                  setIsDeleteConfirmOpen(true);
                                }} 
                                className="w-10 h-10 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all text-muted-foreground border border-transparent hover:border-red-500/20"
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      <ConfirmDialog 
        isOpen={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Excluir Produto"
        description={`Deseja realmente excluir o produto ${productToDelete?.name}? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteProduct}
        variant="destructive"
        confirmText="Excluir"
      />
    </div>
  );
}
