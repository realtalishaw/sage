import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  /*
    The landing-page app lives nested under apps/marketing-site, so Vite needs an
    explicit alias for the DB helpers it uses instead of assuming a flat app repo.
    For this frontend we intentionally resolve @sage/db to a local browser-safe
    shim so the app reads Supabase env vars from its own Vite .env file.
  */
  plugins: [react()],
  resolve: {
    alias: {
      "@sage/db": path.resolve(currentDir, "./src/lib/browser-db.ts"),
    },
  },
});
