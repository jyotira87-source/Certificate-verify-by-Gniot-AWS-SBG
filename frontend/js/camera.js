let stream = null; let currentCameraId = null; let videoElement = null;
export const getCameras = async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === "videoinput");
};
export const startCamera = (videoElem, cameraId = null) => new Promise((resolve, reject) => {
  videoElement = videoElem;
  const constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: cameraId ? undefined : "environment", ...(cameraId ? { deviceId: { exact: cameraId } } : {}) } };
  navigator.mediaDevices.getUserMedia(constraints)
    .then((mediaStream) => { stream = mediaStream; if (cameraId) currentCameraId = cameraId; videoElem.srcObject = stream; videoElem.play(); resolve(stream); })
    .catch((err) => reject(handleCameraError(err)));
});
export const stopCamera = () => { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } if (videoElement) { videoElement.srcObject = null; videoElement = null; } currentCameraId = null; };
export const captureFrame = () => { if (!videoElement || !stream) throw new Error("Camera not active"); const canvas = document.createElement("canvas"); canvas.width = videoElement.videoWidth || 640; canvas.height = videoElement.videoHeight || 480; canvas.getContext("2d").drawImage(videoElement, 0, 0, canvas.width, canvas.height); return canvas.toDataURL("image/jpeg", 0.9); };
export const switchCamera = async (videoElem) => {
  const cameras = await getCameras();
  if (cameras.length < 2) return currentCameraId;
  const nextId = currentCameraId ? cameras.find((c) => c.deviceId !== currentCameraId)?.deviceId : cameras.find((c) => c.facingMode === "user")?.deviceId || cameras[1]?.deviceId;
  stopCamera(); await startCamera(videoElem, nextId); return nextId;
};
export const handleCameraError = (err) => {
  if (err.name === "NotAllowedError") return new Error("Camera access was denied. Please allow camera access in your browser settings.");
  if (err.name === "NotFoundError") return new Error("No camera found on this device.");
  if (err.name === "NotSupportedError") return new Error("Camera access is not supported on this browser.");
  if (err.name === "TypeError" || err.message.includes("secure context")) return new Error("Camera access requires a secure context (HTTPS or localhost).");
  return new Error(`Camera error: ${err.message}`);
};
export const isCameraSupported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
export const isSecureContext = () => typeof window !== "undefined" && window.isSecureContext;
