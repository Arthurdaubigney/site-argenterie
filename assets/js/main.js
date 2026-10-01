/* ==========================================================================
   Argenterie : interactions (sans dépendance)
   ========================================================================== */

/* --------------------------------------------------------------------------
   CONFIGURATION : renseignez ici l'identifiant de votre formulaire Tally.
   Il se trouve dans l'URL de partage : https://tally.so/r/XXXXXX -> "XXXXXX".
   Tant qu'il est vide, un encart de remplacement s'affiche à la place.
   -------------------------------------------------------------------------- */
const CONFIG = {
  // Formulaire principal : demande d'estimation (utilisé partout par défaut).
  tallyFormId: "q40ppO",
  // Formulaires optionnels. Laissés vides, ils retombent sur le formulaire principal.
  forms: {
    acquisition: "", // page /acquerir
    contact: "", // page /contact
  },
  // Options d'intégration Tally (voir https://tally.so/help/embed-your-form)
  tallyParams: {
    alignLeft: "1",
    hideTitle: "1",
    transparentBackground: "1",
    dynamicHeight: "1",
  },
};

const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const cssMs = (name, fallback) =>
  parseFloat(getComputedStyle(root).getPropertyValue(name)) || fallback;

/* --------------------------------------------------------------------------
   1. Tally : chargement différé du script + création des iframes
   -------------------------------------------------------------------------- */
const TALLY_SCRIPT = "https://tally.so/widgets/embed.js";
let tallyScriptPromise = null;

function loadTallyScript() {
  if (tallyScriptPromise) return tallyScriptPromise;
  tallyScriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TALLY_SCRIPT;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return tallyScriptPromise;
}

const formIdFor = (slot) => CONFIG.forms[slot.dataset.form] || CONFIG.tallyFormId;

function tallyUrl(formId, source) {
  const params = new URLSearchParams(CONFIG.tallyParams);
  // Champ caché Tally "source" : permet de savoir quel CTA a converti.
  if (source) params.set("source", source);
  // Transmet les paramètres UTM de la page au formulaire.
  new URLSearchParams(location.search).forEach((v, k) => {
    if (k.startsWith("utm_")) params.set(k, v);
  });
  return `https://tally.so/embed/${formId}?${params}`;
}

function renderPlaceholder(slot) {
  slot.innerHTML = `
    <div class="flex h-full min-h-[inherit] flex-col items-center justify-center gap-4 rounded-[2px] border border-dashed border-line p-8 text-center">
      <p class="font-display text-3xl">Formulaire d’estimation</p>
      <p class="max-w-[42ch] text-ink-2">Emplacement réservé au formulaire Tally. Renseignez <code class="rounded-[2px] bg-surface-2 px-1.5 py-0.5 text-[0.9em]">tallyFormId</code> dans <code class="rounded-[2px] bg-surface-2 px-1.5 py-0.5 text-[0.9em]">assets/js/main.js</code> pour l’afficher ici.</p>
    </div>`;
}

function mountTally(slot) {
  if (slot.dataset.mounted) return;
  slot.dataset.mounted = "true";

  const formId = formIdFor(slot);
  if (!formId) {
    renderPlaceholder(slot);
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.dataset.tallySrc = tallyUrl(formId, slot.dataset.source);
  iframe.title = "Formulaire de demande d’estimation";
  iframe.width = "100%";
  iframe.height = "560"; // hauteur réservée (évite le saut de mise en page)
  iframe.setAttribute("frameborder", "0");
  iframe.className = "block w-full";
  slot.replaceChildren(iframe);

  loadTallyScript()
    .then(() => window.Tally && window.Tally.loadEmbeds())
    .catch(() => {
      // Repli si le script Tally est bloqué : iframe classique.
      iframe.src = iframe.dataset.tallySrc;
    });
}

// Le formulaire de la section se monte à l'approche de celle-ci.
const inlineSlots = document.querySelectorAll("[data-tally-embed]:not([data-lazy])");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          mountTally(e.target);
          io.unobserve(e.target);
        }
      });
    },
    { rootMargin: "800px 0px" }
  );
  inlineSlots.forEach((slot) => io.observe(slot));
} else {
  inlineSlots.forEach(mountTally);
}

