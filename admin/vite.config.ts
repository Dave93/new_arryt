import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import MillionCompiler from "@million/lint";
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            '@admin': path.resolve(__dirname),
            '@api': path.resolve(__dirname, '../api'),
            // ...other aliases
        },
    },
    plugins: [tsconfigPaths(), MillionCompiler.vite({ auto: true }), react()]
});