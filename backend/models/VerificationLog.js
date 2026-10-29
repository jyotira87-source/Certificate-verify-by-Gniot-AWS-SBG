"use strict";

const crypto = require("crypto");
const { verificationLogs } = require("../storage");

/**
 * Verification Log Model
 * Records verification attempts for audit and history.
 */

const VerificationLog = {
  /**
   * Record a verification attempt
   */
  add({ certificateId, code, outcome, eventType, actor, metadata = {} }) {
    const logs = verificationLogs.read();
    const entry = {
      id: crypto.randomUUID(),
      certificateId: certificateId || null,
      code: code || null,
      timestamp: new Date().toISOString(),
      outcome,
      eventType: eventType || "manual",
      actor: actor || "public",
      metadata,
    };
    logs.unshift(entry);
    verificationLogs.write(logs);
    return entry;
  },

  /**
   * List verification logs with pagination
   */
  list({ page = 1, limit = 50, outcome, eventType }) {
    let logs = verificationLogs.read();

    if (outcome) logs = logs.filter((l) => l.outcome === outcome);
    if (eventType) logs = logs.filter((l) => l.eventType === eventType);

    const total = logs.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const items = logs.slice(start, start + limit);

    return {
      items,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  },
};

module.exports = VerificationLog;