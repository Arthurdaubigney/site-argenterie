// Générateur statique minimal : assemble les pages de src/pages avec le gabarit
// et les partiels, puis écrit le site dans dist/.
//
//   node tools/build.mjs           construit une fois
//   node tools/build.mjs --watch   reconstruit à chaque modification de src/ ou assets/
//
// Syntaxe disponible dans les pages et partiels :
//   <!--META { ...json... } -->     métadonnées de la page (en tête de fichier)
//   {{> nom}}                       insère src/partials/nom.html
//   {{title}} {{site.name}}         variables de page / de site
//   {{img slug="..." alt="..." class="..." sizes="..." eager}}
//   {{figure slug="..." alt="..." class="..." imgclass="..." sizes="..."}}
//   {{breadcrumbs}}                 fil d'Ariane (depuis meta.crumbs)
//   {{credits-list}}                liste des crédits photo
//   [[ph:nom]]                      icône Phosphor (graisse light) en SVG
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync, watch, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");
const ICONS = join(ROOT, "node_modules/@phosphor-icons/core/assets/light");

const readJSON = (p) => JSON.parse(readFileSync(p, "utf8"));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function buildCss() {
  const bin = join(ROOT, "node_modules/.bin/tailwindcss");
  execFileSync(bin, ["-i", "src/css/input.css", "-o", "dist/assets/css/styles.css", "--minify"], { cwd: ROOT, stdio: "pipe" });
}

