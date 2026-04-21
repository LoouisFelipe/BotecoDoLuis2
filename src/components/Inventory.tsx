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
import { ProductFormModal } from './ProductFormModal';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Combobox } from './ui/combobox';
import { Textarea } from './ui/textarea';

import { useFetchCollection } from '../hooks/useFetchCollection';

export function Inventory({ user, setActiveTab }: { user: UserProfile, setActiveTab: (tab: string) => void }) {
  const { data: products } = useFetchCollection<Product>('products');
  const { data: categories } = useFetchCollection<Category>('categories');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'critical'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [productModalTab, setProductModalTab] = useState<'identificacao' | 'precos' | 'doses'>('identificacao');
  
  // Form states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCost, setProductCost] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productCategoryId, setProductCategoryId] = useState('');
  const [productSubcategory, setProductSubcategory] = useState('');
  const [productUnit, setProductUnit] = useState('Por Unidade');
  const [productMinStock, setProductMinStock] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [isOpenValue, setIsOpenValue] = useState(false);
  const [isDoseControl, setIsDoseControl] = useState(false);
  const [volumePerUnit, setVolumePerUnit] = useState('');
  const [currentBottleVolume, setCurrentBottleVolume] = useState('');
  const [linkedProductId, setLinkedProductId] = useState('');
  const [doseSize, setDoseSize] = useState('');

  // Auto-configure dose control based on unit selection
  useEffect(() => {
    if (productUnit === 'Dose Simples (50ml)') {
      setIsDoseControl(true);
      setDoseSize('50');
    } else if (productUnit === 'Dose Dupla (100ml)') {
      setIsDoseControl(true);
      setDoseSize('100');
    } else if (productUnit === 'Dose (30ml)') {
      setIsDoseControl(true);
      setDoseSize('30');
    } else if (productUnit === 'Garrafa / Inteiro') {
      setIsDoseControl(true);
      setLinkedProductId('');
    } else if (productUnit === 'Serviço / Valor Aberto') {
      setIsOpenValue(true);
    }
  }, [productUnit]);

  const [categoryName, setCategoryName] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);
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

  const handleSaveProduct = async () => {
    if (!productName || !productPrice || !productCategoryId) return;
    setIsSavingProduct(true);
    
    let finalCategoryId = productCategoryId;

    // Check if the category is a new one (doesn't match an existing ID)
    const existingCategory = categories.find(c => c.id === productCategoryId || c.name.toLowerCase() === productCategoryId.toLowerCase());
    
    if (!existingCategory) {
      try {
        const catRef = await addDoc(collection(db, 'categories'), {
          name: productCategoryId,
          createdAt: serverTimestamp()
        });
        finalCategoryId = catRef.id;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'categories');
        setIsSavingProduct(false);
        return;
      }
    } else {
      finalCategoryId = existingCategory.id;
    }

    const data = {
      name: productName,
      price: parseFloat(productPrice),
      cost: parseFloat(productCost) || 0,
      stock: parseFloat(productStock) || 0,
      minStock: parseFloat(productMinStock) || 0,
      unit: productUnit,
      categoryId: finalCategoryId,
      subcategory: productSubcategory,
      description: productDescription,
      active: true,
      isOpenValue,
      isDoseControl,
      volumePerUnit: Math.max(0, parseFloat(volumePerUnit) || 0),
      linkedProductId: isDoseControl ? linkedProductId : '',
      doseSize: isDoseControl ? Math.max(0, parseFloat(doseSize) || 0) : 0,
      currentBottleVolume: isDoseControl && !linkedProductId 
        ? (currentBottleVolume !== '' ? Math.max(0, parseFloat(currentBottleVolume)) : (editingProduct?.currentBottleVolume ?? parseFloat(volumePerUnit) ?? 0))
        : 0
    };

    try {
      if (editingProduct && editingProduct.id) {
        await updateDoc(doc(db, 'products', editingProduct.id), data);
        toast.success('Produto atualizado');
      } else {
        await addDoc(collection(db, 'products'), data);
        toast.success('Produto adicionado');
      }
      setIsProductModalOpen(false);
      resetProductForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    } finally {
      setIsSavingProduct(false);
    }
  };

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

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductName('');
    setProductPrice('');
    setProductCost('');
    setProductStock('');
    setProductMinStock('');
    setProductUnit('Por Unidade');
    setProductCategoryId('');
    setProductSubcategory('');
    setProductDescription('');
    setIsOpenValue(false);
    setIsDoseControl(false);
    setVolumePerUnit('');
    setCurrentBottleVolume('');
    setLinkedProductId('');
    setDoseSize('');
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductName(product.name || '');
    setProductPrice((product.price || 0).toString());
    setProductCost((product.cost || 0).toString());
    setProductStock((product.stock || 0).toString());
    setProductMinStock((product.minStock || 0).toString());
    setProductUnit(product.unit || 'Por Unidade');
    setProductCategoryId(product.categoryId || '');
    setProductSubcategory(product.subcategory || '');
    setProductDescription(product.description || '');
    setIsOpenValue(product.isOpenValue || false);
    setIsDoseControl(product.isDoseControl || false);
    setVolumePerUnit((product.volumePerUnit || '').toString());
    setCurrentBottleVolume((product.currentBottleVolume || '').toString());
    setLinkedProductId(product.linkedProductId || '');
    setDoseSize((product.doseSize || '').toString());
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete || !productToDelete.id) {
      toast.error('Erro: ID do produto não encontrado');
      return;
    }
    try {
      await deleteDoc(doc(db, 'products', productToDelete.id));
      toast.success('Produto excluído');
      setProductToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productToDelete.id}`);
    }
  };

  const isProductCritical = (p: Product) => {
    if (p.isDoseControl && p.linkedProductId) {
      const bottle = products.find(b => b.id === p.linkedProductId);
      const possibleDoses = bottle ? Math.floor(((bottle.stock || 0) * (bottle.volumePerUnit || 0) + (bottle.currentBottleVolume !== undefined ? bottle.currentBottleVolume : (bottle.volumePerUnit || 0))) / (p.doseSize || 1)) : 0;
      return possibleDoses <= (p.minStock || 5);
    }
    return (p.stock || 0) <= (p.minStock || 5);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStock = stockFilter === 'critical' ? isProductCritical(p) : true;
    const matchesCategory = categoryFilter === 'all' ? true : p.categoryId === categoryFilter;
    return matchesSearch && matchesStock && matchesCategory;
  });

  return (
    <div className="space-y-8">
      {/* Inventory Insights - Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card 
          className={cn(
            "bg-card/30 border-border/50 overflow-hidden relative group cursor-pointer transition-all",
            stockFilter === 'critical' && "ring-2 ring-red-500/50 bg-red-500/10"
          )}
          onClick={() => setStockFilter(stockFilter === 'critical' ? 'all' : 'critical')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 flex items-center gap-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)] group-hover:scale-110 transition-transform">
              <AlertCircle className={cn("w-6 h-6", stockFilter === 'critical' ? "text-red-400" : "text-red-500")} />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Estoque Crítico</p>
              <h3 className="text-2xl font-black text-white leading-none">
                {products.filter(p => isProductCritical(p)).length} <span className="text-[10px] text-red-500 font-black">ALERTAS</span>
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "bg-card/30 border-border/50 overflow-hidden relative group cursor-pointer transition-all",
            stockFilter === 'all' && !search && "ring-2 ring-blue-500/50 bg-blue-500/10"
          )}
          onClick={() => {
            setStockFilter('all');
            setSearch('');
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 flex items-center gap-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <Package className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Total Inventário</p>
              <h3 className="text-2xl font-black text-white leading-none">{products.length} <span className="text-[10px] text-blue-500 font-black">PRODUTOS</span></h3>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-card/30 border-border/50 overflow-hidden relative group cursor-pointer"
          onClick={() => setActiveTab('finances')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 flex items-center gap-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_20_rgba(34,197,94,0.1)]">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Patrimônio Líquido (Estoque)</p>
              <h3 className="text-2xl font-black text-white leading-none">
                R$ {products.reduce((sum, p) => sum + ((p.cost || 0) * (p.stock || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
        <div className="relative flex-1 w-full max-w-2xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="PESQUISAR PRODUTO..." 
            className="pl-10 md:pl-12 h-12 md:h-14 bg-card/50 border-border rounded-xl text-xs md:text-sm font-bold tracking-widest focus:ring-primary/20 focus:border-primary transition-all uppercase"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-row gap-3 w-full md:w-auto">
          {stockFilter === 'critical' && (
            <Button 
              variant="destructive" 
              onClick={() => setStockFilter('all')}
              className="h-12 md:h-14 px-4 rounded-xl gap-2 font-bold tracking-widest uppercase text-[10px] md:text-sm animate-in fade-in zoom-in duration-200"
            >
              <X className="w-4 h-4" />
              Limpar Filtro
            </Button>
          )}
          <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
            <DialogTrigger
              nativeButton={true}
              render={
                <Button variant="outline" className="flex-1 md:flex-none h-12 md:h-14 px-4 md:px-6 rounded-xl gap-2 md:gap-3 font-bold tracking-widest uppercase border-border hover:bg-white/5 text-[10px] md:text-sm">
                  <Tag className="w-4 h-4 md:w-5 md:h-5" />
                  Categorias
                </Button>
              }
            />
            <DialogContent className="bg-card border-border p-0 overflow-hidden flex flex-col max-h-[90vh]">
              <DialogHeader className="p-8 border-b border-border/50 flex-shrink-0">
                <DialogTitle className="text-xl font-bold uppercase tracking-wider">Gerenciar Categorias</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Nova categoria..." 
                    className="h-12 bg-background border-border"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                  />
                  <Button 
                    onClick={handleSaveCategory} 
                    disabled={isSavingCategory}
                    className="h-12 px-6 font-bold uppercase tracking-widest"
                  >
                    {isSavingCategory ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : 'Add'}
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto custom-scrollbar border border-border rounded-xl bg-background/50">
                  <Table>
                    <TableBody>
                      {categories.map((cat, idx) => (
                        <TableRow key={`cat-table-${cat.id}-${idx}`} className="border-border hover:bg-white/5">
                          <TableCell className="font-bold uppercase tracking-wider">{cat.name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <ProductFormModal
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
            className="flex-1 md:flex-none h-12 md:h-14 px-4 md:px-8 rounded-xl gap-2 md:gap-3 font-bold tracking-widest uppercase shadow-lg shadow-primary/20 text-[10px] md:text-sm"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar -mx-2 px-2">
        <Button
          variant={categoryFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setCategoryFilter('all')}
          className={cn(
            "h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
            categoryFilter === 'all' ? "bg-primary shadow-lg shadow-primary/20" : "border-border hover:bg-white/5"
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
              "h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
              categoryFilter === category.id ? "bg-primary shadow-lg shadow-primary/20" : "border-border hover:bg-white/5"
            )}
          >
            {category.name}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
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
              <div className="py-20 text-center bg-card/30 rounded-2xl border border-dashed border-border animate-in fade-in duration-500">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-10" />
                <p className="text-muted-foreground font-bold tracking-widest uppercase">Nenhum produto encontrado nesta visualização</p>
                <Button 
                  variant="link" 
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('all');
                    setStockFilter('all');
                  }}
                  className="mt-2 text-primary font-bold uppercase tracking-widest text-[10px]"
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
                  <div key={`${category.id}-${catIdx}`} className="border border-border bg-card/30 rounded-2xl overflow-hidden transition-all">
                    <button 
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                          isExpanded ? "bg-primary/20 border-primary/30 text-primary" : "bg-white/5 border-border text-muted-foreground group-hover:text-white"
                        )}>
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-black uppercase tracking-tighter text-lg">{category.name}</h3>
                          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{categoryProducts.length} ITENS</p>
                        </div>
                      </div>
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        {subcategories.map((subName, subIdx) => {
                          const subProducts = categoryProducts
                            .filter(p => (p.subcategory || 'Sem Subcategoria') === subName)
                            .sort((a, b) => a.name.localeCompare(b.name));
                          const subId = `${category.id}-${subName}-${subIdx}`;
                          const isSubExpanded = expandedSubcategories.includes(subId);

                          return (
                            <div key={subId} className="border border-border/50 bg-black/20 rounded-xl overflow-hidden">
                              <button 
                                onClick={() => toggleSubcategory(subId)}
                                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-all",
                                    isSubExpanded ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-border/50 text-muted-foreground group-hover:text-white"
                                  )}>
                                    <Layers className="w-4 h-4" />
                                  </div>
                                  <div className="text-left">
                                    <h4 className="font-black uppercase tracking-tighter text-sm">{subName}</h4>
                                    <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">{subProducts.length} PRODUTOS</p>
                                  </div>
                                </div>
                                {isSubExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                              </button>

                              {isSubExpanded && (
                                <div className="p-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                  {subProducts.map((product, prodIdx) => {
                                    const margin = product.cost > 0 ? ((product.price - product.cost) / product.cost) * 100 : 0;
                                    const linkedBottle = product.isDoseControl && product.linkedProductId ? products.find(p => p.id === product.linkedProductId) : null;
                                    const possibleDoses = linkedBottle ? Math.floor(((linkedBottle.stock || 0) * (linkedBottle.volumePerUnit || 0) + (linkedBottle.currentBottleVolume !== undefined ? linkedBottle.currentBottleVolume : (linkedBottle.volumePerUnit || 0))) / (product.doseSize || 1)) : 0;
                                    const isCritical = product.isDoseControl && product.linkedProductId ? possibleDoses <= (product.minStock || 5) : (product.stock || 0) <= (product.minStock || 5);
                                    return (
                                      <div key={`${product.id}-${prodIdx}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card/40 border border-border/30 rounded-xl hover:border-primary/30 transition-all group/item gap-4">
                                        <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-border/50 group-hover/item:border-primary/30 transition-all flex-shrink-0 relative">
                                            <Package className="w-5 h-5 text-muted-foreground group-hover/item:text-primary" />
                                            {product.isDoseControl && (
                                              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center border border-background">
                                                {product.linkedProductId ? <Wine className="w-2.5 h-2.5 text-white" /> : <FlaskConical className="w-2.5 h-2.5 text-white" />}
                                              </div>
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                              <h5 className="font-black uppercase tracking-tighter text-sm truncate">{product.name}</h5>
                                              {product.isOpenValue && (
                                                <Badge variant="outline" className="text-[7px] font-black uppercase tracking-widest border-blue-500/30 text-blue-500 bg-blue-500/5 px-1 py-0">Aberto</Badge>
                                              )}
                                            </div>
                                            <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground truncate">{product.subcategory || category.name}</p>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-8 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50">
                                          <div className="hidden md:block text-right">
                                            <p className="text-[8px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Custo Unit.</p>
                                            <p className="font-mono font-bold text-xs text-muted-foreground">R$ {(product.cost || 0).toFixed(2)}</p>
                                          </div>
                                          
                                          <div className="text-left sm:text-right">
                                            <p className="text-[8px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Preço Venda</p>
                                            <p className="font-mono font-bold text-sm text-white">R$ {(product.price || 0).toFixed(2)}</p>
                                          </div>

                                          <div className="text-right">
                                            <p className="text-[8px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Estoque</p>
                                            <div className="flex flex-col items-end gap-1">
                                              <Badge variant="outline" className={cn(
                                                "text-[9px] md:text-[10px] font-bold uppercase tracking-widest border-none px-2 py-0.5",
                                                isCritical ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                                              )}>
                                                {product.isDoseControl && product.linkedProductId 
                                                  ? `${possibleDoses} DOSES` 
                                                  : `${(product.stock || 0)} UN.`}
                                              </Badge>
                                              {product.isDoseControl && !product.linkedProductId && (
                                                <p className="text-[8px] font-mono font-bold text-primary/60">
                                                  {(product.currentBottleVolume || 0)}ml REST.
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          <div className="hidden lg:block text-right">
                                            <p className="text-[8px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Margem</p>
                                            <p className={cn(
                                              "text-[10px] font-bold uppercase tracking-widest",
                                              margin >= 30 ? "text-green-500" : "text-yellow-500"
                                            )}>
                                              {margin.toFixed(0)}%
                                            </p>
                                          </div>

                                          <div className="flex items-center gap-1 md:gap-2 ml-0 sm:ml-4">
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              aria-label="Ver Movimentação"
                                              title="Ver Movimentação"
                                              className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
                                            >
                                              <Layers className="w-4 h-4" />
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              aria-label="Editar Produto"
                                              title="Editar Produto"
                                              onClick={() => openEditProduct(product)}
                                              className="w-8 h-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-500 transition-all"
                                            >
                                              <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              aria-label="Excluir Produto"
                                              title="Excluir Produto"
                                              onClick={() => {
                                                setProductToDelete(product);
                                                setIsDeleteConfirmOpen(true);
                                              }}
                                              className="w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all"
                                            >
                                              <Trash2 className="w-4 h-4" />
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
                <div className="border border-border bg-card/30 rounded-2xl overflow-hidden transition-all">
                  <div className="p-6 border-b border-border bg-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-border flex items-center justify-center text-muted-foreground">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black uppercase tracking-tighter text-lg">Outros / Sem Categoria</h3>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{uncategorizedProducts.length} ITENS</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    {uncategorizedProducts
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((product, idx) => {
                      const margin = product.cost > 0 ? ((product.price - product.cost) / product.cost) * 100 : 0;
                      const linkedBottle = product.isDoseControl && product.linkedProductId ? products.find(p => p.id === product.linkedProductId) : null;
                      const possibleDoses = linkedBottle ? Math.floor(((linkedBottle.stock || 0) * (linkedBottle.volumePerUnit || 0) + (linkedBottle.currentBottleVolume !== undefined ? linkedBottle.currentBottleVolume : (linkedBottle.volumePerUnit || 0))) / (product.doseSize || 1)) : 0;
                      const isCritical = product.isDoseControl && product.linkedProductId ? possibleDoses <= (product.minStock || 5) : (product.stock || 0) <= (product.minStock || 5);
                      return (
                        <div key={`${product.id}-${idx}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card/40 border border-border/30 rounded-xl hover:border-primary/30 transition-all group/item gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-border/50 group-hover/item:border-primary/30 transition-all flex-shrink-0 relative">
                              <Package className="w-5 h-5 text-muted-foreground group-hover/item:text-primary" />
                              {product.isDoseControl && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center border border-background">
                                  {product.linkedProductId ? <Wine className="w-2.5 h-2.5 text-white" /> : <FlaskConical className="w-2.5 h-2.5 text-white" />}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h5 className="font-black uppercase tracking-tighter text-sm truncate">{product.name}</h5>
                                {product.isOpenValue && (
                                  <Badge variant="outline" className="text-[7px] font-black uppercase tracking-widest border-blue-500/30 text-blue-500 bg-blue-500/5 px-1 py-0">Aberto</Badge>
                                )}
                              </div>
                              <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground truncate">{product.subcategory || 'Sem Categoria'}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-8 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50">
                            <div className="hidden md:block text-right">
                              <p className="text-[8px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Custo Unit.</p>
                              <p className="font-mono font-bold text-xs text-muted-foreground">R$ {(product.cost || 0).toFixed(2)}</p>
                            </div>
                            
                            <div className="text-left sm:text-right">
                              <p className="text-[8px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Preço Venda</p>
                              <p className="font-mono font-bold text-sm text-white">R$ {(product.price || 0).toFixed(2)}</p>
                            </div>

                            <div className="text-right">
                              <p className="text-[8px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Estoque</p>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="outline" className={cn(
                                  "text-[9px] md:text-[10px] font-bold uppercase tracking-widest border-none px-2 py-0.5",
                                  isCritical ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                                )}>
                                  {product.isDoseControl && product.linkedProductId 
                                    ? `${possibleDoses} DOSES` 
                                    : `${(product.stock || 0)} UN.`}
                                </Badge>
                                {product.isDoseControl && !product.linkedProductId && (
                                  <p className="text-[8px] font-mono font-bold text-primary/60">
                                    {(product.currentBottleVolume || 0)}ml REST.
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 md:gap-2 ml-0 sm:ml-4">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                aria-label="Editar Produto"
                                title="Editar Produto"
                                onClick={() => openEditProduct(product)} 
                                className="w-8 h-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-500 transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                aria-label="Excluir Produto"
                                title="Excluir Produto"
                                onClick={() => {
                                  setProductToDelete(product);
                                  setIsDeleteConfirmOpen(true);
                                }} 
                                className="w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
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
