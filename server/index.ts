/**
 * Servidor API REST de AppCacao (Express + MySQL + JWT).
 *
 * Responsabilidades principales:
 * - Cargar variables de entorno desde `.env` y validar la configuración obligatoria.
 * - Configurar el pool de conexiones MySQL, Express y CORS.
 * - Proveer autenticación con JWT, control de rol administrador y validación de
 *   acceso por finca (`usuario_finca`).
 * - Exponer los endpoints CRUD/transaccionales para usuarios, fincas, zonas de
 *   cultivo, recolecciones, inventario, clientes compradores, ventas, caja diaria
 *   y estado persistente del espacio de trabajo.
 * - Inicializar tablas/columnas auxiliares y el usuario administrador por defecto
 *   al arrancar el servidor.
 */
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';

// -----------------------------------------------------------------------------
// Carga manual de variables de entorno desde el archivo `.env` en la raíz
// -----------------------------------------------------------------------------
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

// Validación de variables obligatorias antes de crear el pool de base de datos
const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET'] as const;
for (const key of required) if (!process.env[key]) throw new Error(`Falta ${key} en .env`);

// -----------------------------------------------------------------------------
// Configuración del pool de conexiones MySQL y la aplicación Express
// -----------------------------------------------------------------------------
const pool = mysql.createPool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD, waitForConnections: true, connectionLimit: 10 });
const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------------------------------------------------------
// Autenticación (JWT) y middlewares de autorización
// -----------------------------------------------------------------------------

/** Extensión de Request de Express que incluye la identidad del usuario autenticado. */
type AuthRequest = Request & { user?: { id: number; rol: string } };

/** Firma un token JWT con el identificador y rol del usuario (vigencia de 8 horas). */
const sign = (id: number, rol: string) => jwt.sign({ id, rol }, process.env.JWT_SECRET!, { expiresIn: '8h' });

/**
 * Middleware de autenticación: verifica el encabezado `Authorization: Bearer <token>`,
 * decodifica el JWT y adjunta `req.user`. Responde 401 si falta o es inválido.
 */
const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Sesión requerida.' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; rol: string }; next(); }
  catch { return res.status(401).json({ message: 'Sesión inválida.' }); }
};

/** Middleware de autorización: restringe el acceso exclusivamente al rol `admin` (403 en caso contrario). */
const admin = (req: AuthRequest, res: Response, next: NextFunction) => req.user?.rol === 'admin' ? next() : res.status(403).json({ message: 'Acceso exclusivo de administrador.' });

/**
 * Verifica si el usuario autenticado puede acceder a una finca determinada.
 * Los administradores tienen acceso total; el resto debe estar vinculado en `usuario_finca`.
 */
const canAccessFinca = async (req: AuthRequest, fincaId: number) => {
  if (req.user?.rol === 'admin') return true;
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM usuario_finca WHERE id_usuario=? AND id_finca=? LIMIT 1',
    [req.user!.id, fincaId]
  );
  return rows.length > 0;
};

// -----------------------------------------------------------------------------
// Funciones auxiliares de preparación y mantenimiento de esquema al iniciar
// -----------------------------------------------------------------------------

/** Garantiza que exista la tabla `estado_aplicacion` para persistir el estado JSON del workspace. */
const ensureWorkspaceStateTable = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS estado_aplicacion (
      clave VARCHAR(64) PRIMARY KEY,
      payload JSON NOT NULL,
      actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
};

/** Elimina la clave heredada global `workspace_state` (ahora se almacena por usuario). */
const cleanupLegacyWorkspaceState = async () => {
  await pool.execute('DELETE FROM estado_aplicacion WHERE clave = ?', ['workspace_state']);
};

/** Asegura que `clientes_compradores` tenga la columna `id_usuario_registra` para aislar compradores por usuario. */
/** Asegura que `recolecciones` tenga la columna `kilos_mal_estado` para controlar merma/mal estado. */
const ensureRecoleccionMalEstadoColumn = async () => {
  const [columns] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recolecciones'
       AND COLUMN_NAME = 'kilos_mal_estado' LIMIT 1`
  );
  if (columns.length === 0) {
    await pool.execute(
      'ALTER TABLE recolecciones ADD COLUMN kilos_mal_estado DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER kilos_seco_obtenidos'
    );
  }
};

const ensureBuyerOwnershipColumn = async () => {
  const [columns] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes_compradores'
       AND COLUMN_NAME = 'id_usuario_registra' LIMIT 1`
  );
  if (columns.length === 0) {
    await pool.execute(
      'ALTER TABLE clientes_compradores ADD COLUMN id_usuario_registra BIGINT UNSIGNED NULL AFTER municipio'
    );
  }
};

// -----------------------------------------------------------------------------
// Endpoints de salud y autenticación
// -----------------------------------------------------------------------------

/**
 * GET /api/health
 * Comprueba la conectividad con la base de datos ejecutando `SELECT 1`.
 */
app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, database: 'connected' }); }
  catch { res.status(503).json({ ok: false, database: 'unavailable' }); }
});

/**
 * POST /api/auth/register
 * Registra un nuevo productor junto con su primera finca y su relación en `usuario_finca`
 * dentro de una transacción atómica. Valida campos obligatorios, longitud mínima de
 * contraseña (4 caracteres) y controla cédulas duplicadas (HTTP 409).
 */
