/**
 * Resolve host apiProxy without requiring Cordis inject.
 * Direct `ctx.apiProxy` throws "cannot get property without inject" on real fibers.
 */
export function resolveApiProxy(ctx) {
    const c = ctx;
    if (typeof c.get === 'function') {
        try {
            const viaGet = c.get('apiProxy');
            if (viaGet)
                return viaGet;
        }
        catch {
            // ignore and try own-property fallback (tests / plain mocks)
        }
    }
    try {
        // Own property on plain mocks only — Cordis proxy throws without inject.
        if (Object.prototype.hasOwnProperty.call(c, 'apiProxy') && c.apiProxy) {
            return c.apiProxy;
        }
    }
    catch {
        return undefined;
    }
    return undefined;
}