// Préchargement du script au premier signe d'intention (survol / focus d'un CTA).
document.addEventListener(
  "pointerover",
  (e) => {
    if (CONFIG.tallyFormId && e.target.closest("[data-tally-open]")) loadTallyScript().catch(() => {});
  },
  { passive: true }
);

// Demande envoyée : Tally prévient la page par postMessage, on redirige vers
// /merci (page de conversion Google Ads, absente de la navigation et non indexée).
window.addEventListener("message", (e) => {
  if (!/^https:\/\/([a-z0-9-]+\.)?tally\.so$/.test(e.origin)) return;
  let data = e.data;
  try { if (typeof data === "string") data = JSON.parse(data); } catch { return; }
  if (data && data.event === "Tally.FormSubmitted" && location.pathname !== "/merci") {
    setTimeout(() => location.assign("/merci"), 600);
  }
});

/* --------------------------------------------------------------------------
   2. Modale (transitions.dev 06-modal) sur <dialog> natif
   -------------------------------------------------------------------------- */
const dialog = document.querySelector("[data-modal]");
const panel = dialog?.querySelector("[data-modal-panel]");
const modalSlot = dialog?.querySelector("[data-tally-embed]");
let lastTrigger = null;

function openModal(source) {
  if (!dialog) return;
  if (modalSlot) {
    // Le champ "source" retient le premier CTA cliqué. L'iframe n'est jamais
    // rechargée ensuite, pour ne pas perdre une saisie en cours.
    if (!modalSlot.dataset.mounted && source) modalSlot.dataset.source = `modal-${source}`;
    mountTally(modalSlot);
  }

  dialog.showModal();
  root.style.overflow = "hidden";
  dialog.classList.remove("is-closing");
  panel.classList.remove("is-closing");
  requestAnimationFrame(() => {
    dialog.classList.add("is-open");
    panel.classList.add("is-open");
  });
}

function closeModal() {
  if (!dialog?.open) return;
  const closeMs = cssMs("--modal-close-dur", 150);
  dialog.classList.remove("is-open");
  panel.classList.remove("is-open");
  dialog.classList.add("is-closing");
  panel.classList.add("is-closing");
  setTimeout(
    () => {
      dialog.classList.remove("is-closing");
      panel.classList.remove("is-closing");
      dialog.close();
      root.style.overflow = "";
      lastTrigger?.focus({ preventScroll: true });
    },
    reduceMotion.matches ? 0 : closeMs
  );
}

document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-tally-open]");
  if (trigger) {
    // La page contient déjà le formulaire : on y fait défiler plutôt que d'ouvrir la modale.
    const section = document.getElementById("estimation");
    if (!dialog) return;
    e.preventDefault();
    if (section) {
      section.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
      return;
    }
    lastTrigger = trigger;
    openModal(trigger.dataset.source);
    return;
  }
  if (e.target.closest("[data-modal-close]")) closeModal();
});

dialog?.addEventListener("cancel", (e) => {
  e.preventDefault(); // Échap : on joue l'animation de fermeture
  closeModal();
});

/* --------------------------------------------------------------------------
   3. Accordéon FAQ (transitions.dev 21-accordion)
   -------------------------------------------------------------------------- */
document.querySelectorAll(".t-acc").forEach((acc) => {
  const head = acc.querySelector(".t-acc-head");
  head.addEventListener("click", () => {
    const open = acc.getAttribute("data-open") === "true";
    acc.setAttribute("data-open", String(!open));
    head.setAttribute("aria-expanded", String(!open));
  });
});

/* --------------------------------------------------------------------------
   4. Apparitions (transitions.dev 18-texts-reveal) via IntersectionObserver
   -------------------------------------------------------------------------- */
const revealBlocks = document.querySelectorAll("[data-reveal]");
const show = (el) => el.classList.add("is-shown");

if (reduceMotion.matches || !("IntersectionObserver" in window)) {
  revealBlocks.forEach(show);
} else {
  const onLoad = [...revealBlocks].filter((el) => el.dataset.reveal === "load");
  requestAnimationFrame(() => requestAnimationFrame(() => onLoad.forEach(show)));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          show(e.target);
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  revealBlocks.forEach((el) => el.dataset.reveal !== "load" && io.observe(el));
}

