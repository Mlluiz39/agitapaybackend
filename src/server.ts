import Fastify from "fastify";
import "dotenv/config";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { setupErrorHandler } from "./middlewares/errorHandler.js";
import { authenticate } from "./middlewares/auth.js";
import clientesRoutes from "./routes/customers.js";
import contratosRoutes from "./routes/contracts.js";
import cobrancaRoutes from "./routes/collections.js";
import installmentsRoutes from "./routes/installments.js";
import authRoutes from "./routes/auth.js";
import paymentsRoutes from "./routes/payments.js";
import dashboardRoutes from "./routes/dashboard.js";
import installmentsApiRoutes from "./routes/installmentsApi.js";
import alertsRoutes from "./routes/alerts.js";
import uploadsRoutes from "./routes/uploads.js";
import { initializeWhatsApp } from "./services/whatsapp.js";
import "./cron/alert.js";

const app = Fastify({
  logger: true,
});

async function start() {
  try {
    await app.register(cors, {
      origin: "*",
      credentials: true,
    });

    await app.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute",
    });

    await app.register(multipart, {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1,
      },
    });

    await app.register(jwt, {
      secret: process.env.JWT_SECRET || "change-this-in-production",
    });

    setupErrorHandler(app);

    app.get("/health", async () => ({ status: "ok" }));

    await app.register(authRoutes, { prefix: "/api/auth" });

    await app.register(clientesRoutes, { prefix: "" });
    await app.register(contratosRoutes, { prefix: "" });
    await app.register(cobrancaRoutes, { prefix: "" });
    await app.register(installmentsRoutes, { prefix: "" });
    await app.register(paymentsRoutes, { prefix: "" });
    await app.register(dashboardRoutes, { prefix: "" });
    await app.register(installmentsApiRoutes, { prefix: "" });
    await app.register(alertsRoutes, { prefix: "" });
    await app.register(uploadsRoutes, { prefix: "" });

    await app.ready();

    const port = parseInt(process.env.PORT || "3000", 10);
    const host = process.env.HOST || "0.0.0.0";
    
    await app.listen({ port, host });
    console.log("Server running on http://localhost:" + port);

    // Iniciar Whatsapp Client local
    initializeWhatsApp();

  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();