// bench_test.go — Benchmarks for QuantSolve Go engine
// Run: go test -bench=. -benchmem -benchtime=3s

package main

import "testing"

// ── Lexer benchmarks ──────────────────────────────────────────────────────────

func BenchmarkLexer_Simple(b *testing.B) {
	for i := 0; i < b.N; i++ {
		NewLexer("50x = 200").Tokenize()
	}
}

func BenchmarkLexer_Complex(b *testing.B) {
	for i := 0; i < b.N; i++ {
		NewLexer("10a + 15b + 20c + 50d + 5e = 1000").Tokenize()
	}
}

// ── Parser benchmarks ─────────────────────────────────────────────────────────

func BenchmarkParser_TwoVars(b *testing.B) {
	for i := 0; i < b.N; i++ {
		ParseEquation("10x + 20y = 100")
	}
}

func BenchmarkParser_FiveVars(b *testing.B) {
	for i := 0; i < b.N; i++ {
		ParseEquation("10a + 15b + 20c + 50d + 5e = 1000")
	}
}

// ── Solver benchmarks — these are the critical ones ──────────────────────────

// Single variable — O(1) algebraic
func BenchmarkSolver_SingleVar(b *testing.B) {
	for i := 0; i < b.N; i++ {
		Solve("50x = 200", nil, nil)
	}
}

// Two variables — O(N) algebraic loop
func BenchmarkSolver_TwoVars(b *testing.B) {
	bounds := map[string]int{"x": 20, "y": 20}
	for i := 0; i < b.N; i++ {
		Solve("10x + 20y = 100", nil, bounds)
	}
}

// Three variables — O(N²) algebraic
func BenchmarkSolver_ThreeVars(b *testing.B) {
	bounds := map[string]int{"a": 30, "b": 40, "c": 80}
	for i := 0; i < b.N; i++ {
		Solve("150a + 100b + 50c = 5000", nil, bounds)
	}
}

// Five variables — O(N⁴) algebraic — stress test
func BenchmarkSolver_FiveVars(b *testing.B) {
	bounds := map[string]int{"a": 20, "b": 20, "c": 20, "d": 20, "e": 20}
	for i := 0; i < b.N; i++ {
		Solve("10a + 15b + 20c + 50d + 5e = 1000", nil, bounds)
	}
}

// With constraints
func BenchmarkSolver_WithConstraints(b *testing.B) {
	bounds := map[string]int{"x": 50, "y": 50}
	constraints := []Constraint{
		{Var: "x", Op: ">", Val: 5},
		{Var: "y", Op: "even", Val: 0},
	}
	for i := 0; i < b.N; i++ {
		Solve("10x + 20y = 500", constraints, bounds)
	}
}

// Full pipeline: parse + solve
func BenchmarkFullPipeline_ThreeVars(b *testing.B) {
	for i := 0; i < b.N; i++ {
		Solve("150a + 100b + 50c = 5000", nil, map[string]int{"a": 30, "b": 40, "c": 80})
	}
}
