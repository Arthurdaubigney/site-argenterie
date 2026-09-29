// Copie les fichiers publics du site dans dist/ (dossier publié par Vercel).
import { cpSync, rmSync, mkdirSync, readdirSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
for (const f of readdirSync(".")) {
  if (f.endsWith(".html") || f === "robots.txt") cpSync(f, `dist/${f}`);
}
cpSync("assets", "dist/assets", { recursive: true });
console.log("dist/ prêt :", readdirSync("dist").join(", "));
