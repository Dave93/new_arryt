import MillionLint from '@million/lint';
import million from 'million/compiler';
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import MillionCompiler from "@million/lint";
import path from 'path';

// https://vitejs.dev/config/
const _plugins = [tsconfigPaths(), react()];
// _plugins.unshift(million.vite({
//   auto: true
// }), MillionLint.vite())
export default defineConfig({
  resolve: {
    alias: {
      '@admin': path.resolve(__dirname),
      '@api': path.resolve(__dirname, '../api')
      // ...other aliases
    }
  },
  plugins: _plugins
});