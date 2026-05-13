export type SlotTemplate = {
  slot_label: string;
  role: 'starter' | 'first_sub';
  x_pct: number;
  y_pct: number;
};

export type FormationCode = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2';

export const FORMATION_CODES: FormationCode[] = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2'];

const SUBS: SlotTemplate[] = [
  { slot_label: 'SUB1', role: 'first_sub', x_pct: 10, y_pct: 100 },
  { slot_label: 'SUB2', role: 'first_sub', x_pct: 27, y_pct: 100 },
  { slot_label: 'SUB3', role: 'first_sub', x_pct: 44, y_pct: 100 },
  { slot_label: 'SUB4', role: 'first_sub', x_pct: 61, y_pct: 100 },
  { slot_label: 'SUB5', role: 'first_sub', x_pct: 78, y_pct: 100 },
];

export const FORMATION_TEMPLATES: Record<FormationCode, SlotTemplate[]> = {
  '4-3-3': [
    { slot_label: 'GK',   role: 'starter', x_pct: 50, y_pct: 88 },
    { slot_label: 'LB',   role: 'starter', x_pct: 15, y_pct: 72 },
    { slot_label: 'CB_L', role: 'starter', x_pct: 35, y_pct: 72 },
    { slot_label: 'CB_R', role: 'starter', x_pct: 65, y_pct: 72 },
    { slot_label: 'RB',   role: 'starter', x_pct: 85, y_pct: 72 },
    { slot_label: 'CM_L', role: 'starter', x_pct: 25, y_pct: 50 },
    { slot_label: 'CM',   role: 'starter', x_pct: 50, y_pct: 50 },
    { slot_label: 'CM_R', role: 'starter', x_pct: 75, y_pct: 50 },
    { slot_label: 'LW',   role: 'starter', x_pct: 15, y_pct: 20 },
    { slot_label: 'STR',  role: 'starter', x_pct: 50, y_pct: 15 },
    { slot_label: 'RW',   role: 'starter', x_pct: 85, y_pct: 20 },
    ...SUBS,
  ],
  '4-4-2': [
    { slot_label: 'GK',   role: 'starter', x_pct: 50, y_pct: 88 },
    { slot_label: 'LB',   role: 'starter', x_pct: 15, y_pct: 72 },
    { slot_label: 'CB_L', role: 'starter', x_pct: 35, y_pct: 72 },
    { slot_label: 'CB_R', role: 'starter', x_pct: 65, y_pct: 72 },
    { slot_label: 'RB',   role: 'starter', x_pct: 85, y_pct: 72 },
    { slot_label: 'LM',   role: 'starter', x_pct: 15, y_pct: 50 },
    { slot_label: 'CM_L', role: 'starter', x_pct: 37, y_pct: 50 },
    { slot_label: 'CM_R', role: 'starter', x_pct: 63, y_pct: 50 },
    { slot_label: 'RM',   role: 'starter', x_pct: 85, y_pct: 50 },
    { slot_label: 'ST_L', role: 'starter', x_pct: 35, y_pct: 18 },
    { slot_label: 'ST_R', role: 'starter', x_pct: 65, y_pct: 18 },
    ...SUBS,
  ],
  '4-2-3-1': [
    { slot_label: 'GK',   role: 'starter', x_pct: 50, y_pct: 88 },
    { slot_label: 'LB',   role: 'starter', x_pct: 15, y_pct: 72 },
    { slot_label: 'CB_L', role: 'starter', x_pct: 35, y_pct: 72 },
    { slot_label: 'CB_R', role: 'starter', x_pct: 65, y_pct: 72 },
    { slot_label: 'RB',   role: 'starter', x_pct: 85, y_pct: 72 },
    { slot_label: 'DM_L', role: 'starter', x_pct: 35, y_pct: 58 },
    { slot_label: 'DM_R', role: 'starter', x_pct: 65, y_pct: 58 },
    { slot_label: 'LAM',  role: 'starter', x_pct: 18, y_pct: 38 },
    { slot_label: 'CAM',  role: 'starter', x_pct: 50, y_pct: 38 },
    { slot_label: 'RAM',  role: 'starter', x_pct: 82, y_pct: 38 },
    { slot_label: 'STR',  role: 'starter', x_pct: 50, y_pct: 15 },
    ...SUBS,
  ],
  '3-5-2': [
    { slot_label: 'GK',   role: 'starter', x_pct: 50, y_pct: 88 },
    { slot_label: 'CB_L', role: 'starter', x_pct: 25, y_pct: 72 },
    { slot_label: 'CB',   role: 'starter', x_pct: 50, y_pct: 72 },
    { slot_label: 'CB_R', role: 'starter', x_pct: 75, y_pct: 72 },
    { slot_label: 'LWB',  role: 'starter', x_pct: 10, y_pct: 52 },
    { slot_label: 'CM_L', role: 'starter', x_pct: 30, y_pct: 50 },
    { slot_label: 'CM',   role: 'starter', x_pct: 50, y_pct: 50 },
    { slot_label: 'CM_R', role: 'starter', x_pct: 70, y_pct: 50 },
    { slot_label: 'RWB',  role: 'starter', x_pct: 90, y_pct: 52 },
    { slot_label: 'ST_L', role: 'starter', x_pct: 35, y_pct: 18 },
    { slot_label: 'ST_R', role: 'starter', x_pct: 65, y_pct: 18 },
    ...SUBS,
  ],
};