app.post('/api/auth/register', async (req, res) => {
  const { cedula, nombreCompleto, telefono, password, nombreFinca, municipio = 'Por completar' } = req.body;
  if (![cedula, nombreCompleto, password, nombreFinca].every((value: unknown) => typeof value === 'string' && value.trim()) || password.length < 4) return res.status(400).json({ message: 'Completa los datos requeridos. La contraseña debe tener mínimo 4 caracteres.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const hash = await bcrypt.hash(password, 12);
    const [userResult] = await connection.execute<mysql.ResultSetHeader>('INSERT INTO usuarios (cedula,nombre_completo,telefono,password_hash,rol) VALUES (?,?,?,?,\'productor\')', [cedula.trim(), nombreCompleto.trim(), telefono?.trim() || null, hash]);
    const [farmResult] = await connection.execute<mysql.ResultSetHeader>('INSERT INTO fincas (nombre,propietario,municipio,hectareas_total,hectareas_cacao) VALUES (?,?,?,0,0)', [nombreFinca.trim(), nombreCompleto.trim(), municipio.trim()]);
    await connection.execute('INSERT INTO usuario_finca (id_usuario,id_finca,rol_en_finca) VALUES (?,?,\'propietario\')', [userResult.insertId, farmResult.insertId]);
    await connection.commit();
    res.status(201).json({ token: sign(userResult.insertId, 'productor'), user: { id: userResult.insertId, rol: 'productor', nombreCompleto, fincaId: farmResult.insertId, fincaNombre: nombreFinca.trim() } });
  } catch (error: unknown) {
    await connection.rollback();
    const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : '';
    res.status(code === 'ER_DUP_ENTRY' ? 409 : 500).json({ message: code === 'ER_DUP_ENTRY' ? 'La cédula ya está registrada.' : 'No fue posible crear la cuenta.' });
  }
  finally { connection.release(); }
});

/**
 * POST /api/auth/login
 * Autentica un usuario activo mediante cédula y contraseña (bcrypt) y devuelve
 * el token JWT junto con sus datos básicos y su finca asociada.
 */
app.post('/api/auth/login', async (req, res) => {
  const { cedula, password } = req.body;
  const [rows] = await pool.execute<(RowDataPacket & { id_usuario: number; password_hash: string; rol: string; nombre_completo: string; id_finca: number | null; finca_nombre: string | null })[]>('SELECT u.id_usuario,u.password_hash,u.rol,u.nombre_completo,uf.id_finca,f.nombre AS finca_nombre FROM usuarios u LEFT JOIN usuario_finca uf ON uf.id_usuario=u.id_usuario LEFT JOIN fincas f ON f.id_finca=uf.id_finca WHERE u.cedula=? AND u.activo=1 LIMIT 1', [cedula]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password || '', user.password_hash))) return res.status(401).json({ message: 'Cédula o contraseña incorrecta.' });
  res.json({ token: sign(user.id_usuario, user.rol), user: { id: user.id_usuario, rol: user.rol, nombreCompleto: user.nombre_completo, fincaId: user.id_finca, fincaNombre: user.finca_nombre } });
});

// -----------------------------------------------------------------------------
// Endpoints administrativos de gestión de usuarios/clientes del sistema
// -----------------------------------------------------------------------------

/**
 * POST /api/clientes/:id/password
 * Permite únicamente al administrador restablecer la contraseña de un usuario no admin.
 * Valida ID numérico entero positivo y longitud mínima de contraseña (4 caracteres).
 */
app.post('/api/clientes/:id/password', auth, admin, async (req, res) => {
  const userId = Number(req.params.id);
  const { password } = req.body;
  if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ message: 'Usuario inválido.' });
  if (typeof password !== 'string' || password.trim().length < 4) return res.status(400).json({ message: 'La contraseña debe tener mínimo 4 caracteres.' });

  const [result] = await pool.execute<mysql.ResultSetHeader>('UPDATE usuarios SET password_hash=? WHERE id_usuario=? AND rol <> \'admin\'', [await bcrypt.hash(password.trim(), 12), userId]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });
  res.json({ ok: true });
});

/**
 * GET /api/clientes
 * Lista todos los usuarios productores/no administradores junto con su finca asociada
 * (acceso exclusivo de administrador).
 */
app.get('/api/clientes', auth, admin, async (_req, res) => {
  const [rows] = await pool.query('SELECT u.id_usuario,u.cedula,u.nombre_completo,u.telefono,f.id_finca,f.nombre AS finca FROM usuarios u LEFT JOIN usuario_finca uf ON uf.id_usuario=u.id_usuario LEFT JOIN fincas f ON f.id_finca=uf.id_finca WHERE u.rol <> \'admin\' ORDER BY u.nombre_completo');
  res.json(rows);
});

// -----------------------------------------------------------------------------
// Endpoints de fincas (CRUD con control de acceso por usuario y borrado lógico)
// -----------------------------------------------------------------------------

/**
 * GET /api/fincas
 * Lista las fincas activas visibles para el usuario autenticado
 * (todas si es `admin`; solo las vinculadas en `usuario_finca` si es productor).
 */
app.get('/api/fincas', auth, async (req: AuthRequest, res) => {
  const query = req.user!.rol === 'admin'
    ? 'SELECT f.* FROM fincas f WHERE f.activa = 1 ORDER BY f.id_finca'
    : `SELECT f.*
       FROM fincas f
       INNER JOIN usuario_finca uf ON uf.id_finca = f.id_finca
       WHERE uf.id_usuario = ? AND f.activa = 1
       ORDER BY f.id_finca`;
  const [rows] = req.user!.rol === 'admin'
    ? await pool.query(query)
    : await pool.execute(query, [req.user!.id]);
  res.json(rows);
});

/**
 * POST /api/fincas
 * Crea una nueva finca y la asocia al usuario autenticado como `propietario`
 * en una transacción. Valida campos obligatorios y que las hectáreas de cacao
 * no superen las hectáreas totales.
 */
