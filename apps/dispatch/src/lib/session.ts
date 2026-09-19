// The Dispatch session is a signed bearer token from dispatch.login, kept in
// localStorage (this is a single-admin internal tool).

const KEY = "dispatch.session";

export type Session = { token: string; expiresAt: string };

export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {}
}

export function clearSession() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
