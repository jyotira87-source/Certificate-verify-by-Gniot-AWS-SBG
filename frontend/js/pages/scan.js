"use strict";

/**
 * Scan Page Logic
 * Camera capture, image upload, OCR review, verification workflow.
 */

const { showToast, showError, showSuccess, showInfo } = require("../../js/toast.js");
const { apiClient } = require("../../js/api-client.js");
const { startCamera, stopCamera, captureFrame, switchCamera, isCameraSupported, isSecureContext, handleCameraError } = require("../../js/camera.js");
const { extractText, isOCRAvailable, terminate } = require("../../js/ocr.js");
const { validateVerificationCode } = require("../../js/validation.js");

let capturedImage = null;
let ocrResult = null;

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("camera-start-btn");
  const captureBtn = document.getElementById("camera-capture-btn");
  const switchBtn = document.getElementById("camera-switch-btn");
  const video = document.getElementById("camera-video");
  const cameraView = document.getElementById("camera-view");
  const cameraNotSupported = document.getElementById("camera-not-supported");
  const cameraError = document.getElementById("camera-error");
  const fileInput = document.getElementById("file-input");
  const dropZone = document.getElementById("drop-zone");
  const preview = document.getElementById("upload-preview");
  const previewImage = document.getElementById("preview-image");
  const retakeBtn = document.getElementById("retake-btn");
  const submitBtn = document.getElementById("submit-image-btn");
  const ocrReviewSection = document.getElementById("ocr-review");

  // Camera support check
  if (!isCameraSupported()) {
    cameraNotSupported.style.display = "block";
  } else if (!isSecureContext() && window.location.protocol !== "http:") {
    // Camera requires HTTPS or localhost
    cameraNotSupported.style.display = "block";
    cameraNotSupported.querySelector("p").textContent =
      "Camera access requires HTTPS or localhost. Using upload instead.";
  }

  // Start camera
  if (startBtn && video) {
    startBtn.addEventListener("click", async () => {
      try {
        cameraError.style.display = "none";
        await startCamera(video);
        startBtn.style.display = "none";
        captureBtn.style.display = "inline-block";
        switchBtn.style.display = "inline-block";
        cameraView.style.display = "block";
        showSuccess("Camera started");
      } catch (err) {
        cameraError.textContent = err.message;
        cameraError.style.display = "block";
        showError(err.message);
      }
    });
  }

  // Switch camera
  if (switchBtn && video) {
    switchBtn.addEventListener("click", async () => {
      try {
        await switchCamera(video);
        showSuccess("Camera switched");
      } catch (err) {
        showError(err.message);
      }
    });
  }

  // Capture photo
  if (captureBtn && video) {
    captureBtn.addEventListener("click", () => {
      try {
        const dataUrl = captureFrame();
        capturedImage = dataUrl;
        previewImage.src = dataUrl;
        preview.style.display = "block";
        cameraView.style.display = "none";
        stopCamera();
        showSuccess("Photo captured");
      } catch (err) {
        showError(err.message);
      }
    });
  }

  // File upload
  if (dropZone && fileInput) {
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "var(--accent-primary)";
      dropZone.style.background = "rgba(59, 130, 246, 0.05)";
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.style.borderColor = "var(--border-color)";
      dropZone.style.background = "";
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "var(--border-color)";
      dropZone.style.background = "";
      const files = e.dataTransfer.files;
      if (files.length) handleFile(files[0]);
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length) handleFile(e.target.files[0]);
    });
  }

  // Retake
  if (retakeBtn) {
    retakeBtn.addEventListener("click", () => {
      capturedImage = null;
      preview.style.display = "none";
      document.getElementById("ocr-review-section").style.display = "none";
      if (cameraView) cameraView.style.display = "block";
      if (startBtn) startBtn.style.display = "inline-block";
    });
  }

  // Submit image for OCR + verification
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      if (!capturedImage) {
        showError("No image captured or uploaded");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Processing...";

      try {
        // Run OCR
        ocrResult = await extractText(capturedImage);

        if (!ocrResult.available) {
          showError(ocrResult.error || "OCR not available");
          // Proceed with manual entry using captured image
          showOcrReview(null);
        } else {
          showOcrReview(ocrResult);
        }

        showSuccess("Image processed");
      } catch (err) {
        showError(err.message);
        showOcrReview(null);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Review & Verify";
      }
    });
  }
});

function handleFile(file) {
  const maxSize = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSize) {
    showError("File too large. Maximum 10MB.");
    return;
  }

  const type = file.type;
  const isImage = type.startsWith("image/");
  const isPdf = type === "application/pdf";

  if (!isImage && !isPdf) {
    showError("Unsupported file type. Use JPG, PNG, or PDF.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    capturedImage = e.target.result;
    if (isImage) {
      previewImage.src = e.target.result;
      preview.style.display = "block";
    } else {
      previewImage.src = "";
      preview.style.display = "block";
      previewImage.style.display = "none";
      preview.innerHTML = `<p style="color:var(--text-secondary);">PDF uploaded: ${file.name}</p>`;
    }
    document.getElementById("camera-view").style.display = "none";
    document.getElementById("camera-start-btn").style.display = "none";
    showSuccess("File uploaded");
  };
  reader.readAsDataURL(file);
}