app.post('/api/fincas', auth, async (req: AuthRequest, res) => {
  const body = req.body?.finca && typeof req.body.finca === 'object' ? req.body.finca : req.body;
  console.log('[POST /api/fincas] body recibido:', JSON.stringify(body));
  const {
    nombre = body?.nombreFinca ?? body?.name,
    propietario = body?.owner,
    vereda = body?.veredaNombre,
    municipio = body?.municipioNombre,
    hectareasTotal = 0, hectareasCacao = 0,
    codigoPredial, imagen, tecnificada = false, nivelTecnificacion
  } = body || {};
  const nombreNormalizado = String(nombre ?? '').trim();
  let propietarioNormalizado = String(propietario ?? '').trim();
  if (!propietarioNormalizado) {
    const [ownerRows] = await pool.execute<RowDataPacket[]>('SELECT nombre_completo FROM usuarios WHERE id_usuario = ? LIMIT 1', [req.user!.id]);
    propietarioNormalizado = String(ownerRows[0]?.nombre_completo ?? '').trim();
  }
  const veredaNormalizada = String(vereda ?? '').trim();
  const municipioNormalizado = String(municipio ?? '').trim();
  if (!nombreNormalizado) return res.status(400).json({ message: 'El nombre de la finca es obligatorio.' });
  if (!propietarioNormalizado) return res.status(400).json({ message: 'El propietario de la finca es obligatorio.' });
  if (!municipioNormalizado) return res.status(400).json({ message: 'El municipio de la finca es obligatorio.' });
  if (!veredaNormalizada) return res.status(400).json({ message: 'La vereda de la finca es obligatoria.' });
  if (!Number.isFinite(Number(hectareasTotal)) || !Number.isFinite(Number(hectareasCacao)) || Number(hectareasCacao) > Number(hectareasTotal)) {
    return res.status(400).json({ message: 'Las hectáreas de cacao no pueden superar las hectáreas totales.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO fincas
       (nombre, propietario, vereda, municipio, hectareas_total, hectareas_cacao, codigo_predial, imagen, tecnificada, nivel_tecnificacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombreNormalizado, propietarioNormalizado, veredaNormalizada, municipioNormalizado, Number(hectareasTotal), Number(hectareasCacao), codigoPredial || null, imagen || null, Boolean(tecnificada), nivelTecnificacion || null]
    );
    await connection.execute(
      'INSERT INTO usuario_finca (id_usuario, id_finca, rol_en_finca) VALUES (?, ?, ?)',
      [req.user!.id, result.insertId, 'propietario']
    );
    await connection.commit();
    const [rows] = await connection.execute('SELECT * FROM fincas WHERE id_finca = ?', [result.insertId]);
    res.status(201).json((rows as unknown[])[0]);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * PUT /api/fincas/:id
 * Actualiza los datos de una finca existente preservando campos textuales si
 * llegan vacíos. Valida ID, consistencia de hectáreas y permisos con `canAccessFinca`.
 */
app.put('/api/fincas/:id', auth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const body = req.body?.finca && typeof req.body.finca === 'object' ? req.body.finca : req.body;
  const { nombre = body?.nombreFinca ?? body?.name, propietario = body?.owner, vereda = body?.veredaNombre, municipio = body?.municipioNombre, hectareasTotal = 0, hectareasCacao = 0, codigoPredial, imagen, tecnificada = false, nivelTecnificacion } = body || {};
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Finca inválida.' });
  const [existingRows] = await pool.execute<RowDataPacket[]>('SELECT nombre, propietario, vereda, municipio FROM fincas WHERE id_finca = ?', [id]);
  const existente = existingRows[0];
  if (!existente) return res.status(404).json({ message: 'Finca no encontrada.' });
  const nombreNormalizado = String(nombre ?? '').trim() || String(existente.nombre ?? '').trim();
  const propietarioNormalizado = String(propietario ?? '').trim() || String(existente.propietario ?? '').trim();
  const veredaNormalizada = String(vereda ?? '').trim() || String(existente.vereda ?? '').trim();
  const municipioNormalizado = String(municipio ?? '').trim() || String(existente.municipio ?? '').trim();
  if (!Number.isFinite(Number(hectareasTotal)) || !Number.isFinite(Number(hectareasCacao)) || Number(hectareasCacao) > Number(hectareasTotal)) {
    return res.status(400).json({ message: 'Las hectáreas de cacao no pueden superar las hectáreas totales.' });
  }
  if (!(await canAccessFinca(req, id))) {
    return res.status(404).json({ message: 'Finca no encontrada.' });
  }
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `UPDATE fincas
     SET nombre=?, propietario=?, vereda=?, municipio=?, hectareas_total=?, hectareas_cacao=?,
         codigo_predial=?, imagen=?, tecnificada=?, nivel_tecnificacion=?
     WHERE id_finca=?`,
    [nombreNormalizado, propietarioNormalizado, veredaNormalizada, municipioNormalizado, Number(hectareasTotal), Number(hectareasCacao), codigoPredial || null, imagen || null, Boolean(tecnificada), nivelTecnificacion || null, id]
  );
  if (result.affectedRows === 0) {
    const [existingAfterUpdate] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM fincas WHERE id_finca = ?',
      [id]
    );
    if (existingAfterUpdate.length === 0) return res.status(404).json({ message: 'Finca no encontrada.' });
  }
  const [rows] = await pool.execute('SELECT * FROM fincas WHERE id_finca = ?', [id]);
  res.json((rows as unknown[])[0]);
});

/**
 * DELETE /api/fincas/:id
 * Desactiva lógicamente una finca (`activa = 0`) respetando el alcance del usuario.
 */
app.delete('/api/fincas/:id', auth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Finca inválida.' });
  const scope = req.user!.rol === 'admin' ? 'id_finca = ?' : 'id_finca = ? AND id_finca IN (SELECT id_finca FROM usuario_finca WHERE id_usuario = ?)';
  const params = req.user!.rol === 'admin' ? [id] : [id, req.user!.id];
  const [result] = await pool.execute<mysql.ResultSetHeader>(`UPDATE fincas SET activa = 0 WHERE ${scope}`, params);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Finca no encontrada.' });
  res.status(204).send();
});

// -----------------------------------------------------------------------------
// Endpoints de zonas de cultivo / lotes
// -----------------------------------------------------------------------------

/**
 * GET /api/zonas
 * Lista las zonas de cultivo activas (con filtro opcional `?fincaId=`),
 * restringiendo los resultados a las fincas permitidas para el usuario.
 */
app.get('/api/zonas', auth, async (req: AuthRequest, res) => {
  const fincaId = req.query.fincaId ? Number(req.query.fincaId) : null;
  if (fincaId !== null && (!Number.isInteger(fincaId) || fincaId <= 0)) {
    return res.status(400).json({ message: 'Finca inválida.' });
  }
  let sql: string;
  let params: (string | number)[];
  if (req.user!.rol === 'admin') {
    sql = fincaId
      ? 'SELECT * FROM zonas_cultivo WHERE activa = 1 AND id_finca = ? ORDER BY nombre_zona'
      : 'SELECT * FROM zonas_cultivo WHERE activa = 1 ORDER BY id_finca,nombre_zona';
    params = fincaId ? [fincaId] : [];
  } else {
    sql = fincaId
      ? `SELECT z.* FROM zonas_cultivo z INNER JOIN usuario_finca uf ON uf.id_finca=z.id_finca
         WHERE z.activa=1 AND z.id_finca=? AND uf.id_usuario=? ORDER BY z.nombre_zona`
      : `SELECT z.* FROM zonas_cultivo z INNER JOIN usuario_finca uf ON uf.id_finca=z.id_finca
         WHERE z.activa=1 AND uf.id_usuario=? ORDER BY z.id_finca,z.nombre_zona`;
    params = fincaId ? [fincaId, req.user!.id] : [req.user!.id];
  }
  const [rows] = await pool.execute(sql, params);
  res.json(rows);
});

