import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ATTENDANCE_MAX, SEMINAR_MAX, subjectById, type Subject } from '../data/subjects';
import { LESSONS, attendanceLessons } from '../data/timetable';
import { calcPoints, fmt, fmtDate, todayIso, updateSubject, useStore } from '../store';
import { LessonRow } from './Schedule';
import Bar from './Bar';
import Tasks from './Tasks';

type Tab = 'attendance' | 'seminars' | 'tasks';

export default function SubjectPage() {
  const { id = '' } = useParams();
  const subject = subjectById(id);
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>('attendance');
  if (!subject) return <Navigate to="/" />;

  const p = calcPoints(subject, state.subjects[subject.id]);

  return (
    <>
      <h1>{subject.name}</h1>
      {subject.link && (
        <p><a href={subject.link} target="_blank" rel="noreferrer">Открыть в Pulse ↗</a></p>
      )}

      <div className="stats">
        <div className="card stat">
          <div className="muted">Посещение</div>
          <div className="big">{fmt(p.attendance)}<small> / {ATTENDANCE_MAX}</small></div>
          <div className="muted">
            прогулов: {p.missedCount}
            {p.freeSkips > 0 ? ` · ещё можно без потерь: ${p.freeSkips}` : ` · −${fmt(p.perLesson)} за каждый`}
          </div>
        </div>
        <div className="card stat">
          <div className="muted">Семинары</div>
          <div className="big">{fmt(p.seminar)}<small> / {SEMINAR_MAX}</small></div>
          {p.seminarRaw > SEMINAR_MAX && <div className="muted">набрано {fmt(p.seminarRaw)}, засчитано максимум</div>}
        </div>
        <div className="card stat">
          <div className="muted">Итого</div>
          <div className="big">{fmt(p.total)}<small> / {p.max}</small></div>
          <Bar value={p.total} max={p.max} />
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'attendance' ? 'tab active' : 'tab'} onClick={() => setTab('attendance')}>Посещения</button>
        <button className={tab === 'seminars' ? 'tab active' : 'tab'} onClick={() => setTab('seminars')}>Баллы за семинары</button>
        <button className={tab === 'tasks' ? 'tab active' : 'tab'} onClick={() => setTab('tasks')}>Задания</button>
      </div>

      {tab === 'attendance' && <Attendance subject={subject} />}
      {tab === 'seminars' && <Seminars subject={subject} />}
      {tab === 'tasks' && <Tasks subject={subject} />}
    </>
  );
}

function Attendance({ subject }: { subject: Subject }) {
  const { state } = useStore();
  const lessons = attendanceLessons(subject.id);
  const practices = LESSONS.filter((l) => l.subjectId === subject.id && l.kind !== lessons[0]?.kind);
  const p = calcPoints(subject, state.subjects[subject.id]);
  const kindName = subject.attendanceKind === 'practice' ? 'практик' : 'лекций';

  return (
    <>
      <div className="card">
        <p className="muted">
          В семестре {p.totalLessons} {kindName}, для полных {ATTENDANCE_MAX} баллов нужно посетить {p.needed}.
          По умолчанию все занятия считаются посещёнными — отметьте те, что прогуляли.
          {p.freeSkips > 0 && <> Можно ещё прогулять <b>{p.freeSkips}</b> без потери баллов.</>}
        </p>
        <ul className="lesson-list">
          {lessons.map((l) => <LessonRow key={l.id} lesson={l} showDate />)}
        </ul>
      </div>
      {practices.length > 0 && (
        <details className="card">
          <summary>{subject.attendanceKind === 'practice' ? 'Лекции' : 'Практики (семинары)'} — {practices.length} занятий</summary>
          <ul className="lesson-list">
            {practices.map((l) => <LessonRow key={l.id} lesson={l} showDate />)}
          </ul>
        </details>
      )}
    </>
  );
}

function Seminars({ subject }: { subject: Subject }) {
  const { state, update } = useStore();
  const st = state.subjects[subject.id];
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState('');
  const [date, setDate] = useState(todayIso());

  const set = (fn: Parameters<typeof updateSubject>[2]) => update((s) => updateSubject(s, subject.id, fn));

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(points.replace(',', '.'));
    if (!Number.isFinite(n) || points === '') return;
    set((ss) => ({
      ...ss,
      scores: [...ss.scores, { id: crypto.randomUUID(), title: title.trim() || 'Работа на семинаре', points: n, date }],
    }));
    setTitle('');
    setPoints('');
  };

  return (
    <>
      <form className="card row" onSubmit={add}>
        <label className="grow">Что за работа <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: ПР №3" /></label>
        <label>Баллы <input className="narrow" inputMode="decimal" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="5" /></label>
        <label>Дата <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <button type="submit">Добавить</button>
      </form>

      <div className="card">
        {st.scores.length === 0 ? (
          <p className="muted">Пока нет баллов за семинары. Максимум — {SEMINAR_MAX}.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Дата</th><th>Работа</th><th>Баллы</th><th /></tr></thead>
            <tbody>
              {[...st.scores].sort((a, b) => a.date.localeCompare(b.date)).map((e) => (
                <tr key={e.id}>
                  <td>{fmtDate(e.date)}</td>
                  <td>{e.title}</td>
                  <td>{fmt(e.points)}</td>
                  <td className="right">
                    <button className="icon" title="Удалить"
                      onClick={() => set((ss) => ({ ...ss, scores: ss.scores.filter((x) => x.id !== e.id) }))}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
