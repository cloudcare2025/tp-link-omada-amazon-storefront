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

# Run build
RUN chmod +x build.sh && sh build.sh

# Stage 2: Serve with minimal image
FROM nginx:stable-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist/ /usr/share/nginx/html/

# Copy nginx config as template (envsubst replaces ${PORT} at runtime)
COPY --from=build /app/dist/nginx.conf /etc/nginx/templates/default.conf.template

ENV PORT=80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
