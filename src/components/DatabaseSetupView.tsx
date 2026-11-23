/**
 * Vista administrativa para verificar la conexión entre el frontend, la API y la base de datos MySQL.
 * Muestra el estado de configuración actual y una guía paso a paso para activar el backend.
 */
import React, { useState } from 'react';
import { Database, ServerCog, ShieldCheck, CheckCircle2, CircleAlert, RefreshCw } from 'lucide-react';
import { apiBaseUrl, backendConfigured, checkApiHealth } from '../services/api';

export const DatabaseSetupView: React.FC = () => {
  // Indica si se está ejecutando la comprobación del endpoint /health de la API
  const [checking, setChecking] = useState(false);
  // Almacena el resultado de la última verificación de conectividad
  const [result, setResult] = useState<{ connected: boolean; message: string } | null>(null);

  // Consulta el estado de salud de la API configurada y actualiza el resultado en pantalla
  const verifyConnection = async () => {
    setChecking(true);
    setResult(await checkApiHealth());
    setChecking(false);
  };

  return <div className="space-y-6 animate-fadeIn">
    {/* Encabezado informativo exclusivo del administrador */}
    <div className="bg-gradient-to-r from-sky-950 to-stone-950 rounded-3xl p-6 border-4 border-sky-700 text-white shadow-xl">
      <div className="flex gap-3 items-center"><Database className="w-10 h-10 text-sky-300" /><div><h2 className="text-2xl font-black">Preparar conexión de base de datos</h2><p className="text-sky-200 text-sm">Panel exclusivo del administrador. La aplicación se conectará a una API segura, no directamente a MySQL.</p></div></div>
    </div>

    {/* Tarjeta de estado de la API y botón para probar conexión */}
    <div className={`rounded-2xl border-3 p-5 ${backendConfigured ? 'bg-emerald-50 border-emerald-500' : 'bg-amber-50 border-amber-500'}`}>
      <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><ServerCog className="w-7 h-7 shrink-0" /><div><h3 className="font-black text-lg">Estado de la API</h3><p className="text-sm font-medium">{backendConfigured ? `URL configurada: ${apiBaseUrl}` : 'Aún no hay una URL de API configurada.'}</p></div></div>{backendConfigured ? <CheckCircle2 className="w-7 h-7 text-emerald-700" /> : <CircleAlert className="w-7 h-7 text-amber-700" />}</div>
      <button type="button" onClick={verifyConnection} disabled={checking} className="mt-4 px-4 py-2 rounded-xl bg-sky-800 hover:bg-sky-700 disabled:bg-stone-400 text-white font-bold text-sm flex gap-2 items-center"><RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />{checking ? 'Verificando...' : 'Comprobar API'}</button>
      {result && <p className={`mt-3 text-sm font-bold ${result.connected ? 'text-emerald-800' : 'text-rose-800'}`}>{result.message}</p>}
    </div>

    {/* Guía paso a paso para poner en marcha MySQL y el servidor backend */}
    <div className="bg-white border-3 border-stone-200 rounded-3xl p-6 space-y-4">
      <h3 className="font-black text-xl text-stone-900 flex gap-2 items-center"><ShieldCheck className="w-6 h-6 text-sky-800" />Pasos para activar la base</h3>
      <ol className="list-decimal ml-5 space-y-2 text-sm text-stone-700"><li>Crear la base ejecutando <code className="font-bold">database/schema_cacao_v2.sql</code> en MySQL.</li><li>Crear el backend con rutas de autenticación, fincas, inventario, cosechas, ventas y caja.</li><li>Configurar en <code className="font-bold">.env</code>: <code className="font-bold">VITE_API_URL=http://localhost:3001/api</code>.</li><li>Implementar en la API el endpoint <code className="font-bold">GET /health</code> y pulsar “Comprobar API”.</li><li>Migrar los datos de ejemplo y reemplazar progresivamente el almacenamiento local.</li></ol>
    </div>
  </div>;
};
