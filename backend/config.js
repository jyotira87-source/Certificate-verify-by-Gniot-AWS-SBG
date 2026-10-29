"use strict";

/**
 * Advance Certificate Verification — Backend Configuration
 * All configuration is environment-based. No secrets are hardcoded.
 */

const getEnv = (name, fallback) => {
  const value = process.env[name];
  if (value !== undefined && value !== "") return value;
  return fallback;
};

const config = {
  // Server
  PORT: parseInt(getEnv("PORT", "4000"), 10),
  NODE_ENV: getEnv("NODE_ENV", "development"),

  // Storage
  DATA_DIR: getEnv("DATA_DIR", __dirname),
  DB_FILE: getEnv("DB_FILE", __dirname + "/db.json"),
  AUDIT_FILE: getEnv("AUDIT_FILE", __dirname + "/audit.json"),
  VERIFICATION_LOG_FILE: getEnv(
    "VERIFICATION_LOG_FILE",
    __dirname + "/verification-log.json"
  ),

  // Security
  SESSION_SECRET: getEnv("SESSION_SECRET", "change-me-in-production"),
  ADMIN_PASSWORD_HASH: getEnv("ADMIN_PASSWORD_HASH", ""),
  ADMIN_USERNAME: getEnv("ADMIN_USERNAME", "admin"),
  BCRYPT_SALT_ROUNDS: parseInt(getEnv("BCRYPT_SALT_ROUNDS", "12"), 10),

  // CORS
  CORS_ORIGIN: getEnv("CORS_ORIGIN", "*"),

  // Public URL (for QR codes and verification links)
  PUBLIC_URL: getEnv("PUBLIC_URL", "http://localhost:4000"),

  // Upload limits
  MAX_UPLOAD_SIZE: parseInt(getEnv("MAX_UPLOAD_SIZE", "10485760"), 10), // 10 MB

  // Rate limiting
  LOGIN_RATE_LIMIT_WINDOW: parseInt(getEnv("LOGIN_RATE_LIMIT_WINDOW", "900000"), 10), // 15 min
  LOGIN_RATE_LIMIT_MAX: parseInt(getEnv("LOGIN_RATE_LIMIT_MAX", "10"), 10),
  API_RATE_LIMIT_WINDOW: parseInt(getEnv("API_RATE_LIMIT_WINDOW", "60000"), 10), // 1 min
  API_RATE_LIMIT_MAX: parseInt(getEnv("API_RATE_LIMIT_MAX", "100"), 10),
};

module.exports = config;