import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The app is served from a URL subpath on the shared domain, so production
// asset URLs must be prefixed. `base` is applied to `vite build` only —
// `npm run dev` keeps serving from "/" so local development is unchanged.
//
// This string is one of the three places the subpath appears; the other two
// are the nginx `location` block and uvicorn's --root-path (Dockerfile.web).
// All three must match exactly. src/api.js derives the API base from this
// value via import.meta.env.BASE_URL, so it is not repeated there.
const BASE_PATH = "/tc_compliance/";

export default defineConfig(({ command }) => ({
  base: command === "build" ? BASE_PATH : "/",
  plugins: [react(), tailwindcss()],
  server: {
    // Dev-only: the SPA calls "/api/..." (see src/api.js) and this forwards
    // those to the local uvicorn. No path rewrite — the backend's routes are
    // themselves mounted under /api.
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
}));
