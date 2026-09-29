# site-argenterie

Landing page haut de gamme pour l’estimation, l’achat et la vente d’argenterie ancienne.
Objectif unique : générer des demandes d’estimation via un formulaire Tally.

## Structure

```
src/pages/               Une page = un fichier HTML (métadonnées en tête, dans <!--META {...} -->)
  index.html             Accueil
  estimation.html        Page de conversion principale (formulaire Tally)
  vendre-son-argenterie.html, expertise.html, acquerir.html
  objets/                Hub + ménagères, couverts de maître, orfèvrerie, métaux précieux, collection
  guides/                Hub + poinçons, entretien, grandes maisons, succession
  la-maison.html, faq.html, contact.html
  mentions-legales.html, confidentialite.html, credits-photos.html, 404.html
src/partials/            En-tête, pied de page, modale Tally, sections réutilisables
src/layout.html          Gabarit commun
src/data/site.json       Nom de la marque, domaine, e-mail (à personnaliser)
src/data/credits.json    Sources et licences des photos (page Crédits générée automatiquement)
src/data/captions.json   Légendes françaises des photos
src/css/input.css        Tailwind v4 : couleurs, typographies, animations
assets/js/main.js        Tally, modale, menus, FAQ, animations
assets/img/photos/       47 photos libres de droit en WebP (800 et 1600 px)
tools/build.mjs          Générateur : assemble les pages dans dist/
```

### Syntaxe utile dans les pages

- `{{> nom}}` insère un partiel de `src/partials/`
- `{{img slug="soupiere-roettiers" alt="..." sizes="..."}}` image responsive
- `{{figure slug="..." frame="aspect-[4/5]"}}` image + légende et source automatiques
- `<faq-item q="Question">Réponse</faq-item>` question dépliable + données structurées Google
- `[[ph:arrow-right]]` icône Phosphor

## Développement

```bash
npm install
npm run dev     # génère le site, surveille les fichiers et sert dist/ sur http://localhost:4173
npm run build   # build de production dans dist/ (utilisé par Vercel)
```

## Brancher les formulaires Tally

Dans `assets/js/main.js` :

- `tallyFormId` : formulaire d’estimation (utilisé partout)
- `forms.acquisition` et `forms.contact` : formulaires optionnels des pages Acquérir et Contact
  (s’ils restent vides, le formulaire d’estimation est utilisé)

Ajoutez dans Tally les champs cachés `source`, `utm_source`, `utm_medium`, `utm_campaign` pour savoir
quel bouton et quelle campagne ont converti.

## Photos

Toutes les photos sont libres de droit : The Metropolitan Museum of Art (CC0), The Cleveland Museum of Art (CC0)
et Wikimedia Commons (CC0 ou CC BY / CC BY-SA, crédit obligatoire). Les sources et licences sont listées sur
la page `/credits-photos`, générée depuis `src/data/credits.json` : conservez-la en ligne.
Ces pièces illustrent le savoir-faire des orfèvres ; elles ne font pas partie des transactions de la maison.

## À personnaliser

- `src/data/site.json` : nom de la marque (« L’Argentier » est provisoire), domaine, e-mail.
- Mentions légales et politique de confidentialité (champs entre crochets).

## Règle éditoriale

Ne jamais mentionner de délai ou de durée pour l’estimation (pas de « réponse sous 24h », « en 5 minutes », etc.).

## Déploiement Vercel

`vercel.json` lance `npm run build` et publie `dist/`. La production publie la branche `main`.
