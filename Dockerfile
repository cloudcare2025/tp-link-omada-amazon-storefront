# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first (best layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy build config and source code
COPY tsconfig.json ./
COPY build.sh ./
COPY script.ts ./
COPY styles.scss ./
COPY nginx.conf ./

# Copy HTML files
COPY *.html ./

# Copy static assets
COPY logos/ ./logos/
COPY images/ ./images/

# Copy video files last (largest)
COPY videos/ ./videos/ 2>/dev/null || true

# Run build
RUN chmod +x build.sh && sh build.sh

# Stage 2: Serve with minimal image
FROM nginx:stable-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist/ /usr/share/nginx/html/

# Copy nginx config as template
COPY --from=build /app/dist/nginx.conf /etc/nginx/templates/default.conf.template

# Non-root healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-80}/ || exit 1

ENV PORT=80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
