const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
// Use RAILWAY_VOLUME_MOUNT_PATH if available (Railway persistent volume)
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH)
  : path.join(__dirname, 'data');
const DATA_FILE = path.join(dataDir, 'tasks.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory and file exist
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks: [], nextId: 1 }, null, 2));
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET all tasks
app.get('/api/tasks', (req, res) => {
  const data = readData();
  res.json(data.tasks);
});

// POST create task
app.post('/api/tasks', (req, res) => {
  const { title, description, priority, dueDate, column } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const data = readData();
  const task = {
    id: data.nextId++,
    title: title.trim(),
    description: description ? description.trim() : '',
    priority: priority || 'medium',
    dueDate: dueDate || null,
    column: column || 'todo',
    createdAt: new Date().toISOString()
  };
  data.tasks.push(task);
  writeData(data);
  res.status(201).json(task);
});

// PUT update task
app.put('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readData();
  const index = data.tasks.findIndex(t => t.id === id);
  if (index === -1) return res.status(404).json({ error: 'Task not found' });
  data.tasks[index] = { ...data.tasks[index], ...req.body, id };
  writeData(data);
  res.json(data.tasks[index]);
});

// DELETE task
app.delete('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readData();
  const index = data.tasks.findIndex(t => t.id === id);
  if (index === -1) return res.status(404).json({ error: 'Task not found' });
  data.tasks.splice(index, 1);
  writeData(data);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Kanban Pro running at http://localhost:${PORT}`);
});
