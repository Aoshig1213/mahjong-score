import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // どのURLの下に置いても動くように相対パスにする
  base: './',
  plugins: [react()],
});
