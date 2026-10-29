"use strict";

const http = require("http");
const url = require("url");
const config = require("./config");
const models = require("./models");
const { applySecurityHeaders, applyCORS } = require("./middleware/security");
const { createRateLimiter } = require("./middleware/rateLimit");
const { requireAuth, optionalAuth } = require("./middleware/auth");
const { setupAuthRoutes, loginLimiter } = require("./routes/auth");
const { setupCertRoutes } = require("./routes/certs");
const { setupVerificationRoutes } = require("./routes/verification");
const { setupAuditRoutes } = require("./routes/audit");
const { setupExportRoutes } = require("./routes/export");

const { Certificate, Admin, AuditLog, VerificationLog } = models;

const apiRateLimiter = createRateLimiter(
  config.API_RATE_LIMIT_WINDOW,
  config.API_RATE_LIMIT_MAX
);

// Create server instance (no handler yet)
const server = new http.createServer();

// Initialize route handlers and assign to server object (runs once at startup)
const authRoutes = setupAuthRoutes(server);
const certRoutes = setupCertRoutes(server, models, { requireAuth, optionalAuth }, require("./middleware/validation"));
const verificationRoutes = setupVerificationRoutes(server, models, { requireAuth, optionalAuth });
const auditRoutes = setupAuditRoutes(server, models, { requireAuth, optionalAuth });
setupExportRoutes(server, models, { requireAuth, optionalAuth });

server._handleAuthLogin = authRoutes.handleLogin;
server._handleAuthLogout = authRoutes.handleLogout;
server._handleAuthVerify = authRoutes.handleVerify;
server._handleCertsList = certRoutes.handleList;
server._handleCertCreate = certRoutes.handleCreate;
server._handleCertGet = certRoutes.handleGet;
server._handleCertUpdate = certRoutes.handleUpdate;
server._handleCertRevoke = certRoutes.handleRevoke;
server._handleCertRestore = certRoutes.handleRestore;
server._handleCertSearch = certRoutes.handleSearch;
server._handleCertStats = certRoutes.handleStats;
server._handleVerify = verificationRoutes.handleVerify;
server._handleAuditList = auditRoutes.handleAuditList;
server._handleExport = setupExportRoutes.handler;

// Request handler
server.on("request", async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  applySecurityHeaders(res);
  applyCORS(res, config);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // Root endpoint
  if (pathname === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      name: "Advance Certificate Verification API",
      version: "2.0.0",
      status: "running",
    }));
  }

  // API routes
  if (pathname.startsWith("/api/")) {
    apiRateLimiter(req, res, () => {
      if (pathname === "/api/auth/login" && req.method === "POST") {
        return loginLimiter(req, res, () => {
          server._handleAuthLogin(req, res);
        });
      }
      if (pathname === "/api/auth/logout" && req.method === "POST") {
        return server._handleAuthLogout(req, res);
      }
      if (pathname === "/api/auth/verify" && req.method === "GET") {
        return server._handleAuthVerify(req, res);
      }

      if (pathname === "/api/certs" && req.method === "GET") {
        return optionalAuth(req, res, () => server._handleCertsList(req, res));
      }
      if (pathname === "/api/certs" && req.method === "POST") {
        return requireAuth(req, res, () => server._handleCertCreate(req, res));
      }
      if (pathname === "/api/certs/stats" && req.method === "GET") {
        return requireAuth(req, res, () => server._handleCertStats(req, res));
      }
      if (pathname === "/api/certs/search" && req.method === "GET") {
        return optionalAuth(req, res, () => server._handleCertSearch(req, res));
      }

      // Verify route must come BEFORE the :id pattern match
      if (pathname === "/api/certs/verify" && req.method === "GET") {
        return server._handleVerify(req, res);
      }

      const certMatch = pathname.match(/^\/api\/certs\/([^\/]+)$/);
      if (certMatch) {
        const id = certMatch[1];
        // Exclude verify endpoint from :id pattern
        if (id === "verify") {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "API endpoint not found" }));
        }
        if (req.method === "GET") {
          return optionalAuth(req, res, () => server._handleCertGet(req, res, id));
        }
        if (req.method === "PUT") {
          return requireAuth(req, res, () => server._handleCertUpdate(req, res, id));
        }
        if (req.method === "DELETE") {
          return requireAuth(req, res, () => server._handleCertRevoke(req, res, id));
        }
      }

      const certRestoreMatch = pathname.match(/^\/api\/certs\/([^\/]+)\/restore$/);
      if (certRestoreMatch && req.method === "POST") {
        return requireAuth(req, res, () => server._handleCertRestore(req, res, certRestoreMatch[1]));
      }

      if (pathname === "/api/audit" && req.method === "GET") {
        return requireAuth(req, res, () => server._handleAuditList(req, res));
      }

      if (pathname === "/api/export/csv" && req.method === "GET") {
        return requireAuth(req, res, () => server._handleExport(req, res));
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "API endpoint not found" }));
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  return res.end(JSON.stringify({ error: "Not found" }));
});

// Graceful shutdown
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});

// Start server
const PORT = config.PORT;
server.listen(PORT, async () => {
  try {
    await Admin.ensureDefaultAdmin();
    console.log("Advance Certificate Verification API running on http://localhost:" + PORT);
    console.log("Environment: " + config.NODE_ENV);
    console.log("Default admin username: " + config.ADMIN_USERNAME);
    if (!config.ADMIN_PASSWORD_HASH) {
      console.log("WARNING: No ADMIN_PASSWORD_HASH set. Using default password (change in production).");
    }
  } catch (err) {
    console.error("Failed to initialize admin:", err.message);
  }
});

module.exports = server;
