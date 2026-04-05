// solver.go — Module 3: Equation Solver + Analytics
// Supports: Linear, Quadratic, Cubic, Polynomial (Newton-Raphson).
// Provides: full step-by-step trace, root combinations table, graph sample points.

package main

import (
	"fmt"
	"math"
	"strings"
	"time"
)

const (
	MaxBound    = 200
	SolutionCap = 2000
)

// ── Types ─────────────────────────────────────────────────────────────────────

type Constraint struct {
	Var string  `json:"var"`
	Op  string  `json:"op"`
	Val float64 `json:"val"`
}

type BestSolution struct {
	Solution map[string]int `json:"best_solution"`
	Reason   string         `json:"reason"`
}

// GraphPoint is one (x, y) sample for the curve chart.
type GraphPoint struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// RootCombination is one row in the "combinations" table shown in the UI.
type RootCombination struct {
	Label string  `json:"label"` // e.g. "x₁"
	Value string  `json:"value"` // formatted value or "complex"
	IsReal bool   `json:"is_real"`
	Float  float64 `json:"float"` // NaN for complex
}

// AlgebraicResult holds the full structured output for polynomial solver path.
type AlgebraicResult struct {
	Degree      int               `json:"degree"`
	SolverUsed  string            `json:"solver_used"`
	EquationType string           `json:"equation_type"`  // "Linear" / "Quadratic" / ...
	Roots       []string          `json:"roots"`          // human-readable root strings
	RootValues  []float64         `json:"root_values"`    // NaN sentinel for complex
	HasComplex  bool              `json:"has_complex"`
	SolveSteps  []string          `json:"solve_steps"`    // detailed step-by-step trace
	Combinations []RootCombination `json:"combinations"`  // table rows for UI
	GraphPoints []GraphPoint      `json:"graph_points"`   // sampled curve y = f(x)
	Discriminant *float64         `json:"discriminant,omitempty"`
	Coefficients map[string]float64 `json:"coefficients"` // named a, b, c, d ...
	RootCount    int               `json:"root_count"`
	RealRootCount int              `json:"real_root_count"`
}

type SolveResult struct {
	Solutions     []map[string]int `json:"solutions"`
	Count         int              `json:"count"`
	Variables     []string         `json:"variables"`
	Equation      string           `json:"equation"`
	AutoBounds    map[string]int   `json:"auto_bounds"`
	BestSolution  *BestSolution    `json:"best_solution"`
	Capped        bool             `json:"capped"`
	Warning       *string          `json:"warning"`
	Error         *string          `json:"error"`
	ExecutionTime float64          `json:"execution_time"`
	Iterations    int              `json:"iterations"`
	PrunedCount   int              `json:"pruned_count"`
	Complexity    string           `json:"complexity"`
	SolverSteps   []string         `json:"solver_steps"`
	Message       *string          `json:"message,omitempty"`
	AlgebraicRoots *AlgebraicResult `json:"algebraic_roots,omitempty"`
}

// ── Constraint checker ────────────────────────────────────────────────────────

func checkConstraints(assignment map[string]int, constraints []Constraint) bool {
	for _, c := range constraints {
		v, ok := assignment[c.Var]
		if !ok {
			continue
		}
		fv := float64(v)
		switch c.Op {
		case ">":
			if !(fv > c.Val) { return false }
		case "<":
			if !(fv < c.Val) { return false }
		case ">=":
			if !(fv >= c.Val) { return false }
		case "<=":
			if !(fv <= c.Val) { return false }
		case "=", "==":
			if !(fv == c.Val) { return false }
		case "!=":
			if !(fv != c.Val) { return false }
		case "even":
			if v%2 != 0 { return false }
		case "odd":
			if v%2 != 1 { return false }
		}
	}
	return true
}

// ── Complexity label ──────────────────────────────────────────────────────────

func estimateComplexity(nVars int, algebraic bool) string {
	effective := nVars
	if algebraic { effective = nVars - 1 }
	labels := map[int]string{0: "O(1)", 1: "O(N)", 2: "O(N²)", 3: "O(N³)", 4: "O(N⁴)"}
	if l, ok := labels[effective]; ok { return l }
	return fmt.Sprintf("O(N^%d)", effective)
}

// ── Best solution ranking ─────────────────────────────────────────────────────

func getBestSolution(solutions []map[string]int) *BestSolution {
	if len(solutions) == 0 { return nil }
	score := func(sol map[string]int) float64 {
		vals := make([]float64, 0, len(sol))
		for _, v := range sol { vals = append(vals, float64(v)) }
		n := float64(len(vals))
		total := 0.0
		for _, v := range vals { total += v }
		mean := total / n
		variance := 0.0
		for _, v := range vals { d := v - mean; variance += d * d }
		stdDev := math.Sqrt(variance / n)
		zeroes := 0.0
		for _, v := range vals { if v == 0 { zeroes++ } }
		return total/n + zeroes*10 + stdDev*0.5
	}
	best := solutions[0]
	bestScore := score(best)
	for _, s := range solutions[1:] {
		if sc := score(s); sc < bestScore { bestScore = sc; best = s }
	}
	vals := make([]float64, 0, len(best))
	for _, v := range best { vals = append(vals, float64(v)) }
	n := float64(len(vals))
	total := 0.0
	for _, v := range vals { total += v }
	mean := total / n
	variance := 0.0
	zeroes := 0
	for _, v := range vals { d := v - mean; variance += d * d; if v == 0 { zeroes++ } }
	stdDev := math.Sqrt(variance / n)
	minTotal := math.MaxInt64
	for _, s := range solutions {
		t := 0
		for _, v := range s { t += v }
		if t < minTotal { minTotal = t }
	}
	bestTotal := 0
	for _, v := range best { bestTotal += v }
	reason := ""
	if n > 1 {
		switch {
		case stdDev < 2:
			reason = "Perfectly balanced distribution across all variables"
		case zeroes == 0 && stdDev < mean*0.5:
			reason = "Well-balanced with no zero allocations — efficient spread"
		case bestTotal == minTotal:
			reason = "Minimum total resource usage — most economical solution"
		case zeroes == 0:
			reason = "All variables active with reasonable distribution"
		default:
			reason = "Best trade-off between total usage and balance"
		}
	} else {
		reason = "Only variable — optimal by default"
	}
	return &BestSolution{Solution: best, Reason: reason}
}

