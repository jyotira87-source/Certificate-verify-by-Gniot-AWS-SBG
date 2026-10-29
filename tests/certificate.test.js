const assert = require("node:assert/strict");
const {
  normalizeCode,
  validateCertificateInput,
  addCertificateRecord,
  findByCode,
  computeStatus,
  extractFieldsFromText,
  parseQrContent,
  generateCsv,
  escapeCsv,
} = require("../script.js");

function testNormalizeCode() {
  assert.equal(normalizeCode(" gniot-aws-001 "), "GNIOT-AWS-001");
  assert.equal(normalizeCode("code-01"), "CODE-01");
  assert.equal(normalizeCode(""), "");
}

function testValidate() {
  const ok = validateCertificateInput({
    studentName: "Shashank",
    certificateTitle: "AWS Builder Workshop",
    issuer: "GNIOT",
    issueDate: "2026-06-01",
    certificateCode: "code-01",
    addPassword: "AWSGOD11",
  });
  assert.equal(ok.ok, true);

  const bad = validateCertificateInput({
    studentName: "",
    certificateTitle: "x",
    issuer: "x",
    issueDate: "2026-06-01",
    certificateCode: "x",
    addPassword: "AWSGOD11",
  });
  assert.equal(bad.ok, false);

  const badPassword = validateCertificateInput({
    studentName: "Shashank",
    certificateTitle: "AWS Builder Workshop",
    issuer: "GNIOT",
    issueDate: "2026-06-01",
    certificateCode: "code-02",
    addPassword: "",
  });
  assert.equal(badPassword.ok, false);
  assert.equal(badPassword.error, "Add-certificate password is required.");
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

function testComputeStatus() {
  // Verified (no expiry)
  assert.equal(computeStatus({ status: 'verified', expiryDate: null }), 'verified');
  // Revoked
  assert.equal(computeStatus({ status: 'revoked', expiryDate: null }), 'revoked');
  // Expired
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);
  assert.equal(computeStatus({ status: 'verified', expiryDate: pastDate.toISOString().split('T')[0] }), 'expired');
  // Not found
  assert.equal(computeStatus(null), 'not_found');
}

function testExtractFields() {
  const text = "Certificate of Achievement\nAwarded to: John Doe\nCourse: Web Development\nIssued by: GNIOT\nCertificate ID: GNIOT-AWS-2026-001\nIssue Date: 01/06/2026";
  const fields = extractFieldsFromText(text);
  assert.equal(fields.certificateCode, 'GNIOT-AWS-2026-001');
  assert.ok(fields.studentName.length > 0 || fields.certificateTitle.length > 0);
}

function testParseQr() {
  assert.equal(parseQrContent('https://example.com/verify?code=TEST-001'), 'TEST-001');
  assert.equal(parseQrContent('TEST-002'), 'TEST-002');
  assert.equal(parseQrContent(''), null);
  assert.equal(parseQrContent(null), null);
}

function testCsvEscape() {
  assert.equal(escapeCsv('hello'), 'hello');
  assert.equal(escapeCsv('a,b'), '"a,b"');
  assert.equal(escapeCsv('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(escapeCsv('+cmd'), "'+cmd");
  assert.equal(escapeCsv('-cmd'), "'-cmd");
  assert.equal(escapeCsv('@cmd'), "'@cmd");
}

function testGenerateCsv() {
  const records = [{
    certificateCode: 'TEST-001',
    studentName: 'Alice',
    certificateTitle: 'Cloud Cert',
    issuer: 'GNIOT',
    issueDate: '2026-01-15',
    expiryDate: '2027-01-15',
    status: 'verified',
    createdAt: '2026-01-15T00:00:00.000Z',
  }];
  const csv = generateCsv(records);
  assert.ok(csv.includes('TEST-001'));
  assert.ok(csv.includes('Alice'));
  assert.ok(csv.includes('Certificate Code'));
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
}

function run() {
  testNormalizeCode();
  testValidate();
  testAddAndFind();
  testComputeStatus();
  testExtractFields();
  testParseQr();
  testCsvEscape();
  testGenerateCsv();
  console.log('All certificate tests passed.');
}

run();
