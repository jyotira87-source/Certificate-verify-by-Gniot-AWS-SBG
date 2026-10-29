"use strict";

/**
 * Verification Routes
 * Public certificate verification endpoint.
 */

const setupVerificationRoutes = (server, models, auth) => {
  const { Certificate, VerificationLog } = models;

  server._handleVerify = async (req, res) => {
    try {
      const parsed = new URL(req.url, `http://${req.headers.host}`);
      const code = parsed.searchParams.get("code") || parsed.searchParams.get("q");

      if (!code) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Verification code is required" }));
      }

      const normCode = String(code).trim().toUpperCase();
      const record = Certificate.findByCode(normCode);
      const actor = req.admin ? req.admin.id : "public";

      if (!record) {
        // Record not found - not fraudulent, just not in registry
        VerificationLog.add({
          certificateId: null,
          code: normCode,
          outcome: "not_found",
          eventType: "manual",
          actor,
        });

        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({
          status: "not_found",
          message: "Certificate not found in registry",
          code: normCode,
          timestamp: new Date().toISOString(),
        }));
      }

      const computedStatus = (() => {
        if (record.status === "revoked") return "revoked";
        if (record.expiryDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const expiry = new Date(record.expiryDate);
          expiry.setHours(0, 0, 0, 0);
          if (expiry < today) return "expired";
        }
        return record.status || "verified";
      })();

      const publicUrl = `${process.env.PUBLIC_URL || "http://localhost:4000"}/verify.html?code=${encodeURIComponent(normCode)}`;

      VerificationLog.add({
        certificateId: record.id,
        code: normCode,
        outcome: computedStatus,
        eventType: "manual",
        actor,
        metadata: { status: record.status, hasExpiry: !!record.expiryDate },
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({
        status: computedStatus,
        certificate: {
          id: record.id,
          certificateCode: record.certificateCode,
          holderName: record.holderName,
          title: record.title,
          issuingOrganization: record.issuingOrganization,
          issueDate: record.issueDate,
          expiryDate: record.expiryDate,
          status: record.status,
          createdAt: record.createdAt,
        },
        verificationUrl: publicUrl,
        timestamp: new Date().toISOString(),
      }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Verification failed" }));
    }
  };

  return { handleVerify: server._handleVerify.bind(server) };
};

module.exports = { setupVerificationRoutes };