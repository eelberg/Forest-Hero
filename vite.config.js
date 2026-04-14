import { defineConfig } from 'vite';

// Para GitHub Pages en subruta, usa p. ej. base: '/Forest-Hero/'
export default defineConfig({
    root: '.',
    publicDir: 'public',
    base: '/',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
    },
    optimizeDeps: {
        include: ['phaser'],
    },
});
