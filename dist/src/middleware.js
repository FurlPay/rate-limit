// ---------------------------------------------------------------------------
// Rate limit middleware + algorithm integration.
//
// This module provides the main `rateLimit()` function that combines a store,
// an algorithm decision, and HTTP response handling into a single callable.
//
// All three algorithms (sliding-window, fixed-window, token-bucket) reduce
// to the same store interface: increment a counter and check it against a
// limit. The difference is how the window boundary is computed. Since all
// three use the same store.increment() call, switching algorithms is a config
// change, not a code change.
// ---------------------------------------------------------------------------
import { MemoryRateLimitStore } from "./stores/memory.js";
// ── Default key generator ───────────────────────────────────────────────────
/** Default: rate limit by IP. */
function defaultKeyGenerator(req) {
    return req.ip;
}
// ── Rate limiter ────────────────────────────────────────────────────────────
/**
 * Create a rate limiter function.
 *
 * Returns a function that checks whether a request is allowed. The function
 * is stateful — it increments counters on each call.
 *
 * @param config - Rate limit configuration.
 * @param store  - Storage backend. Default: in-memory.
 * @returns A function that checks and increments the rate limit.
 */
export function rateLimit(config, store = new MemoryRateLimitStore()) {
    const { limit, windowSeconds, keyGenerator = defaultKeyGenerator, skip } = config;
    return async (req) => {
        // Check skip condition
        if (skip?.(req)) {
            return {
                allowed: true,
                info: { limit, remaining: limit, resetAt: 0, retryAfter: 0 },
            };
        }
        const key = keyGenerator(req);
        const { count, resetAt } = await store.increment(key, windowSeconds);
        const now = Math.floor(Date.now() / 1000);
        const remaining = Math.max(0, limit - count);
        const retryAfter = count > limit ? Math.max(0, resetAt - now) : 0;
        const info = { limit, remaining, resetAt, retryAfter };
        return { allowed: count <= limit, info };
    };
}
/**
 * Format rate limit info as standard HTTP response headers.
 *
 * Headers set:
 * - `X-RateLimit-Limit`: Maximum requests per window
 * - `X-RateLimit-Remaining`: Requests remaining
 * - `X-RateLimit-Reset`: Unix timestamp when the window resets
 * - `Retry-After`: Seconds to wait (only when rate limited)
 */
export function rateLimitHeaders(info) {
    const headers = {
        "X-RateLimit-Limit": String(info.limit),
        "X-RateLimit-Remaining": String(info.remaining),
        "X-RateLimit-Reset": String(info.resetAt),
    };
    if (info.retryAfter > 0) {
        headers["Retry-After"] = String(info.retryAfter);
    }
    return headers;
}
/**
 * Create a standard 429 Too Many Requests response.
 *
 * @param info - Rate limit info from a check result.
 * @param custom - Optional custom response factory.
 * @returns A Response object with rate limit headers and a JSON body.
 */
export function rateLimitResponse(info, custom) {
    if (custom)
        return custom(info);
    const headers = rateLimitHeaders(info);
    return new Response(JSON.stringify({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again in ${info.retryAfter} seconds.`,
        retryAfter: info.retryAfter,
    }), {
        status: 429,
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
    });
}
/**
 * Create a rate limiter that applies different limits to different routes.
 *
 * Routes are matched by prefix. The most specific (longest) match wins.
 * Routes not matching any pattern get the `defaultConfig`.
 *
 * @param routes        - Map of route prefixes to configs.
 * @param defaultConfig - Config for unmatched routes.
 * @param store         - Shared storage backend.
 */
export function routeRateLimit(routes, defaultConfig, store = new MemoryRateLimitStore()) {
    // Sort routes by length descending for longest-prefix match
    const sortedRoutes = Object.entries(routes).sort(([a], [b]) => b.length - a.length);
    // Pre-create a limiter for each route + the default
    const limiters = new Map();
    for (const [prefix, cfg] of sortedRoutes) {
        limiters.set(prefix, rateLimit(cfg, store));
    }
    const defaultLimiter = rateLimit(defaultConfig, store);
    return async (req) => {
        for (const [prefix] of sortedRoutes) {
            if (req.path.startsWith(prefix)) {
                return limiters.get(prefix)(req);
            }
        }
        return defaultLimiter(req);
    };
}