/**
 * POST /api/zonas
 * Registra un nuevo lote en `zonas_cultivo` tras validar campos requeridos
 * y permisos de acceso a la finca indicada.
 */
app.post('/api/zonas', auth, async (req: AuthRequest, res) => {
  const { fincaId, nombreZona, variedadCacao, arbolesEstimados = 0, hectareas = 0, anoSiembra } = req.body;
  if (![nombreZona, variedadCacao].every((value: unknown) => typeof value === 'string' && value.trim()) || !Number.isInteger(Number(fincaId))) {
    return res.status(400).json({ message: 'Completa los datos del lote.' });
  }
  if (!(await canAccessFinca(req, Number(fincaId)))) {
    return res.status(403).json({ message: 'No tienes acceso a esta finca.' });
  }
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    'INSERT INTO zonas_cultivo (id_finca,nombre_zona,variedad_cacao,arboles_estimados,hectareas,ano_siembra) VALUES (?,?,?,?,?,?)',
    [Number(fincaId), nombreZona.trim(), variedadCacao.trim(), Number(arbolesEstimados), Number(hectareas), anoSiembra || null]
  );
  const [rows] = await pool.execute('SELECT * FROM zonas_cultivo WHERE id_zona=?', [result.insertId]);
  res.status(201).json((rows as RowDataPacket[])[0]);
});

/**
 * PUT /api/zonas/:id
 * Actualiza los datos de un lote verificando previamente su existencia y propiedad.
 */
app.put('/api/zonas/:id', auth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { nombreZona, variedadCacao, arbolesEstimados = 0, hectareas = 0, anoSiembra } = req.body;
  const [owned] = await pool.execute<RowDataPacket[]>(
    req.user!.rol === 'admin'
      ? 'SELECT id_finca FROM zonas_cultivo WHERE id_zona=? LIMIT 1'
      : `SELECT z.id_finca FROM zonas_cultivo z INNER JOIN usuario_finca uf ON uf.id_finca=z.id_finca
         WHERE z.id_zona=? AND uf.id_usuario=? LIMIT 1`,
    req.user!.rol === 'admin' ? [id] : [id, req.user!.id]
  );
  if (owned.length === 0) return res.status(404).json({ message: 'Lote no encontrado.' });
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    'UPDATE zonas_cultivo SET nombre_zona=?,variedad_cacao=?,arboles_estimados=?,hectareas=?,ano_siembra=? WHERE id_zona=?',
    [nombreZona.trim(), variedadCacao.trim(), Number(arbolesEstimados), Number(hectareas), anoSiembra || null, id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Lote no encontrado.' });
  const [rows] = await pool.execute('SELECT * FROM zonas_cultivo WHERE id_zona=?', [id]);
  res.json((rows as RowDataPacket[])[0]);
});

/**
 * DELETE /api/zonas/:id
 * Desactiva lógicamente un lote (`activa = 0`) si pertenece a una finca accesible.
 */
