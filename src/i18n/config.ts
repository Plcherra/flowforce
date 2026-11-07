import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files
import en from "../locales/en.json" with { type: "json" };
import es from "../locales/es.json" with { type: "json" };
import fr from "../locales/fr.json" with { type: "json" };
import de from "../locales/de.json" with { type: "json" };
import it from "../locales/it.json" with { type: "json" };
import pt from "../locales/pt.json" with { type: "json" };
import enLiterals from "../locales/literals/en.json" with { type: "json" };
import esLiterals from "../locales/literals/es.json" with { type: "json" };
import frLiterals from "../locales/literals/fr.json" with { type: "json" };
import deLiterals from "../locales/literals/de.json" with { type: "json" };
import itLiterals from "../locales/literals/it.json" with { type: "json" };
import ptLiterals from "../locales/literals/pt.json" with { type: "json" };
import { bootLanguage } from "./languagePreference";

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
const initialLanguage = bootLanguage();

i18n.use(LanguageDetector).init({
    resources,
    lng: initialLanguage,
    fallbackLng: "en",
    supportedLngs: ["en", "es", "pt", "fr", "it", "de"],
    nonExplicitSupportedLngs: true,
    initImmediate: false,
    initAsync: false,
    debug: false,
    react: {
      useSuspense: false,
    },

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ["cookie", "localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupCookie: "i18nextLng",
      lookupLocalStorage: "i18nextLng",
      cookieMinutes: 60 * 24 * 365,
    },
  });

export default i18n;
