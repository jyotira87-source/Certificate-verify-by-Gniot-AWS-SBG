"use strict";

const { Certificate } = require("../models");

const setupCertRoutes = (server, models, auth, validation) => {
  const { Certificate } = models;

  const handleList = async (req, res) => {
    try {
      const records = Certificate.listAll();
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(records));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Failed to load certificates" }));
    }
  };

  const handleCreate = async (req, res) => {
    try {
      if (!req.admin) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Authentication required" }));
      }
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const payload = JSON.parse(body || "{}");
          const result = validation.validateCertificateInput(payload);
          if (!result.valid) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: result.errors.join(", ") }));
          }
          const record = Certificate.create({
            ...result.data,
            metadata: payload.metadata || {},
          });
          res.writeHead(201, { "Content-Type": "application/json" });
          return res.end(JSON.stringify(record));
        } catch (err) {
          const status = err.status || 500;
          res.writeHead(status, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: err.error || "Failed to create certificate" }));
        }
      });
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Failed to create certificate" }));
    }
  };

  const handleGet = async (req, res, id) => {
    try {
      const record = Certificate.getById(id);
      if (!record) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Certificate not found" }));
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(record));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Failed to load certificate" }));
    }
  };

  const handleUpdate = async (req, res, id) => {
    try {
      if (!req.admin) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Authentication required" }));
      }
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const updates = JSON.parse(body || "{}");
          const record = Certificate.update(id, updates, req.admin.id);
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify(record));
        } catch (err) {
          const status = err.status || 500;
          res.writeHead(status, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: err.error || "Failed to update certificate" }));
        }
      });
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Failed to update certificate" }));
    }
  };

  const handleRevoke = async (req, res, id) => {
    try {
      if (!req.admin) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Authentication required" }));
      }
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const payload = JSON.parse(body || "{}");
          const record = Certificate.revoke(id, req.admin.id, payload.reason);
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify(record));
        } catch (err) {
          const status = err.status || 500;
          res.writeHead(status, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: err.error || "Failed to revoke certificate" }));
        }
      });
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Failed to revoke certificate" }));
    }
  };

  const handleRestore = async (req, res, id) => {
    try {
      if (!req.admin) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Authentication required" }));
      }
      const record = Certificate.restore(id, req.admin.id);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(record));
    } catch (err) {
      const status = err.status || 500;
      res.writeHead(status, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: err.error || "Failed to restore certificate" }));
    }
  };

  const handleSearch = async (req, res) => {
    try {
      const parsed = new URL(req.url, `http://${req.headers.host}`);
      const { query, status, sortBy, sortOrder, page, limit } = parsed.searchParams;
      const { page: p, limit: l } = validation.validatePagination(page, limit);

      const result = Certificate.search({
        query,
        status,
        sortBy,
        sortOrder,
        page: p,
        limit: l,
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Search failed" }));
    }
  };

  const handleStats = async (req, res) => {
    try {
      const stats = Certificate.stats();
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(stats));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Failed to load statistics" }));
    }
  };

  return {
    handleList,
    handleCreate,
    handleGet,
    handleUpdate,
    handleRevoke,
    handleRestore,
    handleSearch,
    handleStats,
  };
};

module.exports = { setupCertRoutes };
