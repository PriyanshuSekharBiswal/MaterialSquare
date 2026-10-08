import react from "@vitejs/plugin-react";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const captchaCompatibleLocalHost = "material-square.localtest.me:5173";
const localHttpPort = 5173;
const localHttpsPort = 5175;

function redirectLocalhostForCaptcha(useLocalHttps: boolean) {
  return {
    name: "redirect-localhost-for-captcha",
    configureServer(server) {
      if (useLocalHttps) {
        const redirectServer = createServer((req, res) => {
          const host = req.headers.host || "";
          const hostname = host.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
          if (
            !["localhost", "127.0.0.1", "::1", "material-square.localtest.me"].includes(
              hostname,
            )
          ) {
            res.statusCode = 404;
            res.end();
            return;
          }

          res.statusCode = 302;
          res.setHeader(
            "Location",
            `https://${captchaCompatibleLocalHost.replace(":5173", `:${localHttpsPort}`)}${req.url || "/"}`,
          );
          res.end();
        });
        redirectServer.on("error", (error) => {
          console.error("Unable to start the local HTTP-to-HTTPS redirect:", error);
        });
        redirectServer.listen(localHttpPort);
        server.httpServer?.once("close", () => redirectServer.close());
        return;
      }

      server.middlewares.use((req, res, next) => {
        const host = req.headers.host || "";
        const port = host.match(/:(\d+)$/)?.[1];
        const hostname = host.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");

        if (
          port !== "5173" ||
          !["localhost", "127.0.0.1", "::1"].includes(hostname)
        ) {
          next();
          return;
        }

        res.statusCode = 302;
        const scheme = (
          req.socket as typeof req.socket & { encrypted?: boolean }
        ).encrypted
          ? "https"
          : "http";
        res.setHeader(
          "Location",
          `${scheme}://${captchaCompatibleLocalHost}${req.url || "/"}`,
        );
        res.end();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const appRoot = fileURLToPath(new URL(".", import.meta.url));
  const env = loadEnv(mode, appRoot, "");
  const certPath = env.VITE_LOCAL_HTTPS_CERT?.trim();
  const keyPath = env.VITE_LOCAL_HTTPS_KEY?.trim();
  const certFile =
    certPath && (isAbsolute(certPath) ? certPath : resolve(appRoot, certPath));
  const keyFile =
    keyPath && (isAbsolute(keyPath) ? keyPath : resolve(appRoot, keyPath));
  const useLocalHttps = Boolean(certFile && keyFile);

  if (Boolean(certPath) !== Boolean(keyPath)) {
    throw new Error(
      "Set both VITE_LOCAL_HTTPS_CERT and VITE_LOCAL_HTTPS_KEY to enable local HTTPS.",
    );
  }

  return {
    plugins: [react(), redirectLocalhostForCaptcha(useLocalHttps)],
    server: {
      allowedHosts: ["material-square.localtest.me"],
      https:
        certFile && keyFile
          ? { cert: readFileSync(certFile), key: readFileSync(keyFile) }
          : undefined,
      proxy: {
        "/api": {
          target:
            env.API_PROXY_TARGET ||
            process.env.API_PROXY_TARGET ||
            "http://127.0.0.1:4000",
          changeOrigin: true,
        },
        // Keep local S3Mock images on the trusted storefront HTTPS origin so
        // saved product images work on the HTTPS customer site without mixed
        // content from the local object-storage port.
        "/material-square-assets": {
          target: "http://127.0.0.1:9000",
          changeOrigin: true,
        },
      },
      port: useLocalHttps ? localHttpsPort : localHttpPort,
      strictPort: true,
      host: true,
    },
  };
});
