// touch-type/renderer/src/lib/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "@/locales/en/common.json";
import frCommon from "@/locales/fr/common.json";
import deCommon from "@/locales/de/common.json";
import esCommon from "@/locales/es/common.json";
import miCommon from "@/locales/mi/common.json";
import itCommon from "@/locales/it/common.json";
import ptBrCommon from "@/locales/pt-br/common.json";
import nlCommon from "@/locales/nl/common.json";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  resources: {
    en: { common: enCommon },
    fr: { common: frCommon },
    de: { common: deCommon },
    es: { common: esCommon },
    mi: { common: miCommon },
    it: { common: itCommon },
    "pt-br": { common: ptBrCommon },
    nl: { common: nlCommon },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
