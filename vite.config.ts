import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const reactQuillEntry = path.resolve(
  __dirname,
  "node_modules/react-quill/lib/index.js",
);
const reactQuillSnowCss = path.resolve(
  __dirname,
  "node_modules/react-quill/dist/quill.snow.css",
);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: "react-quill/dist/quill.snow.css", replacement: reactQuillSnowCss },
      { find: "react-quill/lib/index.js", replacement: reactQuillEntry },
      { find: "react-quill", replacement: reactQuillEntry },
    ],
  },
  optimizeDeps: {
    include: ['react-quill'],
  },
}));
