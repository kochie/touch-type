# Application Language (UI i18n) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Application Language" setting that translates the Touch Typer UI (initially the Settings page) into the 8 languages already supported for typing practice, with a system-locale auto-detect toggle.

**Architecture:** `react-i18next` drives all string lookups via `useTranslation()`. A `locale-detect.ts` helper maps the system locale (Electron IPC → `app.getLocale()`, with `navigator.language` as a dev-mode fallback) to the `Languages` enum. Two new settings fields (`appLanguage` + `autoDetectAppLanguage`) live in the existing reducer; `appLanguage` syncs to Supabase while `autoDetectAppLanguage` stays local-only (machine-specific).

**Tech Stack:** `i18next`, `react-i18next`, Next.js static export, Electron IPC, Supabase (settings table), pnpm

---

## File Map

| File | Action |
|---|---|
| `touch-type-backend/supabase/migrations/20260511000000_add_app_language.sql` | Create |
| `touch-type/package.json` | Modify — add i18next + react-i18next |
| `touch-type/renderer/src/lib/locale-detect.ts` | Create |
| `touch-type/renderer/src/lib/i18n.ts` | Create |
| `touch-type/renderer/src/locales/en/common.json` | Create |
| `touch-type/renderer/src/locales/fr/common.json` | Create |
| `touch-type/renderer/src/locales/de/common.json` | Create |
| `touch-type/renderer/src/locales/es/common.json` | Create |
| `touch-type/renderer/src/locales/mi/common.json` | Create |
| `touch-type/renderer/src/locales/it/common.json` | Create |
| `touch-type/renderer/src/locales/pt-br/common.json` | Create |
| `touch-type/renderer/src/locales/nl/common.json` | Create |
| `touch-type/electron-src/index.ts` | Modify — add getSystemLocale IPC handler |
| `touch-type/electron-src/preload.ts` | Modify — expose getSystemLocale |
| `touch-type/renderer/types/electron.d.ts` | Modify — add getSystemLocale to ElectronAPI |
| `touch-type/renderer/src/lib/settings_hook.tsx` | Modify — new fields, actions, i18n effect |
| `touch-type/renderer/src/components/settings/settings.tsx` | Modify — new controls, t() wrapping |
| `touch-type/renderer/src/app/layout.tsx` | Modify — import i18n for side-effect init |
| `touch-type/renderer/src/types/supabase.ts` | Regenerate via Supabase CLI |

---

## Task 1: DB Migration

**Files:**
- Create: `touch-type-backend/supabase/migrations/20260511000000_add_app_language.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- touch-type-backend/supabase/migrations/20260511000000_add_app_language.sql
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS app_language text DEFAULT 'en';
```

- [ ] **Step 2: Apply the migration to your local Supabase**

```bash
cd touch-type-backend
supabase db reset
```

Expected: migration applies cleanly. `supabase status` shows local DB running on port 54322.

- [ ] **Step 3: Regenerate TypeScript types**

```bash
cd touch-type-backend
supabase gen types typescript --local > ../touch-type/renderer/src/types/supabase.ts
```

Expected: `renderer/src/types/supabase.ts` updated. The `settings` row type now includes `app_language: string | null`.

- [ ] **Step 4: Commit**

```bash
cd touch-type-backend
git add supabase/migrations/20260511000000_add_app_language.sql
git commit -m "feat: add app_language column to settings table"

cd ../touch-type
git add renderer/src/types/supabase.ts
git commit -m "chore: regenerate supabase types after app_language migration"
```

---

## Task 2: Install Dependencies

**Files:**
- Modify: `touch-type/package.json`

- [ ] **Step 1: Install i18next and react-i18next**

```bash
cd touch-type
pnpm add i18next react-i18next
```

Expected: `i18next` and `react-i18next` appear in `package.json` dependencies. `pnpm-lock.yaml` is updated.

- [ ] **Step 2: Commit**

```bash
cd touch-type
git add package.json pnpm-lock.yaml
git commit -m "feat: add i18next and react-i18next for UI translation"
```

---

## Task 3: Create locale-detect.ts

Maps a BCP 47 locale string (e.g. `"fr-FR"`) to the nearest `Languages` enum value. Async because it may call the Electron IPC bridge.

