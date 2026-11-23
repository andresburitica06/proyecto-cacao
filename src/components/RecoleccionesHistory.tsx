import React, { useRef, useState } from 'react';
import { CheckCircle2, Edit3, Save } from 'lucide-react';
import { Finca, EstadoProceso, Recoleccion, ZonaCultivo } from '../types';
import { VoiceHelpButton } from './VoiceHelpButton';

interface RecoleccionesHistoryProps {
  fincas: Finca[];
  zonas: ZonaCultivo[];
  recolecciones: Recoleccion[];
  onUpdateRecoleccion: (id: string, changes: Partial<Omit<Recoleccion, 'id'>>) => void;
}

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
  const historialRef = useRef<HTMLDivElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [finalizingId, setFinalizingId] = useState<string | null>(null);
  const [kilosSecoFinales, setKilosSecoFinales] = useState('');
  const [notasFinalizacion, setNotasFinalizacion] = useState('');
  const [editForm, setEditForm] = useState({ kilosBaba: '', responsable: '', notas: '' });

  const startEdit = (rec: Recoleccion) => {
    setEditingId(rec.id);
    setEditForm({ kilosBaba: String(rec.kilosBaba), responsable: rec.responsable, notas: rec.notas || '' });
  };

  const saveEdit = () => {
    if (!editingId) return;
    const kilos = Number(editForm.kilosBaba) || 0;
    if (kilos <= 0) return;

    onUpdateRecoleccion(editingId, {
      kilosBaba: kilos,
      rendimientoEstimadoSeco: Math.round((kilos * 0.38) * 10) / 10,
      responsable: editForm.responsable.trim() || 'Propietario',
      notas: editForm.notas
    });
    setEditingId(null);
  };

  const startFinalize = (rec: Recoleccion) => {
    setFinalizingId(rec.id);
    setKilosSecoFinales(rec.kilosSecoObtenidos ? String(rec.kilosSecoObtenidos) : String(rec.rendimientoEstimadoSeco));
    setNotasFinalizacion(rec.notas || '');
  };

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

  const visibleHistory = [...recolecciones].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div ref={historialRef} id="historial-recolecciones" className="bg-white border-2 border-stone-200 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-stone-900">Historial de recolecciones</h3>
        <VoiceHelpButton textToRead="Historial de recolecciones. Aqui puedes editar los registros guardados." size="sm" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-stone-100 border-b-2 border-stone-300 text-stone-700 text-xs font-black uppercase">
              <th className="p-3">Fecha</th>
              <th className="p-3">Finca / Lote</th>
              <th className="p-3">Kilos</th>
              <th className="p-3">Seco</th>
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
                      <td className="p-3 text-emerald-800">~{isEditing ? Math.round((Number(editForm.kilosBaba || 0) * 0.38) * 10) / 10 : rec.rendimientoEstimadoSeco} Kg</td>
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