app.delete('/api/zonas/:id', auth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const [owned] = await pool.execute<RowDataPacket[]>(
    req.user!.rol === 'admin'
      ? 'SELECT id_finca FROM zonas_cultivo WHERE id_zona=? LIMIT 1'
      : `SELECT z.id_finca FROM zonas_cultivo z INNER JOIN usuario_finca uf ON uf.id_finca=z.id_finca
         WHERE z.id_zona=? AND uf.id_usuario=? LIMIT 1`,
    req.user!.rol === 'admin' ? [id] : [id, req.user!.id]
  );
  if (owned.length === 0) return res.status(404).json({ message: 'Lote no encontrado.' });
  const [result] = await pool.execute<mysql.ResultSetHeader>('UPDATE zonas_cultivo SET activa=0 WHERE id_zona=?', [id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Lote no encontrado.' });
  res.status(204).send();
});

// -----------------------------------------------------------------------------
// Endpoints de recolecciones / cosechas
// -----------------------------------------------------------------------------

/**
 * GET /api/recolecciones
 * Lista el historial de recolecciones ordenado por fecha descendente, con filtro
 * opcional `?fincaId=` y alcance según el rol del usuario.
 */
app.get('/api/recolecciones', auth, async (req: AuthRequest, res) => {
  const fincaId = req.query.fincaId ? Number(req.query.fincaId) : null;
  let sql: string;
  let params: (string | number)[];
  if (req.user!.rol === 'admin') {
    sql = fincaId
      ? 'SELECT * FROM recolecciones WHERE id_finca=? ORDER BY fecha_recoleccion DESC,id_recoleccion DESC'
      : 'SELECT * FROM recolecciones ORDER BY fecha_recoleccion DESC,id_recoleccion DESC';
    params = fincaId ? [fincaId] : [];
  } else {
    sql = fincaId
      ? `SELECT r.* FROM recolecciones r INNER JOIN usuario_finca uf ON uf.id_finca=r.id_finca
         WHERE r.id_finca=? AND uf.id_usuario=? ORDER BY r.fecha_recoleccion DESC,r.id_recoleccion DESC`
      : `SELECT r.* FROM recolecciones r INNER JOIN usuario_finca uf ON uf.id_finca=r.id_finca
         WHERE uf.id_usuario=? ORDER BY r.fecha_recoleccion DESC,r.id_recoleccion DESC`;
    params = fincaId ? [fincaId, req.user!.id] : [req.user!.id];
  }
  const [rows] = await pool.execute(sql, params);
  res.json(rows);
});

/**
 * POST /api/recolecciones
 * Registra una nueva recolección de cacao en baba. Valida finca, kilos > 0 y
 * acceso a la finca; si no se envía rendimiento estimado seco, calcula el 38%.
 */
app.post('/api/recolecciones', auth, async (req: AuthRequest, res) => {
  const body = req.body;
  const kilosBaba = Number(body.kilosBaba);
  if (!Number.isInteger(Number(body.fincaId)) || kilosBaba <= 0) {
    return res.status(400).json({ message: 'Finca y kilos válidos son obligatorios.' });
  }
  if (!(await canAccessFinca(req, Number(body.fincaId)))) {
    return res.status(403).json({ message: 'No tienes acceso a esta finca.' });
  }
  const [fincaRows] = await pool.execute<RowDataPacket[]>(
    'SELECT nombre, propietario, municipio, vereda, hectareas_total, hectareas_cacao FROM fincas WHERE id_finca = ? AND activa = 1 LIMIT 1',
    [Number(body.fincaId)]
  );
  const finca = fincaRows[0];
  const isFilled = (v: unknown) => {
    const t = String(v ?? '').trim().toLowerCase();
    return Boolean(t) && t !== 'por completar' && t !== 'sin propietario';
  };
  if (
    !finca || !isFilled(finca.nombre) || !isFilled(finca.propietario) ||
    !isFilled(finca.municipio) || !isFilled(finca.vereda) ||
    Number(finca.hectareas_total) <= 0 || Number(finca.hectareas_cacao) <= 0
  ) {
    return res.status(400).json({ message: 'Debes completar todos los datos de la finca (propietario, municipio, vereda y hectáreas) antes de registrar una cosecha.' });
  }
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO recolecciones
     (id_finca,id_zona,id_usuario_registra,fecha_recoleccion,kilos_baba,rendimiento_estimado_seco,kilos_seco_obtenidos,kilos_mal_estado,estado_proceso,tecnificada,jornales_utilizados,responsable,notas)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [Number(body.fincaId), body.zonaId ? Number(body.zonaId) : null, req.user!.id, body.fecha || new Date().toISOString().slice(0,10),
     kilosBaba, Number(body.rendimientoEstimadoSeco ?? kilosBaba), Number(body.kilosSecoObtenidos ?? kilosBaba), Math.max(0, Number(body.kilosMalEstado || 0)),
     body.estadoProceso || 'baba', body.tecnificada ? 1 : 0, Number(body.jornalesUtilizados || 0),
     body.responsable || 'Propietario', body.notas || null]
  );
  const kilosListos = Number(body.kilosSecoObtenidos ?? kilosBaba);
  const kilosMalEstado = Math.max(0, Number(body.kilosMalEstado || 0));
  if (kilosListos > 0) {
    await pool.execute(
      `INSERT INTO inventarios
       (id_finca,codigo_tipo_producto,nombre_producto,estado_calidad,cantidad_recolectada_kg,cantidad_vendida_kg,cantidad_kg,precio_ref_kg,ubicacion_bodega)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE cantidad_recolectada_kg=cantidad_recolectada_kg+VALUES(cantidad_recolectada_kg), cantidad_kg=cantidad_kg+VALUES(cantidad_kg)`,
      [Number(body.fincaId), 'cacao_seco_premium', 'Cacao Seco Listo para Venta', 'buen_estado', kilosListos, 0, kilosListos, 0, 'Bodega principal']
    );
  }
  if (kilosMalEstado > 0) {
    await pool.execute(
      `INSERT INTO inventarios
       (id_finca,codigo_tipo_producto,nombre_producto,estado_calidad,cantidad_recolectada_kg,cantidad_vendida_kg,cantidad_kg,precio_ref_kg,ubicacion_bodega)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE cantidad_recolectada_kg=cantidad_recolectada_kg+VALUES(cantidad_recolectada_kg), cantidad_kg=cantidad_kg+VALUES(cantidad_kg)`,
      [Number(body.fincaId), 'cacao_seco_corriente', 'Cacao en Mal Estado', 'mal_estado', kilosMalEstado, 0, kilosMalEstado, 0, 'Bodega principal']
    );
  }
  const [rows] = await pool.execute('SELECT * FROM recolecciones WHERE id_recoleccion=?', [result.insertId]);
  res.status(201).json((rows as RowDataPacket[])[0]);
});

/**
 * PUT /api/recolecciones/:id
 * Actualiza los datos y el estado de proceso de una recolección existente
 * perteneciente a una finca accesible para el usuario.
 */
app.put('/api/recolecciones/:id', auth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const body = req.body;
  const [owned] = await pool.execute<RowDataPacket[]>(
    req.user!.rol === 'admin'
      ? 'SELECT id_finca FROM recolecciones WHERE id_recoleccion=? LIMIT 1'
      : `SELECT r.id_finca FROM recolecciones r INNER JOIN usuario_finca uf ON uf.id_finca=r.id_finca
         WHERE r.id_recoleccion=? AND uf.id_usuario=? LIMIT 1`,
    req.user!.rol === 'admin' ? [id] : [id, req.user!.id]
  );
  if (owned.length === 0) return res.status(404).json({ message: 'Cosecha no encontrada.' });
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `UPDATE recolecciones SET kilos_baba=?,rendimiento_estimado_seco=?,kilos_seco_obtenidos=?,kilos_mal_estado=?,estado_proceso=?,tecnificada=?,jornales_utilizados=?,responsable=?,notas=? WHERE id_recoleccion=?`,
    [Number(body.kilosBaba), Number(body.rendimientoEstimadoSeco || 0), body.kilosSecoObtenidos ?? null, Math.max(0, Number(body.kilosMalEstado || 0)),
     body.estadoProceso || 'baba', body.tecnificada ? 1 : 0, Number(body.jornalesUtilizados || 0),
     body.responsable || 'Propietario', body.notas || null, id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Cosecha no encontrada.' });
  const [rows] = await pool.execute('SELECT * FROM recolecciones WHERE id_recoleccion=?', [id]);
  res.json((rows as RowDataPacket[])[0]);
});

// -----------------------------------------------------------------------------
// Endpoints de inventario
// -----------------------------------------------------------------------------

/**
 * GET /api/inventario
 * Lista las existencias de inventario ordenadas por última actualización,
 * filtradas por las fincas asignadas al usuario (o todas si es `admin`).
 */
