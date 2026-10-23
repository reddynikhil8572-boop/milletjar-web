#!/usr/bin/env node
import crypto from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error(
    'Usage: npm run hash:password -- "your-password" (minimum 8 characters)'
  );
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const key = crypto.scryptSync(password, salt, 64);
console.log(`scrypt$${salt}$${key.toString("hex")}`);
