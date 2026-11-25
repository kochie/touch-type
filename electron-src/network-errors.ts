// Electron's networking layer rejects with `net::ERR_*` whenever the machine
// is offline, asleep or switching networks (e.g. ERR_NETWORK_IO_SUSPENDED,
// ERR_INTERNET_DISCONNECTED). The background update poll makes these fire
// constantly, and none of them are app bugs.

interface FrameLike {
  filename?: string;
  module?: string;
}

interface EventLike {
  exception?: {
    values?: { value?: string; stacktrace?: { frames?: FrameLike[] } }[];
  };
}

/**
 * Returns the `net::ERR_*` code when the event is a network error raised by
 * Electron's own networking internals, otherwise null.
 *
 * The origin is read from the stack frames: Sentry only computes `culprit`
 * server-side, so it is never present on the event in beforeSend.
 */
export function offlineErrorCode(event: EventLike): string | null {
  const exception = event.exception?.values?.[0];
  const code = exception?.value?.match(/^net::(ERR_[A-Z_]+)/)?.[1];
  if (!code) return null;

  const frames = exception?.stacktrace?.frames ?? [];
  const fromElectronInternals = frames.some(
    (f) => f.module === "browser_init" || f.filename?.includes("browser_init"),
  );
  return fromElectronInternals ? code : null;
}
