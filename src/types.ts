export type ActiveTab = 'auth' | 'dashboard' | 'fincas' | 'recoleccion' | 'inventario' | 'ventas_caja' | 'clientes' | 'configuracion';

export interface Usuario {
  id: string;
  nombreCompleto: string;
  cedula: string;
  celularWhatsApp: string;
  nombreFincaVereda: string;
  fincaId?: string;
  /** Solo para la demostración local. En producción debe gestionarse en un servidor. */
  password?: string;
  rol?: 'admin' | 'administrador_finca' | 'productor' | 'operario';
  fechaRegistro: string;
}

export type TipoProductoCacao = 'cacao_baba' | 'cacao_fermentado' | 'cacao_seco_premium' | 'cacao_seco_corriente';

export type EstadoCalidad = 'buen_estado' | 'mal_estado';

export type EstadoProceso = 'baba' | 'fermentacion' | 'secado' | 'seco_listo';

export type MetodoPago = 'efectivo' | 'transferencia' | 'fiado_credito';

export type CategoriaGasto = 'pago_jornales' | 'insumos_fertilizante' | 'transporte_flete' | 'mantenimiento_herramientas' | 'alimentacion' | 'otros_gastos';

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

export interface ZonaCultivo {
  id: string;
  fincaId: string;
  nombreZona: string; // ej: Lote El Mirador, La Cañada
  variedadCacao: string; // ej: CCN-51, Fino de Aroma, ICS-39, TSH-565
  arbolesEstimados: number;
  hectareas: number;
  anoSiembra?: number;
}

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

export interface Cliente {
  id: string;
  nombre: string;
  documento: string;
  telefono: string;
  tipoCliente: 'cooperativa' | 'intermediario' | 'empresa_chocolate' | 'particular';
  municipio: string;
}

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

export interface AjusteVozConfig {
  activo: boolean;
  velocidad: number; // 0.8 (lento) a 1.2 (rápido)
  volumen: number;
  reproducirAlCambiarPagina: boolean;
  modoTexturaAltoContraste: boolean;
}
