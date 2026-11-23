/**
 * Panel administrativo de gestión de productores registrados.
 * Permite buscar y filtrar productores, consultar indicadores consolidados por finca
 * y restablecer contraseñas de acceso.
 */
import React, { useMemo, useState } from 'react';
import {
  Users,
  MapPin,
  PackageCheck,
  ShoppingBag,
  Wallet,
  KeyRound,
  Search,
  Filter,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Building2
} from 'lucide-react';
import { Usuario, Finca, ProductoInventario, Recoleccion, MovimientoCaja } from '../types';

// Propiedades con los datos globales del sistema y el callback para restablecer contraseñas
interface AdminClientsViewProps {
  users: Usuario[];
  fincas: Finca[];
  inventario: ProductoInventario[];
  recolecciones: Recoleccion[];
  caja: MovimientoCaja[];
  onResetPassword: (userId: string, password: string) => void;
}

export const AdminClientsView: React.FC<AdminClientsViewProps> = ({
  users,
  fincas,
  inventario,
  recolecciones,
  caja,
  onResetPassword
}) => {
  // Estados para búsqueda libre y filtro por asignación de finca
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'con-finca' | 'sin-finca'>('todos');

  // Excluye cuentas administradoras para listar únicamente a los productores
  const productores = useMemo(() => users.filter((user) => user.rol !== 'admin'), [users]);

  // Formatea valores monetarios en pesos colombianos (COP)
  const formatCOP = (value: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(value);

  // Indicadores globales mostrados en el encabezado y tarjetas de resumen
  const totalKilosInventario = inventario.reduce((sum, item) => sum + item.cantidadKg, 0);
  const totalCosechas = recolecciones.length;
  const totalCaja = caja.reduce((sum, item) => sum + (item.tipo === 'ingreso' ? item.monto : -item.monto), 0);
  const productoresConFinca = productores.filter((user) => Boolean(user.fincaId)).length;

  // Aplica la búsqueda por texto y el filtro de finca asignada sobre la lista de productores
  const productoresFiltrados = productores.filter((user) => {
    const finca = fincas.find((item) => item.id === user.fincaId);
    const texto = `${user.nombreCompleto} ${user.cedula} ${user.celularWhatsApp} ${user.nombreFincaVereda} ${finca?.nombre || ''}`.toLowerCase();
    const coincideBusqueda = texto.includes(search.trim().toLowerCase());
    const coincideEstado =
      filtroEstado === 'todos' ||
      (filtroEstado === 'con-finca' && Boolean(user.fincaId)) ||
      (filtroEstado === 'sin-finca' && !user.fincaId);

    return coincideBusqueda && coincideEstado;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Encabezado del panel administrativo con métricas globales */}
      <div className="bg-stone-950 text-amber-50 rounded-3xl p-6 sm:p-7 border-4 border-amber-800 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 bg-amber-500 text-stone-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Panel administrativo
            </span>
            <h2 className="text-2xl sm:text-4xl font-black font-serif text-amber-100">
              Gestion de productores
            </h2>
            <p className="text-amber-200 text-sm sm:text-base max-w-2xl">
              Aqui ves quien esta registrado, su finca, su actividad y su acceso. Lo deje con una lectura mas clara para trabajar rapido.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="bg-amber-950/80 border border-amber-700 rounded-2xl px-4 py-3 text-center">
              <p className="text-[11px] uppercase font-black text-amber-300">Productores</p>
              <p className="text-2xl font-black text-amber-100">{productores.length}</p>
            </div>
            <div className="bg-emerald-950/80 border border-emerald-700 rounded-2xl px-4 py-3 text-center">
              <p className="text-[11px] uppercase font-black text-emerald-300">Con finca</p>
              <p className="text-2xl font-black text-emerald-100">{productoresConFinca}</p>
            </div>
            <div className="bg-sky-950/80 border border-sky-700 rounded-2xl px-4 py-3 text-center">
              <p className="text-[11px] uppercase font-black text-sky-300">Cosechas</p>
              <p className="text-2xl font-black text-sky-100">{totalCosechas}</p>
            </div>
            <div className="bg-lime-950/80 border border-lime-700 rounded-2xl px-4 py-3 text-center">
              <p className="text-[11px] uppercase font-black text-lime-300">Caja total</p>
              <p className="text-lg font-black text-lime-100">{formatCOP(totalCaja)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda, filtro rápido y resumen de inventario total */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-4 border-2 border-stone-200 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-stone-500 flex items-center gap-2">
            <Search className="w-4 h-4 text-amber-700" />
            Buscar productor
          </p>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, cedula, finca o vereda"
            className="mt-2 w-full p-3 rounded-2xl border-2 border-stone-300 font-semibold text-stone-900 outline-none focus:border-amber-500"
          />
        </div>

        <div className="bg-white rounded-3xl p-4 border-2 border-stone-200 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-stone-500 flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-700" />
            Filtro rapido
          </p>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
            className="mt-2 w-full p-3 rounded-2xl border-2 border-stone-300 font-semibold text-stone-900 bg-white outline-none focus:border-amber-500"
          >
            <option value="todos">Todos</option>
            <option value="con-finca">Con finca asignada</option>
            <option value="sin-finca">Sin finca asignada</option>
          </select>
        </div>

        <div className="bg-white rounded-3xl p-4 border-2 border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-stone-500 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-700" />
              Inventario total
            </p>
            <p className="text-sm font-bold text-stone-600 mt-1">{totalKilosInventario} Kg disponibles</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
            <Sprout className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Listado de tarjetas por productor o mensaje vacío si no hay coincidencias */}
      {productoresFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 border-2 border-stone-200 font-bold text-stone-600">
          No hay productores que coincidan con el filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {productoresFiltrados.map((user) => {
            // Calcula métricas individuales del productor a partir de su finca, cosechas y caja
            const finca = fincas.find((item) => item.id === user.fincaId);
            const fincaId = user.fincaId;
            const kilos = inventario.filter((item) => item.fincaId === fincaId).reduce((sum, item) => sum + item.cantidadKg, 0);
            const cosechas = recolecciones.filter((item) => item.fincaId === fincaId).length;
            const saldo = caja
              .filter((item) => item.registradoPor === user.nombreCompleto)
              .reduce((sum, item) => sum + (item.tipo === 'ingreso' ? item.monto : -item.monto), 0);
            const ultimaRecoleccion = [...recolecciones]
              .filter((item) => item.fincaId === fincaId)
              .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

            return (
              <article key={user.id} className="bg-white rounded-3xl p-5 border-3 border-amber-200 shadow-sm space-y-4">
                {/* Datos personales y rol del productor */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-stone-900">{user.nombreCompleto}</h3>
                    <p className="text-sm text-stone-600">
                      Cedula: {user.cedula} | WhatsApp: {user.celularWhatsApp}
                    </p>
                  </div>
                  <span className="bg-amber-100 text-amber-900 text-[11px] font-black px-2.5 py-1 rounded-full uppercase">
                    {user.rol || 'productor'}
                  </span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                  <p className="font-bold text-emerald-950 flex gap-2 items-center">
                    <MapPin className="w-4 h-4" />
                    {finca?.nombre || user.nombreFincaVereda}
                  </p>
                  <p className="text-xs text-emerald-800">
                    {finca ? `${finca.vereda}, ${finca.municipio}` : 'Finca pendiente de registrar'}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-bold">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-950">
                    <PackageCheck className="w-4 h-4 mx-auto mb-1" />
                    {kilos} Kg
                  </div>
                  <div className="p-2 rounded-xl bg-orange-50 text-orange-950">
                    <ShoppingBag className="w-4 h-4 mx-auto mb-1" />
                    {cosechas} cosechas
                  </div>
                  <div className="p-2 rounded-xl bg-stone-100 text-stone-900">
                    <Wallet className="w-4 h-4 mx-auto mb-1" />
                    {formatCOP(saldo)}
                  </div>
                  <div className="p-2 rounded-xl bg-sky-50 text-sky-950">
                    <TrendingUp className="w-4 h-4 mx-auto mb-1" />
                    {ultimaRecoleccion ? ultimaRecoleccion.fecha : 'Sin actividad'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200">
                    <p className="text-stone-500 uppercase text-[10px]">Estado de la finca</p>
                    <p className="text-stone-900 mt-1">{finca ? 'Con finca asignada' : 'Sin finca asignada'}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200">
                    <p className="text-stone-500 uppercase text-[10px]">Ultima referencia</p>
                    <p className="text-stone-900 mt-1">{ultimaRecoleccion?.estadoProceso === 'seco_listo' ? 'Proceso finalizado' : ultimaRecoleccion ? 'Proceso en curso' : 'Sin registros'}</p>
                  </div>
                </div>

                {/* Botón administrativo para restablecer la contraseña del productor */}
                <button
                  type="button"
                  onClick={() => {
                    const password = window.prompt(`Nueva contrasena para ${user.nombreCompleto}:`, '1234');
                    if (password && password.length >= 4) onResetPassword(user.id, password);
                  }}
                  className="w-full py-2 rounded-xl bg-sky-800 hover:bg-sky-700 text-white text-xs font-black flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  Restablecer contrasena
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
