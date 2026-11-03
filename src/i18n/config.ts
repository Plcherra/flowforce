import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files
import en from "../locales/en.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import de from "../locales/de.json";
import it from "../locales/it.json";
import pt from "../locales/pt.json";
import enLiterals from "../locales/literals/en.json";
import esLiterals from "../locales/literals/es.json";
import frLiterals from "../locales/literals/fr.json";
import deLiterals from "../locales/literals/de.json";
import itLiterals from "../locales/literals/it.json";
import ptLiterals from "../locales/literals/pt.json";

const resources = {
  en: { translation: { ...en, literals: enLiterals } },
  es: { translation: { ...es, literals: esLiterals } },
  fr: { translation: { ...fr, literals: frLiterals } },
  de: { translation: { ...de, literals: deLiterals } },
  it: { translation: { ...it, literals: itLiterals } },
  pt: { translation: { ...pt, literals: ptLiterals } },
};

// Do not import react-i18next here. Route handlers import this module, and
// react-i18next calls createContext at load time. The client binding lives
// in ./client and is loaded from the browser provider.
i18n.use(LanguageDetector).init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "es", "pt", "fr", "it", "de"],
    debug: false,

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
  });

export default i18n;
