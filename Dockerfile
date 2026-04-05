# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod .
COPY *.go .

# Build a static binary (no CGO, stripped symbols → smallest size)
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o quantsolve_server .

# ── Stage 2: Minimal runtime image ───────────────────────────────────────────
FROM scratch

COPY --from=builder /app/quantsolve_server /quantsolve_server

EXPOSE 5000
ENV PORT=5000

ENTRYPOINT ["/quantsolve_server"]
