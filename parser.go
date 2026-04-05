// parser.go — Module 2: Recursive Descent Parser + AST evaluator
// Extended: power operator (^) via parsePower(), UnaryMinusExpr, PowerExpr AST node.

package main

import (
	"fmt"
	"math"
)

// ── AST nodes ─────────────────────────────────────────────────────────────────

type Expr interface {
	exprNode()
}

type NumExpr struct {
	Value float64
}

type VarExpr struct {
	Name string
}

type BinOpExpr struct {
	Left  Expr
	Op    string
	Right Expr
}

// PowerExpr represents base^exp — a dedicated node so degree detection can walk it.
type PowerExpr struct {
	Base Expr
	Exp  Expr
}

func (*NumExpr) exprNode()   {}
func (*VarExpr) exprNode()   {}
func (*BinOpExpr) exprNode() {}
func (*PowerExpr) exprNode() {}

// ── Errors ────────────────────────────────────────────────────────────────────

type ParseError struct{ Msg string }
type MathError struct{ Msg string }

func (e *ParseError) Error() string { return e.Msg }
func (e *MathError) Error() string  { return e.Msg }

// ── Parser ────────────────────────────────────────────────────────────────────

type Parser struct {
	tokens []Token
	pos    int
}

func NewParser(tokens []Token) *Parser {
	return &Parser{tokens: tokens}
}

func (p *Parser) current() Token {
	return p.tokens[p.pos]
}

func (p *Parser) eat(t TokenType) (Token, error) {
	tok := p.current()
	if tok.Type != t {
		return Token{}, &ParseError{
			Msg: fmt.Sprintf("expected %s but got %s (value=%v) at position %d",
				t, tok.Type, tok.StrVal+fmt.Sprintf("%v", tok.NumVal), tok.Pos),
		}
	}
	p.pos++
	return tok, nil
}

// expr : term ((PLUS | MINUS) term)*
func (p *Parser) parseExpr() (Expr, error) {
	node, err := p.parseTerm()
	if err != nil {
		return nil, err
	}
	for p.current().Type == TPlus || p.current().Type == TMinus {
		op := "+"
		if p.current().Type == TMinus {
			op = "-"
		}
		p.pos++
		right, err := p.parseTerm()
		if err != nil {
			return nil, err
		}
		node = &BinOpExpr{Left: node, Op: op, Right: right}
	}
	return node, nil
}

// term : power ((STAR | SLASH) power)* | NUMBER VAR (implicit multiply)
func (p *Parser) parseTerm() (Expr, error) {
	node, err := p.parsePower()
	if err != nil {
		return nil, err
	}
	for {
		cur := p.current()
		if cur.Type == TStar || cur.Type == TSlash {
			op := "*"
			if cur.Type == TSlash {
				op = "/"
			}
			p.pos++
			right, err := p.parsePower()
			if err != nil {
				return nil, err
			}
			node = &BinOpExpr{Left: node, Op: op, Right: right}
		} else if cur.Type == TVar || cur.Type == TLParen {
			// implicit multiply: only when left side is a number
			if _, ok := node.(*NumExpr); ok {
				right, err := p.parsePower()
				if err != nil {
					return nil, err
				}
				node = &BinOpExpr{Left: node, Op: "*", Right: right}
			} else {
				break
			}
		} else {
			break
		}
	}
	return node, nil
}

// parsePower : factor (CARET factor)*
// Right-associative: x^2^3 = x^(2^3). Integer exponent only for degree detection.
func (p *Parser) parsePower() (Expr, error) {
	base, err := p.parseFactor()
	if err != nil {
		return nil, err
	}
	if p.current().Type == TCaret {
		p.pos++ // consume ^
		exp, err := p.parseFactor()
		if err != nil {
			return nil, err
		}
		return &PowerExpr{Base: base, Exp: exp}, nil
	}
	return base, nil
}

