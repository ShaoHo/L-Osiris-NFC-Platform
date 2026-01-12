import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Try multiple candidate paths so "start from root" or "start from apps/api" both work
const candidates = [
  path.resolve(process.cwd(), "apps/api/.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../../.env"),
];

for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("v1");
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
}
bootstrap();