function showOcrReview(ocrData) {
  const section = document.getElementById("ocr-review-section");
  if (!section) return;

  let html = `
    <h3 style="font-size: var(--text-lg); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-4); color: var(--text-primary);">Review Extracted Information</h3>
    <p style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-4);">
      OCR extracted the following text. Please review and correct before verification.
      <strong>OCR is not proof of authenticity.</strong>
    </p>
  `;

  if (ocrData) {
    html += `
      <p style="font-size: var(--text-xs); color: var(--text-muted); margin-bottom: var(--space-4);">
        Confidence: ${ocrData.confidencePercent}%
      </p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
    `;

    const fields = [
      { key: "certificateNumber", label: "Certificate ID" },
      { key: "holderName", label: "Holder Name" },
      { key: "institution", label: "Institution" },
      { key: "qualification", label: "Qualification" },
      { key: "issueDate", label: "Issue Date" },
      { key: "expiryDate", label: "Expiry Date" },
    ];

    fields.forEach((f) => {
      const value = ocrData.fields[f.key] || "";
      html += `
        <div>
          <label style="font-size:var(--text-xs); color:var(--text-muted);">${f.label}</label>
          <input type="text" class="form-input" value="${escapeHtml(value)}" data-field="${f.key}" />
        </div>
      `;
    });

    html += `</div>`;
  } else {
    html += `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
        <div>
          <label style="font-size:var(--text-xs); color:var(--text-muted);">Certificate ID</label>
          <input type="text" class="form-input" data-field="certificateCode" />
        </div>
        <div>
          <label style="font-size:var(--text-xs); color:var(--text-muted);">Holder Name</label>
          <input type="text" class="form-input" data-field="holderName" />
        </div>
        <div>
          <label style="font-size:var(--text-xs); color:var(--text-muted);">Institution</label>
          <input type="text" class="form-input" data-field="issuingOrganization" />
        </div>
        <div>
          <label style="font-size:var(--text-xs); color:var(--text-muted);">Qualification</label>
          <input type="text" class="form-input" data-field="title" />
        </div>
      </div>
    `;
  }

  html += `
    <div style="margin-top: var(--space-6); display: flex; gap: var(--space-3);">
      <button type="button" class="btn btn-outline" id="ocr-cancel">Cancel</button>
      <button type="button" class="btn btn-primary" id="ocr-verify">Verify Certificate</button>
    </div>
  `;

  section.innerHTML = html;
  section.style.display = "block";

  document.getElementById("ocr-cancel").addEventListener("click", () => {
    section.style.display = "none";
    capturedImage = null;
    ocrResult = null;
  });

  document.getElementById("ocr-verify").addEventListener("click", async () => {
    const inputs = section.querySelectorAll("input");
    const formData = {};
    inputs.forEach((input) => {
      formData[input.dataset.field] = input.value.trim();
    });

    if (!formData.certificateCode) {
      showError("Certificate ID is required");
      return;
    }

    section.style.display = "none";

    try {
      const res = await apiClient.get(
        `/api/certs/verify?code=${encodeURIComponent(formData.certificateCode)}`
      );

      if (res.ok && res.data) {
        // Store OCR match info for display
        res.data.ocrMatch = ocrData ? compareOcrToRecord(ocrData, res.data.certificate) : null;
        window.location.href = `result.html?status=${encodeURIComponent(res.data.status)}&code=${encodeURIComponent(formData.certificateCode)}`;
      } else if (res.status === 404) {
        window.location.href = `result.html?status=not_found&code=${encodeURIComponent(formData.certificateCode)}`;
      }
    } catch (err) {
      if (err.status === 404) {
        window.location.href = `result.html?status=not_found&code=${encodeURIComponent(formData.certificateCode)}`;
      } else {
        showError(err.error || "Verification failed");
      }
    }
  });
}

function compareOcrToRecord(ocrData, record) {
  const mismatches = [];
  const fields = [
    { ocr: "holderName", record: "holderName", label: "Holder Name" },
    { ocr: "institution", record: "issuingOrganization", label: "Organization" },
    { ocr: "qualification", record: "title", label: "Title" },
  ];
  fields.forEach((f) => {
    const ocrVal = (ocrData.fields[f.ocr] || "").toLowerCase();
    const recVal = (record[f.record] || "").toLowerCase();
    if (ocrVal && recVal && ocrVal !== recVal) {
      mismatches.push(f.label);
    }
  });
  return mismatches.length > 0 ? mismatches : null;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
