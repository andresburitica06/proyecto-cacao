-- AppCacao - esquema completo para MySQL 8+
-- ADVERTENCIA: elimina y recrea db_cacao_adso_v2.

DROP DATABASE IF EXISTS db_cacao_adso_v2;
CREATE DATABASE db_cacao_adso_v2
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE db_cacao_adso_v2;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE usuarios (
  id_usuario BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cedula VARCHAR(20) NOT NULL UNIQUE,
  nombre_completo VARCHAR(150) NOT NULL,
  telefono VARCHAR(30) NULL,
  correo VARCHAR(150) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'administrador_finca', 'productor', 'operario') NOT NULL DEFAULT 'productor',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE fincas (
  id_finca BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  propietario VARCHAR(150) NULL,
  vereda VARCHAR(120) NULL,
  municipio VARCHAR(120) NOT NULL,
  hectareas_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  hectareas_cacao DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  codigo_predial VARCHAR(80) NULL,
  imagen VARCHAR(255) NULL,
  tecnificada TINYINT(1) NOT NULL DEFAULT 0,
  nivel_tecnificacion ENUM('tradicional', 'baja', 'media', 'alta') NULL,
  activa TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT ck_finca_areas CHECK (
    hectareas_total >= 0
    AND hectareas_cacao >= 0
    AND hectareas_cacao <= hectareas_total
  )
) ENGINE=InnoDB;

CREATE TABLE usuario_finca (
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_finca BIGINT UNSIGNED NOT NULL,
  rol_en_finca ENUM('propietario', 'administrador', 'operario', 'consulta') NOT NULL DEFAULT 'propietario',
  PRIMARY KEY (id_usuario, id_finca),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  FOREIGN KEY (id_finca) REFERENCES fincas(id_finca) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tipos_producto (
  id_tipo_producto BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  descripcion VARCHAR(255) NULL
) ENGINE=InnoDB;

INSERT INTO tipos_producto (codigo, nombre, descripcion) VALUES
  ('cacao_baba', 'Cacao Baba Fresco', 'Cacao en baba, aun sin fermentar'),
  ('cacao_fermentado', 'Cacao Fermentado', 'Cacao en etapa intermedia'),
  ('cacao_seco_premium', 'Cacao Seco Premium', 'Cacao seco de mejor calidad'),
  ('cacao_seco_corriente', 'Cacao Seco Corriente', 'Cacao seco corriente o pasilla');

CREATE TABLE zonas_cultivo (
  id_zona BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_finca BIGINT UNSIGNED NOT NULL,
  nombre_zona VARCHAR(120) NOT NULL,
  variedad_cacao VARCHAR(120) NOT NULL,
  arboles_estimados INT UNSIGNED NOT NULL DEFAULT 0,
  hectareas DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ano_siembra SMALLINT UNSIGNED NULL,
  activa TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_zona_finca_nombre (id_finca, nombre_zona),
  FOREIGN KEY (id_finca) REFERENCES fincas(id_finca) ON DELETE CASCADE,
  CONSTRAINT ck_zona_hectareas CHECK (hectareas >= 0)
) ENGINE=InnoDB;

CREATE TABLE recolecciones (
  id_recoleccion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_finca BIGINT UNSIGNED NOT NULL,
  id_zona BIGINT UNSIGNED NULL,
  id_usuario_registra BIGINT UNSIGNED NULL,
  fecha_recoleccion DATE NOT NULL,
  kilos_baba DECIMAL(12,2) NOT NULL,
  rendimiento_estimado_seco DECIMAL(12,2) NOT NULL,
  kilos_seco_obtenidos DECIMAL(12,2) NULL,
  estado_proceso ENUM('baba', 'fermentacion', 'secado', 'seco_listo', 'merma_mal_estado') NOT NULL DEFAULT 'baba',
  tecnificada TINYINT(1) NOT NULL DEFAULT 0,
  jornales_utilizados DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  responsable VARCHAR(150) NOT NULL,
  notas TEXT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_finca) REFERENCES fincas(id_finca) ON DELETE CASCADE,
  FOREIGN KEY (id_zona) REFERENCES zonas_cultivo(id_zona) ON DELETE SET NULL,
  FOREIGN KEY (id_usuario_registra) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  CONSTRAINT ck_recoleccion_cantidades CHECK (
    kilos_baba > 0 AND rendimiento_estimado_seco >= 0 AND jornales_utilizados >= 0
  )
) ENGINE=InnoDB;

