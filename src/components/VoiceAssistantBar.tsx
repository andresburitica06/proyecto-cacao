import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Square, FastForward, Info } from 'lucide-react';
import { voiceAssistant } from '../services/voiceAssistant';

interface VoiceAssistantBarProps {
  currentScreenTitle: string;
  screenTextToRead: string;
}

export const VoiceAssistantBar: React.FC<VoiceAssistantBarProps> = ({
  currentScreenTitle,
  screenTextToRead
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [isMuted, setIsMuted] = useState(voiceAssistant.getMuted());
  const [speed, setSpeed] = useState(voiceAssistant.getRate());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = voiceAssistant.subscribe((speaking, text) => {
      setIsSpeaking(speaking);
      setCurrentText(text);
    });
    return unsubscribe;
  }, []);

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    voiceAssistant.setMuted(nextMute);
  };

  const handlePlayScreen = () => {
    const textToSpeak = `Estás en la pantalla: ${currentScreenTitle}. ${screenTextToRead}`;
    voiceAssistant.speak(textToSpeak, true);
  };

  const handleStop = () => {
    voiceAssistant.stop();
  };

  const handleChangeSpeed = () => {
    const newSpeed = speed === 0.8 ? 1.0 : 0.8;
    setSpeed(newSpeed);
    voiceAssistant.setRate(newSpeed);
  };

  return (
    <div className="sticky top-0 z-40 bg-amber-900 border-b-4 border-amber-700 text-amber-50 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          {/* Asistente de Voz Label & Screen Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayScreen}
              className={`p-2 sm:px-4 sm:py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-md text-base sm:text-lg border-2 cursor-pointer ${
                isSpeaking 
                  ? 'bg-amber-400 text-amber-950 border-amber-300 animate-pulse ring-4 ring-amber-300/50' 
                  : 'bg-amber-800 hover:bg-amber-700 text-amber-5 border-amber-600'
              }`}
            >
              <Volume2 className={`w-6 h-6 ${isSpeaking ? 'text-amber-950 animate-bounce' : 'text-amber-200'}`} />
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

          {/* Controls: Mute, Stop, Speed */}
          <div className="flex items-center gap-2">
            
            {/* Speed Toggle (Lento / Normal) */}
            <button
              type="button"
              onClick={handleChangeSpeed}
              title="Cambiar velocidad de lectura"
              className="px-3 py-1.5 rounded-xl bg-amber-950 hover:bg-amber-800 text-amber-200 border border-amber-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FastForward className="w-4 h-4 text-amber-400" />
              <span>{speed < 1.0 ? '🐢 Voz Lenta' : '⚡ Voz Normal'}</span>
            </button>

            {/* Detener lectura */}
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

            {/* Mutear / Silenciar */}
            <button
              type="button"
              onClick={handleToggleMute}
              title={isMuted ? 'Activar sonido del asistente' : 'Silenciar sonido del asistente'}
              className={`p-2 rounded-xl font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-rose-900/90 text-rose-200 border-rose-600 hover:bg-rose-800'
                  : 'bg-emerald-800 text-emerald-100 border-emerald-600 hover:bg-emerald-700'
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

            {/* Info modal trigger toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl bg-amber-950/60 hover:bg-amber-950 text-amber-200 border border-amber-700 cursor-pointer"
              title="Instrucciones para campesinos"
            >
              <Info className="w-5 h-5" />
            </button>

          </div>
        </div>

        {/* Helpful Info bar for farmers */}
        {isExpanded && (
          <div className="mt-3 p-3 bg-amber-950/90 border-2 border-amber-600 rounded-2xl text-amber-100 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
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
