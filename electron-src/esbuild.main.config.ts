import type { BuildOptions } from "esbuild";
import * as path from "path";

const config: BuildOptions = {
  platform: "node",
  entryPoints: [
    path.resolve("electron-src/index.ts"),
    path.resolve("electron-src/workers/worker.ts"),
    path.resolve("electron-src/workers/embeddings-worker.ts"),
    path.resolve("electron-src/utils/preload.ts"),
  ],
  bundle: true,
  external: ["electron", "next", "better-sqlite3", "electron-mac-contacts", "node-electron-permissions", "sqlite-vec"],
  minify: true,
  minifyWhitespace: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  treeShaking: true,
  target: "node19.9.0",
};

export default config;
