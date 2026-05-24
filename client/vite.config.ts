import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(process.cwd(), '..'), '');
  const serverPort = env.SERVER_PORT || '3001';
  const clientPort = parseInt(env.CLIENT_PORT || '5173');

  return {
    plugins: [react()],
    server: {
      port: clientPort,
      proxy: {
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
        },
        '/images': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
        },
        '/videos': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
