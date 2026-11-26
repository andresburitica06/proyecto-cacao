/**
 * Vista de autenticación del sistema (inicio de sesión, registro y recuperación de contraseña).
 * Diseño Mockup a pantalla completa adaptado 100% a la lógica y validaciones reales de la API.
 */
import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Leaf,
  Lock,
  LogIn,
  Phone,
  ShieldCheck,
  User,
  UserCheck,
  UserPlus,
  Volume2,
} from 'lucide-react';
import cacaoHeroImg from '../assets/images/cacao_plantation_hero_1795534812719.jpg';
import { voiceAssistant } from '../services/voiceAssistant';
import { Usuario } from '../types';
import { loginWithApi, registerWithApi, recoverPasswordApi } from '../services/api';
import { VoiceAssistantBar } from './VoiceAssistantBar';

const CacaoPodOutlineIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M24 5c-7.5 3.8-13 11.4-13 20.2 0 7.7 5.1 14.3 13 17.8 7.9-3.5 13-10.1 13-17.8C37 16.4 31.5 8.8 24 5Z" />
    <path d="M24 5v38" />
    <path d="M24 7c-4.2 5-6.6 11.4-6.6 18.2 0 6.5 2.4 12.6 6.6 17.5" />
    <path d="M24 7c4.2 5 6.6 11.4 6.6 18.2 0 6.5-2.4 12.6-6.6 17.5" />
    <path d="M24 2v3" />
  </svg>
);

const BotanicalSketchCorner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 280 280"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M20 250C65 190 120 135 210 65" />
    <path d="M90 175C62 152 44 115 58 76c34 10 64 38 66 76" />
    <path d="M58 76c16 32 30 62 32 99" />
    <path d="M148 116C136 82 146 42 182 18c26 24 34 62 16 94" />
    <path d="M182 18c-8 32-18 62-34 98" />
    <path d="M174 122c-22 10-38 34-38 62 0 24 14 46 38 56 24-10 38-32 38-56 0-28-16-52-38-62Z" />
    <path d="M174 122v118" />
    <path d="M174 126c-12 14-18 34-18 56 0 20 6 40 18 54" />
    <path d="M174 126c12 14 18 34 18 56 0 20-6 40-18 54" />
    <path d="M124 218c28 18 64 16 98-6" />
  </svg>
);

interface AuthViewProps {
  currentUser: Usuario | null;
  onLoginSuccess: (user: Usuario, token: string) => void;
  onRegisterSuccess: (newUser: Usuario, token: string) => void;
  onLogout?: () => void;
  onRecoverPassword?: (cedula: string, celular: string, nuevaPassword: string) => Promise<boolean>;
  screenTitle?: string;
  screenTextToRead?: string;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  onRegisterSuccess,
  onRecoverPassword,
  screenTitle = 'Acceso al Sistema Cacaotero',
  screenTextToRead = 'Ingresa con tu cédula y contraseña, regístrate o recupera tu clave.',
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recover'>('login');

  // --- Login ---
  const [loginCedula, setLoginCedula] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // --- Register ---
  const [regNombre, setRegNombre] = useState('');
  const [regCedula, setRegCedula] = useState('');
  const [regCelular, setRegCelular] = useState('');
  const [regCorreo, setRegCorreo] = useState('');
  const [regNombreFinca, setRegNombreFinca] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // --- Recover ---
  const [recCedula, setRecCedula] = useState('');
  const [recCelular, setRecCelular] = useState('');
  const [recNewPassword, setRecNewPassword] = useState('');
  const [recMessage, setRecMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginCedula.trim()) { setLoginError('Ingresa tu cédula.'); return; }
    if (!loginPassword.trim()) { setLoginError('Ingresa tu contraseña.'); return; }

    setLoginLoading(true);
    try {
      const response = await loginWithApi(loginCedula.trim(), loginPassword);
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
        fechaRegistro: new Date().toISOString().split('T')[0],
      };

