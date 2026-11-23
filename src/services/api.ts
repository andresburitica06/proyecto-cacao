/**
 * Punto único de conexión con el futuro backend.
 * La aplicación web nunca debe usar credenciales MySQL directamente.
 */
import type { CategoriaGasto, EstadoCalidad, MetodoPago, TipoProductoCacao } from '../types';

export const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const backendConfigured = Boolean(apiBaseUrl);

export interface ApiAuthUser {
  id: number;
  rol: string;
  nombreCompleto: string;
  fincaId: number | null;
  fincaNombre?: string | null;
}

export interface ApiClientRow {
  id_usuario: number;
  cedula: string;
  nombre_completo: string;
  telefono: string | null;
  id_finca: number | null;
  finca: string | null;
}

export interface ApiFincaRow {
  id_finca: number;
  nombre: string;
  propietario: string | null;
  vereda: string | null;
  municipio: string;
  hectareas_total: number;
  hectareas_cacao: number;
  codigo_predial: string | null;
  imagen: string | null;
  tecnificada: number;
  nivel_tecnificacion: 'tradicional' | 'baja' | 'media' | 'alta' | null;
  creado_en: string;
}

export interface ApiZonaRow {
  id_zona: number;
  id_finca: number;
  nombre_zona: string;
  variedad_cacao: string;
  arboles_estimados: number;
  hectareas: number;
  ano_siembra: number | null;
}

export interface ApiRecoleccionRow {
  id_recoleccion: number;
  id_finca: number;
  id_zona: number | null;
  fecha_recoleccion: string;
  kilos_baba: number;
  rendimiento_estimado_seco: number;
  kilos_seco_obtenidos: number | null;
  estado_proceso: 'baba' | 'fermentacion' | 'secado' | 'seco_listo' | 'merma_mal_estado';
  tecnificada: number;
  jornales_utilizados: number;
  responsable: string;
  notas: string | null;
}

export interface ApiInventarioRow {
  id_inventario: number;
  id_finca: number;
  codigo_tipo_producto: TipoProductoCacao;
  nombre_producto: string;
  estado_calidad: EstadoCalidad;
  cantidad_recolectada_kg: number;
  cantidad_vendida_kg: number;
  cantidad_kg: number;
  precio_ref_kg: number;
  ubicacion_bodega: string;
  fecha_ultima_actualizacion: string;
}

export interface ApiClienteRow {
  id_cliente: number;
  documento: string;
  nombre: string;
  telefono: string | null;
  tipo_cliente: 'cooperativa' | 'intermediario' | 'empresa_chocolate' | 'particular';
  municipio: string | null;
}

export interface ApiVentaRow {
  id_venta: number;
  id_finca: number;
  id_cliente: number | null;
  cliente_nombre_libre: string;
  fecha_venta: string;
  codigo_tipo_producto: TipoProductoCacao;
  estado_calidad_vendido: EstadoCalidad;
  kilos_vendidos: number;
  precio_por_kg: number;
  total_venta: number;
  metodo_pago: MetodoPago;
  estado_pago: 'pagado' | 'pendiente' | 'anulado';
  comprobante_numero: string | null;
}

export interface ApiCajaRow {
  id_movimiento_caja: number;
  id_caja: number;
  id_finca: number;
  fecha_caja: string;
  fecha_movimiento: string;
  tipo: 'ingreso' | 'egreso';
  categoria: 'venta_cacao' | CategoriaGasto;
  concepto: string;
  monto: number;
  referencia: string | null;
}

interface ApiAuthResponse {
  token: string;
  user: ApiAuthUser;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!backendConfigured) {
    throw new Error('Falta configurar VITE_API_URL en el archivo .env.');
  }

  let response: Response;
  try {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('No se pudo conectar con la API. Ejecuta "npm run dev:api" y vuelve a intentarlo.');
    }
    throw error;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const sessionExpired = response.status === 401
      && typeof payload?.message === 'string'
      && /sesión (requerida|inválida|expirada)/i.test(payload.message);
    if (sessionExpired && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cacao-session-invalid'));
    }
    throw new Error(payload?.message || 'No fue posible completar la solicitud.');
  }

  return payload as T;
}

export async function checkApiHealth(): Promise<{ connected: boolean; message: string }> {
  if (!backendConfigured) {
    return { connected: false, message: 'Falta configurar VITE_API_URL en el archivo .env.' };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/health`);
    if (!response.ok) throw new Error('Respuesta no válida');
    return { connected: true, message: 'La API respondió correctamente.' };
  } catch {
    return { connected: false, message: 'No fue posible comunicarse con la API configurada.' };
  }
}

export async function loginWithApi(cedula: string, password: string): Promise<ApiAuthResponse> {
  return requestJson<ApiAuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ cedula, password })
  });
}

export async function registerWithApi(input: {
  cedula: string;
  nombreCompleto: string;
  telefono?: string;
  password: string;
  nombreFinca: string;
  municipio?: string;
}): Promise<ApiAuthResponse> {
  return requestJson<ApiAuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function fetchAdminClients(token: string): Promise<ApiClientRow[]> {
  return requestJson<ApiClientRow[]>('/clientes', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function resetUserPassword(token: string, userId: string, password: string): Promise<void> {
  await requestJson(`/clientes/${userId}/password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ password })
  });
}