// factor : NUMBER | VAR | LPAREN expr RPAREN | MINUS factor
func (p *Parser) parseFactor() (Expr, error) {
	tok := p.current()

	switch tok.Type {
	case TNumber:
		p.pos++
		return &NumExpr{Value: tok.NumVal}, nil

	case TVar:
		p.pos++
		return &VarExpr{Name: tok.StrVal}, nil

	case TLParen:
		p.pos++
		node, err := p.parseExpr()
		if err != nil {
			return nil, err
		}
		if _, err := p.eat(TRParen); err != nil {
			return nil, err
		}
		return node, nil

	case TMinus:
		p.pos++
		factor, err := p.parseFactor()
		if err != nil {
			return nil, err
		}
		return &BinOpExpr{Left: &NumExpr{Value: 0}, Op: "-", Right: factor}, nil

	default:
		return nil, &ParseError{
			Msg: fmt.Sprintf("unexpected token %s (value=%q) at position %d",
				tok.Type, tok.StrVal, tok.Pos),
		}
	}
}

// ParseEquation parses "LHS = RHS" and returns both sides.
func (p *Parser) ParseEquation() (lhs Expr, rhs Expr, err error) {
	lhs, err = p.parseExpr()
	if err != nil {
		return
	}
	if _, err = p.eat(TEquals); err != nil {
		return
	}
	rhs, err = p.parseExpr()
	if err != nil {
		return
	}
	if p.current().Type != TEOF {
		tok := p.current()
		err = &ParseError{
			Msg: fmt.Sprintf("unexpected token after equation: %s at position %d", tok.Type, tok.Pos),
		}
	}
	return
}

// ── Evaluate ──────────────────────────────────────────────────────────────────

func Evaluate(node Expr, vars map[string]float64) (float64, error) {
	switch n := node.(type) {
	case *NumExpr:
		return n.Value, nil
	case *VarExpr:
		v, ok := vars[n.Name]
		if !ok {
			return 0, &MathError{Msg: fmt.Sprintf("unknown variable %q", n.Name)}
		}
		return v, nil
	case *PowerExpr:
		base, err := Evaluate(n.Base, vars)
		if err != nil {
			return 0, err
		}
		exp, err := Evaluate(n.Exp, vars)
		if err != nil {
			return 0, err
		}
		return math.Pow(base, exp), nil
	case *BinOpExpr:
		left, err := Evaluate(n.Left, vars)
		if err != nil {
			return 0, err
		}
		right, err := Evaluate(n.Right, vars)
		if err != nil {
			return 0, err
		}
		switch n.Op {
		case "+":
			return left + right, nil
		case "-":
			return left - right, nil
		case "*":
			return left * right, nil
		case "/":
			if right == 0 {
				return 0, &MathError{Msg: "division by zero"}
			}
			return left / right, nil
		}
	}
	return 0, &MathError{Msg: fmt.Sprintf("unknown node type %T", node)}
}

// ── Variable extraction ───────────────────────────────────────────────────────

func GetVariables(node Expr, seen map[string]bool, order *[]string) {
	switch n := node.(type) {
	case *VarExpr:
		if !seen[n.Name] {
			seen[n.Name] = true
			*order = append(*order, n.Name)
		}
	case *BinOpExpr:
		GetVariables(n.Left, seen, order)
		GetVariables(n.Right, seen, order)
	case *PowerExpr:
		GetVariables(n.Base, seen, order)
		GetVariables(n.Exp, seen, order)
	}
}

// ── Full pipeline ─────────────────────────────────────────────────────────────

type ParsedEquation struct {
	LHS       Expr
	RHS       Expr
	Variables []string
}

func ParseEquation(text string) (*ParsedEquation, error) {
	tokens, err := NewLexer(text).Tokenize()
	if err != nil {
		return nil, err
	}
	parser := NewParser(tokens)
	lhs, rhs, err := parser.ParseEquation()
	if err != nil {
		return nil, err
	}
	seen := make(map[string]bool)
	var order []string
	GetVariables(lhs, seen, &order)
	GetVariables(rhs, seen, &order)
	return &ParsedEquation{LHS: lhs, RHS: rhs, Variables: order}, nil
}

// ── Helper: zero-map ──────────────────────────────────────────────────────────