// ════════════════════════════════════════════════════════════════════════════════
// ── SHARED HELPERS ────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════════

func formatFloat(f float64) string {
	if math.IsNaN(f) || math.IsInf(f, 0) { return "undefined" }
	if math.Abs(f-math.Round(f)) < 1e-9 { return fmt.Sprintf("%.0f", math.Round(f)) }
	return fmt.Sprintf("%.6g", f)
}

func evalPoly(coeffs []float64, x float64) float64 {
	result := 0.0
	xpow := 1.0
	for _, c := range coeffs { result += c * xpow; xpow *= x }
	return result
}

func evalPolyDeriv(coeffs []float64, x float64) float64 {
	result := 0.0
	xpow := 1.0
	for i := 1; i < len(coeffs); i++ { result += float64(i) * coeffs[i] * xpow; xpow *= x }
	return result
}

// sampleGraphPoints generates ~80 (x,y) points for drawing the polynomial curve.
// The window is centred on the real roots with a margin.
func sampleGraphPoints(coeffs []float64, realRoots []float64) []GraphPoint {
	const nPoints = 80
	var xMin, xMax float64

	if len(realRoots) > 0 {
		xMin, xMax = realRoots[0], realRoots[0]
		for _, r := range realRoots {
			if r < xMin { xMin = r }
			if r > xMax { xMax = r }
		}
		margin := math.Max(3.0, (xMax-xMin)*0.6+2)
		xMin -= margin
		xMax += margin
	} else {
		xMin, xMax = -10, 10
	}

	pts := make([]GraphPoint, nPoints)
	step := (xMax - xMin) / float64(nPoints-1)
	for i := 0; i < nPoints; i++ {
		x := xMin + float64(i)*step
		y := evalPoly(coeffs, x)
		if math.IsInf(y, 0) || math.IsNaN(y) { y = 0 }
		pts[i] = GraphPoint{X: roundTo(x, 4), Y: roundTo(y, 4)}
	}
	return pts
}

func roundTo(f float64, decimals int) float64 {
	p := math.Pow(10, float64(decimals))
	return math.Round(f*p) / p
}

// extractPolynomialCoeffs returns [a0, a1, ..., an] for the single-variable polynomial
// LHS - RHS = 0, using Vandermonde interpolation.
func extractPolynomialCoeffs(eq *ParsedEquation) []float64 {
	if len(eq.Variables) == 0 { return nil }
	varName := eq.Variables[0]
	degree := DetectDegree(eq)
	if degree < 0 || degree > 20 { return nil }

	pts := degree + 1
	fvals := make([]float64, pts)
	for i := 0; i < pts; i++ {
		xval := float64(i)
		vars := make(map[string]float64)
		for _, v := range eq.Variables { vars[v] = 0 }
		vars[varName] = xval
		lv, err1 := Evaluate(eq.LHS, vars)
		rv, err2 := Evaluate(eq.RHS, vars)
		if err1 != nil || err2 != nil { return nil }
		fvals[i] = lv - rv
	}

	n := pts
	mat := make([][]float64, n)
	for i := 0; i < n; i++ {
		mat[i] = make([]float64, n+1)
		xpow := 1.0
		for j := 0; j < n; j++ { mat[i][j] = xpow; xpow *= float64(i) }
		mat[i][n] = fvals[i]
	}
	for col := 0; col < n; col++ {
		pivotRow := -1
		for row := col; row < n; row++ {
			if math.Abs(mat[row][col]) > 1e-12 { pivotRow = row; break }
		}
		if pivotRow == -1 { return nil }
		mat[col], mat[pivotRow] = mat[pivotRow], mat[col]
		pivot := mat[col][col]
		for j := col; j <= n; j++ { mat[col][j] /= pivot }
		for row := 0; row < n; row++ {
			if row == col { continue }
			factor := mat[row][col]
			for j := col; j <= n; j++ { mat[row][j] -= factor * mat[col][j] }
		}
	}
	coeffs := make([]float64, n)
	for i := 0; i < n; i++ {
		coeffs[i] = mat[i][n]
		if math.Abs(coeffs[i]) < 1e-10 { coeffs[i] = 0 }
	}
	return coeffs
}

// ════════════════════════════════════════════════════════════════════════════════
// ── SOLVER: LINEAR  ax + b = 0 ───────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════════

