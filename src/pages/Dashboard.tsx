import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ATTENDANCE_MAX, SEMINAR_MAX, SUBJECTS } from '../data/subjects';
import { downloadBlob } from '../files';
import { calcPoints, fmt, useStore } from '../store';
import Bar from './Bar';

export default function Dashboard() {
  const { state, replace } = useStore();
  const fileInput = useRef<HTMLInputElement>(null);

  const rows = SUBJECTS.map((s) => ({ s, p: calcPoints(s, state.subjects[s.id]) }));
  const total = rows.reduce((a, r) => a + r.p.total, 0);
  const max = rows.reduce((a, r) => a + r.p.max, 0);

  const exportState = () =>
    downloadBlob(
      new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
      `grade-grinding-${new Date().toISOString().slice(0, 10)}.json`,
    );

  const importState = async (file?: File) => {
    if (!file) return;
    try {
      replace(JSON.parse(await file.text()));
    } catch {
      alert('Не удалось прочитать файл');
    }
  };

  return (
    <>
      <h1>Обзор</h1>
      <p className="muted">
        За каждый предмет: до {ATTENDANCE_MAX} баллов за посещение лекций (у иностранного — практик; по умолчанию всё посещено) и до{' '}
        {SEMINAR_MAX} баллов за работу на семинарах.
      </p>

      <div className="card summary">
        <div>
          <div className="big">{fmt(total)}</div>
          <div className="muted">из {max} баллов по всем предметам</div>
        </div>
        <Bar value={total} max={max} />
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Предмет</th>
              <th>Прогулы</th>
              <th>Можно ещё</th>
              <th>Посещение</th>
              <th>Семинары</th>
              <th>Итого</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, p }) => (
              <tr key={s.id}>
                <td><Link to={`/subject/${s.id}`}>{s.name}</Link></td>
                <td className={p.missedCount ? 'bad' : ''}>{p.missedCount} / {p.totalLessons}</td>
                <td>{p.freeSkips}</td>
                <td>{fmt(p.attendance)} / {ATTENDANCE_MAX}</td>
                <td>{fmt(p.seminar)} / {SEMINAR_MAX}</td>
                <td className="total-cell">
                  <b>{fmt(p.total)}</b>
                  <Bar value={p.total} max={p.max} small />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Резервная копия</h3>
        <p className="muted">
          Отметки и баллы хранятся в этом браузере. Сохраните файл, чтобы перенести их на другое устройство (личные
          прикреплённые файлы в копию не входят).
        </p>
        <div className="row">
          <button onClick={exportState}>⬇️ Скачать копию</button>
          <button className="secondary" onClick={() => fileInput.current?.click()}>⬆️ Загрузить копию</button>
          <input ref={fileInput} type="file" accept="application/json" hidden
            onChange={(e) => { importState(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </div>
    </>
  );
}
