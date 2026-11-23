# Production image: Next.js standalone server + headless Chromium (PDF
# rendering) + Ghostscript (CMYK PDF/X for the printer).
# Build:  docker build -t tfca .
# Run:    see DEPLOY.md (needs DATABASE_URL, RENDER_SECRET and a volume at /data)

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    UPLOAD_DIR=/data/uploads

# Ghostscript for PDF/X, plus Chromium (the exact build playwright-core
# expects) and the system libraries it needs.
COPY --from=deps /app/node_modules/playwright-core /tmp/playwright-core
RUN apt-get update \
 && apt-get install -y --no-install-recommends ghostscript ca-certificates \
 && node /tmp/playwright-core/cli.js install --with-deps --only-shell chromium \
 && rm -rf /var/lib/apt/lists/* /tmp/playwright-core

COPY --from=build /app/.next/standalone ./
# Tracing keeps only part of playwright-core; it needs the whole package.
COPY --from=deps /app/node_modules/playwright-core ./node_modules/playwright-core
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle

# Runs as root: hosts such as Railway mount volumes owned by root, and
# photos are written to the volume at /data.
RUN mkdir -p /data/uploads
EXPOSE 3000
CMD ["node", "server.js"]
