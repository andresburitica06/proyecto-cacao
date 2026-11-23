import React from 'react';
import { Home, Sprout, ShoppingBag, PackageCheck, Wallet, UserCheck, ShieldCheck, LogOut, User, Database } from 'lucide-react';
import { voiceAssistant } from '../services/voiceAssistant';
import { ActiveTab, Usuario } from '../types';

export type { ActiveTab };

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  totalKilosInventario: number;
  cajaSaldoDia: number;
  currentUser?: Usuario | null;
  isAdmin?: boolean;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalKilosInventario,
  cajaSaldoDia,
  currentUser,
  isAdmin = false,
  onLogout
}) => {
  const handleTabClick = (tab: ActiveTab, label: string) => {
    setActiveTab(tab);
    voiceAssistant.speak(`Abriendo pestaña: ${label}`, false);
  };

  const formatCOP = (monto: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(monto);
  };

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Inicio',
      subtitle: 'Resumen diario',
      icon: Home,
      color: 'bg-amber-700 text-white border-amber-900',
      hoverColor: 'hover:bg-amber-800'
    },
    {
      id: 'fincas' as ActiveTab,
      label: 'Fincas',
      subtitle: 'Terrenos y lotes',
      icon: Sprout,
      color: 'bg-emerald-800 text-white border-emerald-950',
      hoverColor: 'hover:bg-emerald-900'
    },
    {
      id: 'recoleccion' as ActiveTab,
      label: 'Cosecha',
      subtitle: 'Baba y estado',
      icon: ShoppingBag,
      color: 'bg-orange-700 text-white border-orange-900',
      hoverColor: 'hover:bg-orange-800'
    },
    {
      id: 'inventario' as ActiveTab,
      label: 'Historial',
      subtitle: `${totalKilosInventario} Kg registrados`,
      icon: PackageCheck,
      color: 'bg-yellow-800 text-white border-yellow-950',
      hoverColor: 'hover:bg-yellow-900'
    },
    {
      id: 'ventas_caja' as ActiveTab,
      label: 'Ventas y caja',
      subtitle: formatCOP(cajaSaldoDia),
      icon: Wallet,
      color: 'bg-lime-900 text-white border-lime-950',
      hoverColor: 'hover:bg-lime-800'
    },
    ...(isAdmin ? [{
      id: 'clientes' as ActiveTab,
      label: 'Clientes',
      subtitle: 'Productores',
      icon: UserCheck,
      color: 'bg-sky-800 text-white border-sky-950',
      hoverColor: 'hover:bg-sky-900'
    }, {
      id: 'configuracion' as ActiveTab,
      label: 'Base de datos',
      subtitle: 'Conexión',
      icon: Database,
      color: 'bg-violet-800 text-white border-violet-950',
      hoverColor: 'hover:bg-violet-900'
    }] : [])
  ];

  return (
    <header className="bg-gradient-to-b from-stone-900 to-amber-950 text-amber-50 shadow-xl border-b-8 border-amber-800">
      
      {/* Top Rural Header Branding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3 text-center md:text-left">
            <div className="p-3 bg-amber-600 rounded-2xl border-4 border-amber-400 shadow-lg text-stone-950 flex items-center justify-center">
              <span className="text-3xl sm:text-4xl">🍫</span>
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <span className="bg-amber-400 text-stone-950 text-xs font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                  ADSO CACAO
                </span>
                <span className="text-xs text-amber-300 font-bold bg-amber-900/80 px-2 py-0.5 rounded border border-amber-700">
                  Campesino-Friendly
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-amber-100 font-serif">
                Sistema de Gestión de Cacao
              </h1>
              <p className="text-amber-300/90 text-sm font-medium">
                Herramienta fácil para pequeños y medianos cacaoteros rurales
              </p>
            </div>
          </div>

          {/* Quick Metrics & User Bar in Header */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
            
            {/* Bloque del Usuario Activo e Información de Finca */}
            <div className="flex items-center gap-2.5 bg-amber-950/90 border-2 border-amber-700/80 px-3.5 py-2 rounded-2xl text-xs sm:text-sm text-amber-100 font-bold shadow">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 font-black flex items-center justify-center text-lg border-2 border-amber-300 shrink-0 shadow-sm">
                👨‍🌾
              </div>
              <div className="text-left">
                <p className="text-[10px] text-amber-300/90 uppercase font-black tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  Usuario Activo
                </p>
                <p className="text-sm font-black text-amber-50 truncate max-w-[140px] leading-tight">
                  {currentUser ? currentUser.nombreCompleto : 'Productor Cacaotero'}
                </p>
                {currentUser?.nombreFincaVereda && (
                  <p className="text-[10px] text-amber-200/80 truncate max-w-[140px]">
                    {currentUser.nombreFincaVereda}
                  </p>
                )}
              </div>
            </div>

            {/* BOTÓN INDEPENDIENTE Y DESTACADO DE CERRAR SESIÓN / SALIR */}
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  voiceAssistant.speak("Cerrando sesión. Volviendo a la pantalla de ingreso.", true);
                  onLogout();
                }}
                className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-800 via-rose-700 to-red-900 hover:from-rose-700 hover:to-red-800 active:scale-95 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 border-2 border-rose-950 shadow-lg transition-all cursor-pointer transform hover:scale-[1.03] ring-2 ring-rose-500/30"
                title="Cerrar la sesión actual y salir al Login"
              >
                <LogOut className="w-4 h-4 text-rose-200 shrink-0 animate-pulse" />
                <span className="font-black tracking-wide">Cerrar Sesión</span>
              </button>
            )}

            <div className="flex items-center gap-3 bg-amber-950/90 border-2 border-amber-700/80 p-2.5 rounded-2xl text-xs sm:text-sm">
              <div className="px-3 py-1.5 rounded-xl bg-amber-900/80 border border-amber-600 text-center">
                <p className="text-amber-300 text-[11px] font-bold uppercase">Inventario Total</p>
                <p className="text-lg font-black text-amber-100">{totalKilosInventario} <span className="text-xs font-normal">Kg</span></p>
              </div>
              <div className="w-px h-8 bg-amber-700"></div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-700 text-center">
                <p className="text-emerald-300 text-[11px] font-bold uppercase">Caja del Día</p>
                <p className="text-lg font-black text-emerald-200">{formatCOP(cajaSaldoDia)}</p>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Main Module Tabs (Giant, clear buttons) */}
      <nav className="bg-stone-950/80 border-t border-amber-800/60 px-2 py-3 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-start md:justify-between gap-2 min-w-max px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id, item.label)}
                className={`flex-1 min-w-[140px] sm:min-w-[170px] p-3 rounded-2xl transition-all duration-200 flex flex-col items-center text-center gap-1 border-3 cursor-pointer ${
                  isActive
                    ? `${item.color} shadow-lg ring-4 ring-amber-400/80 scale-102`
                    : 'bg-stone-900 hover:bg-stone-800 text-amber-200 border-amber-900/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-6 h-6 ${isActive ? 'text-amber-200 animate-bounce' : 'text-amber-400'}`} />
                  <span className="font-extrabold text-base sm:text-lg leading-tight">{item.label}</span>
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-amber-100 font-semibold' : 'text-amber-400/80'}`}>
                  {item.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

    </header>
  );
};
