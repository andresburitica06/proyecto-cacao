import React, { useState } from 'react';
import { Sprout, Plus, MapPin, User, Trees, Layers, X, Check, Edit, Trash2 } from 'lucide-react';
import { Finca, ZonaCultivo } from '../types';
import { VoiceHelpButton } from './VoiceHelpButton';
import { voiceAssistant } from '../services/voiceAssistant';

const MUNICIPIOS_SANTANDER = [
  'Bucaramanga',
  'Floridablanca',
  'Girón',
  'Piedecuesta',
  'Barrancabermeja',
  'San Vicente de Chucurí',
  'El Carmen de Chucurí',
  'Lebrija',
  'Rionegro',
  'San Gil',
  'Socorro',
  'Zapatoca',
  'Vélez',
  'Barbosa',
  'Málaga'
] as const;

const VEREDAS_POR_MUNICIPIO: Record<string, string[]> = {
  Bucaramanga: ['La Malaña', 'Vijagual', 'El Pedregal', 'San Cayetano'],
  Floridablanca: ['Vericute', 'Ruitoque', 'Helechales', 'Casiano'],
  Girón: ['Chocoita', 'Bocas', 'Peñas', 'Acapulco', 'Marta'],
  Piedecuesta: ['Sevilla', 'La Mata', 'Ruitoque', 'Umpalá', 'Pescadero'],
  Barrancabermeja: ['La Fortuna', 'Ciénaga del Opón', 'San Rafael de Chucurí', 'El Llanito'],
  'San Vicente de Chucurí': ['La Lizama', 'Yarima', 'Albania', 'Mérida', 'El León', 'Campo 23'],
  'El Carmen de Chucurí': ['Santo Domingo', 'Centenario', 'El 27', 'La Bodega', 'Islanda'],
  Lebrija: ['Vanegas', 'Portugal', 'La Girona', 'La Renta', 'Santo Domingo'],
  Rionegro: ['Galápagos', 'Llano de Palmas', 'San Rafael', 'La Ceiba', 'La Tigra'],
  'San Gil': ['Guarigua', 'Ojo de Agua', 'Cañaveral', 'Montecitos', 'Volador'],
  Socorro: ['Baraya', 'La Honda', 'Chanchón', 'Buenavista', 'Hato Viejo'],
  Zapatoca: ['La Fuente', 'La Cacica', 'San Javier', 'Coscal', 'El Coscal'],
  Vélez: ['Peña Blanca', 'El Gaitán', 'Los Guayabos', 'La Esperanza'],
  Barbosa: ['Cite', 'Cristales', 'Santa Rosa', 'Pozo Negro'],
  Málaga: ['Calichal', 'Pantano Grande', 'Pescadero', 'El Término']
};

interface FincasViewProps {
  fincas: Finca[];
  zonas: ZonaCultivo[];
  onAddFinca: (finca: Omit<Finca, 'id' | 'fechaRegistro'>) => Promise<boolean>;
  onUpdateFinca: (id: string, finca: Omit<Finca, 'id' | 'fechaRegistro'>) => void;
  onAddZona: (zona: Omit<ZonaCultivo, 'id'>) => void;
  onDeleteFinca: (id: string) => void;
  onDeleteZona: (id: string) => void;
  canAddFinca?: boolean;
}

