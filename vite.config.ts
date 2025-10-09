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
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react-quill": reactQuillEntry,
      "react-quill/lib/index.js": reactQuillEntry,
      "react-quill/dist/quill.snow.css": reactQuillSnowCss,
    },
  },
  optimizeDeps: {
    include: ['react-quill'],
  },
}));
