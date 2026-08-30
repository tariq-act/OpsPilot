import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "./../src/app.module.js";

describe("AppController (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("/ (GET)", () => {
    return request(app.getHttpServer())
      .get("/")
      .expect(200)
      .expect("Hello World!");
  });

  it("/health (GET)", () => {
    return request(app.getHttpServer())
      .get("/health")
      .expect(200)
      .expect({ status: "ok" });
  });

  it("/health/ready (GET) does not leak connection details", async () => {
    const response = await request(app.getHttpServer()).get("/health/ready");

    expect([200, 503]).toContain(response.status);
    expect(response.body).toEqual(
      response.status === 200
        ? { status: "ready", database: "connected" }
        : { status: "not_ready", database: "unavailable" },
    );
    expect(JSON.stringify(response.body)).not.toMatch(
      /password|postgresql:\/\//i,
    );
  });

  afterEach(async () => {
    await app.close();
  });
});
