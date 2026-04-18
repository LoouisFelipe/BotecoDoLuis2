import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, updateDoc, addDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Product, Category } from '../types';
import { Button } from './ui/button';
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
  const [productModalTab, setProductModalTab] = useState<'identificacao' | 'precos' | 'doses'>('identificacao');
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
      <DialogContent className="bg-[#0b1224] border-border max-w-2xl text-white p-0 overflow-hidden flex flex-col h-[90vh] md:max-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/5" style={{ zIndex: 10000 }}>
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
                  Inventário <span className="text-white/40 mx-1">/</span> {productModalTab}
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
            { id: 'identificacao', label: 'Identificação', icon: Package },
            { id: 'precos', label: 'Preços & Estoque', icon: DollarSign },
            { id: 'doses', label: 'Controle / Doses', icon: FlaskConical }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setProductModalTab(tab.id as any)}
              className={cn(
                "flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center justify-center gap-2",
                productModalTab === tab.id ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon className={cn("w-3 h-3", productModalTab === tab.id ? "text-primary" : "text-muted-foreground/50")} />
              <span className="hidden sm:inline">{tab.label}</span>
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
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Nome do Produto</label>
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
                      options={Array.from(new Set(products.filter(p => p.subcategory).map(p => p.subcategory).filter(Boolean))) as string[]}
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
            )}

            {/* Preços e Estoque */}
            {productModalTab === 'precos' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                    <label className="text-xs font-medium text-muted-foreground ml-1">Estoque Inicial (Unidades)</label>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border/30 pt-6">
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
                    <label className="text-xs font-medium text-muted-foreground ml-1">Valor Aberto no PDV?</label>
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
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest ml-1">Definir preço apenas na comanda</p>
                  </div>
                </div>
              </div>
            )}

            {/* Controle de Doses */}
            {productModalTab === 'doses' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                  <div className="space-y-6 p-6 bg-[#111827]/30 rounded-2xl border border-border/50">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground ml-1">Este produto é uma:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={!linkedProductId ? "default" : "outline"}
                          onClick={() => setLinkedProductId('')}
                          className="h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                        >
                          Garrafa Base
                        </Button>
                        <Button
                          variant={linkedProductId ? "default" : "outline"}
                          onClick={() => {
                            const firstBottle = products.find(p => p.isDoseControl && !p.linkedProductId);
                            if (firstBottle) setLinkedProductId(firstBottle.id);
                          }}
                          className="h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                        >
                          Dose Vinculada
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
                          O volume total é usado ao abrir uma nova garrafa. O volume atual é o restante da garrafa em uso.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground ml-1">Garrafa de Origem</label>
                          <Select value={linkedProductId} onValueChange={setLinkedProductId}>
                            <SelectTrigger className="h-14 bg-[#111827]/50 border-border text-sm font-medium rounded-xl">
                              <SelectValue placeholder="Selecionar Garrafa">
                                {products.find(p => p.id === linkedProductId)?.name}
                              </SelectValue>
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
                            <Wine className="w-3 h-3 text-primary" /> Qual o tamanho desta dose? (ml)
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
                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
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
