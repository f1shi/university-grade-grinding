import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SUBJECTS } from '../data/subjects';
import { fmtDate, lessonDate, todayIso, updateSubject, useStore } from '../store';

type Filter = 'upcoming' | 'past' | 'all';

/** Понедельник недели, к которой относится дата */
function weekStart(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export default function Schedule() {
  const { state, shared, update } = useStore();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const today = todayIso();

  const lessons = SUBJECTS.flatMap((s) =>
    Array.from({ length: s.lessons }, (_, i) => ({
      s,
      i,
      date: lessonDate(state, shared, s.id, i),
      missed: state.subjects[s.id].missed[i],
    })),
  );
  const dated = lessons
    .filter((l) => l.date)
    .filter((l) => (filter === 'all' ? true : filter === 'upcoming' ? l.date >= today : l.date < today))
    .sort((a, b) => (filter === 'past' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
  const undated = SUBJECTS.map((s) => ({
    s,
    count: lessons.filter((l) => l.s.id === s.id && !l.date).length,
  })).filter((x) => x.count > 0);

  const groups = new Map<string, typeof dated>();
  for (const l of dated) {
    const ws = weekStart(l.date);
    const key = ws.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }

  const toggle = (id: string, i: number) =>
    update((st) => updateSubject(st, id, (ss) => ({ ...ss, missed: ss.missed.map((m, j) => (j === i ? !m : m)) })));

  return (
    <>
      <h1>Расписание</h1>
      <div className="tabs">
        {(['upcoming', 'past', 'all'] as Filter[]).map((f) => (
          <button key={f} className={filter === f ? 'tab active' : 'tab'} onClick={() => setFilter(f)}>
            {f === 'upcoming' ? 'Предстоящие' : f === 'past' ? 'Прошедшие' : 'Все'}
          </button>
        ))}
      </div>

      {dated.length === 0 && (
        <div className="card muted">
          Здесь пока пусто. Задайте даты занятий на странице предмета (вкладка «Посещения») — можно сгенерировать
          их сразу на весь семестр.
        </div>
      )}

      {[...groups].map(([week, items]) => (
        <div className="card" key={week}>
          <h3>Неделя с {week}</h3>
          <ul className="lesson-list">
            {items.map((l) => (
              <li key={l.s.id + l.i} className={`${l.missed ? 'missed' : ''} ${l.date === today ? 'today' : ''}`}>
                <span className="lesson-date">{fmtDate(l.date)}</span>
                <Link to={`/subject/${l.s.id}`} className="lesson-name">
                  {l.s.name} <span className="muted">· занятие {l.i + 1}</span>
                </Link>
                <label className="check">
                  <input type="checkbox" checked={l.missed} onChange={() => toggle(l.s.id, l.i)} />
                  прогулял
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {undated.length > 0 && (
        <div className="card">
          <h3>Без даты</h3>
          <ul className="plain">
            {undated.map(({ s, count }) => (
              <li key={s.id}>
                <Link to={`/subject/${s.id}`}>{s.name}</Link> — {count} занят.
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
