// Remplace les jetons [[ph:nom]] par l'icône Phosphor (graisse "light") en SVG inline.
// Usage : node tools/inline-icons.mjs index.html [autres.html]
import { readFileSync, writeFileSync } from "node:fs";

const dir = "node_modules/@phosphor-icons/core/assets/light";
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, "utf8");
  const out = src.replace(/\[\[ph:([a-z0-9-]+)\]\]/g, (_, name) =>
    readFileSync(`${dir}/${name}-light.svg`, "utf8")
      .trim()
      .replace("<svg ", '<svg class="icon" aria-hidden="true" focusable="false" ')
  );
  writeFileSync(file, out);
  console.log(file, (src.match(/\[\[ph:/g) || []).length, "icônes");
}