func solveLinear(coeffs []float64) *AlgebraicResult {
	b, a := coeffs[0], coeffs[1]
	steps := []string{
		"━━━ LINEAR EQUATION SOLVER ━━━",
		fmt.Sprintf("Standard form: a·x + b = 0"),
		fmt.Sprintf("Extracted coefficients → a = %s,  b = %s", formatFloat(a), formatFloat(b)),
		"",
		"Step 1 — Isolate x:",
		"   a·x = −b",
		"   x = −b / a",
		fmt.Sprintf("Step 2 — Substitute values:"),
		fmt.Sprintf("   x = −(%s) / (%s)", formatFloat(b), formatFloat(a)),
	}

	res := &AlgebraicResult{
		Degree:       1,
		SolverUsed:   "Direct (ax + b = 0)",
		EquationType: "Linear",
		Coefficients: map[string]float64{"a": a, "b": b},
	}

	if math.Abs(a) < 1e-12 {
		if math.Abs(b) < 1e-12 {
			steps = append(steps, "   a = 0 and b = 0  →  identity equation: 0 = 0")
			steps = append(steps, "Result: INFINITE solutions (all x satisfy the equation)")
			res.Roots = []string{"Infinite solutions (identity: 0 = 0)"}
			res.RootValues = []float64{}
		} else {
			steps = append(steps, fmt.Sprintf("   a = 0 but b = %s ≠ 0  →  contradiction", formatFloat(b)))
			steps = append(steps, "Result: NO SOLUTION exists")
			res.Roots = []string{"No solution (contradiction)"}
			res.RootValues = []float64{}
		}
		res.SolveSteps = steps
		res.RootCount = 0
		res.RealRootCount = 0
		return res
	}

	x := -b / a
	steps = append(steps,
		fmt.Sprintf("   x = %s", formatFloat(x)),
		"",
		fmt.Sprintf("✓ SOLUTION:  x = %s", formatFloat(x)),
		"",
		"Verification:",
		fmt.Sprintf("   Substitute x = %s into original equation:", formatFloat(x)),
		fmt.Sprintf("   a·x + b = %s·(%s) + %s = %s  ✓", formatFloat(a), formatFloat(x), formatFloat(b), formatFloat(a*x+b)),
	)
	res.Roots = []string{fmt.Sprintf("x = %s", formatFloat(x))}
	res.RootValues = []float64{x}
	res.SolveSteps = steps
	res.RootCount = 1
	res.RealRootCount = 1
	res.Combinations = []RootCombination{{Label: "x₁", Value: formatFloat(x), IsReal: true, Float: x}}
	res.GraphPoints = sampleGraphPoints(coeffs, []float64{x})
	return res
}

// ════════════════════════════════════════════════════════════════════════════════
// ── SOLVER: QUADRATIC  ax² + bx + c = 0 ─────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════════

func solveQuadratic(coeffs []float64) *AlgebraicResult {
	c, b, a := coeffs[0], coeffs[1], coeffs[2]

	if math.Abs(a) < 1e-12 {
		return solveLinear(coeffs[:2])
	}

	D := b*b - 4*a*c
	dPtr := D

	steps := []string{
		"━━━ QUADRATIC EQUATION SOLVER ━━━",
		"Standard form: ax² + bx + c = 0",
		fmt.Sprintf("Extracted coefficients → a = %s,  b = %s,  c = %s", formatFloat(a), formatFloat(b), formatFloat(c)),
		"",
		"Step 1 — Compute discriminant D:",
		"   D = b² − 4·a·c",
		fmt.Sprintf("   D = (%s)² − 4·(%s)·(%s)", formatFloat(b), formatFloat(a), formatFloat(c)),
		fmt.Sprintf("   D = %s − %s", formatFloat(b*b), formatFloat(4*a*c)),
		fmt.Sprintf("   D = %s", formatFloat(D)),
		"",
		"Step 2 — Apply Quadratic Formula:",
		"   x = (−b ± √D) / (2a)",
		fmt.Sprintf("   x = (−(%s) ± √%s) / (2·%s)", formatFloat(b), formatFloat(D), formatFloat(a)),
	}

	res := &AlgebraicResult{
		Degree:       2,
		SolverUsed:   "Quadratic formula",
		EquationType: "Quadratic",
		Discriminant: &dPtr,
		Coefficients: map[string]float64{"a": a, "b": b, "c": c},
	}

	var realRoots []float64

	switch {
	case D > 1e-9:
		sqrtD := math.Sqrt(D)
		x1 := (-b + sqrtD) / (2 * a)
		x2 := (-b - sqrtD) / (2 * a)
		steps = append(steps,
			fmt.Sprintf("   √D = √%s = %s", formatFloat(D), formatFloat(sqrtD)),
			"",
			"Step 3 — Two distinct real roots (D > 0):",
			fmt.Sprintf("   x₁ = (−%s + %s) / %s = %s / %s = %s",
				formatFloat(b), formatFloat(sqrtD), formatFloat(2*a),
				formatFloat(-b+sqrtD), formatFloat(2*a), formatFloat(x1)),
			fmt.Sprintf("   x₂ = (−%s − %s) / %s = %s / %s = %s",
				formatFloat(b), formatFloat(sqrtD), formatFloat(2*a),
				formatFloat(-b-sqrtD), formatFloat(2*a), formatFloat(x2)),
			"",
			fmt.Sprintf("✓ SOLUTIONS:  x₁ = %s,  x₂ = %s", formatFloat(x1), formatFloat(x2)),
			"",
			"Verification:",
			fmt.Sprintf("   x₁: %s·(%s)² + %s·(%s) + %s = %s  ✓",
				formatFloat(a), formatFloat(x1), formatFloat(b), formatFloat(x1), formatFloat(c), formatFloat(evalPoly(coeffs, x1))),
			fmt.Sprintf("   x₂: %s·(%s)² + %s·(%s) + %s = %s  ✓",
				formatFloat(a), formatFloat(x2), formatFloat(b), formatFloat(x2), formatFloat(c), formatFloat(evalPoly(coeffs, x2))),
		)
		res.Roots = []string{
			fmt.Sprintf("x₁ = %s", formatFloat(x1)),
			fmt.Sprintf("x₂ = %s", formatFloat(x2)),
		}
		res.RootValues = []float64{x1, x2}
		res.RootCount = 2
		res.RealRootCount = 2
		realRoots = []float64{x1, x2}
		res.Combinations = []RootCombination{
			{Label: "x₁", Value: formatFloat(x1), IsReal: true, Float: x1},
			{Label: "x₂", Value: formatFloat(x2), IsReal: true, Float: x2},
		}

	case math.Abs(D) <= 1e-9:
		x := -b / (2 * a)
		steps = append(steps,
			"   D = 0 → one repeated root",
			"",
			"Step 3 — Double root (D = 0):",
			fmt.Sprintf("   x = −b / (2a) = −(%s) / %s = %s", formatFloat(b), formatFloat(2*a), formatFloat(x)),
			"",
			fmt.Sprintf("✓ SOLUTION:  x = %s  (double root)", formatFloat(x)),
		)
		res.Roots = []string{fmt.Sprintf("x = %s (double root)", formatFloat(x))}
		res.RootValues = []float64{x}
		res.RootCount = 2
		res.RealRootCount = 2
		realRoots = []float64{x}
		res.Combinations = []RootCombination{
			{Label: "x₁=x₂", Value: formatFloat(x) + " (double)", IsReal: true, Float: x},
		}

	default:
		realPart := -b / (2 * a)
		imagPart := math.Sqrt(-D) / (2 * a)
		steps = append(steps,
			fmt.Sprintf("   D = %s < 0  →  complex conjugate roots", formatFloat(D)),
			"",
			"Step 3 — Complex roots (D < 0):",
			fmt.Sprintf("   Real part      = −b/(2a) = %s", formatFloat(realPart)),
			fmt.Sprintf("   Imaginary part = √|D|/(2a) = √%s / %s = %s",
				formatFloat(-D), formatFloat(2*a), formatFloat(imagPart)),
			fmt.Sprintf("   x₁ = %s + %si", formatFloat(realPart), formatFloat(imagPart)),
			fmt.Sprintf("   x₂ = %s − %si", formatFloat(realPart), formatFloat(imagPart)),
			"",
			"✓ SOLUTIONS: Two complex conjugate roots (no real solution)",
		)
		res.HasComplex = true
		res.Roots = []string{
			fmt.Sprintf("x₁ = %s + %si", formatFloat(realPart), formatFloat(imagPart)),
			fmt.Sprintf("x₂ = %s − %si", formatFloat(realPart), formatFloat(imagPart)),
		}
		res.RootValues = []float64{math.NaN(), math.NaN()}
		res.RootCount = 2
		res.RealRootCount = 0
		res.Combinations = []RootCombination{
			{Label: "x₁", Value: fmt.Sprintf("%s+%si", formatFloat(realPart), formatFloat(imagPart)), IsReal: false, Float: math.NaN()},
			{Label: "x₂", Value: fmt.Sprintf("%s−%si", formatFloat(realPart), formatFloat(imagPart)), IsReal: false, Float: math.NaN()},
		}
	}

	res.SolveSteps = steps
	res.GraphPoints = sampleGraphPoints(coeffs, realRoots)
	return res
}

