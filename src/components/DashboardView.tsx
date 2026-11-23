import React from 'react';
import {
  ShoppingBag,
  PackageCheck,
  Wallet,
  Sprout,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  TrendingUp,
  PlusCircle
} from 'lucide-react';
import { Finca, ProductoInventario, MovimientoCaja, Recoleccion, Venta } from '../types';
import { VoiceHelpButton } from './VoiceHelpButton';
import { ActiveTab } from './Navbar';

interface DashboardViewProps {
  fincas: Finca[];
  inventario: ProductoInventario[];
  caja: MovimientoCaja[];
  recolecciones: Recoleccion[];
  ventas: Venta[];
  totalKilosInventario: number;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenQuickHarvestModal: () => void;
  onOpenQuickSaleModal: () => void;
  onOpenQuickExpenseModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  fincas,
  inventario,
  caja,
  recolecciones,
  ventas,
  totalKilosInventario,
  setActiveTab,
  onOpenQuickHarvestModal,
  onOpenQuickSaleModal,
  onOpenQuickExpenseModal
}) => {
  const kilosSecoPremium = inventario
    .filter((i) => i.tipoProducto === 'cacao_seco_premium')
    .reduce((acc, curr) => acc + curr.cantidadKg, 0);
  const kilosBaba = recolecciones.reduce((acc, curr) => acc + curr.kilosBaba, 0);
  const totalVentas = ventas.reduce((acc, curr) => acc + curr.totalVenta, 0);
  const ingresosTotal = caja.filter((m) => m.tipo === 'ingreso').reduce((acc, curr) => acc + curr.monto, 0);
  const egresosTotal = caja.filter((m) => m.tipo === 'egreso').reduce((acc, curr) => acc + curr.monto, 0);
  const saldoCaja = ingresosTotal - egresosTotal;

  const monthFormatter = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
  const monthlyMap = new Map<string, { kilosBaba: number; ventas: number; gastos: number }>();

  const addMonthlyValue = (dateStr: string, key: 'kilosBaba' | 'ventas' | 'gastos', value: number) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return;
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const current = monthlyMap.get(monthKey) || { kilosBaba: 0, ventas: 0, gastos: 0 };
    current[key] += value;
    monthlyMap.set(monthKey, current);
  };

  recolecciones.forEach((rec) => addMonthlyValue(rec.fecha, 'kilosBaba', rec.kilosBaba));
  ventas.forEach((venta) => addMonthlyValue(venta.fecha, 'ventas', venta.totalVenta));
  caja
    .filter((mov) => mov.tipo === 'egreso')
    .forEach((mov) => addMonthlyValue(mov.fecha, 'gastos', mov.monto));

  const monthlySummary = Array.from(monthlyMap.entries())
    .map(([key, value]) => {
      const [year, month] = key.split('-').map(Number);
      return {
        key,
        label: monthFormatter.format(new Date(year, month, 1)),
        ...value
      };
    })
    .sort((a, b) => b.key.localeCompare(a.key));

  const formatCOP = (monto: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(monto);

  const summaryText = `Tienes ${fincas.length} fincas, ${totalKilosInventario} kilos en inventario, ${kilosBaba} kilos de baba registrados y un saldo de caja de ${saldoCaja} pesos.`;

  const kpiCards = [
    {
      title: 'Inventario total',
      value: `${totalKilosInventario} Kg`,
      subtitle: `${kilosSecoPremium || totalKilosInventario} Kg de cacao listo`,
      icon: Scale,
      color: 'amber'
    },
    {
      title: 'Fincas',
      value: `${fincas.length}`,
      subtitle: `${kilosBaba} Kg baba registrados`,
      icon: Sprout,
      color: 'emerald'
    },
    {
      title: 'Caja',
      value: formatCOP(saldoCaja),
      subtitle: `Ventas: ${formatCOP(totalVentas)}`,
      icon: Wallet,
      color: 'slate'
    }
  ] as const;

  const actionCards = [
    {
      title: 'Registrar cosecha',
      description: 'Guardar kilos de baba y estado del cacao',
      icon: ShoppingBag,
      onClick: onOpenQuickHarvestModal,
      color: 'orange'
    },
    {
      title: 'Ver historial',
      description: 'Consultar registros de cacao por finca',
      icon: PackageCheck,
      onClick: () => setActiveTab('inventario'),
      color: 'yellow'
    },
    {
      title: 'Registrar venta',
      description: 'Vender cacao y mover el saldo a caja',
      icon: TrendingUp,
      onClick: onOpenQuickSaleModal,
      color: 'emerald'
    },
    {
      title: 'Caja diaria',
      description: 'Revisar ingresos, egresos y movimientos',
      icon: Wallet,
      onClick: onOpenQuickExpenseModal,
      color: 'slate'
    }
  ] as const;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      <div className="bg-stone-950 text-amber-50 rounded-3xl p-6 sm:p-7 border-4 border-amber-800 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 bg-amber-500 text-stone-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider">
              Panel principal
            </span>
            <h2 className="text-2xl sm:text-4xl font-black font-serif text-amber-100">
              Resumen de la finca
            </h2>
            <p className="text-amber-200 text-sm sm:text-base max-w-2xl">
              Mira lo importante primero y entra a la acción que necesites sin perder tiempo.
            </p>
          </div>

          <VoiceHelpButton
            textToRead={summaryText}
            label="Escuchar resumen"
            size="lg"
            className="shadow-xl"
          />
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const styles =
            card.color === 'amber'
              ? 'bg-amber-50 border-amber-500 text-amber-950'
              : card.color === 'emerald'
              ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
              : 'bg-stone-50 border-stone-300 text-stone-950';

          return (
            <div key={card.title} className={`p-5 rounded-3xl border-2 shadow-sm ${styles}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider opacity-70">{card.title}</p>
                  <h3 className="text-3xl sm:text-4xl font-black mt-1">{card.value}</h3>
                </div>
                <div className="p-3 rounded-2xl bg-white/70 border border-black/10">
                  <Icon className="w-7 h-7" />
                </div>
              </div>
              <p className="text-sm font-medium mt-3 opacity-80">{card.subtitle}</p>
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl sm:text-2xl font-black text-stone-900">Acciones rápidas</h3>
          <VoiceHelpButton
            textToRead="Usa estos cuatro accesos rápidos para trabajar con cosechas, inventario, ventas y caja."
            size="sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {actionCards.map((action) => {
            const Icon = action.icon;
            const styles =
              action.color === 'orange'
                ? 'from-orange-600 to-orange-700 border-orange-900'
                : action.color === 'yellow'
                ? 'from-yellow-700 to-yellow-800 border-yellow-950'
                : action.color === 'emerald'
                ? 'from-emerald-700 to-emerald-800 border-emerald-950'
                : 'from-stone-800 to-stone-900 border-stone-950';

            return (
              <button
                key={action.title}
                type="button"
                onClick={action.onClick}
                className={`p-5 rounded-3xl border-4 text-left shadow-lg text-white bg-gradient-to-b ${styles} transition-transform hover:scale-[1.01]`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="p-3 rounded-2xl bg-white/15 border border-white/20">
                    <Icon className="w-8 h-8" />
                  </div>
                  <PlusCircle className="w-5 h-5 opacity-70" />
                </div>
                <h4 className="text-xl font-black mt-4">{action.title}</h4>
                <p className="text-sm text-white/85 mt-1 leading-snug">{action.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border-2 border-stone-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-black text-stone-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-600" />
              Últimas recolecciones
            </h3>
            <button
              onClick={() => setActiveTab('recoleccion')}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 underline"
            >
              Ver todo
            </button>
          </div>

          <div className="space-y-3">
            {recolecciones.slice(0, 3).map((rec) => {
              const finca = fincas.find((f) => f.id === rec.fincaId);
              return (
                <div key={rec.id} className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-stone-900">{finca?.nombre || 'Finca'}</p>
                      <p className="text-xs text-stone-600 mt-1">
                        {rec.fecha} · {rec.responsable}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-orange-950">{rec.kilosBaba} Kg</p>
                      <p className="text-xs text-emerald-800 font-semibold">~{rec.rendimientoEstimadoSeco} Kg seco</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border-2 border-stone-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-black text-stone-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              Movimientos recientes
            </h3>
            <button
              onClick={onOpenQuickExpenseModal}
              className="px-3 py-1.5 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 cursor-pointer"
            >
              + Gasto
            </button>
          </div>

          <div className="space-y-3">
            {caja.slice(0, 4).map((mov) => (
              <div
                key={mov.id}
                className={`p-3.5 rounded-2xl border ${
                  mov.tipo === 'ingreso'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-rose-50 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-stone-900">{mov.concepto}</p>
                    <p className="text-xs text-stone-600 mt-1">{mov.fecha}</p>
                  </div>
                  <div className={`font-black ${mov.tipo === 'ingreso' ? 'text-emerald-800' : 'text-rose-800'}`}>
                    {mov.tipo === 'ingreso' ? '+' : '-'}{formatCOP(mov.monto)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white border-2 border-stone-200 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-stone-900">Historial por mes</h3>
            <p className="text-sm text-stone-600">
              Resumen rápido de kilos, ventas y gastos para cada mes.
            </p>
          </div>
          <VoiceHelpButton
            textToRead="Historial mensual. Aquí ves el resumen de kilos baba, ventas y gastos por cada mes."
            size="sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left border-collapse">
            <thead>
              <tr className="bg-stone-100 border-b-2 border-stone-300 text-stone-700 text-xs font-black uppercase">
                <th className="p-3">Mes</th>
                <th className="p-3">Kilos baba</th>
                <th className="p-3">Ventas</th>
                <th className="p-3">Gastos</th>
                <th className="p-3">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-sm font-bold text-stone-900">
              {monthlySummary.length === 0 ? (
                <tr>
                  <td className="p-4 text-stone-500" colSpan={5}>
                    Aún no hay datos mensuales para mostrar.
                  </td>
                </tr>
              ) : (
                monthlySummary.map((month) => {
                  const balance = month.ventas - month.gastos;
                  return (
                    <tr key={month.key} className="hover:bg-stone-50">
                      <td className="p-3 capitalize">{month.label}</td>
                      <td className="p-3 text-orange-950">{month.kilosBaba} Kg</td>
                      <td className="p-3 text-emerald-800">{formatCOP(month.ventas)}</td>
                      <td className="p-3 text-rose-800">{formatCOP(month.gastos)}</td>
                      <td className={`p-3 font-black ${balance >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {formatCOP(balance)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
