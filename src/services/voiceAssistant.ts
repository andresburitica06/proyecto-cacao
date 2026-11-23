/**
 * Servicio del Lector de Voz / Asistente de Audio para Campesinos
 * Utiliza Web Speech Synthesis API nativa del navegador en idioma español.
 */

class VoiceAssistantService {
  private synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isMuted: boolean = false;
  private rate: number = 0.9; // Velocidad pausada ideal para la zona rural
  private activeListeners: Array<(isSpeaking: boolean, currentText: string) => void> = [];
  private speakingText: string = '';

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

  public isSupported(): boolean {
    return this.synth !== null;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cacao_voice_muted', muted ? 'true' : 'false');
    }
    if (muted) {
      this.stop();
    }
  }

  public getRate(): number {
    return this.rate;
  }

  public setRate(rate: number) {
    this.rate = rate;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cacao_voice_rate', rate.toString());
    }
  }

  public subscribe(listener: (isSpeaking: boolean, currentText: string) => void) {
    this.activeListeners.push(listener);
    // emit current state immediately
    listener(this.synth?.speaking || false, this.speakingText);
    return () => {
      this.activeListeners = this.activeListeners.filter(l => l !== listener);
    };
  }

  private notify(isSpeaking: boolean, text: string = '') {
    this.speakingText = text;
    this.activeListeners.forEach(l => l(isSpeaking, text));
  }

  public speak(text: string, force: boolean = false) {
    if (!this.synth) return;
    if (this.isMuted && !force) return;

    // Detener lectura previa
    this.synth.cancel();

    if (!text || text.trim() === '') {
      this.notify(false, '');
      return;
    }

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

  public pause() {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
      this.notify(false, this.speakingText);
    }
  }

  public resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.notify(true, this.speakingText);
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.notify(false, '');
    }
  }

  public speakFieldInstruction(label: string, helperText?: string) {
    const textToSpeak = helperText 
      ? `Campo: ${label}. ${helperText}`
      : `Campo para ingresar: ${label}`;
    this.speak(textToSpeak);
  }
}

export const voiceAssistant = new VoiceAssistantService();
