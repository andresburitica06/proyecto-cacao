/**
 * Servicio del Lector de Voz / Asistente de Audio para Campesinos.
 * Utiliza la Web Speech Synthesis API nativa del navegador en idioma español
 * para guiar al usuario mediante lectura en voz alta y persistir sus preferencias.
 */

class VoiceAssistantService {
  // Instancia nativa de síntesis de voz del navegador (null en entornos sin soporte)
  private synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  // Referencia a la locución actualmente en reproducción
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  // Indica si el asistente está silenciado
  private isMuted: boolean = false;
  private rate: number = 0.9; // Velocidad pausada ideal para la zona rural
  // Suscriptores que escuchan cambios en el estado de reproducción y el texto actual
  private activeListeners: Array<(isSpeaking: boolean, currentText: string) => void> = [];
  // Texto que se está leyendo en el momento
  private speakingText: string = '';

  /** Inicializa el servicio restaurando silencio y velocidad guardados en localStorage. */
  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('cacao_voice_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedRate = localStorage.getItem('cacao_voice_rate');
      if (savedRate !== null) {
        this.rate = parseFloat(savedRate) || 0.9;
      }
    }
  }

  /** Indica si el navegador soporta síntesis de voz. */
  public isSupported(): boolean {
    return this.synth !== null;
  }

  /** Devuelve si el asistente se encuentra silenciado. */
  public getMuted(): boolean {
    return this.isMuted;
  }

  /** Activa o desactiva el silencio, guarda la preferencia y detiene la lectura si se silencia. */
  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cacao_voice_muted', muted ? 'true' : 'false');
    }
    if (muted) {
      this.stop();
    }
  }

  /** Devuelve la velocidad actual de reproducción de voz. */
  public getRate(): number {
    return this.rate;
  }

  /** Actualiza la velocidad de lectura y la persiste en localStorage. */
  public setRate(rate: number) {
    this.rate = rate;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cacao_voice_rate', rate.toString());
    }
  }

  /** Suscribe un listener a los cambios de estado de voz y devuelve la función para desuscribirse. */
  public subscribe(listener: (isSpeaking: boolean, currentText: string) => void) {
    this.activeListeners.push(listener);
    // Emite el estado actual inmediatamente al suscribirse
    listener(this.synth?.speaking || false, this.speakingText);
    return () => {
      this.activeListeners = this.activeListeners.filter(l => l !== listener);
    };
  }

  /** Notifica a todos los suscriptores el estado de reproducción y el texto en curso. */
  private notify(isSpeaking: boolean, text: string = '') {
    this.speakingText = text;
    this.activeListeners.forEach(l => l(isSpeaking, text));
  }

  /**
   * Reproduce en voz alta el texto indicado.
   * Si `force` es true, reproduce incluso cuando el asistente está silenciado.
   */
  public speak(text: string, force: boolean = false) {
    if (!this.synth) return;
    if (this.isMuted && !force) return;

    // Detener lectura previa
    this.synth.cancel();

    if (!text || text.trim() === '') {
      this.notify(false, '');
      return;
    }

    // Normaliza símbolos y abreviaturas comunes para una pronunciación más natural en español
    const cleanText = text
      .replace(/[$]/g, ' pesos ')
      .replace(/kg/gi, ' kilos ')
      .replace(/ha/gi, ' hectáreas ')
      .replace(/vs/gi, ' contra ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = this.rate;
    utterance.pitch = 1.0;
    utterance.lang = 'es-CO'; // Español Colombia preferente, fallback a es-ES / es

    // Seleccionar una voz en español si está disponible
    const voices = this.synth.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith('es-CO') || v.lang.startsWith('es-MX') || v.lang.startsWith('es'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    // Eventos del ciclo de vida de la locución para actualizar la interfaz
    utterance.onstart = () => {
      this.notify(true, cleanText);
    };

    utterance.onend = () => {
      this.notify(false, '');
    };

    utterance.onerror = (e) => {
      console.warn('Error en lectura de voz:', e);
      this.notify(false, '');
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  /** Pausa la lectura actual si está en curso. */
  public pause() {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
      this.notify(false, this.speakingText);
    }
  }

  /** Reanuda la lectura si se encontraba en pausa. */
  public resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.notify(true, this.speakingText);
    }
  }

  /** Cancela cualquier lectura en curso y limpia el estado actual. */
  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.notify(false, '');
    }
  }

  /** Lee una instrucción guiada para un campo de formulario con su texto de ayuda opcional. */
  public speakFieldInstruction(label: string, helperText?: string) {
    const textToSpeak = helperText 
      ? `Campo: ${label}. ${helperText}`
      : `Campo para ingresar: ${label}`;
    this.speak(textToSpeak);
  }
}

/** Instancia única (singleton) del asistente de voz compartida en toda la aplicación. */
export const voiceAssistant = new VoiceAssistantService();
