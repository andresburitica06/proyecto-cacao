/**
 * Vista de Historial de Cacao Listo para la Venta.
 * Muestra el resumen de kilos disponibles en sus dos calidades (buen estado y
 * mal estado / menor calidad), una calculadora de valor con precio diferenciado
 * por calidad y el historial imprimible de cosechas listas para venta.
 */
import React, { useMemo, useState } from 'react';
import { Filter, Scale, Sparkles } from 'lucide-react';
import { Finca, ProductoInventario, Recoleccion, Venta, ZonaCultivo } from '../types';
import { RecoleccionesHistory } from './RecoleccionesHistory';

/** Propiedades que recibe la vista de historial de cacao */
interface InventarioViewProps {
  fincas: Finca[];
  zonas: ZonaCultivo[];
  recolecciones: Recoleccion[];
  inventario: ProductoInventario[];
  ventas?: Venta[];
  onUpdateRecoleccion: (id: string, changes: Partial<Omit<Recoleccion, 'id'>>) => void;
  onUpdateInventario: (id: string, nuevaCantidadKg: number) => void;
  onUpdateProductoInventario: (id: string, cambios: Omit<ProductoInventario, 'id' | 'fincaId' | 'fechaUltimaActualizacion'>) => void;
  onAddProductoInventario: (prod: Omit<ProductoInventario, 'id' | 'fechaUltimaActualizacion'>) => void;
}

