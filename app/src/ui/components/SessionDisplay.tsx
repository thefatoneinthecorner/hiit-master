import { useState } from 'preact/hooks';

import type { ComparisonRound, HeartRateSample } from '../../domain/shared/types';
import { CollapsiblePanel } from './CollapsiblePanel';
import { LayeredHeartGraph, SvgLayerPortal } from './LayeredHeartGraph';
import { RecoveryHistogram } from './RecoveryHistogram';
import { SessionController } from './SessionController';
import { SessionDetails } from './SessionDetails';

interface SessionDisplayProps {
  settingsMode?: 'duration' | 'bpm';
  title?: string;
  roundName: string;
  countdownSeconds: number;
  targetBpm?: number | null;
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
  settingsMode = 'duration',
  title,
  roundName,
  countdownSeconds,
  targetBpm = null,
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
  const primaryValue = settingsMode === 'bpm' && targetBpm !== null
    ? String(targetBpm)
    : formatSessionDisplaySeconds(countdownSeconds);

  return (
    <section
      class="grid w-full gap-3"
      onMouseMove={(event) => onScrubPointerMove?.(event.clientX, event.currentTarget.getBoundingClientRect())}
    >
      {title ? <h2 class="text-2xl font-semibold">{title}</h2> : null}
      <SessionDetails
        open={sessionControllerOpen}
        onToggle={() => setSessionControllerOpen((current) => !current)}
        timeRemaining={primaryValue}
        bpm={bpm ?? '--'}
        primaryTitle={roundName}
        label={sessionControllerOpen ? 'Hide session controller' : 'Show session controller'}
        controls={sessionControllerPanelId}
        pulseActive={pulseActive}
        pulseBeating={pulseBeating}
        {...(settingsMode === 'duration'
          ? {
            remainingTitle: 'Remaining',
            remainingValue: formatSessionDisplaySeconds(remainingSeconds),
          }
          : {})}
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
      <SessionDisplayLayeredHeartGraph
        samples={samples}
        totalDurationSec={totalDurationSec}
        nominalPeakHeartrate={nominalPeakHeartrate}
        scrubElapsedSec={scrubElapsedSec}
        {...(onOpenHistory ? { onClick: onOpenHistory } : {})}
      />
      {settingsMode === 'duration' ? (
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
      ) : null}
    </section>
  );
}

function formatSessionDisplaySeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

interface SessionDisplayLayeredHeartGraphProps {
  samples: HeartRateSample[];
  totalDurationSec: number;
  nominalPeakHeartrate: number;
  scrubElapsedSec?: number | null;
  onClick?: () => void;
}

function getLayeredGraphRange(samples: HeartRateSample[], nominalPeakHeartrate: number) {
  const values = samples.filter((sample) => sample.bpm !== null).map((sample) => sample.bpm as number);
  const maxBpm = values.length > 0 ? Math.max(nominalPeakHeartrate, ...values) : nominalPeakHeartrate;
  const minBpm = values.length > 0 ? Math.min(...values) : 50;

  return {
    min: Math.min(50, minBpm),
    max: Math.ceil(maxBpm / 10) * 10,
  };
}

function SessionDisplayLayeredHeartGraph({
  samples,
  totalDurationSec,
  nominalPeakHeartrate,
  scrubElapsedSec = null,
  onClick,
}: SessionDisplayLayeredHeartGraphProps) {
  const width = 100;
  const height = 42;
  const validSamples = samples.filter((sample) => sample.bpm !== null);
  const { min, max } = getLayeredGraphRange(samples, nominalPeakHeartrate);
  const points = validSamples.length === 0
    ? `0,${height} ${width},${height}`
    : validSamples
      .map((sample) => {
        const x = (sample.elapsedSec / Math.max(totalDurationSec, 1)) * width;
        const y = height - (((sample.bpm as number) - min) / Math.max(max - min, 1)) * height;

        return `${x},${y}`;
      })
      .join(' ');
  const scrubX = scrubElapsedSec !== null && scrubElapsedSec !== undefined
    ? (scrubElapsedSec / Math.max(totalDurationSec, 1)) * width
    : null;

  return (
    <LayeredHeartGraph
      heightClassName="h-40"
      {...(onClick
        ? {
          onClick,
          role: 'button',
          tabIndex: 0,
          'aria-label': 'Open layered heart graph details',
          onKeyDown: (event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onClick();
            }
          },
        }
        : {})}
    >
      <SvgLayerPortal>
        <polyline
          data-testid="session-display-layered-heart-graph-line"
          fill="none"
          stroke="var(--accent)"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
          points={points}
        />
        {scrubX !== null ? (
          <line
            x1={String(scrubX)}
            x2={String(scrubX)}
            y1="0"
            y2={String(height)}
            stroke="var(--danger)"
            stroke-width="1"
            vector-effect="non-scaling-stroke"
            data-testid="heart-graph-scrubber"
          />
        ) : null}
      </SvgLayerPortal>
    </LayeredHeartGraph>
  );
}