**Files:**
- Create: `touch-type/renderer/src/lib/locale-detect.ts`

- [ ] **Step 1: Create the file**

```typescript
// touch-type/renderer/src/lib/locale-detect.ts
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
```

- [ ] **Step 2: Type-check**

```bash
cd touch-type
pnpm type-check
```

Expected: no errors. (Note: `window.electronAPI?.getSystemLocale` will type-error until Task 6 adds it to `ElectronAPI`. If you run type-check now, skip this step and run it after Task 6.)

- [ ] **Step 3: Commit**

```bash
cd touch-type
git add renderer/src/lib/locale-detect.ts
git commit -m "feat: add locale-detect helper for system locale → Languages mapping"
```

---

## Task 4: Create i18n.ts + English Translation File

Initialises i18next before the React tree mounts. All 8 language bundles are included at build time (static export, bundle size is not a concern).

**Files:**
- Create: `touch-type/renderer/src/lib/i18n.ts`
- Create: `touch-type/renderer/src/locales/en/common.json`

- [ ] **Step 1: Create the English translation file**

```json
{
  "settings": {
    "title": "Settings",
    "subtitle": "Customize your Touch Typer experience",
    "categories": {
      "appearance": "Appearance",
      "keyboard": "Keyboard",
      "practice": "Practice & Code",
      "notifications": "Notifications",
      "account": "Account",
      "about": "About"
    },
    "appearance": {
      "analytics": "Enable Analytics",
      "analyticsDesc": "Send telemetry data about usage back to developers.",
      "whatsNew": "Show What's New on Startup",
      "whatsNewDesc": "Show the What's New message when the app starts.",
      "theme": "Theme",
      "themeDesc": "Choose the color scheme of the app.",
      "themeDark": "Dark",
      "themeLight": "Light",
      "themeSystem": "System",
      "publishLeaderboard": "Publish to Leaderboard",
      "publishLeaderboardDesc": "Publish results to the public leaderboard.",
      "blinker": "Blinker",
      "blinkerDesc": "Blink the key being typed.",
      "appLanguage": "Application Language",
      "appLanguageDesc": "Choose the language of the app interface.",
      "autoDetect": "Auto-detect Language",
      "autoDetectDesc": "Automatically set the app language from your system locale."
    },
    "keyboard": {
      "practiceLanguage": "Practice Language",
      "practiceLanguageDesc": "Choose the language of the words to type."
    }
  }
}
```

Save to: `touch-type/renderer/src/locales/en/common.json`

- [ ] **Step 2: Create i18n.ts**

```typescript
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
```

Note: the imports for fr, de, es, mi, it, pt-br, nl will red-line until Task 5 creates those files. That's fine — fix them in order.

- [ ] **Step 3: Commit**

```bash
cd touch-type
git add renderer/src/lib/i18n.ts renderer/src/locales/en/common.json
git commit -m "feat: add i18n initialisation and English translation file"
```

---

## Task 5: Create Remaining 7 Translation Files

**Files:**
- Create: `touch-type/renderer/src/locales/fr/common.json`
- Create: `touch-type/renderer/src/locales/de/common.json`
- Create: `touch-type/renderer/src/locales/es/common.json`
- Create: `touch-type/renderer/src/locales/mi/common.json`
- Create: `touch-type/renderer/src/locales/it/common.json`
- Create: `touch-type/renderer/src/locales/pt-br/common.json`
- Create: `touch-type/renderer/src/locales/nl/common.json`

- [ ] **Step 1: Create fr/common.json**

```json
{
  "settings": {
    "title": "Paramètres",
    "subtitle": "Personnalisez votre expérience Touch Typer",
    "categories": {
      "appearance": "Apparence",
      "keyboard": "Clavier",
      "practice": "Pratique & Code",
      "notifications": "Notifications",
      "account": "Compte",
      "about": "À propos"
    },
    "appearance": {
      "analytics": "Activer les analyses",
      "analyticsDesc": "Envoyer des données de télémétrie aux développeurs.",
      "whatsNew": "Afficher les nouveautés au démarrage",
      "whatsNewDesc": "Afficher le message des nouveautés au démarrage.",
      "theme": "Thème",
      "themeDesc": "Choisissez le schéma de couleurs de l'application.",
      "themeDark": "Sombre",
      "themeLight": "Clair",
      "themeSystem": "Système",
      "publishLeaderboard": "Publier dans le classement",
      "publishLeaderboardDesc": "Publier les résultats dans le classement public.",
      "blinker": "Clignotant",
      "blinkerDesc": "Faire clignoter la touche tapée.",
      "appLanguage": "Langue de l'application",
      "appLanguageDesc": "Choisissez la langue de l'interface de l'application.",
      "autoDetect": "Détection automatique de la langue",
      "autoDetectDesc": "Définir automatiquement la langue depuis les paramètres régionaux du système."
    },
    "keyboard": {
      "practiceLanguage": "Langue de pratique",
      "practiceLanguageDesc": "Choisissez la langue des mots à taper."
    }
  }
}
```

