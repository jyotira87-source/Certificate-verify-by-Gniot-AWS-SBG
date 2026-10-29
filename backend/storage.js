"use strict";

const fs = require("fs");
const path = require("path");
const config = require("./config");

/**
 * Atomic JSON file storage with file locking simulation.
 * Ensures safe concurrent writes by writing to a temp file then renaming.
 */

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const readJsonFile = (filePath, defaultValue = []) => {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw || raw.trim() === "") {
      return defaultValue;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(defaultValue) && !Array.isArray(parsed)
      ? defaultValue
      : parsed;
  } catch (err) {
    // If file is corrupted, return default rather than crashing
    return defaultValue;
  }
};

const writeJsonFile = (filePath, data) => {
  ensureDir(path.dirname(filePath));
  const tmpFile = filePath + ".tmp." + process.pid;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmpFile, filePath);
};

const readAll = (filePath, defaultValue) => readJsonFile(filePath, defaultValue);
const writeAll = (filePath, data) => writeJsonFile(filePath, data);

// Collection wrappers
const certificates = {
  file: config.DB_FILE,
  read: () => readAll(config.DB_FILE, []),
  write: (data) => writeAll(config.DB_FILE, data),
};

const auditLogs = {
  file: config.AUDIT_FILE,
  read: () => readAll(config.AUDIT_FILE, []),
  write: (data) => writeAll(config.AUDIT_FILE, data),
};

const verificationLogs = {
  file: config.VERIFICATION_LOG_FILE,
  read: () => readAll(config.VERIFICATION_LOG_FILE, []),
  write: (data) => writeAll(config.VERIFICATION_LOG_FILE, data),
};

const admins = {
  file: path.join(config.DATA_DIR, "admins.json"),
  read: () => readAll(path.join(config.DATA_DIR, "admins.json"), []),
  write: (data) => writeAll(path.join(config.DATA_DIR, "admins.json"), data),
};

module.exports = {
  readJsonFile,
  writeJsonFile,
  certificates,
  auditLogs,
  verificationLogs,
  admins,
};