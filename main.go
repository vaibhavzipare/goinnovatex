// main.go — QuantSolve Go HTTP API
// Port of app.py — uses only Go standard library (net/http + encoding/json).
// Same endpoints, same JSON response shapes as the Python version.
//
// Run:   go run .
// Build: go build -o quantsolve .

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

var validOps = map[string]bool{
	">": true, "<": true, ">=": true, "<=": true,
	"=": true, "==": true, "!=": true, "even": true, "odd": true,
}

// ── Request body ──────────────────────────────────────────────────────────────

type solveRequest struct {
	Equation    string                 `json:"equation"`
	Bounds      map[string]interface{} `json:"bounds"`
	UpperBounds map[string]interface{} `json:"upper_bounds"`
	Constraints []rawConstraint        `json:"constraints"`
}

type rawConstraint struct {
	Var string      `json:"var"`
	Op  string      `json:"op"`
	Val interface{} `json:"val"`
}

// ── JSON helpers ──────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func errJSON(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// ── CORS middleware ───────────────────────────────────────────────────────────

func withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

// ── GET / — health check ──────────────────────────────────────────────────────

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status": "ok",
		"engine": "QuantSolve v2.0 (Go)",
	})
}

// ── POST /solve ───────────────────────────────────────────────────────────────

func solveHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		errJSON(w, http.StatusMethodNotAllowed, "Method not allowed. Use POST /solve")
		return
	}

	var body solveRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		errJSON(w, http.StatusBadRequest, "Empty or malformed JSON body")
		return
	}

	if body.Equation == "" {
		errJSON(w, http.StatusBadRequest, "Missing required field: 'equation'")
		return
	}

	// ── Parse bounds ──────────────────────────────────────────────────────────
	rawBounds := body.Bounds
	if rawBounds == nil {
		rawBounds = body.UpperBounds
	}
	cleanBounds := make(map[string]int)
	for k, v := range rawBounds {
		if v == nil {
			continue
		}
		switch n := v.(type) {
		case float64:
			cleanBounds[k] = int(n)
		case string:
			if n == "" {
				continue
			}
			var i int
			if _, err := fmt.Sscanf(n, "%d", &i); err != nil {
				errJSON(w, http.StatusBadRequest, fmt.Sprintf("Bound for %q must be an integer", k))
				return
			}
			cleanBounds[k] = i
		default:
			errJSON(w, http.StatusBadRequest, fmt.Sprintf("Bound for %q must be an integer", k))
			return
		}
	}

	// ── Parse constraints ─────────────────────────────────────────────────────
	var constraints []Constraint
	for _, c := range body.Constraints {
		if c.Var == "" || c.Op == "" {
			errJSON(w, http.StatusBadRequest, "Each constraint needs 'var' and 'op' fields")
			return
		}
		if !validOps[c.Op] {
			errJSON(w, http.StatusBadRequest, fmt.Sprintf("Unknown operator %q", c.Op))
			return
		}
		val := 0.0
		if c.Val != nil {
			if n, ok := c.Val.(float64); ok {
				val = n
			}
		}
		constraints = append(constraints, Constraint{Var: c.Var, Op: c.Op, Val: val})
	}

	// ── Run solver ────────────────────────────────────────────────────────────
	result := Solve(body.Equation, constraints, cleanBounds)

	status := http.StatusOK
	if result.Error != nil {
		status = http.StatusUnprocessableEntity
	}
	writeJSON(w, status, result)
}

// ── Entry point ───────────────────────────────────────────────────────────────

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/", withCORS(healthHandler))
	mux.HandleFunc("/solve", withCORS(solveHandler))

	log.Printf("QuantSolve Go server — http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
