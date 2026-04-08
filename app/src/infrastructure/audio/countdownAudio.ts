async function createAudioContext(): Promise<AudioContext | null> {
  if (typeof window === 'undefined' || !('AudioContext' in window)) {
    return null;
  }

  const context = new AudioContext();
  if (context.state === 'suspended') {
    try {
      await context.resume();
    } catch {
      return null;
    }
  }
  return context;
}

function scheduleTone(context: AudioContext, frequency: number, duration: number, delaySec: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.0001;
  oscillator.connect(gain);
  gain.connect(context.destination);

  const startAt = context.currentTime + delaySec;
  gain.gain.exponentialRampToValueAtTime(0.2, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.01);
}

export async function playCountdownAudio(): Promise<void> {
  const context = await createAudioContext();
  if (!context) {
    return;
  }

  const sequence = [
    { duration: 0.08, delaySec: 0 },
    { duration: 0.08, delaySec: 1 },
    { duration: 0.08, delaySec: 2 },
    { duration: 0.35, delaySec: 3 }
  ];

  for (const item of sequence) {
    scheduleTone(context, 880, item.duration, item.delaySec);
  }
}

export async function playPhaseTransitionAudio(): Promise<void> {
  const context = await createAudioContext();
  if (!context) {
    return;
  }

  const sequence = [
    { duration: 0.08, delaySec: 0 },
    { duration: 0.08, delaySec: 1 },
    { duration: 0.08, delaySec: 2 },
    { duration: 0.35, delaySec: 3 }
  ];

  for (const item of sequence) {
    scheduleTone(context, 880, item.duration, item.delaySec);
  }
}
