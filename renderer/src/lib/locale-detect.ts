import { Languages } from "@/lib/settings_hook";

const LOCALE_MAP: Array<{ prefix: string; language: Languages }> = [
  { prefix: "fr", language: Languages.FRENCH },
  { prefix: "de", language: Languages.GERMAN },
  { prefix: "es", language: Languages.SPANISH },
  { prefix: "mi", language: Languages.MAORI },
  { prefix: "it", language: Languages.ITALIAN },
  { prefix: "pt", language: Languages.PORTUGUESE_BR },
  { prefix: "nl", language: Languages.DUTCH },
  { prefix: "en", language: Languages.ENGLISH },
];

function mapLocaleToLanguage(locale: string): Languages {
  const lower = locale.toLowerCase();
  for (const { prefix, language } of LOCALE_MAP) {
    if (lower === prefix || lower.startsWith(`${prefix}-`)) {
      return language;
    }
  }
  return Languages.ENGLISH;
}

export async function detectAppLanguage(): Promise<Languages> {
  if (typeof window === "undefined") return Languages.ENGLISH;

  if (window.electronAPI?.getSystemLocale) {
    const locale = await window.electronAPI.getSystemLocale();
    return mapLocaleToLanguage(locale);
  }

  return mapLocaleToLanguage(navigator.language ?? "en");
}
