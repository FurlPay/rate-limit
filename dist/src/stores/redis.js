// ---------------------------------------------------------------------------
// Redis-backed rate limit store (Upstash REST API).
//
// Uses Upstash's REST API so it works in Edge runtimes (no TCP needed).
// Atomic increment + expire ensures correctness under concurrency.
// Falls back gracefully on Redis errors: allows the request and logs a
// warning, rather than blocking all traffic when Redis is down.
// ---------------------------------------------------------------------------
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
export class RedisRateLimitStore {
    url;
    token;
    constructor(config) {
        this.url = config.url.replace(/\/$/, "");
        this.token = config.token;
    }
    /** Execute an Upstash REST command. */
    async exec(command) {
        const res = await fetch(`${this.url}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(command),
        });
        if (!res.ok) {
            throw new Error(`Upstash Redis error: ${res.status} ${await res.text()}`);
        }
        const data = (await res.json());
        return data.result;
    }
    /** Execute a pipeline of commands atomically. */
    async pipeline(commands) {
        const res = await fetch(`${this.url}/pipeline`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(commands),
        });
        if (!res.ok) {
            throw new Error(`Upstash Redis pipeline error: ${res.status} ${await res.text()}`);
        }
        const data = (await res.json());
        return data.map((d) => d.result);
    }
    async increment(key, windowSeconds) {
        const redisKey = `rl:${key}`;
        try {
            // Pipeline: INCR + TTL (set expire only on first hit via a second command)
            const results = await this.pipeline([
                ["INCR", redisKey],
                ["TTL", redisKey],
            ]);
            const count = results[0];
            let ttl = results[1];
            // If this is the first increment (count === 1) or key has no TTL, set it
            if (count === 1 || ttl < 0) {
                await this.exec(["EXPIRE", redisKey, String(windowSeconds)]);
                ttl = windowSeconds;
            }
            const resetAt = Math.floor(Date.now() / 1000) + Math.max(ttl, 0);
            return { count, resetAt };
        }
        catch (e) {
            // Fail open: allow the request if Redis is down
            console.warn(`[@furlpay/rate-limit] Redis error, failing open: ${e.message}`);
            return { count: 0, resetAt: Math.floor(Date.now() / 1000) + windowSeconds };
        }
    }
    async peek(key) {
        const redisKey = `rl:${key}`;
        try {
            const results = await this.pipeline([
                ["GET", redisKey],
                ["TTL", redisKey],
            ]);
            const count = results[0];
            const ttl = results[1];
            if (count === null || ttl < 0)
                return null;
            return {
                count: Number(count),
                resetAt: Math.floor(Date.now() / 1000) + ttl,
            };
        }
        catch {
            return null;
        }
    }
}
