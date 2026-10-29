"use strict";

const Admin = require("../models/Admin");
const { createSession, destroySession } = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/rateLimit");

const loginLimiter = createRateLimiter(
  process.env.LOGIN_RATE_LIMIT_WINDOW || 900000,
  process.env.LOGIN_RATE_LIMIT_MAX || 10
);

const setupAuthRoutes = (server) => {
  // Login
  server._handleAuthLogin = async (req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { username, password } = JSON.parse(body || "{}");

        if (!username || !password) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Username and password are required" }));
        }

        const admin = await Admin.findByUsername(username);
        if (!admin) {
          res.writeHead(401, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Invalid credentials" }));
        }

        const valid = await Admin.verifyPassword(admin, password);
        if (!valid) {
          res.writeHead(401, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Invalid credentials" }));
        }

        const token = createSession(admin.id);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({
            token,
            admin: { id: admin.id, username: admin.username, role: admin.role },
          })
        );
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Login failed" }));
      }
    });
  };

  // Logout
  server._handleAuthLogout = (req, res) => {
    const token = req.headers["authorization"];
    if (token && token.startsWith("Bearer ")) {
      destroySession(token.substring(7));
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ message: "Logged out" }));
  };

  // Verify session
  server._handleAuthVerify = (req, res) => {
    const token = req.headers["authorization"];
    if (!token || !token.startsWith("Bearer ")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Not authenticated" }));
    }

    const session = require("../middleware/auth").getSession(token.substring(7));
    if (!session) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid or expired session" }));
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ authenticated: true, adminId: session.adminId }));
  };

  return {
    loginLimiter,
    handleLogin: server._handleAuthLogin.bind(server),
    handleLogout: server._handleAuthLogout.bind(server),
    handleVerify: server._handleAuthVerify.bind(server),
  };
};

module.exports = { setupAuthRoutes, loginLimiter };