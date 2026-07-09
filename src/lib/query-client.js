import { QueryClient } from '@tanstack/react-query';
import { createClient } from '@base44/sdk';

// ---- 1. TanStack Query client ----
export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ---- 2. Base44 client ----
const base44Client = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  headers: {
    api_key: import.meta.env.VITE_BASE44_API_KEY,
  }
});

export const base44 = base44Client;
export const db = base44Client;

// ---- 3. Make the real client globally available ----
globalThis.__B44_DB__ = base44Client;

export default base44Client;