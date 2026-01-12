import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is missing. Ensure apps/api/.env is loaded.");
    }

    const adapter = new PrismaPg({ connectionString: url });
    super({ adapter });
  }

  async onModuleInit() {
    this.$use(async (params, next) => {
      if (!params.model) {
        return next(params);
      }

      const softDeleteModels = new Set([
        "Exhibition",
        "ExhibitionVersion",
        "ExhibitionRun",
        "NfcTag",
      ]);

      if (!softDeleteModels.has(params.model)) {
        return next(params);
      }

      const addSoftDeleteFilter = (where: Record<string, unknown> | undefined) => {
        if (where && Object.prototype.hasOwnProperty.call(where, "deletedAt")) {
          return where;
        }
        return { ...(where ?? {}), deletedAt: null };
      };

      if (params.action === "findUnique" || params.action === "findUniqueOrThrow") {
        params.action = params.action === "findUnique" ? "findFirst" : "findFirstOrThrow";
        params.args = {
          ...params.args,
          where: addSoftDeleteFilter(params.args?.where),
        };
      }

      if (
        params.action === "findFirst" ||
        params.action === "findFirstOrThrow" ||
        params.action === "findMany" ||
        params.action === "count" ||
        params.action === "aggregate" ||
        params.action === "groupBy"
      ) {
        params.args = {
          ...params.args,
          where: addSoftDeleteFilter(params.args?.where),
        };
      }

      return next(params);
    });
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
