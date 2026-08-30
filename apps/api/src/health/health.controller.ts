import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";
import { DatabaseService } from "../database/database.service.js";

@Controller("health")
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  liveness(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
  async readiness(
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ status: "ready" | "not_ready"; database: string }> {
    const connected = await this.database.ping();
    if (!connected) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: "not_ready", database: "unavailable" };
    }

    return { status: "ready", database: "connected" };
  }
}
