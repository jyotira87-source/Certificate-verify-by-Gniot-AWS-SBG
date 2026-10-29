"use strict";

const crypto = require("crypto");
const { auditLogs } = require("../storage");

/**
 * Audit Log Model
 * Append-only audit trail for administrative actions.
 * Records are protected against modification and deletion.
 */

const AuditLog = {
  /**
   * Add an audit log entry
   */
  add(action, actor, targetId, details = {}) {
    const logs = auditLogs.read();
    const entry = {
      id: crypto.randomUUID(),
      action,
      actor: actor || "system",
      targetId: targetId || null,
      timestamp: new Date().toISOString(),
      details,
    };
    logs.unshift(entry);
    auditLogs.write(logs);
    return entry;
  },

  /**
   * List audit logs with pagination
   */
  list({ page = 1, limit = 50, action, actor }) {
    let logs = auditLogs.read();

    if (action) logs = logs.filter((l) => l.action === action);
    if (actor) logs = logs.filter((l) => l.actor === actor);

    const total = logs.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const items = logs.slice(start, start + limit);

    return {
      items,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  },

  /**
   * Get a single audit log entry
   */
  getById(id) {
    const logs = auditLogs.read();
    return logs.find((l) => l.id === id) || null;
  },
};

module.exports = AuditLog;