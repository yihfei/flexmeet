import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin in dev too: /api is forwarded to the Express server.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
