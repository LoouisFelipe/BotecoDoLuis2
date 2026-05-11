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
import { Info, Plus, Settings, Check, Droplets, FlaskConical, Package, Wine, X, DollarSign, TrendingUp, History, List, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function ProductForm({
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
  const [productModalTab, setProductModalTab] = useState<'identificacao' | 'venda_estoque' | 'ficha_tecnica' | 'controle_dose'>('identificacao');
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
  const [ingredients, setIngredients] = useState<{ productId: string; quantity: number }[]>([]);

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
        setIngredients(editingProduct.ingredients || []);
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
      ingredients: ingredients.length > 0 ? ingredients : null,
      linkedProductId: isDoseControl ? linkedProductId : '',
      doseSize: isDoseControl ? Math.max(0, parseFloat(doseSize) || 0) : 0,
      currentBottleVolume: isDoseControl && !linkedProductId 
        ? (currentBottleVolume !== '' ? Math.max(0, parseFloat(currentBottleVolume)) : (editingProduct?.currentBottleVolume ?? 0))
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
      <DialogContent className="bg-[#05070a] border-border max-w-2xl text-white p-0 overflow-hidden flex flex-col h-[90vh] md:max-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/10 rounded-[40px]">
        <div className="p-6 md:p-8 border-b border-white/10 relative flex-shrink-0 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-[20px] bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(0,112,243,0.15)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50" />
              <Package className="w-7 h-7 md:w-8 md:h-8 text-primary relative z-10" />
            </div>
            <div>
              <DialogTitle className="text-2xl md:text-3xl font-black uppercase tracking-[0.2em] leading-none mb-1.5 flex items-center gap-3 font-mono">
                {editingProduct ? 'Editar' : 'Novo'} 
                <span className="text-primary">item</span>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-muted-foreground font-mono">
                  Painel de Operação <span className="text-white/20 mx-1">/</span> {productModalTab === 'identificacao' ? 'ID' : 'PDV & Estoque'}
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-8 right-8 text-muted-foreground hover:text-white transition-colors p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex border-b border-white/10 bg-black/40">
          {[
            { id: 'identificacao', label: '1. Identificação', icon: Package },
            { id: 'venda_estoque', label: '2. Venda & Estoque', icon: DollarSign },
            { id: 'ficha_tecnica', label: '3. Ficha Técnica', icon: List },
            { id: 'controle_dose', label: '4. Controle de ML/Dose', icon: Droplets }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setProductModalTab(tab.id as any)}
              className={cn(
                "flex-1 py-6 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative flex items-center justify-center gap-2 font-mono h-16",
                productModalTab === tab.id ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon className={cn("w-4 h-4", productModalTab === tab.id ? "text-primary" : "text-muted-foreground/40")} />
              <span className="hidden sm:inline">{tab.label}</span>
              {productModalTab === tab.id && (
                <motion.div layoutId="productTabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary shadow-[0_0_20px_rgba(0,112,243,0.6)]" />
              )}
            </button>
          ))}
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          <div className="p-6 md:p-8">
            {/* Identificação */}
            {productModalTab === 'identificacao' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(0,112,243,0.1)]">
                    <Package className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white font-mono">Cadastro de Produto</h4>
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.3em]">Identificação de Ativo</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 font-mono">Nome do Produto</label>
                  <div className="h-14">
                    <Combobox 
                      options={Array.from(new Set(products.map(p => p.name).filter(Boolean)))}
                      value={productName}
                      onSelect={setProductName}
                      placeholder="Selecione ou digite o nome"
                      allowCustom={true}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 font-mono">Categoria Principal</label>
                    <div className="h-14">
                      <Combobox 
                        options={categories.map(c => ({ label: c.name, value: c.id }))}
                        value={productCategoryId}
                        onSelect={setProductCategoryId}
                        placeholder="Cervejas, Destilados..."
                        allowCustom={true}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 font-mono">Subcategoria / Tag</label>
                    <div className="h-14">
                      <Combobox 
                        options={Array.from(new Set(products.filter(p => p.subcategory).map(p => p.subcategory).filter(Boolean))) as string[]}
                        value={productSubcategory}
                        onSelect={setProductSubcategory}
                        placeholder="Doses, Garrafas, Long Neck..."
                        allowCustom={true}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 font-mono">Descrição Comercial (Opcional)</label>
                  <Textarea 
                    className="min-h-[100px] bg-white/[0.02] border-white/5 focus:border-primary text-sm rounded-2xl resize-none font-medium leading-relaxed p-4"
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
                      "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all h-20 justify-center",
                      !isDoseControl 
                        ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(0,112,243,0.15)]" 
                        : "bg-white/[0.02] border-white/10 hover:bg-white/5"
                    )}
                  >
                    <Package className={cn("w-5 h-5", !isDoseControl ? "text-primary" : "text-muted-foreground/40")} />
                    <div className="text-center">
                      <p className={cn("text-[9px] font-black uppercase tracking-widest", !isDoseControl ? "text-primary" : "text-muted-foreground")}>Item Simples</p>
                      <p className="text-[8px] font-medium text-muted-foreground/40 uppercase font-mono">Lata, Porção</p>
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
                      "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all h-20 justify-center",
                      (isDoseControl && !linkedProductId) 
                        ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(0,112,243,0.15)]" 
                        : "bg-white/[0.02] border-white/10 hover:bg-white/5"
                    )}
                  >
                    <FlaskConical className={cn("w-5 h-5", (isDoseControl && !linkedProductId) ? "text-primary" : "text-muted-foreground/40")} />
                    <div className="text-center">
                      <p className={cn("text-[9px] font-black uppercase tracking-widest", (isDoseControl && !linkedProductId) ? "text-primary" : "text-muted-foreground")}>Garrafa Base</p>
                      <p className="text-[8px] font-medium text-muted-foreground/40 uppercase font-mono">Estoque ML</p>
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
                      "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all h-20 justify-center",
                      (isDoseControl && linkedProductId) 
                        ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(0,112,243,0.15)]" 
                        : "bg-white/[0.02] border-white/10 hover:bg-white/5"
                    )}
                  >
                    <Wine className={cn("w-5 h-5", (isDoseControl && linkedProductId) ? "text-primary" : "text-muted-foreground/40")} />
                    <div className="text-center">
                      <p className={cn("text-[9px] font-black uppercase tracking-widest", (isDoseControl && linkedProductId) ? "text-primary" : "text-muted-foreground")}>Dose Vinculada</p>
                      <p className="text-[8px] font-medium text-muted-foreground/40 uppercase font-mono">Fracionado</p>
                    </div>
                  </button>
                </div>

                {/* Seção 1: Configurações de Gestão (Discretas) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80 group-hover:opacity-100 transition-opacity">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 font-mono">Preço de Custo (R$)</label>
                    <Input 
                      type="number"
                      step="0.01"
                      className="h-14 bg-white/[0.02] border-white/5 rounded-2xl font-mono tabular-nums font-bold text-sm focus:border-primary transition-all"
                      value={productCost}
                      onChange={(e) => setProductCost(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 font-mono">Alerta de Estoque Mínimo</label>
                    <Input 
                      type="number"
                      className="h-14 bg-white/[0.02] border-white/5 rounded-2xl font-mono tabular-nums font-bold text-sm focus:border-primary transition-all"
                      value={productMinStock}
                      onChange={(e) => setProductMinStock(e.target.value)}
                      placeholder="Ex: 5"
                    />
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/10 p-6 rounded-[30px] space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2 font-mono">
                      <DollarSign className="w-4 h-4 text-green-500" /> Configuração de Venda
                    </h4>
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest font-mono">Valor Aberto?</label>
                      <button 
                        type="button"
                        onClick={() => setIsOpenValue(!isOpenValue)}
                        className={cn(
                          "w-10 h-5 rounded-full transition-all relative",
                          isOpenValue ? "bg-green-500" : "bg-white/10"
                        )}
                      >
                        <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", isOpenValue ? "left-6" : "left-1")} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Formato de Venda</label>
                      <div className="h-14">
                        <Combobox 
                          options={
                            isDoseControl && linkedProductId 
                              ? Array.from(new Set(
                                  products.filter(p => p.isDoseControl && p.linkedProductId).map(p => p.unit).filter(Boolean).length > 0 
                                    ? products.filter(p => p.isDoseControl && p.linkedProductId).map(p => p.unit).filter(Boolean)
                                    : ["Dose Simples (50ml)", "Copo Americano (190ml)"]
                                ))
                              : Array.from(new Set(
                                  products.filter(p => !p.isDoseControl || !p.linkedProductId).map(p => p.unit).filter(Boolean).length > 0
                                    ? products.filter(p => !p.isDoseControl || !p.linkedProductId).map(p => p.unit).filter(Boolean)
                                    : ["Por Unidade", "Garrafa Completa"]
                                ))
                          }
                          value={productUnit}
                          onSelect={setProductUnit}
                          placeholder="Modelo de Venda"
                          allowCustom={true}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1 mb-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-green-500">
                          {isDoseControl && !linkedProductId ? "Preço de Venda (Garrafa Inteira)" : (isDoseControl && linkedProductId ? "Preço de Venda da Dose" : "Preço de Venda (R$)")}
                        </label>
                        {isDoseControl && !linkedProductId && <span className="text-[8px] font-medium text-muted-foreground uppercase opacity-80">Deixe 0 se não vender</span>}
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-green-500 text-lg">R$</span>
                        <Input 
                          type="number"
                          step="0.01"
                          className="h-14 bg-green-500/5 border-green-500/20 focus:border-green-500/50 text-xl font-mono tabular-nums font-black pl-12 rounded-xl text-green-500"
                          value={productPrice}
                          onChange={(e) => setProductPrice(e.target.value)}
                          placeholder="0.00"
                          disabled={isOpenValue}
                        />
                      </div>
                    </div>
                  </div>

                  {!isDoseControl && !linkedProductId && (
                    <div className="pt-2 border-t border-white/5 mt-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 font-mono">Estoque Total (Unidades / Peso)</label>
                          <Input 
                            type="number"
                            className="h-14 bg-black/40 border-white/10 rounded-2xl font-mono tabular-nums font-bold text-lg focus:border-primary transition-all"
                            value={productStock}
                            onChange={(e) => setProductStock(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                    </div>
                  )}

                  {/* Cálculo de Lucro Líquido Real */}
                  <div className="pt-6 border-t border-white/10 mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/40 p-6 rounded-[30px] border border-white/10">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground font-mono">Margem Estimada (ROI)</p>
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-black font-mono tabular-nums",
                          (parseFloat(productPrice) - parseFloat(productCost)) > 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {productPrice && productCost ? (((parseFloat(productPrice) - parseFloat(productCost)) / parseFloat(productCost)) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary font-mono">Lucro Líquido Real (Taxa 2%)</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black font-mono tabular-nums text-white">
                          R$ {productPrice && productCost ? ((parseFloat(productPrice) * 0.98) - parseFloat(productCost)).toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {isDoseControl && !linkedProductId && (
                    <div className="pt-2 border-t border-white/5 mt-4 flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                       <p className="text-[10px] text-primary uppercase font-black tracking-widest">Controle por ML Detectado</p>
                       <Button 
                         variant="ghost" 
                         className="h-14 px-6 text-[9px] uppercase tracking-widest hover:bg-primary/20 text-white"
                         onClick={() => setProductModalTab('controle_dose')}
                       >
                         Configurar Garrafa +
                       </Button>
                    </div>
                  )}

                  {isDoseControl && linkedProductId && (
                    <div className="pt-2 border-t border-white/5 mt-4 flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                       <p className="text-[10px] text-primary uppercase font-black tracking-widest">Dose Vinculada Detectada</p>
                       <Button 
                         variant="ghost" 
                         className="h-14 px-6 text-[9px] uppercase tracking-widest hover:bg-primary/20 text-white"
                         onClick={() => setProductModalTab('controle_dose')}
                       >
                         Configurar ML / Garrafa +
                       </Button>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* 3. FICHA TÉCNICA TAB */}
            {productModalTab === 'ficha_tecnica' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <List className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white font-mono">Ficha Técnica (Composição)</h4>
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.3em]">Engenharia de Produto</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 font-mono">Selecionar Ingrediente</label>
                      <div className="h-14">
                        <Combobox 
                          options={products.filter(p => p.id !== editingProduct?.id).map(p => ({ label: p.name, value: p.id }))}
                          value=""
                          onSelect={(id) => {
                            if (id && !ingredients.some(i => i.productId === id)) {
                              setIngredients([...ingredients, { productId: id, quantity: 1 }]);
                            }
                          }}
                          placeholder="Pesquisar componente no estoque..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border border-white/5 rounded-2xl overflow-hidden">
                    {ingredients.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-5" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum ingrediente adicionado</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {ingredients.map((ing, idx) => {
                          const product = products.find(p => p.id === ing.productId);
                          return (
                            <div key={ing.productId} className="p-4 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold uppercase">{product?.name || 'Desconhecido'}</p>
                                  <p className="text-[8px] text-muted-foreground uppercase">Unidade: {product?.unit || 'UN'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5">
                                  <button 
                                    onClick={() => {
                                      const newIngs = [...ingredients];
                                      newIngs[idx].quantity = Math.max(0.01, newIngs[idx].quantity - 1);
                                      setIngredients(newIngs);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg transition-colors"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <Input 
                                    type="number"
                                    className="w-16 h-8 bg-transparent border-none text-center font-black text-xs p-0 focus-visible:ring-0 font-mono tabular-nums"
                                    value={ing.quantity}
                                    onChange={(e) => {
                                      const newIngs = [...ingredients];
                                      newIngs[idx].quantity = parseFloat(e.target.value) || 0;
                                      setIngredients(newIngs);
                                    }}
                                  />
                                  <button 
                                    onClick={() => {
                                      const newIngs = [...ingredients];
                                      newIngs[idx].quantity += 1;
                                      setIngredients(newIngs);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg transition-colors"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                                <button 
                                  onClick={() => setIngredients(ingredients.filter(i => i.productId !== ing.productId))}
                                  className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl">
                     <div className="flex items-center gap-3 mb-2">
                       <TrendingUp className="w-4 h-4 text-primary" />
                       <h5 className="text-[10px] font-black uppercase tracking-widest text-[#0070f3]">Impacto no Custo</h5>
                     </div>
                     <div className="flex items-center justify-between">
                       <p className="text-xs text-muted-foreground uppercase font-bold">Custo Total dos Ingredientes:</p>
                       <p className="text-xl font-mono tabular-nums font-black text-white">
                         R$ {ingredients.reduce((sum, ing) => {
                           const p = products.find(prod => prod.id === ing.productId);
                           return sum + ((p?.cost || 0) * ing.quantity);
                         }, 0).toFixed(2)}
                       </p>
                     </div>
                     <p className="text-[9px] text-muted-foreground uppercase mt-2 italic">* O sistema atualizará o estoque desses itens automaticamente a cada venda deste produto.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. CONTROLE DE DOSE TAB */}
            {productModalTab === 'controle_dose' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {!isDoseControl ? (
                   <div className="p-8 text-center flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                      <Droplets className="w-12 h-12 text-muted-foreground/30 mb-4" />
                      <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Não Aplicável</h4>
                      <p className="text-[10px] text-muted-foreground/60 uppercase font-bold mt-2 max-w-[250px] mx-auto">
                        O item selecionado está como "Item Simples". Controle volumétrico não é necessário. Selecione "Garrafa Base" ou "Dose Vinculada" na aba de Vendas.
                      </p>
                   </div>
                ) : (isDoseControl && !linkedProductId) ? (
                   <div className="space-y-8">
                     <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl space-y-6">
                        <div className="flex items-center gap-3">
                          <FlaskConical className="w-5 h-5 text-primary" />
                          <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Configuração de Inventário da Garrafa</h4>
                            <p className="text-[9px] text-muted-foreground uppercase font-medium">Controle por ML e Unidades Fechadas</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Garrafas Fechadas (Estoque Real)</label>
                            <Input 
                              type="number"
                              className="h-14 bg-black/40 border-white/10 rounded-xl font-mono tabular-nums font-bold"
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
                                className="h-14 bg-black/40 border-white/10 focus:border-primary rounded-xl font-mono tabular-nums font-bold pl-4"
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
                            <Badge className="bg-primary/20 text-primary border-primary/20 text-[8px] font-black tracking-widest">EM COMPARTILHAMENTO</Badge>
                          </div>
                          <div className="relative">
                            <Droplets className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                            <Input 
                              type="number"
                              className="h-14 bg-black/40 border-white/10 focus:border-primary text-xl font-mono tabular-nums font-black pl-12 rounded-xl text-primary"
                              value={currentBottleVolume}
                              onChange={(e) => setCurrentBottleVolume(e.target.value)}
                              placeholder="Ex: 450"
                            />
                          </div>
                          <p className="text-[9px] text-muted-foreground/60 uppercase font-medium px-1 italic">
                            O sistema baixará as doses deste volume. Ao chegar a 0, abrirá automaticamente uma das {productStock || '0'} fechadas.
                          </p>
                        </div>
                     </div>

                     {/* Doses Vinculadas Existentes */}
                     {editingProduct && products.some(p => p.linkedProductId === editingProduct.id) && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between px-1">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                               Doses / Formatos Configurados
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
                            <Plus className="w-3 h-3" /> Dica de Estoque
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase leading-relaxed font-bold">
                            Após salvar esta garrafa aqui, cadastre novos produtos como "Dose Vinculada" e aponte para cá. O abate de ML será automático na venda da dose.
                          </p>
                        </div>
                      )}
                   </div>
                ) : (
                   <div className="space-y-8">
                     <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary">1</div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vincular a qual Garrafa Base?</label>
                            </div>
                            <Select value={linkedProductId} onValueChange={setLinkedProductId}>
                              <SelectTrigger className="h-14 bg-black/40 border-white/10 rounded-xl">
                                <SelectValue placeholder="Selecione a garrafa de estoque">
                                  {products.find(p => p.id === linkedProductId)?.name || "Selecione uma Capa do Estoque"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-[#05070a] border-white/10 max-h-[300px]">
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

                        <div className="space-y-3 pt-4 border-t border-primary/10">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary">2</div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Baixa no ML exato na Garrafa Principal</label>
                            </div>
                            <div className="relative">
                              <Wine className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                              <Input 
                                type="number"
                                min="0"
                                className="h-14 bg-black/40 border-primary/20 focus:border-primary text-xl font-mono tabular-nums font-black pl-12 rounded-xl text-primary"
                                value={doseSize}
                                onChange={(e) => setDoseSize(e.target.value)}
                                placeholder="Ex: 50"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                MILILITROS
                              </span>
                            </div>
                        </div>
                     </div>

                     <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                          <Info className="w-5 h-5 text-white/50" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Engrenagem Funcionando</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Ao vender <span className="text-white font-bold">1x {productName || 'Dose'}</span>, nós iremos lançar 
                            <span className="text-green-400 font-bold mx-1">
                              {isOpenValue ? 'Preço Aberto' : `R$ ${parseFloat(productPrice || '0').toFixed(2)}`}
                            </span> 
                            no caixa e subtrair exatamente <span className="text-white font-bold">{doseSize || '0'}ml</span> direto da 
                            <span className="text-primary font-bold ml-1">
                              {products.find(p => p.id === linkedProductId)?.name || 'Garrafa Pai'}
                            </span>.
                          </p>
                        </div>
                      </div>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 md:p-6 border-t border-white/5 bg-[#05070a]/80 backdrop-blur-md flex items-center gap-3 mt-auto">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isSavingProduct}
            className="flex-1 h-14 font-bold uppercase tracking-widest text-[9px] text-muted-foreground hover:text-white hover:bg-white/5 border-white/10 rounded-xl"
          >
            Sair sem salvar
          </Button>
          <Button 
            onClick={handleSaveProduct} 
            disabled={isSavingProduct}
            className="flex-[2] h-14 font-black uppercase tracking-[0.15em] text-[10px] bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-xl border border-white/10 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            {isSavingProduct ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processando...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{editingProduct ? 'Salvar Alterações' : 'Concluir Cadastro'}</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
