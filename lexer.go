// lexer.go — Module 1: Tokenizer
// Direct port of lexer.py — character-by-character scanning, no eval, no external libs.
// Extended: added TCaret token for power operator (^)

package main

import (
	"fmt"
	"unicode"
)

// ── Token types ───────────────────────────────────────────────────────────────

type TokenType int

const (
	TNumber TokenType = iota
	TVar
	TPlus
	TMinus
	TStar
	TSlash
	TCaret  // ^ power operator (NEW)
	TEquals
	TLParen
	TRParen
	TEOF
)

func (t TokenType) String() string {
	switch t {
	case TNumber:
		return "NUMBER"
	case TVar:
		return "VAR"
	case TPlus:
		return "PLUS"
	case TMinus:
		return "MINUS"
	case TStar:
		return "STAR"
	case TSlash:
		return "SLASH"
	case TCaret:
		return "CARET"
	case TEquals:
		return "EQUALS"
	case TLParen:
		return "LPAREN"
	case TRParen:
		return "RPAREN"
	case TEOF:
		return "EOF"
	}
	return "UNKNOWN"
}

// ── Token ─────────────────────────────────────────────────────────────────────

type Token struct {
	Type   TokenType
	NumVal float64 // valid when Type == TNumber
	StrVal string  // valid when Type == TVar
	Pos    int
}

func (t Token) String() string {
	switch t.Type {
	case TNumber:
		return fmt.Sprintf("Token(NUMBER, %v)", t.NumVal)
	case TVar:
		return fmt.Sprintf("Token(VAR, %q)", t.StrVal)
	default:
		return fmt.Sprintf("Token(%s)", t.Type)
	}
}

// ── Lexer ─────────────────────────────────────────────────────────────────────

type LexError struct {
	Msg string
}

func (e *LexError) Error() string { return e.Msg }

type Lexer struct {
	text []rune
	pos  int
}

func NewLexer(text string) *Lexer {
	return &Lexer{text: []rune(text)}
}

func (l *Lexer) peek() (rune, bool) {
	if l.pos >= len(l.text) {
		return 0, false
	}
	return l.text[l.pos], true
}

func (l *Lexer) advance() rune {
	ch := l.text[l.pos]
	l.pos++
	return ch
}

func (l *Lexer) skipWhitespace() {
	for {
		ch, ok := l.peek()
		if !ok || !unicode.IsSpace(ch) {
			break
		}
		l.advance()
	}
}

func (l *Lexer) readNumber() (Token, error) {
	start := l.pos
	num := ""
	for {
		ch, ok := l.peek()
		if !ok || !unicode.IsDigit(ch) {
			break
		}
		num += string(l.advance())
	}
	// decimal part
	if ch, ok := l.peek(); ok && ch == '.' {
		num += string(l.advance())
		for {
			ch2, ok2 := l.peek()
			if !ok2 || !unicode.IsDigit(ch2) {
				break
			}
			num += string(l.advance())
		}
	}
	var val float64
	_, err := fmt.Sscanf(num, "%f", &val)
	if err != nil {
		return Token{}, &LexError{Msg: fmt.Sprintf("invalid number %q at pos %d", num, start)}
	}
	return Token{Type: TNumber, NumVal: val, Pos: start}, nil
}

func (l *Lexer) readVar() Token {
	start := l.pos
	name := ""
	for {
		ch, ok := l.peek()
		if !ok || !(unicode.IsLetter(ch) || ch == '_') {
			break
		}
		name += string(l.advance())
	}
	return Token{Type: TVar, StrVal: name, Pos: start}
}

func (l *Lexer) Tokenize() ([]Token, error) {
	var tokens []Token
	for l.pos < len(l.text) {
		l.skipWhitespace()
		ch, ok := l.peek()
		if !ok {
			break
		}
		switch {
		case unicode.IsDigit(ch):
			tok, err := l.readNumber()
			if err != nil {
				return nil, err
			}
			tokens = append(tokens, tok)
		case unicode.IsLetter(ch) || ch == '_':
			tokens = append(tokens, l.readVar())
		case ch == '+':
			tokens = append(tokens, Token{Type: TPlus, Pos: l.pos})
			l.advance()
		case ch == '-':
			tokens = append(tokens, Token{Type: TMinus, Pos: l.pos})
			l.advance()
		case ch == '*':
			tokens = append(tokens, Token{Type: TStar, Pos: l.pos})
			l.advance()
		case ch == '/':
			tokens = append(tokens, Token{Type: TSlash, Pos: l.pos})
			l.advance()
		case ch == '^': // NEW: power operator
			tokens = append(tokens, Token{Type: TCaret, Pos: l.pos})
			l.advance()
		case ch == '=':
			tokens = append(tokens, Token{Type: TEquals, Pos: l.pos})
			l.advance()
		case ch == '(':
			tokens = append(tokens, Token{Type: TLParen, Pos: l.pos})
			l.advance()
		case ch == ')':
			tokens = append(tokens, Token{Type: TRParen, Pos: l.pos})
			l.advance()
		default:
			return nil, &LexError{Msg: fmt.Sprintf("unknown character %q at position %d", ch, l.pos)}
		}
	}
	tokens = append(tokens, Token{Type: TEOF, Pos: l.pos})
	return tokens, nil
}
