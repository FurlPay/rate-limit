import type { RateLimitConfig, RateLimitRequest, RateLimitResult, RateLimitInfo, RateLimitStore } from "./types.js";
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
export declare function rateLimit(config: RateLimitConfig, store?: RateLimitStore): (req: RateLimitRequest) => Promise<RateLimitResult>;
/**
 * Format rate limit info as standard HTTP response headers.
 *
 * Headers set:
 * - `X-RateLimit-Limit`: Maximum requests per window
 * - `X-RateLimit-Remaining`: Requests remaining
 * - `X-RateLimit-Reset`: Unix timestamp when the window resets
 * - `Retry-After`: Seconds to wait (only when rate limited)
 */
export declare function rateLimitHeaders(info: RateLimitInfo): Record<string, string>;
/**
 * Create a standard 429 Too Many Requests response.
 *
 * @param info - Rate limit info from a check result.
 * @param custom - Optional custom response factory.
 * @returns A Response object with rate limit headers and a JSON body.
 */
export declare function rateLimitResponse(info: RateLimitInfo, custom?: (info: RateLimitInfo) => Response): Response;
/** Map of route patterns to rate limit configs. */
export type RouteRateLimitMap = Record<string, RateLimitConfig>;
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
export declare function routeRateLimit(routes: RouteRateLimitMap, defaultConfig: RateLimitConfig, store?: RateLimitStore): (req: RateLimitRequest) => Promise<RateLimitResult>;
