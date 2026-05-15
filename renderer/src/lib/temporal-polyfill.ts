// Side-effect import: installs `Temporal` on `globalThis` for environments
// that don't ship it natively (Node during static export prerender). Chromium
// 132+ ships Temporal natively, so the conditional skips the polyfill on the
// actual Electron renderer at runtime. The cast routes through `unknown`
// because the polyfill's Temporal type and lib.dom's native Temporal type
// aren't structurally identical (Symbol.toStringTag presence differs).
import { Temporal } from "@js-temporal/polyfill";

if (typeof (globalThis as { Temporal?: unknown }).Temporal === "undefined") {
  (globalThis as unknown as { Temporal: unknown }).Temporal = Temporal;
}