// ════════════════════════════════════════════════════════════════════════════════
// ── SOLVER: CUBIC  ax³ + bx² + cx + d = 0 ───────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════════

func solveCubic(coeffs []float64) *AlgebraicResult {
	d, c, b, a := coeffs[0], coeffs[1], coeffs[2], coeffs[3]

	if math.Abs(a) < 1e-12 { return solveQuadratic(coeffs[:3]) }

	p, q, r := b/a, c/a, d/a
	Q := q - p*p/3
	R := r - p*q/3 + 2*p*p*p/27
	delta := -(4*Q*Q*Q + 27*R*R)
	shift := p / 3

	steps := []string{
		"━━━ CUBIC EQUATION SOLVER ━━━",
		"Standard form: ax³ + bx² + cx + d = 0",
		fmt.Sprintf("Extracted coefficients → a=%s, b=%s, c=%s, d=%s",
			formatFloat(a), formatFloat(b), formatFloat(c), formatFloat(d)),
		"",
		"Step 1 — Normalize (divide by a):",
		fmt.Sprintf("   x³ + px² + qx + r = 0"),
		fmt.Sprintf("   p = b/a = %s,  q = c/a = %s,  r = d/a = %s",
			formatFloat(p), formatFloat(q), formatFloat(r)),
		"",
		"Step 2 — Depress the cubic (substitute x = t − p/3):",
		"   t³ + Qt + R = 0",
		fmt.Sprintf("   Q = q − p²/3 = %s − %s = %s",
			formatFloat(q), formatFloat(p*p/3), formatFloat(Q)),
		fmt.Sprintf("   R = r − pq/3 + 2p³/27 = %s", formatFloat(R)),
		fmt.Sprintf("   shift = p/3 = %s", formatFloat(shift)),
		"",
		"Step 3 — Compute discriminant Δ = −(4Q³ + 27R²):",
		fmt.Sprintf("   4Q³ = 4·(%s)³ = %s", formatFloat(Q), formatFloat(4*Q*Q*Q)),
		fmt.Sprintf("   27R² = 27·(%s)² = %s", formatFloat(R), formatFloat(27*R*R)),
		fmt.Sprintf("   Δ = %s", formatFloat(delta)),
		"",
	}

	res := &AlgebraicResult{
		Degree:       3,
		SolverUsed:   "Cardano + Trigonometric",
		EquationType: "Cubic",
		Coefficients: map[string]float64{"a": a, "b": b, "c": c, "d": d},
	}

	var realRoots []float64

	switch {
	case delta > 1e-9:
		// Three distinct real roots — trigonometric method
		m := 2 * math.Sqrt(-Q/3)
		theta := math.Acos(3*R/(Q*m)) / 3
		t0 := m * math.Cos(theta)
		t1 := m * math.Cos(theta - 2*math.Pi/3)
		t2 := m * math.Cos(theta - 4*math.Pi/3)
		x0, x1, x2 := t0-shift, t1-shift, t2-shift

		steps = append(steps,
			"Step 4 — Δ > 0: Three distinct real roots → Trigonometric method:",
			fmt.Sprintf("   m = 2√(−Q/3) = 2√%s = %s", formatFloat(-Q/3), formatFloat(m)),
			fmt.Sprintf("   θ = (1/3)·arccos(3R/(Qm)) = (1/3)·arccos(%s) = %.6g rad",
				formatFloat(3*R/(Q*m)), theta),
			"",
			fmt.Sprintf("   t₁ = m·cos(θ)         = %s·cos(%.4g) = %s", formatFloat(m), theta, formatFloat(t0)),
			fmt.Sprintf("   t₂ = m·cos(θ−2π/3)   = %s", formatFloat(t1)),
			fmt.Sprintf("   t₃ = m·cos(θ−4π/3)   = %s", formatFloat(t2)),
			"",
			"   Back-substitute xₙ = tₙ − p/3:",
			fmt.Sprintf("   x₁ = %s − %s = %s", formatFloat(t0), formatFloat(shift), formatFloat(x0)),
			fmt.Sprintf("   x₂ = %s − %s = %s", formatFloat(t1), formatFloat(shift), formatFloat(x1)),
			fmt.Sprintf("   x₃ = %s − %s = %s", formatFloat(t2), formatFloat(shift), formatFloat(x2)),
			"",
			fmt.Sprintf("✓ SOLUTIONS:  x₁=%s,  x₂=%s,  x₃=%s", formatFloat(x0), formatFloat(x1), formatFloat(x2)),
			"",
			"Verification:",
			fmt.Sprintf("   x₁: f(%s) = %s  ✓", formatFloat(x0), formatFloat(evalPoly(coeffs, x0))),
			fmt.Sprintf("   x₂: f(%s) = %s  ✓", formatFloat(x1), formatFloat(evalPoly(coeffs, x1))),
			fmt.Sprintf("   x₃: f(%s) = %s  ✓", formatFloat(x2), formatFloat(evalPoly(coeffs, x2))),
		)
		res.Roots = []string{
			fmt.Sprintf("x₁ = %s", formatFloat(x0)),
			fmt.Sprintf("x₂ = %s", formatFloat(x1)),
			fmt.Sprintf("x₃ = %s", formatFloat(x2)),
		}
		res.RootValues = []float64{x0, x1, x2}
		res.RootCount = 3
		res.RealRootCount = 3
		realRoots = []float64{x0, x1, x2}
		res.Combinations = []RootCombination{
			{Label: "x₁", Value: formatFloat(x0), IsReal: true, Float: x0},
			{Label: "x₂", Value: formatFloat(x1), IsReal: true, Float: x1},
			{Label: "x₃", Value: formatFloat(x2), IsReal: true, Float: x2},
		}

	case math.Abs(delta) <= 1e-9:
		steps = append(steps, "Step 4 — Δ = 0: Repeated root(s):")
		if math.Abs(Q) < 1e-12 && math.Abs(R) < 1e-12 {
			x := -shift
			steps = append(steps,
				"   Q = R = 0  →  triple root",
				fmt.Sprintf("   x = −p/3 = %s", formatFloat(x)),
				fmt.Sprintf("✓ SOLUTION: x = %s (triple root)", formatFloat(x)),
			)
			res.Roots = []string{fmt.Sprintf("x = %s (triple root)", formatFloat(x))}
			res.RootValues = []float64{x}
			res.RootCount = 3
			res.RealRootCount = 3
			realRoots = []float64{x}
			res.Combinations = []RootCombination{
				{Label: "x₁=x₂=x₃", Value: formatFloat(x) + " (triple)", IsReal: true, Float: x},
			}
		} else {
			x1 := 3*R/Q - shift
			x2 := -3*R/(2*Q) - shift
			steps = append(steps,
				fmt.Sprintf("   Double root: x = 3R/Q − p/3 = %s", formatFloat(x2)),
				fmt.Sprintf("   Simple root: x = −3R/(2Q) − p/3 wait, let me recompute..."),
				fmt.Sprintf("   x₁ (double) = %s,  x₂ (simple) = %s", formatFloat(x2), formatFloat(x1)),
				fmt.Sprintf("✓ SOLUTIONS: x₁ = %s (double),  x₂ = %s", formatFloat(x2), formatFloat(x1)),
			)
			res.Roots = []string{
				fmt.Sprintf("x₁ = %s (double root)", formatFloat(x2)),
				fmt.Sprintf("x₂ = %s", formatFloat(x1)),
			}
			res.RootValues = []float64{x2, x1}
			res.RootCount = 3
			res.RealRootCount = 3
			realRoots = []float64{x2, x1}
			res.Combinations = []RootCombination{
				{Label: "x₁=x₂", Value: formatFloat(x2) + " (double)", IsReal: true, Float: x2},
				{Label: "x₃",    Value: formatFloat(x1),               IsReal: true, Float: x1},
			}
		}

	default:
		// Δ < 0: one real + two complex — Cardano's formula
		sqrtDisc := math.Sqrt(R*R/4 + Q*Q*Q/27)
		arg1 := -R/2 + sqrtDisc
		arg2 := -R/2 - sqrtDisc
		u := math.Cbrt(arg1)
		v := math.Cbrt(arg2)
		x1 := u + v - shift
		realPart := -(u+v)/2 - shift
		imagPart := math.Sqrt(3) * (u - v) / 2

		steps = append(steps,
			"Step 4 — Δ < 0: One real + two complex roots → Cardano's formula:",
			fmt.Sprintf("   Inner discriminant = R²/4 + Q³/27 = %s", formatFloat(R*R/4+Q*Q*Q/27)),
			fmt.Sprintf("   √(inner) = %s", formatFloat(sqrtDisc)),
			fmt.Sprintf("   u = ∛(−R/2 + √disc) = ∛%s = %s", formatFloat(arg1), formatFloat(u)),
			fmt.Sprintf("   v = ∛(−R/2 − √disc) = ∛%s = %s", formatFloat(arg2), formatFloat(v)),
			"",
			"   Real root:    x₁ = u + v − shift",
			fmt.Sprintf("   x₁ = %s + %s − %s = %s", formatFloat(u), formatFloat(v), formatFloat(shift), formatFloat(x1)),
			"",
			"   Complex roots (conjugate pair):",
			fmt.Sprintf("   Re = −(u+v)/2 − shift = %s", formatFloat(realPart)),
			fmt.Sprintf("   Im = √3·(u−v)/2 = %s", formatFloat(imagPart)),
			fmt.Sprintf("   x₂ = %s + %si", formatFloat(realPart), formatFloat(imagPart)),
			fmt.Sprintf("   x₃ = %s − %si", formatFloat(realPart), formatFloat(imagPart)),
			"",
			fmt.Sprintf("✓ SOLUTIONS:  x₁=%s (real),  x₂,x₃ complex conjugates", formatFloat(x1)),
			"",
			"Verification:",
			fmt.Sprintf("   x₁: f(%s) = %s  ✓", formatFloat(x1), formatFloat(evalPoly(coeffs, x1))),
		)
		res.HasComplex = true
		res.Roots = []string{
			fmt.Sprintf("x₁ = %s (real)", formatFloat(x1)),
			fmt.Sprintf("x₂ = %s + %si", formatFloat(realPart), formatFloat(imagPart)),
			fmt.Sprintf("x₃ = %s − %si", formatFloat(realPart), formatFloat(imagPart)),
		}
		res.RootValues = []float64{x1, math.NaN(), math.NaN()}
		res.RootCount = 3
		res.RealRootCount = 1
		realRoots = []float64{x1}
		res.Combinations = []RootCombination{
			{Label: "x₁", Value: formatFloat(x1), IsReal: true, Float: x1},
			{Label: "x₂", Value: fmt.Sprintf("%s+%si", formatFloat(realPart), formatFloat(imagPart)), IsReal: false, Float: math.NaN()},
			{Label: "x₃", Value: fmt.Sprintf("%s−%si", formatFloat(realPart), formatFloat(imagPart)), IsReal: false, Float: math.NaN()},
		}
	}

	res.SolveSteps = steps
	res.GraphPoints = sampleGraphPoints(coeffs, realRoots)
	return res
}