- [ ] **Step 2: Create de/common.json**

```json
{
  "settings": {
    "title": "Einstellungen",
    "subtitle": "Passen Sie Ihr Touch Typer-Erlebnis an",
    "categories": {
      "appearance": "Erscheinungsbild",
      "keyboard": "Tastatur",
      "practice": "Übung & Code",
      "notifications": "Benachrichtigungen",
      "account": "Konto",
      "about": "Über"
    },
    "appearance": {
      "analytics": "Analysen aktivieren",
      "analyticsDesc": "Telemetriedaten über die Nutzung an Entwickler senden.",
      "whatsNew": "Neuigkeiten beim Start anzeigen",
      "whatsNewDesc": "Die Neuigkeiten-Nachricht beim App-Start anzeigen.",
      "theme": "Design",
      "themeDesc": "Wählen Sie das Farbschema der App.",
      "themeDark": "Dunkel",
      "themeLight": "Hell",
      "themeSystem": "System",
      "publishLeaderboard": "In Rangliste veröffentlichen",
      "publishLeaderboardDesc": "Ergebnisse in der öffentlichen Rangliste veröffentlichen.",
      "blinker": "Blinker",
      "blinkerDesc": "Die getippte Taste blinken lassen.",
      "appLanguage": "Anwendungssprache",
      "appLanguageDesc": "Wählen Sie die Sprache der App-Oberfläche.",
      "autoDetect": "Sprache automatisch erkennen",
      "autoDetectDesc": "Anwendungssprache automatisch aus den Systemeinstellungen übernehmen."
    },
    "keyboard": {
      "practiceLanguage": "Übungssprache",
      "practiceLanguageDesc": "Wählen Sie die Sprache der zu tippenden Wörter."
    }
  }
}
```

- [ ] **Step 3: Create es/common.json**

```json
{
  "settings": {
    "title": "Configuración",
    "subtitle": "Personaliza tu experiencia Touch Typer",
    "categories": {
      "appearance": "Apariencia",
      "keyboard": "Teclado",
      "practice": "Práctica y código",
      "notifications": "Notificaciones",
      "account": "Cuenta",
      "about": "Acerca de"
    },
    "appearance": {
      "analytics": "Activar análisis",
      "analyticsDesc": "Enviar datos de telemetría a los desarrolladores.",
      "whatsNew": "Mostrar novedades al iniciar",
      "whatsNewDesc": "Mostrar el mensaje de novedades cuando se inicia la aplicación.",
      "theme": "Tema",
      "themeDesc": "Elige el esquema de colores de la aplicación.",
      "themeDark": "Oscuro",
      "themeLight": "Claro",
      "themeSystem": "Sistema",
      "publishLeaderboard": "Publicar en clasificación",
      "publishLeaderboardDesc": "Publicar resultados en la clasificación pública.",
      "blinker": "Cursor parpadeante",
      "blinkerDesc": "Hacer parpadear la tecla que se está escribiendo.",
      "appLanguage": "Idioma de la aplicación",
      "appLanguageDesc": "Elige el idioma de la interfaz de la aplicación.",
      "autoDetect": "Detectar idioma automáticamente",
      "autoDetectDesc": "Establecer automáticamente el idioma de la aplicación desde la configuración regional del sistema."
    },
    "keyboard": {
      "practiceLanguage": "Idioma de práctica",
      "practiceLanguageDesc": "Elige el idioma de las palabras a escribir."
    }
  }
}
```

- [ ] **Step 4: Create mi/common.json**