function build() {
  cpSync(join(ROOT, "assets"), join(DIST, "assets"), { recursive: true });
  const site = readJSON(join(SRC, "data/site.json"));
  const credits = Object.fromEntries(readJSON(join(SRC, "data/credits.json")).map((c) => [c.slug, c]));
  const captions = readJSON(join(SRC, "data/captions.json"));
  // Textes alternatifs : alt explicite de la page, sinon alt descriptif centralisé.
  const alts = readJSON(join(SRC, "data/alts.json"));
  const layout = readFileSync(join(SRC, "layout.html"), "utf8");
  const partials = Object.fromEntries(
    readdirSync(join(SRC, "partials")).map((f) => [f.replace(/\.html$/, ""), readFileSync(join(SRC, "partials", f), "utf8")])
  );
  const iconCache = {};
  const icon = (name) =>
    (iconCache[name] ??= readFileSync(join(ICONS, `${name}-light.svg`), "utf8")
      .trim()
      .replace("<svg ", '<svg class="icon" aria-hidden="true" focusable="false" '));

  const attrs = (s) => {
    const out = {};
    for (const m of s.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) out[m[1]] = m[2] ?? true;
    return out;
  };

  const imgTag = (a) => {
    const c = credits[a.slug];
    if (!c) throw new Error(`Photo inconnue : ${a.slug}`);
    const alt = (typeof a.alt === "string" && a.alt.trim()) || alts[a.slug];
    if (!alt) throw new Error(`Texte alternatif manquant pour ${a.slug} (src/data/alts.json)`);
    const base = `/assets/img/photos/${a.slug}`;
    return `<img src="${base}-1600.webp" srcset="${base}-800.webp 800w, ${base}-1600.webp 1600w" sizes="${a.sizes || "(min-width: 1024px) 50vw, 100vw"}" width="${c.w}" height="${c.h}" alt="${esc(alt)}" ${a.eager ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'} decoding="async" class="${a.class || "h-full w-full object-cover"}">`;
  };

  const caption = (slug) => {
    const c = credits[slug];
    return `${captions[slug] || c.title}. <a href="${c.url}" class="underline decoration-line underline-offset-2 hover:text-ink" rel="noopener" target="_blank">${c.source}</a>`;
  };

  // Empreinte de version des ressources : l'URL change à chaque modification,
  // le navigateur ne peut donc jamais garder une ancienne feuille de style.
  const version = (rel) => {
    const file = join(DIST, rel);
    const src = existsSync(file) ? file : join(ROOT, rel);
    return existsSync(src) ? createHash("sha1").update(readFileSync(src)).digest("hex").slice(0, 10) : String(Date.now());
  };
  const assetVars = {
    "asset-css": `/assets/css/styles.css?v=${version("assets/css/styles.css")}`,
    "asset-js": `/assets/js/main.js?v=${version("assets/js/main.js")}`,
  };

  const pages = walk(join(SRC, "pages")).filter((p) => p.endsWith(".html"));
  const sitemap = [];

  for (const file of pages) {
    const rel = relative(join(SRC, "pages"), file).replace(/\\/g, "/");
    let body = readFileSync(file, "utf8");
    const metaMatch = body.match(/^<!--META([\s\S]*?)-->/);
    const meta = metaMatch ? JSON.parse(metaMatch[1]) : {};
    body = body.replace(/^<!--META[\s\S]*?-->\s*/, "");

    const path = rel === "index.html" ? "/" : "/" + rel.replace(/(\/)?index\.html$/, "").replace(/\.html$/, "");
    const vars = {
      ...meta,
      path,
      canonical: site.url.replace(/\/$/, "") + (path === "/" ? "/" : path),
      ogimage: site.url.replace(/\/$/, "") + `/assets/img/photos/${meta.ogphoto || "soupiere-roettiers"}-1600.webp`,
      ogalt: alts[meta.ogphoto || "soupiere-roettiers"] || "",
      robots: meta.noindex ? "noindex, follow" : "index, follow",
      source: meta.source || (path === "/" ? "accueil" : path.slice(1).replace(/\//g, "-")),
    };

    // Questions/réponses : <faq-item q="...">réponse</faq-item> -> accordéon + FAQPage
    const faqs = [];
    body = body.replace(/<faq-item q="([^"]+)">([\s\S]*?)<\/faq-item>/g, (_, q, a) => {
      const n = faqs.push({ q, a: a.trim() });
      const id = `faq-${n}`;
      return `<div class="t-acc t-stagger-line border-b border-line" data-open="false" style="--i:${Math.min(n - 1, 8)}">
            <h3 class="font-sans text-base"><button type="button" class="t-acc-head flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-medium" aria-expanded="false" aria-controls="${id}" id="${id}-btn">${q}<span class="t-acc-chevron text-ink-2"><svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6.5L8 10.5L12 6.5"/></svg></span></button></h3>
            <div class="t-acc-panel" id="${id}" role="region" aria-labelledby="${id}-btn"><div class="t-acc-panel-inner"><div class="max-w-[62ch] pb-7 text-ink-2 [&>p+p]:mt-3">${a.trim()}</div></div></div>
          </div>`;
    });

    // Fil d'Ariane + JSON-LD
    const crumbs = [["Accueil", "/"], ...(meta.crumbs || [])];
    vars.breadcrumbs =
      path === "/"
        ? ""
        : `<nav aria-label="Fil d’Ariane" class="text-sm text-ink-2"><ol class="flex flex-wrap items-center gap-x-2 gap-y-1">${crumbs
            .map(([label, href], i) =>
              i === crumbs.length - 1
                ? `<li aria-current="page" class="text-ink">${label}</li>`
                : `<li><a class="nav-link text-sm" href="${href}">${label}</a></li><li aria-hidden="true">/</li>`
            )
            .join("")}</ol></nav>`;
    const ld = [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map(([label, href], i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: label,
          item: site.url.replace(/\/$/, "") + (href || path),
        })),
      },
      ...(meta.jsonld ? [meta.jsonld] : []),
      ...(faqs.length
        ? [{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map(({ q, a }) => ({
              "@type": "Question",
              name: q.replace(/&nbsp;/g, " "),
              acceptedAnswer: { "@type": "Answer", text: a.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() },
            })),
          }]
        : []),
    ];
    if (path === "/") ld.shift();
    vars.jsonld = ld.length ? `<script type="application/ld+json">${JSON.stringify(ld.length === 1 ? ld[0] : ld)}</script>` : "";

    let html = layout.replace("{{content}}", body);
    // Partiels (imbriqués)
    for (let i = 0; i < 5 && /\{\{> [\w-]+\}\}/.test(html); i++) {
      html = html.replace(/\{\{> ([\w-]+)\}\}/g, (_, n) => {
        if (!(n in partials)) throw new Error(`Partiel inconnu : ${n} (${rel})`);
        return partials[n];
      });
    }
    // Helpers
    html = html
      .replace(/\{\{img ([^}]+)\}\}/g, (_, a) => imgTag(attrs(a)))
      .replace(/\{\{figure ([^}]+)\}\}/g, (_, s) => {
        const a = attrs(s);
        return `<figure class="${a.class || ""}"><div class="photo-frame ${a.frame || "aspect-[4/5]"}">${imgTag({ ...a, class: a.imgclass })}</div><figcaption class="mt-3 text-[0.8rem] leading-snug text-ink-2">${caption(a.slug)}</figcaption></figure>`;
      })
      .replace("{{credits-list}}", () =>
        Object.values(credits)
          .map(
            (c) =>
              `<li class="grid grid-cols-[4.5rem_1fr] items-start gap-4 border-b border-line py-4"><img src="/assets/img/photos/${c.slug}-800.webp" alt="${esc(alts[c.slug] || "")}" width="72" height="72" loading="lazy" class="aspect-square h-[4.5rem] w-[4.5rem] rounded-[2px] object-cover"><div><p class="text-ink">${captions[c.slug] || c.title}</p><p class="mt-1 text-sm text-ink-2">${c.artist ? esc(c.artist) + ". " : ""}<a class="underline underline-offset-2" href="${c.url}" rel="noopener" target="_blank">${c.source}</a>. Licence : ${esc(c.license)}.</p></div></li>`
          )
          .join("")
      );
    // Variables
    html = html.replace(/\{\{(site\.)?([\w-]+)\}\}/g, (m, isSite, k) => {
      const v = isSite ? site[k] : (vars[k] ?? assetVars[k]);
      return v === undefined ? m : v;
    });
    // Navigation active
    html = html.replace(/data-nav="([\w-]+)"/g, (_, n) => (n === meta.nav || n === meta.section ? 'aria-current="page"' : ""));
    // Icônes
    html = html.replace(/\[\[ph:([a-z0-9-]+)\]\]/g, (_, n) => icon(n));

    const leftover = html.match(/\{\{[^}]*\}\}/);
    if (leftover) throw new Error(`Jeton non résolu ${leftover[0]} dans ${rel}`);

    const out = join(DIST, rel);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
    if (!meta.noindex && rel !== "404.html") sitemap.push(vars.canonical);
  }

  writeFileSync(
    join(DIST, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
      .map((u) => `  <url><loc>${u}</loc></url>`)
      .join("\n")}\n</urlset>\n`
  );
  writeFileSync(join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${site.url.replace(/\/$/, "")}/sitemap.xml\n`);
  return pages.length;
}

function run() {
  const t = Date.now();
  try {
    const n = build();
    console.log(`✓ ${n} pages générées dans dist/ (${Date.now() - t} ms)`);
  } catch (e) {
    console.error("✗", e.message);
    if (!process.argv.includes("--watch")) process.exit(1);
  }
}

const WATCH = process.argv.includes("--watch");
if (!WATCH) rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
if (!WATCH) buildCss(); // en mode --watch, « tailwindcss --watch » tourne à côté
run();

if (process.argv.includes("--watch")) {
  let timer;
  for (const dir of [SRC, join(ROOT, "assets")]) {
    if (existsSync(dir)) watch(dir, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(run, 80);
    });
  }
  console.log("Surveillance de src/ et assets/…");
}