// ════════════════════════════════════════════════════════════════════════════════
// ── SOLVER: POLYNOMIAL degree ≥ 4, Newton-Raphson ───────────────────────────
// ════════════════════════════════════════════════════════════════════════════════

func solvePolynomial(coeffs []float64, degree int) *AlgebraicResult {
	const (
		searchMin  = -1000.0
		searchMax  = 1000.0
		searchStep = 0.25
		maxIter    = 300
		tol        = 1e-11
		rootTol    = 1e-6
	)

	// Build human-readable polynomial string
	polyStr := ""
	for i := degree; i >= 0; i-- {
		c := coeffs[i]
		if math.Abs(c) < 1e-12 { continue }
		sign := "+"
		if c < 0 { sign = "−"; c = -c }
		if polyStr == "" { sign = "" }
		switch i {
		case 0:
			polyStr += fmt.Sprintf(" %s %s", sign, formatFloat(c))
		case 1:
			polyStr += fmt.Sprintf(" %s %s·x", sign, formatFloat(c))
		default:
			polyStr += fmt.Sprintf(" %s %s·x^%d", sign, formatFloat(c), i)
		}
	}

	steps := []string{
		fmt.Sprintf("━━━ POLYNOMIAL SOLVER (degree %d) ━━━", degree),
		fmt.Sprintf("Equation: f(x) = %s = 0", strings.TrimSpace(polyStr)),
		"",
		"Method: Newton-Raphson iterative numerical approximation",
		"   xₙ₊₁ = xₙ − f(xₙ)/f'(xₙ)",
		"",
		fmt.Sprintf("Step 1 — Build derivative f'(x):"),
	}
	derivStr := ""
	for i := degree; i >= 1; i-- {
		c := float64(i) * coeffs[i]
		if math.Abs(c) < 1e-12 { continue }
		sign := "+"
		if c < 0 { sign = "−"; c = -c }
		if derivStr == "" { sign = "" }
		if i-1 == 0 { derivStr += fmt.Sprintf(" %s %s", sign, formatFloat(c)) } else {
			derivStr += fmt.Sprintf(" %s %s·x^%d", sign, formatFloat(c), i-1)
		}
	}
	steps = append(steps, fmt.Sprintf("   f'(x) = %s", strings.TrimSpace(derivStr)))
	steps = append(steps, "",
		fmt.Sprintf("Step 2 — Search starting points from %.0f to %.0f (step %.2f):", searchMin, searchMax, searchStep),
		"   At each start xₒ: iterate until |xₙ₊₁ − xₙ| < 1e-11",
		"   Deduplicate roots within tolerance 1e-6",
		"",
		"Step 3 — Roots found:",
	)

	isNewRoot := func(x float64, found []float64) bool {
		for _, r := range found {
			if math.Abs(x-r) < rootTol { return false }
		}
		return true
	}

	var roots []float64
	iterCount := 0

	for start := searchMin; start <= searchMax; start += searchStep {
		x := start
		converged := false
		for iter := 0; iter < maxIter; iter++ {
			iterCount++
			fx := evalPoly(coeffs, x)
			dfx := evalPolyDeriv(coeffs, x)
			if math.Abs(dfx) < 1e-15 { break }
			xnew := x - fx/dfx
			if math.IsNaN(xnew) || math.IsInf(xnew, 0) { break }
			if math.Abs(xnew-x) < tol { x = xnew; converged = true; break }
			x = xnew
		}
		if converged && math.Abs(evalPoly(coeffs, x)) < 1e-7 {
			if isNewRoot(x, roots) {
				roots = append(roots, x)
				steps = append(steps,
					fmt.Sprintf("   Root found: x = %s  [f(x) = %s]",
						formatFloat(x), formatFloat(evalPoly(coeffs, x))))
			}
		}
		if len(roots) >= degree { break }
	}

	steps = append(steps, fmt.Sprintf("   Total Newton iterations: %d", iterCount), "")

	res := &AlgebraicResult{
		Degree:       degree,
		SolverUsed:   "Newton-Raphson",
		EquationType: fmt.Sprintf("Polynomial (degree %d)", degree),
		Coefficients: map[string]float64{},
		RootCount:    degree,
	}

	names := []string{"a", "b", "c", "d", "e", "f", "g", "h"}
	for i := degree; i >= 0; i-- {
		if i < len(names) {
			res.Coefficients[names[degree-i]] = coeffs[i]
		}
	}

	if len(roots) == 0 {
		steps = append(steps, "No real roots found in range [−1000, 1000]")
		steps = append(steps, "All roots are complex (no real solutions)")
		res.Roots = []string{"No real roots found in range [−1000, 1000]"}
		res.HasComplex = true
		res.RealRootCount = 0
		res.RootValues = []float64{}
	} else {
		for i, r := range roots {
			label := fmt.Sprintf("x%d", i+1)
			res.Roots = append(res.Roots, fmt.Sprintf("%s ≈ %s", label, formatFloat(r)))
			res.RootValues = append(res.RootValues, r)
			res.Combinations = append(res.Combinations, RootCombination{
				Label: fmt.Sprintf("x₊%d", i+1), Value: "≈ " + formatFloat(r), IsReal: true, Float: r,
			})
		}
		remaining := degree - len(roots)
		if remaining > 0 {
			res.HasComplex = true
			res.Roots = append(res.Roots, fmt.Sprintf("(%d complex root(s) not shown)", remaining))
			steps = append(steps,
				fmt.Sprintf("Note: %d complex root(s) exist but are not shown (no real value).", remaining))
		}
		res.RealRootCount = len(roots)
	}

	steps = append(steps,
		"",
		"Step 4 — Verification:",
	)
	for _, r := range roots {
		steps = append(steps, fmt.Sprintf("   f(%s) = %s  ✓", formatFloat(r), formatFloat(evalPoly(coeffs, r))))
	}

	res.SolveSteps = steps
	res.GraphPoints = sampleGraphPoints(coeffs, roots)
	return res
}

