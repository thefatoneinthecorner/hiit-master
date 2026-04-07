import type { SessionRecord } from '../shared/types';

export function getDefaultActualWorkDurationSec(
  nominalWorkDurationSec: number,
  latestSessionForProfile?: Pick<SessionRecord, 'actualWorkDurationSec'>,
) {
  if (latestSessionForProfile) {
    return latestSessionForProfile.actualWorkDurationSec;
  }

  return Math.max(1, Math.round((nominalWorkDurationSec * 2) / 3));
}
