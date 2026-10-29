const assert = require("node:assert/strict");
const Certificate = require("../backend/models/Certificate.js");
const { validateCertificate } = require("../frontend/js/validation.js");

function testValidateCertificate() {
  const valid = validateCertificate({
    holderName: "Shashank Kumar",
    title: "AWS Cloud Foundations",
    issuingOrganization: "GNIOT",
    issueDate: "2026-06-01",
    certificateCode: "CODE-01",
  });
  assert.equal(valid.valid, true);

  const missingName = validateCertificate({
    holderName: "",
    title: "x",
    issuingOrganization: "x",
    issueDate: "2026-06-01",
    certificateCode: "x",
  });
  assert.equal(missingName.valid, false);
  assert.ok(missingName.errors.holderName);

  const badCode = validateCertificate({
    holderName: "x",
    title: "x",
    issuingOrganization: "x",
    issueDate: "2026-06-01",
    certificateCode: "invalid code!",
  });
  assert.equal(badCode.valid, false);
  assert.ok(badCode.errors.certificateCode);

  const badDates = validateCertificate({
    holderName: "x",
    title: "x",
    issuingOrganization: "x",
    issueDate: "2026-06-01",
    certificateCode: "X",
    expiryDate: "2020-01-01",
  });
  assert.equal(badDates.valid, false);
  assert.ok(badDates.errors.expiryDate);
}

function testCertificateModel() {
  assert.ok(Certificate);
  assert.ok(typeof Certificate.listAll === "function");
  assert.ok(typeof Certificate.findByCode === "function");
  assert.ok(typeof Certificate.create === "function");
  assert.ok(typeof Certificate.stats === "function");
  assert.ok(typeof Certificate.search === "function");
  assert.ok(typeof Certificate.revoke === "function");
  assert.ok(typeof Certificate.restore === "function");
}

function testStatsStructure() {
  const stats = Certificate.stats();
  assert.ok(typeof stats.total === "number");
  assert.ok(typeof stats.verified === "number");
  assert.ok(typeof stats.expired === "number");
  assert.ok(typeof stats.revoked === "number");
  assert.ok(typeof stats.pending === "number");
}

function run() {
  testValidateCertificate();
  testCertificateModel();
  testStatsStructure();
  console.log("All certificate tests passed.");
}

run();