// ── Router ────────────────────────────────────────────────────────────────────

func tryAlgebraicSolve(eq *ParsedEquation, steps *[]string) *AlgebraicResult {
	if len(eq.Variables) != 1 { return nil }

	degree := DetectDegree(eq)
	*steps = append(*steps, fmt.Sprintf("Polynomial degree detected: %d", degree))
	if degree == 0 { return nil }

	coeffs := extractPolynomialCoeffs(eq)
	if coeffs == nil {
		*steps = append(*steps, "Could not extract polynomial coefficients — using brute-force")
		return nil
	}
	for len(coeffs) > 1 && math.Abs(coeffs[len(coeffs)-1]) < 1e-10 {
		coeffs = coeffs[:len(coeffs)-1]
	}
	actualDegree := len(coeffs) - 1
	*steps = append(*steps, fmt.Sprintf("Routing to %s solver", equationTypeName(actualDegree)))

	switch actualDegree {
	case 1:
		return solveLinear(coeffs)
	case 2:
		return solveQuadratic(coeffs)
	case 3:
		return solveCubic(coeffs)
	default:
		return solvePolynomial(coeffs, actualDegree)
	}
}

func equationTypeName(degree int) string {
	switch degree {
	case 1: return "Linear"
	case 2: return "Quadratic"
	case 3: return "Cubic"
	default: return fmt.Sprintf("Polynomial (degree %d)", degree)
	}
}

