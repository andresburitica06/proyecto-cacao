/**
 * Sistema de Gestión de Cacao - ADSO
 * Software para Pequeños y Medianor Productores Cacaoteros
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
import {
  createClienteComprador, createFinca, createInventario, createMovimientoCaja, createRecoleccion,
  createVenta, createZona, deleteFinca, deleteZona, fetchAdminClients, fetchFincas,
  fetchInventario, fetchMovimientosCaja, fetchRecolecciones, fetchVentas, fetchZonas,
  fetchClientesCompradores, resetUserPassword, updateFinca, updateInventario,
  updateRecoleccion
} from './services/api';

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
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const token = localStorage.getItem('cacao_token');
    const saved = localStorage.getItem('cacao_user');
    return token && saved ? 'dashboard' : 'auth';
  });

  // Logged in user state
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const token = localStorage.getItem('cacao_token');
    const saved = localStorage.getItem('cacao_user');
    if (!saved || !token) return null;
    try {
      return JSON.parse(saved) as Usuario;
    } catch {
      localStorage.removeItem('cacao_user');
      localStorage.removeItem('cacao_token');
      return null;
    }
  });

  const [authToken, setAuthToken] = useState(() => localStorage.getItem('cacao_token') || '');
  const [adminUsers, setAdminUsers] = useState<Usuario[]>([]);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);

  // Persistent States
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

  // Direct modal trigger flags from dashboard
  const [quickOpenHarvest, setQuickOpenHarvest] = useState(false);
  const [quickOpenSale, setQuickOpenSale] = useState(false);
  const [quickOpenExpense, setQuickOpenExpense] = useState(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('cacao_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('cacao_user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (authToken) {
      localStorage.setItem('cacao_token', authToken);
    } else {
      localStorage.removeItem('cacao_token');
    }
  }, [authToken]);

  useEffect(() => {
    const handleInvalidSession = () => {
      setAuthToken('');
      setCurrentUser(null);
      setWorkspaceLoaded(false);
      setActiveTab('auth');
      localStorage.removeItem('cacao_token');
      localStorage.removeItem('cacao_user');
    };

    window.addEventListener('cacao-session-invalid', handleInvalidSession);
    return () => window.removeEventListener('cacao-session-invalid', handleInvalidSession);
  }, []);

  useEffect(() => {
    localStorage.removeItem('cacao_recolecciones');
    Object.keys(localStorage)
      .filter((key) => key.startsWith('cacao_workspace:'))
      .forEach((key) => localStorage.removeItem(key));
  }, []);

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

  useEffect(() => {
    if (!authToken || !currentUser) return;
    let cancelled = false;
    fetchFincas(authToken)
      .then((rows) => {
        if (cancelled) return;
        setFincas(rows.map((row) => ({
          id: String(row.id_finca),
          nombre: row.nombre,
          propietario: row.propietario || 'Sin propietario',
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

  // Auth handlers
  const handleLoginSuccess = (user: Usuario, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    setActiveTab('dashboard');
  };

  const handleRegisterSuccess = (newUser: Usuario, token: string) => {
    const fincaId = newUser.fincaId || `finca-${newUser.id}`;
    const userWithFinca = { ...newUser, fincaId };
    setCurrentUser(userWithFinca);
    setAuthToken(token);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken('');
    setActiveTab('auth');
  };

  // Handlers for state updates
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
    propietario: row.propietario || 'Sin propietario',
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

  const handleDeleteZona = async (id: string) => {
    if (!authToken) return;
    try {
      await deleteZona(authToken, id);
      setZonas(prev => prev.filter(zona => zona.id !== id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible eliminar el lote.');
    }
  };

  const handleAddRecoleccion = async (newRecData: Omit<Recoleccion, 'id'>) => {
    if (!authToken) return;
    try {
      const row = await createRecoleccion(authToken, {
        fincaId: Number(newRecData.fincaId),
        zonaId: newRecData.zonaId === 'finca-general' ? null : Number(newRecData.zonaId),
        fecha: newRecData.fecha,
        kilosBaba: newRecData.kilosBaba,
        rendimientoEstimadoSeco: newRecData.rendimientoEstimadoSeco,
        kilosSecoObtenidos: newRecData.kilosSecoObtenidos,
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
        estadoProceso: row.estado_proceso === 'merma_mal_estado' ? 'seco_listo' : row.estado_proceso,
        jornalesUtilizados: Number(row.jornales_utilizados),
        responsable: row.responsable,
        notas: row.notas || undefined
      }, ...(Array.isArray(prev) ? prev : [])]);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible guardar la cosecha.');
    }
  };

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

  const handleDeleteRecoleccion = (id: string) => {
    setRecolecciones(prev => (Array.isArray(prev) ? prev : []).filter(rec => rec.id !== id));
  };

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
  const ventaIdsVisibles = new Set(ventasVisibles.map(venta => venta.id));
  const cajaVisible = isAdmin ? caja : caja.filter(item => ventaIdsVisibles.has(item.referenciaId || '') || item.registradoPor === currentUser?.nombreCompleto);

  const totalKilosInventario = recoleccionesVisibles
    .filter((rec) => rec.estadoProceso === 'seco_listo')
    .reduce((acc, curr) => acc + (curr.kilosSecoObtenidos ?? curr.rendimientoEstimadoSeco ?? 0), 0);
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
      <div className="min-h-screen bg-[#FDFBF7] text-stone-900 flex flex-col font-sans selection:bg-amber-300 selection:text-amber-950">
        
        {/* Lector de Voz Superior */}
        <VoiceAssistantBar
          currentScreenTitle={screenTitles.auth.title}
          screenTextToRead={screenTitles.auth.speech}
        />

        {/* Header Sencillo Aislado para Login */}
        <div className="bg-stone-950 text-amber-100 py-3 px-4 border-b-4 border-amber-800 text-center flex items-center justify-between max-w-7xl w-full mx-auto">
          <div className="flex items-center gap-2 font-black font-serif text-lg text-amber-200">
            <span>🍫</span>
            <span>Sistema de Gestión de Cacao - ADSO</span>
          </div>
          <span className="bg-amber-800/80 text-amber-200 text-xs font-bold px-2.5 py-1 rounded-xl border border-amber-600 hidden sm:inline-block">
            Acceso Rural Campesino
          </span>
        </div>

        {/* Vista Completa Independiente de Login y Registro */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 flex items-center justify-center">
          <AuthView
            currentUser={currentUser}
            onLoginSuccess={handleLoginSuccess}
            onRegisterSuccess={handleRegisterSuccess}
            onLogout={handleLogout}
          />
        </main>

        <footer className="bg-stone-950 text-amber-200/80 border-t-4 border-amber-900 py-4 px-4 text-center text-xs font-medium">
          Sistema de Gestión de Cacao ADSO © 2026 • Diseñado para Pequeños y Medianor Cacaoteros
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
      />

      {/* 3. Área Principal de Contenido del Módulo */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6">

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

        {activeTab === 'fincas' && (
          <FincasView
            fincas={fincasVisibles}
            zonas={zonasVisibles}
            onAddFinca={handleAddFinca}
            onUpdateFinca={handleUpdateFinca}
            canAddFinca={true}
            onAddZona={handleAddZona}
            onDeleteFinca={handleDeleteFinca}
            onDeleteZona={handleDeleteZona}
          />
        )}

        {activeTab === 'recoleccion' && (
          <RecoleccionView
            fincas={fincasVisibles}
            zonas={zonasVisibles}
            recolecciones={recoleccionesVisibles}
            onAddRecoleccion={handleAddRecoleccion}
            onUpdateRecoleccion={handleUpdateRecoleccion}
          />
        )}

        {activeTab === 'inventario' && (
          <InventarioView
            fincas={fincasVisibles}
            zonas={zonasVisibles}
            recolecciones={recoleccionesVisibles}
            inventario={inventarioVisible}
            onUpdateRecoleccion={handleUpdateRecoleccion}
            onUpdateInventario={handleUpdateInventario}
            onUpdateProductoInventario={handleUpdateProductoInventario}
            onAddProductoInventario={handleAddProductoInventario}
          />
        )}

        {activeTab === 'ventas_caja' && (
          <VentasCajaView
            fincas={fincasVisibles}
            clientes={clientes}
            ventas={ventasVisibles}
            caja={cajaVisible}
            onAddVenta={handleAddVenta}
            onAddGastoCaja={handleAddGastoCaja}
            onAddCliente={handleAddCliente}
            currentUserName={currentUser?.nombreCompleto || 'Propietario'}
            quickOpenSaleModal={quickOpenSale}
            quickOpenExpenseModal={quickOpenExpense}
          />
        )}

        {activeTab === 'clientes' && isAdmin && (
          <AdminClientsView users={adminUsers} fincas={fincas} inventario={inventario} recolecciones={recolecciones} caja={caja} onResetPassword={handleResetUserPassword} />
        )}

        {activeTab === 'configuracion' && isAdmin && <DatabaseSetupView />}

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
