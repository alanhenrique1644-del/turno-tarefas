const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api').replace(/\/$/, '');

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      cache: 'no-store',
    });
  } catch {
    throw new Error('Não foi possível conectar à API. Confira se o servidor e o MySQL estão ligados.');
  }

  if (!response.ok) {
    let message = 'Ocorreu um erro ao falar com a API.';
    try {
      const payload = await response.json();
      if (payload?.error) message = payload.error;
    } catch {
      // A resposta pode não conter JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function getTasks({ page = 1, limit = 8, completed, search = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (completed !== undefined && completed !== null) params.set('completed', String(completed));
  if (search.trim()) params.set('search', search.trim());
  return request(`/tasks?${params.toString()}`);
}

export function getHealth() {
  return request('/health');
}

export async function createTask(task) {
  return request('/tasks', { method: 'POST', body: JSON.stringify(task) });
}

export async function updateTask(id, changes) {
  return request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
}

export async function deleteTask(id) {
  return request(`/tasks/${id}`, { method: 'DELETE' });
}
