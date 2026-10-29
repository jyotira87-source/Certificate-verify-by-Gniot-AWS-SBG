"use strict";

/**
 * Rate Limiting Middleware
 * Simple in-memory rate limiter. In production, use Redis.
 */

const clients = new Map();

const createRateLimiter = (windowMs, maxRequests) => {
  return (req, res, next) => {
    const key = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    if (!clients.has(key)) {
      clients.set(key, []);
    }
    const timestamps = clients.get(key);

    // Remove old timestamps outside the window
    const valid = timestamps.filter((t) => now - t < windowMs);

    if (valid.length >= maxRequests) {
      res.writeHead(429, {
        "Content-Type": "application/json",
        "Retry-After": Math.ceil(windowMs / 1000),
      });
      return res.end(JSON.stringify({ error: "Too many requests, please try again later" }));
    }

    valid.push(now);
    clients.set(key, valid);
    next();
  };
};

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of clients.entries()) {
    const valid = timestamps.filter((t) => now - t < 3600000);
    if (valid.length === 0) {
      clients.delete(key);
    } else {
      clients.set(key, valid);
    }
  }
}, 600000);

if (typeof globalThis !== "undefined" && globalThis.__nitro_utils__) {
  // Nuxt compatibility - skip
} else {
  // Unref the interval so it doesn't prevent process exit
  cleanupInterval.unref?.();
}

module.exports = { createRateLimiter };