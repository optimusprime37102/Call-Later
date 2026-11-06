export type AlarmSoundId =
  | 'alarm'
  | 'alarm2'
  | 'alarm3'
  | 'alarm4'
  | 'alarm5'
  | 'alarm6'
  | 'alarm7';

export interface AlarmSoundOption {
  id: AlarmSoundId;
  /** Android raw resource name (no extension). */
  resourceName: string;
  /** Filename used by expo-notifications / iOS. */
  fileName: string;
  title: string;
  subtitle: string;
  /** Metro asset module id from require(). */
  source: number;
}

export const DEFAULT_ALARM_SOUND_ID: AlarmSoundId = 'alarm';

export const ALARM_SOUNDS: AlarmSoundOption[] = [
  {
    id: 'alarm',
    resourceName: 'alarm',
    fileName: 'alarm.wav',
    title: 'Pulse',
    subtitle: 'Classic call alert',
    source: require('../../assets/sounds/alarm.wav'),
  },
  {
    id: 'alarm2',
    resourceName: 'alarm2',
    fileName: 'alarm2.wav',
    title: 'Chime',
    subtitle: 'Bright and clear',
    source: require('../../assets/sounds/alarm2.wav'),
  },
  {
    id: 'alarm3',
    resourceName: 'alarm3',
    fileName: 'alarm3.wav',
    title: 'Echo',
    subtitle: 'Soft repeating tone',
    source: require('../../assets/sounds/alarm3.wav'),
  },
  {
    id: 'alarm4',
    resourceName: 'alarm4',
    fileName: 'alarm4.wav',
    title: 'Tap',
    subtitle: 'Short and sharp',
    source: require('../../assets/sounds/alarm4.wav'),
  },
  {
    id: 'alarm5',
    resourceName: 'alarm5',
    fileName: 'alarm5.wav',
    title: 'Ring',
    subtitle: 'Bold phone-style ring',
    source: require('../../assets/sounds/alarm5.wav'),
  },
  {
    id: 'alarm6',
    resourceName: 'alarm6',
    fileName: 'alarm6.wav',
    title: 'Beacon',
    subtitle: 'Steady attention tone',
    source: require('../../assets/sounds/alarm6.wav'),
  },
  {
    id: 'alarm7',
    resourceName: 'alarm7',
    fileName: 'alarm7.wav',
    title: 'Alert',
    subtitle: 'Strong reminder signal',
    source: require('../../assets/sounds/alarm7.wav'),
  },
];

export function getAlarmSound(id: string | null | undefined): AlarmSoundOption {
  return (
    ALARM_SOUNDS.find((sound) => sound.id === id) ??
    ALARM_SOUNDS.find((sound) => sound.id === DEFAULT_ALARM_SOUND_ID)!
  );
}

export function isAlarmSoundId(value: unknown): value is AlarmSoundId {
  return (
    typeof value === 'string' &&
    ALARM_SOUNDS.some((sound) => sound.id === value)
  );
}
