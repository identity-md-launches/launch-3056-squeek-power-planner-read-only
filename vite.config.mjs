import { resolve } from 'node:path';

// Optional external dependency directory for restricted build environments.
const deps = process.env.PLANNER_DEPS;
export default {
  base: './',
  resolve: {
    alias: deps ? Object.fromEntries(['react', 'react-dom', 'wagmi', 'viem', '@tanstack/react-query']
      .map(name => [name, resolve(deps, name)])) : {},
  },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 650 },
};
