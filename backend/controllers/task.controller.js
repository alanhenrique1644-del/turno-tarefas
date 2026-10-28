import pool from '../config/database.js';
import { HttpError } from '../utils/http-error.js';

const TASK_COLUMNS = 'id, title, description, completed, created_at, updated_at';
const ALLOWED_UPDATE_FIELDS = new Set(['title', 'description', 'completed']);

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, 'O ID da tarefa precisa ser um número inteiro positivo.');
  }
  return id;
}

function normalizeTask(row) {
  return { ...row, completed: Boolean(row.completed) };
}

function validateTitle(title) {
  if (typeof title !== 'string' || !title.trim()) {
    throw new HttpError(400, 'O título é obrigatório e não pode ficar vazio.');
  }
  if (title.trim().length > 150) {
    throw new HttpError(400, 'O título deve ter no máximo 150 caracteres.');
  }
  return title.trim();
}

function validateDescription(description) {
  if (description !== null && typeof description !== 'string') {
    throw new HttpError(400, 'A descrição precisa ser um texto ou null.');
  }
  return description?.trim() || null;
}

function validateCompleted(completed) {
  if (typeof completed !== 'boolean') {
    throw new HttpError(400, 'O campo completed precisa ser true ou false.');
  }
  return completed;
}

export async function listTasks(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const requestedLimit = Number.parseInt(req.query.limit, 10) || 20;
  const limit = Math.min(100, Math.max(1, requestedLimit));
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];

  if (req.query.completed !== undefined) {
    if (req.query.completed !== 'true' && req.query.completed !== 'false') {
      throw new HttpError(400, 'O filtro completed deve ser true ou false.');
    }
    conditions.push('completed = ?');
    values.push(req.query.completed === 'true' ? 1 : 0);
  }

  if (req.query.search !== undefined) {
    const search = String(req.query.search).trim();
    if (search) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      values.push(`%${search}%`, `%${search}%`);
    }
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM tasks ${whereClause}`, values);
  const total = Number(countRows[0].total);
  const [rows] = await pool.execute(
    `SELECT ${TASK_COLUMNS} FROM tasks ${whereClause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );

  return res.json({
    data: rows.map(normalizeTask),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getTaskById(req, res) {
  const id = parseId(req.params.id);
  const [rows] = await pool.execute(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) throw new HttpError(404, 'Tarefa não encontrada.');
  return res.json({ data: normalizeTask(rows[0]) });
}

export async function createTask(req, res) {
  const body = req.body ?? {};
  const title = validateTitle(body.title);
  const description = body.description === undefined ? null : validateDescription(body.description);
  const completed = body.completed === undefined ? false : validateCompleted(body.completed);
  const [result] = await pool.execute(
    'INSERT INTO tasks (title, description, completed) VALUES (?, ?, ?)',
    [title, description, completed],
  );
  const [rows] = await pool.execute(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ? LIMIT 1`, [result.insertId]);
  return res.status(201).json({ data: normalizeTask(rows[0]) });
}

export async function updateTask(req, res) {
  const id = parseId(req.params.id);
  const body = req.body ?? {};
  const entries = Object.entries(body);
  if (!entries.length) throw new HttpError(400, 'Informe pelo menos um campo para atualizar.');

  const unknownFields = entries.map(([key]) => key).filter((key) => !ALLOWED_UPDATE_FIELDS.has(key));
  if (unknownFields.length) throw new HttpError(400, `Campo(s) não permitido(s): ${unknownFields.join(', ')}.`);

  const updates = {};
  for (const [key, value] of entries) {
    if (key === 'title') updates.title = validateTitle(value);
    if (key === 'description') updates.description = validateDescription(value);
    if (key === 'completed') updates.completed = validateCompleted(value);
  }

  const [existingRows] = await pool.execute(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ? LIMIT 1`, [id]);
  if (!existingRows.length) throw new HttpError(404, 'Tarefa não encontrada.');

  const columns = Object.keys(updates);
  const setClause = columns.map((column) => `${column} = ?`).join(', ');
  await pool.execute(`UPDATE tasks SET ${setClause} WHERE id = ?`, [...columns.map((column) => updates[column]), id]);
  const [rows] = await pool.execute(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ? LIMIT 1`, [id]);
  return res.json({ data: normalizeTask(rows[0]) });
}

export async function deleteTask(req, res) {
  const id = parseId(req.params.id);
  const [result] = await pool.execute('DELETE FROM tasks WHERE id = ?', [id]);
  if (!result.affectedRows) throw new HttpError(404, 'Tarefa não encontrada.');
  return res.status(204).send();
}
