import type { JSX } from 'preact';
import { useRef, useState } from 'preact/hooks';

export type LayeredHeartGraphPointerMovementMode = 'jump' | 'relative';
export type LayeredHeartGraphPointerProps = Pick<
  JSX.HTMLAttributes<HTMLDivElement>,
  'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'
>;

interface UseLayeredHeartGraphPointerXOptions {
  /**
   * Initial x position in graph-space units. With the default width of 100,
   * this is equivalent to a percentage across the graph.
   */
  initialX: number;
  /**
   * Graph-space width used for clamping and pointer conversion.
   * The default is 100, so returned x values are percentage-like.
   */
  width?: number;
  movementMode?: LayeredHeartGraphPointerMovementMode;
  onXChange?: (x: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function useLayeredHeartGraphPointerX({
  initialX,
  width = 100,
  movementMode = 'jump',
  onXChange,
}: UseLayeredHeartGraphPointerXOptions): {
  x: number;
  pointerProps: LayeredHeartGraphPointerProps;
} {
  const [x, setX] = useState(initialX);
  const activePointerIdRef = useRef<number | null>(null);
  const dragStartClientXRef = useRef(0);
  const dragStartXRef = useRef(initialX);
  const dragStartWidthRef = useRef(1);
  const xRef = useRef(initialX);

  const updateX = (nextX: number) => {
    const clampedX = clamp(nextX, 0, width);
    xRef.current = clampedX;
    setX(clampedX);
    onXChange?.(clampedX);
  };

  const getLocalX = (event: PointerEvent): number => {
    const bounds = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / Math.max(bounds.width, 1);

    return clamp(ratio * width, 0, width);
  };

  const pointerProps: LayeredHeartGraphPointerProps = {
    onPointerDown: (event: PointerEvent) => {
      event.preventDefault();
      activePointerIdRef.current = event.pointerId;
      dragStartClientXRef.current = event.clientX;
      dragStartXRef.current = xRef.current;
      dragStartWidthRef.current = Math.max((event.currentTarget as HTMLDivElement).getBoundingClientRect().width, 1);

      try {
        (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
      } catch {
        // Synthetic pointer events in tests may not have an active browser pointer.
      }

      if (movementMode === 'jump') {
        updateX(getLocalX(event));
      }
    },
    onPointerMove: (event: PointerEvent) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      if (event.pointerType !== 'touch' && event.buttons !== 1) {
        return;
      }

      if (movementMode === 'jump') {
        updateX(getLocalX(event));
        return;
      }

      const deltaX = ((event.clientX - dragStartClientXRef.current) / dragStartWidthRef.current) * width;
      updateX(dragStartXRef.current + deltaX);
    },
    onPointerUp: (event: PointerEvent) => {
      activePointerIdRef.current = null;
      if ((event.currentTarget as HTMLDivElement).hasPointerCapture(event.pointerId)) {
        (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
      }
    },
    onPointerCancel: (event: PointerEvent) => {
      activePointerIdRef.current = null;
      if ((event.currentTarget as HTMLDivElement).hasPointerCapture(event.pointerId)) {
        (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
      }
    },
  };

  return { x, pointerProps };
}
