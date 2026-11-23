import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, CheckCircle2, Edit3, Save, Scale, ShoppingBag } from 'lucide-react';
import { EstadoProceso, Finca, Recoleccion, ZonaCultivo } from '../types';
import { VoiceHelpButton } from './VoiceHelpButton';
import { voiceAssistant } from '../services/voiceAssistant';

interface RecoleccionViewProps {
  fincas: Finca[];
  zonas: ZonaCultivo[];
  recolecciones: Recoleccion[];
  onAddRecoleccion: (rec: Omit<Recoleccion, 'id'>) => void;
  onUpdateRecoleccion: (id: string, changes: Partial<Omit<Recoleccion, 'id'>>) => void;
}

const STATE_LABELS: Record<EstadoProceso, string> = {
  baba: 'Cacao Baba Fresco',
  fermentacion: 'En Fermentacion',
  secado: 'En Secado',
  seco_listo: 'Cacao Seco Listo'
};

export const RecoleccionViewClean: React.FC<RecoleccionViewProps> = ({
  fincas,
  zonas,
  recolecciones,
  onAddRecoleccion,
  onUpdateRecoleccion
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFincaId, setSelectedFincaId] = useState<string>(fincas[0]?.id || '');
  const [modoRegistro, setModoRegistro] = useState<'finca' | 'zona'>('zona');
  const [selectedZonaId, setSelectedZonaId] = useState<string>('');
  const [kilosBaba, setKilosBaba] = useState('250');
  const [jornalesUtilizados, setJornalesUtilizados] = useState('2');
  const [responsable, setResponsable] = useState('Don Jose Ignacio Gomez');
  const [notas, setNotas] = useState('');
  const [guardadoExitoso, setGuardadoExitoso] = useState('');
  const [guardadoError, setGuardadoError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardadosHoy, setGuardadosHoy] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [finalizingId, setFinalizingId] = useState<string | null>(null);
  const [kilosSecoFinales, setKilosSecoFinales] = useState('');
  const [notasFinalizacion, setNotasFinalizacion] = useState('');
  const [editForm, setEditForm] = useState({ kilosBaba: '', responsable: '', notas: '' });
  const historialRef = useRef<HTMLDivElement | null>(null);

  const kilosBabaNum = Number(kilosBaba) || 0;
  const rendimientoCalculado = Math.round((kilosBabaNum * 0.38) * 10) / 10;

  const zonasDisponibles = useMemo(
    () => zonas.filter((zona) => zona.fincaId === selectedFincaId),
    [zonas, selectedFincaId]
  );

  useEffect(() => {
    if (!selectedFincaId && fincas[0]?.id) {
      setSelectedFincaId(fincas[0].id);
    }
  }, [fincas, selectedFincaId]);

  const handleKilosChange = (value: string) => {
    setKilosBaba(value.replace(/[^\d.]/g, ''));
  };

  const submitHarvest = (e?: React.FormEvent) => {
    e?.preventDefault();
    setGuardadoError('');

    if (!selectedFincaId || kilosBabaNum <= 0) {
      setGuardadoError('Selecciona una finca e ingresa kilos validos antes de guardar.');
      return;
    }

    setGuardando(true);

    const nuevaRecoleccion: Recoleccion = {
      id: `rec-${Date.now()}`,
      fincaId: selectedFincaId,
      zonaId: modoRegistro === 'zona' ? (selectedZonaId || zonasDisponibles[0]?.id || 'zona-general') : 'finca-general',
      fecha: new Date().toISOString().split('T')[0],
      kilosBaba: kilosBabaNum,
      rendimientoEstimadoSeco: rendimientoCalculado,
      kilosSecoObtenidos: undefined,
      estadoProceso: 'baba',
      jornalesUtilizados: Number(jornalesUtilizados) || 1,
      responsable: responsable.trim() || 'Propietario',
      notas
    };

    onAddRecoleccion({
      fincaId: nuevaRecoleccion.fincaId,
      zonaId: nuevaRecoleccion.zonaId,
      fecha: nuevaRecoleccion.fecha,
      kilosBaba: nuevaRecoleccion.kilosBaba,
      rendimientoEstimadoSeco: nuevaRecoleccion.rendimientoEstimadoSeco,
      estadoProceso: nuevaRecoleccion.estadoProceso,
      jornalesUtilizados: nuevaRecoleccion.jornalesUtilizados,
      responsable: nuevaRecoleccion.responsable,
      notas: nuevaRecoleccion.notas
    });

    setGuardadosHoy((prev) => prev + 1);
    setGuardadoExitoso('Cosecha guardada correctamente.');
    setStep(1);
    setKilosBaba('200');
    setNotas('');
    setEditingId(null);
    setFinalizingId(null);
    voiceAssistant.speak(`Cosecha guardada. ${kilosBabaNum} kilos en baba registrados.`, true);
    window.requestAnimationFrame(() => historialRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    window.setTimeout(() => setGuardadoExitoso(''), 4000);
    setGuardando(false);
  };

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
    <div className="space-y-6 pb-12 animate-fadeIn">
      <div className="bg-white border-2 border-stone-200 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-stone-900 flex items-center gap-2">
              <ShoppingBag className="w-7 h-7 text-orange-600" />
              Registrar cosecha
            </h2>
            <p className="text-sm text-stone-600 mt-1">Llena el dato rapido. Si te equivocas, luego lo puedes editar aqui mismo.</p>
          </div>
          <VoiceHelpButton textToRead="Modulo de recoleccion. Registra la finca, kilos, estado y guarda. Luego puedes editar el historial." size="sm" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {['1. Finca', '2. Kilos', '3. Estado', '4. Guardar'].map((label, index) => {
          const n = (index + 1) as 1 | 2 | 3 | 4;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setStep(n)}
              className={`p-2.5 rounded-2xl border-2 font-black text-xs sm:text-base cursor-pointer transition-colors ${step === n ? 'bg-orange-600 text-white border-orange-900' : step > n ? 'bg-emerald-100 text-emerald-900 border-emerald-400 hover:bg-emerald-200' : 'bg-stone-100 text-stone-500 border-stone-300 hover:bg-stone-200'}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="bg-white border-2 border-stone-200 rounded-3xl p-5 sm:p-6 shadow-sm">
        <form onSubmit={submitHarvest} className="space-y-6">
          {guardadoError && <div className="p-3 rounded-2xl border border-red-300 bg-red-50 text-red-900 font-bold">{guardadoError}</div>}
          {guardadoExitoso && <div className="p-3 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-900 font-bold">{guardadoExitoso}</div>}
          {guardando && <div className="p-3 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 font-bold">Guardando cosecha...</div>}
          <div className="text-xs font-bold text-stone-500">Guardados en esta sesion: {guardadosHoy}</div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <div>
                  <h3 className="font-black text-stone-900">Paso 1: finca y lote</h3>
                  <p className="text-sm text-stone-600">Elige donde recogiste el cacao.</p>
                </div>
                <VoiceHelpButton textToRead="Paso 1. Selecciona la finca y el lote." size="sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {fincas.map((finca) => (
                  <button key={finca.id} type="button" onClick={() => { setSelectedFincaId(finca.id); setSelectedZonaId(''); }} className={`p-4 rounded-2xl border-2 text-left ${selectedFincaId === finca.id ? 'bg-orange-100 border-orange-500 text-orange-950' : 'bg-white border-stone-200 text-stone-800'}`}>
                    <p className="font-black">{finca.nombre}</p>
                    <p className="text-xs text-stone-600 mt-1">{finca.propietario}</p>
                  </button>
                ))}
              </div>
              {selectedFincaId && (
                <div className="space-y-2">
                  <p className="font-black text-stone-900">Como quieres registrar la cosecha?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button type="button" onClick={() => { setModoRegistro('finca'); setSelectedZonaId(''); }} className={`p-3 rounded-2xl border-2 text-left ${modoRegistro === 'finca' ? 'bg-orange-100 border-orange-500 text-orange-950' : 'bg-white border-stone-200 text-stone-800'}`}>
                      <p className="font-black">Toda la finca</p>
                      <p className="text-xs text-stone-600 mt-1">No necesitas escoger lote.</p>
                    </button>
                    <button type="button" onClick={() => setModoRegistro('zona')} className={`p-3 rounded-2xl border-2 text-left ${modoRegistro === 'zona' ? 'bg-emerald-100 border-emerald-500 text-emerald-950' : 'bg-white border-stone-200 text-stone-800'}`}>
                      <p className="font-black">Por lote</p>
                      <p className="text-xs text-stone-600 mt-1">Si eliges un lote especifico.</p>
                    </button>
                  </div>
                  {modoRegistro === 'zona' && <p className="font-black text-stone-900">Lote</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {zonasDisponibles.length === 0 ? (
                      <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm text-stone-600">                      No hay lotes especificos. Se guardara como lote general.</div>
                    ) : (
                      zonasDisponibles.map((zona) => (
                        <button key={zona.id} type="button" onClick={() => setSelectedZonaId(zona.id)} className={`p-3 rounded-2xl border-2 text-left ${selectedZonaId === zona.id ? 'bg-emerald-100 border-emerald-500 text-emerald-950' : 'bg-white border-stone-200 text-stone-800'}`}>
                          <p className="font-bold">{zona.nombreZona}</p>
                          <p className="text-xs text-stone-600 mt-1">{zona.variedadCacao}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="bg-amber-50 p-5 rounded-3xl border-2 border-amber-300 space-y-3">
                <label className="block text-lg font-black text-amber-950 flex items-center gap-2">
                  <Scale className="w-6 h-6 text-amber-800" />
                  Kilos pesados en baba
                </label>
                <input type="number" min="1" value={kilosBaba} onChange={(e) => handleKilosChange(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-amber-600 bg-white text-3xl font-black text-amber-950" />
                <div className="flex flex-wrap gap-2">
                  {[50, 100, 200, 300, 500].map((num) => (
                    <button key={num} type="button" onClick={() => handleKilosChange(String(num))} className="px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-black text-sm border border-amber-400">
                      {num} Kg
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => voiceAssistant.speak(`De ${kilosBabaNum} kilos en baba podrías obtener aproximadamente ${rendimientoCalculado} kilos en seco.`, true)} className="w-full px-4 py-3 rounded-2xl bg-amber-700 hover:bg-amber-600 text-white font-black text-base flex items-center justify-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Calcular
                </button>
              </div>
              <div className="bg-emerald-900 text-emerald-50 p-5 rounded-3xl border-4 border-emerald-600">
                <div className="flex items-center justify-between">
                  <span className="bg-emerald-400 text-emerald-950 font-black text-xs px-2.5 py-1 rounded-full uppercase">Calculadora</span>
                  <span className="text-xs text-emerald-200">Factor ~38%</span>
                </div>
                <p className="text-sm font-medium text-emerald-200 mt-4">Rendimiento estimado</p>
                <div className="bg-emerald-950 mt-3 p-4 rounded-2xl border-2 border-emerald-500 text-center">
                  <span className="text-4xl font-black text-emerald-200 block">~ {rendimientoCalculado} <span className="text-2xl font-bold">Kg</span></span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <h3 className="font-black text-stone-900">Paso 3: datos rapidos</h3>
                <p className="text-sm text-stone-600">El registro se guarda como baba. Aqui solo confirmas los datos basicos.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-2">
                  <span className="block text-xs font-black uppercase tracking-wide text-stone-500">Cuantos jornales se usaron</span>
                  <input type="number" value={jornalesUtilizados} onChange={(e) => setJornalesUtilizados(e.target.value)} className="w-full p-3 rounded-2xl border-2 border-stone-200 font-bold" />
                </label>
                <label className="block space-y-2">
                  <span className="block text-xs font-black uppercase tracking-wide text-stone-500">Nombre del responsable</span>
                  <input type="text" value={responsable} onChange={(e) => setResponsable(e.target.value)} className="w-full p-3 rounded-2xl border-2 border-stone-200 font-bold" />
                </label>
              </div>
              <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Escribe aqui notas opcionales de la cosecha" className="w-full p-3 rounded-2xl border-2 border-stone-200 font-semibold" rows={3} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <h3 className="font-black text-stone-900">Paso 4: confirma y guarda</h3>
                <p className="text-sm text-stone-600">Revisa que todo este correcto antes de guardar.</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-stone-200"><span className="block text-xs font-bold text-stone-500 uppercase">Kilos baba</span><span className="text-2xl font-black text-orange-950">{kilosBabaNum} Kg</span></div>
                <div className="bg-white p-3 rounded-2xl border border-stone-200"><span className="block text-xs font-bold text-stone-500 uppercase">Seco estimado</span><span className="text-2xl font-black text-emerald-800">~{rendimientoCalculado} Kg</span></div>
                <div className="bg-white p-3 rounded-2xl border border-stone-200"><span className="block text-xs font-bold text-stone-500 uppercase">Estado</span><span className="text-sm font-black text-purple-900">{STATE_LABELS.baba}</span></div>
                <div className="bg-white p-3 rounded-2xl border border-stone-200"><span className="block text-xs font-bold text-stone-500 uppercase">Jornales</span><span className="text-2xl font-black text-stone-900">{jornalesUtilizados}</span></div>
              </div>
              <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas opcionales" className="w-full p-3 rounded-2xl border-2 border-stone-200 font-semibold" rows={3} />
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-stone-200">
            <button type="submit" className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Guardar cosecha
            </button>
          </div>
        </form>
      </div>

      {false && <div ref={historialRef} id="historial-recolecciones" className="bg-white border-2 border-stone-200 rounded-3xl p-5 shadow-sm space-y-4">
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
                    Todavia no hay cosechas guardadas. Cuando presiones "Guardar cosecha", apareceran aqui.
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
                            <input
                              type="number"
                              min="1"
                              value={editForm.kilosBaba}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, kilosBaba: e.target.value }))}
                              className="w-24 px-2 py-1 rounded-lg border border-stone-300"
                            />
                          ) : (
                            `${rec.kilosBaba} Kg`
                          )}
                        </td>
                        <td className="p-3 text-emerald-800">
                          ~
                          {isEditing
                            ? Math.round((Number(editForm.kilosBaba || 0) * 0.38) * 10) / 10
                            : rec.rendimientoEstimadoSeco}{' '}
                          Kg
                        </td>
                        <td className="p-3">{rec.jornalesUtilizados}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold border bg-amber-100 border-amber-400 text-amber-950">
                            {rec.estadoProceso === 'seco_listo' ? 'Proceso finalizado' : STATE_LABELS[rec.estadoProceso]}
                          </span>
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.responsable}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, responsable: e.target.value }))}
                              className="w-full px-2 py-1 rounded-lg border border-stone-300"
                            />
                          ) : (
                            rec.responsable
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={editForm.notas}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, notas: e.target.value }))}
                                className="w-full px-2 py-1 rounded-lg border border-stone-300 text-sm"
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <button type="button" onClick={saveEdit} className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-black flex items-center gap-1">
                                  <Save className="w-3.5 h-3.5" />
                                  Guardar
                                </button>
                                <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg bg-stone-200 text-stone-800 text-xs font-black">
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => startEdit(rec)} className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-black flex items-center gap-1">
                                <Edit3 className="w-3.5 h-3.5" />
                                Editar
                              </button>
                              <button type="button" onClick={() => startFinalize(rec)} className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-black flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Proceso finalizado
                              </button>
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
                                <input
                                  type="number"
                                  min="1"
                                  value={kilosSecoFinales}
                                  onChange={(e) => setKilosSecoFinales(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-white"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-xs font-black uppercase text-emerald-900 mb-1">Observaciones</label>
                                <input
                                  type="text"
                                  value={notasFinalizacion}
                                  onChange={(e) => setNotasFinalizacion(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-white"
                                />
                              </div>
                              <div className="md:col-span-3 flex flex-wrap gap-2">
                                <button type="button" onClick={saveFinalize} className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-black">
                                  Guardar finalizacion
                                </button>
                                <button type="button" onClick={() => setFinalizingId(null)} className="px-4 py-2 rounded-lg bg-stone-200 text-stone-800 text-sm font-black">
                                  Cancelar
                                </button>
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
      </div>}
    </div>
  );
};
