import { useCallback, useRef } from 'react';

// Audio context singleton
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

// Create oscillator-based sound effects
export const createSound = (
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain: number = 0.3
) => {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  
  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
};

// Predefined sounds
export const sounds = {
  hover: () => createSound(800, 0.05, 'sine', 0.1),
  click: () => createSound(600, 0.1, 'square', 0.2),
  success: () => {
    createSound(523, 0.1, 'sine', 0.3); // C5
    setTimeout(() => createSound(659, 0.1, 'sine', 0.3), 100); // E5
    setTimeout(() => createSound(784, 0.2, 'sine', 0.3), 200); // G5
  },
  error: () => {
    createSound(300, 0.2, 'sawtooth', 0.3);
    setTimeout(() => createSound(200, 0.3, 'sawtooth', 0.2), 100);
  },
  process: () => createSound(440, 0.05, 'triangle', 0.15),
};

// React hook for sound effects
export const useSoundEffects = () => {
  const isEnabledRef = useRef(true);
  
  const playSound = useCallback((soundName: keyof typeof sounds) => {
    if (isEnabledRef.current) {
      try {
        sounds[soundName]();
      } catch (e) {
        console.warn('Sound playback failed:', e);
      }
    }
  }, []);
  
  const toggleSound = useCallback(() => {
    isEnabledRef.current = !isEnabledRef.current;
  }, []);
  
  return { playSound, toggleSound, isEnabled: isEnabledRef.current };
}; 