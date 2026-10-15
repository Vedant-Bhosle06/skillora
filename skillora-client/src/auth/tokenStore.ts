// The only module that reads or writes the auth token in localStorage.
// An in-memory copy is kept so a blocked/unavailable storage never breaks the app.

export const TOKEN_KEY = 'skillora.token';

let memoryToken: string | null = readStorage();

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export const tokenStore = {
  get(): string | null {
    return memoryToken;
  },

  set(token: string): void {
    memoryToken = token;
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // storage unavailable (private mode, quota): keep the in-memory copy only
    }
  },

  clear(): void {
    memoryToken = null;
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  },

  /** Re-read storage after another tab changed it; returns the new token. */
  syncFromStorage(): string | null {
    memoryToken = readStorage();
    return memoryToken;
  },
};
