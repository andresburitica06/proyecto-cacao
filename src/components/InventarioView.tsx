/**
 * Vista de gestión de Inventario y Bodega de cacao.
 * Permite consultar el stock disponible en kilos y sacos, filtrar por finca,
 * estimar el valor comercial, ingresar nuevos lotes y ajustar existencias.
 */
import React, { useState } from 'react';
import { PackageCheck, Scale, Warehouse, PlusCircle, Edit, ArrowUpDown, Filter, Sparkles, Check } from 'lucide-react';
import { Finca, ProductoInventario, TipoProductoCacao } from '../types';
import { VoiceHelpButton } from './VoiceHelpButton';
import { voiceAssistant } from '../services/voiceAssistant';

/** Propiedades que recibe la vista de inventario */
interface InventarioViewProps {
  fincas: Finca[];
  inventario: ProductoInventario[];
  onUpdateInventario: (id: string, nuevaCantidadKg: number) => void;
  onUpdateProductoInventario: (id: string, cambios: Omit<ProductoInventario, 'id' | 'fincaId' | 'fechaUltimaActualizacion'>) => void;
  onAddProductoInventario: (prod: Omit<ProductoInventario, 'id' | 'fechaUltimaActualizacion'>) => void;
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  fincas,
  inventario,
  onUpdateInventario,
  onUpdateProductoInventario,
  onAddProductoInventario
}) => {
  // Estados de filtro por finca y edición rápida de existencias
  const [selectedFincaFilter, setSelectedFincaFilter] = useState<string>('todas');
  const [editingItem, setEditingItem] = useState<ProductoInventario | null>(null);
  const [newCantidad, setNewCantidad] = useState<string>('0');

  // Estados del modal para agregar un nuevo producto en inventario
  const [showAddModal, setShowAddModal] = useState(false);
  const [fincaIdAdd, setFincaIdAdd] = useState(fincas[0]?.id || '');
  const [tipoProdAdd, setTipoProdAdd] = useState<TipoProductoCacao>('cacao_seco_premium');
  const [nombreProdAdd, setNombreProdAdd] = useState('Cacao Seco Tipo Exportación');
  const [cantidadAdd, setCantidadAdd] = useState('100');
  const [precioRefAdd, setPrecioRefAdd] = useState('22500');
  const [bodegaAdd, setBodegaAdd] = useState('Bodega Principal');

  // Filtra los productos del inventario según la finca seleccionada
  const filteredInventario = selectedFincaFilter === 'todas'
    ? inventario
    : inventario.filter(i => i.fincaId === selectedFincaFilter);

  // Totales agregados de kilos, sacos equivalentes y valor comercial estimado
  const totalKilos = filteredInventario.reduce((acc, curr) => acc + curr.cantidadKg, 0);
  const totalSacos = Math.round((totalKilos / 50) * 10) / 10; // 1 saco = 50 kg
  const valorTotalEstimado = filteredInventario.reduce((acc, curr) => acc + (curr.cantidadKg * curr.precioRefKg), 0);

  // Formatea valores numéricos a pesos colombianos (COP) sin decimales
  const formatCOP = (monto: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(monto);
  };

  // Valida y guarda los ajustes realizados sobre un producto en bodega
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const kg = parseFloat(newCantidad) || 0;
    if (kg < 0 || !editingItem.nombreProducto.trim() || !editingItem.ubicacionBodega.trim() || editingItem.precioRefKg < 0) return;
    onUpdateInventario(editingItem.id, kg);
    onUpdateProductoInventario(editingItem.id, {
      tipoProducto: editingItem.tipoProducto,
      nombreProducto: editingItem.nombreProducto.trim(),
      cantidadKg: kg,
      precioRefKg: editingItem.precioRefKg,
      ubicacionBodega: editingItem.ubicacionBodega.trim()
    });
    voiceAssistant.speak(`Inventario actualizado de ${editingItem.nombreProducto}. Cantidad final: ${kg} kilos.`);
    setEditingItem(null);
  };

  // Valida y registra un nuevo lote de producto en el inventario
  const handleCreateProducto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fincaIdAdd || !nombreProdAdd.trim() || !bodegaAdd.trim() || parseFloat(cantidadAdd) < 0 || parseFloat(precioRefAdd) < 0) return;
    onAddProductoInventario({
      fincaId: fincaIdAdd,
      tipoProducto: tipoProdAdd,
      nombreProducto: nombreProdAdd,
      cantidadKg: parseFloat(cantidadAdd) || 0,
      precioRefKg: parseFloat(precioRefAdd) || 20000,
      ubicacionBodega: bodegaAdd
    });
    voiceAssistant.speak(`Producto ${nombreProdAdd} agregado a la bodega con ${cantidadAdd} kilos.`);
    setShowAddModal(false);
  };

  // Estilos y etiquetas visuales por tipo de producto de cacao
  const tipoBadges: Record<TipoProductoCacao, { label: string; bg: string; border: string; text: string; icon: string }> = {
    cacao_seco_premium: { label: 'Cacao Seco Premium Exportación', bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-950', icon: '📦' },
    cacao_seco_corriente: { label: 'Cacao Seco Corriente / Pasilla', bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-950', icon: '🌾' },
    cacao_fermentado: { label: 'Cacao en Fermentación (Cajón)', bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-950', icon: '📦' },
    cacao_baba: { label: 'Cacao en Baba Fresco', bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-950', icon: '🍃' }
  };

  // Texto de resumen narrado por el asistente de voz
  const inventorySummaryAudio = `Módulo de inventario y bodega. Tienes un total de ${totalKilos} kilos de cacao almacenados en bodega, lo que equivale a aproximadamente ${totalSacos} sacos de 50 kilos. Valor total estimado: ${valorTotalEstimado} pesos.`;

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-yellow-900 via-amber-900 to-yellow-950 border-4 border-yellow-600 text-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-yellow-400 text-yellow-950 font-black text-xs px-2.5 py-0.5 rounded-full uppercase">
              BODEGA Y STOCK
            </span>
            <span className="text-yellow-200 text-xs font-bold">Tablas: Producto e Inventario</span>
          </div>
          <h2 className="text-3xl font-black font-serif text-yellow-100 flex items-center gap-2">
            <PackageCheck className="w-8 h-8 text-yellow-300" />
            Inventario de Cacao Almacenado
          </h2>
          <p className="text-yellow-200 text-sm mt-1">
            Cantidad disponible de cacao en Kg y sacos por finca, indicando claramente la variedad y ubicación.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <VoiceHelpButton
            textToRead={inventorySummaryAudio}
            size="md"
          />
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-yellow-950 font-black text-base flex items-center gap-2 shadow-xl border-2 border-yellow-200 cursor-pointer"
          >
            <PlusCircle className="w-6 h-6" />
            <span>+ Ingresar Lote a Bodega</span>
          </button>
        </div>
      </div>

      {/* METRICAS DE INVENTARIO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-amber-50 border-4 border-amber-600 p-6 rounded-3xl shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-amber-900 uppercase">Kilos Totales Disponibles</span>
            <h3 className="text-4xl font-black text-amber-950 mt-1">{totalKilos} <span className="text-lg">Kg</span></h3>
            <span className="text-xs font-bold text-amber-800">Cacao listo y en proceso</span>
          </div>
          <div className="p-3 bg-amber-200 rounded-2xl border-2 border-amber-400 text-amber-950">
            <Scale className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-yellow-50 border-4 border-yellow-600 p-6 rounded-3xl shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-yellow-900 uppercase">Sacos Estimados (50 Kg/Saco)</span>
            <h3 className="text-4xl font-black text-yellow-950 mt-1">~ {totalSacos} <span className="text-lg">Sacos</span></h3>
            <span className="text-xs font-bold text-yellow-800">Empaque estándar cacaotero</span>
          </div>
          <div className="p-3 bg-yellow-200 rounded-2xl border-2 border-yellow-400 text-yellow-950">
            <Warehouse className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-emerald-50 border-4 border-emerald-600 p-6 rounded-3xl shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-emerald-900 uppercase">Valor Aprox. Comercial</span>
            <h3 className="text-3xl font-black text-emerald-950 mt-1">{formatCOP(valorTotalEstimado)}</h3>
            <span className="text-xs font-bold text-emerald-800">Según precio promedio COP</span>
          </div>
          <div className="p-3 bg-emerald-200 rounded-2xl border-2 border-emerald-400 text-emerald-950">
            <Sparkles className="w-8 h-8" />
          </div>
        </div>

      </div>

      {/* FILTRO POR FINCA */}
      <div className="flex items-center justify-between bg-white border-3 border-stone-300 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-amber-800" />
          <span className="font-extrabold text-stone-900 text-base">Filtrar por Finca:</span>
        </div>
        <select
          value={selectedFincaFilter}
          onChange={(e) => setSelectedFincaFilter(e.target.value)}
          className="p-2.5 rounded-xl border-2 border-stone-300 font-bold text-base text-stone-900 bg-stone-50"
        >
          <option value="todas">Todas las Fincas ({inventario.length} lotes)</option>
          {fincas.map(f => (
            <option key={f.id} value={f.id}>{f.nombre}</option>
          ))}
        </select>
      </div>

      {/* TARJETAS DE PRODUCTOS EN BODEGA (REQUISITO FUNDAMENTAL) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredInventario.map((prod) => {
          const finca = fincas.find(f => f.id === prod.fincaId);
          const badge = tipoBadges[prod.tipoProducto];
          const sacosItem = Math.round((prod.cantidadKg / 50) * 10) / 10;
          const valorItem = prod.cantidadKg * prod.precioRefKg;

          const prodAudio = `Producto ${prod.nombreProducto} en ${finca?.nombre || 'finca'}. Cantidad disponible: ${prod.cantidadKg} kilos, equivalente a ${sacosItem} sacos. Ubicación: ${prod.ubicacionBodega}.`;

          return (
            <div 
              key={prod.id}
              className="bg-white border-4 border-yellow-800 rounded-3xl p-6 shadow-md hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b-2 border-stone-100 pb-3">
                  <div>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${badge.bg} ${badge.border} ${badge.text}`}>
                      {badge.icon} {badge.label}
                    </span>
                    <h3 className="text-2xl font-black text-stone-900 mt-2">{prod.nombreProducto}</h3>
                    <p className="text-xs text-stone-600 font-bold">Finca: {finca?.nombre || 'General'}</p>
                  </div>

                  <VoiceHelpButton
                    textToRead={prodAudio}
                    size="sm"
                  />
                </div>

                {/* Métricas del Producto */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4 text-center">
                  <div className="bg-amber-50 p-3 rounded-2xl border-2 border-amber-300">
                    <span className="block text-xs font-bold text-amber-900 uppercase">Kilos (Kg)</span>
                    <span className="text-2xl font-black text-amber-950">{prod.cantidadKg} Kg</span>
                  </div>

                  <div className="bg-yellow-50 p-3 rounded-2xl border-2 border-yellow-300">
                    <span className="block text-xs font-bold text-yellow-900 uppercase">Sacos (50kg)</span>
                    <span className="text-2xl font-black text-yellow-950">~ {sacosItem}</span>
                  </div>

                  <div className="bg-emerald-50 p-3 rounded-2xl border-2 border-emerald-300 col-span-2 sm:col-span-1">
                    <span className="block text-xs font-bold text-emerald-900 uppercase">Valor Est.</span>
                    <span className="text-base font-black text-emerald-950">{formatCOP(valorItem)}</span>
                  </div>
                </div>

                <div className="text-xs font-semibold text-stone-600 flex items-center justify-between bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                  <span>📍 Ubicación: {prod.ubicacionBodega}</span>
                  <span>Ref: {formatCOP(prod.precioRefKg)}/Kg</span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(prod);
                    setNewCantidad(prod.cantidadKg.toString());
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Edit className="w-4 h-4" />
                  Ajustar Kilos / Sacos
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal de Ajuste Rápido de Stock */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-4 border-yellow-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-2xl font-black text-stone-900">
              Ajustar Kilos en Bodega
            </h3>
            <p className="text-sm font-semibold text-stone-600">
              {editingItem.nombreProducto}
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-extrabold text-stone-900 mb-1">Nombre del producto:</label>
                <input type="text" required value={editingItem.nombreProducto} onChange={(e) => setEditingItem({ ...editingItem, nombreProducto: e.target.value })} className="w-full p-3 rounded-xl border-2 border-stone-300 font-bold text-stone-900" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-extrabold text-stone-900 mb-1">Tipo:</label>
                  <select value={editingItem.tipoProducto} onChange={(e) => setEditingItem({ ...editingItem, tipoProducto: e.target.value as TipoProductoCacao })} className="w-full p-3 rounded-xl border-2 border-stone-300 font-bold text-stone-900">
                    <option value="cacao_seco_premium">Seco premium</option><option value="cacao_seco_corriente">Seco corriente</option><option value="cacao_fermentado">Fermentado</option><option value="cacao_baba">En baba</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-stone-900 mb-1">Precio ref. ($/Kg):</label>
                  <input type="number" min="0" required value={editingItem.precioRefKg} onChange={(e) => setEditingItem({ ...editingItem, precioRefKg: Number(e.target.value) })} className="w-full p-3 rounded-xl border-2 border-stone-300 font-bold text-stone-900" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-extrabold text-stone-900 mb-1">
                  Nueva Cantidad en Kilos (Kg):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newCantidad}
                  onChange={(e) => setNewCantidad(e.target.value)}
                  className="w-full p-4 rounded-2xl border-4 border-yellow-600 font-black text-3xl text-amber-950"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-stone-900 mb-1">Ubicación:</label>
                <input type="text" required value={editingItem.ubicacionBodega} onChange={(e) => setEditingItem({ ...editingItem, ubicacionBodega: e.target.value })} className="w-full p-3 rounded-xl border-2 border-stone-300 font-bold text-stone-900" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-stone-200 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-black text-base"
                >
                  Guardar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Agregar Nuevo Producto */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-4 border-yellow-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-xl font-black text-stone-900">
              Ingresar Lote de Cacao a Bodega
            </h3>

            <form onSubmit={handleCreateProducto} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-800">Finca:</label>
                <select
                  value={fincaIdAdd}
                  onChange={(e) => setFincaIdAdd(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold text-sm"
                >
                  {fincas.map(f => (
                    <option key={f.id} value={f.id}>{f.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800">Tipo de Producto:</label>
                <select
                  value={tipoProdAdd}
                  onChange={(e) => {
                    const tipo = e.target.value as TipoProductoCacao;
                    setTipoProdAdd(tipo);
                    if (tipo === 'cacao_seco_premium') setNombreProdAdd('Cacao Seco Premium Exportación');
                    if (tipo === 'cacao_seco_corriente') setNombreProdAdd('Cacao Seco Corriente / Pasilla');
                    if (tipo === 'cacao_fermentado') setNombreProdAdd('Cacao en Fermentación');
                    if (tipo === 'cacao_baba') setNombreProdAdd('Cacao Baba Fresco');
                  }}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold text-sm"
                >
                  <option value="cacao_seco_premium">Cacao Seco Premium Exportación</option>
                  <option value="cacao_seco_corriente">Cacao Seco Corriente / Pasilla</option>
                  <option value="cacao_fermentado">Cacao en Fermentación</option>
                  <option value="cacao_baba">Cacao en Baba Fresco</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800">Ubicación en bodega:</label>
                <input
                  type="text"
                  required
                  value={bodegaAdd}
                  onChange={(e) => setBodegaAdd(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800">Nombre del Producto:</label>
                <input
                  type="text"
                  value={nombreProdAdd}
                  onChange={(e) => setNombreProdAdd(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-800">Kilos (Kg):</label>
                  <input
                    type="number"
                    value={cantidadAdd}
                    onChange={(e) => setCantidadAdd(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800">Precio Ref ($/Kg):</label>
                  <input
                    type="number"
                    value={precioRefAdd}
                    onChange={(e) => setPrecioRefAdd(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-bold text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-200 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-yellow-600 text-white font-bold text-sm"
                >
                  Guardar en Bodega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
