# Docker Deployment Guide

This guide explains how to build and run the Vector Similarity Explorer using Docker.

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The application will be available at `http://localhost:8080`

### Using Docker CLI

```bash
# Build the image
docker build -t vector-similarity-explorer .

# Run the container
docker run -d \
  --name vector-viz \
  -p 8080:80 \
  --restart unless-stopped \
  vector-similarity-explorer

# View logs
docker logs -f vector-viz

# Stop and remove
docker stop vector-viz && docker rm vector-viz
```

## Configuration

### Port Mapping

By default, the container exposes port 80. You can map it to any host port:

```bash
# Map to port 3000
docker run -p 3000:80 vector-similarity-explorer

# Or update docker-compose.yml:
ports:
  - "3000:80"
```

### Custom Nginx Configuration

To use a custom nginx configuration:

1. Create your custom `nginx.conf`
2. Mount it as a volume:

```bash
docker run -v ./custom-nginx.conf:/etc/nginx/conf.d/default.conf vector-similarity-explorer
```

Or in `docker-compose.yml`:

```yaml
volumes:
  - ./custom-nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

## Image Details

- **Base Image**: `nginx:alpine` (~10MB compressed)
- **Total Size**: ~15MB (including app files)
- **Architecture**: Multi-platform (amd64, arm64)

### What's Included

- Static HTML/CSS/JS files
- Optimized nginx configuration
- Gzip compression enabled
- Security headers configured
- Health checks configured

## Production Deployment

### Environment Variables

While this is a static site, you can set environment variables for nginx:

```yaml
environment:
  - NGINX_HOST=viz.example.com
  - NGINX_PORT=80
```

### HTTPS/SSL

For production, use a reverse proxy like Traefik or nginx-proxy:

#### With Traefik

```yaml
services:
  vector-viz:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.vector-viz.rule=Host(`viz.example.com`)"
      - "traefik.http.routers.vector-viz.entrypoints=websecure"
      - "traefik.http.routers.vector-viz.tls.certresolver=letsencrypt"
```

#### With nginx-proxy

```yaml
services:
  vector-viz:
    build: .
    environment:
      - VIRTUAL_HOST=viz.example.com
      - LETSENCRYPT_HOST=viz.example.com
      - LETSENCRYPT_EMAIL=you@example.com
```

### Resource Limits

Add resource constraints for production:

```yaml
services:
  vector-viz:
    build: .
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 128M
        reservations:
          cpus: '0.25'
          memory: 64M
```

## Health Checks

The container includes a health check that runs every 30 seconds:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' vector-viz

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' vector-viz
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs vector-viz

# Verify nginx configuration
docker run --rm vector-similarity-explorer nginx -t
```

### Port already in use

```bash
# Find what's using the port
lsof -ti:8080

# Use a different port
docker run -p 9090:80 vector-similarity-explorer
```

### Permission issues

```bash
# Build with no cache
docker build --no-cache -t vector-similarity-explorer .

# Check file permissions
docker run --rm vector-similarity-explorer ls -la /usr/share/nginx/html
```

## Development with Docker

For development with live reload:

```bash
# Mount local files as volume
docker run -d \
  -p 8080:80 \
  -v $(pwd):/usr/share/nginx/html:ro \
  --name vector-viz-dev \
  nginx:alpine
```

Or use the development docker-compose:

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  vector-viz:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

Run with: `docker-compose -f docker-compose.dev.yml up`

## Multi-Platform Builds

Build for multiple architectures:

```bash
# Create and use buildx builder
docker buildx create --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t yourregistry/vector-similarity-explorer:latest \
  --push .
```

## Registry Deployment

### Docker Hub

```bash
# Tag the image
docker tag vector-similarity-explorer username/vector-similarity-explorer:latest

# Push to Docker Hub
docker push username/vector-similarity-explorer:latest
```

### GitHub Container Registry

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Tag and push
docker tag vector-similarity-explorer ghcr.io/username/vector-similarity-explorer:latest
docker push ghcr.io/username/vector-similarity-explorer:latest
```

## Kubernetes Deployment

Example Kubernetes manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vector-similarity-explorer
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vector-viz
  template:
    metadata:
      labels:
        app: vector-viz
    spec:
      containers:
      - name: vector-viz
        image: vector-similarity-explorer:latest
        ports:
        - containerPort: 80
        resources:
          limits:
            memory: "128Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: vector-viz-service
spec:
  selector:
    app: vector-viz
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

## Performance Optimization

The nginx configuration includes:

- **Gzip compression**: Reduces payload size by ~70%
- **Cache headers**: 1-year cache for static assets
- **Security headers**: XSS protection, content type sniffing prevention
- **Health checks**: Automated container health monitoring

## License

This Docker configuration is part of the Vector Similarity Explorer project.
