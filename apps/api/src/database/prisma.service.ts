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

    // Prisma v7: use $extends instead of $use middleware
    const softDeleteModels = new Set([
      "Exhibition",
      "ExhibitionVersion",
      "ExhibitionRun",
      "NfcTag",
    ]);

    const addSoftDeleteFilter = (where: Record<string, unknown> | undefined) => {
      if (where && Object.prototype.hasOwnProperty.call(where, "deletedAt")) {
        return where;
      }
      return { ...(where ?? {}), deletedAt: null };
    };

    // Apply query hooks for models with soft delete
    this.$extends({
      query: {
        $allModels: {
          async findUnique({ model, args, query }) {
            if (!softDeleteModels.has(model)) return query(args);
            // findUnique doesn't support additional filters in Prisma query layer, so rewrite to findFirst
            return (this as unknown as PrismaClient)[model].findFirst({
              ...args,
              where: addSoftDeleteFilter(args?.where as any),
            }) as any;
          },
          async findUniqueOrThrow({ model, args, query }) {
            if (!softDeleteModels.has(model)) return query(args);
            return (this as unknown as PrismaClient)[model].findFirstOrThrow({
              ...args,
              where: addSoftDeleteFilter(args?.where as any),
            }) as any;
          },
          async findFirst({ model, args, query }) {
            if (!softDeleteModels.has(model)) return query(args);
            return query({ ...args, where: addSoftDeleteFilter(args?.where as any) });
          },
          async findFirstOrThrow({ model, args, query }) {
            if (!softDeleteModels.has(model)) return query(args);
            return query({ ...args, where: addSoftDeleteFilter(args?.where as any) });
          },
          async findMany({ model, args, query }) {
            if (!softDeleteModels.has(model)) return query(args);
            return query({ ...args, where: addSoftDeleteFilter(args?.where as any) });
          },
          async count({ model, args, query }) {
            if (!softDeleteModels.has(model)) return query(args);
            return query({ ...args, where: addSoftDeleteFilter(args?.where as any) });
          },
          async aggregate({ model, args, query }) {
            if (!softDeleteModels.has(model)) return query(args);
            return query({ ...args, where: addSoftDeleteFilter(args?.where as any) });
          },
          async groupBy({ model, args, query }) {
            if (!softDeleteModels.has(model)) return query(args);
            return query({ ...args, where: addSoftDeleteFilter(args?.where as any) });
          },
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
