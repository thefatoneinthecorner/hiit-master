import { useEffect, useRef } from 'preact/hooks';

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  disabled?: boolean;
  suffix?: string;
}

export function Stepper({ value, onChange, min = 1, disabled = false, suffix = 's' }: StepperProps) {
  const repeatTimerRef = useRef<number | null>(null);
  const holdDelayRef = useRef<number | null>(null);
  const valueRef = useRef(value);
  const longPressActiveRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const activeDirectionRef = useRef<-1 | 1 | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const pressCanceledRef = useRef(false);

  valueRef.current = value;

  useEffect(
    () => () => {
      cleanupPointerListeners();
      cancelPress();
    },
    []
  );

  function stopRepeat() {
    if (repeatTimerRef.current !== null) {
      window.clearInterval(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
  }

  function stopHoldDelay() {
    if (holdDelayRef.current !== null) {
      window.clearTimeout(holdDelayRef.current);
      holdDelayRef.current = null;
    }
  }

  function applyDelta(direction: -1 | 1, step: number) {
    const nextValue = Math.max(min, valueRef.current + direction * step);
    valueRef.current = nextValue;
    onChange(nextValue);
  }

  function startRepeat(direction: -1 | 1) {
    stopRepeat();
    repeatTimerRef.current = window.setInterval(() => {
      applyDelta(direction, 5);
    }, 180);
  }

  function handlePointerDown(direction: -1 | 1) {
    if (disabled) {
      return;
    }

    activeDirectionRef.current = direction;
    longPressActiveRef.current = false;
    pressCanceledRef.current = false;
    stopHoldDelay();
    holdDelayRef.current = window.setTimeout(() => {
      longPressActiveRef.current = true;
      applyDelta(direction, 5);
      startRepeat(direction);
    }, 300);
  }

  function cancelPress() {
    stopHoldDelay();
    stopRepeat();
    longPressActiveRef.current = false;
    activePointerIdRef.current = null;
    activeDirectionRef.current = null;
  }

  function cleanupPointerListeners() {
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
    window.removeEventListener('pointercancel', handleWindowPointerCancel);
  }

  function handlePressEnd(direction: -1 | 1) {
    if (disabled) {
      return;
    }

    if (activeDirectionRef.current !== direction) {
      return;
    }

    const wasLongPress = longPressActiveRef.current;
    const wasCanceled = pressCanceledRef.current;
    cancelPress();

    if (!wasLongPress && !wasCanceled) {
      applyDelta(direction, 1);
    }
  }

  const buttonClass =
    'stepper-button h-11 w-11 rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] text-xl font-semibold text-[color:var(--ink)] disabled:cursor-default disabled:opacity-40';

  function handleWindowPointerMove(event: PointerEvent) {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    const deltaY = Math.abs(event.clientY - startYRef.current);
    const deltaX = Math.abs(event.clientX - startXRef.current);

    if (deltaY > 10 && deltaY > deltaX) {
      pressCanceledRef.current = true;
      cleanupPointerListeners();
      cancelPress();
    }
  }

  function handleWindowPointerUp(event: PointerEvent) {
    if (activePointerIdRef.current !== event.pointerId || activeDirectionRef.current === null) {
      return;
    }

    const direction = activeDirectionRef.current;
    cleanupPointerListeners();
    handlePressEnd(direction);
  }

  function handleWindowPointerCancel(event: PointerEvent) {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    pressCanceledRef.current = true;
    cleanupPointerListeners();
    cancelPress();
  }

  function beginPress(event: PointerEvent, direction: -1 | 1) {
    activePointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    cleanupPointerListeners();
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerCancel);
    handlePointerDown(direction);
  }

  return (
    <div class="flex items-center gap-3 select-none">
      <button
        class={buttonClass}
        disabled={disabled}
        onClick={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => beginPress(event, -1)}
        aria-label="Decrease"
        type="button"
      >
        -
      </button>
      <div class="min-w-20 text-center text-lg font-semibold">{formatStepperValue(value, suffix)}</div>
      <button
        class={buttonClass}
        disabled={disabled}
        onClick={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => beginPress(event, 1)}
        aria-label="Increase"
        type="button"
      >
        +
      </button>
    </div>
  );
}

function formatStepperValue(value: number, suffix: string) {
  if (!suffix) {
    return String(value);
  }

  return suffix === 's' ? `${value}s` : `${value} ${suffix}`;
}
