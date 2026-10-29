export const validateCertificate = (data) => {
  const errors = {};
  if (!data.holderName || data.holderName.trim().length < 2) errors.holderName = "Holder name is required (minimum 2 characters)";
  if (!data.title || data.title.trim().length < 2) errors.title = "Certificate title is required";
  if (!data.issuingOrganization || data.issuingOrganization.trim().length < 2) errors.issuingOrganization = "Issuing organization is required";
  if (!data.issueDate) errors.issueDate = "Issue date is required";
  else if (isNaN(new Date(data.issueDate).getTime())) errors.issueDate = "Invalid issue date";
  if (data.expiryDate && isNaN(new Date(data.expiryDate).getTime())) errors.expiryDate = "Invalid expiry date";
  if (data.issueDate && data.expiryDate && new Date(data.expiryDate) < new Date(data.issueDate)) errors.expiryDate = "Expiry date cannot be before issue date";
  if (data.certificateCode && !/^[A-Z0-9\-]+$/.test(data.certificateCode)) errors.certificateCode = "Certificate ID must contain only uppercase letters, numbers, hyphens";
  if (data.metadata) { try { JSON.parse(data.metadata); } catch (e) { errors.metadata = "Invalid JSON format"; } }
  return { valid: Object.keys(errors).length === 0, errors };
};
export const validateVerificationCode = (code) => {
  if (!code || code.trim() === "") return { valid: false, error: "Certificate ID is required" };
  return { valid: true, code: code.trim().toUpperCase() };
};