func zeroMap(vars []string) map[string]float64 {
	m := make(map[string]float64, len(vars))
	for _, v := range vars {
		m[v] = 0
	}
	return m
}

// ExtractLinearCoefficients returns coefficients and RHS constant for linear equations.
// Returns nil if the equation is non-linear.
func ExtractLinearCoefficients(eq *ParsedEquation) (coeffs map[string]float64, rhsConst float64, ok bool) {
	defer func() {
		if r := recover(); r != nil {
			ok = false
		}
	}()

	zero := zeroMap(eq.Variables)
	cLHS, err := Evaluate(eq.LHS, zero)
	if err != nil {
		return nil, 0, false
	}
	cRHS, err := Evaluate(eq.RHS, zero)
	if err != nil {
		return nil, 0, false
	}
	rhsConst = cRHS - cLHS

	coeffs = make(map[string]float64, len(eq.Variables))
	for _, v := range eq.Variables {
		probe := zeroMap(eq.Variables)
		probe[v] = 1
		lv, err := Evaluate(eq.LHS, probe)
		if err != nil {
			return nil, 0, false
		}
		rv, err := Evaluate(eq.RHS, probe)
		if err != nil {
			return nil, 0, false
		}
		// Check if relationship is truly linear: f(2x) == 2*f(x)
		probe2 := zeroMap(eq.Variables)
		probe2[v] = 2
		lv2, err := Evaluate(eq.LHS, probe2)
		if err != nil {
			return nil, 0, false
		}
		rv2, err := Evaluate(eq.RHS, probe2)
		if err != nil {
			return nil, 0, false
		}
		coeff := (lv - cLHS) - (rv - cRHS)
		coeff2 := (lv2 - cLHS) - (rv2 - cRHS)
		// If doubling the variable does not double the net coefficient → non-linear
		if math.Abs(coeff2-2*coeff) > 1e-9 {
			return nil, 0, false
		}
		coeffs[v] = coeff
	}
	return coeffs, rhsConst, true
}

// ── Degree detection ──────────────────────────────────────────────────────────

// degreeOfNode returns the highest polynomial degree of a given variable in a node.
func degreeOfNode(node Expr, varName string) int {
	switch n := node.(type) {
	case *NumExpr:
		return 0
	case *VarExpr:
		if n.Name == varName {
			return 1
		}
		return 0
	case *PowerExpr:
		// x^n: if base is the target variable and exp is a constant integer
		if v, ok := n.Base.(*VarExpr); ok && v.Name == varName {
			if e, ok := n.Exp.(*NumExpr); ok {
				return int(math.Round(e.Value))
			}
		}
		// Recurse into base for composed expressions like (x+1)^2
		baseDeg := degreeOfNode(n.Base, varName)
		if expNum, ok := n.Exp.(*NumExpr); ok && baseDeg > 0 {
			return baseDeg * int(math.Round(expNum.Value))
		}
		return degreeOfNode(n.Base, varName)
	case *BinOpExpr:
		switch n.Op {
		case "+", "-":
			l := degreeOfNode(n.Left, varName)
			r := degreeOfNode(n.Right, varName)
			if l > r {
				return l
			}
			return r
		case "*":
			return degreeOfNode(n.Left, varName) + degreeOfNode(n.Right, varName)
		case "/":
			return degreeOfNode(n.Left, varName)
		}
	}
	return 0
}

// DetectDegree returns the highest degree of the primary variable across LHS and RHS.
func DetectDegree(eq *ParsedEquation) int {
	if len(eq.Variables) == 0 {
		return 0
	}
	varName := eq.Variables[0]
	lhsDeg := degreeOfNode(eq.LHS, varName)
	rhsDeg := degreeOfNode(eq.RHS, varName)
	if lhsDeg > rhsDeg {
		return lhsDeg
	}
	return rhsDeg
}

// ── Math helpers ──────────────────────────────────────────────────────────────

func isWholeNumber(f float64) bool {
	return math.Abs(f-math.Round(f)) < 1e-9
}
