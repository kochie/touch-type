import { useEffect, useState } from 'react';
import { PremiumRequiredError } from '@/transactions/statsCharts';

export type QueryState<T> =
  | { status: 'loading' }
  | { status: 'locked' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

/** Runs `load` whenever `deps` change; ignores results from superseded runs. */
export function useStatsQuery<T>(
  load: () => Promise<T>,
  deps: unknown[],
): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    load()
      .then((data) => !cancelled && setState({ status: 'ready', data }))
      .catch((err) => {
        if (cancelled) return;
        setState(
          err instanceof PremiumRequiredError
            ? { status: 'locked' }
            : { status: 'error', message: err?.message ?? 'Something went wrong' },
        );
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
