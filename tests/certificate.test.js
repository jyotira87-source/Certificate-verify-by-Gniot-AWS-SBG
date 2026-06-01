const assert = require("node:assert/strict");
const {
  normalizeCode,
  validateCertificateInput,
  addCertificateRecord,
  findByCode,
} = require("../script.js");

function testNormalizeCode() {
  assert.equal(normalizeCode(" gniot-aws-001 "), "GNIOT-AWS-001");
}

function testValidate() {
  const ok = validateCertificateInput({
    studentName: "Shashank",
    certificateTitle: "AWS Builder Workshop",
    issuer: "GNIOT",
    issueDate: "2026-06-01",
    certificateCode: "code-01",
  });
  assert.equal(ok.ok, true);

  const bad = validateCertificateInput({
    studentName: "",
    certificateTitle: "x",
    issuer: "x",
    issueDate: "2026-06-01",
    certificateCode: "x",
  });
  assert.equal(bad.ok, false);
}

function testAddAndFind() {
  const initial = [];
  const add1 = addCertificateRecord(initial, {
    studentName: "A",
    certificateTitle: "Cloud",
    issuer: "GNIOT",
    issueDate: "2026-06-01",
    certificateCode: "gniot-001",
  });
  assert.equal(add1.ok, true);
  assert.equal(add1.records.length, 1);

  const found = findByCode(add1.records, "GNIOT-001");
  assert.ok(found);
  assert.equal(found.studentName, "A");

  const duplicate = addCertificateRecord(add1.records, {
    studentName: "B",
    certificateTitle: "Cloud",
    issuer: "GNIOT",
    issueDate: "2026-06-01",
    certificateCode: "GNIOT-001",
  });
  assert.equal(duplicate.ok, false);
}

function run() {
  testNormalizeCode();
  testValidate();
  testAddAndFind();
  console.log("All certificate tests passed.");
}

run();