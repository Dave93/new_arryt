import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import million from "million/compiler";
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
    plugins: [tsconfigPaths(), million.vite({ auto: true }), react()]
});