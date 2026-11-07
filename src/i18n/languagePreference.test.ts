import assert from "node:assert/strict";
import {
  languageFromAcceptLanguage,
  readCookie,
  resolveRequestLanguage,
} from "./languagePreference";

export function runLanguagePreferenceTests() {
  assert.equal(
    readCookie("theme=dark; i18nextLng=es; flowforce.lang.source=user", "i18nextLng"),
    "es",
  );
  assert.equal(readCookie("i18nextLng=de", "missing"), null);
  assert.equal(readCookie(null, "i18nextLng"), null);

  assert.equal(languageFromAcceptLanguage("es-MX,es;q=0.9,en;q=0.8"), "es");
  assert.equal(languageFromAcceptLanguage("fr-CA,fr;q=0.8,en;q=0.5"), "fr");
  assert.equal(languageFromAcceptLanguage("zh-CN,zh;q=0.9"), null);
  assert.equal(languageFromAcceptLanguage("en;q=0.2, pt-BR;q=0.9"), "pt");

  assert.equal(
    resolveRequestLanguage({ cookieLanguage: "it", acceptLanguage: "en-US" }),
    "it",
  );
  assert.equal(
    resolveRequestLanguage({ cookieLanguage: "english", acceptLanguage: "de-DE,de;q=0.9" }),
    "de",
  );
  assert.equal(
    resolveRequestLanguage({ cookieLanguage: null, acceptLanguage: null }),
    "en",
  );
}
