import * as Sentry from "@sentry/nextjs";

type Attrs = Record<string, string | number | boolean>;

// Attributes attached to every metric (e.g. is_premium). Per-call attrs win.
let baseAttrs: Attrs = {};

export function setMetricsContext(attrs: Attrs) {
  baseAttrs = { ...baseAttrs, ...attrs };
}

function withBase(attrs?: Attrs): Attrs {
  return { ...baseAttrs, ...attrs };
}

// Thin typed wrapper over Sentry.metrics so callsites never import Sentry
// directly and metric names stay in one place.
export const metrics = {
  count(name: string, value = 1, attrs?: Attrs) {
    Sentry.metrics.count(name, value, { attributes: withBase(attrs) });
  },
  distribution(name: string, value: number, unit?: string, attrs?: Attrs) {
    Sentry.metrics.distribution(name, value, { unit, attributes: withBase(attrs) });
  },
  gauge(name: string, value: number, attrs?: Attrs) {
    Sentry.metrics.gauge(name, value, { attributes: withBase(attrs) });
  },
};
