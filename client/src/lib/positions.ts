export const POSITIONS = [
  { value: 'GK',  label: 'Goalkeeper',     group: 'GK'  },
  { value: 'CB',  label: 'Center Back',    group: 'DEF' },
  { value: 'LB',  label: 'Left Back',      group: 'DEF' },
  { value: 'RB',  label: 'Right Back',     group: 'DEF' },
  { value: 'CDM', label: 'Defensive Mid',  group: 'MID' },
  { value: 'CM',  label: 'Center Mid',     group: 'MID' },
  { value: 'CAM', label: 'Attacking Mid',  group: 'MID' },
  { value: 'LM',  label: 'Left Mid',       group: 'MID' },
  { value: 'RM',  label: 'Right Mid',      group: 'MID' },
  { value: 'LW',  label: 'Left Wing',      group: 'FWD' },
  { value: 'RW',  label: 'Right Wing',     group: 'FWD' },
  { value: 'ST',  label: 'Striker',        group: 'FWD' },
  { value: 'CF',  label: 'Center Forward', group: 'FWD' },
] as const;

export type PositionValue = typeof POSITIONS[number]['value'];

export const POSITION_GROUPS = ['GK', 'DEF', 'MID', 'FWD'] as const;
export type PositionGroup = typeof POSITION_GROUPS[number];

export function getPositionGroup(position: string): PositionGroup | null {
  const found = POSITIONS.find((p) => p.value === position);
  return found ? (found.group as PositionGroup) : null;
}

export function aggregateByGroup(counts: Record<string, number>): Record<PositionGroup, number> {
  const result: Record<PositionGroup, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const [pos, count] of Object.entries(counts)) {
    const group = getPositionGroup(pos);
    if (group) result[group] += count;
  }
  return result;
}
