-- ============================================================================
-- Migración 001: Almacenamiento, calidad de cacao y trazabilidad de ventas
-- Descripción: Agrega soporte de tecnificación en fincas, trazabilidad de
--              cantidades recolectadas/vendidas y estado de calidad en
--              inventarios y detalle de ventas, además de un índice y una
--              vista consolidada para el historial de ventas.
-- Uso: Ejecutar una sola vez sobre la base de datos db_cacao_adso_v2.
-- ============================================================================

-- 1. Ampliación de la tabla `fincas`:
--    Agrega indicadores de tecnificación del cultivo y su nivel asociado.
ALTER TABLE fincas
  ADD COLUMN es_tecnificada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN nivel_tecnificacion ENUM('tradicional', 'baja', 'media', 'alta') NULL;

-- 2. Ampliación de la tabla `inventarios`:
--    Incorpora acumulados de kilos recolectados y vendidos, el estado de
--    calidad del lote y una restricción CHECK que garantiza cantidades no
--    negativas y que lo vendido nunca supere lo recolectado.
ALTER TABLE inventarios
  ADD COLUMN cantidad_recolectada_kg DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN cantidad_vendida_kg DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN estado_calidad ENUM('buen_estado', 'mal_estado') NOT NULL DEFAULT 'buen_estado',
  ADD CONSTRAINT ck_inventario_trazabilidad
    CHECK (
      cantidad_recolectada_kg >= 0
      AND cantidad_vendida_kg >= 0
      AND cantidad_vendida_kg <= cantidad_recolectada_kg
    );

-- 3. Ampliación de la tabla `detalle_ventas`:
--    Registra el estado de calidad del producto en cada línea vendida.
ALTER TABLE detalle_ventas
  ADD COLUMN estado_calidad ENUM('buen_estado', 'mal_estado') NOT NULL DEFAULT 'buen_estado';

-- 4. Índice de consulta para el historial de ventas:
--    Optimiza filtros y agrupaciones por estado de calidad y venta asociada.
CREATE INDEX idx_detalle_ventas_historial
  ON detalle_ventas (estado_calidad, id_venta);

-- 5. Vista `historial_ventas`:
--    Consolida la información de ventas, clientes compradores, fincas y
--    detalle de kilos, precios y estado de calidad para reportes e historial.
CREATE OR REPLACE VIEW historial_ventas AS
SELECT
  v.id_venta,
  v.fecha_venta,
  v.estado_pago,
  v.total,
  c.razon_social AS cliente,
  f.nombre AS finca,
  dv.cantidad_kg,
  dv.precio_unitario_kg,
  dv.subtotal,
  dv.estado_calidad
FROM ventas v
INNER JOIN clientes_compradores c ON c.id_cliente = v.id_cliente
INNER JOIN fincas f ON f.id_finca = v.id_finca
INNER JOIN detalle_ventas dv ON dv.id_venta = v.id_venta;
