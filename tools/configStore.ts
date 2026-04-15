/**
 * configStore.ts — Client-side config persistence using localStorage.
 * Replaces the server-side /api/config route that used fs (broken on Vercel).
 *
 * Usage:
 *   import { getConfig, saveConfig } from '@/tools/configStore';
 *   const config = getConfig();           // returns full config object
 *   saveConfig('llm', { llm: 'groq', llmKey: 'xxx' });
 */

const STORAGE_KEY = 'testingbuddy_config';

export interface AppConfig {
  jira: { provider: string; url: string; email: string; token: string };
  llm: { llm: string; llmKey: string; model: string };
  testlink: { provider: string; devKey: string; url: string };
}

const DEFAULT_CONFIG: AppConfig = {
  jira: { provider: 'jira', url: '', email: '', token: '' },
  llm: { llm: 'groq', llmKey: '', model: 'llama-3.3-70b-versatile' },
  testlink: { provider: 'testlink', devKey: '', url: '' },
};

/**
 * Read the full config from localStorage.
 * Returns defaults if nothing is stored or if parsing fails.
 */
export function getConfig(): AppConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      jira: { ...DEFAULT_CONFIG.jira, ...parsed.jira },
      llm: { ...DEFAULT_CONFIG.llm, ...parsed.llm },
      testlink: { ...DEFAULT_CONFIG.testlink, ...parsed.testlink },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Save a specific config section to localStorage.
 * Merges with existing config so other sections are preserved.
 */
export function saveConfig(type: keyof AppConfig, data: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  const current = getConfig();
  current[type] = { ...current[type], ...data } as any;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

/**
 * Check if a URL contains a private/local IP that won't work in production.
 * Returns a warning message if detected, or null if the URL looks fine.
 */
export function detectPrivateUrl(url: string): string | null {
  if (!url) return null;
  const privatePatterns = [
    /^https?:\/\/192\.168\./i,
    /^https?:\/\/10\./i,
    /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./i,
    /^https?:\/\/127\./i,
    /^https?:\/\/localhost/i,
    /^https?:\/\/0\.0\.0\.0/i,
  ];
  for (const pattern of privatePatterns) {
    if (pattern.test(url.trim())) {
      return 'This is a private/local network address. It will not be reachable from production (Vercel). Use a public URL or a tunnel like ngrok.';
    }
  }
  return null;
}
