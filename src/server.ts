import Fastify from "fastify";
import "dotenv/config";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { setupErrorHandler } from "./middlewares/errorHandler.js";
import { authenticate } from "./middlewares/auth.js";
import clientesRoutes from "./routes/clientes.js";
import contratosRoutes from "./routes/contratos.js";
import cobrancaRoutes from "./routes/cobranca.js";
import parcelasRoutes from "./routes/parcelas.js";
import authRoutes from "./routes/auth.js";
import paymentsRoutes from "./routes/payments.js";
import dashboardRoutes from "./routes/dashboard.js";
import parcelasApiRoutes from "./routes/parcelasApi.js";
import alertasRoutes from "./routes/alertas.js";
import "./cron/alerta.js";

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

    await app.register(jwt, {
      secret: process.env.JWT_SECRET || "change-this-in-production",
    });

    setupErrorHandler(app);

    app.get("/health", async () => ({ status: "ok" }));

    await app.register(authRoutes, { prefix: "/api/auth" });

    await app.register(async (instance) => {
      instance.addHook("onRequest", authenticate);
      await instance.register(clientesRoutes);
      await instance.register(contratosRoutes);
      await instance.register(cobrancaRoutes);
      await instance.register(parcelasRoutes);
      await instance.register(paymentsRoutes);
      await instance.register(dashboardRoutes);
      await instance.register(parcelasApiRoutes);
      await instance.register(alertasRoutes);
    });

    await app.ready();

    const port = parseInt(process.env.PORT || "3000", 10);
    const host = process.env.HOST || "0.0.0.0";
    
    await app.listen({ port, host });
    console.log("Servidor rodando em http://localhost:" + port);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();