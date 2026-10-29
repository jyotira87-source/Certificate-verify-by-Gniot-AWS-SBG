"use strict";

const bcrypt = require("bcryptjs");
const { admins } = require("../storage");
const config = require("../config");

/**
 * Admin Model
 * Handles administrator authentication and authorization.
 */

const Admin = {
  /**
   * Create the default admin if none exists
   */
  async ensureDefaultAdmin() {
    const existing = admins.read();
    if (existing.length > 0) return existing[0];

    const admin = {
      id: require("crypto").randomUUID(),
      username: config.ADMIN_USERNAME || "admin",
      passwordHash: config.ADMIN_PASSWORD_HASH || await bcrypt.hash("admin123", config.BCRYPT_SALT_ROUNDS),
      role: "super_admin",
      createdAt: new Date().toISOString(),
    };
    admins.write([admin]);
    return admin;
  },

  /**
   * Find admin by username
   */
  findByUsername(username) {
    const list = admins.read();
    return list.find((a) => a.username === username) || null;
  },

  /**
   * Verify password against hash
   */
  async verifyPassword(admin, plainPassword) {
    if (!admin.passwordHash) return false;
    return bcrypt.compare(plainPassword, admin.passwordHash);
  },

  /**
   * Create a new admin
   */
  async create(username, password, role = "admin") {
    const list = admins.read();
    if (list.some((a) => a.username === username)) {
      throw { status: 409, error: "Admin username already exists" };
    }

    const passwordHash = await bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);
    const admin = {
      id: require("crypto").randomUUID(),
      username,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
    };
    list.push(admin);
    admins.write(list);
    return { id: admin.id, username: admin.username, role: admin.role };
  },

  /**
   * List all admins (without password hashes)
   */
  list() {
    return admins.read().map(({ passwordHash, ...rest }) => rest);
  },
};

module.exports = Admin;