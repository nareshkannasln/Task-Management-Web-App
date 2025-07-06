import express from 'express';
import pkg from 'pg';
import bcrypt from 'bcrypt';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;
const app = express();
app.use(cors("*"));
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// ✅ SIGNUP
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      [username, hash]
    );
    res.status(200).send('Signup successful');
  } catch (err) {
    console.error(err);
    res.status(400).send('Username already exists');
  }
});

// ✅ LOGIN
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );

  if (result.rows.length === 0) {
    return res.status(400).send('Invalid credentials');
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (valid) {
    res.status(200).send('Login successful');
  } else {
    res.status(400).send('Invalid credentials');
  }
});

// ✅ GET TASKS (owner + shared)
app.get('/tasks', async (req, res) => {
  const { username } = req.query;

  const userResult = await pool.query(
    'SELECT id FROM users WHERE username = $1',
    [username]
  );
  if (userResult.rows.length === 0)
    return res.status(400).send('User not found');

  const userId = userResult.rows[0].id;

  const tasks = await pool.query(
    `
    SELECT tasks.id, tasks.text, tasks.status
    FROM tasks
    JOIN task_users ON tasks.id = task_users.task_id
    WHERE task_users.user_id = $1
    `,
    [userId]
  );

  res.json(tasks.rows);
});

// ✅ ADD TASK for user → link in task_users
app.post('/tasks', async (req, res) => {
  const { username, text } = req.body;

  const userResult = await pool.query(
    'SELECT id FROM users WHERE username = $1',
    [username]
  );
  if (userResult.rows.length === 0)
    return res.status(400).send('User not found');

  const userId = userResult.rows[0].id;

  const insertResult = await pool.query(
    'INSERT INTO tasks (text, status) VALUES ($1, $2) RETURNING id',
    [text, 'todo']
  );

  const taskId = insertResult.rows[0].id;

  await pool.query(
    'INSERT INTO task_users (task_id, user_id) VALUES ($1, $2)',
    [taskId, userId]
  );

  res.send(taskId.toString());
});

// ✅ UPDATE TASK → text/status
app.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { text, status } = req.body;

  await pool.query(
    'UPDATE tasks SET text = $1, status = $2 WHERE id = $3',
    [text, status, id]
  );

  res.send('Task updated');
});

// ✅ DELETE TASK
app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;

  await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

  res.send('Task deleted');
});

// ✅ SHARE TASK
app.post('/tasks/:id/share', async (req, res) => {
  const { id } = req.params;
  const { toUsername } = req.body;

  const userResult = await pool.query(
    'SELECT id FROM users WHERE username = $1',
    [toUsername]
  );

  if (userResult.rows.length === 0)
    return res.status(400).send('User not found');

  const toUserId = userResult.rows[0].id;

  const exists = await pool.query(
    'SELECT * FROM task_users WHERE task_id = $1 AND user_id = $2',
    [id, toUserId]
  );

  if (exists.rows.length > 0)
    return res.status(400).send('Task already shared with this user');

  await pool.query(
    'INSERT INTO task_users (task_id, user_id) VALUES ($1, $2)',
    [id, toUserId]
  );

  res.send('Task shared');
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