      voiceAssistant.speak(`Bienvenido ${user.nombreCompleto}.`, true);
      onLoginSuccess(user, response.token);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'No fue posible iniciar sesión.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regNombre.trim()) return setRegError('Ingresa tu nombre.');
    if (!regCedula.trim()) return setRegError('Ingresa tu cédula.');
    if (!regCelular.trim()) return setRegError('Ingresa tu celular.');
    if (!regCorreo.trim()) return setRegError('Ingresa tu correo electrónico.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regCorreo.trim())) return setRegError('Ingresa un correo electrónico válido.');
    if (!regNombreFinca.trim()) return setRegError('Ingresa el nombre de tu finca.');
    if (!regPassword.trim() || regPassword.length < 4) return setRegError('La contraseña debe tener al menos 4 caracteres.');

    setRegLoading(true);
    try {
      const response = await registerWithApi({
        cedula: regCedula.trim(),
        nombreCompleto: regNombre.trim(),
        telefono: regCelular.trim(),
        correo: regCorreo.trim().toLowerCase(),
        password: regPassword,
        nombreFinca: regNombreFinca.trim(),
        municipio: 'Por completar',
      });

      const newUser: Usuario = {
        id: String(response.user.id),
        nombreCompleto: regNombre.trim(),
        cedula: regCedula.trim(),
        celularWhatsApp: regCelular.trim(),
        correo: regCorreo.trim().toLowerCase(),
        nombreFincaVereda: regNombreFinca.trim(),
        fincaId: response.user.fincaId ? String(response.user.fincaId) : undefined,
        rol: 'productor',
        fechaRegistro: new Date().toISOString().split('T')[0],
      };

      voiceAssistant.speak(`Registro exitoso. Bienvenido ${newUser.nombreCompleto}.`, true);
      onRegisterSuccess(newUser, response.token);
    } catch (error) {
      setRegError(error instanceof Error ? error.message : 'No fue posible crear la cuenta.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecMessage(null);

    if (!recCedula.trim() || !recCelular.trim()) {
      setRecMessage({ type: 'err', text: 'Ingresa tu cédula y número de celular registrado.' });
      return;
    }
    if (!recNewPassword.trim() || recNewPassword.length < 4) {
      setRecMessage({ type: 'err', text: 'La nueva contraseña debe tener al menos 4 caracteres.' });
      return;
    }

    setRecLoading(true);
    try {
      if (onRecoverPassword) {
        const ok = await onRecoverPassword(recCedula.trim(), recCelular.trim(), recNewPassword.trim());
        if (ok) {
          setRecMessage({ type: 'ok', text: 'Contraseña actualizada correctamente. Ya puedes ingresar con tu nueva clave.' });
          voiceAssistant.speak('Contraseña actualizada correctamente.', false);
          setRecNewPassword('');
        } else {
          setRecMessage({ type: 'err', text: 'Los datos no coinciden con ningún usuario registrado.' });
        }
      } else {
        await recoverPasswordApi(recCedula.trim(), recCelular.trim(), recNewPassword.trim());
        setRecMessage({ type: 'ok', text: 'Contraseña actualizada correctamente. Ya puedes ingresar con tu nueva clave.' });
        voiceAssistant.speak('Contraseña actualizada correctamente.', false);
        setRecNewPassword('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Los datos no coinciden con ningún usuario registrado.';
      setRecMessage({ type: 'err', text: msg });
    } finally {
      setRecLoading(false);
    }
  };

  const loginInputClass =
    'w-full py-2.5 rounded-xl border border-[#E5DACB] bg-[#F4ECE1] focus:bg-white focus:border-[#B84A00] focus:ring-2 focus:ring-[#B84A00]/15 focus:outline-none text-sm font-medium text-[#2C1A11] placeholder:text-[#8E7C6B] transition-colors';

  const registerInputClass =
    'w-full py-2.5 rounded-xl border border-[#DED3C3] bg-[#FDFBF7] focus:bg-white focus:border-[#B84A00] focus:ring-2 focus:ring-[#B84A00]/15 focus:outline-none text-sm font-medium text-[#2C1A11] placeholder:text-[#8E7C6B] transition-colors';

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 animate-fadeIn">
      {/* Columna Izquierda: Fotografía de plantación de cacao + bloques glass oscuros */}
      <section className="relative min-h-[400px] lg:min-h-full overflow-hidden bg-gradient-to-br from-[#102619] via-[#26180F] to-[#1C0D02] flex flex-col justify-between p-6 sm:p-10 xl:p-14">
        <img
          src={cacaoHeroImg}
          alt="Mazorcas de cacao maduras en plantación tropical"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#0E261A]/50 via-black/15 to-[#160D07]/65"
        />

        {/* Tarjeta superior glassmorphic con marca ADSO Cacao */}
        <div className="relative z-10 max-w-xl rounded-2xl bg-gradient-to-br from-[#0F2A1D]/82 via-[#2A1D13]/75 to-[#1C120B]/70 backdrop-blur-md border border-amber-200/20 px-6 py-6 sm:px-8 sm:py-7 shadow-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/25 bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100/95">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-200 shrink-0" />
            <span>ACCESO SEGURO</span>
          </div>

          <h1 className="mt-4 font-serif text-3xl sm:text-4xl xl:text-[2.65rem] leading-[1.12] tracking-tight text-balance">
            <span className="block font-semibold text-[#E5C185]">Sistema de Gestión</span>
            <span className="inline-flex items-center gap-2.5 font-bold text-white mt-0.5">
              <span>de Cacao - ADSO</span>
              <CacaoPodOutlineIcon className="w-7 h-7 sm:w-8 sm:h-8 text-[#D7B377] shrink-0" />
            </span>
          </h1>
        </div>

        {/* Tarjeta inferior glassmorphic "Cómo usarlo" */}
        <div className="relative z-10 mt-8 rounded-2xl bg-[#1A110B]/82 backdrop-blur-md border border-amber-200/20 p-5 sm:p-6 shadow-2xl">
          <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-white/10">
            <BookOpen className="w-4 h-4 text-amber-100/90 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-white">Cómo usarlo</h3>
            <span className="text-xs text-amber-100/75">Guía rápida de acceso.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs text-amber-50/90 leading-relaxed">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#E4EDE7] text-[#2A5C43] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <span>Ingresa si ya tienes cuenta, regístrate o recupera tu clave.</span>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#E4EDE7] text-[#2A5C43] flex items-center justify-center shrink-0 mt-0.5">
                <Leaf className="w-4 h-4" />
              </span>
              <span>Trazabilidad completa: Cosecha, Cacao Sano, Merma y Ventas.</span>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#E4EDE7] text-[#2A5C43] flex items-center justify-center shrink-0 mt-0.5">
                <Phone className="w-4 h-4" />
              </span>
              <span>Usa un celular activo para recuperar contraseña y recibir alertas.</span>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#FBECE0] text-[#B84A00] flex items-center justify-center shrink-0 mt-0.5">
                <Volume2 className="w-4 h-4" />
              </span>
              <span>
                <strong className="text-white font-semibold">Ayuda por voz:</strong> usa Escuchar
                Pantalla arriba si prefieres oír las instrucciones en voz alta.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Columna Derecha: Fondo crema cálido con arte botánico + controles de voz + formulario */}
      <section className="relative bg-[#FAF6F0] flex flex-col justify-between px-5 py-5 sm:px-10 sm:py-6 overflow-hidden">
        <BotanicalSketchCorner className="pointer-events-none select-none absolute -top-6 -left-6 w-56 h-56 text-[#C7B8A3]/45" />
        <BotanicalSketchCorner className="pointer-events-none select-none absolute -bottom-8 -right-6 w-60 h-60 text-[#C7B8A3]/45 rotate-180" />

        {/* Controles superiores derechos: Asistente de Voz + Acceso Rural Campesino */}
        <div className="relative z-20 flex flex-col items-end gap-2">
          <VoiceAssistantBar
            variant="inline-light"
            currentScreenTitle={screenTitle}
            screenTextToRead={screenTextToRead}
          />
          <span className="inline-flex items-center rounded-full border border-[#DDD3C5] bg-[#F6F0E6]/90 px-3.5 py-1 text-[11px] font-medium text-[#5C4A38]">
            Acceso Rural Campesino
          </span>
        </div>

        {/* Contenedor central de autenticación */}
        <div className="relative z-10 flex-1 flex items-center justify-center py-6">
          <div className="w-full max-w-[440px]">
            <div className="mb-5">
              <h2 className="font-serif text-3xl sm:text-[2.35rem] font-bold text-[#1C0D02] leading-tight tracking-tight">
                {authMode === 'login'
                  ? 'Ingresar al sistema'
                  : authMode === 'register'
                  ? 'Crear cuenta'
                  : 'Recuperar contraseña'}
              </h2>
              <p className="text-xs sm:text-sm text-[#5C4A38] mt-1.5">
                {authMode === 'login'
                  ? 'Accede con tu cédula y contraseña, o regístrate si aún no tienes cuenta.'
                  : authMode === 'register'
                  ? 'Completa los datos básicos para crear tu cuenta.'
                  : 'Restablece tu clave de acceso usando tu cédula y celular.'}
              </p>
            </div>

            {/* Pestañas Ingresar / Registrarme */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border whitespace-nowrap ${
                  authMode === 'login'
                    ? 'bg-[#D3845E] hover:bg-[#C3744F] text-white border-[#D3845E] shadow-xs'
                    : 'bg-white text-[#3E2D23] border-[#E2D8CA] hover:bg-[#FDFBF7]'
                }`}
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>Ingresar</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border whitespace-nowrap ${
                  authMode === 'register'
                    ? 'bg-[#D3845E] hover:bg-[#C3744F] text-white border-[#D3845E] shadow-xs'
                    : 'bg-white text-[#3E2D23] border-[#E2D8CA] hover:bg-[#FDFBF7]'
                }`}
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>Registrarme</span>
              </button>
            </div>

            {/* Tarjeta blanca del formulario */}
            <div className="bg-white rounded-2xl border border-[#EAE2D6] p-6 sm:p-7 shadow-[0_14px_34px_-14px_rgba(28,13,2,0.1)]">
              {authMode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="pb-3 border-b border-[#EAE2D6]">
                    <h3 className="text-lg font-bold text-[#1C0D02] flex items-center gap-2 leading-snug">
                      <User className="w-5 h-5 text-[#5C4A38] shrink-0" />
                      <span>Ingreso</span>
                    </h3>
                    <p className="text-[#6B5744] text-xs mt-1 leading-normal">
                      Solo necesitas tu cédula y contraseña.
                    </p>
                  </div>

                  {loginError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                      {loginError}
                    </div>
                  )}

                  <div>
                    <label htmlFor="login-cedula" className="block text-sm font-bold text-[#2C1A11] mb-1.5">
                      Cédula
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7A6654]">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="login-cedula"
                        type="text"
                        value={loginCedula}
                        onChange={(e) => setLoginCedula(e.target.value)}
                        placeholder="Ej: 1098765432"
                        className={`${loginInputClass} pl-10 pr-4`}
                        disabled={loginLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="login-password" className="block text-sm font-bold text-[#2C1A11] mb-1.5">
                      Contraseña
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7A6654]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••"
                        className={`${loginInputClass} pl-10 pr-11`}
                        disabled={loginLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B5744] hover:text-[#1C0D02] cursor-pointer"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="mt-1.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setAuthMode('recover')}
                        className="text-xs font-medium text-[#A34818] hover:text-[#B84A00] hover:underline cursor-pointer"
                      >
                        ¿Olvidó su contraseña?
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3 px-5 rounded-xl bg-[#5B8E76] hover:bg-[#4B7B65] disabled:opacity-60 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>{loginLoading ? 'Verificando...' : 'Entrar'}</span>
                    {!loginLoading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              )}

              {authMode === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div className="pb-3 border-b border-[#E6DDD0]/80">
                    <h3 className="text-lg font-bold text-[#1C0D02] flex items-center gap-2 leading-snug">
                      <UserCheck className="w-5 h-5 text-[#005F3C] shrink-0" />
                      <span>Registro</span>
                    </h3>
                    <p className="text-[#6B5744] text-xs mt-1 leading-normal">
                      Completa los datos básicos para crear tu cuenta.
                    </p>
                  </div>

                  {regError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                      {regError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-nombre" className="block text-xs font-bold text-[#2C1A11] mb-1">
                        Nombre completo
                      </label>
                      <input
                        id="reg-nombre"
                        type="text"
                        value={regNombre}
                        onChange={(e) => setRegNombre(e.target.value)}
                        placeholder="Ej: Carlos Alberto Restrepo"
                        className={`${registerInputClass} px-3.5`}
                        disabled={regLoading}
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-cedula" className="block text-xs font-bold text-[#2C1A11] mb-1">
                        Cédula
                      </label>
                      <input
                        id="reg-cedula"
                        type="text"
                        value={regCedula}
                        onChange={(e) => setRegCedula(e.target.value)}
                        placeholder="Ej: 91234567"
                        className={`${registerInputClass} px-3.5`}
                        disabled={regLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-celular" className="block text-xs font-bold text-[#2C1A11] mb-1">
                        Celular / WhatsApp
                      </label>
                      <input
                        id="reg-celular"
                        type="text"
                        value={regCelular}
                        onChange={(e) => setRegCelular(e.target.value)}
                        placeholder="Ej: 311 234 5678"
                        className={`${registerInputClass} px-3.5`}
                        disabled={regLoading}
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-finca" className="block text-xs font-bold text-[#2C1A11] mb-1">
                        Nombre de la finca
                      </label>
                      <input
                        id="reg-finca"
                        type="text"
                        value={regNombreFinca}
                        onChange={(e) => setRegNombreFinca(e.target.value)}
                        placeholder="Ej: Finca San José"
                        className={`${registerInputClass} px-3.5`}
                        disabled={regLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-correo" className="block text-xs font-bold text-[#2C1A11] mb-1">
                      Correo electrónico
                    </label>
                    <input
                      id="reg-correo"
                      type="email"
                      value={regCorreo}
                      onChange={(e) => setRegCorreo(e.target.value)}
                      placeholder="Ej: productor@correo.com"
                      className={`${registerInputClass} px-3.5`}
                      disabled={regLoading}
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-password" className="block text-xs font-bold text-[#2C1A11] mb-1">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        id="reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className={`${registerInputClass} pl-3.5 pr-16`}
                        disabled={regLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        aria-label={showRegPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-[#2C1A11] hover:text-[#B84A00] cursor-pointer"
                      >
                        {showRegPassword ? 'Ocultar' : 'Ver'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full py-2.5 px-5 rounded-xl bg-[#B84A00] hover:bg-[#D95B00] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>{regLoading ? 'Creando cuenta...' : 'Crear cuenta'}</span>
                    {!regLoading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              )}

              {authMode === 'recover' && (
                <form onSubmit={handleRecoverSubmit} className="space-y-3.5">
                  <div className="pb-3 border-b border-[#E6DDD0]/80">
                    <h3 className="text-lg font-bold text-[#1C0D02] flex items-center gap-2 leading-snug">
                      <KeyRound className="w-5 h-5 text-[#B84A00] shrink-0" />
                      <span>Olvidó contraseña</span>
                    </h3>
                    <p className="text-[#6B5744] text-xs mt-1 leading-normal">
                      Verifica tu cédula y celular para asignar una nueva contraseña.
                    </p>
                  </div>

                  {recMessage && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                        recMessage.type === 'ok'
                          ? 'bg-emerald-50 border-emerald-300 text-[#005F3C]'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      {recMessage.type === 'ok' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                      <span>{recMessage.text}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-[#2C1A11] mb-1">
                      Cédula registrada
                    </label>
                    <input
                      type="text"
                      value={recCedula}
                      onChange={(e) => setRecCedula(e.target.value)}
                      placeholder="Ej: 1098765432"
                      className={`${loginInputClass} px-3.5`}
                      disabled={recLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C1A11] mb-1">
                      Celular / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={recCelular}
                      onChange={(e) => setRecCelular(e.target.value)}
                      placeholder="Ej: 310 555 4321"
                      className={`${loginInputClass} px-3.5`}
                      disabled={recLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C1A11] mb-1">
                      Nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={recNewPassword}
                      onChange={(e) => setRecNewPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className={`${loginInputClass} px-3.5`}
                      disabled={recLoading}
                    />
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="px-4 py-2.5 rounded-xl bg-[#FAF6F0] hover:bg-[#EFE6D8] border border-[#E6DDD0] text-[#2C1A11] font-bold text-xs cursor-pointer transition-colors"
                    >
                      Volver a Ingresar
                    </button>
                    <button
                      type="submit"
                      disabled={recLoading}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#5B8E76] hover:bg-[#4B7B65] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
                    >
                      <span>{recLoading ? 'Verificando...' : 'Restablecer contraseña'}</span>
                      {!recLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="h-2 shrink-0" aria-hidden="true" />
      </section>
    </div>
  );
};
