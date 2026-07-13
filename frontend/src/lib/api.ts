const BASE_URL = "http://127.0.0.1:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const j = JSON.parse(text);
      detail = j.detail || text;
    } catch {}
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type Role = 'trainer' | 'client';


export interface LoginResp {
  role: Role;
  user_id?: string;
  name?: string;
}

export interface Client {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group?: string;
  instructions?: string;
  media_base64?: string;
  media_type?: 'image' | 'video' | '';
  created_at: string;
}

export interface ExerciseItem {
  exercise_id: string;
  target_sets: number;
  target_reps: number;
  target_weight: number;
  notes?: string;
}

export interface Day {
  day_number: number;
  name: string;
  notes?: string;
  items: ExerciseItem[];
}

export interface Week {
  week_number: number;
  name: string;
  notes?: string;
  days: Day[];
}

export interface Program {
  id: string;
  client_id: string;
  name: string;
  weeks: Week[];
  updated_at: string;
}

export interface SetEntry {
  set_number: number;
  weight: number;
  reps: number;
}

export interface WorkoutLog {
  id: string;
  client_id: string;
  exercise_id: string;
  week_number: number;
  day_number: number;
  sets: SetEntry[];
  notes?: string;
  completed_at: string;
}

export interface Message {
  id: string;
  client_id: string;
  sender: 'trainer' | 'client';
  text: string;
  created_at: string;
}

export interface SavedProgramme {
  id: string;
  name: string;
  weeks: Week[];
  created_at: string;
}

export const api = {
  login: (role: Role, code: string) =>
    request<LoginResp>('/auth/login', { method: 'POST', body: JSON.stringify({ role, code }) }),

  listClients: () => request<Client[]>('/clients'),
  createClient: (name: string) =>
    request<Client>('/clients', { method: 'POST', body: JSON.stringify({ name }) }),
  getClient: (id: string) => request<Client>(`/clients/${id}`),
  deleteClient: (id: string) => request<{ ok: boolean }>(`/clients/${id}`, { method: 'DELETE' }),

  listExercises: () => request<Exercise[]>('/exercises'),
  createExercise: (payload: Omit<Exercise, 'id' | 'created_at'>) =>
    request<Exercise>('/exercises', { method: 'POST', body: JSON.stringify(payload) }),
  getExercise: (id: string) => request<Exercise>(`/exercises/${id}`),
  updateExercise: (id: string, payload: Omit<Exercise, 'id' | 'created_at'>) =>
    request<Exercise>(`/exercises/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteExercise: (id: string) => request<{ ok: boolean }>(`/exercises/${id}`, { method: 'DELETE' }),

  getProgram: (clientId: string) => request<Program>(`/programs/${clientId}`),

  upsertProgram: (clientId: string, name: string, weeks: Week[]) =>
    request<Program>('/programs', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, name, weeks }),
    }),

  saveProgramme: (name: string, weeks: Week[]) =>
    request<SavedProgramme>('/saved-programmes', {
      method: 'POST',
      body: JSON.stringify({ name, weeks }),
    }),

   listSavedProgrammes: () =>
    request<SavedProgramme[]>('/saved-programmes'),

  deleteSavedProgramme: (id: string) =>
    request<{ ok: boolean }>(`/saved-programmes/${id}`, {
      method: 'DELETE',
    }),

  createLog: (payload: Omit<WorkoutLog, 'id' | 'completed_at'>) =>
    request<WorkoutLog>('/logs', { method: 'POST', body: JSON.stringify(payload) }),
  getLogs: (clientId: string, opts: { exercise_id?: string; week_number?: number } = {}) => {
    const qs = new URLSearchParams();
    if (opts.exercise_id) qs.set('exercise_id', opts.exercise_id);
    if (opts.week_number !== undefined) qs.set('week_number', String(opts.week_number));
    const q = qs.toString();
    return request<WorkoutLog[]>(`/logs/${clientId}${q ? `?${q}` : ''}`);
  },

  listMessages: (clientId: string) => request<Message[]>(`/messages/${clientId}`),
  createMessage: (clientId: string, sender: 'trainer' | 'client', text: string) =>
    request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, sender, text }),
    }),
};
