export default {
  configFile: false,
  build: {
    outDir: 'release/dist',
    emptyOutDir: false,
    lib: {
      entry: 'release/src/index.ts',
      formats: ['iife'],
      name: 'MinInfograph',
      fileName: () => 'browser.js',
    },
  },
};