export const FincasView: React.FC<FincasViewProps> = ({
  fincas,
  zonas,
  onAddFinca,
  onUpdateFinca,
  canAddFinca = false,
  onAddZona,
  onDeleteFinca,
  onDeleteZona
}) => {
  const [showAddFincaModal, setShowAddFincaModal] = useState(false);
  const [editingFinca, setEditingFinca] = useState<Finca | null>(null);
  const [hectareasEditTotal, setHectareasEditTotal] = useState('');
  const [hectareasEditCacao, setHectareasEditCacao] = useState('');
  const [showAddZonaModal, setShowAddZonaModal] = useState<string | null>(null);
  const [previewFinca, setPreviewFinca] = useState<Finca | null>(null);
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});

  const [nombre, setNombre] = useState('');
  const [propietario, setPropietario] = useState('');
  const [vereda, setVereda] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [hectareasTotal, setHectareasTotal] = useState('5');
  const [hectareasCacao, setHectareasCacao] = useState('3.5');

  const veredasDisponibles = VEREDAS_POR_MUNICIPIO[municipio] || [];

  const [nombreZona, setNombreZona] = useState('');
  const [variedadCacao, setVariedadCacao] = useState('CCN-51');
  const [arbolesEstimados, setArbolesEstimados] = useState('1000');
  const [hectareasZona, setHectareasZona] = useState('2.0');

  const handleCreateFinca = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validación rigurosa de todos los campos
    const nombreLimpio = (nombre || '').trim();
    const propietarioLimpio = (propietario || '').trim();
    const municipioLimpio = (municipio || '').trim();
    const veredaLimpia = (vereda || '').trim();
    
    if (!nombreLimpio) {
      window.alert('El nombre de la finca es obligatorio.');
      return;
    }
    if (!propietarioLimpio) {
      window.alert('El propietario es obligatorio.');
      return;
    }
    if (!municipioLimpio) {
      window.alert('El municipio es obligatorio.');
      return;
    }
    if (!veredaLimpia) {
      window.alert('La vereda es obligatoria.');
      return;
    }
    if (hectareasTotal.trim() === '' || hectareasCacao.trim() === '') {
      window.alert('Las hectáreas son obligatorias.');
      return;
    }

    const hectareasTotalNum = parseFloat(hectareasTotal);
    const hectareasCacaoNum = parseFloat(hectareasCacao);
    if (!Number.isFinite(hectareasTotalNum) || !Number.isFinite(hectareasCacaoNum)) {
      window.alert('Las hectáreas deben ser números válidos.');
      return;
    }
    if (hectareasTotalNum < 0 || hectareasCacaoNum < 0) {
      window.alert('Las hectáreas no pueden ser negativas.');
      return;
    }
    if (hectareasCacaoNum > hectareasTotalNum) {
      window.alert('Las hectáreas de cacao no pueden ser mayores al total de hectáreas.');
      return;
    }

    const newFincaData = {
      nombre: nombre.trim(),
      propietario: propietario.trim(),
      vereda: vereda.trim(),
      municipio: municipio.trim(),
      hectareasTotal: hectareasTotalNum,
      hectareasCacao: hectareasCacaoNum
    };

    const creada = await onAddFinca(newFincaData);
    if (!creada) return;

    voiceAssistant.speak(`Finca ${nombreLimpio} guardada exitosamente.`);
    setShowAddFincaModal(false);
    setNombre('');
    setPropietario('');
    setVereda('');
    setMunicipio('');
    setHectareasTotal('5');
    setHectareasCacao('3.5');
  };

  const handleCreateZona = (e: React.FormEvent, fincaId: string) => {
    e.preventDefault();
    if (!nombreZona.trim()) return;

    onAddZona({
      fincaId,
      nombreZona,
      variedadCacao,
      arbolesEstimados: parseInt(arbolesEstimados, 10) || 500,
      hectareas: parseFloat(hectareasZona) || 1.0
    });

    voiceAssistant.speak(`Lote de cultivo ${nombreZona} agregado a la finca.`);
    setExpandedZones((prev) => ({ ...prev, [fincaId]: true }));
    setShowAddZonaModal(null);
    setNombreZona('');
  };

  const handleUpdateFinca = (e: React.FormEvent) => {
    e.preventDefault();
    const hectareasTotalEditadas = Number(hectareasEditTotal);
    const hectareasCacaoEditadas = Number(hectareasEditCacao);
    if (
      !editingFinca ||
      !(editingFinca.nombre || '').trim() ||
      !(editingFinca.propietario || '').trim() ||
      !(editingFinca.municipio || '').trim() ||
      !(editingFinca.vereda || '').trim() ||
      hectareasEditTotal.trim() === '' ||
      hectareasEditCacao.trim() === '' ||
      !Number.isFinite(hectareasTotalEditadas) ||
      !Number.isFinite(hectareasCacaoEditadas) ||
      hectareasTotalEditadas < 0 ||
      hectareasCacaoEditadas < 0 ||
      hectareasCacaoEditadas > hectareasTotalEditadas
    ) {
      window.alert('Completa nombre, propietario, municipio, vereda y hectáreas válidas antes de guardar.');
      return;
    }

    onUpdateFinca(editingFinca.id, {
      nombre: editingFinca.nombre.trim(),
      propietario: editingFinca.propietario.trim(),
      vereda: editingFinca.vereda.trim(),
      municipio: editingFinca.municipio.trim(),
      hectareasTotal: hectareasTotalEditadas,
      hectareasCacao: hectareasCacaoEditadas,
      codigoPredial: editingFinca.codigoPredial,
      imagen: editingFinca.imagen
    });
    setEditingFinca(null);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      <div className="bg-emerald-900 border-4 border-emerald-600 text-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-400 text-emerald-950 font-black text-xs px-2.5 py-0.5 rounded-full uppercase">
              MÓDULO DE TERRENOS
            </span>
            <span className="text-emerald-200 text-xs font-bold">Tablas: Finca y Lotes</span>
          </div>
          <h2 className="text-3xl font-black font-serif text-emerald-100 flex items-center gap-2">
            <Sprout className="w-8 h-8 text-emerald-300" />
            Fincas y Lotes de Cultivo
          </h2>
          <p className="text-emerald-200 text-sm mt-1">
            Consulta el nombre del propietario, la vereda y las hectáreas sembradas con variedades de cacao.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <VoiceHelpButton
            textToRead="Módulo de Fincas y Lotes de Cultivo. Aquí ves las tarjetas de tus fincas con el propietario, vereda y hectáreas. Más abajo está el botón para agregar una nueva finca."
            size="md"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {fincas.map((finca) => {
          const zonasFinca = zonas.filter((z) => z.fincaId === finca.id);
          const fincaReadout = `Finca: ${finca.nombre}. Propietario: ${finca.propietario}. Vereda: ${finca.vereda}. HectÃ¡reas de Cacao: ${finca.hectareasCacao} de un total de ${finca.hectareasTotal} hectÃ¡reas. Lotes registrados: ${zonasFinca.length}.`;

          return (
            <div
              key={finca.id}
              className="bg-white border-4 border-emerald-800/80 rounded-3xl p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2 border-b-2 border-emerald-100 pb-3">
                  <div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg uppercase">
                      {finca.vereda}
                    </span>
                    <h3 className="text-2xl font-black text-stone-900 mt-1">{finca.nombre}</h3>
                  </div>
                  <VoiceHelpButton textToRead={fincaReadout} size="sm" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-stone-50 p-3 rounded-2xl border-2 border-stone-200 flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-900 rounded-xl">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-xs text-stone-500 font-bold uppercase">Propietario</span>
                      <span className="font-extrabold text-stone-900">{finca.propietario}</span>
                    </div>
                  </div>

                  <div className="bg-stone-50 p-3 rounded-2xl border-2 border-stone-200 flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-900 rounded-xl">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-xs text-stone-500 font-bold uppercase">Ubicación</span>
                      <span className="font-extrabold text-stone-900">{finca.vereda}</span>
                    </div>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-2xl border-2 border-amber-300 flex items-center gap-3 sm:col-span-2">
                    <div className="p-2 bg-amber-200 text-amber-950 rounded-xl font-black">
                      <Trees className="w-6 h-6" />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <span className="block text-xs text-amber-800 font-bold uppercase">Área Cacao Sembrado</span>
                        <span className="text-xl font-black text-amber-950">{finca.hectareasCacao} Hectáreas</span>
                      </div>
                      <span className="text-xs font-bold text-stone-600 bg-white px-2 py-1 rounded-lg border border-amber-200">
                        Total finca: {finca.hectareasTotal} Ha
                      </span>
                    </div>
                  </div>
                </div>

                                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setExpandedZones((prev) => ({ ...prev, [finca.id]: !prev[finca.id] }))}
                      className="font-extrabold text-stone-800 text-base flex items-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-5 h-5 text-emerald-700" />
                      <span>
                        Lotes de Cultivo ({zonasFinca.length})
                        <span className="ml-2 text-xs font-black text-emerald-700">
                          {expandedZones[finca.id] ? 'Ocultar' : 'Ver'}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddZonaModal(finca.id)}
                      className="text-xs font-black text-emerald-800 hover:text-emerald-950 bg-emerald-100 px-2.5 py-1 rounded-xl border border-emerald-300 cursor-pointer"
                    >
                      + Agregar Lote
                    </button>
                  </div>

                  {expandedZones[finca.id] && (
                    zonasFinca.length === 0 ? (
                      <p className="text-xs text-stone-500 italic p-3 bg-stone-50 rounded-xl border border-dashed">
                        No hay lotes de cultivo agregados a esta finca.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {zonasFinca.map((zona) => (
                          <div
                            key={zona.id}
                            className="p-3 bg-emerald-50/60 rounded-2xl border-2 border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                          >
                            <div>
                              <span className="font-extrabold text-stone-900 text-sm">{zona.nombreZona}</span>
                              <span className="block text-xs text-emerald-900 font-bold">
                                Variedad: <span className="bg-emerald-200 px-1.5 py-0.5 rounded text-emerald-950 font-black">{zona.variedadCacao}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold text-stone-700 flex-wrap justify-end">
                              <span>{zona.arbolesEstimados} Árboles</span>
                              <span>•</span>
                              <span>{zona.hectareas} Ha</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`¿Eliminar el lote "${zona.nombreZona}"?`)) {
                                    onDeleteZona(zona.id);
                                    voiceAssistant.speak(`Lote ${zona.nombreZona} eliminado.`);
                                  }
                                }}
                                className="ml-1 px-2 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-black"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-stone-200 flex justify-end">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Â¿Seguro que quieres eliminar la finca "${finca.nombre}"?`)) {
                          onDeleteFinca(finca.id);
                          voiceAssistant.speak(`Finca ${finca.nombre} eliminada.`);
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        {
                          setEditingFinca({
                            ...finca,
                            vereda: finca.vereda === 'Por completar' ? '' : finca.vereda,
                            municipio: finca.municipio === 'Por completar' ? '' : finca.municipio
                          });
                          setHectareasEditTotal(String(Number(finca.hectareasTotal)));
                          setHectareasEditCacao(String(Number(finca.hectareasCacao)));
                        }
                      }
                      className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                      Editar datos de finca
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => setShowAddFincaModal(true)}
          className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base flex items-center gap-2 shadow-xl border-2 border-emerald-800 cursor-pointer"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
          <span>Agregar Finca</span>
        </button>
      </div>

      {previewFinca && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-white border-4 border-emerald-800/80 rounded-3xl p-6 shadow-2xl max-w-lg w-full">
            <div className="flex items-start justify-between gap-2 border-b-2 border-emerald-100 pb-3">
              <div>
                <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg uppercase">
                  Por completar
                </span>
                <h3 className="text-2xl font-black text-stone-900 mt-1">{previewFinca.nombre}</h3>
              </div>
              <VoiceHelpButton
                textToRead={`Finca ${previewFinca.nombre}. Propietario ${previewFinca.propietario}. Vereda ${previewFinca.vereda}. HectÃ¡reas de cacao ${previewFinca.hectareasCacao}.`}
                size="sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-4">
              <div className="bg-stone-50 p-3 rounded-2xl border-2 border-stone-200 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-900 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xs text-stone-500 font-bold uppercase">Propietario</span>
                  <span className="font-extrabold text-stone-900">{previewFinca.propietario}</span>
                </div>
              </div>

              <div className="bg-stone-50 p-3 rounded-2xl border-2 border-stone-200 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-900 rounded-xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xs text-stone-500 font-bold uppercase">UbicaciÃ³n</span>
                  <span className="font-extrabold text-stone-900">Por completar</span>
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-2xl border-2 border-amber-300 flex items-center gap-3 sm:col-span-2">
                <div className="p-2 bg-amber-200 text-amber-950 rounded-xl font-black">
                  <Trees className="w-6 h-6" />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <span className="block text-xs text-amber-800 font-bold uppercase">Ãrea cacao sembrado</span>
                    <span className="text-xl font-black text-amber-950">{previewFinca.hectareasCacao} HectÃ¡reas</span>
                  </div>
                  <span className="text-xs font-bold text-stone-600 bg-white px-2 py-1 rounded-lg border border-amber-200">
                    Total finca: {previewFinca.hectareasTotal} Ha
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-stone-800 text-base flex items-center gap-1.5">
                  <Layers className="w-5 h-5 text-emerald-700" />
                  Lotes de Cultivo (0)
                </h4>
                <button
                  type="button"
                  className="text-xs font-black text-emerald-800 hover:text-emerald-950 bg-emerald-100 px-2.5 py-1 rounded-xl border border-emerald-300 cursor-pointer"
                >
                  + Agregar Lote
                </button>
              </div>
              <p className="text-xs text-stone-500 italic p-3 bg-stone-50 rounded-xl border border-dashed">
                No hay lotes de cultivo agregados a esta finca.
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewFinca(null)}
                className="px-4 py-2 rounded-xl bg-stone-200 font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {editingFinca && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-emerald-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-black text-stone-900 mb-4">Editar datos de la finca</h3>
            <form onSubmit={handleUpdateFinca} className="space-y-3">
              <input
                required
                value={editingFinca.nombre}
                onChange={(e) => setEditingFinca({ ...editingFinca, nombre: e.target.value })}
                placeholder="Nombre de la finca"
                className="w-full p-3 rounded-xl border-2 border-stone-300 font-bold"
              />
              <input
                required
                value={editingFinca.propietario}
                onChange={(e) => setEditingFinca({ ...editingFinca, propietario: e.target.value })}
                placeholder="Propietario"
                className="w-full p-3 rounded-xl border-2 border-stone-300 font-bold"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700">Municipio</label>
                  <select
                    required
                    value={editingFinca.municipio}
                    onChange={(e) => setEditingFinca({
                      ...editingFinca,
                      municipio: e.target.value,
                      vereda: ''
                    })}
                    className="w-full p-3 rounded-xl border-2 border-stone-300 font-bold bg-white"
                  >
                    <option value="">Selecciona un municipio</option>
                    {editingFinca.municipio &&
                      editingFinca.municipio !== 'Por completar' &&
                      !MUNICIPIOS_SANTANDER.includes(editingFinca.municipio as typeof MUNICIPIOS_SANTANDER[number]) && (
                        <option value={editingFinca.municipio}>{editingFinca.municipio}</option>
                      )}
                    {MUNICIPIOS_SANTANDER.map((nombreMunicipio) => (
                      <option key={nombreMunicipio} value={nombreMunicipio}>{nombreMunicipio}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Vereda</label>
                  <select
                    required
                    value={editingFinca.vereda}
                    disabled={!editingFinca.municipio}
                    onChange={(e) => setEditingFinca({ ...editingFinca, vereda: e.target.value })}
                    className="w-full p-3 rounded-xl border-2 border-stone-300 font-bold bg-white disabled:bg-stone-100"
                  >
                    <option value="">Selecciona una vereda</option>
                    {editingFinca.vereda &&
                      editingFinca.vereda !== 'Por completar' &&
                      !(VEREDAS_POR_MUNICIPIO[editingFinca.municipio] || []).includes(editingFinca.vereda) && (
                        <option value={editingFinca.vereda}>{editingFinca.vereda}</option>
                      )}
                    {(VEREDAS_POR_MUNICIPIO[editingFinca.municipio] || []).map((nombreVereda) => (
                      <option key={nombreVereda} value={nombreVereda}>{nombreVereda}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold">Ha. totales</label>
                  <input
                    required
                    min="0"
                    step="0.1"
                    type="text"
                    inputMode="decimal"
                    value={hectareasEditTotal}
                    onChange={(e) => setHectareasEditTotal(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full p-3 rounded-xl border-2 border-stone-300 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold">Ha. cacao</label>
                  <input
                    required
                    min="0"
                    step="0.1"
                    type="text"
                    inputMode="decimal"
                    value={hectareasEditCacao}
                    onChange={(e) => setHectareasEditCacao(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full p-3 rounded-xl border-2 border-stone-300 font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setEditingFinca(null)} className="px-4 py-2 rounded-xl bg-stone-200 font-bold">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold">
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddFincaModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 pointer-events-auto">
          <div className="relative z-10 bg-white border-4 border-emerald-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b-2 border-emerald-100 pb-3">
              <h3 className="text-2xl font-black text-stone-900 flex items-center gap-2">
                <Sprout className="w-7 h-7 text-emerald-700" />
                Registrar Nueva Finca
              </h3>
              <button
                type="button"
                onClick={() => setShowAddFincaModal(false)}
                className="p-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateFinca} className="space-y-4">
              <div>
                <label className="block text-sm font-extrabold text-stone-800 mb-1">Nombre de la Finca:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Finca La Esperanza"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full p-3 rounded-2xl border-2 border-stone-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-400 font-bold text-lg text-stone-900"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-stone-800 mb-1">Nombre del Propietario / Campesino:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Don Jose Ignacio GÃ³mez"
                  value={propietario}
                  onChange={(e) => setPropietario(e.target.value)}
                  className="w-full p-3 rounded-2xl border-2 border-stone-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-400 font-bold text-lg text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-extrabold text-stone-800 mb-1">Vereda:</label>
                  <select
                    required
                    value={vereda}
                    disabled={!municipio}
                    onChange={(e) => setVereda(e.target.value)}
                    className="w-full p-3 rounded-2xl border-2 border-stone-300 focus:border-emerald-600 font-bold text-base text-stone-900 bg-white disabled:bg-stone-100 disabled:text-stone-400"
                  >
                    <option value="">
                      {municipio ? 'Selecciona una vereda' : 'Primero selecciona un municipio'}
                    </option>
                    {veredasDisponibles.map((nombreVereda) => (
                      <option key={nombreVereda} value={nombreVereda}>{nombreVereda}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-stone-800 mb-1">Municipio:</label>
                  <select
                    required
                    value={municipio}
                    onChange={(e) => {
                      setMunicipio(e.target.value);
                      setVereda('');
                    }}
                    className="w-full p-3 rounded-2xl border-2 border-stone-300 focus:border-emerald-600 font-bold text-base text-stone-900 bg-white"
                  >
                    <option value="">Selecciona un municipio</option>
                    {MUNICIPIOS_SANTANDER.map((nombreMunicipio) => (
                      <option key={nombreMunicipio} value={nombreMunicipio}>{nombreMunicipio}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-extrabold text-stone-800 mb-1">HectÃ¡reas Totales:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={hectareasTotal}
                    onChange={(e) => setHectareasTotal(e.target.value)}
                    className="w-full p-3 rounded-2xl border-2 border-stone-300 font-black text-xl text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-stone-800 mb-1">Ha. en Cacao:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={hectareasCacao}
                    onChange={(e) => setHectareasCacao(e.target.value)}
                    className="w-full p-3 rounded-2xl border-2 border-emerald-400 bg-emerald-50 font-black text-xl text-emerald-950"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddFincaModal(false)}
                  className="px-4 py-3 rounded-2xl bg-stone-200 font-bold text-stone-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg flex items-center gap-2 border-2 border-emerald-800 shadow-lg cursor-pointer"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                  Guardar Finca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddZonaModal && (
        <div className="fixed inset-0 z-[60] bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 pointer-events-auto">
          <div className="relative z-10 bg-white border-4 border-emerald-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-emerald-100 pb-2">
              <h3 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <Layers className="w-6 h-6 text-emerald-700" />
                Agregar Lote de Cacao
              </h3>
              <button
                type="button"
                onClick={() => setShowAddZonaModal(null)}
                className="p-1 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleCreateZona(e, showAddZonaModal)} className="space-y-4">
              <div>
                <label className="block text-sm font-extrabold text-stone-800 mb-1">Nombre del Lote:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lote El Mirador"
                  value={nombreZona}
                  onChange={(e) => setNombreZona(e.target.value)}
                  className="w-full p-3 rounded-2xl border-2 border-stone-300 font-bold text-lg text-stone-900"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-stone-800 mb-1">Variedad de Cacao Cultivado:</label>
                <select
                  value={variedadCacao}
                  onChange={(e) => setVariedadCacao(e.target.value)}
                  className="w-full p-3 rounded-2xl border-2 border-stone-300 font-bold text-base text-stone-900 bg-white"
                >
                  <option value="CCN-51">CCN-51 (Alto Rendimiento)</option>
                  <option value="Cacao Fino de Aroma">Cacao Fino de Aroma Nativo</option>
                  <option value="ICS-39 y TSH-565">ICS-39 y TSH-565</option>
                  <option value="Clones HÃ­bridos Seleccionados">Clones HÃ­bridos Seleccionados</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-extrabold text-stone-800 mb-1">Árboles Est.:</label>
                  <input
                    type="number"
                    value={arbolesEstimados}
                    onChange={(e) => setArbolesEstimados(e.target.value)}
                    className="w-full p-3 rounded-2xl border-2 border-stone-300 font-black text-lg text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-stone-800 mb-1">Hectáreas:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={hectareasZona}
                    onChange={(e) => setHectareasZona(e.target.value)}
                    className="w-full p-3 rounded-2xl border-2 border-stone-300 font-black text-lg text-stone-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddZonaModal(null)}
                  className="px-4 py-2 rounded-xl bg-stone-200 font-bold text-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-base"
                >
                  Agregar Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

