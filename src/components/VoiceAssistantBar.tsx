/**
 * Barra superior fija del asistente de voz.
 * Permite leer el contenido de la pantalla actual, pausar la lectura,
 * cambiar la velocidad de voz, silenciar el audio y desplegar instrucciones de uso.
 */
import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Square, FastForward, Info, Check, AudioLines } from 'lucide-react';
import { voiceAssistant } from '../services/voiceAssistant';

// Propiedades que indican el título y el texto descriptivo de la pantalla activa
interface VoiceAssistantBarProps {
  currentScreenTitle: string;
  screenTextToRead: string;
  variant?: 'bar' | 'inline-light';
}

export const VoiceAssistantBar: React.FC<VoiceAssistantBarProps> = ({
  currentScreenTitle,
  screenTextToRead,
  variant = 'bar',
}) => {
  // Estados de reproducción, texto en curso, silencio, velocidad y panel informativo
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [isMuted, setIsMuted] = useState(voiceAssistant.getMuted());
  const [speed, setSpeed] = useState(voiceAssistant.getRate());
  const [isExpanded, setIsExpanded] = useState(false);

  // Suscripción al servicio de voz para reflejar en tiempo real cuándo está hablando
  useEffect(() => {
    const unsubscribe = voiceAssistant.subscribe((speaking, text) => {
      setIsSpeaking(speaking);
      setCurrentText(text);
    });
    return unsubscribe;
  }, []);

  // Alterna el estado de silencio global del asistente de voz
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    voiceAssistant.setMuted(nextMute);
  };

  // Lee en voz alta el título y la explicación de la pantalla actual
  const handlePlayScreen = () => {
    const textToSpeak = `Estás en la pantalla: ${currentScreenTitle}. ${screenTextToRead}`;
    voiceAssistant.speak(textToSpeak, true);
  };

  // Detiene inmediatamente la lectura de voz en curso
  const handleStop = () => {
    voiceAssistant.stop();
  };

  // Alterna entre velocidad lenta (0.8) y velocidad normal (1.0)
  const handleChangeSpeed = () => {
    const newSpeed = speed === 0.8 ? 1.0 : 0.8;
    setSpeed(newSpeed);
    voiceAssistant.setRate(newSpeed);
  };

  if (variant === 'inline-light') {
    return (
      <div className="relative flex flex-col items-end gap-2">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handlePlayScreen}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-2xs ${
              isSpeaking
                ? 'bg-[#F3D7C4] text-[#8E3600] border-[#D3845E] ring-2 ring-[#D3845E]/30'
                : 'bg-[#FBF1EA] hover:bg-[#F7E5D8] text-[#A34818] border-[#E8B89A]'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 shrink-0" />
            <span>Escuchar Pantalla</span>
          </button>

          <button
            type="button"
            onClick={handleChangeSpeed}
            title="Cambiar velocidad de lectura"
            className="px-3.5 py-1.5 rounded-full bg-[#F4EFE6] hover:bg-[#EAE1D3] text-[#3E2D23] border border-[#DDD3C5] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <AudioLines className="w-3.5 h-3.5 text-[#5C4A38] shrink-0" />
            <span>{speed < 1.0 ? 'Voz Lenta' : 'Voz Normal'}</span>
          </button>

          {isSpeaking && (
            <button
              type="button"
              onClick={handleStop}
              title="Detener voz"
              className="px-3 py-1.5 rounded-full bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Pausar Voz</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleMute}
            title={isMuted ? 'Activar sonido del asistente' : 'Silenciar sonido del asistente'}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isMuted
                ? 'bg-rose-700 hover:bg-rose-600 text-white border-rose-600'
                : 'bg-[#82AD91] hover:bg-[#709C80] text-white border-[#729D81]'
            }`}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 shrink-0" />
                <span>Silenciado</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Sonido Activo</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title="Instrucciones del sistema"
            aria-label="Instrucciones de ayuda por voz"
            className="w-7 h-7 rounded-full border border-[#DDD3C5] bg-[#FAF6F0] hover:bg-[#EFE7DA] text-[#3E2D23] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        {isExpanded && (
          <div className="max-w-sm p-3.5 bg-white border border-[#E6DDD0] rounded-2xl text-[#2C1A11] text-xs shadow-lg flex items-start justify-between gap-3 animate-fadeIn">
            <div className="space-y-1">
              <p className="font-bold text-[#1C0D02]">¿Cómo funciona la ayuda de voz?</p>
              <p className="text-[#5C4A38] leading-relaxed">
                Presiona <strong>Escuchar Pantalla</strong> para oír en voz alta las instrucciones y los campos disponibles en esta vista.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-2.5 py-1 rounded-lg bg-[#B84A00] hover:bg-[#D95B00] text-white font-bold text-[11px] cursor-pointer shrink-0"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-40 bg-[#2C1A11] border-b-2 border-[#B84A00] text-[#FAF6F0] shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          {/* Botón principal para escuchar la pantalla e indicador del texto que se está leyendo */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayScreen}
              className={`p-2 sm:px-4 sm:py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm text-sm sm:text-base border cursor-pointer ${
                isSpeaking 
                  ? 'bg-amber-200 text-[#1C0D02] border-amber-400 animate-pulse ring-2 ring-amber-400/70' 
                  : 'bg-amber-400 hover:bg-amber-300 text-[#1C0D02] border-amber-300'
              }`}
            >
              <Volume2 className="w-5 h-5 text-[#1C0D02]" />
              <span className="hidden xs:inline">Asistente de Voz:</span>
              <span className="underline decoration-2 underline-offset-2 font-extrabold">Escuchar Pantalla</span>
            </button>

            {isSpeaking && (
              <div className="hidden md:flex items-center gap-2 bg-amber-950/80 px-3 py-1.5 rounded-xl border border-amber-700 text-xs sm:text-sm text-amber-200 max-w-xs lg:max-w-md truncate">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="truncate">{currentText}</span>
              </div>
            )}
          </div>

          {/* Controles rápidos: velocidad, detener lectura, silenciar e información */}
          <div className="flex items-center gap-2">
            
            {/* Cambio de velocidad de lectura (lenta / normal) */}
            <button
              type="button"
              onClick={handleChangeSpeed}
              title="Cambiar velocidad de lectura"
              className="px-3 py-1.5 rounded-xl bg-[#1C0D02] hover:bg-[#3A2216] text-amber-100 border border-[#5C3A24] text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FastForward className="w-4 h-4 text-amber-400" />
              <span>{speed < 1.0 ? '🐢 Voz Lenta' : '⚡ Voz Normal'}</span>
            </button>

            {/* Botón para detener la lectura cuando el asistente está hablando */}
            {isSpeaking && (
              <button
                type="button"
                onClick={handleStop}
                title="Detener voz"
                className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm border border-rose-500 cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
                <span className="hidden sm:inline">Pausar Voz</span>
              </button>
            )}

            {/* Botón para activar o silenciar el sonido del asistente */}
            <button
              type="button"
              onClick={handleToggleMute}
              title={isMuted ? 'Activar sonido del asistente' : 'Silenciar sonido del asistente'}
              className={`p-2 rounded-xl font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-rose-900/90 text-rose-100 border-rose-500 hover:bg-rose-800'
                  : 'bg-[#005F3C] hover:bg-[#007A4D] text-white border-emerald-400/50'
              }`}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-5 h-5 text-rose-300" />
                  <span className="text-xs sm:text-sm hidden sm:inline">Silenciado</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5 text-emerald-300" />
                  <span className="text-xs sm:text-sm hidden sm:inline">Sonido Activo</span>
                </>
              )}
            </button>

            {/* Botón para desplegar u ocultar las instrucciones de ayuda */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl bg-[#1C0D02] hover:bg-[#3A2216] text-amber-200 border border-[#5C3A24] cursor-pointer"
              title="Instrucciones para campesinos"
            >
              <Info className="w-5 h-5" />
            </button>

          </div>
        </div>

        {/* Panel desplegable con explicación sencilla del asistente de voz */}
        {isExpanded && (
          <div className="mt-3 p-3 bg-[#1C0D02] border border-[#5C3A24] rounded-2xl text-amber-50 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-2">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-bold text-amber-300 text-base">¿Cómo funciona la ayuda de voz?</p>
                <p className="text-xs sm:text-sm text-amber-100">
                  Presiona el botón verde con el parlante 🔊 que encuentres en cualquier casilla o pantalla para que el sistema le lea los números, títulos o botones en voz alta.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="px-3 py-1 rounded-lg bg-amber-800 hover:bg-amber-700 text-amber-100 text-xs font-bold border border-amber-600 cursor-pointer self-end sm:self-center"
            >
              Entendido
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
