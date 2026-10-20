import { subjectById } from './subjects';

/** Понедельник 1-й учебной недели */
const SEMESTER_START = new Date(2026, 7, 31);
/** Расписание действует с 3-й недели (14 сентября) по 16-ю (20 декабря) */
export const FIRST_WEEK = 3;
export const LAST_WEEK = 16;

export const PAIR_TIMES: Record<number, [string, string]> = {
  1: ['09:00', '10:30'],
  2: ['10:40', '12:10'],
  3: ['12:40', '14:10'],
  4: ['14:20', '15:50'],
  5: ['16:20', '17:50'],
  6: ['18:00', '19:30'],
};

export type Kind = 'lecture' | 'practice';
type Parity = 'odd' | 'even' | 'both';

interface Slot {
  parity: Parity;
  /** 1 — понедельник … 6 — суббота */
  day: number;
  pair: number;
  subjectId: string;
  kind: Kind;
  room: string;
  note?: string;
}

/** Предметы, которые есть в расписании, но баллы по ним не считаются */
const EXTRA_NAMES: Record<string, string> = {
  pe: 'Физическая культура и спорт',
};

const L = (parity: Parity, day: number, pair: number, subjectId: string, room: string, note?: string): Slot =>
  ({ parity, day, pair, subjectId, kind: 'lecture', room, note });
const P = (parity: Parity, day: number, pair: number, subjectId: string, room: string, note?: string): Slot =>
  ({ parity, day, pair, subjectId, kind: 'practice', room, note });

// Нечётная неделя — как 14–20 сентября, чётная — как 21–27 сентября.
const SLOTS: Slot[] = [
  // Понедельник
  P('both', 1, 1, 'db', 'В-415'),
  P('both', 1, 2, 'project', 'А-219-1'),
  // Вторник
  L('odd', 2, 1, 'web', 'А-12'),
  L('even', 2, 1, 'isb', 'А-12'),
  L('both', 2, 2, 'matan', 'А-16'),
  P('both', 2, 3, 'english', 'И-319', '1 и 2 п/г'),
  P('both', 2, 4, 'pe', 'ФОК-4'),
  L('even', 2, 6, 'law', 'Дистанционно'),
  // Среда
  P('even', 3, 3, 'law', 'А-463'),
  P('both', 3, 4, 'ai', 'А-332'),
  P('both', 3, 5, 'tip', 'А-332'),
  // Четверг
  P('both', 4, 1, 'isb', 'А-223'),
  P('both', 4, 2, 'matan', 'А-411'),
  P('both', 4, 3, 'web', 'В-415'),
  P('both', 4, 4, 'web', 'В-415'),
  P('both', 4, 5, 'asd', 'А-223'),
  // Суббота
  L('odd', 6, 3, 'project', 'Б-115'),
  L('odd', 6, 4, 'tip', 'Б-115'),
  L('odd', 6, 5, 'db', 'А-17'),
  L('even', 6, 3, 'ai', 'А-17'),
  L('even', 6, 4, 'asd', 'А-17'),
];

export interface Lesson {
  id: string;
  subjectId: string;
  name: string;
  kind: Kind;
  date: string;
  week: number;
  pair: number;
  start: string;
  end: string;
  room: string;
  note?: string;
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function weekMonday(week: number) {
  const d = new Date(SEMESTER_START);
  d.setDate(d.getDate() + (week - 1) * 7);
  return d;
}

/** Номер учебной недели для даты (может выходить за FIRST_WEEK..LAST_WEEK) */
export function weekOf(isoDate: string) {
  const d = new Date(isoDate + 'T00:00:00');
  return Math.floor((d.getTime() - SEMESTER_START.getTime()) / (7 * 24 * 3600 * 1000)) + 1;
}

export const subjectName = (id: string) => subjectById(id)?.name ?? EXTRA_NAMES[id] ?? id;

function build(): Lesson[] {
  const out: Lesson[] = [];
  for (let week = FIRST_WEEK; week <= LAST_WEEK; week++) {
    const odd = week % 2 === 1;
    for (const s of SLOTS) {
      if (s.parity === 'odd' && !odd) continue;
      if (s.parity === 'even' && odd) continue;
      const d = weekMonday(week);
      d.setDate(d.getDate() + s.day - 1);
      const date = iso(d);
      const [start, end] = PAIR_TIMES[s.pair];
      out.push({
        id: `${s.subjectId}-${date}-${s.pair}`,
        subjectId: s.subjectId,
        name: subjectName(s.subjectId),
        kind: s.kind,
        date,
        week,
        pair: s.pair,
        start,
        end,
        room: s.room,
        note: s.note,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.pair - b.pair);
}

export const LESSONS = build();

/** Занятия, за посещение которых ставятся баллы */
export function attendanceLessons(subjectId: string) {
  const kind = subjectById(subjectId)?.attendanceKind ?? 'lecture';
  return LESSONS.filter((l) => l.subjectId === subjectId && l.kind === kind);
}

export const isTracked = (l: Lesson) =>
  !!subjectById(l.subjectId) && l.kind === (subjectById(l.subjectId)!.attendanceKind ?? 'lecture');
