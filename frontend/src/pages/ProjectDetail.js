import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['To Do', 'In Progress', 'Done'];
const STATUS_COLORS = { 'To Do': 'slate', 'In Progress': 'amber', 'Done': 'green' };
const PRIORITY_COLORS = { 'Low': 'green', 'Medium': 'blue', 'High': 'amber', 'Critical': 'red' };

function TaskCard({ task, isAdmin, members, onStatusChange, onEdit, onDelete }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done';
  return (
    <div className={`task-card ${isOverdue ? 'overdue' : ''}`}>
      <div className="task-top">
        <span className={`priority-badge ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
        <span className={`status-badge ${STATUS_COLORS[task.status]}`}>{task.status}</span>
      </div>
      <h4 className="task-title">{task.title}</h4>
      {task.description && <p className="task-desc">{task.description}</p>}
      <div className="task-footer">
        <div className="task-meta">
          {task.assigneeName && (
            <span className="task-assignee">
              <span className="mini-avatar">{task.assigneeName[0].toUpperCase()}</span>
              {task.assigneeName}
            </span>
          )}
          {task.dueDate && (
            <span className={`task-due ${isOverdue ? 'overdue-text' : ''}`}>
              📅 {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="task-actions">
          {isAdmin ? (
            <>
              <button className="icon-btn" onClick={() => onEdit(task)} title="Edit">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button className="icon-btn danger" onClick={() => onDelete(task._id)} title="Delete">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/><path d="M10,11v6M14,11v6"/></svg>
              </button>
            </>
          ) : (
            <select value={task.status} onChange={e => onStatusChange(task._id, e.target.value)}
              className="status-select" onClick={e => e.stopPropagation()}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskModal({ task, members, projectId, onClose, onSave }) {
  const isEdit = !!task?._id;
  const [form, setForm] = useState({
    title: task?.title || '', description: task?.description || '',
    dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : '',
    priority: task?.priority || 'Medium', assignedTo: task?.assignedTo || '', status: task?.status || 'To Do'
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async e => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      const payload = { ...form, assignedTo: form.assignedTo || null };
      if (isEdit) await api.put(`/api/projects/${projectId}/tasks/${task._id}`, payload);
      else await api.post(`/api/projects/${projectId}/tasks`, payload);
      onSave();
    } catch (e) { setError(e.response?.data?.error || 'Failed to save task'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Task' : 'New Task'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save} className="modal-form">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required autoFocus />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Assign To</label>
              <select value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.userId} value={m.userId}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MembersModal({ project, onClose, onUpdate }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [members, setMembers] = useState(project.members || []);

  const add = async e => {
    e.preventDefault(); setError(''); setSuccess('');
    try {
      await api.post(`/api/projects/${project._id}/members`, { email, role });
      setSuccess(`${email} added successfully`); setEmail('');
      const r = await api.get(`/api/projects/${project._id}`);
      setMembers(r.data.members); onUpdate();
    } catch (e) { setError(e.response?.data?.error || 'Failed to add member'); }
  };

  const remove = async (userId) => {
    try {
      await api.delete(`/api/projects/${project._id}/members/${userId}`);
      setMembers(m => m.filter(x => x.userId !== userId)); onUpdate();
    } catch (e) { setError(e.response?.data?.error || 'Failed to remove'); }
  };

  const changeRole = async (userId, newRole) => {
    try {
      await api.put(`/api/projects/${project._id}/members/${userId}/role`, { role: newRole });
      setMembers(m => m.map(x => x.userId === userId ? { ...x, role: newRole } : x)); onUpdate();
    } catch (e) { setError(e.response?.data?.error || 'Failed to change role'); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3>Manage Members</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-form">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={add} className="add-member-form">
            <input type="email" placeholder="member@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required />
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option>Member</option><option>Admin</option>
            </select>
            <button type="submit" className="btn btn-primary">Add</button>
          </form>
          <div className="members-list">
            {members.map(m => (
              <div key={m.userId} className="member-row">
                <div className="member-avatar">{m.name[0].toUpperCase()}</div>
                <div className="member-info">
                  <span className="member-name">{m.name}</span>
                  <span className="member-email">{m.email}</span>
                </div>
                <select value={m.role} onChange={e => changeRole(m.userId, e.target.value)} className="role-select">
                  <option>Member</option><option>Admin</option>
                </select>
                <button className="icon-btn danger" onClick={() => remove(m.userId)}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(null);
  const [membersModal, setMembersModal] = useState(false);
  const [activeTab, setActiveTab] = useState('board');
  const [filterStatus, setFilterStatus] = useState('All');

  const loadProject = useCallback(() => api.get(`/api/projects/${id}`).then(r => setProject(r.data)), [id]);
  const loadTasks = useCallback(() => api.get(`/api/projects/${id}/tasks`).then(r => setTasks(r.data)), [id]);

  useEffect(() => {
    Promise.all([loadProject(), loadTasks()]).finally(() => setLoading(false));
  }, [loadProject, loadTasks]);

  const isAdmin = project?.userRole === 'Admin';

  const handleStatusChange = async (taskId, status) => {
    await api.put(`/api/projects/${id}/tasks/${taskId}`, { status });
    loadTasks();
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    await api.delete(`/api/projects/${id}/tasks/${taskId}`);
    loadTasks();
  };

  const filteredTasks = filterStatus === 'All' ? tasks : tasks.filter(t => t.status === filterStatus);

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!project) return <div className="error-page"><h3>Project not found</h3></div>;

  const tasksByStatus = {
    'To Do': tasks.filter(t => t.status === 'To Do'),
    'In Progress': tasks.filter(t => t.status === 'In Progress'),
    'Done': tasks.filter(t => t.status === 'Done'),
  };

  return (
    <div className="project-detail">
      <div className="project-header">
        <div className="project-header-left">
          <button className="back-btn" onClick={() => navigate('/projects')}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15,18 9,12 15,6"/></svg>
            Projects
          </button>
          <div>
            <h2>{project.name}</h2>
            {project.description && <p className="page-subtitle">{project.description}</p>}
          </div>
        </div>
        <div className="project-header-actions">
          {isAdmin && (
            <>
              <button className="btn btn-ghost" onClick={() => setMembersModal(true)}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Members ({project.members?.length})
              </button>
              <button className="btn btn-primary" onClick={() => setTaskModal({})}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Task
              </button>
            </>
          )}
        </div>
      </div>

      <div className="view-tabs">
        <button className={`tab ${activeTab === 'board' ? 'active' : ''}`} onClick={() => setActiveTab('board')}>Board</button>
        <button className={`tab ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>List</button>
      </div>

      {activeTab === 'board' ? (
        <div className="kanban-board">
          {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
            <div key={status} className="kanban-column">
              <div className="column-header">
                <span className={`column-dot ${STATUS_COLORS[status]}`} />
                <span className="column-title">{status}</span>
                <span className="column-count">{statusTasks.length}</span>
              </div>
              <div className="column-tasks">
                {statusTasks.map(t => (
                  <TaskCard key={t._id} task={t} isAdmin={isAdmin} members={project.members}
                    onStatusChange={handleStatusChange} onEdit={setTaskModal} onDelete={handleDelete} />
                ))}
                {statusTasks.length === 0 && <div className="empty-column">No tasks here</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="task-list-view">
          <div className="list-filters">
            {['All', ...STATUSES].map(s => (
              <button key={s} className={`filter-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>{s}</button>
            ))}
          </div>
          <div className="task-table">
            <div className="task-table-header">
              <span>Task</span><span>Priority</span><span>Status</span><span>Assignee</span><span>Due Date</span>
              {isAdmin && <span>Actions</span>}
            </div>
            {filteredTasks.length === 0 ? (
              <div className="table-empty">No tasks found</div>
            ) : filteredTasks.map(t => (
              <div key={t._id} className="task-table-row">
                <span className="task-cell-title">{t.title}</span>
                <span><span className={`priority-badge ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span></span>
                <span>
                  {isAdmin ? (
                    <select value={t.status} onChange={e => handleStatusChange(t._id, e.target.value)} className="status-select">
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : (
                    <select value={t.status} onChange={e => handleStatusChange(t._id, e.target.value)} className="status-select">
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  )}
                </span>
                <span>{t.assigneeName || '—'}</span>
                <span className={t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done' ? 'overdue-text' : ''}>
                  {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}
                </span>
                {isAdmin && (
                  <span className="table-actions">
                    <button className="icon-btn" onClick={() => setTaskModal(t)}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="icon-btn danger" onClick={() => handleDelete(t._id)}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/></svg>
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {taskModal !== null && (
        <TaskModal task={taskModal._id ? taskModal : null} members={project.members || []} projectId={id}
          onClose={() => setTaskModal(null)} onSave={() => { setTaskModal(null); loadTasks(); }} />
      )}

      {membersModal && (
        <MembersModal project={project} onClose={() => setMembersModal(false)} onUpdate={loadProject} />
      )}
    </div>
  );
}
