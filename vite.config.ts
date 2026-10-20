import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base совпадает с именем репозитория — так сайт работает на GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: '/university-grade-grinding/',
});