```json
{
  "settings": {
    "title": "Tautuhinga",
    "subtitle": "Whakarite i tō wheako Touch Typer",
    "categories": {
      "appearance": "Āhua",
      "keyboard": "Papapātuhi",
      "practice": "Whakarite & Code",
      "notifications": "Pānui",
      "account": "Pūkete",
      "about": "Mō"
    },
    "appearance": {
      "analytics": "Whakakā Tātaritanga",
      "analyticsDesc": "Tukuna ngā raraunga arotake ki ngā kaihanga.",
      "whatsNew": "Whakaahua He Aha te Hou i te Tīmatanga",
      "whatsNewDesc": "Whakaahua te karere He Aha te Hou ina tīmata te tono.",
      "theme": "Kaupeka",
      "themeDesc": "Kōwhiria te hoahoa tae o te tono.",
      "themeDark": "Pouri",
      "themeLight": "Mārama",
      "themeSystem": "Pūnaha",
      "publishLeaderboard": "Whakaputaina ki te Tūtohu",
      "publishLeaderboardDesc": "Whakaputaina ngā hua ki te tūtohu tūmatanui.",
      "blinker": "Kanohi",
      "blinkerDesc": "Kanapu te pātene e tāia ana.",
      "appLanguage": "Reo Tono",
      "appLanguageDesc": "Kōwhiria te reo o te tono.",
      "autoDetect": "Kitea Aunoa te Reo",
      "autoDetectDesc": "Tautuhia aunoa te reo o te tono mai i ngā tautuhinga ā-rohe o tō pūnaha."
    },
    "keyboard": {
      "practiceLanguage": "Reo Whakarite",
      "practiceLanguageDesc": "Kōwhiria te reo o ngā kupu hei tāuru."
    }
  }
}
```

- [ ] **Step 5: Create it/common.json**

```json
{
  "settings": {
    "title": "Impostazioni",
    "subtitle": "Personalizza la tua esperienza Touch Typer",
    "categories": {
      "appearance": "Aspetto",
      "keyboard": "Tastiera",
      "practice": "Pratica e codice",
      "notifications": "Notifiche",
      "account": "Account",
      "about": "Informazioni"
    },
    "appearance": {
      "analytics": "Abilita analisi",
      "analyticsDesc": "Invia dati di telemetria sull'utilizzo agli sviluppatori.",
      "whatsNew": "Mostra novità all'avvio",
      "whatsNewDesc": "Mostra il messaggio delle novità all'avvio dell'app.",
      "theme": "Tema",
      "themeDesc": "Scegli la combinazione di colori dell'app.",
      "themeDark": "Scuro",
      "themeLight": "Chiaro",
      "themeSystem": "Sistema",
      "publishLeaderboard": "Pubblica in classifica",
      "publishLeaderboardDesc": "Pubblica i risultati nella classifica pubblica.",
      "blinker": "Cursore lampeggiante",
      "blinkerDesc": "Far lampeggiare il tasto digitato.",
      "appLanguage": "Lingua dell'applicazione",
      "appLanguageDesc": "Scegli la lingua dell'interfaccia dell'app.",
      "autoDetect": "Rilevamento automatico lingua",
      "autoDetectDesc": "Imposta automaticamente la lingua dell'app dalle impostazioni locali del sistema."
    },
    "keyboard": {
      "practiceLanguage": "Lingua di pratica",
      "practiceLanguageDesc": "Scegli la lingua delle parole da digitare."
    }
  }
}
```

- [ ] **Step 6: Create pt-br/common.json**

