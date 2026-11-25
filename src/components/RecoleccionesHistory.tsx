/**
 * Componente de historial de cacao listo para la venta.
 * Muestra únicamente las cosechas que salieron listas para venta en sus dos calidades
 * (buen estado y mal estado / menor calidad) y permite generar un reporte imprimible
 * con los totales consolidados.
 */
import React, { useMemo, useRef } from 'react';
import { Printer } from 'lucide-react';
import { Finca, Recoleccion, ZonaCultivo } from '../types';
import { VoiceHelpButton } from './VoiceHelpButton';

/** Propiedades esperadas por el componente RecoleccionesHistory. */
interface RecoleccionesHistoryProps {
  fincas: Finca[];
  zonas: ZonaCultivo[];
  recolecciones: Recoleccion[];
  fincaFilterLabel?: string;
  onUpdateRecoleccion?: (id: string, changes: Partial<Omit<Recoleccion, 'id'>>) => void;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const RecoleccionesHistory: React.FC<RecoleccionesHistoryProps> = ({
  fincas,
  zonas,
  recolecciones,
  fincaFilterLabel = 'Todas las fincas'
}) => {
  const historialRef = useRef<HTMLDivElement | null>(null);

  // Solo registros listos para la venta, ordenados del más reciente al más antiguo
  const visibleHistory = useMemo(
    () =>
      recolecciones
        .filter((rec) => rec.estadoProceso === 'seco_listo')
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [recolecciones]
  );

  const getKilosBuenEstado = (rec: Recoleccion) =>
    rec.kilosSecoObtenidos ?? rec.rendimientoEstimadoSeco ?? rec.kilosBaba ?? 0;

  const getKilosMalEstado = (rec: Recoleccion) => rec.kilosMalEstado || 0;

  // Totales consolidados del historial visible
  const totalBuenEstado = useMemo(
    () => Math.round(visibleHistory.reduce((acc, rec) => acc + getKilosBuenEstado(rec), 0) * 10) / 10,
    [visibleHistory]
  );
  const totalMalEstado = useMemo(
    () => Math.round(visibleHistory.reduce((acc, rec) => acc + getKilosMalEstado(rec), 0) * 10) / 10,
    [visibleHistory]
  );
  const totalGeneral = Math.round((totalBuenEstado + totalMalEstado) * 10) / 10;

  // Abre una ventana limpia lista para imprimir o guardar como PDF el historial y sus totales
  const handlePrintHistory = () => {
    const printWindow = window.open('', '_blank', 'width=960,height=720');
    if (!printWindow) {
      window.print();
      return;
    }

    const fechaImpresion = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const rowsHtml =
      visibleHistory.length === 0
        ? `<tr><td colspan="7" style="text-align:center;padding:16px;color:#57534e;">No hay registros de cacao listo para la venta.</td></tr>`
        : visibleHistory
            .map((rec) => {
              const finca = fincas.find((f) => f.id === rec.fincaId);
              const zona = zonas.find((z) => z.id === rec.zonaId);
              const buen = getKilosBuenEstado(rec);
              const mal = getKilosMalEstado(rec);
              const totalFila = Math.round((buen + mal) * 10) / 10;
              return `
                <tr>
                  <td>${escapeHtml(rec.fecha)}</td>
                  <td><strong>${escapeHtml(finca?.nombre || 'Finca')}</strong><br/><span style="font-size:11px;color:#57534e;">${escapeHtml(zona?.nombreZona || 'General')}</span></td>
                  <td style="text-align:right;color:#065f46;font-weight:700;">${buen} Kg</td>
                  <td style="text-align:right;color:#be123c;font-weight:700;">${mal} Kg</td>
                  <td style="text-align:right;font-weight:800;">${totalFila} Kg</td>
                  <td style="text-align:center;">${rec.jornalesUtilizados}</td>
                  <td>${escapeHtml(rec.responsable || 'Propietario')}</td>
                </tr>
              `;
            })
            .join('');

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Historial de Cacao Listo para Venta</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1c1917; margin: 28px; }
    .header { border-bottom: 3px solid #78350f; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header h1 { margin: 0; font-size: 22px; color: #451a03; }
    .header p { margin: 4px 0 0; font-size: 12px; color: #57534e; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .card { border: 2px solid #d6d3d1; border-radius: 12px; padding: 12px 14px; }
    .card.total { border-color: #d97706; background: #fffbeb; }
    .card.bueno { border-color: #059669; background: #ecfdf5; }
    .card.malo { border-color: #e11d48; background: #fff1f2; }
    .card .label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #44403c; }
    .card .value { font-size: 22px; font-weight: 900; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #d6d3d1; padding: 8px 10px; }
    th { background: #f5f5f4; text-transform: uppercase; font-size: 11px; text-align: left; }
    tfoot td { background: #fef3c7; font-weight: 900; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Historial de Cacao Listo para Venta</h1>
      <p>Filtro: ${escapeHtml(fincaFilterLabel)} &bull; Fecha de reporte: ${escapeHtml(fechaImpresion)}</p>
    </div>
    <div style="font-size:12px;font-weight:700;color:#78350f;">AppCacao</div>
  </div>

  <div class="summary">
    <div class="card total">
      <div class="label">Total Cacao para Venta</div>
      <div class="value">${totalGeneral} Kg</div>
    </div>
    <div class="card bueno">
      <div class="label">Total en Buen Estado</div>
      <div class="value" style="color:#065f46;">${totalBuenEstado} Kg</div>
    </div>
    <div class="card malo">
      <div class="label">Total Mal Estado (Menor Calidad)</div>
      <div class="value" style="color:#be123c;">${totalMalEstado} Kg</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Finca / Lote</th>
        <th style="text-align:right;">Buen Estado</th>
        <th style="text-align:right;">Mal Estado (Menor Calidad)</th>
        <th style="text-align:right;">Total Listo Venta</th>
        <th style="text-align:center;">Jornales</th>
        <th>Responsable</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2">TOTALES CONSOLIDADOS</td>
        <td style="text-align:right;color:#065f46;">${totalBuenEstado} Kg</td>
        <td style="text-align:right;color:#be123c;">${totalMalEstado} Kg</td>
        <td style="text-align:right;">${totalGeneral} Kg</td>
        <td colspan="2">${visibleHistory.length} registro(s)</td>
      </tr>
    </tfoot>
  </table>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div ref={historialRef} id="historial-recolecciones" className="bg-white border-2 border-stone-200 rounded-3xl p-5 shadow-sm space-y-4">
      {/* Encabezado del historial con botón de impresión y ayuda por voz */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-stone-900">Historial de cacao listo para la venta</h3>
          <p className="text-xs font-semibold text-stone-500">
            Registro de cacao en buen estado y cacao en mal estado (menor calidad) que salio para venta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintHistory}
            className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir Historial
          </button>
          <VoiceHelpButton
            textToRead={`Historial de cacao listo para la venta. Total general: ${totalGeneral} kilos. Buen estado: ${totalBuenEstado} kilos. Mal estado o menor calidad: ${totalMalEstado} kilos.`}
            size="sm"
          />
        </div>
      </div>

      {/* Tabla principal de registros listos para la venta */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[680px]">
          <thead>
            <tr className="bg-stone-100 border-b-2 border-stone-300 text-stone-700 text-xs font-black uppercase">
              <th className="p-3">Fecha</th>
              <th className="p-3">Finca / Lote</th>
              <th className="p-3">Buen estado (Listo venta)</th>
              <th className="p-3">Mal estado (Menor calidad)</th>
              <th className="p-3">Total venta</th>
              <th className="p-3">Jornales</th>
              <th className="p-3">Responsable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 text-sm font-bold text-stone-900">
            {visibleHistory.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-5 text-center text-stone-500 font-semibold">
                  Todavia no hay cosechas listas para la venta.
                </td>
              </tr>
            ) : (
              visibleHistory.map((rec) => {
                const finca = fincas.find((f) => f.id === rec.fincaId);
                const zona = zonas.find((z) => z.id === rec.zonaId);
                const kilosBuen = getKilosBuenEstado(rec);
                const kilosMal = getKilosMalEstado(rec);
                const totalFila = Math.round((kilosBuen + kilosMal) * 10) / 10;

                return (
                  <tr key={rec.id} className="hover:bg-stone-50 align-top">
                    <td className="p-3 whitespace-nowrap">{rec.fecha}</td>
                    <td className="p-3">
                      <span className="block font-extrabold">{finca?.nombre || 'Finca'}</span>
                      <span className="text-xs font-normal text-stone-500">{zona?.nombreZona || 'General'}</span>
                    </td>
                    <td className="p-3 text-emerald-800">{kilosBuen} Kg</td>
                    <td className="p-3 text-rose-700">{kilosMal} Kg</td>
                    <td className="p-3 font-black text-amber-950">{totalFila} Kg</td>
                    <td className="p-3">{rec.jornalesUtilizados}</td>
                    <td className="p-3">{rec.responsable}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {visibleHistory.length > 0 && (
            <tfoot>
              <tr className="bg-amber-50 border-t-2 border-amber-400 text-sm font-black">
                <td colSpan={2} className="p-3 text-amber-950 uppercase">Totales</td>
                <td className="p-3 text-emerald-800">{totalBuenEstado} Kg</td>
                <td className="p-3 text-rose-700">{totalMalEstado} Kg</td>
                <td className="p-3 text-amber-950">{totalGeneral} Kg</td>
                <td colSpan={2} className="p-3 text-xs font-bold text-stone-600">
                  {visibleHistory.length} registro(s) listos para venta
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
