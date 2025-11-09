# Multi-stage build for Vector Similarity Explorer
# Stage 1: Build stage (optional - for future build steps)
FROM nginx:alpine AS builder

# Stage 2: Production stage
FROM nginx:alpine

# Set working directory
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy application files
COPY index.html ./
COPY css/ ./css/
COPY js/ ./js/

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add labels for metadata
LABEL maintainer="will@willcarpenter.me"
LABEL description="Vector Similarity Explorer - Interactive 3D word embedding visualization"
LABEL version="1.0"

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
