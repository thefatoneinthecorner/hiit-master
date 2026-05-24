import { useState } from 'preact/hooks';

import type { ComparisonRound, HeartRateSample } from '../../domain/shared/types';
import { CollapsiblePanel } from './CollapsiblePanel';
import { HeartGraph } from './HeartGraph';
import { RecoveryHistogram } from './RecoveryHistogram';
import { SessionController } from './SessionController';
import { SessionDetails } from './SessionDetails';

interface SessionDisplayProps {
  title?: string;
  roundName: string;
  countdownSeconds: number;
  remainingSeconds: number;
  timingEmphasis?: 'work' | 'recovery';
  bpm: number | null;
  pulseActive?: boolean;
  pulseBeating?: boolean;
  pulseBeatKey?: string | number;
  sensorName: string | null | undefined;
  batteryPercent: number | null | undefined;
  playing?: boolean;
  onBluetooth: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  samples: HeartRateSample[];
  totalDurationSec: number;
  nominalPeakHeartrate: number;
  scrubElapsedSec?: number | null;
  recoveryRounds: ComparisonRound[];
  roundDurationsSec?: number[];
  roundEndElapsedSec?: number[];
  recoveryScaleMaxAbs?: number;
  onScrubPointerMove?: (clientX: number, containerRect: DOMRect) => void;
  onOpenHistory?: () => void;
  sessionControllerVisible?: boolean;
}

export function SessionDisplay({
  title,
  roundName,
  countdownSeconds,
  remainingSeconds,
  timingEmphasis = 'recovery',
  bpm,
  pulseActive = false,
  pulseBeating = pulseActive,
  pulseBeatKey,
  sensorName,
  batteryPercent,
  playing = true,
  onBluetooth,
  onPlay,
  onPause,
  onStop,
  samples,
  totalDurationSec,
  nominalPeakHeartrate,
  scrubElapsedSec = null,
  recoveryRounds,
  roundDurationsSec,
  roundEndElapsedSec,
  recoveryScaleMaxAbs,
  onScrubPointerMove,
  onOpenHistory,
  sessionControllerVisible = true
}: SessionDisplayProps) {
  const [sessionControllerOpen, setSessionControllerOpen] = useState(sessionControllerVisible);
  const sessionControllerPanelId = 'session-display-session-controller';

  return (
    <section
      class="grid w-full gap-3"
      onMouseMove={(event) => onScrubPointerMove?.(event.clientX, event.currentTarget.getBoundingClientRect())}
    >
      {title ? <h2 class="text-2xl font-semibold">{title}</h2> : null}
      <SessionDetails
        open={sessionControllerOpen}
        onToggle={() => setSessionControllerOpen((current) => !current)}
        timeRemaining={formatSessionDisplaySeconds(countdownSeconds)}
        bpm={bpm ?? '--'}
        remainingValue={formatSessionDisplaySeconds(remainingSeconds)}
        primaryTitle={roundName}
        remainingTitle="Remaining"
        label={sessionControllerOpen ? 'Hide session controller' : 'Show session controller'}
        controls={sessionControllerPanelId}
        pulseActive={pulseActive}
        pulseBeating={pulseBeating}
        {...(pulseBeatKey !== undefined ? { pulseBeatKey } : {})}
      />
      <div id={sessionControllerPanelId} data-testid="session-display-session-controller">
        <CollapsiblePanel open={sessionControllerOpen}>
          <SessionController
            sensorName={sensorName}
            batteryPercent={batteryPercent}
            playing={playing}
            onBluetooth={onBluetooth}
            onPlay={onPlay}
            onPause={onPause}
            onStop={onStop}
          />
        </CollapsiblePanel>
      </div>
      <HeartGraph
        samples={samples}
        totalDurationSec={totalDurationSec}
        nominalPeakHeartrate={nominalPeakHeartrate}
        scrubElapsedSec={scrubElapsedSec}
        heightClassName="h-40"
        timeScale="duration"
        {...(onOpenHistory ? { onClick: onOpenHistory } : {})}
      />
      <RecoveryHistogram
        rounds={recoveryRounds}
        {...(roundDurationsSec ? { roundDurationsSec } : {})}
        {...(roundEndElapsedSec ? { roundEndElapsedSec, timelineDurationSec: totalDurationSec } : {})}
        scrubElapsedSec={scrubElapsedSec}
        heightClassName="h-20"
        showEmptyState
        {...(recoveryScaleMaxAbs !== undefined ? { scaleMaxAbs: recoveryScaleMaxAbs } : {})}
        {...(onOpenHistory ? { onClick: onOpenHistory } : {})}
      />
    </section>
  );
}

function formatSessionDisplaySeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
