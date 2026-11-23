/**
 * Botón reutilizable de ayuda por voz.
 * Permite leer en voz alta una explicación o texto de apoyo en cualquier pantalla del sistema.
 */
import React from 'react';
import { Volume2 } from 'lucide-react';
import { voiceAssistant } from '../services/voiceAssistant';

// Propiedades de configuración del botón de ayuda por voz
interface VoiceHelpButtonProps {
  textToRead: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VoiceHelpButton: React.FC<VoiceHelpButtonProps> = ({
  textToRead,
  label,
  size = 'md',
  className = ''
}) => {
  // Evita que el clic se propague al contenedor padre y reproduce el texto con el asistente de voz
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    voiceAssistant.speak(textToRead, true);
  };

  // Clases de tamaño según la variante seleccionada (pequeño, mediano o grande)
  const buttonSizeClasses = {
    sm: 'p-1.5 text-xs gap-1',
    md: 'p-2.5 text-sm font-semibold gap-1.5',
    lg: 'px-4 py-3 text-base font-bold gap-2'
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Escuchar explicación en voz alta"
      aria-label={`Escuchar en voz alta: ${textToRead}`}
      className={`inline-flex items-center justify-center rounded-xl bg-amber-100 border-2 border-amber-600 text-amber-950 hover:bg-amber-200 active:scale-95 transition-all shadow-sm focus:ring-4 focus:ring-amber-400 focus:outline-none cursor-pointer ${buttonSizeClasses[size]} ${className}`}
    >
      {/* Ícono de parlante adaptado al tamaño del botón */}
      <Volume2 className={size === 'sm' ? 'w-4 h-4 text-amber-700 animate-pulse' : size === 'lg' ? 'w-6 h-6 text-amber-800' : 'w-5 h-5 text-amber-800'} />
      {/* Etiqueta textual opcional junto al ícono */}
      {label && <span>{label}</span>}
    </button>
  );
};
