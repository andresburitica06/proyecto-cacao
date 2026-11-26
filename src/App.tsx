/**
 * Componente raíz de la aplicación: Sistema de Gestión de Cacao - ADSO.
 * Centraliza el estado global de sesión, carga de datos desde la API MySQL,
 * navegación entre módulos, asistente de voz y operaciones CRUD del sistema.
 */

import React, { useState, useEffect } from 'react';
import { ActiveTab, Navbar } from './components/Navbar';
import { VoiceAssistantBar } from './components/VoiceAssistantBar';
import { AuthView } from './components/AuthView';
import { DashboardView } from './components/DashboardView';
import { FincasView } from './components/FincasView';
import { RecoleccionViewClean as RecoleccionView } from './components/RecoleccionViewClean';
import { InventarioViewClean as InventarioView } from './components/InventarioViewClean';
import { VentasCajaView } from './components/VentasCajaView';
import { AdminClientsView } from './components/AdminClientsView';
import { DatabaseSetupView } from './components/DatabaseSetupView';
import { ProfileView } from './components/ProfileView';
import {
  createClienteComprador, createFinca, createInventario, createMovimientoCaja, createRecoleccion,
  createVenta, createZona, deleteFinca, deleteZona, fetchAdminClients, fetchFincas,
  fetchInventario, fetchMovimientosCaja, fetchRecolecciones, fetchVentas, fetchZonas,
  fetchClientesCompradores, resetUserPassword, updateFinca, updateInventario,
  updateRecoleccion, recoverPasswordApi
} from './services/api';
import type { ApiUserProfile } from './services/api';

// Imágenes de fondo por módulo (Mockup)
import bgInicioImg from './assets/images/bg_inicio_cacao_1795612273947.jpg';
import bgFincasImg from './assets/images/bg_fincas_paisaje_1795612274632.jpg';
import bgCosechaImg from './assets/images/bg_cosecha_secado_1795612274971.jpg';
import bgHistorialesImg from './assets/images/bg_historiales_trabajo_1795612275384.jpg';
import bgVentasImg from './assets/images/bg_ventas_mula_1795612276046.jpg';

const MODULE_BACKGROUNDS: Record<string, { src: string; alt: string }> = {
  dashboard:     { src: bgInicioImg,      alt: 'Mazorcas de cacao' },
  fincas:        { src: bgFincasImg,      alt: 'Paisaje finca cacaotera' },
  recoleccion:   { src: bgCosechaImg,     alt: 'Cosecha de cacao' },
  inventario:    { src: bgHistorialesImg, alt: 'Trabajo en finca' },
  ventas_caja:   { src: bgVentasImg,      alt: 'Venta de cacao' },
  clientes:      { src: bgInicioImg,      alt: 'Panel administrativo' },
  configuracion: { src: bgInicioImg,      alt: 'Base de datos' },
  perfil:        { src: bgInicioImg,      alt: 'Perfil de usuario' },
};

import { 
  Finca, 
  ZonaCultivo, 
  Recoleccion, 
  ProductoInventario, 
  Cliente, 
  Venta, 
  MovimientoCaja,
  Usuario
} from './types';

import { 
  INITIAL_FINCAS, 
  INITIAL_ZONAS, 
  INITIAL_RECOLECCIONES, 
  INITIAL_INVENTARIO, 
  INITIAL_CLIENTES, 
  INITIAL_VENTAS, 
  INITIAL_CAJA 
} from './data/initialData';

// Transforma una fila devuelta por el endpoint administrativo de clientes al modelo Usuario
const mapAdminClientRow = (row: {
  id_usuario: number;
  cedula: string;
  nombre_completo: string;
  telefono: string | null;
  id_finca: number | null;
  finca: string | null;
}): Usuario => ({
  id: String(row.id_usuario),
  nombreCompleto: row.nombre_completo,
  cedula: row.cedula,
  celularWhatsApp: row.telefono || '',
  nombreFincaVereda: row.finca || 'Sin finca asignada',
  fincaId: row.id_finca ? String(row.id_finca) : undefined,
  rol: 'productor',
  fechaRegistro: new Date().toISOString().split('T')[0]
});

const profilePhotoStorageKey = (userId: string) => `cacao_profile_photo:${encodeURIComponent(userId)}`;

// Restablece los estados principales del espacio de trabajo a los arreglos iniciales
const resetWorkspaceState = (
  setFincas: React.Dispatch<React.SetStateAction<Finca[]>>,
  setZonas: React.Dispatch<React.SetStateAction<ZonaCultivo[]>>,
  setRecolecciones: React.Dispatch<React.SetStateAction<Recoleccion[]>>,
  setInventario: React.Dispatch<React.SetStateAction<ProductoInventario[]>>,
  setClientes: React.Dispatch<React.SetStateAction<Cliente[]>>,
  setVentas: React.Dispatch<React.SetStateAction<Venta[]>>,
  setCaja: React.Dispatch<React.SetStateAction<MovimientoCaja[]>>
) => {
  setFincas(INITIAL_FINCAS);
  setZonas(INITIAL_ZONAS);
  setRecolecciones(INITIAL_RECOLECCIONES);
  setInventario(INITIAL_INVENTARIO);
  setClientes(INITIAL_CLIENTES);
  setVentas(INITIAL_VENTAS);
  setCaja(INITIAL_CAJA);
};

