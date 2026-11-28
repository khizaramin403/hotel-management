import { getGatewayConfig, loadRootEnv } from "./env";
import { createGatewayServer } from "./gateway";

function start(): void {
  loadRootEnv();
  const config = getGatewayConfig();
  const { server, logger, targets } = createGatewayServer({
    targets: config.targets,
    healthTimeoutMs: config.healthTimeoutMs,
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    logger.error(
      { port: config.port, code: error.code, error: error.message },
      error.code === "EADDRINUSE" ? "dev-gateway port already in use" : "dev-gateway server error",
    );
    process.exit(1);
  });

  server.listen(config.port, () => {
    logger.info({ port: config.port, targets }, "dev-gateway listening");
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "shutting down dev-gateway");
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start();
