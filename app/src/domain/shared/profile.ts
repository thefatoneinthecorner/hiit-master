import type { SessionProfile } from './types';

export const STARTER_PROFILE: SessionProfile = {
  id: 'starter-profile',
  name: 'My Profile',
  workDurationSec: 30,
  nominalPeakHeartrate: 160,
  warmupSec: 300,
  baseRestsSec: [90, 75, 60, 45, 35, 30, 30, 30, 30, 30, 30, 30],
  cooldownBaseSec: 180,
  notes: ''
};

export function createUniqueProfileName(existingNames: string[], baseName: string): string {
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  let counter = 2;
  while (existingNames.includes(`${baseName} ${counter}`)) {
    counter += 1;
  }
  return `${baseName} ${counter}`;
}

export function createSessionName(startedAtIso: string): string {
  const startedAt = new Date(startedAtIso);
  return startedAt.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getDefaultActualWorkDurationSec(
  profile: SessionProfile,
  recentSameProfileSession: { actualWorkDurationSec: number } | null
): number {
  if (recentSameProfileSession) {
    return recentSameProfileSession.actualWorkDurationSec;
  }

  return Math.max(1, Math.round((profile.workDurationSec * 2) / 3));
}