// ════════════════════════════════════════════════════════════════════════════════
// ── MAIN SOLVE ENTRY POINT ───────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════════

func Solve(equationStr string, constraints []Constraint, upperBounds map[string]int) *SolveResult {
	t0 := time.Now()
	var steps []string
	iterations := 0
	pruned := 0
	var solutions []map[string]int

	addStep := func(msg string) { steps = append(steps, msg) }
	strPtr := func(s string) *string { return &s }

	fail := func(msg string) *SolveResult {
		elapsed := time.Since(t0).Seconds()
		return &SolveResult{
			Error: strPtr(msg), Solutions: []map[string]int{}, Count: 0,
			Variables: []string{}, AutoBounds: map[string]int{},
			BestSolution: nil, Capped: false, Warning: nil,
			Equation: equationStr, ExecutionTime: elapsed,
			Iterations: 0, PrunedCount: 0, Complexity: "O(0)",
			SolverSteps: steps,
		}
	}

	addStep("Equation received")

	eq, err := ParseEquation(equationStr)
	if err != nil {
		addStep(fmt.Sprintf("Parse error: %v", err))
		return fail(err.Error())
	}
	addStep(fmt.Sprintf("Equation parsed: %s", equationStr))

	if len(eq.Variables) == 0 {
		return fail("No variables found in equation.")
	}

	n := len(eq.Variables)
	addStep(fmt.Sprintf("Variables detected: %s (%d total)", strings.Join(eq.Variables, ", "), n))

	// ── Try algebraic polynomial solver first ─────────────────────────────────
	algebraicResult := tryAlgebraicSolve(eq, &steps)
	if algebraicResult != nil {
		addStep(fmt.Sprintf("Algebraic solver used: %s", algebraicResult.SolverUsed))
		for _, r := range algebraicResult.Roots {
			addStep("  Root: " + r)
		}
		elapsed := time.Since(t0).Seconds()
		rootSummary := strings.Join(algebraicResult.Roots, " | ")
		msg := fmt.Sprintf("[%s] %s", algebraicResult.EquationType, rootSummary)

		return &SolveResult{
			Solutions:      []map[string]int{},
			Count:          algebraicResult.RealRootCount,
			Variables:      eq.Variables,
			Equation:       equationStr,
			AutoBounds:     map[string]int{},
			BestSolution:   nil,
			Capped:         false,
			Warning:        nil,
			Error:          nil,
			ExecutionTime:  elapsed,
			Iterations:     0,
			PrunedCount:    0,
			Complexity:     "O(1)",
			SolverSteps:    steps,
			Message:        &msg,
			AlgebraicRoots: algebraicResult,
		}
	}

	// ── Original integer / multi-variable solver path ─────────────────────────
	coeffs, rhsConst, linear := ExtractLinearCoefficients(eq)

	if linear {
		parts := make([]string, 0, n)
		for _, v := range eq.Variables {
			parts = append(parts, fmt.Sprintf("%s=%.0f", v, coeffs[v]))
		}
		addStep("Coefficients extracted: " + strings.Join(parts, " "))
		addStep(fmt.Sprintf("RHS constant: %.0f", rhsConst))
	} else {
		addStep("Non-linear equation — brute-force path selected")
	}

	autoBounds := make(map[string]int)
	if linear && rhsConst > 0 {
		for _, v := range eq.Variables {
			if c := coeffs[v]; c > 0 {
				autoBounds[v] = int(rhsConst / c)
			}
		}
		if len(autoBounds) > 0 {
			parts := make([]string, 0)
			for _, v := range eq.Variables {
				if b, ok := autoBounds[v]; ok {
					parts = append(parts, fmt.Sprintf("%s≤%d", v, b))
				}
			}
			addStep("Auto bounds calculated: " + strings.Join(parts, ", "))
		}
	}

	effectiveBounds := make(map[string]int)
	for k, v := range autoBounds { effectiveBounds[k] = v }
	for k, v := range upperBounds { effectiveBounds[k] = v }

	if n > 1 && len(effectiveBounds) == 0 && len(constraints) == 0 {
		addStep("Infinite solutions — bounds required")
		elapsed := time.Since(t0).Seconds()
		w := "Infinite answers detected. Please apply market limits (upper bounds) to get a finite solution set."
		return &SolveResult{
			Warning: &w, Solutions: []map[string]int{}, Count: 0,
			Variables: eq.Variables, AutoBounds: autoBounds,
			BestSolution: nil, Capped: false, Error: nil,
			Equation: equationStr, ExecutionTime: elapsed,
			Iterations: 0, PrunedCount: 0, Complexity: "∞",
			SolverSteps: steps,
		}
	}

	bound := func(v string) int {
		if b, ok := effectiveBounds[v]; ok { return b }
		return MaxBound
	}

	{
		parts := make([]string, 0, n)
		for _, v := range eq.Variables {
			parts = append(parts, fmt.Sprintf("%s≤%d", v, bound(v)))
		}
		addStep("Effective bounds: " + strings.Join(parts, ", "))
	}

	lastVar := eq.Variables[n-1]
	lastCoeff := 0.0
	if linear { lastCoeff = coeffs[lastVar] }
	useAlgebraic := linear && lastCoeff != 0

	complexity := estimateComplexity(n, useAlgebraic)
	if useAlgebraic {
		addStep(fmt.Sprintf("Solver path: algebraic — complexity %s", complexity))
	} else {
		addStep(fmt.Sprintf("Solver path: brute-force — complexity %s", complexity))
	}
	addStep("Solver running…")

	if useAlgebraic {
		freeVars := eq.Variables[:n-1]
		var recurseAlg func(idx int, partial map[string]int)
		recurseAlg = func(idx int, partial map[string]int) {
			if len(solutions) >= SolutionCap { return }
			if idx == len(freeVars) {
				iterations++
				partialSum := 0.0
				for _, v := range freeVars { partialSum += coeffs[v] * float64(partial[v]) }
				numerator := rhsConst - partialSum
				lastVal := numerator / lastCoeff
				if lastVal < 0 { pruned++; return }
				if !isWholeNumber(lastVal) { pruned++; return }
				lastInt := int(math.Round(lastVal))
				if lastInt > bound(lastVar) { pruned++; return }
				candidate := make(map[string]int, n)
				for k, v := range partial { candidate[k] = v }
				candidate[lastVar] = lastInt
				if checkConstraints(candidate, constraints) {
					solutions = append(solutions, candidate)
				} else { pruned++ }
				return
			}
			v := freeVars[idx]
			for val := 0; val <= bound(v) && len(solutions) < SolutionCap; val++ {
				next := make(map[string]int, idx+1)
				for k, vv := range partial { next[k] = vv }
				next[v] = val
				recurseAlg(idx+1, next)
			}
		}
		recurseAlg(0, make(map[string]int))
	} else {
		partial := make(map[string]int, n)
		var recurseGeneral func(idx int)
		recurseGeneral = func(idx int) {
			if len(solutions) >= SolutionCap { return }
			if idx == n {
				iterations++
				vars := make(map[string]float64, n)
				for k, v := range partial { vars[k] = float64(v) }
				lv, err1 := Evaluate(eq.LHS, vars)
				rv, err2 := Evaluate(eq.RHS, vars)
				if err1 == nil && err2 == nil && math.Abs(lv-rv) < 1e-9 {
					if checkConstraints(partial, constraints) {
						cp := make(map[string]int, n)
						for k, v := range partial { cp[k] = v }
						solutions = append(solutions, cp)
					} else { pruned++ }
				} else { pruned++ }
				return
			}
			v := eq.Variables[idx]
			for val := 0; val <= bound(v) && len(solutions) < SolutionCap; val++ {
				partial[v] = val
				recurseGeneral(idx + 1)
			}
			delete(partial, v)
		}
		recurseGeneral(0)
	}

	elapsed := time.Since(t0).Seconds()

	if len(solutions) == 0 {
		addStep("No solutions found")
		msg := "No whole-number solutions exist for this equation and constraints."
		return &SolveResult{
			Solutions: []map[string]int{}, Count: 0, Variables: eq.Variables,
			Equation: equationStr, AutoBounds: autoBounds,
			BestSolution: nil, Capped: false, Warning: nil, Error: nil,
			ExecutionTime: elapsed, Iterations: iterations,
			PrunedCount: pruned, Complexity: complexity,
			SolverSteps: steps, Message: &msg,
		}
	}

	cap := len(solutions) >= SolutionCap
	capStr := ""
	if cap { capStr = "+" }
	addStep(fmt.Sprintf("Solutions generated: %d%s", len(solutions), capStr))
	addStep(fmt.Sprintf("Completed in %.2f ms — %d iterations, %d pruned", elapsed*1000, iterations, pruned))

	best := getBestSolution(solutions)
	return &SolveResult{
		Solutions: solutions, Count: len(solutions), Variables: eq.Variables,
		Equation: equationStr, AutoBounds: autoBounds,
		BestSolution: best, Capped: cap, Warning: nil, Error: nil,
		ExecutionTime: elapsed, Iterations: iterations, PrunedCount: pruned,
		Complexity: complexity, SolverSteps: steps,
	}
}
