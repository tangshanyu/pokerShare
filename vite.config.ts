import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import roomsHandler from './api/rooms';
import liveblocksAuthHandler from './api/liveblocks-auth';

const localApi = (): Plugin => ({
  name: 'local-api',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/api/rooms', (request, response) => {
      void roomsHandler(request, response);
    });
    server.middlewares.use('/api/liveblocks-auth', (request, response) => {
      void liveblocksAuthHandler(request, response);
    });
  },
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    if (env.LIVEBLOCKS_SECRET_KEY) {
      process.env.LIVEBLOCKS_SECRET_KEY = env.LIVEBLOCKS_SECRET_KEY;
    }
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), localApi()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
