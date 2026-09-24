export default {
  configFile: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'release/dist',
    emptyOutDir: false,
    lib: {
      entry: 'release/src/index.ts',
      formats: ['iife'],
      name: 'MinInfograph',
      fileName: () => 'browser.js',
    },
    rollupOptions: {
      output: {
        intro: "const process = { env: { NODE_ENV: 'production' }, emit: () => {}, cwd: () => '/', platform: 'browser' };",
      },
    },
  },
};
