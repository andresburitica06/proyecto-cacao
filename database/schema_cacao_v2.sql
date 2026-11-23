-- ============================================================================
-- Sistema de Gestión de Cacao ADSO - Esquema funcional v2
-- Motor: MySQL 8+ (InnoDB, utf8mb4_unicode_ci)
-- Propósito: Define la estructura relacional normalizada v2 para gestión
--            territorial, usuarios, fincas, lotes, cosechas, procesos
--            poscosecha, inventarios, clientes, ventas, caja diaria y estado
--            de la aplicación. Crea `db_cacao_adso_v2` si no existe, sin
--            modificar bases previas (`db_cacao_adso`).
-- ============================================================================

-- Creación y selección de la base de datos con soporte completo UTF-8
CREATE DATABASE IF NOT EXISTS db_cacao_adso_v2
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE db_cacao_adso_v2;

-- ============================================================================
-- 1. CATÁLOGO TERRITORIAL
-- ============================================================================

-- Tabla `regiones`: catálogo de regiones o municipios principales.
CREATE TABLE regiones (
  id_region BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Tabla `veredas`: divisiones rurales pertenecientes a una región.
-- Relación N:1 con `regiones`; evita nombres de vereda duplicados en la misma región.
CREATE TABLE veredas (
  id_vereda BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_region BIGINT UNSIGNED NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_vereda_region (id_region, nombre),
  CONSTRAINT fk_vereda_region FOREIGN KEY (id_region) REFERENCES regiones(id_region)
) ENGINE=InnoDB;

-- ============================================================================
-- 2. USUARIOS, FINCAS Y CONTROL DE ACCESO
-- ============================================================================

-- Tabla `usuarios`: cuentas de acceso al sistema con autenticación por cédula
-- y control de rol global (`admin`, `productor`, `operario`).
CREATE TABLE usuarios (
  id_usuario BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cedula VARCHAR(20) NOT NULL UNIQUE,
  nombre_completo VARCHAR(150) NOT NULL,
  telefono VARCHAR(20) NULL,
  correo VARCHAR(150) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt o Argon2; nunca texto plano',
  rol ENUM('admin', 'productor', 'operario') NOT NULL DEFAULT 'productor',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabla `fincas`: predios cacaoteros registrados con ubicación, áreas totales
-- y áreas dedicadas a cacao (validadas mediante CHECK).
CREATE TABLE fincas (
  id_finca BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  id_vereda BIGINT UNSIGNED NULL,
  municipio VARCHAR(100) NOT NULL,
  hectareas_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  hectareas_cacao DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  codigo_predial VARCHAR(80) NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT ck_finca_areas CHECK (hectareas_total >= 0 AND hectareas_cacao >= 0 AND hectareas_cacao <= hectareas_total),
  CONSTRAINT fk_finca_vereda FOREIGN KEY (id_vereda) REFERENCES veredas(id_vereda)
) ENGINE=InnoDB;

-- Tabla puente `usuario_finca` (relación N:M entre `usuarios` y `fincas`):
-- Control de acceso por predio y rol específico; evita que un productor vea fincas ajenas.
CREATE TABLE usuario_finca (
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_finca BIGINT UNSIGNED NOT NULL,
  rol_en_finca ENUM('propietario', 'administrador', 'operario', 'consulta') NOT NULL DEFAULT 'propietario',
  PRIMARY KEY (id_usuario, id_finca),
  CONSTRAINT fk_usuario_finca_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_usuario_finca_finca FOREIGN KEY (id_finca) REFERENCES fincas(id_finca) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 3. CULTIVOS, LOTES Y CATÁLOGO DE PRODUCTOS
-- ============================================================================

-- Tabla `tipos_cultivo`: catálogo de variedades o tipos de cultivo sembrados.
CREATE TABLE tipos_cultivo (
  id_tipo_cultivo BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT NULL
) ENGINE=InnoDB;

-- Tabla `zonas_cultivo`: lotes o parcelas dentro de cada finca, asociados a un
-- tipo de cultivo, área sembrada y cantidad estimada de árboles.
CREATE TABLE zonas_cultivo (
  id_zona BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_finca BIGINT UNSIGNED NOT NULL,
  id_tipo_cultivo BIGINT UNSIGNED NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  area_hectareas DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  arboles_estimados INT UNSIGNED NOT NULL DEFAULT 0,
  ano_siembra SMALLINT UNSIGNED NULL,
  UNIQUE KEY uq_zona_finca_nombre (id_finca, nombre),
  CONSTRAINT ck_zona_area CHECK (area_hectareas >= 0),
  CONSTRAINT fk_zona_finca FOREIGN KEY (id_finca) REFERENCES fincas(id_finca),
  CONSTRAINT fk_zona_cultivo FOREIGN KEY (id_tipo_cultivo) REFERENCES tipos_cultivo(id_tipo_cultivo)
) ENGINE=InnoDB;

-- Tabla `tipos_producto`: categorías generales de producto comercializable.
CREATE TABLE tipos_producto (
  id_tipo_producto BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Tabla `productos`: artículos concretos derivados del cacao con su tipo y unidad de medida.
CREATE TABLE productos (
  id_producto BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_tipo_producto BIGINT UNSIGNED NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  unidad_medida ENUM('kg', 'saco', 'unidad') NOT NULL DEFAULT 'kg',
  CONSTRAINT fk_producto_tipo FOREIGN KEY (id_tipo_producto) REFERENCES tipos_producto(id_tipo_producto)
) ENGINE=InnoDB;

-- ============================================================================
-- 4. COSECHA, POSCOSECHA, PRODUCCIÓN E INVENTARIOS
-- ============================================================================

-- Tabla `recolecciones`: registro de cosechas de cacao en baba por lote,
-- incluyendo jornales empleados, responsable y usuario que registra.
CREATE TABLE recolecciones (
  id_recoleccion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_zona BIGINT UNSIGNED NOT NULL,
  id_usuario_registra BIGINT UNSIGNED NOT NULL,
  fecha_recoleccion DATE NOT NULL,
  cantidad_baba_kg DECIMAL(12,2) NOT NULL,
  jornales_utilizados DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  responsable VARCHAR(150) NOT NULL,
  notas TEXT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_recoleccion_cantidad CHECK (cantidad_baba_kg > 0 AND jornales_utilizados >= 0),
  CONSTRAINT fk_recoleccion_zona FOREIGN KEY (id_zona) REFERENCES zonas_cultivo(id_zona),
  CONSTRAINT fk_recoleccion_usuario FOREIGN KEY (id_usuario_registra) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- Tabla `procesos_cacao`: seguimiento poscosecha 1:1 de cada recolección
-- (etapa actual, días de fermentación/secado y porcentaje de humedad).
CREATE TABLE procesos_cacao (
  id_proceso BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_recoleccion BIGINT UNSIGNED NOT NULL UNIQUE,
  estado ENUM('baba', 'fermentacion', 'secado', 'seco_listo') NOT NULL DEFAULT 'baba',
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NULL,
  dias_fermentacion SMALLINT UNSIGNED NULL,
  dias_secado SMALLINT UNSIGNED NULL,
  humedad_porcentaje DECIMAL(5,2) NULL,
  notas TEXT NULL,
  CONSTRAINT fk_proceso_recoleccion FOREIGN KEY (id_recoleccion) REFERENCES recolecciones(id_recoleccion) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabla `inventarios`: existencias disponibles por finca, producto y ubicación
-- en bodega, con precio de referencia por kilogramo.
CREATE TABLE inventarios (
  id_inventario BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_finca BIGINT UNSIGNED NOT NULL,
  id_producto BIGINT UNSIGNED NOT NULL,
  ubicacion VARCHAR(150) NOT NULL,
  cantidad_disponible_kg DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  precio_referencia_kg DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inventario_lote (id_finca, id_producto, ubicacion),
  CONSTRAINT ck_inventario_valores CHECK (cantidad_disponible_kg >= 0 AND precio_referencia_kg >= 0),
  CONSTRAINT fk_inventario_finca FOREIGN KEY (id_finca) REFERENCES fincas(id_finca),
  CONSTRAINT fk_inventario_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
) ENGINE=InnoDB;

-- Tabla `producciones`: vincula un proceso de beneficio finalizado con el
-- inventario receptor y registra el rendimiento real obtenido en kilogramos.
CREATE TABLE producciones (
  id_produccion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_proceso BIGINT UNSIGNED NOT NULL,
  id_inventario BIGINT UNSIGNED NOT NULL,
  fecha_registro DATE NOT NULL,
  rendimiento_kg DECIMAL(12,2) NOT NULL,
  CONSTRAINT ck_produccion_rendimiento CHECK (rendimiento_kg > 0),
  CONSTRAINT fk_produccion_proceso FOREIGN KEY (id_proceso) REFERENCES procesos_cacao(id_proceso),
  CONSTRAINT fk_produccion_inventario FOREIGN KEY (id_inventario) REFERENCES inventarios(id_inventario)
) ENGINE=InnoDB;

-- Tabla `movimientos_inventario`: kardex histórico de entradas, salidas,
-- ajustes y mermas aplicados sobre cada registro de inventario.
CREATE TABLE movimientos_inventario (
  id_movimiento BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_inventario BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NOT NULL,
  tipo ENUM('entrada_manual', 'produccion', 'ajuste', 'salida_venta', 'merma') NOT NULL,
  cantidad_kg DECIMAL(12,2) NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observacion VARCHAR(255) NULL,
  CONSTRAINT ck_movimiento_inventario CHECK (cantidad_kg <> 0),
  CONSTRAINT fk_movimiento_inventario FOREIGN KEY (id_inventario) REFERENCES inventarios(id_inventario),
  CONSTRAINT fk_movimiento_inventario_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- ============================================================================
-- 5. CLIENTES, VENTAS Y CAJA DIARIA
-- ============================================================================

-- Tabla `clientes_compradores`: directorio de compradores (cooperativas,
-- empresas o particulares) identificados de forma única por NIT o cédula.
CREATE TABLE clientes_compradores (
  id_cliente BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nit_cedula VARCHAR(30) NOT NULL UNIQUE,
  razon_social VARCHAR(150) NOT NULL,
  telefono VARCHAR(20) NULL,
  direccion VARCHAR(150) NULL,
  municipio VARCHAR(100) NULL
) ENGINE=InnoDB;

-- Tabla `cajas_diarias`: apertura de caja por finca y fecha calendario
-- (única por combinación `id_finca`, `fecha`) con su saldo inicial.
CREATE TABLE cajas_diarias (
  id_caja BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_finca BIGINT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  saldo_inicial DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  UNIQUE KEY uq_caja_finca_fecha (id_finca, fecha),
  CONSTRAINT fk_caja_finca FOREIGN KEY (id_finca) REFERENCES fincas(id_finca)
) ENGINE=InnoDB;

-- Tabla `ventas`: encabezado de ventas realizadas por una finca a un cliente,
-- asociadas al usuario registrador y opcionalmente a una caja diaria.
CREATE TABLE ventas (
  id_venta BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_finca BIGINT UNSIGNED NOT NULL,
  id_cliente BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_caja BIGINT UNSIGNED NULL,
  fecha_venta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado_pago ENUM('pagado', 'pendiente', 'anulado') NOT NULL DEFAULT 'pagado',
  comprobante VARCHAR(80) NULL,
  total DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT ck_venta_total CHECK (total >= 0),
  CONSTRAINT fk_venta_finca FOREIGN KEY (id_finca) REFERENCES fincas(id_finca),
  CONSTRAINT fk_venta_cliente FOREIGN KEY (id_cliente) REFERENCES clientes_compradores(id_cliente),
  CONSTRAINT fk_venta_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_venta_caja FOREIGN KEY (id_caja) REFERENCES cajas_diarias(id_caja)
) ENGINE=InnoDB;

-- Tabla `detalle_ventas`: ítems o líneas de cada venta con relación al
-- inventario descontado, cantidad vendida, precio unitario y subtotal.
CREATE TABLE detalle_ventas (
  id_detalle BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_venta BIGINT UNSIGNED NOT NULL,
  id_inventario BIGINT UNSIGNED NOT NULL,
  cantidad_kg DECIMAL(12,2) NOT NULL,
  precio_unitario_kg DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL,
  CONSTRAINT ck_detalle_venta CHECK (cantidad_kg > 0 AND precio_unitario_kg >= 0 AND subtotal >= 0),
  CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_inventario FOREIGN KEY (id_inventario) REFERENCES inventarios(id_inventario)
) ENGINE=InnoDB;

-- Tabla `movimientos_caja`: ingresos y egresos registrados en cada caja diaria,
-- con vínculo opcional a la venta que originó el movimiento.
CREATE TABLE movimientos_caja (
  id_movimiento BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_caja BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_venta BIGINT UNSIGNED NULL,
  tipo ENUM('ingreso', 'egreso') NOT NULL,
  categoria VARCHAR(80) NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  monto DECIMAL(14,2) NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_movimiento_caja CHECK (monto > 0),
  CONSTRAINT fk_movimiento_caja FOREIGN KEY (id_caja) REFERENCES cajas_diarias(id_caja),
  CONSTRAINT fk_movimiento_caja_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_movimiento_caja_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta)
) ENGINE=InnoDB;

-- ============================================================================
-- 6. ESTADO PERSISTENTE DE LA APLICACIÓN
-- ============================================================================

-- Tabla `estado_aplicacion`: almacenamiento clave-valor en formato JSON para
-- persistir configuraciones o estado del espacio de trabajo en el frontend.
CREATE TABLE estado_aplicacion (
  clave VARCHAR(64) PRIMARY KEY,
  payload JSON NOT NULL,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 7. ÍNDICES DE RENDIMIENTO
-- ============================================================================

-- Acelera consultas de lotes por finca, recolecciones por fecha, inventarios
-- por finca, ventas por finca/fecha y movimientos de caja por caja/fecha.
CREATE INDEX idx_zonas_finca ON zonas_cultivo(id_finca);
CREATE INDEX idx_recolecciones_fecha ON recolecciones(fecha_recoleccion);
CREATE INDEX idx_inventario_finca ON inventarios(id_finca);
CREATE INDEX idx_ventas_finca_fecha ON ventas(id_finca, fecha_venta);
CREATE INDEX idx_movimientos_caja_fecha ON movimientos_caja(id_caja, fecha);
