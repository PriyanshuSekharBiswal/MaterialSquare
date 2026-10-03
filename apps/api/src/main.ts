import { demoAuthEnabled } from "./auth/demo-mode";
import { publicRateLimit } from "./common/rate-limit";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  demoAuthEnabled();

  // Only enable proxy trust for an explicitly configured, private reverse-proxy hop count.
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 5)
    throw new Error("Invalid TRUST_PROXY_HOPS");
  app.getHttpAdapter().getInstance().set("trust proxy", proxyHops);
  app.enableShutdownHooks();
  app.use(publicRateLimit());

  // Set global API prefix
  app.setGlobalPrefix("api");

  // Enable CORS for frontend applications (Customer Web and Admin Panel)
  app.enableCors({
    origin: (
      process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:5174"
    ).split(",").map((origin) => origin.trim()).filter(Boolean),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // OpenAPI Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle("Material Square API")
    .setDescription(
      "Material Square V1 REST API — customer and staff access, product catalogue, material lists, and aggregate website analytics",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  if (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_API_DOCS === "true"
  ) {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(
    `🚀 Material Square NestJS API running on: http://localhost:${port}/api`,
  );
  if (process.env.NODE_ENV !== "production" || process.env.ENABLE_API_DOCS === "true") {
    console.log(
      `📚 Swagger Documentation available at: http://localhost:${port}/api/docs`,
    );
  }
}
bootstrap();
