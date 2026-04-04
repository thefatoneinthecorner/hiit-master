import { BASE_RESTS_SEC, COOLDOWN_BASE_SEC, DEFAULT_WORK_DURATION_SEC, WARMUP_SEC } from './constants';
import type { SessionProfileRecord } from '../../infrastructure/storage/types';

export const DEFAULT_PROFILE_ID = 'default-profile';
export const DEFAULT_PROFILE_NAME = 'Profile';

export function createDefaultSessionProfile(workDurationSec = DEFAULT_WORK_DURATION_SEC): SessionProfileRecord {
  return {
    id: DEFAULT_PROFILE_ID,
    name: DEFAULT_PROFILE_NAME,
    workDurationSec,
    warmupSec: WARMUP_SEC,
    baseRestsSec: [...BASE_RESTS_SEC],
    cooldownBaseSec: COOLDOWN_BASE_SEC,
    notes: null,
    isDefault: true
  };
}

export function cloneSessionProfile(profile: SessionProfileRecord, id: string, name: string): SessionProfileRecord {
  return {
    ...profile,
    id,
    name,
    isDefault: false
  };
}
