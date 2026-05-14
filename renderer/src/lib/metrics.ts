import * as Sentry from "@sentry/nextjs";

type Attrs = Record<string, string | number | boolean>;

// Thin typed wrapper over Sentry.metrics so callsites never import Sentry
// directly and metric names stay in one place.
export const metrics = {
  count(name: string, value = 1, attrs?: Attrs) {
    Sentry.metrics.count(name, value, { attributes: attrs });
  },
  distribution(name: string, value: number, unit?: string, attrs?: Attrs) {
    Sentry.metrics.distribution(name, value, { unit, attributes: attrs });
  },
  gauge(name: string, value: number, attrs?: Attrs) {
    Sentry.metrics.gauge(name, value, { attributes: attrs });
  },
};
