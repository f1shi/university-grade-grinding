export interface Subject {
  id: string;
  name: string;
  /** Максимальное количество посещений */
  lessons: number;
  link?: string;
}

export const ATTENDANCE_MAX = 20;
export const SEMINAR_MAX = 40;

export const SUBJECTS: Subject[] = [
  { id: 'asd', name: 'Алгоритмы и структуры данных', lessons: 7 },
  { id: 'db', name: 'Базы данных для индустриальных задач', lessons: 7 },
  {
    id: 'english',
    name: 'Иностранный язык',
    lessons: 14,
    link: 'https://pulse.mirea.ru/services/merged-disciplines/58a149d1-508a-4648-bb84-85c2a9b04f08/b9654f10-8b9f-47fe-ab51-d7f06d939c95?termIndex=2',
  },
  { id: 'isb', name: 'Информационные системы в бизнесе', lessons: 7 },
  { id: 'matan', name: 'Математический анализ', lessons: 7 },
  { id: 'law', name: 'Правоведение', lessons: 7 },
  { id: 'project', name: 'Проектная деятельность', lessons: 7 },
  { id: 'ai', name: 'Системы искусственного интеллекта и большие данные', lessons: 7 },
  {
    id: 'tip',
    name: 'Технологии индустриального программирования',
    lessons: 7,
    link: 'https://pulse.mirea.ru/services/merged-disciplines/58a149d1-508a-4648-bb84-85c2a9b04f08/07bc2cdf-bb35-4b81-8b9f-10290b6bfa44?termIndex=2',
  },
  { id: 'web', name: 'Фронтенд и бэкенд разработка', lessons: 7 },
];

export const subjectById = (id: string) => SUBJECTS.find((s) => s.id === id);
