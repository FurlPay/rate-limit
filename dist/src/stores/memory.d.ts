import type { RateLimitStore } from "../types.js";
/**
 * In-memory rate limit store.
 *
 * Good for: development, single-instance deployments, Edge functions.
 * Bad for: multi-instance deployments (use RedisRateLimitStore instead).
 *
 * Expired entries are cleaned up every 60 seconds to prevent memory leaks.
 */
export declare class MemoryRateLimitStore implements RateLimitStore {
    private readonly entries;
    private cleanupTimer;
    constructor();
    increment(key: string, windowSeconds: number): Promise<{
        count: number;
        resetAt: number;
    }>;
    peek(key: string): Promise<{
        count: number;
        resetAt: number;
    } | null>;
    /** Remove expired entries. */
    private cleanup;
    /** Stop the cleanup timer and clear all entries. */
    destroy(): void;
}