CREATE TABLE procesos_cacao (
  id_proceso BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_recoleccion BIGINT UNSIGNED NOT NULL UNIQUE,
  fecha_inicio_fermentacion DATE NOT NULL,
  dias_fermentacion SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  volteos_realizados SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  fecha_inicio_secado DATE NULL,
  dias_secado SMALLINT UNSIGNED NULL,
  humedad_porcentaje_actual DECIMAL(5,2) NULL,
  calidad_final ENUM('premium_exportacion', 'standard', 'pasilla') NULL,
  observaciones TEXT NULL,
  FOREIGN KEY (id_recoleccion) REFERENCES recolecciones(id_recoleccion) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE inventarios (
  id_inventario BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_finca BIGINT UNSIGNED NOT NULL,
  codigo_tipo_producto VARCHAR(40) NOT NULL,
  nombre_producto VARCHAR(150) NOT NULL,
  estado_calidad ENUM('buen_estado', 'mal_estado') NOT NULL DEFAULT 'buen_estado',
  cantidad_recolectada_kg DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  cantidad_vendida_kg DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  cantidad_kg DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  precio_ref_kg DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ubicacion_bodega VARCHAR(150) NOT NULL,
  fecha_ultima_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inventario_finca_tipo_estado_ubicacion (
    id_finca, codigo_tipo_producto, estado_calidad, ubicacion_bodega
  ),
  FOREIGN KEY (id_finca) REFERENCES fincas(id_finca) ON DELETE CASCADE,
  FOREIGN KEY (codigo_tipo_producto) REFERENCES tipos_producto(codigo),
  CONSTRAINT ck_inventario_valores CHECK (
    cantidad_recolectada_kg >= 0
    AND cantidad_vendida_kg >= 0
    AND cantidad_vendida_kg <= cantidad_recolectada_kg
    AND cantidad_kg >= 0
    AND precio_ref_kg >= 0
  )
) ENGINE=InnoDB;

CREATE TABLE clientes_compradores (
  id_cliente BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  documento VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  telefono VARCHAR(30) NULL,
  tipo_cliente ENUM('cooperativa', 'intermediario', 'empresa_chocolate', 'particular') NOT NULL DEFAULT 'particular',
  municipio VARCHAR(100) NULL,
  id_usuario_registra BIGINT UNSIGNED NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario_registra) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE cajas_diarias (
  id_caja BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_finca BIGINT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  saldo_inicial DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_caja_finca_fecha (id_finca, fecha),
  FOREIGN KEY (id_finca) REFERENCES fincas(id_finca) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ventas (
  id_venta BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_finca BIGINT UNSIGNED NOT NULL,
  id_cliente BIGINT UNSIGNED NULL,
  cliente_nombre_libre VARCHAR(150) NOT NULL,
  cliente_documento_libre VARCHAR(40) NULL,
  id_usuario_registra BIGINT UNSIGNED NULL,
  id_caja BIGINT UNSIGNED NULL,
  fecha_venta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  codigo_tipo_producto VARCHAR(40) NOT NULL,
  estado_calidad_vendido ENUM('buen_estado', 'mal_estado') NOT NULL DEFAULT 'buen_estado',
  kilos_vendidos DECIMAL(12,2) NOT NULL,
  precio_por_kg DECIMAL(12,2) NOT NULL,
  total_venta DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  metodo_pago ENUM('efectivo', 'transferencia', 'fiado_credito') NOT NULL DEFAULT 'efectivo',
  estado_pago ENUM('pagado', 'pendiente', 'anulado') NOT NULL DEFAULT 'pagado',
  comprobante_numero VARCHAR(80) NULL UNIQUE,
  notas VARCHAR(255) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_finca) REFERENCES fincas(id_finca) ON DELETE CASCADE,
  FOREIGN KEY (id_cliente) REFERENCES clientes_compradores(id_cliente) ON DELETE SET NULL,
  FOREIGN KEY (id_usuario_registra) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  FOREIGN KEY (id_caja) REFERENCES cajas_diarias(id_caja) ON DELETE SET NULL,
  FOREIGN KEY (codigo_tipo_producto) REFERENCES tipos_producto(codigo),
  CONSTRAINT ck_venta_valores CHECK (kilos_vendidos > 0 AND precio_por_kg >= 0 AND total_venta >= 0)
) ENGINE=InnoDB;

CREATE TABLE movimientos_inventario (
  id_movimiento_inventario BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_inventario BIGINT UNSIGNED NOT NULL,
  id_usuario_registra BIGINT UNSIGNED NULL,
  id_recoleccion BIGINT UNSIGNED NULL,
  id_venta BIGINT UNSIGNED NULL,
  tipo ENUM('entrada_recoleccion', 'entrada_manual', 'salida_venta', 'ajuste', 'merma') NOT NULL,
  cantidad_kg DECIMAL(12,2) NOT NULL,
  fecha_movimiento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observacion VARCHAR(255) NULL,
  FOREIGN KEY (id_inventario) REFERENCES inventarios(id_inventario) ON DELETE CASCADE,
  FOREIGN KEY (id_usuario_registra) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  FOREIGN KEY (id_recoleccion) REFERENCES recolecciones(id_recoleccion) ON DELETE SET NULL,
  FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE SET NULL,
  CONSTRAINT ck_movimiento_inventario CHECK (cantidad_kg <> 0)
) ENGINE=InnoDB;

CREATE TABLE movimientos_caja (
  id_movimiento_caja BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_caja BIGINT UNSIGNED NOT NULL,
  id_usuario_registra BIGINT UNSIGNED NULL,
  id_venta BIGINT UNSIGNED NULL,
  fecha_movimiento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo ENUM('ingreso', 'egreso') NOT NULL,
  categoria ENUM('venta_cacao', 'pago_jornales', 'insumos_fertilizante', 'transporte_flete', 'mantenimiento_herramientas', 'alimentacion', 'otros_gastos') NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  monto DECIMAL(14,2) NOT NULL,
  referencia VARCHAR(80) NULL,
  FOREIGN KEY (id_caja) REFERENCES cajas_diarias(id_caja) ON DELETE CASCADE,
  FOREIGN KEY (id_usuario_registra) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE SET NULL,
  CONSTRAINT ck_movimiento_caja CHECK (monto > 0)
) ENGINE=InnoDB;

CREATE TABLE estado_aplicacion (
  clave VARCHAR(64) PRIMARY KEY,
  payload JSON NOT NULL,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_fincas_municipio ON fincas(municipio);
CREATE INDEX idx_zonas_finca ON zonas_cultivo(id_finca);
CREATE INDEX idx_recolecciones_fecha ON recolecciones(fecha_recoleccion);
CREATE INDEX idx_recolecciones_estado ON recolecciones(estado_proceso);
CREATE INDEX idx_inventario_finca_tipo ON inventarios(id_finca, codigo_tipo_producto);
CREATE INDEX idx_movimientos_inventario_fecha ON movimientos_inventario(fecha_movimiento);
CREATE INDEX idx_ventas_finca_fecha ON ventas(id_finca, fecha_venta);
CREATE INDEX idx_ventas_cliente ON ventas(id_cliente);
CREATE INDEX idx_movimientos_caja_fecha ON movimientos_caja(id_caja, fecha_movimiento);

CREATE OR REPLACE VIEW vw_inventario_resumen_finca AS
SELECT
  f.id_finca,
  f.nombre AS finca_nombre,
  COALESCE(SUM(i.cantidad_kg), 0) AS total_kilos,
  COALESCE(SUM(i.cantidad_recolectada_kg), 0) AS total_recolectado,
  COALESCE(SUM(i.cantidad_vendida_kg), 0) AS total_vendido,
  COALESCE(SUM(CASE WHEN i.estado_calidad = 'buen_estado' THEN i.cantidad_kg ELSE 0 END), 0) AS kilos_buen_estado,
  COALESCE(SUM(CASE WHEN i.estado_calidad = 'mal_estado' THEN i.cantidad_kg ELSE 0 END), 0) AS kilos_mal_estado
FROM fincas f
LEFT JOIN inventarios i ON i.id_finca = f.id_finca
GROUP BY f.id_finca, f.nombre;

CREATE OR REPLACE VIEW vw_historial_ventas_limpio AS
SELECT
  v.id_venta,
  v.id_finca,
  f.nombre AS finca_nombre,
  v.fecha_venta,
  COALESCE(c.nombre, v.cliente_nombre_libre) AS cliente_nombre,
  v.codigo_tipo_producto,
  v.estado_calidad_vendido,
  v.kilos_vendidos,
  v.precio_por_kg,
  v.total_venta,
  v.metodo_pago,
  v.estado_pago,
  v.comprobante_numero
FROM ventas v
LEFT JOIN fincas f ON f.id_finca = v.id_finca
LEFT JOIN clientes_compradores c ON c.id_cliente = v.id_cliente;

CREATE OR REPLACE VIEW vw_recolecciones_historial AS
SELECT
  r.id_recoleccion,
  r.id_finca,
  f.nombre AS finca_nombre,
  r.id_zona,
  z.nombre_zona,
  r.fecha_recoleccion,
  r.kilos_baba,
  r.rendimiento_estimado_seco,
  r.kilos_seco_obtenidos,
  r.estado_proceso,
  r.tecnificada,
  r.jornales_utilizados,
  r.responsable,
  r.notas
FROM recolecciones r
INNER JOIN fincas f ON f.id_finca = r.id_finca
LEFT JOIN zonas_cultivo z ON z.id_zona = r.id_zona;
