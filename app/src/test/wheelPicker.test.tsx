import { render, fireEvent, screen } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WheelPicker } from '../ui/components/WheelPicker';

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WheelPicker', () => {
  it('updates the selected value from scroll position without requiring a row click', () => {
    function Harness() {
      const [value, setValue] = useState(20);
      return (
        <>
          <WheelPicker value={value} min={20} max={30} onChange={setValue} />
          <output data-testid="selected-value">{value}</output>
        </>
      );
    }

    render(<Harness />);

    const scroller = screen.getByTestId('wheel-picker-scroll') as HTMLDivElement;
    scroller.scrollTop = 144;
    fireEvent.scroll(scroller);

    expect(screen.getByTestId('selected-value').textContent).toBe('23');
  });
});
