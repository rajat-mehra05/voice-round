import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { platform } from '@/platform';

export function useHasSessions(): boolean | undefined {
  const location = useLocation();
  const [hasSessions, setHasSessions] = useState<boolean | undefined>(undefined);

  /*
    Re-checks on every navigation. Cheap because the sessions table is
    capped at 50 rows and IndexedDB reads are sub-millisecond. Rerunning
    here is what lets History/Settings appear in the navbar after the
    user finishes their first interview and lands on /history/:id
    without a page reload.
  */
  useEffect(() => {
    let cancelled = false;
    platform.storage.sessions.getAll().then(
      (sessions) => {
        if (!cancelled) setHasSessions(sessions.length > 0);
      },
      () => {
        if (!cancelled) setHasSessions(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  return hasSessions;
}
