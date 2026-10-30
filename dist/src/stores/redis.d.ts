import type { RateLimitStore } from "../types.js";
/** Configuration for the Redis rate limit store. */
export interface RedisRateLimitConfig {
    /** Upstash REST API URL. */
    url: string;
    /** Upstash REST API token. */
    token: string;
}
/**
 * Redis-backed rate limit store using Upstash REST API.
 *
 * Good for: multi-instance production deployments.
 * Requires: an Upstash Redis instance.
 *
 * Uses atomic INCR + EXPIRE to prevent race conditions between instances.
 * Falls back to allowing requests if Redis is unavailable (fail open for
 * rate limiting — blocking all API traffic on a Redis outage is worse than
 * briefly allowing extra requests).
 */
export declare class RedisRateLimitStore implements RateLimitStore {
    private readonly url;
    private readonly token;
    constructor(config: RedisRateLimitConfig);
    /** Execute an Upstash REST command. */
    private exec;
    /** Execute a pipeline of commands atomically. */
    private pipeline;
    increment(key: string, windowSeconds: number): Promise<{
        count: number;
        resetAt: number;
    }>;
    peek(key: string): Promise<{
        count: number;
        resetAt: number;
    } | null>;
}
