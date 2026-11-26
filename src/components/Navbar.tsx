/**
 * Barra de navegación principal del sistema.
 * Muestra la identidad visual, el usuario activo, el botón de cierre de sesión,
 * indicadores rápidos de inventario y caja, y las pestañas de cada módulo.
 */
import React from 'react';
import { Home, Sprout, ShoppingBag, PackageCheck, Wallet, UserCheck, ShieldCheck, LogOut, User, Database, Layers } from 'lucide-react';
import { voiceAssistant } from '../services/voiceAssistant';
import { ActiveTab, Usuario } from '../types';

export type { ActiveTab };

// Propiedades recibidas desde App para controlar la pestaña activa y mostrar métricas globales
interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  totalKilosInventario: number;
  cajaSaldoDia: number;
  currentUser?: Usuario | null;
  isAdmin?: boolean;
  onLogout?: () => void;
  onOpenProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalKilosInventario,
  cajaSaldoDia,
  currentUser,
  isAdmin = false,
  onLogout,
  onOpenProfile
}) => {
  // Cambia la pestaña activa y anuncia el cambio mediante el asistente de voz
  const handleTabClick = (tab: ActiveTab, label: string) => {
    setActiveTab(tab);
    voiceAssistant.speak(`Abriendo pestaña: ${label}`, false);
  };

  // Formatea montos numéricos a pesos colombianos (COP) sin decimales
  const formatCOP = (monto: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(monto);
  };

  // Definición de pestañas disponibles; los módulos de Clientes y Base de datos solo se muestran a administradores
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
    <header className="bg-[#2C1A11] text-[#FAF6F0] shadow-md border-b-4 border-[#B84A00]">
      
      {/* Encabezado superior con marca del sistema */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logotipo y título principal */}
          <div className="flex items-center gap-3 text-center md:text-left">
            <div className="w-12 h-12 bg-[#B84A00] rounded-2xl border-2 border-amber-300/70 shadow-sm flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <span className="bg-amber-400 text-[#1C0D02] text-xs font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                  ADSO CACAO
                </span>
                <span className="text-xs text-amber-200 font-bold bg-[#1C0D02] px-2 py-0.5 rounded border border-[#5C3A24]">
                  Campesino-Friendly
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-amber-50 font-serif">
                Sistema de Gestión de Cacao
              </h1>
              <p className="text-amber-200/90 text-sm font-medium">
                Herramienta fácil para pequeños y medianos cacaoteros rurales
              </p>
            </div>
          </div>

          {/* Métricas rápidas y barra de usuario en el encabezado */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
            
            {/* Bloque del usuario activo e información de finca */}
            <button
              type="button"
              onClick={onOpenProfile}
              aria-label="Abrir perfil de usuario"
              title="Ver y actualizar perfil"
              className="flex items-center gap-2.5 bg-[#1C0D02] border border-[#5C3A24] px-3.5 py-2 rounded-2xl text-xs sm:text-sm text-amber-50 font-bold shadow cursor-pointer hover:border-[#B84A00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 transition-colors"
            >
              {currentUser?.fotoPerfil ? (
                <img
                  src={currentUser.fotoPerfil}
                  alt=""
                  className="w-9 h-9 rounded-xl border-2 border-amber-300/70 object-cover shrink-0 shadow-sm"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-[#B84A00] text-white font-black flex items-center justify-center text-base border border-amber-300/60 shrink-0 shadow-sm">
                  {currentUser?.nombreCompleto?.charAt(0).toUpperCase() || 'P'}
                </div>
              )}
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
            </button>

            {/* BOTÓN INDEPENDIENTE Y DESTACADO DE CERRAR SESIÓN / SALIR */}
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  voiceAssistant.speak("Cerrando sesión. Volviendo a la pantalla de ingreso.", true);
                  onLogout();
                }}
                className="px-3.5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-rose-400/30 shadow-sm transition-all cursor-pointer"
                title="Cerrar la sesión actual y salir al Login"
              >
                <LogOut className="w-4 h-4 text-white shrink-0" />
                <span className="font-bold tracking-wide">Cerrar Sesión</span>
              </button>
            )}

            {/* Resumen rápido de inventario total y saldo de caja del día */}
            <div className="flex items-center gap-3 bg-[#1C0D02] border border-[#5C3A24] p-2.5 rounded-2xl text-xs sm:text-sm">
              <div className="px-3 py-1.5 rounded-xl bg-[#2C1A11] border border-[#5C3A24] text-center">
                <p className="text-amber-300 text-[11px] font-bold uppercase">Inventario Total</p>
                <p className="text-lg font-black text-amber-50">{totalKilosInventario} <span className="text-xs font-normal">Kg</span></p>
              </div>
              <div className="w-px h-8 bg-[#5C3A24]"></div>
              <div className="px-3 py-1.5 rounded-xl bg-[#005F3C]/40 border border-[#005F3C] text-center">
                <p className="text-emerald-300 text-[11px] font-bold uppercase">Caja del Día</p>
                <p className="text-lg font-black text-emerald-200">{formatCOP(cajaSaldoDia)}</p>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Pestañas principales de navegación entre módulos */}
      <nav className="bg-[#1C0D02] border-t border-[#4A2B18] px-2 py-3 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-start md:justify-between gap-2 min-w-max px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id, item.label)}
                className={`flex-1 min-w-[140px] sm:min-w-[170px] p-3 rounded-xl transition-all duration-150 flex flex-col items-center text-center gap-1 cursor-pointer ${
                  isActive
                    ? 'bg-[#005F3C] text-white border-2 border-amber-400 shadow-md'
                    : 'bg-[#2C1A11] hover:bg-[#3A2216] text-amber-50 border border-[#5C3A24]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-amber-300' : 'text-amber-400'}`} />
                  <span className="font-extrabold text-base sm:text-lg leading-tight">{item.label}</span>
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-amber-100 font-semibold' : 'text-amber-200/80'}`}>
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