```json
{
  "settings": {
    "title": "Configurações",
    "subtitle": "Personalize sua experiência no Touch Typer",
    "categories": {
      "appearance": "Aparência",
      "keyboard": "Teclado",
      "practice": "Prática e código",
      "notifications": "Notificações",
      "account": "Conta",
      "about": "Sobre"
    },
    "appearance": {
      "analytics": "Ativar análises",
      "analyticsDesc": "Enviar dados de telemetria sobre o uso para os desenvolvedores.",
      "whatsNew": "Mostrar novidades ao iniciar",
      "whatsNewDesc": "Mostrar a mensagem de novidades quando o app iniciar.",
      "theme": "Tema",
      "themeDesc": "Escolha o esquema de cores do app.",
      "themeDark": "Escuro",
      "themeLight": "Claro",
      "themeSystem": "Sistema",
      "publishLeaderboard": "Publicar no placar",
      "publishLeaderboardDesc": "Publicar resultados no placar público.",
      "blinker": "Cursor piscante",
      "blinkerDesc": "Piscar a tecla sendo digitada.",
      "appLanguage": "Idioma do aplicativo",
      "appLanguageDesc": "Escolha o idioma da interface do aplicativo.",
      "autoDetect": "Detectar idioma automaticamente",
      "autoDetectDesc": "Definir automaticamente o idioma do app com base nas configurações regionais do sistema."
    },
    "keyboard": {
      "practiceLanguage": "Idioma de prática",
      "practiceLanguageDesc": "Escolha o idioma das palavras para digitar."
    }
  }
}
```

- [ ] **Step 7: Create nl/common.json**

```json
{
  "settings": {
    "title": "Instellingen",
    "subtitle": "Pas je Touch Typer-ervaring aan",
    "categories": {
      "appearance": "Uiterlijk",
      "keyboard": "Toetsenbord",
      "practice": "Oefenen & code",
      "notifications": "Meldingen",
      "account": "Account",
      "about": "Over"
    },
    "appearance": {
      "analytics": "Analyses inschakelen",
      "analyticsDesc": "Gebruikstelemetriegegevens naar de ontwikkelaars sturen.",
      "whatsNew": "Nieuwtjes tonen bij opstarten",
      "whatsNewDesc": "Het nieuwsbericht tonen wanneer de app start.",
      "theme": "Thema",
      "themeDesc": "Kies het kleurenschema van de app.",
      "themeDark": "Donker",
      "themeLight": "Licht",
      "themeSystem": "Systeem",
      "publishLeaderboard": "Publiceren naar scorebord",
      "publishLeaderboardDesc": "Resultaten publiceren op het openbare scorebord.",
      "blinker": "Knipperende cursor",
      "blinkerDesc": "De getypte toets laten knipperen.",
      "appLanguage": "Applicatietaal",
      "appLanguageDesc": "Kies de taal van de app-interface.",
      "autoDetect": "Taal automatisch detecteren",
      "autoDetectDesc": "De app-taal automatisch instellen op basis van uw systeemtaalinstellingen."
    },
    "keyboard": {
      "practiceLanguage": "Oefentaal",
      "practiceLanguageDesc": "Kies de taal van de te typen woorden."
    }
  }
}
```

- [ ] **Step 8: Commit**

```bash
cd touch-type
git add renderer/src/locales/
git commit -m "feat: add translation files for fr, de, es, mi, it, pt-br, nl"
```

---

## Task 6: Add Electron Bridge — getSystemLocale

**Files:**
- Modify: `touch-type/electron-src/index.ts` (add IPC handler)
- Modify: `touch-type/electron-src/preload.ts` (expose via contextBridge)
- Modify: `touch-type/renderer/types/electron.d.ts` (add to ElectronAPI)

- [ ] **Step 1: Add IPC handler in index.ts**

Find the block of `ipcMain.handle` calls (around line 111) and add after the last one:

```typescript
ipcMain.handle("getSystemLocale", () => app.getLocale());
```

The `app` import is already present at the top of the file.

- [ ] **Step 2: Add to contextBridge in preload.ts**

Find the `contextBridge.exposeInMainWorld("electronAPI", {` block and add `getSystemLocale` alongside the other methods:

```typescript
getSystemLocale: () => ipcRenderer.invoke("getSystemLocale"),
```

- [ ] **Step 3: Add to ElectronAPI type in electron.d.ts**

In `touch-type/renderer/types/electron.d.ts`, add `getSystemLocale` to the `ElectronAPI` interface (e.g., after `getDebugInfo`):

```typescript
getSystemLocale: () => Promise<string>;
```

- [ ] **Step 4: Type-check**

```bash
cd touch-type
pnpm type-check
```

Expected: no errors related to `getSystemLocale`. (If `locale-detect.ts` was added in Task 3 before this step, it should resolve cleanly now.)

- [ ] **Step 5: Commit**

```bash
cd touch-type
git add electron-src/index.ts electron-src/preload.ts renderer/types/electron.d.ts
git commit -m "feat: expose getSystemLocale via Electron IPC bridge"
```

