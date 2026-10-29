"use strict";

/**
 * Export Routes
 * CSV export of certificate metadata (admin only).
 */

const setupExportRoutes = (server, models, auth) => {
  const { Certificate } = models;

  // Sanitize CSV values to prevent formula injection
  const sanitizeCsv = (value) => {
    const str = String(value || "");
    if (/^[=+-@]/.test(str)) {
      return "'" + str;
    }
    return str;
  };

  const escapeCsv = (value) => {
    const str = sanitizeCsv(String(value || ""));
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  setupExportRoutes.handler = async (req, res) => {
    try {
      if (!req.admin) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Authentication required" }));
      }

      const records = Certificate.listAll();
      const headers = [
        "Certificate Code",
        "Holder Name",
        "Title",
        "Issuing Organization",
        "Issue Date",
        "Expiry Date",
        "Status",
        "Created At",
      ];

      const lines = [headers.map(escapeCsv).join(",")];
      for (const record of records) {
        lines.push([
          record.certificateCode,
          record.holderName,
          record.title,
          record.issuingOrganization,
          record.issueDate,
          record.expiryDate || "",
          record.computedStatus || record.status,
          record.createdAt,
        ].map(escapeCsv).join(","));
      }

      res.writeHead(200, {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="certificates.csv"',
      });
      return res.end(lines.join("\n"));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Export failed" }));
    }
  };

  return { handleExport: setupExportRoutes.handler };
};

module.exports = { setupExportRoutes };