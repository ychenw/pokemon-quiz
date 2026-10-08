import { translations } from "../data/translations.js";
export function createI18n({ root, $, scheduleFit, alignPanels }) {
  let language = "zh";
  const translationEntries = Object.entries(translations).sort((a, b) => b[0].length - a[0].length);
  function translateText(text) {
    if (language !== "en") return text;
    return text.replace(translationPattern, (part) => translations[part]);
  }
  const translationPattern = new RegExp(
    translationEntries
      .map(([key]) =>
        Array.from(key, (c) => ("\\^$.*+?()[]{}|".includes(c) ? "\\" + c : c)).join(""),
      )
      .join("|"),
    "g",
  );
  const originals = new WeakMap(),
    attributeOriginals = new WeakMap();
  function applyLanguage() {
    languageObserver.disconnect();
    scheduleFit();
    root.setAttribute("lang", language === "en" ? "en" : "zh-CN");
    root.dataset.language = language;
    $("lang-en").setAttribute("aria-pressed", language === "en");
    $("lang-zh").setAttribute("aria-pressed", language === "zh");
    alignPanels();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest("script,style,[data-no-translate],#px-language,#px-profiles"))
        continue;
      const prior = originals.get(node);
      const source = prior && node.nodeValue === prior.display ? prior.source : node.nodeValue;
      const display = translateText(source);
      originals.set(node, { source, display });
      if (node.nodeValue !== display) node.nodeValue = display;
    }
    root.querySelectorAll("[placeholder],[aria-label],img[alt]").forEach((el) => {
      if (el === $("lang-en") || el === $("lang-zh") || el.closest("[data-no-translate]")) return;
      const cache = attributeOriginals.get(el) || {};
      ["placeholder", "aria-label", "alt"].forEach((attr) => {
        if (!el.hasAttribute(attr)) return;
        const value = el.getAttribute(attr),
          old = cache[attr],
          source = old && old.display === value ? old.source : value,
          display = translateText(source);
        cache[attr] = { source, display };
        if (value !== display) el.setAttribute(attr, display);
      });
      attributeOriginals.set(el, cache);
    });
    languageObserver.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "alt"],
    });
  }
  const languageObserver = new MutationObserver(applyLanguage);
  try {
    language = localStorage.getItem("pokemon-language") === "en" ? "en" : "zh";
  } catch {}
  ["en", "zh"].forEach((code) =>
    $("lang-" + code).addEventListener("click", () => {
      language = code;
      try {
        localStorage.setItem("pokemon-language", language);
      } catch {}
      applyLanguage();
    }),
  );
  return { applyLanguage, translateText };
}
