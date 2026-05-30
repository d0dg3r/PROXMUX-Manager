/**
 * Auto-refresh interval helpers.
 *
 * Stored as a number of seconds in `chrome.storage.local`.
 * 0 means "manual only" (current pre-1.3.0 behavior); any other value
 * is clamped to the supported set so misconfigured values do not turn into
 * runaway polling loops.
 */

export const AUTO_REFRESH_OFF = 0;
export const AUTO_REFRESH_ALLOWED = [AUTO_REFRESH_OFF, 15, 30, 60, 120, 300];
export const AUTO_REFRESH_DEFAULT = AUTO_REFRESH_OFF;
export const AUTO_REFRESH_MIN_SECONDS = 10;

export function normalizeAutoRefreshSeconds(value, fallback = AUTO_REFRESH_DEFAULT) {
    const raw = Number(value);
    if (!Number.isFinite(raw) || raw <= 0) {
        return fallback;
    }
    const rounded = Math.round(raw);
    if (AUTO_REFRESH_ALLOWED.includes(rounded)) {
        return rounded;
    }
    if (rounded < AUTO_REFRESH_MIN_SECONDS) {
        return AUTO_REFRESH_OFF;
    }
    let nearest = AUTO_REFRESH_DEFAULT;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const allowed of AUTO_REFRESH_ALLOWED) {
        if (allowed === AUTO_REFRESH_OFF) continue;
        const distance = Math.abs(allowed - rounded);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = allowed;
        }
    }
    return nearest;
}

export function isAutoRefreshEnabled(seconds) {
    return Number(seconds) >= AUTO_REFRESH_MIN_SECONDS;
}
