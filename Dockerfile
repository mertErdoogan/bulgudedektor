# Arena Dedektör — üretim imajı
# docker compose up -d --build   (bkz. docs/KURULUM.md)
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Derleme sırasında veritabanına bağlanılmaz; gerçek değerler çalışma anında gelir
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" AUTH_SECRET="build-only" \
    NODE_OPTIONS=--max-old-space-size=3072 npx next build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 UPLOAD_DIR=/data/uploads
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data/uploads && chown -R node:node /data
# tsx/drizzle-kit (göç ve içe aktarma betikleri) için node_modules olduğu gibi taşınır
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/package.json /app/next.config.ts /app/drizzle.config.ts /app/tsconfig.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD curl -fsS http://localhost:3000/api/health || exit 1
# Açılışta bekleyen veritabanı göçlerini uygular, sonra sunucuyu başlatır
CMD ["sh", "-c", "npx drizzle-kit migrate && npx next start -p ${PORT}"]
