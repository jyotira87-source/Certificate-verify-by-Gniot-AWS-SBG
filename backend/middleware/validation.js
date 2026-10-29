"use strict";

/**
 * Input Validation Middleware
 * Server-side validation for all API inputs.
 */

const sanitizeString = (value) => {
  if (typeof value !== "string") return "";
  return value.replace(/[<>&'"]/g, (char) => {
    const entities = { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&#39;", '"': "&quot;" };
    return entities[char] || char;
  });
};

const validateCertificateInput = (body) => {
  const errors = [];

  const holderName = sanitizeString(body.holderName || "").trim();
  const title = sanitizeString(body.title || "").trim();
  const issuingOrganization = sanitizeString(body.issuingOrganization || "").trim();
  const certificateCode = sanitizeString(body.certificateCode || "").trim().toUpperCase();
  const issueDate = body.issueDate;
  const expiryDate = body.expiryDate;

  if (!holderName || holderName.length < 2) {
    errors.push("Holder name is required (minimum 2 characters)");
  }
  if (!title || title.length < 2) {
    errors.push("Certificate title is required (minimum 2 characters)");
  }
  if (!issuingOrganization || issuingOrganization.length < 2) {
    errors.push("Issuing organization is required (minimum 2 characters)");
  }
  if (!certificateCode) {
    errors.push("Certificate code is required");
  } else if (!/^[A-Z0-9\-]+$/.test(certificateCode)) {
    errors.push("Certificate code must contain only uppercase letters, numbers, and hyphens");
  }
  if (!issueDate || isNaN(new Date(issueDate).getTime())) {
    errors.push("Valid issue date is required");
  }
  if (expiryDate && isNaN(new Date(expiryDate).getTime())) {
    errors.push("Valid expiry date is required");
  }
  if (issueDate && expiryDate && new Date(expiryDate) < new Date(issueDate)) {
    errors.push("Expiry date cannot be before issue date");
  }

  return {
    valid: errors.length === 0,
    errors,
    data: { holderName, title, issuingOrganization, certificateCode, issueDate, expiryDate },
  };
};

const validateVerificationCode = (code) => {
  if (!code || String(code).trim() === "") {
    return { valid: false, error: "Verification code is required" };
  }
  return { valid: true, code: String(code).trim().toUpperCase() };
};

const validatePagination = (page, limit) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return { page: p, limit: l };
};

module.exports = {
  sanitizeString,
  validateCertificateInput,
  validateVerificationCode,
  validatePagination,
};