/**
 * Vista de autenticación del sistema (inicio de sesión y registro de productores).
 * Valida credenciales contra la API, anuncia mensajes con el asistente de voz
 * y notifica al componente padre cuando el acceso o registro es exitoso.
 */
import React, { useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  Phone,
  ShieldCheck,
  Sprout,
  User,
  UserCheck,
  UserPlus,
  Volume2
} from 'lucide-react';
import { voiceAssistant } from '../services/voiceAssistant';
import { Usuario } from '../types';
import { loginWithApi, registerWithApi } from '../services/api';

// Propiedades de sesión actual y callbacks de autenticación
interface AuthViewProps {
  currentUser: Usuario | null;
  onLoginSuccess: (user: Usuario, token: string) => void;
  onRegisterSuccess: (newUser: Usuario, token: string) => void;
  onLogout?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  currentUser,
  onLoginSuccess,
  onRegisterSuccess,
  onLogout
}) => {
  // Modo activo de la pantalla ('login' para ingreso, 'register' para crear cuenta)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Estados del formulario de inicio de sesión
  const [loginCedula, setLoginCedula] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Estados del formulario de registro de nuevo productor
  const [regNombre, setRegNombre] = useState('');
  const [regCedula, setRegCedula] = useState('');
  const [regCelular, setRegCelular] = useState('');
  const [regCorreo, setRegCorreo] = useState('');
  const [regFincaVereda, setRegFincaVereda] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Reproduce un mensaje de ayuda en voz alta de forma inmediata
  const handleSpeak = (text: string) => voiceAssistant.speak(text, true);

  // Valida los campos de ingreso, autentica contra la API y construye el objeto Usuario
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginCedula.trim()) {
      setLoginError('Ingresa tu cédula.');
      return;
    }

    if (!loginPassword.trim()) {
      setLoginError('Ingresa tu contraseña.');
      return;
    }

    setLoginLoading(true);
    try {
      const response = await loginWithApi(loginCedula.trim(), loginPassword);
      // Normaliza los datos devueltos por la API al modelo Usuario del frontend
      const user: Usuario = {
        id: String(response.user.id),
        nombreCompleto: response.user.nombreCompleto,
        cedula: loginCedula.trim(),
        celularWhatsApp: '',
        nombreFincaVereda: response.user.rol === 'admin'
          ? 'Panel general'
          : response.user.fincaNombre
            ? response.user.fincaNombre
            : response.user.fincaId
              ? `Finca #${response.user.fincaId}`
            : 'Por completar',
        fincaId: response.user.fincaId ? String(response.user.fincaId) : undefined,
        rol: response.user.rol === 'admin' ? 'admin' : 'productor',
        fechaRegistro: new Date().toISOString().split('T')[0]
      };

      voiceAssistant.speak(`Bienvenido ${user.nombreCompleto}.`, true);
      onLoginSuccess(user, response.token);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'No fue posible iniciar sesión.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Valida los datos del registro, crea la cuenta y su finca inicial en la API
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regNombre.trim()) return setRegError('Ingresa tu nombre.');
    if (!regCedula.trim()) return setRegError('Ingresa tu cédula.');
    if (!regCelular.trim()) return setRegError('Ingresa tu celular.');
    if (!regCorreo.trim()) return setRegError('Ingresa tu correo electrónico.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regCorreo.trim())) return setRegError('Ingresa un correo electrónico válido.');
    if (!regFincaVereda.trim()) return setRegError('Ingresa el nombre de tu finca.');
    if (!regPassword.trim() || regPassword.length < 4) return setRegError('La contraseña debe tener al menos 4 caracteres.');

    setRegLoading(true);
    try {
      const response = await registerWithApi({
        cedula: regCedula.trim(),
        nombreCompleto: regNombre.trim(),
        telefono: regCelular.trim(),
        correo: regCorreo.trim().toLowerCase(),
        password: regPassword,
        nombreFinca: regFincaVereda.trim(),
        municipio: 'Por completar'
      });

      const newUser: Usuario = {
        id: String(response.user.id),
        nombreCompleto: regNombre.trim(),
        cedula: regCedula.trim(),
        celularWhatsApp: regCelular.trim(),
        correo: regCorreo.trim().toLowerCase(),
        nombreFincaVereda: regFincaVereda.trim(),
        fincaId: response.user.fincaId ? String(response.user.fincaId) : undefined,
        rol: 'productor',
        fechaRegistro: new Date().toISOString().split('T')[0]
      };

      voiceAssistant.speak(`Registro exitoso. Bienvenido ${newUser.nombreCompleto}.`, true);
      onRegisterSuccess(newUser, response.token);
    } catch (error) {
      setRegError(error instanceof Error ? error.message : 'No fue posible crear la cuenta.');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6 animate-fadeIn">
      {/* Encabezado de bienvenida con botón de ayuda por voz */}
      <div className="bg-stone-950 text-amber-50 rounded-3xl p-6 border-4 border-amber-800 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Acceso seguro
              </span>
              <span className="bg-amber-800 text-amber-200 text-xs font-bold px-2 py-0.5 rounded border border-amber-600">
                ADSO Cacao
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-amber-100 font-serif">
              {authMode === 'login' ? 'Ingresar al sistema' : 'Crear cuenta nueva'}
            </h2>
            <p className="text-amber-200/90 text-sm mt-1 max-w-2xl">
              Accede con tu cédula y contraseña, o regístrate si aún no tienes cuenta.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              handleSpeak(
                authMode === 'login'
                  ? 'Pantalla de ingreso. Escribe tu cédula y contraseña para entrar.'
                  : 'Pantalla de registro. Completa tu nombre, cédula, celular, finca y contraseña.'
              )
            }
            className="px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm flex items-center justify-center gap-2 border-2 border-amber-300 shadow-lg cursor-pointer"
          >
            <Volume2 className="w-5 h-5" />
            <span>Escuchar ayuda</span>
          </button>
        </div>
      </div>

      {/* Aviso de sesión activa en caso de que exista un usuario autenticado */}
      {currentUser && (
        <div className="bg-amber-100 border-2 border-amber-600 p-4 rounded-2xl text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👤</span>
            <div>
              <p className="font-black text-base sm:text-lg text-amber-900">
                Sesión activa: <span className="underline">{currentUser.nombreCompleto}</span>
              </p>
              <p className="text-xs sm:text-sm text-stone-700 font-medium">
                {currentUser.nombreFincaVereda} · Cédula: {currentUser.cedula}
              </p>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs sm:text-sm border border-rose-900 shadow cursor-pointer"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      )}

      {/* Selector de pestañas entre inicio de sesión y registro */}
      <div className="flex flex-col sm:flex-row gap-3 bg-stone-100 p-2 rounded-2xl border border-stone-300">
        <button
          type="button"
          onClick={() => setAuthMode('login')}
          className={`flex-1 py-4 px-6 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-3 border-2 cursor-pointer ${
            authMode === 'login'
              ? 'bg-amber-700 text-white border-amber-900 shadow-lg'
              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
          }`}
        >
          <LogIn className="w-6 h-6" />
          <span>Ingresar</span>
        </button>

        <button
          type="button"
          onClick={() => setAuthMode('register')}
          className={`flex-1 py-4 px-6 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-3 border-2 cursor-pointer ${
            authMode === 'register'
              ? 'bg-emerald-800 text-white border-emerald-950 shadow-lg'
              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
          }`}
        >
          <UserPlus className="w-6 h-6" />
          <span>Registrarme</span>
        </button>
      </div>

      {/* Contenedor principal con el formulario activo y la guía lateral de uso */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white rounded-3xl border-4 border-amber-800/30 p-6 sm:p-8 shadow-xl">
          {/* Formulario de inicio de sesión */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div className="border-b border-stone-200 pb-4">
                <h3 className="text-2xl font-black text-stone-900 flex items-center gap-2">
                  <User className="w-6 h-6 text-amber-700" />
                  Ingreso
                </h3>
                <p className="text-stone-600 text-sm mt-1">Solo necesitas tu cédula y contraseña.</p>
              </div>

              {loginError && (
                <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-sm font-bold">
                  {loginError}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-stone-800 font-extrabold text-base">
                  Cédula
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-700">
                    <User className="w-6 h-6" />
                  </div>
                  <input
                    type="text"
                    value={loginCedula}
                    onChange={(e) => setLoginCedula(e.target.value)}
                    placeholder="Ej: 1098765432"
                    className="w-full pl-13 pr-4 py-3.5 rounded-2xl border-2 border-stone-300 focus:border-amber-700 focus:ring-4 focus:ring-amber-200 text-lg font-bold text-stone-900 bg-stone-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-stone-800 font-extrabold text-base">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-700">
                    <Lock className="w-6 h-6" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-13 pr-14 py-3.5 rounded-2xl border-2 border-stone-300 focus:border-amber-700 focus:ring-4 focus:ring-amber-200 text-lg font-bold text-stone-900 bg-stone-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-600 hover:text-amber-800 font-bold text-sm"
                  >
                    {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 text-white font-black text-xl shadow-xl border-2 border-emerald-950 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span>{loginLoading ? 'Ingresando...' : 'Entrar'}</span>
                <ArrowRight className="w-7 h-7" />
              </button>
            </form>
          )}

          {/* Formulario de registro de nuevo productor */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              <div className="border-b border-stone-200 pb-4">
                <h3 className="text-2xl font-black text-stone-900 flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-emerald-700" />
                  Registro
                </h3>
                <p className="text-stone-600 text-sm mt-1">Completa los datos básicos para crear tu cuenta.</p>
              </div>

              {regError && (
                <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-sm font-bold">
                  {regError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-stone-800 font-extrabold text-sm">Nombre completo</label>
                  <input
                    type="text"
                    value={regNombre}
                    onChange={(e) => setRegNombre(e.target.value)}
                    placeholder="Ej: Carlos Alberto Restrepo"
                    className="w-full px-4 py-3 rounded-xl border-2 border-stone-300 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 text-base font-bold text-stone-900 bg-stone-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-stone-800 font-extrabold text-sm">Cédula</label>
                  <input
                    type="text"
                    value={regCedula}
                    onChange={(e) => setRegCedula(e.target.value)}
                    placeholder="Ej: 91234567"
                    className="w-full px-4 py-3 rounded-xl border-2 border-stone-300 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 text-base font-bold text-stone-900 bg-stone-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-stone-800 font-extrabold text-sm">Celular / WhatsApp</label>
                  <input
                    type="text"
                    value={regCelular}
                    onChange={(e) => setRegCelular(e.target.value)}
                    placeholder="Ej: 311 234 5678"
                    className="w-full px-4 py-3 rounded-xl border-2 border-stone-300 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 text-base font-bold text-stone-900 bg-stone-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-stone-800 font-extrabold text-sm">Correo electrónico</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-700">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      value={regCorreo}
                      onChange={(e) => setRegCorreo(e.target.value)}
                      placeholder="Ej: nombre@correo.com"
                      autoComplete="email"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-stone-300 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 text-base font-bold text-stone-900 bg-stone-50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-stone-800 font-extrabold text-sm">Nombre de la finca</label>
                  <input
                    type="text"
                    value={regFincaVereda}
                    onChange={(e) => setRegFincaVereda(e.target.value)}
                    placeholder="Ej: Finca San José - Vereda La Palmita"
                    className="w-full px-4 py-3 rounded-xl border-2 border-stone-300 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 text-base font-bold text-stone-900 bg-stone-50"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-stone-800 font-extrabold text-sm">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className="w-full px-4 py-3 pr-14 rounded-xl border-2 border-stone-300 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 text-base font-bold text-stone-900 bg-stone-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-600 font-bold text-xs"
                    >
                      {showRegPassword ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-800 via-amber-700 to-amber-900 text-white font-black text-xl shadow-xl border-2 border-amber-950 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span>{regLoading ? 'Creando...' : 'Crear cuenta'}</span>
                <ArrowRight className="w-6 h-6" />
              </button>
            </form>
          )}
        </div>

        {/* Panel lateral con recomendaciones básicas para el productor */}
        <div className="lg:col-span-5 bg-white border-2 border-stone-200 rounded-3xl p-6 shadow-sm">
          <h4 className="font-black text-xl text-stone-900 mb-3">Cómo usarlo</h4>
          <ul className="space-y-3 text-sm text-stone-700">
            <li className="flex items-start gap-3">
              <Sprout className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <span>Ingresa si ya tienes cuenta o regístrate si eres nuevo.</span>
            </li>
            <li className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <span>Usa un celular activo para recibir alertas o contacto.</span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <span>Después de entrar verás solo lo necesario para operar la finca.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