---

## Task 7: Update settings_hook.tsx

Adds `appLanguage` + `autoDetectAppLanguage` fields, new reducer actions, i18n.changeLanguage effect, and auto-detect on load.

**Files:**
- Modify: `touch-type/renderer/src/lib/settings_hook.tsx`

- [ ] **Step 1: Add new imports at the top of settings_hook.tsx**

After the existing imports, add:

```typescript
import i18n from "@/lib/i18n";
import { detectAppLanguage } from "@/lib/locale-detect";
```

- [ ] **Step 2: Add new fields to SettingsContext default value**

In the `createContext({...})` call (around line 68), add after `dismissedKeyboardSuggestions`:

```typescript
appLanguage: Languages.ENGLISH,
autoDetectAppLanguage: true,
```

- [ ] **Step 3: Add new fields to defaultSettings**

In the `defaultSettings` object (around line 99), add after `dismissedKeyboardSuggestions`:

```typescript
appLanguage: Languages.ENGLISH,
autoDetectAppLanguage: true,
```

- [ ] **Step 4: Add new action types to ChangeSettingsAction union**

In the `ChangeSettingsAction` type (around line 130), add after the last action:

```typescript
| {
    type: "SET_APP_LANGUAGE";
    appLanguage: Languages;
  }
| {
    type: "SET_AUTO_DETECT_APP_LANGUAGE";
    enabled: boolean;
  }
```

- [ ] **Step 5: Add new reducer cases**

In the `reducer` switch statement, add before `default`:

```typescript
case "SET_APP_LANGUAGE":
  return { ...state, appLanguage: action.appLanguage };

case "SET_AUTO_DETECT_APP_LANGUAGE":
  return { ...state, autoDetectAppLanguage: action.enabled };
```

- [ ] **Step 6: Update the localStorage useLayoutEffect to trigger auto-detect**

Replace the existing localStorage `useLayoutEffect` (the one that reads `localStorage.getItem("settings")`) with:

```typescript
useLayoutEffect(() => {
  if (typeof window === "undefined") return;

  const savedSettings = JSON.parse(localStorage.getItem("settings") || "{}");
  dispatch({ type: "LOAD_SETTINGS", settings: savedSettings });

  if (savedSettings.autoDetectAppLanguage !== false) {
    detectAppLanguage().then((detected) => {
      dispatch({ type: "SET_APP_LANGUAGE", appLanguage: detected });
    });
  }
}, []);
```

- [ ] **Step 7: Add useEffect to call i18n.changeLanguage when appLanguage changes**

After the existing `useLayoutEffect` for theme (around line 534), add:

```typescript
useEffect(() => {
  i18n.changeLanguage(settings.appLanguage);
}, [settings.appLanguage]);
```

- [ ] **Step 8: Update fetchSettings to read app_language from DB**

In the `dbSettings` object inside `fetchSettings` (around line 452), add after `whatsNewOnStartup`:

```typescript
appLanguage: (data.app_language as Languages) ?? Languages.ENGLISH,
// autoDetectAppLanguage is NOT fetched from DB — it is machine-specific (localStorage only)
```

- [ ] **Step 9: Update saveSettings to write app_language to DB**

In the `dbSettings` object inside `saveSettings` (around line 493), add after `whats_new_on_startup`:

```typescript
app_language: safeSettings.appLanguage,
// auto_detect_app_language is NOT saved to DB — machine-specific, same treatment as launchAtStartup
```

- [ ] **Step 10: Type-check**

```bash
cd touch-type
pnpm type-check
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
cd touch-type
git add renderer/src/lib/settings_hook.tsx
git commit -m "feat: add appLanguage and autoDetectAppLanguage to settings state"
```

---

## Task 8: Update settings.tsx

Adds `useTranslation()` to relevant panels, wraps existing AppearanceSettings strings, adds the two new controls, and renames the typing language label to "Practice Language".

**Files:**
- Modify: `touch-type/renderer/src/components/settings/settings.tsx`

- [ ] **Step 1: Add new imports**

At the top of `settings.tsx`, add after the existing imports:

```typescript
import { useTranslation } from "react-i18next";
import { detectAppLanguage } from "@/lib/locale-detect";
```