app.get('/api/inventario', auth, async (req: AuthRequest, res) => {
  const [rows] = req.user!.rol === 'admin'
    ? await pool.query('SELECT * FROM inventarios ORDER BY fecha_ultima_actualizacion DESC')
    : await pool.execute(
        `SELECT i.* FROM inventarios i INNER JOIN usuario_finca uf ON uf.id_finca=i.id_finca
         WHERE uf.id_usuario=? ORDER BY i.fecha_ultima_actualizacion DESC`,
        [req.user!.id]
      );
  res.json(rows);
});

/**
 * POST /api/inventario
 * Registra o acumula inventario (`INSERT ... ON DUPLICATE KEY UPDATE`) por finca,
 * tipo de producto, estado de calidad y ubicación de bodega, validando acceso a la finca.
 */
app.post('/api/inventario', auth, async (req: AuthRequest, res) => {
  const body = req.body;
  if (!(await canAccessFinca(req, Number(body.fincaId)))) {
    return res.status(403).json({ message: 'No tienes acceso a esta finca.' });
  }
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO inventarios
     (id_finca,codigo_tipo_producto,nombre_producto,estado_calidad,cantidad_recolectada_kg,cantidad_vendida_kg,cantidad_kg,precio_ref_kg,ubicacion_bodega)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE nombre_producto=VALUES(nombre_producto),cantidad_recolectada_kg=cantidad_recolectada_kg+VALUES(cantidad_recolectada_kg),
       cantidad_kg=cantidad_kg+VALUES(cantidad_kg),precio_ref_kg=VALUES(precio_ref_kg)`,
    [Number(body.fincaId), body.tipoProducto, body.nombreProducto, body.estadoCalidad || 'buen_estado',
     Number(body.cantidadRecolectadaKg || body.cantidadKg || 0), 0, Number(body.cantidadKg || 0),
     Number(body.precioRefKg || 0), body.ubicacionBodega || 'Bodega principal']
  );
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM inventarios WHERE id_finca=? AND codigo_tipo_producto=? AND estado_calidad=? AND ubicacion_bodega=?',
    [Number(body.fincaId), body.tipoProducto, body.estadoCalidad || 'buen_estado', body.ubicacionBodega || 'Bodega principal']
  );
  res.status(201).json(rows[0]);
});

/**
 * PUT /api/inventario/:id
 * Actualiza cantidad disponible, precio de referencia, nombre y ubicación de un
 * registro de inventario perteneciente a una finca accesible por el usuario.
 */
app.put('/api/inventario/:id', auth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const body = req.body;
  const [owned] = await pool.execute<RowDataPacket[]>(
    req.user!.rol === 'admin'
      ? 'SELECT id_finca FROM inventarios WHERE id_inventario=? LIMIT 1'
      : `SELECT i.id_finca FROM inventarios i INNER JOIN usuario_finca uf ON uf.id_finca=i.id_finca
         WHERE i.id_inventario=? AND uf.id_usuario=? LIMIT 1`,
    req.user!.rol === 'admin' ? [id] : [id, req.user!.id]
  );
  if (owned.length === 0) return res.status(404).json({ message: 'Inventario no encontrado.' });
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    'UPDATE inventarios SET cantidad_kg=?,precio_ref_kg=?,nombre_producto=?,ubicacion_bodega=? WHERE id_inventario=?',
    [Number(body.cantidadKg), Number(body.precioRefKg || 0), body.nombreProducto, body.ubicacionBodega || 'Bodega principal', id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Inventario no encontrado.' });
  const [rows] = await pool.execute('SELECT * FROM inventarios WHERE id_inventario=?', [id]);
  res.json((rows as RowDataPacket[])[0]);
});

// -----------------------------------------------------------------------------
// Endpoints de clientes compradores
// -----------------------------------------------------------------------------

/**
 * GET /api/clientes-compradores
 * Lista los compradores registrados por el usuario actual (o todos si es `admin`).
 */
app.get('/api/clientes-compradores', auth, async (req: AuthRequest, res) => {
  const [rows] = req.user!.rol === 'admin'
    ? await pool.query('SELECT * FROM clientes_compradores ORDER BY nombre')
    : await pool.execute('SELECT * FROM clientes_compradores WHERE id_usuario_registra=? ORDER BY nombre', [req.user!.id]);
  res.json(rows);
});

/**
 * POST /api/clientes-compradores
 * Registra un nuevo cliente comprador asociado al usuario autenticado.
 * Valida nombre obligatorio y genera un documento temporal si no se suministra.
 */
app.post('/api/clientes-compradores', auth, async (req: AuthRequest, res) => {
  const { documento, nombre, telefono, tipoCliente = 'particular', municipio } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre del cliente es obligatorio.' });
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    'INSERT INTO clientes_compradores (documento,nombre,telefono,tipo_cliente,municipio,id_usuario_registra) VALUES (?,?,?,?,?,?)',
    [documento?.trim() || `CLI-${Date.now()}`, nombre.trim(), telefono?.trim() || null, tipoCliente, municipio?.trim() || null, req.user!.id]
  );
  const [rows] = await pool.execute('SELECT * FROM clientes_compradores WHERE id_cliente=?', [result.insertId]);
  res.status(201).json((rows as RowDataPacket[])[0]);
});

// -----------------------------------------------------------------------------
// Endpoints de ventas (con transacción de inventario, kardex y caja diaria)
// -----------------------------------------------------------------------------

/**
 * GET /api/ventas
 * Lista el historial de ventas ordenado por fecha descendente, filtrado según
 * las fincas a las que tiene acceso el usuario.
 */
app.get('/api/ventas', auth, async (req: AuthRequest, res) => {
  const [rows] = req.user!.rol === 'admin'
    ? await pool.query('SELECT * FROM ventas ORDER BY fecha_venta DESC,id_venta DESC')
    : await pool.execute(
        `SELECT v.* FROM ventas v INNER JOIN usuario_finca uf ON uf.id_finca=v.id_finca
         WHERE uf.id_usuario=? ORDER BY v.fecha_venta DESC,v.id_venta DESC`,
        [req.user!.id]
      );
  res.json(rows);
});

/**
 * POST /api/ventas
 * Registra una venta de cacao de forma transaccional:
 * 1. Valida finca, kilos > 0, precio >= 0 y permisos sobre la finca.
 * 2. Comprueba disponibilidad suficiente en `inventarios`.
 * 3. Inserta la venta, descuenta el stock y registra la salida en `movimientos_inventario`.
 * 4. Crea u obtiene la caja diaria de la fecha, la vincula a la venta y, si está pagada,
 *    registra el ingreso correspondiente en `movimientos_caja`.
 */
app.post('/api/ventas', auth, async (req: AuthRequest, res) => {
  const body = req.body;
  const kilos = Number(body.kilosVendidos);
  const precio = Number(body.precioPorKg);
  if (!Number.isInteger(Number(body.fincaId)) || kilos <= 0 || precio < 0) {
    return res.status(400).json({ message: 'Datos de venta inválidos.' });
  }
  if (!(await canAccessFinca(req, Number(body.fincaId)))) {
    return res.status(403).json({ message: 'No tienes acceso a esta finca.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const estadoCalidad = body.estadoCalidad === 'mal_estado' ? 'mal_estado' : 'buen_estado';
    const tipoProductoNormalizado =
      estadoCalidad === 'mal_estado'
        ? 'cacao_seco_corriente'
        : (body.tipoProducto || 'cacao_seco_premium');
    const [inventarioRows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM inventarios
       WHERE id_finca=? AND estado_calidad=?
       ORDER BY (codigo_tipo_producto = ?) DESC, cantidad_kg DESC
       LIMIT 1`,
      [Number(body.fincaId), estadoCalidad, tipoProductoNormalizado]
    );
    const inventario = inventarioRows[0];
    if (!inventario || Number(inventario.cantidad_kg) < kilos) {
      throw new Error('Inventario insuficiente para registrar la venta.');
    }
    const tipoProductoVenta = String(inventario.codigo_tipo_producto || tipoProductoNormalizado);
    let clienteId = body.clienteId ? Number(body.clienteId) : null;
    if (!Number.isInteger(clienteId)) clienteId = null;
    const comprobante = body.comprobanteNumero || `FAC-${Date.now()}`;
    const [ventaResult] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO ventas
       (id_finca,id_cliente,cliente_nombre_libre,cliente_documento_libre,id_usuario_registra,fecha_venta,codigo_tipo_producto,estado_calidad_vendido,kilos_vendidos,precio_por_kg,total_venta,metodo_pago,estado_pago,comprobante_numero,notas)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [Number(body.fincaId), clienteId, body.clienteNombre || 'Cliente', body.clienteDocumento || null, req.user!.id,
       body.fecha ? new Date(`${body.fecha}T12:00:00`) : new Date(), tipoProductoVenta,
       estadoCalidad, kilos, precio, kilos * precio, body.metodoPago || 'efectivo',
       body.pagado === false ? 'pendiente' : 'pagado', comprobante, body.notas || null]
    );
    await connection.execute(
      'UPDATE inventarios SET cantidad_kg=cantidad_kg-?,cantidad_vendida_kg=cantidad_vendida_kg+? WHERE id_inventario=?',
      [kilos, kilos, inventario.id_inventario]
    );
    await connection.execute(
      'INSERT INTO movimientos_inventario (id_inventario,id_usuario_registra,id_venta,tipo,cantidad_kg,observacion) VALUES (?,?,?,?,?,?)',
      [inventario.id_inventario, req.user!.id, ventaResult.insertId, 'salida_venta', -kilos, 'Venta registrada desde AppCacao']
    );
    await connection.execute(
      `INSERT INTO cajas_diarias (id_finca,fecha,saldo_inicial) VALUES (?,?,0)
       ON DUPLICATE KEY UPDATE saldo_inicial=saldo_inicial`,
      [Number(body.fincaId), body.fecha || new Date().toISOString().slice(0, 10)]
    );
    const [cajaRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id_caja FROM cajas_diarias WHERE id_finca=? AND fecha=?',
      [Number(body.fincaId), body.fecha || new Date().toISOString().slice(0, 10)]
    );
    const cajaId = cajaRows[0].id_caja;
    await connection.execute(
      'UPDATE ventas SET id_caja=? WHERE id_venta=?',
      [cajaId, ventaResult.insertId]
    );
    if (body.pagado !== false) {
      await connection.execute(
        'INSERT INTO movimientos_caja (id_caja,id_usuario_registra,id_venta,tipo,categoria,concepto,monto,referencia) VALUES (?,?,?,?,?,?,?,?)',
        [cajaId, req.user!.id, ventaResult.insertId, 'ingreso', 'venta_cacao',
         `Venta ${kilos} Kg cacao`, kilos * precio, comprobante]
      );
    }
    await connection.commit();
    const [rows] = await pool.execute('SELECT * FROM ventas WHERE id_venta=?', [ventaResult.insertId]);
    res.status(201).json((rows as RowDataPacket[])[0]);
  } catch (error) {
    await connection.rollback();
    const message = error instanceof Error ? error.message : 'No fue posible registrar la venta.';
    res.status(400).json({ message });
  } finally {
    connection.release();
  }
});

