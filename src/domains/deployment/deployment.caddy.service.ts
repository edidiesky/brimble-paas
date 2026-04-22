import axios from "axios";
import { CADDY_ADMIN_URL } from "../../shared/constants";
import { CaddyError } from "../../shared/utils/error";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME } from "../../shared/constants";

const logger = createLogger(SERVICE_NAME);

class CaddyService {
  async registerRoute(
    deploymentId: string,
    hostPort: number
  ): Promise<string> {
    const routeId = `dep_${deploymentId}`;
    const url = `http://localhost/deploy/${deploymentId}/`;

    const route = {
      "@id": routeId,
      match: [{ path: [`/deploy/${deploymentId}/*`] }],
      handle: [
        {
          handler: "reverse_proxy",
          upstreams: [{ dial: `host.docker.internal:${hostPort}` }],
        },
      ],
    };

    try {
      await axios.post(
        `${CADDY_ADMIN_URL}/config/apps/http/servers/srv0/routes`,
        route,
        { headers: { "Content-Type": "application/json" } }
      );

      logger.info("caddy_service_route_registered", {
        event: "caddy_service_route_registered",
        service: SERVICE_NAME,
        deploymentId,
        hostPort,
        url,
      });

      return url;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      logger.error("caddy_service_register_failed", {
        event: "caddy_service_register_failed",
        service: SERVICE_NAME,
        deploymentId,
        error: message,
      });

      throw new CaddyError(message, { deploymentId, hostPort });
    }
  }

  async removeRoute(deploymentId: string): Promise<void> {
    const routeId = `dep_${deploymentId}`;

    try {
      await axios.delete(
        `${CADDY_ADMIN_URL}/id/${routeId}`,
        { headers: { "Content-Type": "application/json" } }
      );

      logger.info("caddy_service_route_removed", {
        event: "caddy_service_route_removed",
        service: SERVICE_NAME,
        deploymentId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      logger.error("caddy_service_remove_failed", {
        event: "caddy_service_remove_failed",
        service: SERVICE_NAME,
        deploymentId,
        error: message,
      });

      throw new CaddyError(message, { deploymentId });
    }
  }
}

export const caddyService = new CaddyService();