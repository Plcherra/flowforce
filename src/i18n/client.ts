"use client";

import i18n from "./config";
import { initReactI18next } from "react-i18next";

// Bind the shared instance for useTranslation. This module is imported from
// the client provider only. Server routes must not import it: react-i18next
// calls React.createContext while the module loads, and the server React
// build used for route handlers does not provide createContext.
const reactPlugin = initReactI18next as {
  init: (instance: typeof i18n) => void;
};
reactPlugin.init(i18n);

export default i18n;