// -----------------------------------------------------------------------------
// Endpoints de movimientos de caja diaria
// -----------------------------------------------------------------------------

/**
 * GET /api/movimientos-caja
 * Consulta los ingresos y egresos de caja (con filtro opcional `?fincaId=`),
 * incluyendo fecha de caja y finca, acotados por permisos del usuario.
 */
app.get('/api/movimientos-caja', auth, async (req: AuthRequest, res) => {
  const fincaId = req.query.fincaId ? Number(req.query.fincaId) : null;
  let sql: string;
  let params: (string | number)[];
  if (req.user!.rol === 'admin') {
    sql = fincaId
      ? 'SELECT mc.*,c.fecha AS fecha_caja,c.id_finca FROM movimientos_caja mc INNER JOIN cajas_diarias c ON c.id_caja=mc.id_caja WHERE c.id_finca=? ORDER BY mc.fecha_movimiento DESC'
      : 'SELECT mc.*,c.fecha AS fecha_caja,c.id_finca FROM movimientos_caja mc INNER JOIN cajas_diarias c ON c.id_caja=mc.id_caja ORDER BY mc.fecha_movimiento DESC';
    params = fincaId ? [fincaId] : [];
  } else {
    sql = fincaId
      ? `SELECT mc.*,c.fecha AS fecha_caja,c.id_finca FROM movimientos_caja mc
         INNER JOIN cajas_diarias c ON c.id_caja=mc.id_caja
         INNER JOIN usuario_finca uf ON uf.id_finca=c.id_finca
         WHERE c.id_finca=? AND uf.id_usuario=? ORDER BY mc.fecha_movimiento DESC`
      : `SELECT mc.*,c.fecha AS fecha_caja,c.id_finca FROM movimientos_caja mc
         INNER JOIN cajas_diarias c ON c.id_caja=mc.id_caja
         INNER JOIN usuario_finca uf ON uf.id_finca=c.id_finca
         WHERE uf.id_usuario=? ORDER BY mc.fecha_movimiento DESC`;
    params = fincaId ? [fincaId, req.user!.id] : [req.user!.id];
  }
  const [rows] = await pool.execute(sql, params);
  res.json(rows);
});

