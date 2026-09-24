import { fileURLToPath } from "node:url";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: isSsrBuild ? "dist/server" : "dist/client",
    rollupOptions: isSsrBuild
      ? undefined
      : {
          output: {
            entryFileNames: "assets/entry-client.js",
            assetFileNames: (assetInfo) => {
              if (assetInfo.names.some((name) => name.endsWith(".css"))) {
                return "assets/styles.css";
              }

              if (assetInfo.names.includes("inter-latin-wght-normal.woff2")) {
                return "assets/inter-latin-wght-normal.woff2";
              }

              return "assets/[name]-[hash][extname]";
            },
          },
        },
  },
}));
