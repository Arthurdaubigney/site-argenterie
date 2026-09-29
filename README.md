# site-argenterie

Landing page haut de gamme pour l’estimation, l’achat et la vente d’argenterie ancienne.
Objectif unique : générer des demandes d’estimation via un formulaire Tally.

## Structure

```
index.html               Page unique (hero, objets, processus, pourquoi nous, formulaire, FAQ, footer)
mentions-legales.html    À compléter
confidentialite.html     À compléter
assets/css/styles.css    CSS compilé (ne pas éditer à la main)
assets/js/main.js        Tally, modale, FAQ, animations, barre CTA mobile
assets/img/              Photos et favicon
src/css/input.css        Source Tailwind v4 : couleurs, typographies, animations
tools/inline-icons.mjs   Remplace les jetons [[ph:nom]] par des icônes Phosphor en SVG
```

## Développement

```bash
npm install
npm run dev     # recompile le CSS à chaque modification
npm run serve   # http://localhost:4173
npm run build   # CSS minifié pour la production
```

## Brancher le formulaire Tally

1. Dans Tally, récupérez l’identifiant du formulaire (`https://tally.so/r/XXXXXX`).
2. Renseignez-le dans `assets/js/main.js` : `tallyFormId: "XXXXXX"`.
3. Remplacez `VOTRE_ID_TALLY` dans le `<noscript>` de `index.html`.
4. (Recommandé) Ajoutez dans Tally les champs cachés `source`, `utm_source`, `utm_medium` et `utm_campaign`
   pour savoir quel bouton et quelle campagne ont converti.

Tous les éléments `[data-tally-open]` ouvrent la modale. Si la section formulaire est déjà à l’écran,
le clic y fait simplement défiler la page. Sans JavaScript, ce sont de simples liens vers `#estimation`.

## Photos à fournir (format webp)

| Fichier | Format | Sujet |
|---|---|---|
| `hero-argenterie.webp` | 1600x2000 | Pièce d’argenterie mise en scène, fond sombre |
| `menagere.webp` | 1600x1000 | Ménagère dans son écrin |
| `orfevrerie.webp` | 1000x1200 | Théière ou verseuse en argent |
| `collection.webp` | 1000x1200 | Boîte, tabatière ou objet de vitrine |
| `expertise.webp` | 1200x1500 | Poinçon Minerve à la loupe ou mains d’expert |
| `og-image.jpg` | 1200x630 | Image de partage sur les réseaux sociaux |

Tant qu’une photo manque, un fond « argent brossé » la remplace.

## À personnaliser

- Nom de marque « L’Argentier » (nom provisoire), domaine `votre-domaine.fr` et e-mail de contact.
- Mentions légales et politique de confidentialité.

## Règle éditoriale

Ne jamais mentionner de délai ou de durée pour l’estimation (pas de « réponse sous 24h », « en 5 minutes », etc.).
