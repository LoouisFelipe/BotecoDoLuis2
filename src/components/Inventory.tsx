import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
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
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Textarea } from './ui/textarea';

export function Inventory({ user, setActiveTab }: { user: UserProfile, setActiveTab: (tab: string) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'critical'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
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
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));

    return () => {
      unsubProducts();
      unsubCategories();
    };
  }, []);

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

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStock = stockFilter === 'critical' ? (p.stock || 0) <= (p.minStock || 5) : true;
    const matchesCategory = categoryFilter === 'all' ? true : p.categoryId === categoryFilter;
    return matchesSearch && matchesStock && matchesCategory;
  });

  return (
    <div className="space-y-8">
      {/* Inventory Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className={cn(
            "bg-card border-border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
            stockFilter === 'critical' && "ring-2 ring-red-500/50 bg-red-500/5"
          )}
          onClick={() => setStockFilter(stockFilter === 'critical' ? 'all' : 'critical')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Estoque Crítico</p>
              <p className="text-sm font-black uppercase tracking-tighter">
                {products.filter(p => (p.stock || 0) <= (p.minStock || 5)).length} Itens em Alerta
              </p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "bg-card border-border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
            stockFilter === 'all' && !search && "ring-2 ring-blue-500/50 bg-blue-500/5"
          )}
          onClick={() => {
            setStockFilter('all');
            setSearch('');
          }}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Total de Produtos</p>
              <p className="text-sm font-black uppercase tracking-tighter">{products.length} Cadastrados</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-card border-border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => setActiveTab('finances')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Valor em Estoque</p>
              <p className="text-sm font-black uppercase tracking-tighter">
                R$ {products.reduce((sum, p) => sum + ((p.cost || 0) * (p.stock || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
        <div className="relative flex-1 w-full max-w-2xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="PESQUISAR PRODUTO..." 
            className="pl-10 md:pl-12 h-12 md:h-14 bg-card/50 border-border rounded-xl text-xs md:text-sm font-bold tracking-widest focus:ring-primary/20 focus:border-primary transition-all"
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

          <Dialog open={isProductModalOpen} onOpenChange={(open) => {
            setIsProductModalOpen(open);
            if (!open) resetProductForm();
          }}>
            <DialogTrigger
              nativeButton={true}
              render={
                <Button 
                  aria-label="Cadastrar Novo Produto"
                  className="flex-1 md:flex-none h-12 md:h-14 px-4 md:px-8 rounded-xl gap-2 md:gap-3 font-bold tracking-widest uppercase shadow-lg shadow-primary/20 text-[10px] md:text-sm"
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                  Novo Produto
                </Button>
              }
            />
            <DialogContent className="bg-[#0b1224] border-border max-w-2xl text-white p-0 overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]">
              <div className="p-6 md:p-8 border-b border-border/50 relative flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                    <Package className="w-5 h-5 md:w-7 md:h-7 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-1">
                      {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                    </DialogTitle>
                    <p className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-primary/60 flex items-center gap-2">
                      <Settings className="w-3 h-3" /> Configuração do Inventário
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsProductModalOpen(false)}
                  aria-label="Fechar"
                  className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                <div className="p-8 space-y-10">
                  {/* Identificação */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <h4 className="text-lg font-bold tracking-tight text-white shrink-0">Identificação</h4>
                      <div className="h-px bg-border/50 flex-1" />
                    </div>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground ml-1">Nome do Produto</label>
                        <Combobox 
                          options={Array.from(new Set(products.map(p => p.name)))}
                          value={productName}
                          onSelect={setProductName}
                          placeholder="Selecione ou digite o nome"
                          allowCustom={true}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground ml-1">Categoria</label>
                          <Combobox 
                            options={categories.map(c => ({ label: c.name, value: c.id }))}
                            value={productCategoryId}
                            onSelect={setProductCategoryId}
                            placeholder="Selecione ou crie uma categoria"
                            allowCustom={true}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground ml-1">Subcategoria (Opcional)</label>
                          <Combobox 
                            options={Array.from(new Set(products.filter(p => p.subcategory).map(p => p.subcategory!)))}
                            value={productSubcategory}
                            onSelect={setProductSubcategory}
                            placeholder="Selecione ou crie uma subcategoria"
                            allowCustom={true}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground ml-1">Descrição (Opcional)</label>
                        <Textarea 
                          className="min-h-[100px] bg-[#111827]/50 border-border focus:ring-primary/20 focus:border-primary text-sm rounded-xl resize-none"
                          value={productDescription}
                          onChange={(e) => setProductDescription(e.target.value)}
                          placeholder="Descrição para o cardápio..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preços e Estoque */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <h4 className="text-lg font-bold tracking-tight text-white shrink-0">Preços e Estoque</h4>
                      <div className="h-px bg-border/50 flex-1" />
                    </div>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground ml-1">Como este produto é vendido?</label>
                        <Select value={productUnit} onValueChange={setProductUnit}>
                          <SelectTrigger className="h-14 bg-[#111827]/50 border-border text-sm font-medium rounded-xl">
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0b1224] border-border">
                            <SelectGroup>
                              <SelectLabel className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground px-2 py-1.5">Geral</SelectLabel>
                              <SelectItem value="Por Unidade">Por Unidade</SelectItem>
                              <SelectItem value="Por Peso (Kg/g)">Por Peso (Kg/g)</SelectItem>
                            </SelectGroup>
                            <SelectGroup>
                              <SelectLabel className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground px-2 py-1.5">Bebidas / Doses</SelectLabel>
                              <SelectItem value="Por Dose (Bebidas)">Por Dose (Bebidas)</SelectItem>
                              <SelectItem value="Dose Simples (50ml)">Dose Simples (50ml)</SelectItem>
                              <SelectItem value="Dose Dupla (100ml)">Dose Dupla (100ml)</SelectItem>
                              <SelectItem value="Dose (30ml)">Dose (30ml)</SelectItem>
                              <SelectItem value="Dose (Personalizada)">Dose (Personalizada)</SelectItem>
                              <SelectItem value="Garrafa / Inteiro">Garrafa / Inteiro</SelectItem>
                            </SelectGroup>
                            <SelectGroup>
                              <SelectLabel className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground px-2 py-1.5">Alimentação</SelectLabel>
                              <SelectItem value="Por Porção (Pratos)">Por Porção (Pratos)</SelectItem>
                              <SelectItem value="Unidade (Salgado/Doce)">Unidade (Salgado/Doce)</SelectItem>
                            </SelectGroup>
                            <SelectGroup>
                              <SelectLabel className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground px-2 py-1.5">Outros</SelectLabel>
                              <SelectItem value="Jogo / Entretenimento">Jogo / Entretenimento</SelectItem>
                              <SelectItem value="Serviço / Valor Aberto">Serviço / Valor Aberto</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground ml-1">Preço de Custo (R$)</label>
                          <Input 
                            type="number"
                            step="0.01"
                            className="h-14 bg-[#111827]/50 border-border focus:ring-primary/20 focus:border-primary text-sm font-medium rounded-xl"
                            value={productCost}
                            onChange={(e) => setProductCost(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground ml-1">Estoque (Unidades)</label>
                          <Input 
                            type="number"
                            className="h-14 bg-[#111827]/50 border-border focus:ring-primary/20 focus:border-primary text-sm font-medium rounded-xl"
                            value={productStock}
                            onChange={(e) => setProductStock(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground ml-1">Alerta de Estoque Mínimo (Opcional)</label>
                        <Input 
                          type="number"
                          className="h-14 bg-[#111827]/50 border-border focus:ring-primary/20 focus:border-primary text-sm font-medium rounded-xl"
                          value={productMinStock}
                          onChange={(e) => setProductMinStock(e.target.value)}
                          placeholder="Nº de unidades/medida"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground ml-1">Preço de Venda (R$)</label>
                          <Input 
                            type="number"
                            step="0.01"
                            className="h-14 bg-[#111827]/50 border-border focus:ring-primary/20 focus:border-primary text-sm font-medium rounded-xl"
                            value={productPrice}
                            onChange={(e) => setProductPrice(e.target.value)}
                            placeholder="0"
                            disabled={isOpenValue}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground ml-1">Valor Aberto?</label>
                          <Button
                            variant={isOpenValue ? "default" : "outline"}
                            onClick={() => setIsOpenValue(!isOpenValue)}
                            className={cn(
                              "h-14 w-full rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all",
                              isOpenValue ? "bg-blue-600 hover:bg-blue-700" : "border-border hover:bg-white/5"
                            )}
                          >
                            {isOpenValue ? (
                              <div className="flex items-center gap-2">
                                <Check className="w-4 h-4" /> Ativado
                              </div>
                            ) : "Desativado"}
                          </Button>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-widest ml-1">Definir preço no momento da venda</p>
                        </div>
                      </div>

                      {/* Controle de Doses */}
                      <div className="space-y-6 pt-6 border-t border-border/30">
                        <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/10">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                              <FlaskConical className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">Controle de Doses / Volume</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Abater do estoque por ML</p>
                            </div>
                          </div>
                          <Button
                            variant={isDoseControl ? "default" : "outline"}
                            size="sm"
                            onClick={() => setIsDoseControl(!isDoseControl)}
                            className={cn(
                              "h-10 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all",
                              isDoseControl ? "bg-primary hover:bg-primary/90" : "border-border hover:bg-white/5"
                            )}
                          >
                            {isDoseControl ? "Ativado" : "Desativado"}
                          </Button>
                        </div>

                        {isDoseControl && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6 p-6 bg-[#111827]/30 rounded-2xl border border-border/50"
                          >
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground ml-1">Este produto é:</label>
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  variant={!linkedProductId ? "default" : "outline"}
                                  onClick={() => setLinkedProductId('')}
                                  className="h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                                >
                                  Garrafa
                                </Button>
                                <Button
                                  variant={linkedProductId ? "default" : "outline"}
                                  onClick={() => {
                                    const firstBottle = products.find(p => p.isDoseControl && !p.linkedProductId);
                                    if (firstBottle) setLinkedProductId(firstBottle.id);
                                  }}
                                  className="h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                                >
                                  Dose
                                </Button>
                              </div>
                            </div>

                            {!linkedProductId ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-muted-foreground ml-1 flex items-center gap-2">
                                    <Droplets className="w-3 h-3 text-primary" /> Volume Total (ml)
                                  </label>
                                  <Input 
                                    type="number"
                                    min="0"
                                    className="h-14 bg-[#111827]/50 border-border focus:ring-primary/20 focus:border-primary text-sm font-medium rounded-xl"
                                    value={volumePerUnit}
                                    onChange={(e) => setVolumePerUnit(e.target.value)}
                                    placeholder="Ex: 1000"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-muted-foreground ml-1 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <FlaskConical className="w-3 h-3 text-primary" /> Volume Atual (ml)
                                    </div>
                                    {volumePerUnit && (
                                      <button 
                                        type="button"
                                        onClick={() => setCurrentBottleVolume(volumePerUnit)}
                                        className="text-[9px] font-bold text-primary hover:underline uppercase tracking-widest"
                                      >
                                        Resetar p/ Cheia
                                      </button>
                                    )}
                                  </label>
                                  <Input 
                                    type="number"
                                    min="0"
                                    className="h-14 bg-[#111827]/50 border-border focus:ring-primary/20 focus:border-primary text-sm font-medium rounded-xl"
                                    value={currentBottleVolume}
                                    onChange={(e) => setCurrentBottleVolume(e.target.value)}
                                    placeholder="Ex: 998"
                                  />
                                </div>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-widest ml-1 md:col-span-2">
                                  Volume total é o que reseta ao abrir nova garrafa. Volume atual é o que resta na garrafa aberta agora.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-muted-foreground ml-1">Garrafa de Origem</label>
                                  <Select value={linkedProductId} onValueChange={setLinkedProductId}>
                                    <SelectTrigger className="h-14 bg-[#111827]/50 border-border text-sm font-medium rounded-xl">
                                      <SelectValue placeholder="Selecionar Garrafa" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0b1224] border-border">
                                      {products
                                        .filter(p => p.isDoseControl && !p.linkedProductId && p.id !== editingProduct?.id)
                                        .map(p => (
                                          <SelectItem key={p.id} value={p.id} className="font-bold uppercase tracking-widest text-[10px] py-3">
                                            {p.name} ({p.currentBottleVolume || p.volumePerUnit}ml rest.)
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-muted-foreground ml-1 flex items-center gap-2">
                                    <Wine className="w-3 h-3 text-primary" /> Tamanho Dose (ml)
                                  </label>
                                  <Input 
                                    type="number"
                                    min="0"
                                    className="h-14 bg-[#111827]/50 border-border focus:ring-primary/20 focus:border-primary text-sm font-medium rounded-xl"
                                    value={doseSize}
                                    onChange={(e) => setDoseSize(e.target.value)}
                                    placeholder="Ex: 50"
                                  />
                                </div>
                                <div className="md:col-span-2 p-4 bg-primary/5 border border-primary/10 rounded-xl">
                                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                    <Info className="w-3 h-3" /> Resumo da Configuração
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Ao vender este produto ({productName || 'Sem nome'}), o sistema cobrará 
                                    <span className="text-white font-bold mx-1">
                                      {isOpenValue ? 'Valor Aberto' : `R$ ${parseFloat(productPrice || '0').toFixed(2)}`}
                                    </span> 
                                    e abaterá 
                                    <span className="text-white font-bold mx-1">
                                      {doseSize || '0'}ml
                                    </span> 
                                    do estoque da garrafa vinculada.
                                  </p>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="p-8 border-t border-border/50 bg-[#0b1224] gap-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsProductModalOpen(false)} 
                  disabled={isSavingProduct}
                  className="h-14 px-8 font-bold uppercase tracking-widest text-muted-foreground hover:text-white hover:bg-white/5"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveProduct} 
                  disabled={isSavingProduct}
                  className="h-14 px-10 font-bold uppercase tracking-widest bg-[#0070f3] hover:bg-[#0070f3]/90 shadow-[0_0_20px_rgba(0,112,243,0.3)] rounded-xl"
                >
                  {isSavingProduct ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </div>
                  ) : (
                    editingProduct ? 'Salvar Alterações' : 'Salvar Produto'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                                                (product.stock || 0) <= 5 ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                                              )}>
                                                {(product.stock || 0)} UN.
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
                                  (product.stock || 0) <= 5 ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                                )}>
                                  {(product.stock || 0)} UN.
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

function Combobox({ 
  options, 
  value, 
  onSelect, 
  placeholder, 
  allowCustom = false 
}: { 
  options: (string | { label: string, value: string })[], 
  value: string, 
  onSelect: (val: string) => void, 
  placeholder: string,
  allowCustom?: boolean
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const normalizedOptions = options.map(opt => 
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  const selectedOption = normalizedOptions.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : (allowCustom ? value : "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-14 w-full justify-between bg-[#111827]/50 border-border hover:bg-[#111827]/70 text-sm font-medium rounded-xl"
          >
            <span className={cn("truncate", !displayValue && "text-muted-foreground")}>
              {displayValue || placeholder}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-[#0b1224] border-border shadow-2xl">
        <Command className="bg-transparent">
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput 
              placeholder="Pesquisar ou criar..." 
              value={search}
              onValueChange={setSearch}
              className="h-12 bg-transparent outline-none border-none focus:ring-0"
            />
          </div>
          <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
            <CommandEmpty className="py-6 text-center text-sm">
              {allowCustom && search ? (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2 h-10 px-4 hover:bg-primary/10 text-primary font-bold"
                  onClick={() => {
                    onSelect(search);
                    setOpen(false);
                  }}
                >
                  <Plus className="w-4 h-4" /> Criar "{search}"
                </Button>
              ) : "Nenhum resultado encontrado."}
            </CommandEmpty>
            <CommandGroup>
              {allowCustom && search && !normalizedOptions.some(opt => opt.label.toLowerCase() === search.toLowerCase()) && (
                <CommandItem
                  value={search}
                  onSelect={() => {
                    onSelect(search);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-3 cursor-pointer text-primary font-bold hover:bg-primary/10"
                >
                  <Plus className="w-4 h-4" /> Criar "{search}"
                </CommandItem>
              )}
              {normalizedOptions.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onSelect(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 cursor-pointer transition-colors",
                    value === opt.value ? "bg-[#00f2c3] text-black font-bold" : "hover:bg-white/5"
                  )}
                >
                  {opt.label}
                  {value === opt.value && <Check className="h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
