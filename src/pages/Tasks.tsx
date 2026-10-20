import { useState } from 'react';
import type { Subject } from '../data/subjects';
import { deleteFile, downloadBlob, getFile, saveFile } from '../files';
import { fmtDate, todayIso, useStore, type Task, type TaskFile } from '../store';

export default function Tasks({ subject }: { subject: Subject }) {
  const { state, shared, update } = useStore();
  const tasks = [
    ...shared.tasks.filter((t) => t.subjectId === subject.id),
    ...state.localTasks.filter((t) => t.subjectId === subject.id).map((t) => ({ ...t, local: true })),
  ].sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));

  return (
    <>
      <NewTask subject={subject} />
      {tasks.length === 0 && <div className="card muted">Заданий пока нет.</div>}
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          task={t}
          done={!!state.doneTasks[t.id]}
          onToggle={() => update((s) => ({ ...s, doneTasks: { ...s.doneTasks, [t.id]: !s.doneTasks[t.id] } }))}
          onDelete={
            t.local
              ? async () => {
                  if (!confirm('Удалить задание и его файлы с этого устройства?')) return;
                  await Promise.all(t.files.filter((f) => f.localId).map((f) => deleteFile(f.localId!)));
                  update((s) => ({ ...s, localTasks: s.localTasks.filter((x) => x.id !== t.id) }));
                }
              : undefined
          }
        />
      ))}
    </>
  );
}

function TaskCard({ task, done, onToggle, onDelete }: { task: Task; done: boolean; onToggle: () => void; onDelete?: () => void }) {
  const overdue = !done && task.deadline && task.deadline < todayIso();

  const download = async (f: TaskFile) => {
    if (f.path) {
      const a = document.createElement('a');
      a.href = `${import.meta.env.BASE_URL}${f.path}`;
      a.download = f.name;
      a.click();
    } else if (f.localId) {
      const stored = await getFile(f.localId);
      if (stored) downloadBlob(stored.blob, stored.name);
      else alert('Файл не найден на этом устройстве');
    }
  };

  const copyJson = () => {
    const { local: _local, ...rest } = task;
    const json = JSON.stringify(
      { ...rest, files: task.files.map((f) => ({ name: f.name, path: `files/${task.subjectId}/${f.name}` })) },
      null,
      2,
    );
    navigator.clipboard.writeText(json).then(() => alert('JSON скопирован — вставьте его в public/data/shared.json'));
  };

  return (
    <div className={`card task ${done ? 'done' : ''}`}>
      <div className="task-head">
        <label className="check">
          <input type="checkbox" checked={done} onChange={onToggle} />
          <b>{task.title}</b>
        </label>
        <span className={`tag ${task.local ? '' : 'shared'}`}>{task.local ? 'моё' : 'общее'}</span>
        {task.deadline && <span className={`deadline ${overdue ? 'bad' : ''}`}>до {fmtDate(task.deadline)}</span>}
      </div>
      {task.description && <p className="task-desc">{task.description}</p>}
      {task.files.length > 0 && (
        <div className="files">
          {task.files.map((f, i) => (
            <button key={i} className="file" onClick={() => download(f)}>📎 {f.name}</button>
          ))}
        </div>
      )}
      {task.local && (
        <div className="row task-actions">
          <button className="secondary small" onClick={copyJson}>Скопировать JSON для группы</button>
          {onDelete && <button className="secondary small danger" onClick={onDelete}>Удалить</button>}
        </div>
      )}
    </div>
  );
}

function NewTask({ subject }: { subject: Subject }) {
  const { update } = useStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const stored: TaskFile[] = [];
      for (const f of files) {
        const localId = crypto.randomUUID();
        await saveFile(localId, f);
        stored.push({ name: f.name, localId });
      }
      const task: Task = {
        id: crypto.randomUUID(),
        subjectId: subject.id,
        title: title.trim(),
        description: description.trim(),
        deadline: deadline || undefined,
        files: stored,
      };
      update((s) => ({ ...s, localTasks: [...s.localTasks, task] }));
      setTitle('');
      setDescription('');
      setDeadline('');
      setFiles([]);
      setOpen(false);
    } catch {
      alert('Не удалось сохранить файлы');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return <button className="add-task" onClick={() => setOpen(true)}>＋ Добавить задание</button>;

  return (
    <form className="card form" onSubmit={submit}>
      <label>Название <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus /></label>
      <label>Что нужно сделать <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <div className="row">
        <label>Срок сдачи <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
        <label className="grow">Файлы <input type="file" multiple onChange={(e) => setFiles([...(e.target.files ?? [])])} /></label>
      </div>
      <div className="row">
        <button type="submit" disabled={busy}>{busy ? 'Сохраняю…' : 'Сохранить'}</button>
        <button type="button" className="secondary" onClick={() => setOpen(false)}>Отмена</button>
      </div>
    </form>
  );
}
