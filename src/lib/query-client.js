import { createClient } from '@base44/sdk';

// Initialize the Base44 client with your app credentials
export const base44 = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  headers: {
    api_key: import.meta.env.VITE_BASE44_API_KEY,
  }
});

// Also export as `db` for compatibility with existing code that uses `db.entities...`
export const db = base44;

// Default export for convenience
export default base44;