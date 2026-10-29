"use strict";

/**
 * Authentication Middleware
 * Session-based admin authentication. No secrets in client code.
 */

const sessions = new Map(); // In production, use Redis or database
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

const generateSessionToken = () => require("crypto").randomBytes(32).toString("hex");

const createSession = (adminId) => {
  const token = generateSessionToken();
  sessions.set(token, {
    adminId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL,
  });
  return token;
};

const getSession = (token) => {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session;
};

const destroySession = (token) => {
  sessions.delete(token);
};

const requireAuth = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token || !token.startsWith("Bearer ")) {
    res.writeHead(401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Authentication required" }));
  }

  const session = getSession(token.substring(7));
  if (!session) {
    res.writeHead(401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Invalid or expired session" }));
  }

  req.admin = { id: session.adminId };
  next();
};

const optionalAuth = (req, res, next) => {
  const token = req.headers["authorization"];
  if (token && token.startsWith("Bearer ")) {
    const session = getSession(token.substring(7));
    if (session) {
      req.admin = { id: session.adminId };
    }
  }
  next();
};

module.exports = {
  createSession,
  getSession,
  destroySession,
  requireAuth,
  optionalAuth,
  sessions,
};