"use strict";

const crypto = require("crypto");
const { certificates } = require("../storage");

const STATUS_VERIFIED = "verified";
const STATUS_EXPIRED = "expired";
const STATUS_REVOKED = "revoked";
const STATUS_PENDING = "pending_review";
const VALID_STATUSES = [STATUS_VERIFIED, STATUS_EXPIRED, STATUS_REVOKED, STATUS_PENDING];

const normalizeCode = (code) => String(code || "").trim().toUpperCase();
const generateId = () => crypto.randomUUID();

const computeStatus = (record) => {
  if (record.status === STATUS_REVOKED) return STATUS_REVOKED;
  if (record.expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(record.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    if (expiry < today) return STATUS_EXPIRED;
  }
  return record.status || STATUS_VERIFIED;
};

const Certificate = {
  listAll() {
    return certificates.read().map((r) => ({ ...r, computedStatus: computeStatus(r) }));
  },

  getById(id) {
    const records = certificates.read();
    return records.find((r) => r.id === id) || null;
  },

  findByCode(code) {
    const norm = normalizeCode(code);
    if (!norm) return null;
    const records = certificates.read();
    return records.find((r) => normalizeCode(r.certificateCode) === norm) || null;
  },

  create(data) {
    const records = certificates.read();

    const required = ["holderName", "title", "issuingOrganization", "issueDate", "certificateCode"];
    for (const field of required) {
      if (!data[field] || String(data[field]).trim() === "") {
        throw { status: 400, error: `Missing required field: ${field}` };
      }
    }

    const normCode = normalizeCode(data.certificateCode);
    if (records.some((r) => normalizeCode(r.certificateCode) === normCode)) {
      throw { status: 409, error: "Certificate code already exists" };
    }

    if (data.expiryDate) {
      const issue = new Date(data.issueDate);
      const expiry = new Date(data.expiryDate);
      if (expiry < issue) {
        throw { status: 400, error: "Expiry date cannot be before issue date" };
      }
    }

    const record = {
      id: generateId(),
      certificateCode: normCode,
      holderName: String(data.holderName).trim(),
      title: String(data.title).trim(),
      issuingOrganization: String(data.issuingOrganization).trim(),
      issueDate: data.issueDate,
      expiryDate: data.expiryDate || null,
      status: data.status || STATUS_VERIFIED,
      metadata: data.metadata || {},
      revisionNote: data.revisionNote || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      qrUrl: null,
    };

    records.unshift(record);
    certificates.write(records);
    return { ...record, computedStatus: computeStatus(record) };
  },

  update(id, updates, actor) {
    const records = certificates.read();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) {
      throw { status: 404, error: "Certificate not found" };
    }

    const record = records[index];
    const allowedFields = ["title", "issuingOrganization", "issueDate", "expiryDate", "status", "metadata", "revisionNote"];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        record[field] = updates[field];
      }
    }

    record.updatedAt = new Date().toISOString();
    records[index] = record;
    certificates.write(records);

    const { AuditLog } = require("./AuditLog");
    AuditLog.add("certificate_updated", actor, id, { changes: Object.keys(updates) });

    return { ...record, computedStatus: computeStatus(record) };
  },

  revoke(id, actor, reason) {
    const records = certificates.read();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) {
      throw { status: 404, error: "Certificate not found" };
    }

    records[index].status = STATUS_REVOKED;
    records[index].updatedAt = new Date().toISOString();
    if (reason) records[index].revisionNote = reason;
    certificates.write(records);

    const { AuditLog } = require("./AuditLog");
    AuditLog.add("certificate_revoked", actor, id, { reason });

    return { ...records[index], computedStatus: computeStatus(records[index]) };
  },

  restore(id, actor) {
    const records = certificates.read();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) {
      throw { status: 404, error: "Certificate not found" };
    }

    records[index].status = STATUS_VERIFIED;
    records[index].updatedAt = new Date().toISOString();
    certificates.write(records);

    const { AuditLog } = require("./AuditLog");
    AuditLog.add("certificate_restored", actor, id);

    return { ...records[index], computedStatus: computeStatus(records[index]) };
  },

  search({ query, status, sortBy = "createdAt", sortOrder = "desc", page = 1, limit = 20 }) {
    let records = certificates.read().map((r) => ({ ...r, computedStatus: computeStatus(r) }));

    if (query) {
      const q = query.toLowerCase();
      records = records.filter(
        (r) =>
          r.certificateCode.toLowerCase().includes(q) ||
          r.holderName.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.issuingOrganization.toLowerCase().includes(q)
      );
    }

    if (status && VALID_STATUSES.includes(status)) {
      records = records.filter((r) => r.computedStatus === status);
    }

    records.sort((a, b) => {
      const aVal = a[sortBy] || "";
      const bVal = b[sortBy] || "";
      if (sortOrder === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });

    const total = records.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const items = records.slice(start, start + limit);

    return {
      items,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  },

  stats() {
    const records = certificates.read().map((r) => computeStatus(r));
    return {
      total: records.length,
      verified: records.filter((s) => s === STATUS_VERIFIED).length,
      expired: records.filter((s) => s === STATUS_EXPIRED).length,
      revoked: records.filter((s) => s === STATUS_REVOKED).length,
      pending: records.filter((s) => s === STATUS_PENDING).length,
    };
  },
};

module.exports = Certificate;