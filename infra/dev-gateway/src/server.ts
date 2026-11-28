import { getGatewayConfig, loadRootEnv } from "./env";
import { createGatewayServer } from "./gateway";

function start(): void {
  loadRootEnv();
  const config = getGatewayConfig();
  const { server, logger, targets } = createGatewayServer({
    targets: config.targets,
    healthTimeoutMs: config.healthTimeoutMs,
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