/**
 * POST /api/movimientos-caja
 * Registra un movimiento manual de ingreso o egreso en la caja diaria de la finca
 * para la fecha indicada (creando la caja si aún no existe). Valida finca, monto > 0
 * y acceso a la finca.
 */
app.post('/api/movimientos-caja', auth, async (req: AuthRequest, res) => {
  const body = req.body;
  const monto = Number(body.monto);
  if (!Number.isInteger(Number(body.fincaId)) || monto <= 0) {
    return res.status(400).json({ message: 'Finca y monto válidos son obligatorios.' });
  }
  if (!(await canAccessFinca(req, Number(body.fincaId)))) {
    return res.status(403).json({ message: 'No tienes acceso a esta finca.' });
  }
  const fecha = body.fecha || new Date().toISOString().slice(0,10);
  await pool.execute(
    'INSERT INTO cajas_diarias (id_finca,fecha,saldo_inicial) VALUES (?,?,0) ON DUPLICATE KEY UPDATE saldo_inicial=saldo_inicial',
    [Number(body.fincaId), fecha]
  );
  const [cajas] = await pool.execute<RowDataPacket[]>('SELECT id_caja FROM cajas_diarias WHERE id_finca=? AND fecha=?', [Number(body.fincaId), fecha]);
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    'INSERT INTO movimientos_caja (id_caja,id_usuario_registra,tipo,categoria,concepto,monto,referencia) VALUES (?,?,?,?,?,?,?)',
    [cajas[0].id_caja, req.user!.id, body.tipo || 'egreso', body.categoria || 'otros_gastos',
     body.concepto || 'Movimiento de caja', monto, body.referencia || null]
  );
  const [rows] = await pool.execute('SELECT * FROM movimientos_caja WHERE id_movimiento_caja=?', [result.insertId]);
  res.status(201).json((rows as RowDataPacket[])[0]);
});

// -----------------------------------------------------------------------------
// Endpoints de estado persistente del espacio de trabajo (workspace)
// -----------------------------------------------------------------------------

/**
 * GET /api/state
 * Recupera el estado JSON persistido para el usuario autenticado (`workspace_state:<id>`).
 */
app.get('/api/state', auth, async (req: AuthRequest, res) => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT payload FROM estado_aplicacion WHERE clave = ? LIMIT 1', [`workspace_state:${req.user!.id}`]);
  if (rows.length === 0) return res.json({});
  const payload = rows[0].payload;
  if (typeof payload === 'string') {
    try { return res.json(JSON.parse(payload)); }
    catch { return res.json({}); }
  }
  return res.json(payload);
});

/**
 * PUT /api/state
 * Guarda o actualiza el estado JSON del espacio de trabajo del usuario autenticado.
 */
app.put('/api/state', auth, async (req: AuthRequest, res) => {
  await pool.execute(
    'INSERT INTO estado_aplicacion (clave, payload) VALUES (?, ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload)',
    [`workspace_state:${req.user!.id}`, JSON.stringify(req.body ?? {})]
  );
  res.json({ ok: true });
});

// -----------------------------------------------------------------------------
// Manejo global de errores y secuencia de arranque del servidor
// -----------------------------------------------------------------------------

/** Middleware global de errores no controlados: registra el detalle y responde HTTP 500. */
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => { console.error(error); res.status(500).json({ message: 'Error interno del servidor.' }); });

/** Crea la cuenta de administrador por defecto (`admin` / `admin123`) si aún no existe. */
const ensureDefaultAdmin = async () => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id_usuario FROM usuarios WHERE cedula = \'admin\' LIMIT 1');
  if (rows.length > 0) return;

  const passwordHash = await bcrypt.hash('admin123', 12);
  await pool.execute('INSERT INTO usuarios (cedula,nombre_completo,telefono,password_hash,rol) VALUES (?,?,?,?,\'admin\')', ['admin', 'Administrador ADSO', null, passwordHash]);
};

/** Rellena el propietario en fincas existentes sin propietario usando el dueño en `usuario_finca`. */
const ensureFincaPropietario = async () => {
  await pool.execute(`
    UPDATE fincas f
    INNER JOIN usuario_finca uf ON uf.id_finca = f.id_finca AND uf.rol_en_finca = 'propietario'
    INNER JOIN usuarios u ON u.id_usuario = uf.id_usuario
    SET f.propietario = u.nombre_completo
    WHERE f.propietario IS NULL OR TRIM(f.propietario) = ''
  `);
};

/** Ejecuta las tareas de inicialización en base de datos y levanta el servidor HTTP. */
const startServer = async () => {
  await ensureWorkspaceStateTable();
  await ensureBuyerOwnershipColumn();
  await ensureRecoleccionMalEstadoColumn();
  await ensureFincaPropietario();
  await cleanupLegacyWorkspaceState();
  await ensureDefaultAdmin();
  app.listen(Number(process.env.PORT || 3001), () => console.log(`API lista en http://localhost:${process.env.PORT || 3001}/api`));
};

// Arranque principal: finaliza el proceso con código 1 si falla la inicialización
startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
