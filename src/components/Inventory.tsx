import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Product, Category, UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Plus, Edit2, Trash2, Package, Tag, Search, Filter, ChevronDown, ChevronRight, Layers, Info, AlertCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn } from '../lib/utils';
import { ConfirmDialog } from './ConfirmDialog';

export function Inventory({ user }: { user: UserProfile }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
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
  const [productDescription, setProductDescription] = useState('');
  const [categoryName, setCategoryName] = useState('');

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
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));

    return () => {
      unsubProducts();
      unsubCategories();
    };
  }, []);

  const handleSaveProduct = async () => {
    if (!productName || !productPrice || !productCategoryId) return;
    
    const data = {
      name: productName,
      price: parseFloat(productPrice),
      cost: parseFloat(productCost) || 0,
      stock: parseFloat(productStock) || 0,
      categoryId: productCategoryId,
      subcategory: productSubcategory,
      description: productDescription,
      active: true
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
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName) return;
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
    }
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductName('');
    setProductPrice('');
    setProductCost('');
    setProductStock('');
    setProductCategoryId('');
    setProductSubcategory('');
    setProductDescription('');
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductName(product.name || '');
    setProductPrice((product.price || 0).toString());
    setProductCost((product.cost || 0).toString());
    setProductStock((product.stock || 0).toString());
    setProductCategoryId(product.categoryId || '');
    setProductSubcategory(product.subcategory || '');
    setProductDescription(product.description || '');
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteDoc(doc(db, 'products', productToDelete.id));
      toast.success('Produto excluído');
      setProductToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productToDelete.id}`);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Inventory Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Estoque Crítico</p>
              <p className="text-sm font-black uppercase tracking-tighter">
                {products.filter(p => (p.stock || 0) <= 5).length} Itens em Alerta
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
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

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Valor em Estoque</p>
              <p className="text-sm font-black uppercase tracking-tighter">
                R$ {products.reduce((sum, p) => sum + ((p.cost || 0) * (p.stock || 0)), 0).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative flex-1 w-full max-w-2xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="PESQUISAR PRODUTO..." 
            className="pl-12 h-14 bg-card/50 border-border rounded-xl text-sm font-bold tracking-widest focus:ring-primary/20 focus:border-primary transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
            <DialogTrigger
              nativeButton={true}
              render={
                <Button variant="outline" className="h-14 px-6 rounded-xl gap-3 font-bold tracking-widest uppercase border-border hover:bg-white/5">
                  <Tag className="w-5 h-5" />
                  Categorias
                </Button>
              }
            />
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold uppercase tracking-wider">Gerenciar Categorias</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Nova categoria..." 
                    className="h-12 bg-background border-border"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                  />
                  <Button onClick={handleSaveCategory} className="h-12 px-6 font-bold uppercase tracking-widest">Add</Button>
                </div>
                <div className="max-h-60 overflow-y-auto border border-border rounded-xl bg-background/50">
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
                <Button className="h-14 px-8 rounded-xl gap-3 font-bold tracking-widest uppercase shadow-lg shadow-primary/20">
                  <Plus className="w-5 h-5" />
                  Novo Produto
                </Button>
              }
            />
            <DialogContent className="bg-[#0b1120] border-border max-w-2xl text-white">
              <DialogHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
                      <Layers className="w-3 h-3" /> Configuração do Inventário
                    </p>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-8 py-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary/80 border-b border-border pb-2">Identificação</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Nome do Produto</label>
                      <Input 
                        className="h-14 bg-[#111827] border-border focus:ring-primary/20 focus:border-primary text-sm font-bold"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="Ex: Coca-Cola"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Categoria</label>
                        <Select value={productCategoryId} onValueChange={setProductCategoryId}>
                          <SelectTrigger className="h-14 bg-[#111827] border-border text-sm font-bold">
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#111827] border-border">
                            {categories.map((cat, idx) => (
                              <SelectItem key={`cat-select-${cat.id}-${idx}`} value={cat.id} className="uppercase font-bold tracking-widest text-xs">{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Subcategoria (Opcional)</label>
                        <Input 
                          className="h-14 bg-[#111827] border-border focus:ring-primary/20 focus:border-primary text-sm font-bold"
                          value={productSubcategory}
                          onChange={(e) => setProductSubcategory(e.target.value)}
                          placeholder="Ex: 600 ML"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Descrição (Opcional)</label>
                      <textarea 
                        className="w-full min-h-[100px] bg-[#111827] border border-border rounded-xl p-4 text-sm font-bold focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        value={productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                        placeholder="Descrição para o cardápio..."
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary/80 border-b border-border pb-2">Financeiro & Estoque</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Custo Unit. (R$)</label>
                      <Input 
                        type="number"
                        step="0.01"
                        className="h-14 bg-[#111827] border-border focus:ring-primary/20 focus:border-primary text-sm font-bold"
                        value={productCost}
                        onChange={(e) => setProductCost(e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Preço Venda (R$)</label>
                      <Input 
                        type="number"
                        step="0.01"
                        className="h-14 bg-[#111827] border-border focus:ring-primary/20 focus:border-primary text-sm font-bold"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Estoque Atual</label>
                      <Input 
                        type="number"
                        className="h-14 bg-[#111827] border-border focus:ring-primary/20 focus:border-primary text-sm font-bold"
                        value={productStock}
                        onChange={(e) => setProductStock(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {productPrice && productCost && parseFloat(productCost) > 0 && (
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex items-center justify-between animate-in fade-in zoom-in duration-300">
                      <div>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Margem de Lucro Estimada</p>
                        <p className="text-lg font-black text-primary">
                          {((parseFloat(productPrice) - parseFloat(productCost)) / parseFloat(productCost) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Lucro por Unidade</p>
                        <p className="text-lg font-black text-green-500">
                          R$ {(parseFloat(productPrice) - parseFloat(productCost)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-4">
                <Button variant="ghost" onClick={() => setIsProductModalOpen(false)} className="h-12 px-8 font-bold uppercase tracking-widest text-muted-foreground hover:text-white">Cancelar</Button>
                <Button onClick={handleSaveProduct} className="h-12 px-8 font-bold uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">Salvar Produto</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((category, catIdx) => {
          const categoryProducts = filteredProducts.filter(p => p.categoryId === category.id);
          const subcategories = Array.from(new Set(categoryProducts.map(p => p.subcategory || 'Sem Subcategoria')));
          const isExpanded = expandedCategories.includes(category.id);

          if (categoryProducts.length === 0 && search) return null;

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
                    const subProducts = categoryProducts.filter(p => (p.subcategory || 'Sem Subcategoria') === subName);
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
                                <div key={`${product.id}-${prodIdx}`} className="flex items-center justify-between p-4 bg-card/40 border border-border/30 rounded-xl hover:border-primary/30 transition-all group/item">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-border/50 group-hover/item:border-primary/30 transition-all">
                                      <Package className="w-5 h-5 text-muted-foreground group-hover/item:text-primary" />
                                    </div>
                                    <div>
                                      <h5 className="font-black uppercase tracking-tighter text-sm">{product.name}</h5>
                                      <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">{product.subcategory || category.name}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-8">
                                    <div className="hidden md:block text-right">
                                      <p className="text-[8px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Custo Unit.</p>
                                      <p className="font-mono font-bold text-xs text-muted-foreground">R$ {(product.cost || 0).toFixed(2)}</p>
                                    </div>
                                    
                                    <div className="text-right">
                                      <p className="text-[8px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Preço Venda</p>
                                      <p className="font-mono font-bold text-sm text-white">R$ {(product.price || 0).toFixed(2)}</p>
                                    </div>

                                    <div className="hidden sm:block text-right">
                                      <p className="text-[8px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Estoque</p>
                                      <Badge variant="outline" className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest border-none",
                                        (product.stock || 0) <= 5 ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                                      )}>
                                        {(product.stock || 0)} UN.
                                      </Badge>
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

                                    <div className="flex items-center gap-2 ml-4">
                                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all">
                                        <Layers className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => openEditProduct(product)}
                                        className="w-8 h-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-500 transition-all"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
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

        {/* Fallback for products without category or if categories collection is empty */}
        {(() => {
          const uncategorizedProducts = filteredProducts.filter(p => !categories.find(c => c.id === p.categoryId));
          if (uncategorizedProducts.length === 0) return null;

          return (
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
              <div className="p-6 space-y-2">
                {uncategorizedProducts.map((product, idx) => (
                  <div key={`${product.id}-${idx}`} className="flex items-center justify-between p-4 bg-card/40 border border-border/30 rounded-xl hover:border-primary/30 transition-all group/item">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-border/50 group-hover/item:border-primary/30 transition-all">
                        <Package className="w-5 h-5 text-muted-foreground group-hover/item:text-primary" />
                      </div>
                      <div>
                        <h5 className="font-black uppercase tracking-tighter text-sm">{product.name}</h5>
                        <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">{product.subcategory || 'Sem Categoria'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Preço</p>
                        <p className="text-sm font-black text-primary">R$ {(product.price || 0).toFixed(2)}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                        <Button variant="ghost" size="icon" onClick={() => openEditProduct(product)} className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          setProductToDelete(product);
                          setIsDeleteConfirmOpen(true);
                        }} className="w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {filteredProducts.length === 0 && (
          <div className="text-center py-32 bg-card/20 rounded-3xl border border-dashed border-border">
            <Package className="w-20 h-20 mx-auto mb-6 opacity-10" />
            <h3 className="text-xl font-black uppercase tracking-tighter text-muted-foreground">Nenhum produto encontrado</h3>
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground/50 mt-2">Tente ajustar sua busca ou filtros</p>
          </div>
        )}
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
