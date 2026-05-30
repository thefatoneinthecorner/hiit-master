import { DisclosureToggle } from './DisclosureToggle';
import { Pulse } from './Pulse';
import { SessionDetailsStack } from './SessionDetailsStack';

interface SessionDetailsProps {
  open: boolean;
  onToggle: () => void;
  timeRemaining: string;
  bpm: string | number;
  remainingValue?: string | null;
  primaryTitle?: string;
  remainingTitle?: string | null;
  label?: string;
  controls?: string;
  pulseActive?: boolean;
  pulseBeating?: boolean;
  pulseBeatKey?: string | number;
  class?: string;
}

export function SessionDetails({
  open,
  onToggle,
  timeRemaining,
  bpm,
  remainingValue = null,
  primaryTitle = 'Session',
  remainingTitle = null,
  label,
  controls,
  pulseActive = false,
  pulseBeating = pulseActive,
  pulseBeatKey,
  class: className = ''
}: SessionDetailsProps) {
  const hasRemainingDetails = remainingTitle !== null || remainingValue !== null;

  return (
    <div
      class={`rounded-[1.8rem] border border-[color:var(--line)] bg-[color:var(--panel)] px-5 py-4 ${className}`}
      onClick={onToggle}
      data-testid="session-details-panel"
    >
      <SessionDetailsStack
        primaryTitle={
          <span onClick={(event) => event.stopPropagation()} class="block w-full">
            <DisclosureToggle
              open={open}
              label={label ?? (open ? 'Hide session details' : 'Show session details')}
              {...(controls ? { controls } : {})}
              onToggle={onToggle}
              chrome="plain"
              caretPlacement="edge"
              class="mx-auto"
              testId="session-details-toggle"
            >
              <span class="block w-full text-center">{primaryTitle}</span>
            </DisclosureToggle>
          </span>
        }
        {...(hasRemainingDetails
          ? {
            secondaryTitle: remainingTitle,
            secondaryContent: remainingValue !== null ? <span class="text-4xl font-semibold leading-none">{remainingValue}</span> : null,
          }
          : {})}
      >
        <span class="grid w-full grid-cols-3 items-center text-5xl font-semibold leading-none" data-testid="session-details-row">
          <span class="justify-self-end" data-testid="session-details-time">{timeRemaining}</span>
          <span class="justify-self-center text-6xl" data-testid="session-details-pulse">
            <Pulse key={pulseBeatKey} active={pulseActive} beating={pulseBeating} />
          </span>
          <span class="justify-self-start" data-testid="session-details-bpm">{bpm}</span>
        </span>
      </SessionDetailsStack>
    </div>
  );
}
