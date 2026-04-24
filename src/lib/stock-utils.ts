import { Product } from '../types';

/**
 * UTILS PARA GESTÃO DE ESTOQUE E DOSES - BOTECO DO LUIS
 */

/**
 * Calcula a quantidade de doses disponíveis para um produto específico.
 * Se for uma dose, olha para a garrafa vinculada.
 * Se for uma garrafa avulsa vendida por dose, olha para si mesma.
 */
export const calculateAvailableDoses = (product: Product, products: Product[]): number => {
  if (!product.isDoseControl) return 0;

  // Se for uma DOSE (tem garrafa vinculada)
  if (product.linkedProductId) {
    const bottle = products.find(p => p.id === product.linkedProductId);
    if (!bottle) return 0;
    
    const stock = bottle.stock || 0;
    const volPerUnit = bottle.volumePerUnit || 0;
    const currentVol = bottle.currentBottleVolume !== undefined ? bottle.currentBottleVolume : volPerUnit;
    const doseSize = product.doseSize || 1;

    // Cálculo: (Estoque Fechado * Volume da Garrafa + Volume da Garrafa Aberta) / Tamanho da Dose
    return Math.floor(((stock * volPerUnit) + currentVol) / doseSize);
  }

  // Se for uma GARRAFA sendo vendida por dose (ela mesma é o controle)
  const stock = product.stock || 0;
  const volPerUnit = product.volumePerUnit || 0;
  const currentVol = product.currentBottleVolume !== undefined ? product.currentBottleVolume : volPerUnit;
  const doseSize = 50; // Padrão se não especificado para a garrafa em si

  return Math.floor(((stock * volPerUnit) + currentVol) / doseSize);
};

/**
 * Verifica se um produto está em nível crítico de estoque.
 */
export const isStockCritical = (product: Product, products: Product[]): boolean => {
  const minStock = product.minStock || 5;

  if (product.isDoseControl && product.linkedProductId) {
    const doses = calculateAvailableDoses(product, products);
    return doses <= minStock;
  }

  return (product.stock || 0) <= minStock;
};
