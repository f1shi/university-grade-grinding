import { useState } from 'react';
import { Link } from 'react-router-dom';
import { subjectById } from '../data/subjects';
import { FIRST_WEEK, LAST_WEEK, LESSONS, isTracked, weekMonday, weekOf, type Lesson } from '../data/timetable';
import { todayIso, toggleMissed, useStore } from '../store';

const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

const clampWeek = (w: number) => Math.min(LAST_WEEK, Math.max(FIRST_WEEK, w));

export default function Schedule() {
  const today = todayIso();
  const [week, setWeek] = useState(() => clampWeek(weekOf(today)));

  const monday = weekMonday(week);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const range = `${monday.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} — ${sunday.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;

  const lessons = LESSONS.filter((l) => l.week === week);
  const days = DAY_NAMES.map((name, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { name, date, label: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }), items: lessons.filter((l) => l.date === date) };
  }).filter((d) => d.items.length > 0);

  return (
    <>
      <h1>Расписание</h1>
      <div className="week-nav">
        <button className="secondary" disabled={week <= FIRST_WEEK} onClick={() => setWeek(week - 1)}>←</button>
        <div className="week-title">
          <b>{week} неделя</b> <span className="muted">· {week % 2 ? 'нечётная' : 'чётная'} · {range}</span>
        </div>
        <button className="secondary" disabled={week >= LAST_WEEK} onClick={() => setWeek(week + 1)}>→</button>
        {clampWeek(weekOf(today)) !== week && (
          <button className="secondary" onClick={() => setWeek(clampWeek(weekOf(today)))}>Сегодня</button>
        )}
      </div>
      <p className="muted legend">
        <span className="kind lecture">ЛК</span> лекция · <span className="kind practice">ПР</span> практика. Галочка
        «прогулял» есть у занятий, за которые ставят баллы посещения.
      </p>

      {days.map((d) => (
        <div className={`card ${d.date === today ? 'today-card' : ''}`} key={d.date}>
          <h3>
            {d.name}, {d.label} {d.date === today && <span className="tag shared">сегодня</span>}
          </h3>
          <ul className="lesson-list">
            {d.items.map((l) => <LessonRow key={l.id} lesson={l} />)}
          </ul>
        </div>
      ))}
    </>
  );
}

export function LessonRow({ lesson: l, showDate }: { lesson: Lesson; showDate?: boolean }) {
  const { state, update } = useStore();
  const tracked = isTracked(l);
  const missed = tracked && !!state.subjects[l.subjectId]?.missed[l.id];
  const past = l.date < todayIso();

  return (
    <li className={`${missed ? 'missed' : ''} ${past && !showDate ? 'past' : ''}`}>
      {showDate && (
        <span className="lesson-date">
          {new Date(l.date + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      )}
      <span className="lesson-time">{l.pair} пара<br /><span className="muted">{l.start}–{l.end}</span></span>
      <span className={`kind ${l.kind}`}>{l.kind === 'lecture' ? 'ЛК' : 'ПР'}</span>
      <span className="lesson-name">
        {subjectById(l.subjectId) ? <Link to={`/subject/${l.subjectId}`}>{l.name}</Link> : l.name}
        <br />
        <span className="muted">{l.room}{l.note ? ` · ${l.note}` : ''}</span>
      </span>
      {tracked && (
        <label className="check">
          <input type="checkbox" checked={missed} onChange={() => update((s) => toggleMissed(s, l.subjectId, l.id))} />
          прогулял
        </label>
      )}
    </li>
  );
}