export default function App() {
  // La sesión dura mientras la pestaña esté abierta; sessionStorage se limpia al cerrarla
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const token = sessionStorage.getItem('cacao_token');
    const saved = sessionStorage.getItem('cacao_user');
    return token && saved ? 'dashboard' : 'auth';
  });

  // Estado del usuario autenticado recuperado de sessionStorage
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const token = sessionStorage.getItem('cacao_token');
    const saved = sessionStorage.getItem('cacao_user');
    if (!saved || !token) return null;
    try {
      return JSON.parse(saved) as Usuario;
    } catch {
      sessionStorage.removeItem('cacao_user');
      sessionStorage.removeItem('cacao_token');
      return null;
    }
  });

  // Token JWT de autenticación, lista de usuarios para el panel admin y bandera de carga inicial
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem('cacao_token') || '');
  const [adminUsers, setAdminUsers] = useState<Usuario[]>([]);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);

  // Estados principales del dominio cacaotero sincronizados con el backend
  const [fincas, setFincas] = useState<Finca[]>(() => {
    return INITIAL_FINCAS;
  });

  const [zonas, setZonas] = useState<ZonaCultivo[]>(() => {
    return INITIAL_ZONAS;
  });

  const [recolecciones, setRecolecciones] = useState<Recoleccion[]>(() => {
    return INITIAL_RECOLECCIONES;
  });

  const [inventario, setInventario] = useState<ProductoInventario[]>(() => {
    return INITIAL_INVENTARIO;
  });

  const [clientes, setClientes] = useState<Cliente[]>(() => {
    return INITIAL_CLIENTES;
  });

  const [ventas, setVentas] = useState<Venta[]>(() => {
    return INITIAL_VENTAS;
  });

  const [caja, setCaja] = useState<MovimientoCaja[]>(() => {
    return INITIAL_CAJA;
  });

  // Banderas para abrir modales de acceso rápido directamente desde el Dashboard
  const [quickOpenHarvest, setQuickOpenHarvest] = useState(false);
  const [quickOpenSale, setQuickOpenSale] = useState(false);
  const [quickOpenExpense, setQuickOpenExpense] = useState(false);

  // Persiste o elimina la información del usuario activo en la sesión de esta pestaña
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('cacao_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('cacao_user');
    }
  }, [currentUser]);

  // Persiste o elimina el token JWT en la sesión de esta pestaña
  useEffect(() => {
    if (authToken) {
      sessionStorage.setItem('cacao_token', authToken);
    } else {
      sessionStorage.removeItem('cacao_token');
    }
  }, [authToken]);

  // Escucha el evento global de sesión expirada/inválida para cerrar sesión automáticamente
  useEffect(() => {
    const handleInvalidSession = () => {
      setAuthToken('');
      setCurrentUser(null);
      setWorkspaceLoaded(false);
      setActiveTab('auth');
      sessionStorage.removeItem('cacao_token');
      sessionStorage.removeItem('cacao_user');
    };

    window.addEventListener('cacao-session-invalid', handleInvalidSession);
    return () => window.removeEventListener('cacao-session-invalid', handleInvalidSession);
  }, []);

  // Limpia claves antiguas de almacenamiento local al montar la aplicación
  useEffect(() => {
    localStorage.removeItem('cacao_token');
    localStorage.removeItem('cacao_user');
    localStorage.removeItem('cacao_recolecciones');
    Object.keys(localStorage)
      .filter((key) => key.startsWith('cacao_workspace:'))
      .forEach((key) => localStorage.removeItem(key));
  }, []);

  // Carga en paralelo zonas, recolecciones, inventario, clientes, ventas y caja desde MySQL
  useEffect(() => {
    if (!currentUser || !authToken) {
      setWorkspaceLoaded(false);
      return;
    }

    let cancelled = false;
    setWorkspaceLoaded(false);
    Promise.all([
      fetchZonas(authToken),
      fetchRecolecciones(authToken),
      fetchInventario(authToken),
      fetchClientesCompradores(authToken),
      fetchVentas(authToken),
      fetchMovimientosCaja(authToken)
    ]).then(([zonasRows, recoleccionesRows, inventarioRows, clientesRows, ventasRows, cajaRows]) => {
      if (cancelled) return;
      setZonas(zonasRows.map((row) => ({
        id: String(row.id_zona),
        fincaId: String(row.id_finca),
        nombreZona: row.nombre_zona,
        variedadCacao: row.variedad_cacao,
        arbolesEstimados: Number(row.arboles_estimados),
        hectareas: Number(row.hectareas),
        anoSiembra: row.ano_siembra || undefined
      })));
      setRecolecciones(recoleccionesRows.map((row) => ({
        id: String(row.id_recoleccion),
        fincaId: String(row.id_finca),
        zonaId: row.id_zona ? String(row.id_zona) : 'finca-general',
        fecha: String(row.fecha_recoleccion).slice(0, 10),
        kilosBaba: Number(row.kilos_baba),
        rendimientoEstimadoSeco: Number(row.rendimiento_estimado_seco),
        kilosSecoObtenidos: row.kilos_seco_obtenidos ? Number(row.kilos_seco_obtenidos) : undefined,
        kilosMalEstado: Number(row.kilos_mal_estado || 0),
        estadoProceso: row.estado_proceso === 'merma_mal_estado' ? 'seco_listo' : row.estado_proceso,
        jornalesUtilizados: Number(row.jornales_utilizados),
        responsable: row.responsable,
        notas: row.notas || undefined
      })));
      setInventario(inventarioRows.map((row) => ({
        id: String(row.id_inventario),
        fincaId: String(row.id_finca),
        tipoProducto: row.codigo_tipo_producto,
        nombreProducto: row.nombre_producto,
        cantidadKg: Number(row.cantidad_kg),
        cantidadRecolectadaKg: Number(row.cantidad_recolectada_kg),
        cantidadVendidaKg: Number(row.cantidad_vendida_kg),
        estadoCalidad: row.estado_calidad,
        precioRefKg: Number(row.precio_ref_kg),
        ubicacionBodega: row.ubicacion_bodega,
        fechaUltimaActualizacion: String(row.fecha_ultima_actualizacion).slice(0, 10)
      })));
      setClientes(clientesRows.map((row) => ({
        id: String(row.id_cliente),
        nombre: row.nombre,
        documento: row.documento,
        telefono: row.telefono || '',
        tipoCliente: row.tipo_cliente,
        municipio: row.municipio || 'Por completar'
      })));
      setVentas(ventasRows.map((row) => ({
        id: String(row.id_venta),
        clienteId: row.id_cliente ? String(row.id_cliente) : `venta-${row.id_venta}`,
        clienteNombre: row.cliente_nombre_libre,
        fincaId: String(row.id_finca),
        fecha: String(row.fecha_venta).slice(0, 10),
        tipoProducto: row.codigo_tipo_producto,
        kilosVendidos: Number(row.kilos_vendidos),
        precioPorKg: Number(row.precio_por_kg),
        totalVenta: Number(row.total_venta),
        estadoCalidad: row.estado_calidad_vendido,
        estadoVenta: row.estado_pago === 'anulado' ? 'anulada' : 'confirmada',
        metodoPago: row.metodo_pago,
        pagado: row.estado_pago === 'pagado',
        comprobanteNumero: row.comprobante_numero || undefined
      })));
      setCaja(cajaRows.map((row) => ({
        id: String(row.id_movimiento_caja),
        fecha: String(row.fecha_caja),
        tipo: row.tipo,
        concepto: row.concepto,
        monto: Number(row.monto),
        categoria: row.categoria,
        referenciaId: row.referencia || undefined,
        registradoPor: 'Sistema MySQL'
      })));
    }).catch((error) => {
      if (!cancelled && !(error instanceof Error && error.message.toLowerCase().includes('sesión inválida'))) {
        window.alert(error instanceof Error ? error.message : 'No fue posible cargar los datos desde MySQL.');
      }
    }).finally(() => {
      if (!cancelled) setWorkspaceLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [authToken, currentUser]);

  // Carga el listado de fincas visibles para el usuario autenticado
  useEffect(() => {
    if (!authToken || !currentUser) return;
    let cancelled = false;
    fetchFincas(authToken)
      .then((rows) => {
        if (cancelled) return;
        setFincas(rows.map((row) => ({
          id: String(row.id_finca),
          nombre: row.nombre,
          propietario: row.propietario || currentUser.nombreCompleto || 'Sin propietario',
          vereda: row.vereda || 'Por completar',
          municipio: row.municipio || 'Por completar',
          hectareasTotal: Number(row.hectareas_total),
          hectareasCacao: Number(row.hectareas_cacao),
          codigoPredial: row.codigo_predial || undefined,
          imagen: row.imagen || undefined,
          esTecnificada: Boolean(row.tecnificada),
          nivelTecnificacion: row.nivel_tecnificacion || undefined,
          fechaRegistro: String(row.creado_en).slice(0, 10)
        })));
      })
      .catch((error) => {
        if (!cancelled && !(error instanceof Error && error.message.toLowerCase().includes('sesión inválida'))) {
          window.alert(error instanceof Error ? error.message : 'No fue posible cargar las fincas.');
        }
      });
    return () => { cancelled = true; };
  }, [authToken, currentUser]);

  // Carga el directorio de productores únicamente cuando el usuario tiene rol de administrador
  useEffect(() => {
    if (!currentUser || currentUser.rol !== 'admin' || !authToken) {
      setAdminUsers([]);
      return;
    }

    let cancelled = false;
    fetchAdminClients(authToken)
      .then((rows) => {
        if (!cancelled) setAdminUsers(rows.map(mapAdminClientRow));
      })
      .catch(() => {
        if (!cancelled) setAdminUsers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, authToken]);

  // Manejadores de autenticación (inicio de sesión, registro y cierre de sesión)
  const handleLoginSuccess = (user: Usuario, token: string) => {
    setCurrentUser({
      ...user,
      fotoPerfil: localStorage.getItem(profilePhotoStorageKey(user.id)) || user.fotoPerfil
    });
    setAuthToken(token);
    setActiveTab('dashboard');
  };

  const handleRegisterSuccess = (newUser: Usuario, token: string) => {
    const fincaId = newUser.fincaId || `finca-${newUser.id}`;
    const userWithFinca = {
      ...newUser,
      fincaId,
      fotoPerfil: localStorage.getItem(profilePhotoStorageKey(newUser.id)) || newUser.fotoPerfil
    };
    setCurrentUser(userWithFinca);
    setAuthToken(token);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken('');
    setFincas([]);
    setZonas([]);
    setRecolecciones([]);
    setInventario([]);
    setClientes([]);
    setVentas([]);
    setCaja([]);
    setActiveTab('auth');
  };

  const handleProfileUpdated = (profile: ApiUserProfile) => {
    if (!currentUser) return;
    const updatedUser: Usuario = {
      ...currentUser,
      cedula: profile.cedula,
      nombreCompleto: profile.nombre_completo,
      celularWhatsApp: profile.telefono || '',
      correo: profile.correo || '',
      rol: profile.rol === 'admin' ? 'admin' : currentUser.rol,
      activo: profile.activo
    };
    setCurrentUser(updatedUser);
    sessionStorage.setItem('cacao_user', JSON.stringify(updatedUser));
  };

  const handleProfilePhotoUpdated = (photoUrl: string) => {
    if (!currentUser) return;
    const updatedUser: Usuario = { ...currentUser, fotoPerfil: photoUrl };
    setCurrentUser(updatedUser);
    localStorage.setItem(profilePhotoStorageKey(currentUser.id), photoUrl);
    sessionStorage.setItem('cacao_user', JSON.stringify(updatedUser));
  };

  // Funciones auxiliares de mapeo entre el modelo Finca del frontend y el formato de la API
  const toApiFinca = (finca: Omit<Finca, 'id' | 'fechaRegistro'>) => ({
    nombre: String(finca.nombre || '').trim(),
    propietario: String(finca.propietario || '').trim(),
    vereda: String(finca.vereda || '').trim(),
    municipio: String(finca.municipio || '').trim(),
    hectareasTotal: finca.hectareasTotal,
    hectareasCacao: finca.hectareasCacao,
    codigoPredial: finca.codigoPredial,
    imagen: finca.imagen,
    tecnificada: finca.esTecnificada,
    nivelTecnificacion: finca.nivelTecnificacion
  });

  const mapApiFinca = (row: Awaited<ReturnType<typeof fetchFincas>>[number]): Finca => ({
    id: String(row.id_finca),
    nombre: row.nombre,
    propietario: row.propietario || currentUser?.nombreCompleto || 'Sin propietario',
    vereda: row.vereda || 'Por completar',
    municipio: row.municipio || 'Por completar',
    hectareasTotal: Number(row.hectareas_total),
    hectareasCacao: Number(row.hectareas_cacao),
    codigoPredial: row.codigo_predial || undefined,
    imagen: row.imagen || undefined,
    esTecnificada: Boolean(row.tecnificada),
    nivelTecnificacion: row.nivel_tecnificacion || undefined,
    fechaRegistro: String(row.creado_en).slice(0, 10)
  });

  // Crea una nueva finca en la API y la agrega al inicio del estado local
  const handleAddFinca = async (newFincaData: Omit<Finca, 'id' | 'fechaRegistro'>) => {
    if (!authToken) return false;
    try {
      const row = await createFinca(authToken, toApiFinca(newFincaData));
      setFincas(prev => [mapApiFinca(row), ...prev]);
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible guardar la finca.');
      return false;
    }
  };

  // Desactiva una finca en la API y limpia del estado local sus registros dependientes
  const handleDeleteFinca = async (id: string) => {
    if (!authToken) return;
    try {
      await deleteFinca(authToken, id);
      setFincas(prev => prev.filter(finca => finca.id !== id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible desactivar la finca.');
    }
    setZonas(prev => prev.filter(zona => zona.fincaId !== id));
    setRecolecciones(prev => prev.filter(rec => rec.fincaId !== id));
    setInventario(prev => prev.filter(item => item.fincaId !== id));
    setVentas(prev => prev.filter(venta => venta.fincaId !== id));
    setCaja(prev => prev.filter(mov => mov.referenciaId ? ventas.some(venta => venta.id === mov.referenciaId && venta.fincaId !== id) : true));
  };

  // Registra un nuevo lote o zona de cultivo en una finca
  const handleAddZona = async (newZonaData: Omit<ZonaCultivo, 'id'>) => {
    if (!authToken) return;
    try {
      const row = await createZona(authToken, newZonaData);
      setZonas(prev => [...prev, {
        id: String(row.id_zona),
        fincaId: String(row.id_finca),
        nombreZona: row.nombre_zona,
        variedadCacao: row.variedad_cacao,
        arbolesEstimados: Number(row.arboles_estimados),
        hectareas: Number(row.hectareas),
        anoSiembra: row.ano_siembra || undefined
      }]);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible guardar el lote.');
    }
  };

  // Elimina un lote o zona de cultivo existente
  const handleDeleteZona = async (id: string) => {
    if (!authToken) return;
    try {
      await deleteZona(authToken, id);
      setZonas(prev => prev.filter(zona => zona.id !== id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible eliminar el lote.');
    }
  };

  // Registra una nueva recolección de cosecha en la API y actualiza el listado local
  const handleAddRecoleccion = async (newRecData: Omit<Recoleccion, 'id'>) => {
    if (!authToken) return;
    try {
      const row = await createRecoleccion(authToken, {
        fincaId: Number(newRecData.fincaId),
        zonaId: Number.isInteger(Number(newRecData.zonaId)) ? Number(newRecData.zonaId) : null,
        fecha: newRecData.fecha,
        kilosBaba: newRecData.kilosBaba,
        rendimientoEstimadoSeco: newRecData.rendimientoEstimadoSeco,
        kilosSecoObtenidos: newRecData.kilosSecoObtenidos,
        kilosMalEstado: newRecData.kilosMalEstado || 0,
        estadoProceso: newRecData.estadoProceso,
        tecnificada: false,
        jornalesUtilizados: newRecData.jornalesUtilizados,
        responsable: newRecData.responsable,
        notas: newRecData.notas
      });
      setRecolecciones(prev => [{
        id: String(row.id_recoleccion),
        fincaId: String(row.id_finca),
        zonaId: row.id_zona ? String(row.id_zona) : 'finca-general',
        fecha: String(row.fecha_recoleccion).slice(0, 10),
        kilosBaba: Number(row.kilos_baba),
        rendimientoEstimadoSeco: Number(row.rendimiento_estimado_seco),
        kilosSecoObtenidos: row.kilos_seco_obtenidos ? Number(row.kilos_seco_obtenidos) : undefined,
        kilosMalEstado: Number(row.kilos_mal_estado || 0),
        estadoProceso: row.estado_proceso === 'merma_mal_estado' ? 'seco_listo' : row.estado_proceso,
        jornalesUtilizados: Number(row.jornales_utilizados),
        responsable: row.responsable,
        notas: row.notas || undefined
      }, ...(Array.isArray(prev) ? prev : [])]);
      const invRows = await fetchInventario(authToken);
      setInventario(invRows.map((inv) => ({
        id: String(inv.id_inventario),
        fincaId: String(inv.id_finca),
        tipoProducto: inv.codigo_tipo_producto,
        nombreProducto: inv.nombre_producto,
        cantidadKg: Number(inv.cantidad_kg),
        cantidadRecolectadaKg: Number(inv.cantidad_recolectada_kg),
        cantidadVendidaKg: Number(inv.cantidad_vendida_kg),
        estadoCalidad: inv.estado_calidad,
        precioRefKg: Number(inv.precio_ref_kg),
        ubicacionBodega: inv.ubicacion_bodega,
        fechaUltimaActualizacion: String(inv.fecha_ultima_actualizacion).slice(0, 10)
      })));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible guardar la cosecha.');
    }
  };

  // Actualiza los datos o estado de proceso de una recolección existente
  const handleUpdateRecoleccion = async (id: string, changes: Partial<Omit<Recoleccion, 'id'>>) => {
    if (!authToken) return;
    const current = recolecciones.find(rec => rec.id === id);
    if (!current) return;
    const updated = { ...current, ...changes };
    try {
      await updateRecoleccion(authToken, id, {
        kilosBaba: updated.kilosBaba,
        rendimientoEstimadoSeco: updated.rendimientoEstimadoSeco,
        kilosSecoObtenidos: updated.kilosSecoObtenidos,
        kilosMalEstado: updated.kilosMalEstado || 0,
        estadoProceso: updated.estadoProceso,
        tecnificada: false,
        jornalesUtilizados: updated.jornalesUtilizados,
        responsable: updated.responsable,
        notas: updated.notas
      });
      setRecolecciones(prev => prev.map(rec => rec.id === id ? updated : rec));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible actualizar la cosecha.');
    }
  };

  // Elimina una recolección del estado local
  const handleDeleteRecoleccion = (id: string) => {
    setRecolecciones(prev => (Array.isArray(prev) ? prev : []).filter(rec => rec.id !== id));
  };

  // Actualiza rápidamente la cantidad en kilogramos de un producto en inventario
  const handleUpdateInventario = async (id: string, nuevaCantidadKg: number) => {
    if (!authToken) return;
    const current = inventario.find(item => item.id === id);
    if (!current) return;
    try {
      await updateInventario(authToken, id, {
        cantidadKg: nuevaCantidadKg,
        precioRefKg: current.precioRefKg,
        nombreProducto: current.nombreProducto,
        ubicacionBodega: current.ubicacionBodega
      });
      setInventario(prev => prev.map(item => item.id === id ? { ...item, cantidadKg: nuevaCantidadKg } : item));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible actualizar el inventario.');
    }
  };

  // Actualiza los datos completos de un producto del inventario
  const handleUpdateProductoInventario = async (id: string, cambios: Omit<ProductoInventario, 'id' | 'fincaId' | 'fechaUltimaActualizacion'>) => {
    if (!authToken) return;
    try {
      await updateInventario(authToken, id, {
        cantidadKg: cambios.cantidadKg,
        precioRefKg: cambios.precioRefKg,
        nombreProducto: cambios.nombreProducto,
        ubicacionBodega: cambios.ubicacionBodega
      });
      setInventario(prev => prev.map(item => item.id === id ? {
        ...item,
        ...cambios,
        fechaUltimaActualizacion: new Date().toISOString().split('T')[0]
      } : item));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible actualizar el producto.');
    }
  };

  // Edita una finca en la API y recarga el listado actualizado desde el servidor
  const handleUpdateFinca = async (id: string, cambios: Omit<Finca, 'id' | 'fechaRegistro'>) => {
    if (!authToken) return;
    try {
      const row = await updateFinca(authToken, id, toApiFinca(cambios));
      setFincas(prev => prev.map(finca => finca.id === id ? {
        ...finca,
        nombre: row.nombre,
        propietario: row.propietario || cambios.propietario,
        vereda: row.vereda || cambios.vereda,
        municipio: row.municipio || cambios.municipio,
        hectareasTotal: Number(row.hectareas_total),
        hectareasCacao: Number(row.hectareas_cacao),
        codigoPredial: row.codigo_predial || cambios.codigoPredial,
        imagen: row.imagen || cambios.imagen,
        esTecnificada: Boolean(row.tecnificada),
        nivelTecnificacion: row.nivel_tecnificacion || cambios.nivelTecnificacion
      } : finca));

      const rows = await fetchFincas(authToken);
      setFincas(rows.map(mapApiFinca));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible actualizar la finca.');
    }
  };

  // Permite al administrador restablecer la contraseña de un productor
  const handleResetUserPassword = async (userId: string, password: string) => {
    if (!authToken) return;

    try {
      await resetUserPassword(authToken, userId, password);
      const rows = await fetchAdminClients(authToken);
      setAdminUsers(rows.map(mapAdminClientRow));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible actualizar la contraseña.');
    }
  };

  // Crea un nuevo registro de producto en el inventario de bodega
  const handleAddProductoInventario = async (prodData: Omit<ProductoInventario, 'id' | 'fechaUltimaActualizacion'>) => {
    if (!authToken) return;
    try {
      const row = await createInventario(authToken, {
        fincaId: prodData.fincaId,
        tipoProducto: prodData.tipoProducto,
        nombreProducto: prodData.nombreProducto,
        estadoCalidad: prodData.estadoCalidad || 'buen_estado',
        cantidadRecolectadaKg: prodData.cantidadRecolectadaKg || prodData.cantidadKg,
        cantidadKg: prodData.cantidadKg,
        precioRefKg: prodData.precioRefKg,
        ubicacionBodega: prodData.ubicacionBodega
      });
      setInventario(prev => [{
        id: String(row.id_inventario),
        fincaId: String(row.id_finca),
        tipoProducto: row.codigo_tipo_producto,
        nombreProducto: row.nombre_producto,
        cantidadKg: Number(row.cantidad_kg),
        cantidadRecolectadaKg: Number(row.cantidad_recolectada_kg),
        cantidadVendidaKg: Number(row.cantidad_vendida_kg),
        estadoCalidad: row.estado_calidad,
        precioRefKg: Number(row.precio_ref_kg),
        ubicacionBodega: row.ubicacion_bodega,
        fechaUltimaActualizacion: String(row.fecha_ultima_actualizacion).slice(0, 10)
      }, ...prev]);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible guardar el inventario.');
    }
  };

  // Registra una venta, descuenta los kilos vendidos del inventario y genera el ingreso en caja si está pagada
  const handleAddVenta = async (ventaData: Omit<Venta, 'id'>) => {
    if (!authToken) return;
    try {
      const row = await createVenta(authToken, {
        fincaId: Number(ventaData.fincaId),
        clienteId: ventaData.clienteId.startsWith('cli-') ? null : Number(ventaData.clienteId),
        clienteNombre: ventaData.clienteNombre,
        tipoProducto: ventaData.tipoProducto,
        estadoCalidad: ventaData.estadoCalidad || 'buen_estado',
        kilosVendidos: ventaData.kilosVendidos,
        precioPorKg: ventaData.precioPorKg,
        metodoPago: ventaData.metodoPago,
        pagado: ventaData.pagado,
        fecha: ventaData.fecha,
        comprobanteNumero: ventaData.comprobanteNumero
      });
      const newVenta: Venta = {
        id: String(row.id_venta),
        clienteId: row.id_cliente ? String(row.id_cliente) : `venta-${row.id_venta}`,
        clienteNombre: row.cliente_nombre_libre,
        fincaId: String(row.id_finca),
        fecha: String(row.fecha_venta).slice(0, 10),
        tipoProducto: row.codigo_tipo_producto,
        kilosVendidos: Number(row.kilos_vendidos),
        precioPorKg: Number(row.precio_por_kg),
        totalVenta: Number(row.total_venta),
        estadoCalidad: row.estado_calidad_vendido,
        estadoVenta: row.estado_pago === 'anulado' ? 'anulada' : 'confirmada',
        metodoPago: row.metodo_pago,
        pagado: row.estado_pago === 'pagado',
        comprobanteNumero: row.comprobante_numero || undefined
      };
      setVentas(prev => [newVenta, ...prev]);
      setInventario(prev => prev.map(item =>
        item.fincaId === ventaData.fincaId &&
        item.tipoProducto === ventaData.tipoProducto &&
        (item.estadoCalidad || 'buen_estado') === (ventaData.estadoCalidad || 'buen_estado')
          ? {
              ...item,
              cantidadKg: Math.max(0, item.cantidadKg - ventaData.kilosVendidos),
              cantidadVendidaKg: (item.cantidadVendidaKg || 0) + ventaData.kilosVendidos
            }
          : item
      ));
      if (ventaData.pagado) {
        setCaja(prev => [{
          id: `caja-${row.id_venta}`,
          fecha: ventaData.fecha,
          tipo: 'ingreso',
          concepto: `Venta ${ventaData.kilosVendidos} Kg Cacao`,
          monto: ventaData.totalVenta,
          categoria: 'venta_cacao',
          referenciaId: String(row.id_venta),
          registradoPor: currentUser?.nombreCompleto || 'Sistema'
        }, ...prev]);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible registrar la venta.');
    }
  };

  // Registra un movimiento de ingreso o egreso en caja asociado a la finca activa
  const handleAddGastoCaja = async (movData: Omit<MovimientoCaja, 'id'>) => {
    if (!authToken) return;
    try {
      const fincaId = fincasVisibles[0]?.id;
      if (!fincaId) return;
      const row = await createMovimientoCaja(authToken, {
        fincaId: Number(fincaId),
        fecha: movData.fecha,
        tipo: movData.tipo,
        categoria: movData.categoria,
        concepto: movData.concepto,
        monto: movData.monto,
        referencia: movData.referenciaId
      });
      setCaja(prev => [{
        id: String(row.id_movimiento_caja),
        fecha: String(row.fecha_caja),
        tipo: row.tipo,
        concepto: row.concepto,
        monto: Number(row.monto),
        categoria: row.categoria,
        referenciaId: row.referencia || undefined,
        registradoPor: movData.registradoPor
      }, ...prev]);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible guardar el movimiento.');
    }
  };

  // Crea un nuevo cliente comprador en la API y lo añade al estado local
  const handleAddCliente = async (clienteData: Omit<Cliente, 'id'>) => {
    if (!authToken) return;
    try {
      const row = await createClienteComprador(authToken, {
        documento: clienteData.documento,
        nombre: clienteData.nombre,
        telefono: clienteData.telefono,
        tipoCliente: clienteData.tipoCliente,
        municipio: clienteData.municipio
      });
      setClientes(prev => [...prev, {
        id: String(row.id_cliente),
        nombre: row.nombre,
        documento: row.documento,
        telefono: row.telefono || '',
        tipoCliente: row.tipo_cliente,
        municipio: row.municipio || 'Por completar'
      }]);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible guardar el cliente.');
    }
  };

  // Restablecer Datos Iniciales de Demostración
  const handleResetData = () => {
    if (window.confirm('¿Deseas restablecer los datos iniciales de ejemplo de las fincas y caja?')) {
      window.location.reload();
    }
  };

  // Cada productor trabaja únicamente con su finca. El administrador conserva la vista global.
  const isAdmin = currentUser?.rol === 'admin';
  const fincaIdActual = currentUser?.fincaId;
  const fincasVisibles = fincas;
  const zonasVisibles = zonas;
  const recoleccionesVisibles = recolecciones;
  const inventarioVisible = inventario;
  const ventasVisibles = ventas;
  const cajaVisible = caja;

  // Cálculo de totales globales visibles: kilos disponibles por vender (cosechado - vendido) y saldo neto de caja
  const kilosCosechasListas = recoleccionesVisibles
    .filter((rec) => rec.estadoProceso === 'seco_listo')
    .reduce(
      (acc, curr) =>
        acc +
        (curr.kilosSecoObtenidos ?? curr.rendimientoEstimadoSeco ?? curr.kilosBaba ?? 0) +
        (curr.kilosMalEstado || 0),
      0
    );
  const kilosVendidosConfirmados = ventasVisibles
    .filter((v) => v.estadoVenta !== 'anulada')
    .reduce((acc, v) => acc + (v.kilosVendidos || 0), 0);
  const totalKilosInventario = Math.max(0, Math.round((kilosCosechasListas - kilosVendidosConfirmados) * 10) / 10);
  const cajaIngresos = cajaVisible.filter(c => c.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
  const cajaEgresos = cajaVisible.filter(c => c.tipo === 'egreso').reduce((a, b) => a + b.monto, 0);
  const cajaSaldoDia = cajaIngresos - cajaEgresos;

  // Textos para el asistente de voz por pestaña
  const screenTitles: Record<ActiveTab, { title: string; speech: string }> = {
    auth: {
      title: 'Pantalla de Autenticación (Login y Registro)',
      speech: 'Pantalla de ingreso y registro. Escribe tu número de cédula y tu contraseña para ingresar a administrar tu finca cacaotera, o selecciona registrarme para crear una cuenta nueva.'
    },
    dashboard: {
      title: 'Pantalla de Inicio / Dashboard Principal',
      speech: 'Página de inicio. Aquí ves los tres recuadros de kilos registrados, fincas y caja del día, más los cuatro botones grandes para registrar cosecha, ver el historial, registrar venta o caja diaria.'
    },
    perfil: {
      title: 'Perfil de usuario',
      speech: 'Consulta y actualiza tus datos personales, correo y teléfono. El rol y estado de la cuenta son de solo lectura.'
    },
    fincas: {
      title: 'Módulo de Fincas y Lotes de Cultivo',
      speech: 'Módulo de Fincas y Lotes. Muestra las tarjetas con el nombre del propietario, vereda y hectáreas de cacao. Puedes agregar nuevas fincas o lotes.'
    },
    recoleccion: {
      title: 'Módulo de Producción y Recolección Cosecha',
      speech: 'Módulo de Recolección. Formulario de cuatro pasos sencillos para ingresar los kilos cosechados en baba y calcular cuánto cacao seco obtendrás.'
    },
    inventario: {
      title: 'Módulo de Historial Cacaotero',
      speech: 'Módulo de Historial. Consulta los registros de cacao por finca y usa la calculadora para saber su valor total.'
    },
    ventas_caja: {
      title: 'Módulo de Ventas y Caja Diaria',
      speech: 'Módulo de Ventas y Caja Diaria. Registra a quién le vendiste cacao y el monto ingresará inmediatamente a tu caja del día.'
    },
    clientes: {
      title: 'Panel de Clientes Registrados',
      speech: 'Panel exclusivo del administrador. Aquí puedes consultar los datos y la actividad de cada productor registrado.'
    },
    configuracion: {
      title: 'Preparar Conexión de Base de Datos',
      speech: 'Panel exclusivo del administrador para preparar la conexión segura entre la aplicación y la base de datos.'
    }
  };

  // Renderizado Aislado e Independiente para Autenticación (Login / Registro)
  if (activeTab === 'auth' || !currentUser) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] text-[#2C1A11] flex flex-col font-sans selection:bg-amber-200 selection:text-[#1C0D02]">
        <main className="flex-1 flex flex-col min-h-0">
          <AuthView
            currentUser={currentUser}
            onLoginSuccess={handleLoginSuccess}
            onRegisterSuccess={handleRegisterSuccess}
            onLogout={handleLogout}
            screenTitle={screenTitles.auth.title}
            screenTextToRead={screenTitles.auth.speech}
            onRecoverPassword={async (cedula, celular, nuevaPassword) => {
              try {
                await recoverPasswordApi(cedula, celular, nuevaPassword);
                return true;
              } catch {
                return false;
              }
            }}
          />
        </main>

        <footer className="bg-[#2B1B12] text-[#E6D6C3] border-t-2 border-[#B84A00] py-3 px-4 text-center text-xs font-medium shrink-0">
          Sistema de Gestión de Cacao ADSO © 2026 - Diseñado para Pequeños y Medianos Cacaoteros
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900 flex flex-col font-sans selection:bg-amber-300 selection:text-amber-950">
      
      {/* 1. Lector de Voz Integrado (Requisito #2: Botón flotante claro superior en cada pantalla) */}
      <VoiceAssistantBar
        currentScreenTitle={screenTitles[activeTab].title}
        screenTextToRead={screenTitles[activeTab].speech}
      />

      {/* 2. Navegación Principal del Sistema (Solo visible tras iniciar sesión) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalKilosInventario={totalKilosInventario}
        cajaSaldoDia={cajaSaldoDia}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        onOpenProfile={() => setActiveTab('perfil')}
      />

      {/* 3. Área Principal de Contenido del Módulo */}
      <main className="flex-1 relative overflow-hidden bg-[#1C0D02]">
        <img
          src={MODULE_BACKGROUNDS[activeTab]?.src || bgInicioImg}
          alt={MODULE_BACKGROUNDS[activeTab]?.alt || ''}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#FAF6F0]/25 via-[#FAF6F0]/35 to-[#1C0D02]/45 backdrop-blur-[1.5px] pointer-events-none"
        />
        <div className="relative z-10 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6">

        {/* Perfil del usuario autenticado */}
        {activeTab === 'perfil' && (
          <ProfileView
            token={authToken}
            userId={currentUser.id}
            onBack={() => setActiveTab('dashboard')}
            onUserUpdated={handleProfileUpdated}
            photoUrl={currentUser.fotoPerfil}
            onPhotoUpdated={handleProfilePhotoUpdated}
          />
        )}

        {/* Módulo de inicio / resumen general */}
        {activeTab === 'dashboard' && (
          <DashboardView
            fincas={fincasVisibles}
            inventario={inventarioVisible}
            caja={cajaVisible}
            recolecciones={recoleccionesVisibles}
            ventas={ventasVisibles}
            totalKilosInventario={totalKilosInventario}
            setActiveTab={setActiveTab}
            onOpenQuickHarvestModal={() => {
              setActiveTab('recoleccion');
            }}
            onOpenQuickSaleModal={() => {
              setActiveTab('ventas_caja');
              setQuickOpenSale(false);
              requestAnimationFrame(() => setQuickOpenSale(true));
            }}
            onOpenQuickExpenseModal={() => {
              setActiveTab('ventas_caja');
              setQuickOpenExpense(false);
              requestAnimationFrame(() => setQuickOpenExpense(true));
            }}
          />
        )}

        {/* Módulo de gestión de fincas y lotes de cultivo */}
        {activeTab === 'fincas' && (
          <FincasView
            fincas={fincasVisibles}
            zonas={zonasVisibles}
            onAddFinca={handleAddFinca}
            onUpdateFinca={handleUpdateFinca}
            canAddFinca={true}
            defaultPropietario={currentUser?.nombreCompleto || ''}
            onAddZona={handleAddZona}
            onDeleteFinca={handleDeleteFinca}
            onDeleteZona={handleDeleteZona}
          />
        )}

        {/* Módulo de registro y seguimiento de recolecciones */}
        {activeTab === 'recoleccion' && (
          <RecoleccionView
            fincas={fincasVisibles}
            zonas={zonasVisibles}
            recolecciones={recoleccionesVisibles}
            onAddRecoleccion={handleAddRecoleccion}
            onGoToFincas={() => setActiveTab('fincas')}
            defaultResponsable={currentUser?.nombreCompleto || ''}
            onUpdateRecoleccion={handleUpdateRecoleccion}
          />
        )}

        {/* Módulo de historial e inventario de cacao */}
        {activeTab === 'inventario' && (
          <InventarioView
            fincas={fincasVisibles}
            zonas={zonasVisibles}
            recolecciones={recoleccionesVisibles}
            inventario={inventarioVisible}
            ventas={ventasVisibles}
            onUpdateRecoleccion={handleUpdateRecoleccion}
            onUpdateInventario={handleUpdateInventario}
            onUpdateProductoInventario={handleUpdateProductoInventario}
            onAddProductoInventario={handleAddProductoInventario}
          />
        )}

        {/* Módulo de ventas, compradores y movimientos de caja */}
        {activeTab === 'ventas_caja' && (
          <VentasCajaView
            fincas={fincasVisibles}
            clientes={clientes}
            ventas={ventasVisibles}
            recolecciones={recoleccionesVisibles}
            caja={cajaVisible}
            onAddVenta={handleAddVenta}
            onAddGastoCaja={handleAddGastoCaja}
            onAddCliente={handleAddCliente}
            currentUserName={currentUser?.nombreCompleto || 'Propietario'}
            quickOpenSaleModal={quickOpenSale}
            quickOpenExpenseModal={quickOpenExpense}
          />
        )}

        {/* Paneles exclusivos para el rol administrador */}
        {activeTab === 'clientes' && isAdmin && (
          <AdminClientsView users={adminUsers} fincas={fincas} inventario={inventario} recolecciones={recolecciones} caja={caja} onResetPassword={handleResetUserPassword} />
        )}

        {activeTab === 'configuracion' && isAdmin && <DatabaseSetupView />}

        </div>
      </main>

      {/* 4. Footer Rústico Campesino */}
      <footer className="bg-stone-950 text-amber-100 border-t-8 border-amber-800 py-8 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 text-lg font-black font-serif text-amber-200">
              <span>🍫</span>
              <span>Sistema de Gestión de Cacao - ADSO</span>
            </div>
            <p className="text-xs text-stone-400 mt-1 max-w-md">
              Diseñado con enfoque rural Campesino-Friendly y Lector de Voz integrado para pequeños y medianos cacaoteros.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleResetData}
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
            >
              🔄 Cargar Datos de Ejemplo Iniciales
            </button>
            <span className="text-xs text-stone-500 font-semibold">
              ADSO Cacao © 2026 - Colombia
            </span>
          </div>

        </div>
      </footer>

    </div>
  );
}
