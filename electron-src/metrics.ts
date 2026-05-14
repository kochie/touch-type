import * as Sentry from "@sentry/electron/main";
import { app } from "electron";

type Attrs = Record<string, string | number | boolean>;

// Cached once at module load — app.getVersion() reads package.json synchronously
// and is safe to call before app.whenReady().
const APP_VERSION = app.getVersion();

function withVersion(attrs?: Attrs): Attrs {
  return { app_version: APP_VERSION, ...attrs };
}

export const metrics = {
  count(name: string, value = 1, attrs?: Attrs) {
    Sentry.metrics.count(name, value, { attributes: withVersion(attrs) });
  },
  distribution(name: string, value: number, unit?: string, attrs?: Attrs) {
    Sentry.metrics.distribution(name, value, { unit, attributes: withVersion(attrs) });
  },
  gauge(name: string, value: number, attrs?: Attrs) {
    Sentry.metrics.gauge(name, value, { attributes: withVersion(attrs) });
  },
};
