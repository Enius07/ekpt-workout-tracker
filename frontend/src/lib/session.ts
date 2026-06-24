import { storage } from '@/src/utils/storage';
import { Role } from './api';

const SESSION_KEY = 'forgetrack_session';
const LAST_CODE_KEY = 'ekpt_last_code';
const LAST_ROLE_KEY = 'ekpt_last_role';

export interface Session {
  role: Role;
  user_id: string;
  name: string;
}

export async function saveSession(s: Session): Promise<void> {
  await storage.setItem(SESSION_KEY, JSON.stringify(s));
}

export async function loadSession(): Promise<Session | null> {
  const raw = await storage.getItem(SESSION_KEY, null);
  if (!raw || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await storage.removeItem(SESSION_KEY);
}

export async function saveLastLogin(role: Role, code: string): Promise<void> {
  await storage.setItem(LAST_CODE_KEY, code);
  await storage.setItem(LAST_ROLE_KEY, role);
}

export async function loadLastLogin(): Promise<{ role: Role | null; code: string }> {
  const code = (await storage.getItem(LAST_CODE_KEY, '')) || '';
  const role = (await storage.getItem(LAST_ROLE_KEY, null)) as Role | null;
  return { role, code: typeof code === 'string' ? code : '' };
}
