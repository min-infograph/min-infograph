export default {
  configFile: false,
  build: {
    outDir: 'release/dist',
    emptyOutDir: false,
    lib: {
      entry: 'release/src/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: { external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'] },
  },
};
