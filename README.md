# QuantSolve — Go Backend

A complete rewrite of the Python/Flask backend in **Go**, with zero external dependencies.

## Project Structure

```
quantsolve-go/
  lexer.go            Module 1 — Tokenizer (port of lexer.py)
  parser.go           Module 2 — Recursive descent parser + AST + evaluator (port of eq_parser.py)
  solver.go           Module 3 — Whole-number solver + analytics (port of solver.py)
  main.go             Module 4 — HTTP API server (port of app.py)
  quantsolve_test.go  Unit tests (15 tests covering all modules)
  bench_test.go       Benchmarks
  go.mod
```

## Quick Start

```bash
# Run in dev mode
go run .

# Build a single binary
go build -ldflags="-s -w" -o quantsolve_server .
./quantsolve_server
# → Listening on :5000
```

The server is a **drop-in replacement** for the Python/Flask version.  
Same endpoint, same JSON request/response shape.

## API

### GET /
Health check.
```json
{ "status": "ok", "engine": "QuantSolve v2.0 (Go)" }
```

### POST /solve
```bash
curl -X POST http://localhost:5000/solve \
  -H "Content-Type: application/json" \
  -d '{"equation":"10x+20y=100","bounds":{"x":20,"y":20}}'
```

**Request body:**
```json
{
  "equation":    "10x + 20y + 5z = 500",
  "bounds":      { "x": 20 },
  "constraints": [
    { "var": "x", "op": ">",    "val": 5 },
    { "var": "y", "op": "even", "val": null }
  ]
}
```

**Valid constraint operators:** `>  <  >=  <=  =  ==  !=  even  odd`

## Tests

```bash
# Run all unit tests
go test -v ./...

# Run benchmarks
go test -bench=. -benchmem -benchtime=2s
```

### Benchmark Results (Intel Xeon 2.10GHz)

| Case | Time per op | Notes |
|---|---|---|
| Lexer — simple | 2.1 µs | `50x = 200` |
| Lexer — complex | 5.7 µs | 5-variable equation |
| Parser — two vars | 3.5 µs | |
| **Solver — single var** | **8.2 µs** | O(1) algebraic |
| **Solver — two vars** | **21.7 µs** | O(N) algebraic |
| **Solver — three vars** | **1.1 ms** | O(N²) algebraic, 799 solutions |
| **Solver — five vars** | **14.4 ms** | O(N⁴) algebraic |

### Python vs Go speed comparison

| Case | Python (est.) | Go | Speedup |
|---|---|---|---|
| Single var | ~500 µs | 8.2 µs | ~60× |
| Two vars | ~2 ms | 21.7 µs | ~90× |
| Three vars | ~80 ms | 1.1 ms | ~70× |

*Python times are estimates based on interpreter overhead (~100ns/iteration vs Go's ~2ns/iteration).*

## Why Go beats Python here

| | Python | Go |
|---|---|---|
| Execution model | Interpreted | Compiled to native binary |
| Solver loop overhead | ~100 ns/iter (interpreter) | ~2 ns/iter (native) |
| GC pauses | Yes (ref counting + cyclic GC) | Yes but very short (ms-range) |
| Startup time | ~200ms (interpreter boot) | ~2ms |
| Binary | Needs Python runtime installed | Single self-contained binary |
| Concurrency | GIL-limited | True goroutine parallelism |
| Memory per solution | Higher (Python objects are heavy) | Lower (plain Go structs) |

## No external dependencies

The entire backend uses **only the Go standard library**:
- `net/http` — HTTP server
- `encoding/json` — JSON encode/decode
- `math`, `fmt`, `strings`, `time`, `unicode`, `os` — utilities

No Flask, no gunicorn, no pip install. Just `go build` and run.

## Frontend

The React/Vite frontend (`frontend/`) is unchanged — just update the API URL in `Dashboard.jsx`:

```js
// Change this line in Dashboard.jsx:
const API = "http://localhost:5000/solve";
```

It works identically since the JSON response shape is preserved exactly.

## Deploying

### Render / Railway / Fly.io

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -ldflags="-s -w" -o server .

FROM alpine:latest
COPY --from=builder /app/server /server
EXPOSE 5000
CMD ["/server"]
```

Final Docker image is **~8 MB** (vs ~200MB for Python + Flask).

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Port to listen on |
