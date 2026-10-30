import type { RateLimitConfig } from "./types.js";
export declare const PRESETS: {
    /** General API endpoints: 100 req/min. */
    readonly api: {
        limit: number;
        windowSeconds: number;
        algorithm: "sliding-window";
    };
    /** Authentication endpoints (login, register, OTP): 5 req/min. */
    readonly auth: {
        limit: number;
        windowSeconds: number;
        algorithm: "fixed-window";
    };
    /** Payment/transfer endpoints: 10 req/min. */
    readonly payment: {
        limit: number;
        windowSeconds: number;
        algorithm: "sliding-window";
    };
    /** Webhook receivers (Anchorage, Stripe, etc.): 1000 req/min. */
    readonly webhook: {
        limit: number;
        windowSeconds: number;
        algorithm: "sliding-window";
    };
    /** Public read-only endpoints (prices, status): 200 req/min. */
    readonly publicRead: {
        limit: number;
        windowSeconds: number;
        algorithm: "sliding-window";
    };
    /** Agent/bot API endpoints: 30 req/min per agent. */
    readonly agent: {
        limit: number;
        windowSeconds: number;
        algorithm: "token-bucket";
    };
    /** Admin endpoints: 20 req/min. */
    readonly admin: {
        limit: number;
        windowSeconds: number;
        algorithm: "fixed-window";
    };
};
/**
 * Default route-to-preset mapping for FurlPay's Next.js API routes.
 *
 * This maps API route prefixes to presets. Use with `routeRateLimit()`:
 * ```typescript
 * import { routeRateLimit, FURLPAY_ROUTE_LIMITS, PRESETS } from "@furlpay/rate-limit";
 * const limiter = routeRateLimit(FURLPAY_ROUTE_LIMITS, PRESETS.api);
 * ```
 */
export declare const FURLPAY_ROUTE_LIMITS: Record<string, RateLimitConfig>;
