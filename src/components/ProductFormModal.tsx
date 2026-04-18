import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, updateDoc, addDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Product, Category } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from './ui/dialog';
import { Combobox } from './ui/combobox';
import { Info, Plus, Settings, Check, Droplets, FlaskConical, Package, Wine, X, DollarSign, TrendingUp, History } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function ProductFormModal({
  isOpen,
  onOpenChange,
  editingProduct,
  initialName,
  products,
  categories,
  onSaveSuccess
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct?: Product | null;
  initialName?: string;
  products: Product[];
  categories: Category[];
  onSaveSuccess?: (product: Product & { id: string }) => void;
}) {
  const [productModalTab, setProductModalTab] = useState<'identificacao' | 'venda_estoque'>('identificacao');
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Form states
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

  // Auto-configure dose control based on subcategory
  useEffect(() => {
    if (productSubcategory?.toLowerCase() === 'doses' || productSubcategory?.toLowerCase() === 'dose') {
      if (!isDoseControl) {
        setIsDoseControl(true);
        // If it's a new product or doesn't have a linked product yet, 
        // default to "Dose Vinculada" if bottles exist
        if (!linkedProductId && products.some(p => p.isDoseControl && !p.linkedProductId)) {
          const firstBottle = products.find(p => p.isDoseControl && !p.linkedProductId);
          if (firstBottle) setLinkedProductId(firstBottle.id);
        }
      }
    }
  }, [productSubcategory, products]);

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

  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        setProductName(editingProduct.name || '');
        setProductPrice((editingProduct.price || 0).toString());
        setProductCost((editingProduct.cost || 0).toString());
        setProductStock((editingProduct.stock || 0).toString());
        setProductMinStock((editingProduct.minStock || 0).toString());
        setProductUnit(editingProduct.unit || 'Por Unidade');
        setProductCategoryId(editingProduct.categoryId || '');
        setProductSubcategory(editingProduct.subcategory || '');
        setProductDescription(editingProduct.description || '');
        setIsOpenValue(editingProduct.isOpenValue || false);
        setIsDoseControl(editingProduct.isDoseControl || false);
        setVolumePerUnit((editingProduct.volumePerUnit || '').toString());
        setCurrentBottleVolume((editingProduct.currentBottleVolume || '').toString());
        setLinkedProductId(editingProduct.linkedProductId || '');
        setDoseSize((editingProduct.doseSize || '').toString());
      } else {
        setProductName(initialName || '');
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
      }
    }
  }, [isOpen, editingProduct, initialName]);

  const handleSaveProduct = async () => {
    if (!productName) {
      toast.error('O nome do produto é obrigatório');
      return;
    }
    
    setIsSavingProduct(true);
    
    let finalCategoryId = productCategoryId || 'Geral';

    // Check if the category is a new one (doesn't match an existing ID)
    const existingCategory = categories.find(c => c.id === finalCategoryId || c.name.toLowerCase() === finalCategoryId.toLowerCase());
    
    if (!existingCategory) {
      try {
        const catRef = await addDoc(collection(db, 'categories'), {
          name: finalCategoryId,
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
      subcategory: productSubcategory || null,
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
      let finalProduct: any;
      if (editingProduct && editingProduct.id) {
        await updateDoc(doc(db, 'products', editingProduct.id), data);
        finalProduct = { ...data, id: editingProduct.id };
        toast.success('Produto atualizado');
      } else {
        const pRef = await addDoc(collection(db, 'products'), data);
        finalProduct = { ...data, id: pRef.id };
        toast.success('Produto adicionado');
      }
      
      onOpenChange(false);
      if (onSaveSuccess) onSaveSuccess(finalProduct as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    } finally {
      setIsSavingProduct(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0b1224] border-border max-w-2xl text-white p-0 overflow-hidden flex flex-col h-[90vh] md:max-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/5">
        <div className="p-6 md:p-8 border-b border-white/5 relative flex-shrink-0 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.15)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50" />
              <Package className="w-6 h-6 md:w-8 md:h-8 text-primary relative z-10 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none mb-1.5 flex items-center gap-3">
                {editingProduct ? 'Editar' : 'Novo'} 
                <span className="text-primary">item</span>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground">
                  Inventário <span className="text-white/40 mx-1">/</span> {productModalTab === 'identificacao' ? 'ID' : 'PDV & Estoque'}
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-8 right-8 text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex border-b border-white/5 bg-black/20">
          {[
            { id: 'identificacao', label: '1. Identificação', icon: Package },
            { id: 'venda_estoque', label: '2. Venda & Estoque', icon: DollarSign }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setProductModalTab(tab.id as any)}
              className={cn(
                "flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center justify-center gap-2",
                productModalTab === tab.id ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon className={cn("w-3.5 h-3.5", productModalTab === tab.id ? "text-primary" : "text-muted-foreground/50")} />
              <span>{tab.label}</span>
              {productModalTab === tab.id && (
                <motion.div layoutId="productTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              )}
            </button>
          ))}
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          <div className="p-6 md:p-8">
            {/* Identificação */}
            {productModalTab === 'identificacao' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-white">Cadastro de Produto</h4>
                    <p className="text-[10px] text-muted-foreground uppercase font-black">Identifique o item no sistema</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome do Produto</label>
                  <Combobox 
                    options={Array.from(new Set(products.map(p => p.name).filter(Boolean)))}
                    value={productName}
                    onSelect={setProductName}
                    placeholder="Selecione ou digite o nome"
                    allowCustom={true}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Categoria Principal</label>
                    <Combobox 
                      options={categories.map(c => ({ label: c.name, value: c.id }))}
                      value={productCategoryId}
                      onSelect={setProductCategoryId}
                      placeholder="Cervejas, Destilados..."
                      allowCustom={true}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subcategoria / Tag</label>
                    <Combobox 
                      options={Array.from(new Set(products.filter(p => p.subcategory).map(p => p.subcategory).filter(Boolean))) as string[]}
                      value={productSubcategory}
                      onSelect={setProductSubcategory}
                      placeholder="Doses, Garrafas, Long Neck..."
                      allowCustom={true}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descrição Comercial (Opcional)</label>
                  <Textarea 
                    className="min-h-[100px] bg-[#111827]/50 border-white/5 focus:border-primary text-sm rounded-xl resize-none font-medium leading-relaxed"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Essa descrição aparecerá para o garçom e no cardápio..."
                  />
                </div>
              </div>
            )}

            {/* Venda e Estoque (Unified) */}
            {productModalTab === 'venda_estoque' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* Cabeçalho da Aba Unificada: Seleção do Modelo de Negócio */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setIsDoseControl(false);
                      setLinkedProductId('');
                      if (productUnit === 'Garrafa / Inteiro') setProductUnit('Por Unidade');
                    }}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all",
                      !isDoseControl 
                        ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(59,130,246,0.15)]" 
                        : "bg-white/[0.02] border-white/5 hover:bg-white/5"
                    )}
                  >
                    <Package className={cn("w-5 h-5", !isDoseControl ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-center">
                      <p className={cn("text-[9px] font-black uppercase tracking-widest", !isDoseControl ? "text-primary" : "text-muted-foreground")}>Item Simples</p>
                      <p className="text-[8px] font-medium text-muted-foreground/60 uppercase">Lata, Porção, Cigarro</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsDoseControl(true);
                      setLinkedProductId('');
                      setProductUnit('Garrafa / Inteiro');
                      setProductSubcategory('Garrafas');
                    }}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all",
                      (isDoseControl && !linkedProductId) 
                        ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(59,130,246,0.15)]" 
                        : "bg-white/[0.02] border-white/5 hover:bg-white/5"
                    )}
                  >
                    <FlaskConical className={cn("w-5 h-5", (isDoseControl && !linkedProductId) ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-center">
                      <p className={cn("text-[9px] font-black uppercase tracking-widest", (isDoseControl && !linkedProductId) ? "text-primary" : "text-muted-foreground")}>Garrafa Base</p>
                      <p className="text-[8px] font-medium text-muted-foreground/60 uppercase">Estoque de ML | Destilado</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsDoseControl(true);
                      setProductUnit('Dose Simples (50ml)');
                      setProductSubcategory('Doses');
                      if (!linkedProductId && products.some(p => p.isDoseControl && !p.linkedProductId)) {
                        const firstBottle = products.find(p => p.isDoseControl && !p.linkedProductId);
                        if (firstBottle) setLinkedProductId(firstBottle.id);
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all",
                      (isDoseControl && linkedProductId) 
                        ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(59,130,246,0.15)]" 
                        : "bg-white/[0.02] border-white/5 hover:bg-white/5"
                    )}
                  >
                    <Wine className={cn("w-5 h-5", (isDoseControl && linkedProductId) ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-center">
                      <p className={cn("text-[9px] font-black uppercase tracking-widest", (isDoseControl && linkedProductId) ? "text-primary" : "text-muted-foreground")}>Dose Vinculada</p>
                      <p className="text-[8px] font-medium text-muted-foreground/60 uppercase">Venda Fracionada</p>
                    </div>
                  </button>
                </div>

                {/* Seção 1: Configurações de Gestão (Discretas) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80 group-hover:opacity-100 transition-opacity">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Preço de Custo (R$)</label>
                    <Input 
                      type="number"
                      step="0.01"
                      className="h-10 bg-white/[0.02] border-white/5 rounded-lg font-bold text-xs"
                      value={productCost}
                      onChange={(e) => setProductCost(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Alerta de Estoque Mínimo</label>
                    <Input 
                      type="number"
                      className="h-10 bg-white/[0.02] border-white/5 rounded-lg font-bold text-xs"
                      value={productMinStock}
                      onChange={(e) => setProductMinStock(e.target.value)}
                      placeholder="Ex: 5"
                    />
                  </div>
                </div>

                {/* Seção Dinâmica Baseada no isDoseControl e linkedProductId */}
                {(isDoseControl && !linkedProductId) ? (
                  /* MODO GARRAFA BASE (Velho Barreiro, Smirnoff, etc) */
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl space-y-6">
                      <div className="flex items-center gap-3">
                        <FlaskConical className="w-5 h-5 text-primary" />
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Configuração de Inventário da Garrafa</h4>
                          <p className="text-[9px] text-muted-foreground uppercase font-medium">Controle por ML e Unidade</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Garrafas Fechadas (Estoque)</label>
                          <Input 
                            type="number"
                            className="h-12 bg-black/40 border-white/10 rounded-xl font-bold"
                            value={productStock}
                            onChange={(e) => setProductStock(e.target.value)}
                            placeholder="Ex: 3"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Capacidade da Garrafa (ML)</label>
                          <div className="relative">
                            <Input 
                              type="number"
                              className="h-12 bg-black/40 border-white/10 focus:border-primary rounded-xl font-bold pl-4"
                              value={volumePerUnit}
                              onChange={(e) => setVolumePerUnit(e.target.value)}
                              placeholder="Ex: 910"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground">ML</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">ML Restante na Garrafa Aberta</label>
                          <Badge className="bg-primary/20 text-primary border-primary/20 text-[8px] font-black tracking-widest">EM USO NO BALCÃO</Badge>
                        </div>
                        <div className="relative">
                          <Droplets className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                          <Input 
                            type="number"
                            className="h-14 bg-black/40 border-white/10 focus:border-primary text-xl font-black pl-12 rounded-xl text-primary"
                            value={currentBottleVolume}
                            onChange={(e) => setCurrentBottleVolume(e.target.value)}
                            placeholder="Ex: 450"
                          />
                        </div>
                        <p className="text-[9px] text-muted-foreground/60 uppercase font-medium px-1 italic">
                          O sistema baixará as doses deste volume. Ao chegar a 0, abrirá automaticamente uma das {productStock || '0'} fechadas.
                        </p>
                      </div>

                      {/* Configuração de Venda da Garrafa Inteira */}
                      <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preço de Venda (Garrafa Inteira)</label>
                          <p className="text-[8px] text-muted-foreground uppercase font-bold italic">Deixe 0 se não vender a garrafa fechada</p>
                        </div>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-green-500 text-lg">R$</span>
                          <Input 
                            type="number"
                            step="0.01"
                            className="h-14 bg-green-500/5 border-green-500/10 focus:border-green-500/30 text-xl font-black pl-12 rounded-xl text-green-500"
                            value={productPrice}
                            onChange={(e) => setProductPrice(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Doses Vinculadas (Apenas Edição) */}
                    {editingProduct && products.some(p => p.linkedProductId === editingProduct.id) && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                             Formatos de Dose Configurados
                          </h4>
                          <Badge className="bg-primary/10 text-primary">{products.filter(p => p.linkedProductId === editingProduct.id).length} FORMATOS</Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {products
                            .filter(p => p.linkedProductId === editingProduct.id)
                            .map(dose => (
                              <div key={dose.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                                <div className="flex items-center gap-3">
                                  <Wine className="w-4 h-4 text-primary" />
                                  <div>
                                    <p className="text-xs font-black uppercase tracking-tight">{dose.name}</p>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">{dose.doseSize}ml — R$ {dose.price.toFixed(2)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    
                    {!editingProduct && (
                      <div className="p-5 bg-primary/5 border border-dashed border-primary/20 rounded-2xl">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-2">
                          <Plus className="w-3 h-3" /> Dica Pro
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase leading-relaxed font-bold">
                          Após salvar esta garrafa (ex: Velho Barreiro), você poderá cadastrar os diferentes formatos de doses (Dose Simples, Dose Dupla) vinculados a ela.
                        </p>
                      </div>
                    )}
                  </div>
                ) : !isDoseControl ? (
                  /* MODO PRODUTO PADRÃO (Latas, Porções, etc) */
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-500" /> Configuração de Venda
                        </h4>
                        <div className="flex items-center gap-2">
                          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Valor Aberto?</label>
                          <button 
                            type="button"
                            onClick={() => setIsOpenValue(!isOpenValue)}
                            className={cn(
                              "w-8 h-4 rounded-full transition-all relative",
                              isOpenValue ? "bg-green-500" : "bg-white/10"
                            )}
                          >
                            <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", isOpenValue ? "left-4.5" : "left-0.5")} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Formato de Venda</label>
                          <Select value={productUnit} onValueChange={setProductUnit}>
                            <SelectTrigger className="h-14 bg-black/40 border-white/10 rounded-xl">
                              <SelectValue placeholder="Como o produto é vendido?" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0b1224] border-white/10">
                              <SelectGroup>
                                <SelectLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-1.5">Geral</SelectLabel>
                                <SelectItem value="Por Unidade">Por Unidade / Lata</SelectItem>
                                <SelectItem value="Garrafa / Inteiro">Garrafa Completa</SelectItem>
                                <SelectItem value="Por Peso (Kg/g)">Por Peso</SelectItem>
                              </SelectGroup>
                              <SelectGroup>
                                <SelectLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-1.5">Outros</SelectLabel>
                                <SelectItem value="Por Porção (Pratos)">Por Porção</SelectItem>
                                <SelectItem value="Serviço / Valor Aberto">Serviço Especial</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-green-500 ml-1">Preço de Venda (R$)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-green-500 text-lg">R$</span>
                            <Input 
                              type="number"
                              step="0.01"
                              className="h-14 bg-green-500/5 border-green-500/20 focus:border-green-500/50 text-xl font-black pl-12 rounded-xl text-green-500"
                              value={productPrice}
                              onChange={(e) => setProductPrice(e.target.value)}
                              placeholder="0.00"
                              disabled={isOpenValue}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {!isDoseControl && !linkedProductId && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Garrafas Fechadas no Estoque</label>
                            <Input 
                              type="number"
                              className="h-12 bg-black/40 border-white/10 rounded-xl font-bold"
                              value={productStock}
                              onChange={(e) => setProductStock(e.target.value)}
                              placeholder="0"
                            />
                          </div>
                          {productUnit === 'Garrafa / Inteiro' && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Volume da Garrafa (ML)</label>
                              <Input 
                                type="number"
                                className="h-12 bg-black/40 border-white/10 rounded-xl font-bold"
                                value={volumePerUnit}
                                onChange={(e) => setVolumePerUnit(e.target.value)}
                                placeholder="Ex: 910"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Conteúdo de ML para Garrafas Base - Refinado */}
                    {/* (This section already handled by the 3-way toggle above) */}
                  </div>
                ) : (
                  /* MODO DOSE FRACIONADA (Linked) */
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="space-y-8">
                        {/* Passo 1: Garrafa de Origem */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary">1</div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vincular a uma Garrafa</label>
                          </div>
                          <Select value={linkedProductId} onValueChange={setLinkedProductId}>
                            <SelectTrigger className="h-14 bg-black/40 border-white/10 rounded-xl">
                              <SelectValue placeholder="Selecione a garrafa de estoque">
                                {products.find(p => p.id === linkedProductId)?.name}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-[#0b1224] border-white/10 max-h-[300px]">
                              {products
                                .filter(p => !p.linkedProductId && (p.unit === 'Garrafa / Inteiro' || (p.volumePerUnit && p.volumePerUnit > 0)))
                                .map(p => (
                                  <SelectItem key={p.id} value={p.id} className="font-bold uppercase tracking-widest text-[10px] py-3">
                                    {p.name} ({p.currentBottleVolume || p.volumePerUnit}ml disponíveis)
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Passo 2: Formato de Venda e Tamanho */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary">2</div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Formato da Dose</label>
                            </div>
                            <Select value={productUnit} onValueChange={setProductUnit}>
                              <SelectTrigger className="h-14 bg-black/40 border-white/10 rounded-xl">
                                <SelectValue placeholder="Padrão do Boteco" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0b1224] border-white/10">
                                <SelectItem value="Degustação (20ml)">Degustação (20ml)</SelectItem>
                                <SelectItem value="Shot Standard (30ml)">Shot Standard (30ml)</SelectItem>
                                <SelectItem value="Dose Curta (40ml)">Dose Curta (40ml)</SelectItem>
                                <SelectItem value="Dose Simples (50ml)">Dose Simples (50ml)</SelectItem>
                                <SelectItem value="Dose Generosa (60ml)">Dose Generosa (60ml)</SelectItem>
                                <SelectItem value="Shot Duplo (70ml)">Shot Duplo (70ml)</SelectItem>
                                <SelectItem value="Dose Dupla (100ml)">Dose Dupla (100ml)</SelectItem>
                                <SelectItem value="Copo Americano (190ml)">Copo Americano (190ml)</SelectItem>
                                <SelectItem value="Long Drink (250ml)">Long Drink (250ml)</SelectItem>
                                <SelectItem value="Dose (Personalizada)">Outro Formato</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-8">Baixa no ML exato</label>
                            <div className="relative">
                              <Wine className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                              <Input 
                                type="number"
                                min="0"
                                className="h-14 bg-black/40 border-white/10 focus:border-primary text-sm font-black pl-11 rounded-xl"
                                value={doseSize}
                                onChange={(e) => setDoseSize(e.target.value)}
                                placeholder="Ex: 50"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Passo 3: Preço de Venda */}
                        <div className="space-y-3 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-[10px] font-black text-green-500">3</div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preço de Venda da Dose</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Valor Aberto?</label>
                              <button 
                                onClick={() => setIsOpenValue(!isOpenValue)}
                                className={cn(
                                  "w-8 h-4 rounded-full transition-all relative",
                                  isOpenValue ? "bg-green-500" : "bg-white/10"
                                )}
                              >
                                <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", isOpenValue ? "left-4.5" : "left-0.5")} />
                              </button>
                            </div>
                          </div>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-green-500 text-lg">R$</span>
                            <Input 
                              type="number"
                              step="0.01"
                              className="h-16 bg-black/40 border-green-500/20 focus:border-green-500/50 text-2xl font-black pl-14 rounded-xl text-green-500 shadow-inner"
                              value={productPrice}
                              onChange={(e) => setProductPrice(e.target.value)}
                              placeholder="0.00"
                              disabled={isOpenValue}
                            />
                          </div>
                        </div>

                        {/* Resumo Dinâmico */}
                        <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Info className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Impacto no Estoque e Caixa</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Ao bipar uma <span className="text-white font-bold">{productName || 'Dose'}</span>, o sistema irá somar 
                              <span className="text-green-400 font-bold mx-1">
                                {isOpenValue ? 'Preço Aberto' : `R$ ${parseFloat(productPrice || '0').toFixed(2)}`}
                              </span> 
                              ao caixa e abater <span className="text-white font-bold">{doseSize || '0'}ml</span> direto da garrafa 
                              <span className="text-primary font-bold ml-1">
                                {products.find(p => p.id === linkedProductId)?.name || '...'}
                              </span>.
                            </p>
                          </div>
                        </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 md:p-6 border-t border-white/5 bg-[#0b1224]/80 backdrop-blur-md flex items-center gap-3 mt-auto">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isSavingProduct}
            className="flex-1 h-12 font-bold uppercase tracking-widest text-[9px] text-muted-foreground hover:text-white hover:bg-white/5 border-white/10"
          >
            Sair sem salvar
          </Button>
          <Button 
            onClick={handleSaveProduct} 
            disabled={isSavingProduct}
            className="flex-[2] h-12 font-black uppercase tracking-[0.15em] text-[10px] bg-[#0070f3] hover:bg-[#0070f3]/90 shadow-[0_0_20px_rgba(0,112,243,0.3)] rounded-xl border border-white/10 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            {isSavingProduct ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processando...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5" />
                <span>{editingProduct ? 'Salvar Alterações' : 'Concluir Cadastro'}</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
