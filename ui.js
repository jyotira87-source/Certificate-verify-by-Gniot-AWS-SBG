(function () {
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : '';
  const C = (typeof CertificateApp !== 'undefined') ? CertificateApp : {};
  const showToast = (typeof globalThis.showToast === 'function') ? globalThis.showToast : (msg) => console.log(msg);
  const normalizeCode = (typeof globalThis.normalizeCode === 'function') ? globalThis.normalizeCode : (v) => String(v || '').trim().toUpperCase();
  const extractFieldsFromText = (typeof globalThis.extractFieldsFromText === 'function') ? globalThis.extractFieldsFromText : () => ({});
  const parseQrContent = (typeof globalThis.parseQrContent === 'function') ? globalThis.parseQrContent : () => null;
  const downloadCsv = (typeof globalThis.downloadCsv === 'function') ? globalThis.downloadCsv : () => {};
  const searchHistory = (typeof globalThis.searchHistory === 'function') ? globalThis.searchHistory : () => [];
  const readHistory = (typeof globalThis.readHistory === 'function') ? globalThis.readHistory : () => [];
  const addHistoryEntry = (typeof globalThis.addHistoryEntry === 'function') ? globalThis.addHistoryEntry : () => {};

  function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
  function loadScript(src) { return new Promise((resolve, reject) => { if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; } const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = reject; document.head.appendChild(s); }); }

  function closeAllPanels() {
    ['camera-panel', 'upload-panel', 'bulk-panel', 'history-panel'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    const ocrReview = document.getElementById('ocr-review'); if (ocrReview) ocrReview.style.display = 'none';
  }

  // ========== CAMERA SCANNER ==========
  let cameraStream = null, currentFacingMode = 'environment', capturedImage = null;
  const cameraPanel = document.getElementById('camera-panel');
  const cameraVideo = document.getElementById('camera-video');
  const cameraStartBtn = document.getElementById('camera-start-btn');
  const cameraCaptureBtn = document.getElementById('camera-capture-btn');
  const cameraSwitchBtn = document.getElementById('camera-switch-btn');
  const cameraCloseBtn = document.getElementById('camera-close-btn');
  const cameraError = document.getElementById('camera-error');
  const scanCameraBtn = document.getElementById('scan-camera-btn');

  if (scanCameraBtn && cameraPanel) scanCameraBtn.addEventListener('click', () => { closeAllPanels(); cameraPanel.style.display = 'block'; });
  if (cameraStartBtn) cameraStartBtn.addEventListener('click', async () => {
    try {
      if (cameraError) cameraError.style.display = 'none';
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: currentFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } } });
      if (cameraVideo) cameraVideo.srcObject = cameraStream;
      cameraStartBtn.style.display = 'none';
      if (cameraCaptureBtn) cameraCaptureBtn.style.display = 'inline-block';
      if (cameraSwitchBtn) cameraSwitchBtn.style.display = 'inline-block';
      showToast('Camera started', 'success');
    } catch (err) {
      if (cameraError) { cameraError.textContent = 'Camera access denied or unavailable. Use upload instead.'; cameraError.style.display = 'block'; }
      showToast('Camera access failed', 'error');
    }
  });
  if (cameraCaptureBtn) cameraCaptureBtn.addEventListener('click', () => {
    if (!cameraVideo) return;
    const canvas = document.createElement('canvas');
    canvas.width = cameraVideo.videoWidth || 640; canvas.height = cameraVideo.videoHeight || 480;
    canvas.getContext('2d').drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
    if (cameraVideo) cameraVideo.srcObject = null;
    if (cameraPanel) cameraPanel.style.display = 'none';
    processImage(dataUrl);
  });
  if (cameraSwitchBtn) cameraSwitchBtn.addEventListener('click', async () => {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
    if (cameraVideo) cameraVideo.srcObject = null;
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: currentFacingMode } });
      if (cameraVideo) cameraVideo.srcObject = cameraStream;
    } catch (err) { showToast('Could not switch camera', 'error'); }
  });
  if (cameraCloseBtn) cameraCloseBtn.addEventListener('click', () => {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
    if (cameraVideo) cameraVideo.srcObject = null;
    if (cameraPanel) cameraPanel.style.display = 'none';
    if (cameraStartBtn) cameraStartBtn.style.display = 'inline-block';
    if (cameraCaptureBtn) cameraCaptureBtn.style.display = 'none';
    if (cameraSwitchBtn) cameraSwitchBtn.style.display = 'none';
  });

  // ========== IMAGE UPLOAD ==========
  const uploadPanel = document.getElementById('upload-panel');
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadPreview = document.getElementById('upload-preview');
  const previewImage = document.getElementById('preview-image');
  const retakeBtn = document.getElementById('retake-btn');
  const processImageBtn = document.getElementById('process-image-btn');
  const uploadImageBtn = document.getElementById('upload-image-btn');

  if (uploadImageBtn && uploadPanel) uploadImageBtn.addEventListener('click', () => { closeAllPanels(); uploadPanel.style.display = 'block'; });
  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'rgba(34,211,238,0.8)'; });
    dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = '#334155'; });
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.style.borderColor = '#334155'; if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0]); });
  }
  function handleFile(file) {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) { showToast('File too large. Max 10MB.', 'error'); return; }
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) { showToast('Unsupported file type.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => { capturedImage = e.target.result; if (isImage && previewImage) { previewImage.src = e.target.result; previewImage.style.display = 'block'; } if (uploadPreview) uploadPreview.style.display = 'block'; showToast('File uploaded', 'success'); };
    reader.readAsDataURL(file);
  }
  function processImage(dataUrl) {
    capturedImage = dataUrl;
    if (previewImage) { previewImage.src = dataUrl; previewImage.style.display = 'block'; }
    if (uploadPreview) uploadPreview.style.display = 'block';
    if (uploadPanel) uploadPanel.style.display = 'block';
    runOcr(dataUrl);
  }
  async function runOcr(dataUrl) {
    const ocrReview = document.getElementById('ocr-review');
    if (!ocrReview) return;
    ocrReview.style.display = 'block';
    ocrReview.innerHTML = '<p class="result-meta">Processing image with OCR...</p>';
    if (typeof Tesseract === 'undefined') { try { await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'); } catch (e) { ocrReview.innerHTML = '<p class="result-meta">OCR library could not be loaded. Enter certificate code manually.</p>'; return; } }
    try {
      const result = await Tesseract.recognize(dataUrl, 'eng');
      const text = result.data.text || '';
      const confidence = Math.round(result.data.confidence || 0);
      const fields = extractFieldsFromText(text);
      ocrReview.innerHTML = '<p class="result-meta"><strong>OCR Confidence:</strong> ' + confidence + '%</p>' +
        '<p class="result-meta" style="font-size:0.8rem;color:#94a3b8;">Review and correct extracted fields before verifying.</p>' +
        '<div class="form-grid" style="margin-top:0.5rem;">' +
        '<label>Holder Name<input type="text" id="ocr-holder" value="' + escapeHtml(fields.studentName) + '" /></label>' +
        '<label>Certificate Title<input type="text" id="ocr-title" value="' + escapeHtml(fields.certificateTitle) + '" /></label>' +
        '<label>Issuer<input type="text" id="ocr-issuer" value="' + escapeHtml(fields.issuer) + '" /></label>' +
        '<label>Certificate Code<input type="text" id="ocr-code" value="' + escapeHtml(fields.certificateCode) + '" /></label>' +
        '<label>Issue Date<input type="text" id="ocr-issue" value="' + escapeHtml(fields.issueDate) + '" /></label>' +
        '<label>Expiry Date<input type="text" id="ocr-expiry" value="' + escapeHtml(fields.expiryDate) + '" /></label>' +
        '</div>' +
        '<div style="margin-top:0.75rem;display:flex;gap:0.5rem;flex-wrap:wrap;">' +
        '<button class="code-badge" id="ocr-verify-btn" style="cursor:pointer;border:none;" type="button">Verify Extracted Code</button>' +
        '<button class="code-badge" id="ocr-cancel-btn" style="cursor:pointer;border:none;" type="button">Cancel</button>' +
        '</div>';
      const ocrVerifyBtn = document.getElementById('ocr-verify-btn');
      const ocrCancelBtn = document.getElementById('ocr-cancel-btn');
      if (ocrVerifyBtn) ocrVerifyBtn.addEventListener('click', () => {
        const code = document.getElementById('ocr-code').value.trim();
        if (code) { const vi = document.getElementById('verify-code'); if (vi) vi.value = code; ocrReview.style.display = 'none'; const vf = document.getElementById('verify-form'); if (vf) vf.dispatchEvent(new Event('submit')); }
        else showToast('No certificate code extracted. Enter manually.', 'warning');
      });
      if (ocrCancelBtn) ocrCancelBtn.addEventListener('click', () => { ocrReview.style.display = 'none'; });
    } catch (err) { ocrReview.innerHTML = '<p class="result-meta">OCR processing failed. Enter certificate code manually.</p>'; showToast('OCR failed: ' + err.message, 'error'); }
  }
  if (processImageBtn) processImageBtn.addEventListener('click', () => { if (capturedImage) processImage(capturedImage); else showToast('No image to process', 'warning'); });
  if (retakeBtn) retakeBtn.addEventListener('click', () => { capturedImage = null; if (uploadPreview) uploadPreview.style.display = 'none'; if (previewImage) previewImage.style.display = 'none'; if (fileInput) fileInput.value = ''; const or = document.getElementById('ocr-review'); if (or) or.style.display = 'none'; });

  // ========== BULK PROCESSING ==========
  const bulkPanel = document.getElementById('bulk-panel');
  const bulkVerifyBtn = document.getElementById('bulk-verify-btn');
  const bulkDropZone = document.getElementById('bulk-drop-zone');
  const bulkFileInput = document.getElementById('bulk-file-input');
  const bulkSearch = document.getElementById('bulk-search');
  const bulkFilter = document.getElementById('bulk-filter');
  const bulkProgress = document.getElementById('bulk-progress');
  const bulkQueue = document.getElementById('bulk-queue');
  const bulkExportBtn = document.getElementById('bulk-export-btn');
  const bulkClearBtn = document.getElementById('bulk-clear-btn');
  let bulkItems = [];
  if (bulkVerifyBtn && bulkPanel) bulkVerifyBtn.addEventListener('click', () => { closeAllPanels(); bulkPanel.style.display = 'block'; });
  if (bulkDropZone && bulkFileInput) { bulkDropZone.addEventListener('click', () => bulkFileInput.click()); bulkFileInput.addEventListener('change', (e) => { if (e.target.files.length) addBulkFiles(Array.from(e.target.files)); }); }
  function addBulkFiles(files) { for (const file of files) bulkItems.push({ id: Date.now() + Math.random(), file: file, status: 'pending', code: '', error: '', result: null }); renderBulkQueue(); processBulkQueue(); }
  async function processBulkQueue() {
    const concurrency = 2; let active = 0;
    const processNext = async () => {
      while (active < concurrency) {
        const item = bulkItems.find(i => i.status === 'pending');
        if (!item) break;
        active++; item.status = 'processing'; renderBulkQueue();
        try {
          const dataUrl = await readFileAsDataUrl(item.file);
          let code = '';
          if (typeof Tesseract !== 'undefined') { try { const result = await Tesseract.recognize(dataUrl, 'eng'); const fields = extractFieldsFromText(result.data.text || ''); code = fields.certificateCode; } catch (e) {} }
          if (!code) { const nameMatch = item.file.name.match(/[A-Z0-9\-]{5,}/i); if (nameMatch) code = normalizeCode(nameMatch[0]); }
          item.code = code;
          if (code) {
            try { const res = await fetch(API_BASE + '/api/certs/verify?code=' + encodeURIComponent(code)); if (res.ok) { item.status = 'verified'; item.result = await res.json(); } else { item.status = 'not_found'; } } catch (e) { item.status = 'failed'; item.error = 'Network error'; }
          } else { item.status = 'failed'; item.error = 'No certificate code found'; }
        } catch (err) { item.status = 'failed'; item.error = err.message || 'Processing failed'; }
        active--; renderBulkQueue(); updateBulkProgress(); processNext();
      }
    };
    processNext();
  }
  function readFileAsDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
  function renderBulkQueue() {
    if (!bulkQueue) return;
    const filter = bulkFilter ? bulkFilter.value : 'all';
    const search = bulkSearch ? bulkSearch.value.toLowerCase() : '';
    let items = bulkItems;
    if (filter !== 'all') items = items.filter(i => i.status === filter);
    if (search) items = items.filter(i => i.file.name.toLowerCase().includes(search) || i.code.toLowerCase().includes(search));
    bulkQueue.innerHTML = items.map(item =>
      '<div class="list-item" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">' +
      '<div style="flex:1;min-width:0;">' +
      '<p style="margin:0;font-size:0.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + item.file.name + '</p>' +
      '<p style="margin:0.2rem 0 0;font-size:0.75rem;color:#94a3b8;">' + (item.code || '—') + ' • ' + item.status + '</p>' +
      (item.error ? '<p style="margin:0.2rem 0 0;font-size:0.75rem;color:#e11d48;">' + item.error + '</p>' : '') +
      '</div>' +
      '<div style="display:flex;gap:0.3rem;">' +
      (item.status === 'failed' ? '<button class="code-badge" style="cursor:pointer;border:none;font-size:0.7rem;" onclick="retryBulkItem(' + item.id + ')">Retry</button>' : '') +
      '<button class="code-badge" style="cursor:pointer;border:none;font-size:0.7rem;" onclick="removeBulkItem(' + item.id + ')">Remove</button>' +
      '</div></div>'
    ).join('') || '<p class="empty-note">No files in queue.</p>';
    updateBulkProgress();
  }
  function updateBulkProgress() {
    if (!bulkProgress) return;
    const total = bulkItems.length;
    const processed = bulkItems.filter(i => i.status === 'verified' || i.status === 'not_found' || i.status === 'failed').length;
    const verified = bulkItems.filter(i => i.status === 'verified').length;
    const failed = bulkItems.filter(i => i.status === 'failed').length;
    bulkProgress.textContent = 'Processed: ' + processed + '/' + total + ' • Verified: ' + verified + ' • Failed: ' + failed + ' • Remaining: ' + (total - processed);
  }
  window.retryBulkItem = (id) => { const item = bulkItems.find(i => i.id === id); if (item) { item.status = 'pending'; item.error = ''; renderBulkQueue(); processBulkQueue(); } };
  window.removeBulkItem = (id) => { bulkItems = bulkItems.filter(i => i.id !== id); renderBulkQueue(); };
  if (bulkSearch) bulkSearch.addEventListener('input', () => renderBulkQueue());
  if (bulkFilter) bulkFilter.addEventListener('change', () => renderBulkQueue());
  if (bulkExportBtn) bulkExportBtn.addEventListener('click', () => {
    const completed = bulkItems.filter(i => i.status === 'verified' || i.status === 'not_found');
    if (!completed.length) { showToast('No completed results to export', 'warning'); return; }
    const records = completed.map(i => ({ certificateCode: i.code, studentName: i.result && i.result.certificate ? i.result.certificate.studentName : '', certificateTitle: i.result && i.result.certificate ? i.result.certificate.certificateTitle : '', issuer: i.result && i.result.certificate ? i.result.certificate.issuer : '', issueDate: i.result && i.result.certificate ? i.result.certificate.issueDate : '', expiryDate: i.result && i.result.certificate ? i.result.certificate.expiryDate : '', status: i.status, createdAt: new Date().toISOString() }));
    downloadCsv(records, 'bulk-verification-results.csv');
    showToast('CSV exported', 'success');
  });
  if (bulkClearBtn) bulkClearBtn.addEventListener('click', () => { if (!confirm('Clear all bulk queue items?')) return; bulkItems = []; renderBulkQueue(); showToast('Bulk queue cleared', 'info'); });

  // ========== HISTORY ==========
  const historyPanel = document.getElementById('history-panel');
  const historyBtn = document.getElementById('history-btn');
  const historySearch = document.getElementById('history-search');
  const historyFilter = document.getElementById('history-filter');
  const historyList = document.getElementById('history-list');
  const historyClearBtn = document.getElementById('history-clear-btn');
  if (historyBtn && historyPanel) historyBtn.addEventListener('click', () => { closeAllPanels(); historyPanel.style.display = 'block'; renderHistory(); });
  function renderHistory() {
    if (!historyList) return;
    const query = historySearch ? historySearch.value : '';
    const filter = historyFilter ? historyFilter.value : 'all';
    const history = searchHistory(query, filter);
    if (!history.length) { historyList.innerHTML = '<p class="empty-note">No verification history yet.</p>'; return; }
    historyList.innerHTML = history.map(h =>
      '<div class="list-item" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">' +
      '<div><p style="margin:0;font-size:0.85rem;font-weight:600;">' + h.code + '</p>' +
      '<p style="margin:0.2rem 0 0;font-size:0.75rem;color:#94a3b8;">' + (h.holderName || h.title || '—') + ' • ' + new Date(h.timestamp).toLocaleString() + '</p></div>' +
      '<span class="code-badge" style="font-size:0.7rem;">' + h.result.toUpperCase() + '</span></div>'
    ).join('');
  }
  if (historySearch) historySearch.addEventListener('input', () => renderHistory());
  if (historyFilter) historyFilter.addEventListener('change', () => renderHistory());
  if (historyClearBtn) historyClearBtn.addEventListener('click', () => { if (!confirm('Clear all verification history?')) return; localStorage.removeItem('acv_history_v1'); renderHistory(); showToast('History cleared', 'info'); });

  // ========== QUICK ACTIONS ==========
  const verifyCodeInput = document.getElementById('verify-code');
  if (verifyCodeInput) verifyCodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const vf = document.getElementById('verify-form'); if (vf) vf.dispatchEvent(new Event('submit')); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeAllPanels(); if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; } if (cameraVideo) cameraVideo.srcObject = null; } });

  // ========== DOWNLOAD REPORT ==========
  // Print report is handled via window.print() in verification result


})();
