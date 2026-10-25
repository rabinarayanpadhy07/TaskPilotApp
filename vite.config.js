import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "")

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          // Split rarely-changing vendor code into long-term-cacheable chunks
          codeSplitting: {
            groups: [
              {
                name: "react",
                test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
                priority: 30,
              },
              {
                // Only the lazily loaded Reports page uses these
                name: "charts",
                test: /node_modules[\\/](recharts|d3-[a-z-]+|victory-vendor|internmap|decimal\.js-light|es-toolkit|react-redux|@reduxjs|redux|redux-thunk|reselect|immer|eventemitter3|tiny-invariant|use-sync-external-store)[\\/]/,
                priority: 15,
              },
              {
                name: "ui",
                // clsx etc. are shared with Recharts; pin them here so the app's
                // cn() doesn't pull the lazy charts chunk into the first load
                test: /node_modules[\\/](radix-ui|@radix-ui|@floating-ui|lucide-react|clsx|tailwind-merge|class-variance-authority)[\\/]/,
                priority: 20,
              },
              { name: "vendor", test: /node_modules[\\/]/, priority: 10 },
            ],
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        // Forward API calls to Django during development
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  }
})
