FROM node:24-alpine
WORKDIR /app

# Build-time metadata: the image carries the revision it was made from.
ARG BUILD_REVISION=local
ENV BUILD_REVISION=${BUILD_REVISION}
ENV NODE_ENV=production PORT=3000
LABEL org.opencontainers.image.title="Academy Preview API" \
      org.opencontainers.image.revision="${BUILD_REVISION}"

COPY --chown=node:node package.json ./
COPY --chown=node:node src/ ./src/
USER node
EXPOSE 3000

# Docker-local signal; ECS health checks will be configured explicitly later.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.mjs"]
