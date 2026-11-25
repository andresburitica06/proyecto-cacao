/**
 * Punto único de conexión con el backend REST de la aplicación.
 * Define los contratos de datos devueltos por la API y las funciones HTTP para autenticación,
 * administración de usuarios, fincas, zonas, recolecciones, inventario, clientes, ventas, caja y estado global.
 * La aplicación web nunca debe usar credenciales MySQL directamente.
 */
import type { CategoriaGasto, EstadoCalidad, MetodoPago, TipoProductoCacao } from '../types';

/** URL base del backend obtenida desde las variables de entorno de Vite (sin barra final). */
export const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/** Indica si el entorno cuenta con una URL de backend configurada. */
export const backendConfigured = Boolean(apiBaseUrl);

// ============================================================================
// Interfaces de respuesta del backend (estructura de filas de la API/BD)
// ============================================================================

/** Datos del usuario autenticado devueltos por el backend. */
export interface ApiAuthUser {
  id: number;
  rol: string;
  nombreCompleto: string;
  fincaId: number | null;
  fincaNombre?: string | null;
}

/** Registro de usuario/productor visible en la gestión administrativa. */
export interface ApiClientRow {
  id_usuario: number;
  cedula: string;
  nombre_completo: string;
  telefono: string | null;
  id_finca: number | null;
  finca: string | null;
}

/** Datos públicos del perfil de usuario; nunca incluye password_hash. */
export interface ApiUserProfile {
  id_usuario: number;
  cedula: string;
  nombre_completo: string;
  telefono: string | null;
  correo: string | null;
  rol: string;
  activo: boolean;
}

/** Campos editables por el titular del perfil. */
export interface UpdateApiUserProfileInput {
  cedula: string;
  nombre_completo: string;
  telefono: string;
  correo: string;
}

/** Fila de finca retornada por el backend. */
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

/** Fila de zona o lote de cultivo retornada por el backend. */
export interface ApiZonaRow {
  id_zona: number;
  id_finca: number;
  nombre_zona: string;
  variedad_cacao: string;
  arboles_estimados: number;
  hectareas: number;
  ano_siembra: number | null;
}

/** Fila de recolección de cacao retornada por el backend. */
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

/** Fila de inventario de cacao retornada por el backend. */
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

/** Fila de cliente comprador retornada por el backend. */
export interface ApiClienteRow {
  id_cliente: number;
  documento: string;
  nombre: string;
  telefono: string | null;
  tipo_cliente: 'cooperativa' | 'intermediario' | 'empresa_chocolate' | 'particular';
  municipio: string | null;
}

/** Fila de venta de cacao retornada por el backend. */
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

/** Fila de movimiento de caja (ingreso o egreso) retornada por el backend. */
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

/** Respuesta estándar de los endpoints de inicio de sesión y registro. */
interface ApiAuthResponse {
  token: string;
  user: ApiAuthUser;
}

// ============================================================================
// Helper HTTP centralizado
// ============================================================================

/**
 * Ejecuta una petición HTTP JSON contra la API configurada.
 * Maneja errores de red, valida respuestas HTTP y dispara un evento global
 * cuando detecta que la sesión del usuario expiró o es inválida (HTTP 401).
 */
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
    // TypeError en fetch suele indicar que el servidor no está disponible o falló la red
    if (error instanceof TypeError) {
      throw new Error('No se pudo conectar con la API. Ejecuta "npm run dev:api" y vuelve a intentarlo.');
    }
    throw error;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    // Detecta expiración o invalidez de sesión para notificar al resto de la aplicación
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

// ============================================================================
// Salud del servicio y autenticación
// ============================================================================

/** Verifica si la API configurada responde correctamente en el endpoint `/health`. */
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

/** Inicia sesión en el backend usando cédula y contraseña. */
export async function loginWithApi(cedula: string, password: string): Promise<ApiAuthResponse> {
  return requestJson<ApiAuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ cedula, password })
  });
}

