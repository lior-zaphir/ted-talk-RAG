import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// Load repo-root .env for local dev/scripts (Vercel ignores local files; uses dashboard env vars).
// This lets you keep a single /Agents_Project/.env without duplicating into /web/.
const repoRootEnv = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(repoRootEnv)) {
  dotenv.config({ path: repoRootEnv });
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
