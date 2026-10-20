import { publicRateLimit } from "./common/rate-limit";
import {
  securityHeadersMiddleware,
  trustedOriginMiddleware,
} from "./common/security.middleware";
import { SecurityExceptionFilter } from "./common/http-exception.filter";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { PrismaService } from "./prisma/prisma.service";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { json, urlencoded } from "express";

async function bootstrap() {
  // Catalogue listings may contain up to 1,000 client-managed variants. Allow
  // a bounded payload large enough for their option metadata and image URLs.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: "5mb" }));
  app.use(urlencoded({ extended: true, limit: "5mb" }));

  // HTTP Security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      noSniff: true,
      xssFilter: true,
      hidePoweredBy: true,
      hsts:
        process.env.NODE_ENV === "production"
          ? { maxAge: 31536000, includeSubDomains: true }
          : false,
    }),
  );

  // Custom defensive security headers
  app.use(securityHeadersMiddleware());

  // Only enable proxy trust for an explicitly configured, private reverse-proxy hop count.
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 5)
    throw new Error("Invalid TRUST_PROXY_HOPS");
  app.getHttpAdapter().getInstance().set("trust proxy", proxyHops);
  app.enableShutdownHooks();

  // Set global API prefix
  app.setGlobalPrefix("api");

  // Secure CORS origin resolution
  const defaultDevOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "https://material-square.localtest.me:5173",
    "https://material-square.localtest.me:5175",
  ];
  const defaultOrigins =
    process.env.NODE_ENV === "production" ? "" : defaultDevOrigins.join(",");
  const configuredOrigins = (process.env.CORS_ORIGINS || defaultOrigins)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin, supertest)
      callback(null, !origin || configuredOrigins.includes(origin));
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Material-Square",
      "X-Material-Account",
      "Accept",
      "Origin",
    ],
  });
  app.use(publicRateLimit(app.get(PrismaService)));

  app.use(trustedOriginMiddleware(configuredOrigins));

  // Global exception filter for leak prevention and consistent error contracts
  app.useGlobalFilters(new SecurityExceptionFilter());

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
  // Local development should not expose the API to the LAN. Production
  // deployments still bind all interfaces so the platform proxy can reach it.
  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
  await app.listen(port, host);
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
