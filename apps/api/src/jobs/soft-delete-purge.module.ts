import { Module } from "@nestjs/common";
import { SoftDeletePurgeService } from "./soft-delete-purge.service";

@Module({
  providers: [SoftDeletePurgeService],
})
export class SoftDeletePurgeModule {}
