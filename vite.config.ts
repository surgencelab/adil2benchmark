import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'node:child_process';

/**
 * Custom Vite plugin: POST /api/refresh runs the Python fetchers and
 * regenerates public/data.json.
 */
function refreshDataPlugin(): Plugin {
  return {
    name: 'refresh-data',
    configureServer(server) {
      server.middlewares.use('/api/refresh', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }
        const p = spawn('python3', ['scripts/refresh_all.py'], {
          cwd: process.cwd(),
        });
        let stdout = '';
        let stderr = '';
        p.stdout.on('data', (b) => { stdout += b.toString(); });
        p.stderr.on('data', (b) => { stderr += b.toString(); });
        p.on('close', (code) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: code === 0, stdout, stderr }));
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), refreshDataPlugin()],
  server: { host: '0.0.0.0', port: 5180 },
  build: { outDir: 'dist', sourcemap: false },
});
