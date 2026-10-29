"use strict";

/**
 * Audit Log Routes
 * Admin-only access to audit trails.
 */

const setupAuditRoutes = (server, models, auth) => {
  const { AuditLog } = models;

  server._handleAuditList = async (req, res) => {
    try {
      if (!req.admin) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Authentication required" }));
      }

      const parsed = new URL(req.url, `http://${req.headers.host}`);
      const { page, limit, action, actor } = parsed.searchParams;

      const result = AuditLog.list({
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 50,
        action,
        actor,
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Failed to load audit logs" }));
    }
  };

  return { handleAuditList: server._handleAuditList.bind(server) };
};

module.exports = { setupAuditRoutes };