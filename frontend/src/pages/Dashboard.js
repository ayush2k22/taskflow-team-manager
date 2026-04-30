import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ label, value, color, icon }) => (
  <div className={`stat-card ${color}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const { stats, tasksByUser } = data || { stats: {}, tasksByUser: [] };

  return (
    <div className="dashboard">
      <div className="page-header">
        <h2>Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0]} 👋</h2>
        <p className="page-subtitle">Here's what's happening with your projects today.</p>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Tasks" value={stats.total || 0} color="blue"
          icon={<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>} />
        <StatCard label="In Progress" value={stats.inProgress || 0} color="amber"
          icon={<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>} />
        <StatCard label="Completed" value={stats.done || 0} color="green"
          icon={<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>} />
        <StatCard label="Overdue" value={stats.overdue || 0} color="red"
          icon={<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} />
        <StatCard label="To Do" value={stats.todo || 0} color="slate"
          icon={<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>} />
        <StatCard label="Projects" value={stats.projects || 0} color="purple"
          icon={<svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>} />
      </div>

      {stats.total > 0 && (
        <div className="progress-section">
          <h3>Task Status Breakdown</h3>
          <div className="progress-bar-container">
            <div className="progress-bar">
              {stats.todo > 0 && <div className="pb-todo" style={{ width: `${(stats.todo / stats.total) * 100}%` }} title={`To Do: ${stats.todo}`} />}
              {stats.inProgress > 0 && <div className="pb-progress" style={{ width: `${(stats.inProgress / stats.total) * 100}%` }} title={`In Progress: ${stats.inProgress}`} />}
              {stats.done > 0 && <div className="pb-done" style={{ width: `${(stats.done / stats.total) * 100}%` }} title={`Done: ${stats.done}`} />}
            </div>
            <div className="progress-legend">
              <span><span className="dot todo" />To Do ({stats.todo})</span>
              <span><span className="dot progress" />In Progress ({stats.inProgress})</span>
              <span><span className="dot done" />Done ({stats.done})</span>
            </div>
          </div>
        </div>
      )}

      {tasksByUser.length > 0 && (
        <div className="tasks-per-user">
          <h3>Tasks per Team Member</h3>
          <div className="user-task-list">
            {tasksByUser.map((u, i) => (
              <div key={i} className="user-task-row">
                <div className="user-task-avatar">{u.name[0].toUpperCase()}</div>
                <div className="user-task-name">{u.name}</div>
                <div className="user-task-bar-wrap">
                  <div className="user-task-bar" style={{ width: `${Math.min((u.count / Math.max(...tasksByUser.map(x => x.count))) * 100, 100)}%` }} />
                </div>
                <div className="user-task-count">{u.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.total === 0 && (
        <div className="empty-dashboard">
          <div className="empty-icon">📋</div>
          <h3>No tasks yet</h3>
          <p>Create a project and start adding tasks to see your dashboard come alive.</p>
        </div>
      )}
    </div>
  );
}
