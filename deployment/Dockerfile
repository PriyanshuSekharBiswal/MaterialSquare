FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/types/package.json packages/types/package.json
RUN npm ci
COPY . .
ENV VITE_API_URL=/api VITE_ADMIN_BASE=/admin/
RUN npm run build

FROM build AS api
ENV NODE_ENV=production
USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]

FROM caddy:2-alpine AS gateway
COPY --from=build /app/apps/web/dist /srv/web
COPY --from=build /app/apps/admin/dist /srv/admin
COPY deployment/Caddyfile /etc/caddy/Caddyfile
