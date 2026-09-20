/** How often to silently re-fetch live data in the background — used by
 * both the main location's data (EnvironmentDataContext) and any
 * destination weather (e.g. Travel mode), so they always stay in sync
 * rather than risking two different intervals drifting apart over time. */
export const AUTO_REFRESH_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
