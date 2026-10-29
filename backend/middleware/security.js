"use strict";

/**
 * Security Headers Middleware
 * Protects against common web vulnerabilities.
 */

const applySecurityHeaders = (res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; " +
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; " +
    "img-src 'self' data: blob: https:; " +
    "connect-src 'self' https:; " +
    "font-src 'self' https://cdn.jsdelivr.net https://unpkg.com;"
  );
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
};

const applyCORS = (res, config) => {
  const origin = config.CORS_ORIGIN === "*" ? "*" : config.CORS_ORIGIN;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
};

module.exports = {
  applySecurityHeaders,
  applyCORS,
};