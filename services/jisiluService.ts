import { BondData } from '../types';
import type { ScoreConfig } from '../lib/scoreConfig';

interface LoginParams {
  user_name: string;
  password: string;
}

let currentCookie: string | null = null;

const COOKIE_STORAGE_KEY = 'jisilu_cookie';

export const restoreJisiluCookie = () => {
  if (typeof window === 'undefined') return;
  const saved = localStorage.getItem(COOKIE_STORAGE_KEY);
  if (saved) currentCookie = saved;
};

export const loginJisilu = async ({ user_name, password }: LoginParams): Promise<boolean> => {
  const resp = await fetch('/api/jisilu/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_name, password }),
  });

  const data = await resp.json();

  if (!resp.ok || !data?.success) {
    throw new Error(data?.message || '集思录登录失败');
  }

  currentCookie = data.cookie as string;
  if (typeof window !== 'undefined') {
    localStorage.setItem(COOKIE_STORAGE_KEY, currentCookie);
  }
  return true;
};

export const logoutJisilu = () => {
  currentCookie = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(COOKIE_STORAGE_KEY);
  }
};

export const fetchJisiluData = async (scoreConfig?: ScoreConfig): Promise<BondData[]> => {
  if (!currentCookie) {
    throw new Error('尚未登录集思录');
  }

  const resp = await fetch('/api/jisilu/bonds', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cookie: currentCookie, scoreConfig }),
  });

  const data = await resp.json();

  if (!resp.ok || !data?.success) {
    throw new Error(data?.message || '获取集思录数据失败');
  }

  return data.bonds as BondData[];
};