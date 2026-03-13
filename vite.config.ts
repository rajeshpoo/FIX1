import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [
      react(),
      {
        name: 'version-generator',
        writeBundle() {
          const version = Date.now().toString();
          const distPath = path.resolve('dist');
          const versionPath = path.join(distPath, 'version.json');
          if (fs.existsSync(distPath)) {
            fs.writeFileSync(versionPath, JSON.stringify({ version }));
            console.log(`✅ Generated version.json: ${version}`);
          }
        }
      }
    ],
    base: './',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      cssCodeSplit: false,
      // ✅ FIX: Production mein source maps band — code secure rahega
      sourcemap: false,
      // ✅ FIX: Production mein console.log band — debug info leak nahi hogi
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: true,
          pure_funcs: isProd ? ['console.log', 'console.debug', 'console.info'] : [],
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'lucide-react'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/messaging'],
            'vendor-utils': ['xlsx', 'jspdf', 'jspdf-autotable', 'html2canvas', 'pizzip', 'docxtemplater', 'file-saver'],
          }
        }
      }
    },
    server: {
      host: true,
      port: 3000,
    }
  };
});
