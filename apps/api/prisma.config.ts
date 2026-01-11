import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";
import path from "path";

// ✅ 明確讀 apps/api/.env（不靠 DOTENV_CONFIG_PATH 也能成功）
dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});