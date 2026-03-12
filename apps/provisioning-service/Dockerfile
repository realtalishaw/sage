FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl openssh-client git \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL "https://github.com/digitalocean/doctl/releases/download/v1.148.0/doctl-1.148.0-linux-amd64.tar.gz" \
  | tar -xz -C /usr/local/bin doctl

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/provisioning-service ./apps/provisioning-service

RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @sage/shared-types build
RUN pnpm --filter @sage/instance-contracts build
RUN pnpm --filter @sage/provisioning-service build

WORKDIR /app/apps/provisioning-service

ENV PROVISIONING_SERVICE_HOST=0.0.0.0
ENV PROVISIONING_SERVICE_PORT=8080

EXPOSE 8080

CMD ["node", "dist/server.js"]
