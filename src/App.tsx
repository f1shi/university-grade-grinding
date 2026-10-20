import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { SUBJECTS } from './data/subjects';
import { calcPoints, fmt, useStore } from './store';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import SubjectPage from './pages/SubjectPage';

export default function App() {
  const { state } = useStore();
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">🎓 Grade Grinding</div>
        <nav>
          <NavLink to="/" end>📊 Обзор</NavLink>
          <NavLink to="/schedule">📅 Расписание</NavLink>
          <div className="nav-title">Предметы</div>
          {SUBJECTS.map((s) => {
            const p = calcPoints(s, state.subjects[s.id]);
            return (
              <NavLink key={s.id} to={`/subject/${s.id}`} className="nav-subject">
                <span>{s.name}</span>
                <span className="badge">{fmt(p.total)}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/subject/:id" element={<SubjectPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
