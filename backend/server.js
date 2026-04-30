const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Datastore = require('@seald-io/nedb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_taskmanager_2024';

app.use(cors());
app.use(express.json());

// Databases
const db = {
  users: new Datastore({ filename: path.join(__dirname, 'data/users.db'), autoload: true }),
  projects: new Datastore({ filename: path.join(__dirname, 'data/projects.db'), autoload: true }),
  members: new Datastore({ filename: path.join(__dirname, 'data/members.db'), autoload: true }),
  tasks: new Datastore({ filename: path.join(__dirname, 'data/tasks.db'), autoload: true }),
};

// Indexes
db.users.ensureIndex({ fieldName: 'email', unique: true });

// Helpers
const promisify = (fn) => (...args) => new Promise((res, rej) => fn(...args, (err, data) => err ? rej(err) : res(data)));
const insertOne = (col, doc) => promisify(db[col].insert.bind(db[col]))(doc);
const findOne = (col, query) => promisify(db[col].findOne.bind(db[col]))(query);
const findAll = (col, query) => promisify(db[col].find.bind(db[col]))(query);
const updateOne = (col, query, update) => promisify(db[col].update.bind(db[col]))(query, { $set: update }, {});
const removeOne = (col, query) => promisify(db[col].remove.bind(db[col]))(query, {});

// Auth middleware
const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ─── AUTH ROUTES ────────────────────────────────────────────────────────────

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const hash = await bcrypt.hash(password, 10);
    const user = await insertOne('users', { name, email, password: hash, createdAt: new Date() });
    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    if (e.errorType === 'uniqueViolated') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await findOne('users', { email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await findOne('users', { _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ id: user._id, name: user.name, email: user.email });
});

// ─── PROJECT ROUTES ──────────────────────────────────────────────────────────

app.post('/api/projects', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const project = await insertOne('projects', { name, description: description || '', createdBy: req.user.id, createdAt: new Date() });
    // Creator becomes Admin member
    await insertOne('members', { projectId: project._id, userId: req.user.id, role: 'Admin', joinedAt: new Date() });
    res.json(project);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/projects', auth, async (req, res) => {
  try {
    const memberships = await findAll('members', { userId: req.user.id });
    const projectIds = memberships.map(m => m.projectId);
    const projects = await Promise.all(projectIds.map(id => findOne('projects', { _id: id })));
    const result = await Promise.all(projects.filter(Boolean).map(async p => {
      const membership = memberships.find(m => m.projectId === p._id);
      const allMembers = await findAll('members', { projectId: p._id });
      return { ...p, id: p._id, role: membership.role, memberCount: allMembers.length };
    }));
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/projects/:id', auth, async (req, res) => {
  try {
    const membership = await findOne('members', { projectId: req.params.id, userId: req.user.id });
    if (!membership) return res.status(403).json({ error: 'Not a member' });
    const project = await findOne('projects', { _id: req.params.id });
    if (!project) return res.status(404).json({ error: 'Not found' });
    const allMembers = await findAll('members', { projectId: req.params.id });
    const membersWithNames = await Promise.all(allMembers.map(async m => {
      const u = await findOne('users', { _id: m.userId });
      return { id: m._id, userId: m.userId, role: m.role, name: u?.name || 'Unknown', email: u?.email || '' };
    }));
    res.json({ ...project, id: project._id, members: membersWithNames, userRole: membership.role });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/projects/:id', auth, async (req, res) => {
  try {
    const membership = await findOne('members', { projectId: req.params.id, userId: req.user.id });
    if (!membership || membership.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
    const { name, description } = req.body;
    await updateOne('projects', { _id: req.params.id }, { name, description });
    const project = await findOne('projects', { _id: req.params.id });
    res.json(project);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/projects/:id', auth, async (req, res) => {
  try {
    const membership = await findOne('members', { projectId: req.params.id, userId: req.user.id });
    if (!membership || membership.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
    await removeOne('projects', { _id: req.params.id });
    await promisify(db.members.remove.bind(db.members))({ projectId: req.params.id }, { multi: true });
    await promisify(db.tasks.remove.bind(db.tasks))({ projectId: req.params.id }, { multi: true });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── MEMBER ROUTES ───────────────────────────────────────────────────────────

app.post('/api/projects/:id/members', auth, async (req, res) => {
  try {
    const membership = await findOne('members', { projectId: req.params.id, userId: req.user.id });
    if (!membership || membership.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
    const { email, role } = req.body;
    const user = await findOne('users', { email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const existing = await findOne('members', { projectId: req.params.id, userId: user._id });
    if (existing) return res.status(400).json({ error: 'Already a member' });
    await insertOne('members', { projectId: req.params.id, userId: user._id, role: role || 'Member', joinedAt: new Date() });
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email } });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/projects/:id/members/:userId', auth, async (req, res) => {
  try {
    const membership = await findOne('members', { projectId: req.params.id, userId: req.user.id });
    if (!membership || membership.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
    if (req.params.userId === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself' });
    await removeOne('members', { projectId: req.params.id, userId: req.params.userId });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/projects/:id/members/:userId/role', auth, async (req, res) => {
  try {
    const membership = await findOne('members', { projectId: req.params.id, userId: req.user.id });
    if (!membership || membership.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
    const { role } = req.body;
    await updateOne('members', { projectId: req.params.id, userId: req.params.userId }, { role });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── TASK ROUTES ─────────────────────────────────────────────────────────────

app.post('/api/projects/:id/tasks', auth, async (req, res) => {
  try {
    const membership = await findOne('members', { projectId: req.params.id, userId: req.user.id });
    if (!membership) return res.status(403).json({ error: 'Not a member' });
    if (membership.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
    const { title, description, dueDate, priority, assignedTo } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const task = await insertOne('tasks', {
      projectId: req.params.id,
      title, description: description || '',
      dueDate: dueDate || null,
      priority: priority || 'Medium',
      status: 'To Do',
      assignedTo: assignedTo || null,
      createdBy: req.user.id,
      createdAt: new Date()
    });
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/projects/:id/tasks', auth, async (req, res) => {
  try {
    const membership = await findOne('members', { projectId: req.params.id, userId: req.user.id });
    if (!membership) return res.status(403).json({ error: 'Not a member' });
    let tasks = await findAll('tasks', { projectId: req.params.id });
    if (membership.role !== 'Admin') {
      tasks = tasks.filter(t => t.assignedTo === req.user.id);
    }
    const tasksWithUser = await Promise.all(tasks.map(async t => {
      const assignee = t.assignedTo ? await findOne('users', { _id: t.assignedTo }) : null;
      return { ...t, id: t._id, assigneeName: assignee?.name || null };
    }));
    res.json(tasksWithUser);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/projects/:projectId/tasks/:taskId', auth, async (req, res) => {
  try {
    const membership = await findOne('members', { projectId: req.params.projectId, userId: req.user.id });
    if (!membership) return res.status(403).json({ error: 'Not a member' });
    const task = await findOne('tasks', { _id: req.params.taskId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    let updates = {};
    if (membership.role === 'Admin') {
      const { title, description, dueDate, priority, assignedTo, status } = req.body;
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (dueDate !== undefined) updates.dueDate = dueDate;
      if (priority !== undefined) updates.priority = priority;
      if (assignedTo !== undefined) updates.assignedTo = assignedTo;
      if (status !== undefined) updates.status = status;
    } else {
      if (task.assignedTo !== req.user.id) return res.status(403).json({ error: 'Not your task' });
      if (req.body.status !== undefined) updates.status = req.body.status;
    }
    
    await updateOne('tasks', { _id: req.params.taskId }, updates);
    const updated = await findOne('tasks', { _id: req.params.taskId });
    res.json({ ...updated, id: updated._id });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/projects/:projectId/tasks/:taskId', auth, async (req, res) => {
  try {
    const membership = await findOne('members', { projectId: req.params.projectId, userId: req.user.id });
    if (!membership || membership.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
    await removeOne('tasks', { _id: req.params.taskId });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const memberships = await findAll('members', { userId: req.user.id });
    const projectIds = memberships.map(m => m.projectId);
    
    let allTasks = [];
    for (const pid of projectIds) {
      const m = memberships.find(x => x.projectId === pid);
      let tasks = await findAll('tasks', { projectId: pid });
      if (m.role !== 'Admin') tasks = tasks.filter(t => t.assignedTo === req.user.id);
      allTasks = allTasks.concat(tasks);
    }

    const now = new Date();
    const stats = {
      total: allTasks.length,
      todo: allTasks.filter(t => t.status === 'To Do').length,
      inProgress: allTasks.filter(t => t.status === 'In Progress').length,
      done: allTasks.filter(t => t.status === 'Done').length,
      overdue: allTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done').length,
      projects: projectIds.length,
    };

    // Tasks per user (for admin projects)
    const adminProjects = memberships.filter(m => m.role === 'Admin').map(m => m.projectId);
    let tasksByUser = {};
    for (const pid of adminProjects) {
      const tasks = await findAll('tasks', { projectId: pid });
      for (const t of tasks) {
        if (t.assignedTo) {
          if (!tasksByUser[t.assignedTo]) {
            const u = await findOne('users', { _id: t.assignedTo });
            tasksByUser[t.assignedTo] = { name: u?.name || 'Unknown', count: 0 };
          }
          tasksByUser[t.assignedTo].count++;
        }
      }
    }

    res.json({ stats, tasksByUser: Object.values(tasksByUser) });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── USERS SEARCH ────────────────────────────────────────────────────────────
app.get('/api/users/search', auth, async (req, res) => {
  const { email } = req.query;
  if (!email) return res.json([]);
  const users = await findAll('users', {});
  const filtered = users.filter(u => u.email.includes(email) && u._id !== req.user.id)
    .map(u => ({ id: u._id, name: u.name, email: u.email })).slice(0, 5);
  res.json(filtered);
});

// Create data directory
const fs = require('fs');
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
