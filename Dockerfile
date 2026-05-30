# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ENV NODE_OPTIONS=--max-old-space-size=2048
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_LOG_LEVEL=info
ARG NEXT_PUBLIC_REMOTE_LOG_LEVEL=warn
ARG NEXT_PUBLIC_ENABLE_REMOTE_LOGS=false
ARG NEXT_PUBLIC_REMOTE_LOG_ENDPOINT=/api/logs
ARG NEXT_PUBLIC_ENABLE_AI_INSIGHTS=false
ARG NEXT_PUBLIC_DEFAULT_COMPANY_ID=
ARG NEXT_PUBLIC_FLOWFORCE_AUTOMATIONS_ENDPOINT=

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_LOG_LEVEL=$NEXT_PUBLIC_LOG_LEVEL
ENV NEXT_PUBLIC_REMOTE_LOG_LEVEL=$NEXT_PUBLIC_REMOTE_LOG_LEVEL
ENV NEXT_PUBLIC_ENABLE_REMOTE_LOGS=$NEXT_PUBLIC_ENABLE_REMOTE_LOGS
ENV NEXT_PUBLIC_REMOTE_LOG_ENDPOINT=$NEXT_PUBLIC_REMOTE_LOG_ENDPOINT
ENV NEXT_PUBLIC_ENABLE_AI_INSIGHTS=$NEXT_PUBLIC_ENABLE_AI_INSIGHTS
ENV NEXT_PUBLIC_DEFAULT_COMPANY_ID=$NEXT_PUBLIC_DEFAULT_COMPANY_ID
ENV NEXT_PUBLIC_FLOWFORCE_AUTOMATIONS_ENDPOINT=$NEXT_PUBLIC_FLOWFORCE_AUTOMATIONS_ENDPOINT

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --shell /usr/sbin/nologin nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const http=require('node:http');const req=http.get({host:'127.0.0.1',port:process.env.PORT||3000,path:'/api/health',timeout:4000},res=>{process.exit(res.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.on('timeout',()=>{req.destroy();process.exit(1);});"

CMD ["node", "server.js"]
