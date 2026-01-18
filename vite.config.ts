import { chapplin } from "chapplin/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [chapplin()],
  esbuild: {
    jsx: "automatic",
  },
  ssr: {
    external: [
      "@hono/node-server",
      "@hono/mcp",
      "@modelcontextprotocol/sdk",
      "hono",
      "fast-xml-parser",
      "react",
      "react-dom",
      "zod",
    ],
  },
  build: {
    rollupOptions: {
      external: [
        "@hono/node-server",
        "@hono/mcp",
        "@modelcontextprotocol/sdk",
        "hono",
        "fast-xml-parser",
        "react",
        "react-dom",
        "zod",
      ],
    },
  },
});
