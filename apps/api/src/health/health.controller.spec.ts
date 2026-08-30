import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller.js";
import { DatabaseService } from "../database/database.service.js";

describe("HealthController", () => {
  const response = {
    status: vi.fn(),
  };

  beforeEach(() => {
    response.status.mockReset();
  });

  it("liveness does not depend on PostgreSQL", async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DatabaseService,
          useValue: { ping: vi.fn() },
        },
      ],
    }).compile();

    const controller = module.get(HealthController);
    expect(controller.liveness()).toEqual({ status: "ok" });
  });

  it("readiness is ready when PostgreSQL responds", async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DatabaseService,
          useValue: { ping: vi.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    const controller = module.get(HealthController);
    await expect(controller.readiness(response as never)).resolves.toEqual({
      status: "ready",
      database: "connected",
    });
    expect(response.status).not.toHaveBeenCalled();
  });

  it("readiness is not ready when PostgreSQL is unavailable", async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DatabaseService,
          useValue: { ping: vi.fn().mockResolvedValue(false) },
        },
      ],
    }).compile();

    const controller = module.get(HealthController);
    await expect(controller.readiness(response as never)).resolves.toEqual({
      status: "not_ready",
      database: "unavailable",
    });
    expect(response.status).toHaveBeenCalledWith(503);
  });
});
