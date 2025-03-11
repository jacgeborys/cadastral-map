import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: "",  // ✅ Set this to "" for GitHub Pages with a custom domain
  build: {
    outDir: "dist",
  }
});