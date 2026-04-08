export type CountdownAudioController = {
  playCountdownCue: () => () => void;
};

const shortBeepDurationSec = 0.09;
const longBeepDurationSec = 0.45;
const beepSpacingSec = 0.55;
const beepFrequencyHz = 880;

export function createCountdownAudioController(): CountdownAudioController {
  return {
    playCountdownCue: () => {
      const AudioContextCtor = getAudioContextCtor();

      if (AudioContextCtor === null) {
        return () => {};
      }

      const audioContext = new AudioContextCtor();
      const timeoutIds: number[] = [];
      const durations = [
        shortBeepDurationSec,
        shortBeepDurationSec,
        shortBeepDurationSec,
        longBeepDurationSec,
      ];

      void audioContext.resume().catch(() => undefined);

      durations.forEach((durationSec, index) => {
        const timeoutId = window.setTimeout(() => {
          playBeep(audioContext, durationSec);
        }, Math.round(index * beepSpacingSec * 1000));

        timeoutIds.push(timeoutId);
      });

      return () => {
        timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
        void audioContext.close().catch(() => undefined);
      };
    },
  };
}

function getAudioContextCtor() {
  if (typeof window === 'undefined') {
    return null;
  }

  const audioWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };

  return globalThis.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

function playBeep(audioContext: AudioContext, durationSec: number) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = beepFrequencyHz;
  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    audioContext.currentTime + durationSec,
  );

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + durationSec + 0.02);
}