/** Registra un nuevo usuario productor junto con su finca inicial en el backend. */
export async function registerWithApi(input: {
  cedula: string;
  nombreCompleto: string;
  telefono?: string;
  correo: string;
  password: string;
  nombreFinca: string;
  municipio?: string;
}): Promise<ApiAuthResponse> {
  return requestJson<ApiAuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

// ============================================================================
// Administración de usuarios
// ============================================================================

/** Obtiene el listado de usuarios/productores para el panel administrativo. */
export async function fetchAdminClients(token: string): Promise<ApiClientRow[]> {
  return requestJson<ApiClientRow[]>('/clientes', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

/** Consulta los datos públicos del perfil del usuario autenticado. */
export async function fetchUserProfile(token: string, userId: string): Promise<ApiUserProfile> {
  return requestJson<ApiUserProfile>(`/usuarios/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/** Actualiza los datos personales del usuario autenticado. */
export async function updateUserProfile(
  token: string,
  userId: string,
  input: UpdateApiUserProfileInput
): Promise<ApiUserProfile> {
  return requestJson<ApiUserProfile>(`/usuarios/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input)
  });
}

/** Restablece la contraseña de un usuario específico (acción administrativa). */
export async function resetUserPassword(token: string, userId: string, password: string): Promise<void> {
  await requestJson(`/clientes/${userId}/password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ password })
  });
}

// ============================================================================
// Gestión de fincas
// ============================================================================

/** Consulta todas las fincas asociadas al usuario autenticado. */
export async function fetchFincas(token: string): Promise<ApiFincaRow[]> {
  return requestJson<ApiFincaRow[]>('/fincas', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/** Crea una nueva finca tras normalizar y validar los campos obligatorios. */
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
  // Limpia espacios y asegura tipos numéricos/booleanos antes de enviar al servidor
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

/** Actualiza los datos de una finca existente por su identificador. */
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
  // Normaliza los valores de texto y numéricos antes de enviar la actualización
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

/** Elimina una finca por su identificador. */
export async function deleteFinca(token: string, id: string): Promise<void> {
  await requestJson(`/fincas/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// ============================================================================
// Zonas de cultivo
// ============================================================================

/** Obtiene las zonas o lotes de cultivo, opcionalmente filtrados por `fincaId`. */
export async function fetchZonas(token: string, fincaId?: string): Promise<ApiZonaRow[]> {
  const query = fincaId ? `?fincaId=${encodeURIComponent(fincaId)}` : '';
  return requestJson<ApiZonaRow[]>(`/zonas${query}`, { headers: { Authorization: `Bearer ${token}` } });
}

/** Registra una nueva zona o lote de cultivo en una finca. */
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

/** Elimina una zona de cultivo por su identificador. */
export async function deleteZona(token: string, id: string): Promise<void> {
  await requestJson(`/zonas/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
}

// ============================================================================
// Recolecciones
// ============================================================================

/** Consulta el historial de recolecciones registradas. */
export async function fetchRecolecciones(token: string): Promise<ApiRecoleccionRow[]> {
  return requestJson<ApiRecoleccionRow[]>('/recolecciones', { headers: { Authorization: `Bearer ${token}` } });
}

/** Crea un nuevo registro de recolección de cacao. */
export async function createRecoleccion(token: string, recoleccion: Record<string, unknown>): Promise<ApiRecoleccionRow> {
  return requestJson<ApiRecoleccionRow>('/recolecciones', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(recoleccion)
  });
}

/** Actualiza una recolección existente (por ejemplo, avance de estado o kilos secos obtenidos). */
export async function updateRecoleccion(token: string, id: string, recoleccion: Record<string, unknown>): Promise<ApiRecoleccionRow> {
  return requestJson<ApiRecoleccionRow>(`/recolecciones/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(recoleccion)
  });
}

// ============================================================================
// Inventario
// ============================================================================

/** Obtiene los registros de inventario de cacao disponibles. */
export async function fetchInventario(token: string): Promise<ApiInventarioRow[]> {
  return requestJson<ApiInventarioRow[]>('/inventario', { headers: { Authorization: `Bearer ${token}` } });
}

/** Crea un nuevo registro de producto en el inventario. */
export async function createInventario(token: string, inventario: Record<string, unknown>): Promise<ApiInventarioRow> {
  return requestJson<ApiInventarioRow>('/inventario', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(inventario)
  });
}

/** Actualiza las cantidades, precio de referencia o datos de un registro de inventario. */
export async function updateInventario(token: string, id: string, inventario: Record<string, unknown>): Promise<ApiInventarioRow> {
  return requestJson<ApiInventarioRow>(`/inventario/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(inventario)
  });
}

// ============================================================================
// Clientes compradores
// ============================================================================

/** Obtiene el directorio de clientes compradores de cacao. */
export async function fetchClientesCompradores(token: string): Promise<ApiClienteRow[]> {
  return requestJson<ApiClienteRow[]>(`/clientes-compradores`, { headers: { Authorization: `Bearer ${token}` } });
}

/** Registra un nuevo cliente comprador. */
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

// ============================================================================
// Ventas y movimientos de caja
// ============================================================================

/** Obtiene el historial de ventas registradas. */
export async function fetchVentas(token: string): Promise<ApiVentaRow[]> {
  return requestJson<ApiVentaRow[]>('/ventas', { headers: { Authorization: `Bearer ${token}` } });
}

/** Registra una nueva venta de cacao. */
export async function createVenta(token: string, venta: Record<string, unknown>): Promise<ApiVentaRow> {
  return requestJson<ApiVentaRow>('/ventas', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(venta)
  });
}

/** Obtiene los movimientos de caja, opcionalmente filtrados por `fincaId`. */
export async function fetchMovimientosCaja(token: string, fincaId?: string): Promise<ApiCajaRow[]> {
  const query = fincaId ? `?fincaId=${encodeURIComponent(fincaId)}` : '';
  return requestJson<ApiCajaRow[]>(`/movimientos-caja${query}`, { headers: { Authorization: `Bearer ${token}` } });
}

/** Registra un nuevo movimiento de ingreso o egreso en caja. */
export async function createMovimientoCaja(token: string, movimiento: Record<string, unknown>): Promise<ApiCajaRow> {
  return requestJson<ApiCajaRow>('/movimientos-caja', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(movimiento)
  });
}

// ============================================================================
// Sincronización de estado del espacio de trabajo
// ============================================================================

/** Carga útil genérica para guardar o recuperar el estado completo del espacio de trabajo. */
export type WorkspaceStatePayload = Record<string, unknown>;

/** Recupera el estado sincronizado del espacio de trabajo desde el backend. */
export async function fetchWorkspaceState(token: string): Promise<WorkspaceStatePayload> {
  return requestJson<WorkspaceStatePayload>('/state', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

/** Guarda el estado completo del espacio de trabajo en el backend. */
export async function saveWorkspaceState(token: string, payload: WorkspaceStatePayload): Promise<void> {
  await requestJson('/state', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}