/* --------------------------------------------------------------------------
   5. En-tête, menu mobile et barre CTA mobile
   -------------------------------------------------------------------------- */
const header = document.querySelector("[data-header]");
const menu = document.querySelector("[data-menu]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const stickyCta = document.querySelector("[data-sticky-cta]");
const hero = document.querySelector("#contenu > section, #contenu > article");
const formSection = document.getElementById("estimation");

// Panneau de navigation (< 1024 px) : bouton libellé « Menu / Fermer », icône
// animée (transitions.dev 09-icon-swap), arrière-plan inerte et défilement bloqué.
const menuContent = menu?.querySelector("[data-menu-content]");
const menuIcon = menuToggle?.querySelector(".t-icon-swap");
const menuLabel = menuToggle?.querySelector("[data-menu-label]");
const background = [...document.querySelectorAll("#contenu, footer, [data-sticky-cta]")];
let menuTimer;

function setMenu(open, { restoreFocus = true } = {}) {
  if (!menu || open === menu.classList.contains("is-open")) return;
  clearTimeout(menuTimer);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuIcon?.setAttribute("data-state", open ? "b" : "a");
  if (menuLabel) menuLabel.textContent = open ? "Fermer" : "Menu";
  root.classList.toggle("menu-open", open);
  root.style.overflow = open ? "hidden" : "";
  background.forEach((el) => (el.inert = open));

  if (open) {
    menu.hidden = false;
    void menu.offsetHeight; // reflow : l'animation d'ouverture se joue
    menu.classList.add("is-open");
    menuContent?.classList.add("is-shown");
    menu.querySelector("a")?.focus({ preventScroll: true });
  } else {
    menu.classList.remove("is-open");
    menuContent?.classList.remove("is-shown");
    menuTimer = setTimeout(() => (menu.hidden = true), reduceMotion.matches ? 0 : cssMs("--duration-fast", 250));
    if (restoreFocus) menuToggle.focus({ preventScroll: true });
  }
}
menuToggle?.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
menu?.addEventListener("click", (e) => e.target.closest("a") && setMenu(false, { restoreFocus: false }));
document.addEventListener("keydown", (e) => e.key === "Escape" && menu?.classList.contains("is-open") && setMenu(false));
// Passage en affichage ordinateur : on referme le panneau.
window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => e.matches && setMenu(false, { restoreFocus: false }));

if ("IntersectionObserver" in window && hero) {
  let heroVisible = true;
  let formVisible = false;
  const updateSticky = () => stickyCta?.classList.toggle("is-visible", !heroVisible && !formVisible);

  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    updateSticky();
  }).observe(hero);

  if (formSection) {
    new IntersectionObserver(([e]) => {
      formVisible = e.isIntersecting;
      updateSticky();
    }).observe(formSection);
  }
}

/* En-tête : filet dès que la page quitte le haut (repère de 1 px, sans écouteur de scroll) */
if ("IntersectionObserver" in window && header) {
  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none";
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => header.classList.toggle("is-scrolled", !e.isIntersecting)).observe(sentinel);
}

/* Sous-menu « Objets » (desktop) */
document.querySelectorAll("[data-dropdown]").forEach((wrap) => {
  const btn = wrap.querySelector("[data-dropdown-toggle]");
  const panel = wrap.querySelector("[data-dropdown-menu]");
  const set = (open) => {
    panel.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
  };
  btn.addEventListener("click", () => set(!panel.classList.contains("is-open")));
  // Souris : ouverture au survol avec un léger délai d'intention, fermeture plus tardive.
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let t;
    wrap.addEventListener("pointerenter", () => { clearTimeout(t); t = setTimeout(() => set(true), 120); });
    wrap.addEventListener("pointerleave", () => { clearTimeout(t); t = setTimeout(() => set(false), 260); });
  }
  document.addEventListener("click", (e) => !wrap.contains(e.target) && set(false));
  wrap.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) {
      set(false);
      btn.focus();
    }
  });
  wrap.addEventListener("focusout", (e) => !wrap.contains(e.relatedTarget) && set(false));
});

/* Année du pied de page */
document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
