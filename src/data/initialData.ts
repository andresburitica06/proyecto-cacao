/**
 * Datos iniciales vacíos para el estado global de la aplicación.
 * Se utilizan como valores por defecto antes de cargar información local o desde la API.
 */
import { Finca, ZonaCultivo, Recoleccion, ProductoInventario, Cliente, Venta, MovimientoCaja } from '../types';

/** Lista inicial de fincas registradas. */
export const INITIAL_FINCAS: Finca[] = [];

/** Lista inicial de zonas o lotes de cultivo. */
export const INITIAL_ZONAS: ZonaCultivo[] = [];

/** Lista inicial de jornadas de recolección. */
export const INITIAL_RECOLECCIONES: Recoleccion[] = [];

/** Lista inicial de productos en inventario. */
export const INITIAL_INVENTARIO: ProductoInventario[] = [];

/** Lista inicial de clientes compradores. */
export const INITIAL_CLIENTES: Cliente[] = [];

/** Lista inicial de ventas realizadas. */
export const INITIAL_VENTAS: Venta[] = [];

/** Lista inicial de movimientos de caja (ingresos y egresos). */
export const INITIAL_CAJA: MovimientoCaja[] = [];
