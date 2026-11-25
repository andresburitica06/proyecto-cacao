/**
 * Componente de historial de recolecciones de cacao.
 * Muestra una tabla ordenada por fecha con los registros guardados y permite
 * editarlos en línea o finalizar su proceso registrando los kilos secos obtenidos.
 */
import React, { useRef, useState } from 'react';
import { CheckCircle2, Edit3, Save } from 'lucide-react';
import { Finca, EstadoProceso, Recoleccion, ZonaCultivo } from '../types';
import { VoiceHelpButton } from './VoiceHelpButton';

/** Propiedades esperadas por el componente RecoleccionesHistory. */
interface RecoleccionesHistoryProps {
  fincas: Finca[];
  zonas: ZonaCultivo[];
  recolecciones: Recoleccion[];
  onUpdateRecoleccion: (id: string, changes: Partial<Omit<Recoleccion, 'id'>>) => void;
}

/** Etiquetas legibles en español para cada estado del proceso de poscosecha. */
const STATE_LABELS: Record<EstadoProceso, string> = {
  baba: 'Cacao Baba Fresco',
  fermentacion: 'En Fermentacion',
  secado: 'En Secado',
  seco_listo: 'Cacao Seco Listo'
};

export const RecoleccionesHistory: React.FC<RecoleccionesHistoryProps> = ({
  fincas,
  zonas,
  recolecciones,
  onUpdateRecoleccion
}) => {
  // Referencia al contenedor del historial para desplazamiento programático si se requiere
  const historialRef = useRef<HTMLDivElement | null>(null);
  // Estados para controlar qué registro se está editando o finalizando en línea
  const [editingId, setEditingId] = useState<string | null>(null);
  const [finalizingId, setFinalizingId] = useState<string | null>(null);
  const [kilosSecoFinales, setKilosSecoFinales] = useState('');
  const [notasFinalizacion, setNotasFinalizacion] = useState('');
  const [editForm, setEditForm] = useState({ kilosBaba: '', kilosMalEstado: '0', responsable: '', notas: '' });

  // Inicia la edición en línea cargando los valores actuales de la recolección
  const startEdit = (rec: Recoleccion) => {
    setEditingId(rec.id);
    setEditForm({ kilosBaba: String(rec.kilosSecoObtenidos ?? rec.kilosBaba), kilosMalEstado: String(rec.kilosMalEstado || 0), responsable: rec.responsable, notas: rec.notas || '' });
  };

  // Valida y guarda los cambios de la edición recalculando el rendimiento seco estimado (38%)
  const saveEdit = () => {
    if (!editingId) return;
    const kilos = Number(editForm.kilosBaba) || 0;
    if (kilos <= 0) return;

    onUpdateRecoleccion(editingId, {
      kilosBaba: kilos,
      rendimientoEstimadoSeco: kilos,
      kilosSecoObtenidos: kilos,
      kilosMalEstado: Math.max(0, Number(editForm.kilosMalEstado) || 0),
      responsable: editForm.responsable.trim() || 'Propietario',
      notas: editForm.notas
    });
    setEditingId(null);
  };

  // Abre el formulario de finalización prellenando los kilos secos reales o estimados
  const startFinalize = (rec: Recoleccion) => {
    setFinalizingId(rec.id);
    setKilosSecoFinales(rec.kilosSecoObtenidos ? String(rec.kilosSecoObtenidos) : String(rec.rendimientoEstimadoSeco));
    setNotasFinalizacion(rec.notas || '');
  };

  // Marca la recolección como finalizada ('seco_listo') con los kilos secos obtenidos
  const saveFinalize = () => {
    if (!finalizingId) return;
    const kilosSeco = Number(kilosSecoFinales) || 0;
    if (kilosSeco <= 0) return;

    onUpdateRecoleccion(finalizingId, {
      kilosSecoObtenidos: kilosSeco,
      estadoProceso: 'seco_listo',
      notas: notasFinalizacion
    });
    setFinalizingId(null);
    setKilosSecoFinales('');
    setNotasFinalizacion('');
  };

  // Copia ordenada descendentemente por fecha para mostrar los registros más recientes primero
  const visibleHistory = [...recolecciones].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div ref={historialRef} id="historial-recolecciones" className="bg-white border-2 border-stone-200 rounded-3xl p-5 shadow-sm space-y-4">
      {/* Encabezado del historial con botón de ayuda por voz */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-stone-900">Historial de recolecciones</h3>
        <VoiceHelpButton textToRead="Historial de recolecciones. Aqui puedes editar los registros guardados." size="sm" />
      </div>

      {/* Tabla principal de recolecciones con scroll horizontal en pantallas pequeñas */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-stone-100 border-b-2 border-stone-300 text-stone-700 text-xs font-black uppercase">
              <th className="p-3">Fecha</th>
              <th className="p-3">Finca / Lote</th>
              <th className="p-3">Listo venta</th>
              <th className="p-3">Mal estado</th>
              <th className="p-3">Jornales</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Responsable</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 text-sm font-bold text-stone-900">
            {visibleHistory.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-5 text-center text-stone-500 font-semibold">
                  Todavia no hay cosechas guardadas.
                </td>
              </tr>
            ) : (
              visibleHistory.map((rec) => {
                const finca = fincas.find((f) => f.id === rec.fincaId);
                const zona = zonas.find((z) => z.id === rec.zonaId);
                const isEditing = editingId === rec.id;

                return (
                  <React.Fragment key={rec.id}>
                    {/* Fila de datos de la recolección (modo lectura o edición en línea) */}
                    <tr className="hover:bg-stone-50 align-top">
                      <td className="p-3 whitespace-nowrap">{rec.fecha}</td>
                      <td className="p-3">
                        <span className="block font-extrabold">{finca?.nombre || 'Finca'}</span>
                        <span className="text-xs font-normal text-stone-500">{zona?.nombreZona || 'Lote'}</span>
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input type="number" min="1" value={editForm.kilosBaba} onChange={(e) => setEditForm((prev) => ({ ...prev, kilosBaba: e.target.value }))} className="w-24 px-2 py-1 rounded-lg border border-stone-300" />
                        ) : `${rec.kilosBaba} Kg`}
                      </td>
                      <td className="p-3 text-rose-700">{isEditing ? (<input type="number" min="0" value={editForm.kilosMalEstado} onChange={(e) => setEditForm((prev) => ({ ...prev, kilosMalEstado: e.target.value }))} className="w-24 px-2 py-1 rounded-lg border border-stone-300" />) : `${rec.kilosMalEstado || 0} Kg`}</td>
                      <td className="p-3">{rec.jornalesUtilizados}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold border bg-amber-100 border-amber-400 text-amber-950">
                          {rec.estadoProceso === 'seco_listo' ? 'Proceso finalizado' : STATE_LABELS[rec.estadoProceso]}
                        </span>
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input type="text" value={editForm.responsable} onChange={(e) => setEditForm((prev) => ({ ...prev, responsable: e.target.value }))} className="w-full px-2 py-1 rounded-lg border border-stone-300" />
                        ) : rec.responsable}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea value={editForm.notas} onChange={(e) => setEditForm((prev) => ({ ...prev, notas: e.target.value }))} className="w-full px-2 py-1 rounded-lg border border-stone-300 text-sm" rows={2} />
                            <div className="flex gap-2">
                              <button type="button" onClick={saveEdit} className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-black flex items-center gap-1"><Save className="w-3.5 h-3.5" />Guardar</button>
                              <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg bg-stone-200 text-stone-800 text-xs font-black">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => startEdit(rec)} className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-black flex items-center gap-1"><Edit3 className="w-3.5 h-3.5" />Editar</button>
                            <button type="button" onClick={() => startFinalize(rec)} className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-black flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Proceso finalizado</button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {/* Fila desplegable para registrar los kilos secos finales y cerrar el proceso */}
                    {finalizingId === rec.id && (
                      <tr className="bg-emerald-50">
                        <td colSpan={8} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                            <div>
                              <label className="block text-xs font-black uppercase text-emerald-900 mb-1">Kilos secos obtenidos</label>
                              <input type="number" min="1" value={kilosSecoFinales} onChange={(e) => setKilosSecoFinales(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-white" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-black uppercase text-emerald-900 mb-1">Observaciones</label>
                              <input type="text" value={notasFinalizacion} onChange={(e) => setNotasFinalizacion(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-white" />
                            </div>
                            <div className="md:col-span-3 flex flex-wrap gap-2">
                              <button type="button" onClick={saveFinalize} className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-black">Guardar finalizacion</button>
                              <button type="button" onClick={() => setFinalizingId(null)} className="px-4 py-2 rounded-lg bg-stone-200 text-stone-800 text-sm font-black">Cancelar</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
