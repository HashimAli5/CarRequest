import { useCallback, useEffect, useRef, useState } from 'react';
import { useFeedback } from '../context/FeedbackContext';
import { errorMessage } from './api';

type RunOptions = {
  /** Shown in the success overlay. */
  success: string;
  successSubtitle?: string;
  successColor?: string;
  /** First line of the error message, e.g. "Couldn't approve the request." */
  failure: string;
  onDone?: () => void;
};

/**
 * State for "confirm → run → success / error" dialogs.
 * Guards against double submission and keeps errors visible until retried or cancelled.
 */
export function useConfirmAction() {
  const { celebrate } = useFeedback();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const open = useCallback(() => {
    setError(null);
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    if (!busy.current) setVisible(false);
  }, []);

  const run = useCallback(
    async (action: () => Promise<unknown>, opts: RunOptions) => {
      if (busy.current) return;
      busy.current = true;
      setLoading(true);
      setError(null);
      try {
        await action();
        busy.current = false;
        if (mounted.current) {
          setLoading(false);
          setVisible(false);
        }
        // Global overlay: still plays if this component unmounted because the request moved lists.
        celebrate({ title: opts.success, subtitle: opts.successSubtitle, color: opts.successColor });
        opts.onDone?.();
      } catch (err) {
        busy.current = false;
        if (mounted.current) {
          setLoading(false);
          setError(errorMessage(err, opts.failure));
        }
      }
    },
    [celebrate]
  );

  return { visible, loading, error, open, close, run };
}
