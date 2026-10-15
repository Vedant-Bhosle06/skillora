import type { Me } from '@/api/types';

// In-app sections a post-login redirect may return to. Anything else
// (other origins, protocol-relative URLs, /login itself) falls back.
const ALLOWED_PREFIXES = ['/dashboard', '/progress', '/graph', '/settings', '/admin', '/onboarding'];

function matchesPrefix(path: string, prefix: string): boolean {
  if (!path.startsWith(prefix)) return false;
  const next = path.charAt(prefix.length);
  return next === '' || next === '/' || next === '?' || next === '#';
}

/** Returns `from` only when it is a safe in-app path; otherwise `fallback`. */
export function safeRedirect(from: unknown, fallback: string): string {
  if (typeof from !== 'string') return fallback;
  if (from.includes('//') || from.includes('\\')) return fallback;
  return ALLOWED_PREFIXES.some((p) => matchesPrefix(from, p)) ? from : fallback;
}

/** Where a signed-in user goes next: unfinished onboarding first, then `from`. */
export function nextRouteFor(user: Me, from?: unknown): string {
  if (!user.targetRoleId) {
    const safe = safeRedirect(from, '');
    if (safe && !matchesPrefix(safe, '/dashboard') && !matchesPrefix(safe, '/progress')) return safe;
    return user.currentSkills.length === 0 ? '/onboarding/skills' : '/onboarding/role';
  }
  return safeRedirect(from, '/dashboard');
}
