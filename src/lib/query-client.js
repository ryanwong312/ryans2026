import { QueryClient } from '@tanstack/react-query';
import { createClient } from '@base44/sdk';

// ---- TanStack Query client ----
export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ---- Base44 client ----
const base44Client = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  headers: {
    api_key: import.meta.env.VITE_BASE44_API_KEY,
  }
});

export const base44 = base44Client;
export const db = base44Client;

// Make it available globally for components that use globalThis.__B44_DB__
globalThis.__B44_DB__ = base44Client;

export default base44Client;