- [ ] **Step 2: Change SETTINGS_CATEGORIES to an array of IDs**

Replace the existing `SettingsCategory` interface and `SETTINGS_CATEGORIES` constant with:

```typescript
const SETTINGS_CATEGORIES: SettingsCategoryId[] = [
  "appearance",
  "keyboard",
  "practice",
  "notifications",
  "account",
  "about",
];
```

(The `SettingsCategory` interface and its `label` field are no longer needed — delete them.)

- [ ] **Step 3: Replace AppearanceSettings with translated version**

Replace the entire `AppearanceSettings` function with:

```tsx
function AppearanceSettings() {
  const settings = useSettings();
  const dispatchSettings = useSettingsDispatch();
  const { t } = useTranslation();

  return (
    <form className="flex flex-col gap-6">
      <SettingsSwitch
        enabled={settings.analytics}
        setEnabled={(enabled) => {
          enabled
            ? Fathom.enableTrackingForMe()
            : Fathom.blockTrackingForMe();
          dispatchSettings({ type: "SET_ANALYTICS", analytics: enabled });
        }}
        label={t("settings.appearance.analytics")}
        description={t("settings.appearance.analyticsDesc")}
      />

      <SettingsSwitch
        enabled={settings.whatsNewOnStartup}
        setEnabled={(enabled) =>
          dispatchSettings({ type: "SET_WHATS_NEW", whatsnew: enabled })
        }
        label={t("settings.appearance.whatsNew")}
        description={t("settings.appearance.whatsNewDesc")}
      />

      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label>{t("settings.appearance.theme")}</Label>
          <Description as="span" className="text-sm text-gray-500">
            {t("settings.appearance.themeDesc")}
          </Description>
        </span>
        <Select
          className={clsx(
            "block w-28 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
            "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
            "*:text-black",
          )}
          value={settings.theme}
          onChange={(e) => {
            dispatchSettings({
              type: "CHANGE_COLOR_SCHEME",
              colorScheme: e.target.value as ColorScheme,
            });
          }}
        >
          <option value={ColorScheme.DARK}>{t("settings.appearance.themeDark")}</option>
          <option value={ColorScheme.LIGHT}>{t("settings.appearance.themeLight")}</option>
          <option value={ColorScheme.SYSTEM}>{t("settings.appearance.themeSystem")}</option>
        </Select>
      </Field>

      <SettingsSwitch
        enabled={settings.publishToLeaderboard}
        setEnabled={(enabled: boolean) =>
          dispatchSettings({
            type: "SET_PUBLISH_TO_LEADERBOARD",
            publishToLeaderboard: enabled,
          })
        }
        label={t("settings.appearance.publishLeaderboard")}
        description={t("settings.appearance.publishLeaderboardDesc")}
      />

      <SettingsSwitch
        enabled={settings.blinker}
        setEnabled={(enabled: boolean) =>
          dispatchSettings({ type: "SET_BLINKER", blinker: enabled })
        }
        label={t("settings.appearance.blinker")}
        description={t("settings.appearance.blinkerDesc")}
      />

      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label>{t("settings.appearance.appLanguage")}</Label>
          <Description as="span" className="text-sm text-gray-500">
            {t("settings.appearance.appLanguageDesc")}
          </Description>
        </span>
        <Select
          className={clsx(
            "block w-44 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
            "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
            "*:text-black",
            settings.autoDetectAppLanguage && "opacity-50 cursor-not-allowed",
          )}
          value={settings.appLanguage}
          disabled={settings.autoDetectAppLanguage}
          onChange={(e) => {
            dispatchSettings({
              type: "SET_APP_LANGUAGE",
              appLanguage: e.target.value as Languages,
            });
          }}
        >
          {LANGUAGES.map((language) => (
            <option key={language.value} value={language.value}>
              {language.label}
            </option>
          ))}
        </Select>
      </Field>

      <SettingsSwitch
        enabled={settings.autoDetectAppLanguage}
        setEnabled={(enabled) => {
          dispatchSettings({ type: "SET_AUTO_DETECT_APP_LANGUAGE", enabled });
          if (enabled) {
            detectAppLanguage().then((detected) => {
              dispatchSettings({ type: "SET_APP_LANGUAGE", appLanguage: detected });
            });
          }
        }}
        label={t("settings.appearance.autoDetect")}
        description={t("settings.appearance.autoDetectDesc")}
      />
    </form>
  );
}
```

