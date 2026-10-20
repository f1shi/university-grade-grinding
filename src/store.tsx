import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ATTENDANCE_MAX, SEMINAR_MAX, SUBJECTS, type Subject } from './data/subjects';

export interface ScoreEntry {
  id: string;
  title: string;
  points: number;
  date: string;
}

export interface TaskFile {
  name: string;
  /** Путь внутри сайта (общие файлы из репозитория) */
  path?: string;
  /** Ключ в IndexedDB (личные файлы на этом устройстве) */
  localId?: string;
}

export interface Task {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  deadline?: string;
  files: TaskFile[];
  /** true — задание создано на этом устройстве */
  local?: boolean;
}

export interface SubjectState {
  /** Даты занятий, заданные вручную (перекрывают общие) */
  dates: string[];
  missed: boolean[];
  scores: ScoreEntry[];
}

export interface AppState {
  version: 1;
  subjects: Record<string, SubjectState>;
  localTasks: Task[];
  doneTasks: Record<string, boolean>;
}

export interface SharedData {
  schedule: Record<string, string[]>;
  tasks: Task[];
}

const STORAGE_KEY = 'ugg-state-v1';

const emptySubject = (s: Subject): SubjectState => ({
  dates: Array(s.lessons).fill(''),
  missed: Array(s.lessons).fill(false),
  scores: [],
});

function normalize(raw: Partial<AppState> | null): AppState {
  const subjects: Record<string, SubjectState> = {};
  for (const s of SUBJECTS) {
    const prev = raw?.subjects?.[s.id];
    const base = emptySubject(s);
    subjects[s.id] = prev
      ? {
          dates: base.dates.map((d, i) => prev.dates?.[i] ?? d),
          missed: base.missed.map((m, i) => prev.missed?.[i] ?? m),
          scores: prev.scores ?? [],
        }
      : base;
  }
  return {
    version: 1,
    subjects,
    localTasks: raw?.localTasks ?? [],
    doneTasks: raw?.doneTasks ?? {},
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    return normalize(null);
  }
}


interface StoreValue {
  state: AppState;
  shared: SharedData;
  update: (fn: (s: AppState) => AppState) => void;
  replace: (raw: unknown) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [shared, setShared] = useState<SharedData>({ schedule: {}, tasks: [] });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* хранилище недоступно — работаем в памяти */
    }
  }, [state]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/shared.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setShared({ schedule: d.schedule ?? {}, tasks: d.tasks ?? [] }))
      .catch(() => {});
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      shared,
      update: (fn) => setState((s) => fn(s)),
      replace: (raw) => setState(normalize(raw as Partial<AppState>)),
    }),
    [state, shared],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}

export function updateSubject(
  state: AppState,
  id: string,
  fn: (s: SubjectState) => SubjectState,
): AppState {
  return { ...state, subjects: { ...state.subjects, [id]: fn(state.subjects[id]) } };
}

/** Дата занятия: своя, если задана, иначе общая из репозитория */
export function lessonDate(state: AppState, shared: SharedData, subjectId: string, i: number) {
  return state.subjects[subjectId]?.dates[i] || shared.schedule[subjectId]?.[i] || '';
}

export function calcPoints(subject: Subject, st: SubjectState) {
  const missedCount = st.missed.filter(Boolean).length;
  const perLesson = ATTENDANCE_MAX / subject.lessons;
  const attendance = Math.max(0, ATTENDANCE_MAX - missedCount * perLesson);
  const seminarRaw = st.scores.reduce((sum, e) => sum + (Number(e.points) || 0), 0);
  const seminar = Math.min(SEMINAR_MAX, seminarRaw);
  return {
    missedCount,
    perLesson,
    attendance,
    seminar,
    seminarRaw,
    total: attendance + seminar,
    max: ATTENDANCE_MAX + SEMINAR_MAX,
  };
}

export const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString('ru-RU');

export const fmtDate = (iso: string) =>
  iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString('ru-RU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '—';

export const todayIso = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
