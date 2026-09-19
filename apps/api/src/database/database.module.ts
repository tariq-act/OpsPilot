import { Module } from "@nestjs/common";
import { DatabaseService } from "./database.service.js";
import { PrismaService } from "./prisma.service.js";

/** Persistence infrastructure. Import this module to use DatabaseService or PrismaService. */
@Module({
  providers: [DatabaseService, PrismaService],
  exports: [DatabaseService, PrismaService],
})
export class DatabaseModule {}
