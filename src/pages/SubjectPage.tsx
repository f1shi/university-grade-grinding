import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ATTENDANCE_MAX, SEMINAR_MAX, subjectById, type Subject } from '../data/subjects';
import { calcPoints, fmt, fmtDate, lessonDate, todayIso, updateSubject, useStore } from '../store';
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
          <div className="muted">прогулов: {p.missedCount} (−{fmt(p.perLesson)} за каждый)</div>
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
  const { state, shared, update } = useStore();
  const st = state.subjects[subject.id];
  const [first, setFirst] = useState('');
  const [step, setStep] = useState(1);

  const set = (fn: Parameters<typeof updateSubject>[2]) => update((s) => updateSubject(s, subject.id, fn));

  const generate = () => {
    if (!first) return;
    const start = new Date(first + 'T00:00:00');
    set((ss) => ({
      ...ss,
      dates: ss.dates.map((_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i * 7 * step);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }),
    }));
  };

  const today = todayIso();

  return (
    <>
      <div className="card">
        <h3>Заполнить даты</h3>
        <div className="row">
          <label>Первое занятие <input type="date" value={first} onChange={(e) => setFirst(e.target.value)} /></label>
          <label>
            Повтор
            <select value={step} onChange={(e) => setStep(Number(e.target.value))}>
              <option value={1}>каждую неделю</option>
              <option value={2}>раз в 2 недели</option>
            </select>
          </label>
          <button onClick={generate} disabled={!first}>Сгенерировать</button>
          <button className="secondary" onClick={() => set((ss) => ({ ...ss, dates: ss.dates.map(() => '') }))}>
            Сбросить свои даты
          </button>
        </div>
      </div>

      <div className="card">
        <p className="muted">По умолчанию все занятия отмечены как посещённые. Отметьте те, что прогуляли.</p>
        <ul className="lesson-list">
          {st.missed.map((missed, i) => {
            const date = lessonDate(state, shared, subject.id, i);
            return (
              <li key={i} className={`${missed ? 'missed' : ''} ${date === today ? 'today' : ''}`}>
                <span className="lesson-num">№{i + 1}</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => set((ss) => ({ ...ss, dates: ss.dates.map((d, j) => (j === i ? e.target.value : d)) }))}
                />
                <span className="muted lesson-name">{date ? fmtDate(date) : 'дата не задана'}</span>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={missed}
                    onChange={() => set((ss) => ({ ...ss, missed: ss.missed.map((m, j) => (j === i ? !m : m)) }))}
                  />
                  прогулял
                </label>
              </li>
            );
          })}
        </ul>
      </div>
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
