import { useEffect, useRef } from 'react';
import { useAppLocation } from '../../context/LocationContext';

/**
 * Renders nothing. Once per app launch (after onboarding), if "follow my
 * location" is on, quietly re-detects where the device is so the whole app
 * always shows the weather where you actually are. Manually choosing another
 * place turns this off; "Use my location" turns it back on.
 */
export const AutoLocation: React.FC = () => {
  const { followMyLocation, useMyLocation: locateMe } = useAppLocation();
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (followMyLocation) locateMe({ silent: true });
    // once per launch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};