export async function fetchFincas(token: string): Promise<ApiFincaRow[]> {
  return requestJson<ApiFincaRow[]>('/fincas', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createFinca(token: string, finca: {
  nombre: string;
  propietario: string;
  vereda: string;
  municipio: string;
  hectareasTotal: number;
  hectareasCacao: number;
  codigoPredial?: string;
  imagen?: string;
  tecnificada?: boolean;
  nivelTecnificacion?: 'tradicional' | 'baja' | 'media' | 'alta';
}): Promise<ApiFincaRow> {
  const payload = {
    nombre: String(finca.nombre || '').trim(),
    propietario: String(finca.propietario || '').trim(),
    vereda: String(finca.vereda || '').trim(),
    municipio: String(finca.municipio || '').trim(),
    hectareasTotal: Number(finca.hectareasTotal) || 0,
    hectareasCacao: Number(finca.hectareasCacao) || 0,
    codigoPredial: finca.codigoPredial,
    imagen: finca.imagen,
    tecnificada: Boolean(finca.tecnificada),
    nivelTecnificacion: finca.nivelTecnificacion
  };
  if (!payload.nombre || !payload.propietario || !payload.vereda || !payload.municipio) {
    throw new Error('Datos incompletos: nombre, propietario, vereda y municipio son obligatorios.');
  }
  return requestJson<ApiFincaRow>('/fincas', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function updateFinca(token: string, id: string, finca: {
  nombre: string;
  propietario: string;
  vereda: string;
  municipio: string;
  hectareasTotal: number;
  hectareasCacao: number;
  codigoPredial?: string;
  imagen?: string;
  tecnificada?: boolean;
  nivelTecnificacion?: 'tradicional' | 'baja' | 'media' | 'alta';
}): Promise<ApiFincaRow> {
  const payload = {
    nombre: String(finca.nombre || '').trim(),
    propietario: String(finca.propietario || '').trim(),
    vereda: String(finca.vereda || '').trim(),
    municipio: String(finca.municipio || '').trim(),
    hectareasTotal: Number(finca.hectareasTotal) || 0,
    hectareasCacao: Number(finca.hectareasCacao) || 0,
    codigoPredial: finca.codigoPredial,
    imagen: finca.imagen,
    tecnificada: Boolean(finca.tecnificada),
    nivelTecnificacion: finca.nivelTecnificacion
  };
  return requestJson<ApiFincaRow>(`/fincas/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function deleteFinca(token: string, id: string): Promise<void> {
  await requestJson(`/fincas/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function fetchZonas(token: string, fincaId?: string): Promise<ApiZonaRow[]> {
  const query = fincaId ? `?fincaId=${encodeURIComponent(fincaId)}` : '';
  return requestJson<ApiZonaRow[]>(`/zonas${query}`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function createZona(token: string, zona: {
  fincaId: string;
  nombreZona: string;
  variedadCacao: string;
  arbolesEstimados: number;
  hectareas: number;
  anoSiembra?: number;
}): Promise<ApiZonaRow> {
  return requestJson<ApiZonaRow>('/zonas', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(zona)
  });
}

export async function deleteZona(token: string, id: string): Promise<void> {
  await requestJson(`/zonas/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
}

export async function fetchRecolecciones(token: string): Promise<ApiRecoleccionRow[]> {
  return requestJson<ApiRecoleccionRow[]>('/recolecciones', { headers: { Authorization: `Bearer ${token}` } });
}

export async function createRecoleccion(token: string, recoleccion: Record<string, unknown>): Promise<ApiRecoleccionRow> {
  return requestJson<ApiRecoleccionRow>('/recolecciones', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(recoleccion)
  });
}

export async function updateRecoleccion(token: string, id: string, recoleccion: Record<string, unknown>): Promise<ApiRecoleccionRow> {
  return requestJson<ApiRecoleccionRow>(`/recolecciones/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(recoleccion)
  });
}

export async function fetchInventario(token: string): Promise<ApiInventarioRow[]> {
  return requestJson<ApiInventarioRow[]>('/inventario', { headers: { Authorization: `Bearer ${token}` } });
}

export async function createInventario(token: string, inventario: Record<string, unknown>): Promise<ApiInventarioRow> {
  return requestJson<ApiInventarioRow>('/inventario', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(inventario)
  });
}

export async function updateInventario(token: string, id: string, inventario: Record<string, unknown>): Promise<ApiInventarioRow> {
  return requestJson<ApiInventarioRow>(`/inventario/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(inventario)
  });
}

export async function fetchClientesCompradores(token: string): Promise<ApiClienteRow[]> {
  return requestJson<ApiClienteRow[]>(`/clientes-compradores`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function createClienteComprador(token: string, cliente: {
  documento: string;
  nombre: string;
  telefono: string;
  tipoCliente: 'cooperativa' | 'intermediario' | 'empresa_chocolate' | 'particular';
  municipio: string;
}): Promise<ApiClienteRow> {
  return requestJson<ApiClienteRow>('/clientes-compradores', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(cliente)
  });
}

export async function fetchVentas(token: string): Promise<ApiVentaRow[]> {
  return requestJson<ApiVentaRow[]>('/ventas', { headers: { Authorization: `Bearer ${token}` } });
}

export async function createVenta(token: string, venta: Record<string, unknown>): Promise<ApiVentaRow> {
  return requestJson<ApiVentaRow>('/ventas', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(venta)
  });
}

export async function fetchMovimientosCaja(token: string, fincaId?: string): Promise<ApiCajaRow[]> {
  const query = fincaId ? `?fincaId=${encodeURIComponent(fincaId)}` : '';
  return requestJson<ApiCajaRow[]>(`/movimientos-caja${query}`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function createMovimientoCaja(token: string, movimiento: Record<string, unknown>): Promise<ApiCajaRow> {
  return requestJson<ApiCajaRow>('/movimientos-caja', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(movimiento)
  });
}

export type WorkspaceStatePayload = Record<string, unknown>;

export async function fetchWorkspaceState(token: string): Promise<WorkspaceStatePayload> {
  return requestJson<WorkspaceStatePayload>('/state', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function saveWorkspaceState(token: string, payload: WorkspaceStatePayload): Promise<void> {
  await requestJson('/state', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}