- [ ] **Step 4: Update KeyboardSettingsPanel to use translated Practice Language label**

Inside `KeyboardSettingsPanel`, add `const { t } = useTranslation();` at the top of the function body, then replace the two hardcoded strings for the language dropdown:

```tsx
// replace:
<Label>Language</Label>
<Description as="span" className="text-sm text-gray-500">
  Choose the language of the words to type.
</Description>

// with:
<Label>{t("settings.keyboard.practiceLanguage")}</Label>
<Description as="span" className="text-sm text-gray-500">
  {t("settings.keyboard.practiceLanguageDesc")}
</Description>
```

- [ ] **Step 5: Update the Settings main component to translate page header and category nav**

Add `const { t } = useTranslation();` inside the `Settings` component (alongside the existing `useState`), then make two changes:

**5a. Translate the PageHeader:**
```tsx
// replace:
<PageHeader
  icon={faGear}
  title="Settings"
  subtitle="Customize your Touch Typer experience"
  ...
/>

// with:
<PageHeader
  icon={faGear}
  title={t("settings.title")}
  subtitle={t("settings.subtitle")}
  iconBg="bg-slate-400/10"
  iconColor="text-slate-400 dark:text-slate-300"
/>
```

**5b. Translate the category nav buttons** (SETTINGS_CATEGORIES is now `SettingsCategoryId[]`):
```tsx
{SETTINGS_CATEGORIES.map((cat) => (
  <button
    key={cat}
    onClick={() => setActiveCategory(cat)}
    className={clsx(
      "text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
      activeCategory === cat
        ? "bg-sky-400/10 text-sky-400"
        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-700 dark:hover:text-slate-200",
    )}
  >
    {t(`settings.categories.${cat}`)}
  </button>
))}
```

- [ ] **Step 6: Type-check**

```bash
cd touch-type
pnpm type-check
```

Expected: no errors. If TypeScript complains about `t(`settings.categories.${cat}`)` with the template literal, add `as string` to the template: `` t(`settings.categories.${cat}` as string) ``.

- [ ] **Step 7: Commit**

```bash
cd touch-type
git add renderer/src/components/settings/settings.tsx
git commit -m "feat: add Application Language controls and translate settings UI"
```

---

## Task 9: Wire i18n into layout.tsx + Final Verification

**Files:**
- Modify: `touch-type/renderer/src/app/layout.tsx`

- [ ] **Step 1: Import i18n as a side-effect in layout.tsx**

Add this import to `touch-type/renderer/src/app/layout.tsx` (after the existing imports):

```typescript
import "@/lib/i18n";
```

This ensures i18next is initialised before any component tree mounts.

- [ ] **Step 2: Full type-check**

```bash
cd touch-type
pnpm type-check
```

Expected: zero errors across both `renderer/` and `electron-src/`.

- [ ] **Step 3: Start the renderer in dev mode and verify manually**

```bash
cd touch-type
pnpm dev:next
```

Open `http://localhost:3000` in a browser. Navigate to Settings:

1. The Appearance panel shows "Application Language" dropdown (defaulting to English) and "Auto-detect Language" toggle (on by default).
2. With auto-detect on, the dropdown is visually dimmed and non-interactive.
3. Toggle auto-detect off — the dropdown becomes active.
4. Change the language to French — all translated strings in the Appearance panel, category nav, and page header update immediately to French.
5. Switch back to English — strings revert.
6. In the Keyboard panel, confirm the label reads "Practice Language" (not "Language").

- [ ] **Step 4: Commit**

```bash
cd touch-type
git add renderer/src/app/layout.tsx
git commit -m "feat: initialise i18n before React tree in layout"
```

---

## Out of Scope (follow-up work)

- Translating sub-panels: `NotificationSettings`, `CodeSettings`, `DebugSettings`, `CalendarSettings`, `StartupSettings` — same pattern: add `useTranslation()` and wrap strings with `t()`, add keys to all 8 `common.json` files.
- Translating other app pages: main practice page, stats, heatmap, assistant, pvp.
- Translating the marketing website (`touch-typer.kochie.io/`).
- Crowdsourced / community translations.
- RTL language support.
