-- Cambios de almacenamiento, calidad y trazabilidad de ventas.
-- Ejecutar una sola vez sobre db_cacao_adso_v2.

ALTER TABLE fincas
  ADD COLUMN es_tecnificada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN nivel_tecnificacion ENUM('tradicional', 'baja', 'media', 'alta') NULL;

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

ALTER TABLE detalle_ventas
  ADD COLUMN estado_calidad ENUM('buen_estado', 'mal_estado') NOT NULL DEFAULT 'buen_estado';

CREATE INDEX idx_detalle_ventas_historial
  ON detalle_ventas (estado_calidad, id_venta);

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