export const InventarioViewClean: React.FC<InventarioViewProps> = ({
  fincas,
  zonas,
  recolecciones,
  ventas = [],
  onUpdateRecoleccion
}) => {
  const [selectedFincaFilter, setSelectedFincaFilter] = useState<string>('todas');
  const [precioBuenEstado, setPrecioBuenEstado] = useState('0');
  const [precioMalEstado, setPrecioMalEstado] = useState('0');
  const [selectedFinalizadoId, setSelectedFinalizadoId] = useState('todas');

  // Solo cosechas que ya salieron listas para la venta, filtradas por finca si aplica
  const finalizedHistory = useMemo(
    () =>
      recolecciones.filter(
        (rec) =>
          rec.estadoProceso === 'seco_listo' &&
          (selectedFincaFilter === 'todas' || rec.fincaId === selectedFincaFilter)
      ),
    [recolecciones, selectedFincaFilter]
  );

  // Totales cosechados en las dos calidades de cacao listo para la venta
  const cosechadoBuenEstado = useMemo(
    () =>
      Math.round(
        finalizedHistory.reduce(
          (acc, rec) => acc + (rec.kilosSecoObtenidos ?? rec.rendimientoEstimadoSeco ?? rec.kilosBaba ?? 0),
          0
        ) * 10
      ) / 10,
    [finalizedHistory]
  );

  const cosechadoMalEstado = useMemo(
    () =>
      Math.round(
        finalizedHistory.reduce((acc, rec) => acc + (rec.kilosMalEstado || 0), 0) * 10
      ) / 10,
    [finalizedHistory]
  );

  // Ventas confirmadas filtradas por finca para descontar lo ya vendido del disponible
  const ventasConfirmadas = useMemo(
    () =>
      ventas.filter(
        (v) =>
          v.estadoVenta !== 'anulada' &&
          (selectedFincaFilter === 'todas' || v.fincaId === selectedFincaFilter)
      ),
    [ventas, selectedFincaFilter]
  );

  const vendidoBuenEstado = useMemo(
    () =>
      Math.round(
        ventasConfirmadas
          .filter((v) => (v.estadoCalidad || 'buen_estado') === 'buen_estado')
          .reduce((acc, v) => acc + (v.kilosVendidos || 0), 0) * 10
      ) / 10,
    [ventasConfirmadas]
  );

  const vendidoMalEstado = useMemo(
    () =>
      Math.round(
        ventasConfirmadas
          .filter((v) => v.estadoCalidad === 'mal_estado')
          .reduce((acc, v) => acc + (v.kilosVendidos || 0), 0) * 10
      ) / 10,
    [ventasConfirmadas]
  );

  const totalVendido = Math.round((vendidoBuenEstado + vendidoMalEstado) * 10) / 10;

  // Totales disponibles por vender (cosechado - vendido)
  const totalBuenEstado = Math.max(0, Math.round((cosechadoBuenEstado - vendidoBuenEstado) * 10) / 10);
  const totalMalEstado = Math.max(0, Math.round((cosechadoMalEstado - vendidoMalEstado) * 10) / 10);
  const totalKilos = Math.round((totalBuenEstado + totalMalEstado) * 10) / 10;

  // Mantiene válida la cosecha seleccionada en la calculadora cuando cambia el filtro
  React.useEffect(() => {
    if (
      selectedFinalizadoId !== 'todas' &&
      !finalizedHistory.some((rec) => rec.id === selectedFinalizadoId)
    ) {
      setSelectedFinalizadoId('todas');
    }
  }, [finalizedHistory, selectedFinalizadoId]);

  const selectedFinalizado =
    selectedFinalizadoId === 'todas'
      ? null
      : finalizedHistory.find((rec) => rec.id === selectedFinalizadoId) || null;

  const kilosBuenCalculadora = selectedFinalizado
    ? (selectedFinalizado.kilosSecoObtenidos ?? selectedFinalizado.rendimientoEstimadoSeco ?? selectedFinalizado.kilosBaba ?? 0)
    : totalBuenEstado;
  const kilosMalCalculadora = selectedFinalizado
    ? (selectedFinalizado.kilosMalEstado || 0)
    : totalMalEstado;

  const hayBuenEstadoCalculadora = kilosBuenCalculadora > 0;
  const hayMalEstadoCalculadora = kilosMalCalculadora > 0;
  const precioBuenNum = hayBuenEstadoCalculadora ? Math.max(0, Number(precioBuenEstado) || 0) : 0;
  const precioMalNum = hayMalEstadoCalculadora ? Math.max(0, Number(precioMalEstado) || 0) : 0;
  const valorBuenEstado = kilosBuenCalculadora * precioBuenNum;
  const valorMalEstado = kilosMalCalculadora * precioMalNum;
  const valorCalculado = valorBuenEstado + valorMalEstado;

  const selectedFincaNombre =
    selectedFincaFilter === 'todas'
      ? 'Todas las fincas'
      : fincas.find((f) => f.id === selectedFincaFilter)?.nombre || 'Finca';

  // Formatea montos en pesos colombianos (COP) sin decimales
  const formatCOP = (monto: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(monto);

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Tarjetas de métricas totales y calculadora de valor por calidad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-amber-50 border-4 border-amber-600 p-6 rounded-3xl shadow-md flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-black text-amber-900 uppercase">Total Cacao Listo para Venta</span>
              <h3 className="text-4xl font-black text-amber-950 mt-1">
                {totalKilos} <span className="text-lg">Kg</span>
              </h3>
              <span className="text-xs font-bold text-amber-800">
                {totalVendido > 0
                  ? `Disponible por vender (${totalVendido} Kg ya vendidos)`
                  : 'Suma de buen estado y menor calidad'}
              </span>
            </div>
            <div className="p-3 bg-amber-200 rounded-2xl border-2 border-amber-400 text-amber-950">
              <Scale className="w-8 h-8" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-300">
            <div className="bg-emerald-100/80 border border-emerald-400 rounded-2xl p-2.5 text-center">
              <span className="block text-[11px] font-black text-emerald-900 uppercase">Buen estado</span>
              <span className="text-xl font-black text-emerald-950">{totalBuenEstado} Kg</span>
            </div>
            <div className="bg-rose-100/80 border border-rose-400 rounded-2xl p-2.5 text-center">
              <span className="block text-[11px] font-black text-rose-900 uppercase">Mal estado</span>
              <span className="text-xl font-black text-rose-950">{totalMalEstado} Kg</span>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-4 border-yellow-600 p-6 rounded-3xl shadow-md flex flex-col justify-between gap-3">
          <div>
            <span className="text-xs font-black text-yellow-900 uppercase">Calculadora de valor</span>
            <h3 className="text-lg font-black text-yellow-950 mt-1">Elige una cosecha o el total</h3>
            <select
              value={selectedFinalizadoId}
              onChange={(e) => setSelectedFinalizadoId(e.target.value)}
              className="mt-2 w-full px-3 py-2.5 rounded-2xl border-2 border-yellow-400 bg-white text-stone-900 font-black text-sm"
            >
              <option value="todas">Disponible actual ({totalKilos} Kg)</option>
              {finalizedHistory.map((rec) => {
                const finca = fincas.find((f) => f.id === rec.fincaId);
                const buen = rec.kilosSecoObtenidos ?? rec.rendimientoEstimadoSeco ?? rec.kilosBaba ?? 0;
                const mal = rec.kilosMalEstado || 0;
                return (
                  <option key={rec.id} value={rec.id}>
                    {rec.fecha} - {finca?.nombre || 'Finca'} ({buen} Kg bueno / {mal} Kg mal)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-emerald-900 uppercase">Precio/Kg Buen estado</label>
              <input
                type="number"
                min="0"
                disabled={!hayBuenEstadoCalculadora}
                value={hayBuenEstadoCalculadora ? precioBuenEstado : ''}
                onChange={(e) => setPrecioBuenEstado(e.target.value)}
                className={`mt-1.5 w-full px-3 py-2.5 rounded-2xl border-2 font-black text-base ${
                  hayBuenEstadoCalculadora
                    ? 'border-emerald-400 bg-white text-stone-900'
                    : 'border-stone-300 bg-stone-100 text-stone-400 cursor-not-allowed'
                }`}
                placeholder={hayBuenEstadoCalculadora ? 'Ej: 22500' : 'Sin kilos'}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-rose-900 uppercase">Precio/Kg Mal estado</label>
              <input
                type="number"
                min="0"
                disabled={!hayMalEstadoCalculadora}
                value={hayMalEstadoCalculadora ? precioMalEstado : ''}
                onChange={(e) => setPrecioMalEstado(e.target.value)}
                className={`mt-1.5 w-full px-3 py-2.5 rounded-2xl border-2 font-black text-base ${
                  hayMalEstadoCalculadora
                    ? 'border-rose-400 bg-white text-stone-900'
                    : 'border-stone-300 bg-stone-100 text-stone-400 cursor-not-allowed'
                }`}
                placeholder={hayMalEstadoCalculadora ? 'Ej: 15000' : 'Sin kilos'}
              />
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 border-4 border-emerald-600 p-6 rounded-3xl shadow-md flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-black text-emerald-900 uppercase">Valor estimado total</span>
              <h3 className="text-3xl font-black text-emerald-950 mt-1">{formatCOP(valorCalculado)}</h3>
            </div>
            <div className="p-3 bg-emerald-200 rounded-2xl border-2 border-emerald-400 text-emerald-950">
              <Sparkles className="w-8 h-8" />
            </div>
          </div>
          <div className="space-y-1 text-xs font-bold pt-2 border-t border-emerald-300">
            <p className="text-emerald-900 flex justify-between">
              <span>Buen estado ({kilosBuenCalculadora} Kg x {formatCOP(precioBuenNum)}):</span>
              <span>{formatCOP(valorBuenEstado)}</span>
            </p>
            <p className="text-rose-800 flex justify-between">
              <span>Mal estado ({kilosMalCalculadora} Kg x {formatCOP(precioMalNum)}):</span>
              <span>{formatCOP(valorMalEstado)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Selector de filtro por finca para el historial */}
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
          <option value="todas">Todas las Fincas ({recolecciones.filter((r) => r.estadoProceso === 'seco_listo').length} registros)</option>
          {fincas.map((finca) => (
            <option key={finca.id} value={finca.id}>{finca.nombre}</option>
          ))}
        </select>
      </div>

      {/* Historial detallado e imprimible de cacao listo para la venta */}
      <RecoleccionesHistory
        fincas={fincas}
        zonas={zonas}
        recolecciones={finalizedHistory}
        fincaFilterLabel={selectedFincaNombre}
        onUpdateRecoleccion={onUpdateRecoleccion}
      />
    </div>
  );
};
