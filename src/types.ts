/**
 * Definiciones de tipos e interfaces del dominio para la aplicación cacaotera.
 * Centraliza los modelos de navegación, usuarios, fincas, cultivos, recolecciones,
 * procesos de beneficio, inventario, clientes, ventas, caja y configuración de voz.
 */

/** Pestañas o vistas principales disponibles en la navegación de la aplicación. */
export type ActiveTab = 'auth' | 'dashboard' | 'perfil' | 'fincas' | 'recoleccion' | 'inventario' | 'ventas_caja' | 'clientes' | 'configuracion';

/** Representa un usuario autenticado o registrado en la plataforma. */
export interface Usuario {
  id: string;
  nombreCompleto: string;
  cedula: string;
  celularWhatsApp: string;
  nombreFincaVereda: string;
  fincaId?: string;
  correo?: string;
  activo?: boolean;
  fotoPerfil?: string;
  /** Solo para la demostración local. En producción debe gestionarse en un servidor. */
  password?: string;
  rol?: 'admin' | 'administrador_finca' | 'productor' | 'operario';
  fechaRegistro: string;
}

/** Clasificación de los tipos de producto de cacao manejados en inventario y ventas. */
export type TipoProductoCacao = 'cacao_baba' | 'cacao_fermentado' | 'cacao_seco_premium' | 'cacao_seco_corriente';

/** Estado de calidad del grano o producto de cacao. */
export type EstadoCalidad = 'buen_estado' | 'mal_estado';

/** Etapas del proceso poscosecha del cacao desde la recolección hasta el secado final. */
export type EstadoProceso = 'baba' | 'fermentacion' | 'secado' | 'seco_listo';

/** Métodos de pago admitidos al registrar una venta. */
export type MetodoPago = 'efectivo' | 'transferencia' | 'fiado_credito';

/** Categorías de egresos operativos de la finca registrados en caja. */
export type CategoriaGasto = 'pago_jornales' | 'insumos_fertilizante' | 'transporte_flete' | 'mantenimiento_herramientas' | 'alimentacion' | 'otros_gastos';

/** Información general y técnica de una finca cacaotera. */
export interface Finca {
  id: string;
  nombre: string;
  propietario: string;
  vereda: string;
  municipio: string;
  hectareasTotal: number;
  hectareasCacao: number;
  esTecnificada?: boolean;
  nivelTecnificacion?: 'tradicional' | 'baja' | 'media' | 'alta';
  codigoPredial?: string;
  imagen?: string;
  fechaRegistro: string;
}

/** Lote o zona específica de cultivo dentro de una finca. */
export interface ZonaCultivo {
  id: string;
  fincaId: string;
  nombreZona: string; // ej: Lote El Mirador, La Cañada
  variedadCacao: string; // ej: CCN-51, Fino de Aroma, ICS-39, TSH-565
  arbolesEstimados: number;
  hectareas: number;
  anoSiembra?: number;
}

/** Registro de una jornada de recolección de cacao en baba y su seguimiento. */
export interface Recoleccion {
  id: string;
  fincaId: string;
  zonaId: string;
  fecha: string;
  kilosBaba: number;
  rendimientoEstimadoSeco: number; // ~38-40% de kilosBaba
  kilosSecoObtenidos?: number;
  estadoProceso: EstadoProceso;
  jornalesUtilizados: number;
  responsable: string;
  notas?: string;
}

/** Seguimiento técnico de las etapas de fermentación y secado de una recolección. */
export interface ProcesoCacao {
  id: string;
  recoleccionId: string;
  fechaInicioFermentacion: string;
  diasFermentacion: number; // ej: 5-7 días
  volteosRealizados: number;
  fechaInicioSecado?: string;
  diasSecado?: number;
  humedadPorcentajeActual?: number; // ideal ~7%
  calidadFinal?: 'premium_exportacion' | 'standard' | 'pasilla';
}

/** Registro de existencias de cacao almacenado en bodega por tipo y calidad. */
export interface ProductoInventario {
  id: string;
  fincaId: string;
  tipoProducto: TipoProductoCacao;
  nombreProducto: string;
  cantidadKg: number;
  cantidadRecolectadaKg?: number;
  cantidadVendidaKg?: number;
  estadoCalidad?: EstadoCalidad;
  precioRefKg: number; // Valor sugerido mercado en Pesos COP
  ubicacionBodega: string;
  fechaUltimaActualizacion: string;
}

/** Datos de un cliente comprador de cacao (cooperativa, intermediario, empresa o particular). */
export interface Cliente {
  id: string;
  nombre: string;
  documento: string;
  telefono: string;
  tipoCliente: 'cooperativa' | 'intermediario' | 'empresa_chocolate' | 'particular';
  municipio: string;
}

/** Registro de una operación comercial de venta de cacao. */
export interface Venta {
  id: string;
  clienteId: string;
  clienteNombre?: string;
  fincaId: string;
  fecha: string;
  tipoProducto: TipoProductoCacao;
  kilosVendidos: number;
  precioPorKg: number;
  totalVenta: number;
  estadoCalidad?: EstadoCalidad;
  estadoVenta?: 'confirmada' | 'anulada';
  metodoPago: MetodoPago;
  pagado: boolean;
  comprobanteNumero?: string;
}

/** Movimiento financiero de ingreso o egreso asociado a la caja de la finca. */
export interface MovimientoCaja {
  id: string;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  concepto: string;
  monto: number;
  categoria: 'venta_cacao' | CategoriaGasto;
  referenciaId?: string; // id de la venta si aplica
  registradoPor: string;
}

/** Preferencias del asistente de voz y opciones de accesibilidad visual. */
export interface AjusteVozConfig {
  activo: boolean;
  velocidad: number; // 0.8 (lento) a 1.2 (rápido)
  volumen: number;
  reproducirAlCambiarPagina: boolean;
  modoTexturaAltoContraste: boolean;
}
