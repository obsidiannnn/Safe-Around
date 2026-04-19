# =============================================================================
# SafeAround Backend – Dockerfile
# Multi-stage build: Go builder → lean Alpine runtime
# =============================================================================

# --- Stage 1: Build ---
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git gcc musl-dev ca-certificates tzdata

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# CGO_ENABLED=1 required for PostGIS/sqlite mattn drivers; statically linked via musl
RUN CGO_ENABLED=1 GOOS=linux \
    go build -a -installsuffix cgo \
    -ldflags="-w -s -X main.Version=$(git describe --tags --always 2>/dev/null || echo dev)" \
    -o safearound-api ./cmd/api

# --- Stage 2: Runtime ---
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata curl

RUN addgroup -S safearound && adduser -S safearound -G safearound

WORKDIR /app

COPY --from=builder /app/safearound-api .

USER safearound

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health/ping || exit 1

CMD ["./safearound-api"]
