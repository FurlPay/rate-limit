// ---------------------------------------------------------------------------
// In-memory rate limit store.
//
// Uses a Map with automatic expiry. NOT suitable for multi-instance
// deployments — each instance tracks independently. Use the Redis store
// for production multi-instance configurations.
// ---------------------------------------------------------------------------
/**
 * In-memory rate limit store.
 *
 * Good for: development, single-instance deployments, Edge functions.
 * Bad for: multi-instance deployments (use RedisRateLimitStore instead).
 *
 * Expired entries are cleaned up every 60 seconds to prevent memory leaks.
 */
export class MemoryRateLimitStore {
    entries = new Map();
    cleanupTimer = null;
    constructor() {
        // Clean up expired entries every 60 seconds
        if (typeof setInterval !== "undefined") {
            this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
            // Don't prevent process exit
            if (this.cleanupTimer && "unref" in this.cleanupTimer) {
                this.cleanupTimer.unref();
            }
        }
    }
    async increment(key, windowSeconds) {
        const now = Math.floor(Date.now() / 1000);
        const existing = this.entries.get(key);
        if (existing && existing.resetAt > now) {
            // Within the current window — increment
            existing.count++;
            return { count: existing.count, resetAt: existing.resetAt };
        }
        // New window
        const entry = { count: 1, resetAt: now + windowSeconds };
        this.entries.set(key, entry);
        return { count: 1, resetAt: entry.resetAt };
    }
    async peek(key) {
        const now = Math.floor(Date.now() / 1000);
        const existing = this.entries.get(key);
        if (!existing || existing.resetAt <= now)
            return null;
        return { count: existing.count, resetAt: existing.resetAt };
    }
    /** Remove expired entries. */
    cleanup() {
        const now = Math.floor(Date.now() / 1000);
        for (const [key, entry] of this.entries) {
            if (entry.resetAt <= now)
                this.entries.delete(key);
        }
    }
    /** Stop the cleanup timer and clear all entries. */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.entries.clear();
    }
}
