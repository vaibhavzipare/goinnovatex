/**
 * LandingPage.jsx — QUANTSOLVE
 * Fixed: removed duplicate `useCallback` import (was crashing the module)
 * Fixed: all hooks imported once from a single import statement
 * Fixed: onLaunch always called correctly
 */

import { useState, useEffect, useRef, useCallback } from "react";

/* ══════════════════════════════════════════════════════
   DESIGN TOKENS
══════════════════════════════════════════════════════ */
const T = {
  bgRoot:    "#03060f",
  bgCard:    "rgba(10,18,42,0.78)",
  bgCardHov: "rgba(14,24,55,0.92)",
  border:    "rgba(80,120,220,0.13)",
  borderHi:  "rgba(108,99,255,0.38)",
  violet:    "#6c63ff",
  cyan:      "#00f5d4",
  gold:      "#ffd166",
  coral:     "#ff6b6b",
  blue:      "#3b82f6",
  textPri:   "#e8eaf6",
  textSec:   "#7b8ab8",
  textMut:   "#2e3a58",
  fDisplay:  "'Syne', sans-serif",
  fMono:     "'Space Mono', monospace",
  fBody:     "'DM Sans', sans-serif",
};

/* ══════════════════════════════════════════════════════
   GLOBAL CSS INJECTION
══════════════════════════════════════════════════════ */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Space+Mono:wght@400;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:#03060f;color:#e8eaf6;font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-thumb{background:rgba(108,99,255,0.3);border-radius:4px}
::selection{background:rgba(108,99,255,0.35);color:#fff}

@keyframes qs-spin     {to{transform:rotate(360deg)}}
@keyframes qs-fadein   {from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes qs-fadeup   {from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
@keyframes qs-floatY   {0%,100%{transform:translateY(0px)}50%{transform:translateY(-12px)}}
@keyframes qs-pulse    {0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes qs-glow-ani {0%,100%{opacity:0.18}50%{opacity:0.32}}
@keyframes qs-shimmer  {0%{transform:translateX(-100%) skewX(-15deg)}100%{transform:translateX(300%) skewX(-15deg)}}
@keyframes qs-blink    {0%,100%{opacity:1}50%{opacity:0}}
@keyframes qs-scanline {0%{top:-10%}100%{top:110%}}
@keyframes qs-gridMove {from{transform:translateY(0)}to{transform:translateY(60px)}}

.qs-nav-link{color:#7b8ab8;font-family:'Space Mono',monospace;font-size:0.68rem;letter-spacing:0.08em;text-decoration:none;text-transform:uppercase;transition:color 0.2s;cursor:pointer}
.qs-nav-link:hover{color:#e8eaf6}
.qs-nav-link.active{color:#00f5d4}

.qs-card-3d{transition:transform 0.4s cubic-bezier(0.16,1,0.3,1),box-shadow 0.4s ease,border-color 0.3s}
.qs-card-3d:hover{box-shadow:0 24px 64px rgba(0,0,0,0.7),0 4px 20px rgba(108,99,255,0.2)!important;border-color:rgba(108,99,255,0.38)!important}

.qs-launch-btn{position:relative;overflow:hidden;transition:transform 0.3s cubic-bezier(0.16,1,0.3,1),box-shadow 0.3s}
.qs-launch-btn::after{content:'';position:absolute;top:0;left:-100%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);transform:skewX(-20deg);transition:left 0.5s ease}
.qs-launch-btn:hover::after{left:200%}
.qs-launch-btn:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(108,99,255,0.55)!important}
.qs-launch-btn:active{transform:translateY(0px) scale(0.98)}

.qs-outline-btn{transition:all 0.25s}
.qs-outline-btn:hover{background:rgba(108,99,255,0.12)!important;border-color:rgba(108,99,255,0.5)!important;color:#e8eaf6!important}

.qs-module-card{transition:transform 0.35s cubic-bezier(0.16,1,0.3,1),box-shadow 0.35s,border-color 0.3s}
.qs-module-card:hover{transform:translateY(-6px)!important}

.qs-algo-tab{transition:all 0.22s;cursor:pointer}
.qs-algo-tab:hover{background:rgba(108,99,255,0.1)!important;color:#e8eaf6!important}
.qs-algo-tab.active{background:rgba(108,99,255,0.18)!important;color:#6c63ff!important;border-color:rgba(108,99,255,0.4)!important}

.qs-tech-badge{transition:all 0.22s}
.qs-tech-badge:hover{transform:translateY(-3px);border-color:rgba(0,245,212,0.4)!important;box-shadow:0 8px 24px rgba(0,245,212,0.15)}

.qs-pipe-step{transition:all 0.3s}
.qs-pipe-step:hover{border-color:rgba(108,99,255,0.5)!important;background:rgba(108,99,255,0.1)!important;transform:scale(1.04)}

.qs-tc-row:hover td{background:rgba(108,99,255,0.07)!important}
`;

function GlobalStyles() {
  useEffect(() => {
    let el = document.getElementById("qs-global");
    if (!el) { el = document.createElement("style"); el.id = "qs-global"; document.head.appendChild(el); }
    el.textContent = GLOBAL_CSS;
  }, []);
  return null;
}

/* ══════════════════════════════════════════════════════
   PARTICLE CANVAS
══════════════════════════════════════════════════════ */
function ParticleCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    let W, H, pts, id;
    const N = 70;
    const resize = () => {
      W = c.width = window.innerWidth; H = c.height = window.innerHeight;
      pts = Array.from({ length: N }, () => ({
        x: Math.random()*W, y: Math.random()*H,
        r: Math.random()*1.4+0.3,
        vx: (Math.random()-0.5)*0.15, vy: (Math.random()-0.5)*0.15,
        a: Math.random()*0.4+0.1,
      }));
    };
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      for (const p of pts) {
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(108,99,255,${p.a})`; ctx.fill();
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0)p.x=W; if(p.x>W)p.x=0;
        if(p.y<0)p.y=H; if(p.y>H)p.y=0;
      }
      for (let i=0;i<pts.length;i++) for (let j=i+1;j<pts.length;j++) {
        const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.sqrt(dx*dx+dy*dy);
        if (d<110) { ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y); ctx.strokeStyle=`rgba(108,99,255,${0.07*(1-d/110)})`; ctx.lineWidth=0.5; ctx.stroke(); }
      }
      id = requestAnimationFrame(draw);
    };
    resize(); draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed",inset:0,zIndex:0,opacity:0.35,pointerEvents:"none" }}/>;
}

/* ══════════════════════════════════════════════════════
   AMBIENT GLOWS
══════════════════════════════════════════════════════ */
function Glows() {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden" }}>
      {[
        {w:800,h:800,bg:"radial-gradient(circle,rgba(108,99,255,0.20),transparent 70%)",top:-220,left:-200},
        {w:600,h:600,bg:"radial-gradient(circle,rgba(0,245,212,0.14),transparent 70%)",bottom:-150,right:-150},
        {w:500,h:500,bg:"radial-gradient(circle,rgba(59,130,246,0.10),transparent 70%)",top:"40%",left:"45%"},
      ].map((g,i) => (
        <div key={i} style={{
          position:"absolute",borderRadius:"50%",filter:"blur(130px)",
          width:g.w,height:g.h,background:g.bg,
          top:g.top,left:g.left,bottom:g.bottom,right:g.right,
          animation:`qs-glow-ani ${14+i*3}s ease-in-out infinite alternate`,
          animationDelay:`${-i*5}s`,
        }}/>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   GRID BACKGROUND
══════════════════════════════════════════════════════ */
function GridBg() {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden",opacity:0.4 }}>
      <div style={{
        position:"absolute",inset:0,
        backgroundImage:`linear-gradient(rgba(80,120,220,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(80,120,220,0.04) 1px,transparent 1px)`,
        backgroundSize:"60px 60px",
        animation:"qs-gridMove 8s linear infinite",
      }}/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   GLASS CARD
══════════════════════════════════════════════════════ */
function GlassCard({ children, accentHue=250, style={}, className="", onClick }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX-r.left-r.width/2)/(r.width/2);
    const dy = (e.clientY-r.top-r.height/2)/(r.height/2);
    el.style.transform = `perspective(900px) rotateY(${dx*3}deg) rotateX(${-dy*3}deg) translateY(-3px)`;
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = ""; };
  return (
    <div ref={ref} className={`qs-card-3d ${className}`} onClick={onClick}
      onMouseMove={onMove} onMouseLeave={onLeave}
      style={{
        position:"relative",background:T.bgCard,border:`1px solid ${T.border}`,
        borderRadius:20,backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",
        overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.55)",...style,
      }}>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:2,
        background:`linear-gradient(90deg,transparent,hsl(${accentHue},80%,68%) 40%,hsl(${accentHue},90%,80%) 60%,transparent)`,
        borderRadius:"20px 20px 0 0" }}/>
      <div style={{ position:"absolute",inset:0,pointerEvents:"none",borderRadius:20,
        backgroundImage:"radial-gradient(rgba(99,130,200,0.05) 1px,transparent 1px)",
        backgroundSize:"28px 28px" }}/>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   FLOATING MATH SYMBOLS
══════════════════════════════════════════════════════ */
function FloatingSymbols() {
  const symbols = [
    {s:"∑",x:"8%",y:"20%",size:42,dur:5,del:0,rot:"-15deg"},
    {s:"∫",x:"88%",y:"15%",size:38,dur:6,del:-2,rot:"10deg"},
    {s:"∂",x:"5%",y:"65%",size:32,dur:4.5,del:-1,rot:"20deg"},
    {s:"√",x:"91%",y:"60%",size:36,dur:5.5,del:-3,rot:"-8deg"},
    {s:"≤",x:"15%",y:"80%",size:28,dur:4,del:-0.5,rot:"5deg"},
    {s:"⊞",x:"80%",y:"78%",size:30,dur:6.5,del:-4,rot:"-12deg"},
    {s:"α",x:"50%",y:"8%",size:34,dur:5,del:-1.5,rot:"0deg"},
    {s:"β",x:"25%",y:"12%",size:26,dur:4.8,del:-2.5,rot:"18deg"},
    {s:"λ",x:"72%",y:"35%",size:30,dur:5.2,del:-3.5,rot:"-5deg"},
    {s:"Δ",x:"40%",y:"85%",size:32,dur:4.3,del:-0.8,rot:"12deg"},
  ];
  return (
    <div style={{ position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden" }}>
      {symbols.map((sym,i) => (
        <div key={i} style={{
          position:"absolute",left:sym.x,top:sym.y,
          fontFamily:T.fMono,fontSize:sym.size,
          color:`rgba(108,99,255,${0.08+i%3*0.04})`,fontWeight:700,
          animation:`qs-floatY ${sym.dur}s ease-in-out infinite`,
          animationDelay:`${sym.del}s`,transform:`rotate(${sym.rot})`,userSelect:"none",
        }}>{sym.s}</div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ANIMATED COUNTER
══════════════════════════════════════════════════════ */
function Counter({ target, suffix="", duration=2000 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = null;
        const step = (ts) => {
          if (!start) start = ts;
          const prog = Math.min((ts-start)/duration, 1);
          setVal(Math.floor(prog*prog*(3-2*prog)*target));
          if (prog < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step); obs.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ══════════════════════════════════════════════════════
   SECTION REVEAL
══════════════════════════════════════════════════════ */
function Reveal({ children, delay=0, style={} }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(30px)",
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      ...style,
    }}>{children}</div>
  );
}

/* ══════════════════════════════════════════════════════
   SECTION LABEL
══════════════════════════════════════════════════════ */
function SectionLabel({ text }) {
  return (
    <div style={{ display:"inline-flex",alignItems:"center",gap:10,marginBottom:16 }}>
      <div style={{ width:24,height:1,background:T.cyan }}/>
      <span style={{ fontFamily:T.fMono,fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:T.cyan }}>{text}</span>
      <div style={{ width:24,height:1,background:T.cyan }}/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SMALL ICONS
══════════════════════════════════════════════════════ */
function LogoMark({ size=24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M4 14 L14 4 L24 14 L14 24 Z" stroke="url(#lmg)" strokeWidth="1.5" fill="none"/>
      <path d="M9 14 L14 9 L19 14 L14 19 Z" fill="url(#lmg)" opacity="0.55"/>
      <circle cx="14" cy="14" r="2" fill="#00f5d4"/>
      <defs>
        <linearGradient id="lmg" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6c63ff"/><stop offset="100%" stopColor="#00f5d4"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
function GithubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════
   NAVBAR
══════════════════════════════════════════════════════ */
const NAV_LINKS = ["Overview","Architecture","Algorithms","Modules","Tech Stack","Test Cases"];

function Navbar({ onLaunch }) {
  const [scrolled, setScrolled] = useState(false);
  const [active,   setActive]   = useState("");

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id.toLowerCase().replace(/ /g,"-"))?.scrollIntoView({ behavior:"smooth" });
    setActive(id);
  };

  return (
    <nav style={{
      position:"fixed",top:0,left:0,right:0,zIndex:300,
      background: scrolled ? "rgba(3,6,15,0.90)" : "rgba(3,6,15,0.50)",
      backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",
      borderBottom:`1px solid ${scrolled ? T.border : "transparent"}`,
      transition:"all 0.4s ease",
    }}>
      <div style={{ maxWidth:1300,margin:"0 auto",padding:"0 32px",height:64,display:"flex",alignItems:"center",gap:32 }}>

        <div style={{ display:"flex",alignItems:"center",gap:12,flexShrink:0,cursor:"pointer" }}
          onClick={() => window.scrollTo({ top:0, behavior:"smooth" })}>
          <div style={{ width:36,height:36,borderRadius:10,background:"rgba(108,99,255,0.14)",border:"1px solid rgba(108,99,255,0.28)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <LogoMark size={18}/>
          </div>
          <div>
            <div style={{ fontFamily:T.fDisplay,fontWeight:800,fontSize:"0.95rem",letterSpacing:"0.14em",background:"linear-gradient(135deg,#e8eaf6,#8b85ff 50%,#00f5d4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",lineHeight:1 }}>QUANTSOLVE</div>
            <div style={{ fontFamily:T.fMono,fontSize:"0.5rem",color:T.textMut,letterSpacing:"0.1em",textTransform:"uppercase" }}>Algebraic Engine</div>
          </div>
        </div>

        <div style={{ display:"flex",gap:28,flex:1,justifyContent:"center" }}>
          {NAV_LINKS.map(l => (
            <span key={l} className={`qs-nav-link ${active===l?"active":""}`} onClick={() => scrollTo(l)}>{l}</span>
          ))}
        </div>

        <div style={{ display:"flex",gap:12,flexShrink:0 }}>
          <a href="https://github.com/vaibhavzipare/INNOVATEX" target="_blank" rel="noreferrer"
            style={{ display:"flex",alignItems:"center",gap:7,fontFamily:T.fMono,fontSize:"0.62rem",color:T.textSec,textDecoration:"none",letterSpacing:"0.06em",padding:"6px 12px",border:`1px solid ${T.border}`,borderRadius:8 }}
            className="qs-outline-btn">
            <GithubIcon/> GitHub
          </a>
          <button className="qs-launch-btn" onClick={onLaunch} style={{
            background:"linear-gradient(135deg,#6c63ff,#5652e0 50%,#00c9b0)",
            border:"none",borderRadius:10,padding:"8px 20px",
            fontFamily:T.fDisplay,fontWeight:700,fontSize:"0.72rem",letterSpacing:"0.1em",
            textTransform:"uppercase",color:"#fff",cursor:"pointer",
            boxShadow:"0 0 24px rgba(108,99,255,0.35)",
          }}>Launch Solver →</button>
        </div>
      </div>
    </nav>
  );
}

/* ══════════════════════════════════════════════════════
   HERO
══════════════════════════════════════════════════════ */
function Hero({ onLaunch }) {
  const [typed, setTyped] = useState("");
  const eq = "150a + 100b + 50c = 5000";

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setTyped(eq.slice(0, i+1)); i++;
      if (i >= eq.length) clearInterval(t);
    }, 55);
    return () => clearInterval(t);
  }, []);

  const badges = [
    { label:"Quantitative Finance", color:T.violet },
    { label:"Hackathon 2026",       color:T.cyan   },
    { label:"Python + Flask",       color:T.gold   },
    { label:"React Dashboard",      color:T.coral  },
    { label:"No eval() · No SymPy", color:"#a78bfa"},
  ];

  return (
    <section style={{ position:"relative",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",paddingTop: 100 }}>
      <FloatingSymbols/>

      <div style={{ position:"absolute",inset:0,pointerEvents:"none",zIndex:1,overflow:"hidden" }}>
        <div style={{ position:"absolute",left:0,right:0,height:"2px",background:"linear-gradient(90deg,transparent,rgba(108,99,255,0.08),transparent)",animation:"qs-scanline 6s linear infinite" }}/>
      </div>

      <div style={{
  position: "relative",
  zIndex: 2,
  maxWidth: "1200px",          // ✅ increase width
  width: "100%",               // ✅ allow full stretch
  margin: "0 auto",
  padding: "80px clamp(16px, 5vw, 32px)",  // ✅ responsive padding
  textAlign: "center"
}}>

        <div style={{ display:"inline-flex",alignItems:"center",gap:8,marginBottom:28,
          background:"rgba(108,99,255,0.08)",border:"1px solid rgba(108,99,255,0.22)",
          borderRadius:20,padding:"6px 18px",animation:"qs-fadein 0.6s ease" }}>
          <div style={{ width:6,height:6,borderRadius:"50%",background:T.cyan,boxShadow:`0 0 8px ${T.cyan}`,animation:"qs-pulse 2s ease-in-out infinite" }}/>
          <span style={{ fontFamily:T.fMono,fontSize:"0.62rem",color:T.cyan,letterSpacing:"0.12em",textTransform:"uppercase" }}>
            Hackathon Project · April 2026 · Quantitative Finance
          </span>
        </div>

        <div style={{ animation:"qs-fadeup 0.8s ease 0.1s both" }}>
        <h1 style={{
  fontFamily: T.fDisplay,
  fontWeight: 800,
  fontSize: "clamp(3rem, 8vw, 6rem)",   // ✅ fixed scaling
  lineHeight: 1.1,                      // ✅ prevent cut
  letterSpacing: "-0.02em",

  maxWidth: "90vw",                     // ✅ prevent overflow
  margin: "0 auto",                     // ✅ center properly
  wordBreak: "break-word",              // ✅ allow wrapping
  overflowWrap: "break-word",

  background: "linear-gradient(135deg,#ffffff 0%,#c4c0ff 35%,#6c63ff 60%,#00f5d4 85%,#ffffff 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",

  marginBottom: 8,
}}>
  QUANTSOLVE
</h1>
          <p style={{ fontFamily:T.fMono,fontSize:"clamp(0.75rem,2vw,1rem)",color:T.textSec,letterSpacing:"0.22em",textTransform:"uppercase",marginBottom:28 }}>
            Algebraic Parser &amp; Equation Engine
          </p>
        </div>

        <div style={{ animation:"qs-fadeup 0.8s ease 0.25s both" }}>
          <p style={{ fontFamily:T.fBody,fontWeight:300,fontSize:"clamp(1rem,2.5vw,1.22rem)",color:"rgba(232,234,246,0.75)",maxWidth:620,margin:"0 auto 36px",lineHeight:1.8 }}>
            Turn mathematical equations into portfolio strategies using a custom-built algebraic solver —
            built from scratch with <em style={{ color:T.cyan }}>no eval(), no SymPy, no shortcuts</em>.
          </p>
        </div>

        <div style={{ animation:"qs-fadeup 0.8s ease 0.35s both",marginBottom:36 }}>
          <div style={{
            display:"inline-flex",alignItems:"center",gap:12,
            background:"rgba(3,8,22,0.8)",border:`1px solid rgba(108,99,255,0.25)`,
            borderRadius:12,padding:"14px 24px",
            boxShadow:"0 0 40px rgba(108,99,255,0.1),inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
            <span style={{ fontFamily:T.fMono,fontSize:"0.65rem",color:T.textMut,letterSpacing:"0.1em" }}>INPUT</span>
            <div style={{ width:1,height:20,background:T.border }}/>
            <span style={{ fontFamily:T.fMono,fontSize:"clamp(0.85rem,2vw,1.05rem)",color:T.cyan,letterSpacing:"0.04em" }}>
              {typed}<span style={{ animation:"qs-blink 1s step-end infinite",color:T.violet }}>|</span>
            </span>
          </div>
        </div>

        <div style={{ display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center",marginBottom:44,animation:"qs-fadeup 0.8s ease 0.45s both" }}>
          {badges.map((b,i) => (
            <span key={i} style={{
              fontFamily:T.fMono,fontSize:"0.62rem",padding:"5px 14px",borderRadius:20,
              background:`${b.color}14`,border:`1px solid ${b.color}35`,color:b.color,letterSpacing:"0.06em",
            }}>{b.label}</span>
          ))}
        </div>

        <div style={{ display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",animation:"qs-fadeup 0.8s ease 0.55s both" }}>
          <button className="qs-launch-btn" onClick={onLaunch} style={{
            background:"linear-gradient(135deg,#6c63ff,#5652e0 50%,#00c9b0)",
            border:"none",borderRadius:14,padding:"16px 36px",
            fontFamily:T.fDisplay,fontWeight:700,fontSize:"0.95rem",letterSpacing:"0.08em",
            textTransform:"uppercase",color:"#fff",cursor:"pointer",
            boxShadow:"0 0 40px rgba(108,99,255,0.4),0 8px 32px rgba(0,0,0,0.4)",
          }}>🚀 Launch Solver</button>
          {[
            { label:"View on GitHub", href:"https://github.com/vaibhavzipare/INNOVATEX" },
            { label:"Documentation",  href:"#overview" },
          ].map((b,i) => (
            <a key={i} href={b.href} target={b.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
              className="qs-outline-btn" style={{
                background:"transparent",border:`1px solid ${T.border}`,
                borderRadius:14,padding:"16px 24px",textDecoration:"none",
                fontFamily:T.fDisplay,fontWeight:600,fontSize:"0.82rem",letterSpacing:"0.06em",
                color:T.textSec,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8,
              }}>{b.label}</a>
          ))}
        </div>

        <div style={{ marginTop:64,display:"flex",flexDirection:"column",alignItems:"center",gap:8,animation:"qs-fadein 1s ease 1.2s both" }}>
          <span style={{ fontFamily:T.fMono,fontSize:"0.58rem",color:T.textMut,letterSpacing:"0.12em",textTransform:"uppercase" }}>Scroll to explore</span>
          <div style={{ width:1,height:40,background:`linear-gradient(${T.violet},transparent)`,animation:"qs-floatY 1.5s ease-in-out infinite" }}/>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   STATS BAR
══════════════════════════════════════════════════════ */
function StatsBar() {
  const stats = [
    
    { val:100,suffix:"%",    label:"Custom Parser"  },
    { val:0,  suffix:" eval",label:"No eval()"      },
    { val:5,  suffix:" vars",label:"Up to"          },
    { val:3,  suffix:" tiers",label:"Architecture"  },
  ];
  return (
    <Reveal>
      <div style={{ background:"rgba(6,12,28,0.7)",backdropFilter:"blur(20px)",borderTop:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}`,padding:"28px 0",margin:"0 0 80px" }}>
        <div style={{ maxWidth:1200,margin:"0 auto",padding:"0 32px",display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:0 }}>
          {stats.map((s,i) => (
            <div key={i} style={{ textAlign:"center",padding:"0 24px",borderRight:i<stats.length-1?`1px solid ${T.border}`:"none" }}>
              <div style={{ fontFamily:T.fDisplay,fontWeight:800,fontSize:"2rem",color:T.textPri,letterSpacing:"-0.02em",lineHeight:1 }}>
                <Counter target={s.val} suffix={s.suffix}/>
              </div>
              <div style={{ fontFamily:T.fMono,fontSize:"0.6rem",color:T.textMut,textTransform:"uppercase",letterSpacing:"0.1em",marginTop:6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

/* ══════════════════════════════════════════════════════
   OVERVIEW
══════════════════════════════════════════════════════ */
function Overview() {
  const cards = [
    { icon:"⬡", title:"No External Solvers",  body:"Built entirely from scratch. No eval(), no exec(), no SymPy. Every token, every AST node, every solution loop — handwritten.", accentHue:250 },
    { icon:"∑", title:"Algebraic Parser",      body:"Recursive descent parser handles BODMAS, multi-variable equations, brackets, and auto-derives variable bounds from the equation itself.", accentHue:195 },
    { icon:"◈", title:"Portfolio Solver",      body:"Finds every valid whole-number combination that exactly satisfies the budget equation — perfect for quantitative finance allocation.", accentHue:160 },
    { icon:"⊙", title:"Constraint Engine",     body:"Filter solutions by custom rules: x > 5, y = even, z ≤ 10. Stack multiple constraints, each applied after the solver pass.", accentHue:40  },
    { icon:"⚡", title:"Flask REST API",       body:"Single POST /solve endpoint. Accepts equation + bounds + constraints. Returns solutions, auto-bounds, execution time, and complexity.", accentHue:280 },
    { icon:"🎯", title:"React Dashboard",      body:"Live dashboard with solution table, sort/filter, pagination, animated solver steps, and real-time performance analytics.", accentHue:220 },
  ];
  return (
    <section id="overview" style={{ maxWidth:1200,margin:"0 auto",padding:"0 32px 100px" }}>
      <Reveal>
        <div style={{ textAlign:"center",marginBottom:56 }}>
          <SectionLabel text="Project Overview"/>
          <h2 style={{ fontFamily:T.fDisplay,fontWeight:800,fontSize:"clamp(2rem,5vw,3rem)",color:T.textPri,letterSpacing:"-0.02em",lineHeight:1.1,marginBottom:16 }}>
            What is <span style={{ background:`linear-gradient(135deg,${T.violet},${T.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>QuantSolve?</span>
          </h2>
          <p style={{ fontFamily:T.fBody,fontSize:"1.05rem",color:T.textSec,maxWidth:580,margin:"0 auto",lineHeight:1.8 }}>
            A full-fledged algebraic parser and equation engine solving a quantitative finance problem.
          </p>
        </div>
      </Reveal>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:20 }}>
        {cards.map((c,i) => (
          <Reveal key={i} delay={i*0.08}>
            <GlassCard accentHue={c.accentHue} style={{ padding:"28px 28px 24px",cursor:"default" }}>
              <div style={{ fontSize:"1.8rem",marginBottom:16 }}>{c.icon}</div>
              <h3 style={{ fontFamily:T.fDisplay,fontWeight:700,fontSize:"1rem",color:T.textPri,marginBottom:10 }}>{c.title}</h3>
              <p style={{ fontFamily:T.fBody,fontWeight:300,fontSize:"0.87rem",color:T.textSec,lineHeight:1.75 }}>{c.body}</p>
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   ARCHITECTURE
══════════════════════════════════════════════════════ */
function Architecture() {
  const steps = [
    { label:"Raw Equation",sub:"User input",    icon:"⌨", color:T.textSec,hue:220 },
    { label:"Lexer",       sub:"Tokenizer",     icon:"◌", color:"#a78bfa",hue:270 },
    { label:"Parser",      sub:"AST Builder",   icon:"⊕", color:T.violet, hue:250 },
    { label:"Solver",      sub:"N-1 loops",     icon:"∑", color:T.blue,   hue:210 },
    { label:"Constraints", sub:"Filter engine", icon:"≤", color:T.gold,   hue:40  },
    { label:"Flask API",   sub:"POST /solve",   icon:"⚡", color:T.coral,  hue:0   },
    { label:"React UI",    sub:"Dashboard",     icon:"◈", color:T.cyan,   hue:170 },
  ];
  return (
    <section id="architecture" style={{ maxWidth:1200,margin:"0 auto",padding:"0 32px 100px" }}>
      <Reveal>
        <div style={{ textAlign:"center",marginBottom:56 }}>
          <SectionLabel text="System Architecture"/>
          <h2 style={{ fontFamily:T.fDisplay,fontWeight:800,fontSize:"clamp(2rem,5vw,3rem)",color:T.textPri,letterSpacing:"-0.02em" }}>
            The <span style={{ background:`linear-gradient(135deg,${T.violet},${T.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>Pipeline</span>
          </h2>
        </div>
      </Reveal>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"center",flexWrap:"wrap",gap:0 }}>
        {steps.map((s,i) => (
          <Reveal key={i} delay={i*0.07} style={{ display:"flex",alignItems:"center" }}>
            <div className="qs-pipe-step" style={{
              background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:14,
              padding:"18px 20px",textAlign:"center",backdropFilter:"blur(20px)",
              minWidth:110,cursor:"default",boxShadow:"0 4px 20px rgba(0,0,0,0.4)",
            }}>
              <div style={{ fontSize:"1.3rem",marginBottom:8,color:s.color }}>{s.icon}</div>
              <div style={{ fontFamily:T.fDisplay,fontWeight:700,fontSize:"0.78rem",color:T.textPri,marginBottom:4 }}>{s.label}</div>
              <div style={{ fontFamily:T.fMono,fontSize:"0.56rem",color:T.textMut,letterSpacing:"0.06em" }}>{s.sub}</div>
            </div>
            {i < steps.length-1 && (
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"0 4px" }}>
                <div style={{ width:28,height:1,background:`linear-gradient(90deg,${T.border},${T.violet},${T.border})` }}/>
                <div style={{ fontFamily:T.fMono,fontSize:"0.6rem",color:T.violet,marginTop:2 }}>→</div>
              </div>
            )}
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   MODULES
══════════════════════════════════════════════════════ */
function Modules() {
  const mods = [
    { name:"Lexer",            file:"lexer.py",      desc:"Tokenizes raw equation string into a stream of typed tokens: numbers, variables, operators, brackets.",   progress:100, hue:270, color:"#a78bfa" },
    { name:"Parser",           file:"parser.py",     desc:"Recursive descent parser. Builds an Abstract Syntax Tree from token stream. Handles BODMAS fully.",     progress:100, hue:250, color:T.violet  },
    { name:"Solver",           file:"solver.py",     desc:"Algebraic solver that iterates over N-1 variable combinations, solves last variable analytically.",      progress:100, hue:210, color:T.blue    },
    { name:"Constraint Engine",file:"solver.py",     desc:"Post-solve filter. Applies user-defined constraints: comparison operators, even/odd parity checks.",      progress:100, hue:40,  color:T.gold    },
    { name:"Flask API",        file:"app.py",        desc:"REST endpoint POST /solve. Validates input, calls solver, returns JSON with solutions + metadata.",       progress:100, hue:0,   color:T.coral   },
    { name:"React Dashboard",  file:"Dashboard.jsx", desc:"Live dashboard with animated solver steps, performance stats, sortable table, and calc visualizer.",     progress:100, hue:170, color:T.cyan    },
  ];
  return (
    <section id="modules" style={{ maxWidth:1200,margin:"0 auto",padding:"0 32px 100px" }}>
      <Reveal>
        <div style={{ textAlign:"center",marginBottom:56 }}>
          <SectionLabel text="Module Breakdown"/>
          <h2 style={{ fontFamily:T.fDisplay,fontWeight:800,fontSize:"clamp(2rem,5vw,3rem)",color:T.textPri,letterSpacing:"-0.02em" }}>
            6 Modules <span style={{ background:`linear-gradient(135deg,${T.gold},${T.coral})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}></span>
          </h2>
        </div>
      </Reveal>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(360px,1fr))",gap:20 }}>
        {mods.map((m,i) => (
          <Reveal key={i} delay={i*0.07}>
            <GlassCard accentHue={m.hue} className="qs-module-card" style={{ padding:"24px 26px",cursor:"default" }}>
              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14 }}>
                <div>
                  <h3 style={{ fontFamily:T.fDisplay,fontWeight:700,fontSize:"0.95rem",color:T.textPri,marginBottom:4 }}>{m.name}</h3>
                  <div style={{ fontFamily:T.fMono,fontSize:"0.6rem",color:T.textMut }}>{m.file}</div>
                </div>
                <div style={{ fontFamily:T.fMono,fontSize:"0.6rem",color:m.color,background:`${m.color}14`,border:`1px solid ${m.color}30`,borderRadius:6,padding:"3px 9px",flexShrink:0 }}>{m.time}</div>
              </div>
              <p style={{ fontFamily:T.fBody,fontWeight:300,fontSize:"0.84rem",color:T.textSec,lineHeight:1.7,marginBottom:16 }}>{m.desc}</p>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ flex:1,height:3,background:"rgba(255,255,255,0.05)",borderRadius:2,overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${m.progress}%`,background:`linear-gradient(90deg,${m.color},${T.cyan})`,borderRadius:2 }}/>
                </div>
                <span style={{ fontFamily:T.fMono,fontSize:"0.6rem",color:m.color,flexShrink:0 }}>Complete</span>
              </div>
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   ALGORITHMS
══════════════════════════════════════════════════════ */
function Algorithms() {
  const [active, setActive] = useState(0);
  const algos = [
    {
      title:"Recursive Descent Parser", tag:"parser.py",
      desc:"Hand-written top-down parser processes tokens using mutual recursion across three layers: expression → term → factor. Correctly handles BODMAS and parentheses without any external library.",
      code:`def parse_expr(self):\n    left = self.parse_term()\n    while self.pos < len(self.tokens):\n        tok = self.tokens[self.pos]\n        if tok.type == 'OP' and tok.value in '+-':\n            self.pos += 1\n            right = self.parse_term()\n            left = BinaryNode(tok.value, left, right)\n        else:\n            break\n    return left`,
      points:["Handles +, -, *, / with correct precedence","Bracket / parenthesis support","Builds full Abstract Syntax Tree","Zero external dependencies"],
      color:T.violet, hue:250,
    },
    {
      title:"Algebraic Solver", tag:"solver.py",
      desc:"Iterates over all valid integer ranges for N-1 variables, then solves for the last variable algebraically. Includes pruning to skip impossible ranges and infinite-solution detection.",
      code:`for combo in product(*ranges):\n    total = sum(coeff[v]*combo[i]\n                for i, v in enumerate(vars[:-1]))\n    remainder = (budget - total)\n    last_val  = remainder / coeff[last_var]\n    if last_val >= 0 and last_val == int(last_val):\n        solutions.append({**dict(zip(vars,combo)),\n                          last_var: int(last_val)})`,
      points:["N-1 loop strategy — last var solved analytically","Dynamic range pruning for speed","Infinite solution detection","Integer-only validation"],
      color:T.cyan, hue:170,
    },
    {
      title:"Lexer / Tokenizer", tag:"lexer.py",
      desc:"Single-pass character scanner converts a raw equation string into a flat list of typed tokens. Handles multi-digit numbers, multi-character variable names, and whitespace normalization.",
      code:`def tokenize(self, expr):\n    tokens = []; i = 0\n    while i < len(expr):\n        if expr[i].isdigit():\n            j = i\n            while j < len(expr) and expr[j].isdigit(): j += 1\n            tokens.append(Token('NUM', int(expr[i:j])))\n            i = j\n        elif expr[i].isalpha():\n            j = i\n            while j<len(expr) and expr[j].isalnum(): j+=1\n            tokens.append(Token('VAR', expr[i:j]))\n            i = j`,
      points:["NUM · VAR · OP · LPAREN · RPAREN","Multi-char variable names","Negative number support","Whitespace tolerant"],
      color:T.gold, hue:40,
    },
  ];
  const al = algos[active];
  return (
    <section id="algorithms" style={{ maxWidth:1200,margin:"0 auto",padding:"0 32px 100px" }}>
      <Reveal>
        <div style={{ textAlign:"center",marginBottom:56 }}>
          <SectionLabel text="Key Algorithms"/>
          <h2 style={{ fontFamily:T.fDisplay,fontWeight:800,fontSize:"clamp(2rem,5vw,3rem)",color:T.textPri,letterSpacing:"-0.02em" }}>
            Built from <span style={{ background:`linear-gradient(135deg,${T.violet},${T.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>Scratch</span>
          </h2>
        </div>
      </Reveal>
      <div style={{ display:"flex",gap:10,marginBottom:24,justifyContent:"center",flexWrap:"wrap" }}>
        {algos.map((a,i) => (
          <button key={i} className={`qs-algo-tab ${active===i?"active":""}`}
            onClick={() => setActive(i)}
            style={{ background:"transparent",border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 20px",fontFamily:T.fMono,fontSize:"0.68rem",letterSpacing:"0.06em",color:T.textSec,cursor:"pointer" }}>
            {a.title}
          </button>
        ))}
      </div>
      <GlassCard key={active} accentHue={al.hue} style={{ padding:"32px" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:32 }}>
          <div>
            <div style={{ fontFamily:T.fMono,fontSize:"0.6rem",color:al.color,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12 }}>{al.tag}</div>
            <h3 style={{ fontFamily:T.fDisplay,fontWeight:700,fontSize:"1.2rem",color:T.textPri,marginBottom:14,lineHeight:1.3 }}>{al.title}</h3>
            <p style={{ fontFamily:T.fBody,fontWeight:300,fontSize:"0.9rem",color:T.textSec,lineHeight:1.8,marginBottom:24 }}>{al.desc}</p>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {al.points.map((p,i) => (
                <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:al.color,flexShrink:0,marginTop:6 }}/>
                  <span style={{ fontFamily:T.fMono,fontSize:"0.7rem",color:T.textSec,lineHeight:1.6 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:"rgba(3,8,22,0.9)",borderRadius:12,padding:"20px",border:`1px solid rgba(108,99,255,0.18)`,overflow:"auto" }}>
            <div style={{ fontFamily:T.fMono,fontSize:"0.58rem",color:T.textMut,marginBottom:12,letterSpacing:"0.08em" }}>// {al.tag}</div>
            <pre style={{ fontFamily:T.fMono,fontSize:"0.72rem",color:"#94a3b8",lineHeight:1.7,margin:0,whiteSpace:"pre-wrap",wordBreak:"break-all" }}>
              <code dangerouslySetInnerHTML={{ __html: al.code
                .replace(/(def |class |return |for |if |while |and |in |not )/g, `<span style="color:${T.violet}">$1</span>`)
                .replace(/('[^']*')/g, `<span style="color:${T.gold}">$1</span>`)
                .replace(/(#.*)/g, `<span style="color:${T.textMut}">$1</span>`)
                .replace(/\b(\d+)\b/g, `<span style="color:${T.cyan}">$1</span>`)
              }}/>
            </pre>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   TEST CASES
══════════════════════════════════════════════════════ */
function TestCases() {
  const cases = [
    { id:"TC-01", eq:"50x = 200",              vars:1, expect:"x = 4",         edge:"Trivial",      status:"PASS" },
    { id:"TC-02", eq:"10x + 20y = 100",        vars:2, expect:"6 solutions",   edge:"2-variable",   status:"PASS" },
    { id:"TC-03", eq:"5a+10b+20c+50d+100e=500",vars:5, expect:"Multiple",      edge:"5 variables",  status:"PASS" },
    { id:"TC-04", eq:"10x+20y=100 · x > 2",   vars:2, expect:"Filtered",      edge:"Constraint",   status:"PASS" },
    { id:"TC-05", eq:"2(x+y) = 20",            vars:2, expect:"Solutions",     edge:"Brackets",     status:"PASS" },
    { id:"TC-06", eq:"3x + 6y = 10",           vars:2, expect:"No solutions",  edge:"Impossible",   status:"PASS" },
    { id:"TC-07", eq:"x + y = 100",            vars:2, expect:"∞ detected",    edge:"Infinite trap",status:"PASS" },
  ];
  return (
    <section id="test-cases" style={{ maxWidth:1200,margin:"0 auto",padding:"0 32px 100px" }}>
      <Reveal>
        <div style={{ textAlign:"center",marginBottom:56 }}>
          <SectionLabel text="Input / Output Test Cases"/>
          <h2 style={{ fontFamily:T.fDisplay,fontWeight:800,fontSize:"clamp(2rem,5vw,3rem)",color:T.textPri,letterSpacing:"-0.02em" }}>
            Test <span style={{ background:`linear-gradient(135deg,${T.cyan},${T.blue})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>Coverage</span>
          </h2>
        </div>
      </Reveal>
      <Reveal delay={0.1}>
        <GlassCard accentHue={195} style={{ padding:0,overflow:"hidden" }}>
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead>
              <tr>
                {["ID","Equation","Vars","Expected","Edge Case","Status"].map(h => (
                  <th key={h} style={{ background:"rgba(3,6,18,0.96)",padding:"14px 20px",textAlign:"left",fontFamily:T.fMono,fontSize:"0.6rem",color:T.textMut,letterSpacing:"0.12em",textTransform:"uppercase",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.map((c,i) => (
                <tr key={i} className="qs-tc-row">
                  <td style={{ padding:"12px 20px",borderBottom:`1px solid rgba(99,130,200,0.06)` }}><span style={{ fontFamily:T.fMono,fontSize:"0.68rem",color:T.violet }}>{c.id}</span></td>
                  <td style={{ padding:"12px 20px",borderBottom:`1px solid rgba(99,130,200,0.06)` }}><span style={{ fontFamily:T.fMono,fontSize:"0.78rem",color:T.cyan }}>{c.eq}</span></td>
                  <td style={{ padding:"12px 20px",borderBottom:`1px solid rgba(99,130,200,0.06)` }}><span style={{ fontFamily:T.fMono,fontSize:"0.72rem",color:T.textSec }}>{c.vars}</span></td>
                  <td style={{ padding:"12px 20px",borderBottom:`1px solid rgba(99,130,200,0.06)` }}><span style={{ fontFamily:T.fBody,fontSize:"0.82rem",color:T.textPri }}>{c.expect}</span></td>
                  <td style={{ padding:"12px 20px",borderBottom:`1px solid rgba(99,130,200,0.06)` }}><span style={{ fontFamily:T.fMono,fontSize:"0.65rem",color:T.gold,background:`${T.gold}10`,border:`1px solid ${T.gold}25`,borderRadius:6,padding:"2px 8px" }}>{c.edge}</span></td>
                  <td style={{ padding:"12px 20px",borderBottom:`1px solid rgba(99,130,200,0.06)` }}><span style={{ fontFamily:T.fMono,fontSize:"0.62rem",color:T.cyan,background:"rgba(0,245,212,0.10)",border:"1px solid rgba(0,245,212,0.25)",borderRadius:10,padding:"2px 10px" }}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      </Reveal>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   TECH STACK
══════════════════════════════════════════════════════ */
function TechStack() {
  const backend = [
    { name:"Python 3.11",    role:"Core language",      color:"#3b82f6" },
    { name:"Flask",          role:"REST API framework",  color:"#10b981" },
    { name:"Custom Lexer",   role:"lexer.py",            color:T.violet  },
    { name:"Custom Parser",  role:"parser.py",           color:"#a78bfa" },
    { name:"Custom Solver",  role:"solver.py",           color:T.cyan    },
  ];
  const frontend = [
    { name:"React 18",       role:"UI framework",        color:"#61dafb" },
    { name:"Vite",           role:"Build tool",          color:T.gold    },
    { name:"Space Mono",     role:"Monospace font",      color:T.violet  },
    { name:"Canvas API",     role:"Particle FX",         color:T.coral   },
    { name:"CSS Transforms", role:"3D card effects",     color:"#a78bfa" },
  ];
  return (
    <section id="tech-stack" style={{ maxWidth:1200,margin:"0 auto",padding:"0 32px 100px" }}>
      <Reveal>
        <div style={{ textAlign:"center",marginBottom:56 }}>
          <SectionLabel text="Technology Stack"/>
          <h2 style={{ fontFamily:T.fDisplay,fontWeight:800,fontSize:"clamp(2rem,5vw,3rem)",color:T.textPri,letterSpacing:"-0.02em" }}>
            Tech <span style={{ background:`linear-gradient(135deg,${T.gold},${T.coral})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>Stack</span>
          </h2>
        </div>
      </Reveal>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:24 }}>
        {[{ title:"Backend",items:backend,hue:210,color:T.blue },{ title:"Frontend",items:frontend,hue:170,color:T.cyan }].map((side,si) => (
          <Reveal key={si} delay={si*0.15}>
            <GlassCard accentHue={side.hue} style={{ padding:"28px" }}>
              <div style={{ fontFamily:T.fMono,fontSize:"0.6rem",color:side.color,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:20 }}>{side.title}</div>
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                {side.items.map((item,i) => (
                  <div key={i} className="qs-tech-badge" style={{ display:"flex",alignItems:"center",gap:14,background:"rgba(0,0,0,0.3)",border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 16px",cursor:"default" }}>
                    <div style={{ width:8,height:8,borderRadius:"50%",background:item.color,boxShadow:`0 0 8px ${item.color}`,flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:T.fDisplay,fontWeight:600,fontSize:"0.82rem",color:T.textPri }}>{item.name}</div>
                      <div style={{ fontFamily:T.fMono,fontSize:"0.58rem",color:T.textMut,marginTop:1 }}>{item.role}</div>
                    </div>
                    <div style={{ fontFamily:T.fMono,fontSize:"0.6rem",color:item.color,opacity:0.7 }}>→</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   CTA
══════════════════════════════════════════════════════ */
function CTA({ onLaunch }) {
  return (
    <section style={{ maxWidth:1200,margin:"0 auto",padding:"0 32px 120px" }}>
      <Reveal>
        <div style={{
          position:"relative",borderRadius:28,overflow:"hidden",padding:"80px 60px",textAlign:"center",
          background:"linear-gradient(135deg,rgba(108,99,255,0.15) 0%,rgba(0,245,212,0.08) 50%,rgba(59,130,246,0.12) 100%)",
          border:`1px solid rgba(108,99,255,0.28)`,
          boxShadow:"0 0 80px rgba(108,99,255,0.15),inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>
          <div style={{ position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(108,99,255,0.06) 1px,transparent 1px)",backgroundSize:"32px 32px",pointerEvents:"none" }}/>
          <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:600,height:400,background:"radial-gradient(ellipse,rgba(108,99,255,0.12),transparent 70%)",pointerEvents:"none",filter:"blur(40px)" }}/>
          <div style={{ position:"relative",zIndex:1 }}>
            <SectionLabel text="Ready to Solve"/>
            <h2 style={{ fontFamily:T.fDisplay,fontWeight:800,fontSize:"clamp(2.2rem,5vw,3.5rem)",color:T.textPri,letterSpacing:"-0.02em",lineHeight:1.1,marginBottom:18 }}>
              Start Solving<br/>
              <span style={{ background:"linear-gradient(135deg,#6c63ff,#a78bfa 40%,#00f5d4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>Portfolio Equations</span>
            </h2>
            <p style={{ fontFamily:T.fBody,fontSize:"1.05rem",color:T.textSec,maxWidth:500,margin:"0 auto 44px",lineHeight:1.8 }}>
              Enter any linear equation. Get every valid whole-number portfolio combination instantly.
            </p>
            <div style={{ display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap" }}>
              <button className="qs-launch-btn" onClick={onLaunch} style={{
                background:"linear-gradient(135deg,#6c63ff,#5652e0 50%,#00c9b0)",
                border:"none",borderRadius:16,padding:"18px 44px",
                fontFamily:T.fDisplay,fontWeight:700,fontSize:"1rem",letterSpacing:"0.08em",
                textTransform:"uppercase",color:"#fff",cursor:"pointer",
                boxShadow:"0 0 50px rgba(108,99,255,0.5),0 8px 32px rgba(0,0,0,0.4)",
              }}>🚀 Launch Solver</button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer style={{ borderTop:`1px solid ${T.border}`,background:"rgba(3,6,15,0.8)",backdropFilter:"blur(20px)" }}>
      <div style={{ maxWidth:1200,margin:"0 auto",padding:"40px 32px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16 }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <LogoMark size={22}/>
          <div style={{ fontFamily:T.fDisplay,fontWeight:800,fontSize:"0.95rem",letterSpacing:"0.14em",background:"linear-gradient(135deg,#e8eaf6,#8b85ff 50%,#00f5d4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>QUANTSOLVE</div>
        </div>
        <span style={{ fontFamily:T.fMono,fontSize:"0.6rem",color:T.textMut }}>© 2026 · Hackathon Project · Built with React + Flask · No eval() · No SymPy</span>
        <a href="https://github.com/vaibhavzipare/INNOVATEX" target="_blank" rel="noreferrer"
          style={{ fontFamily:T.fMono,fontSize:"0.6rem",color:T.textSec,textDecoration:"none",display:"flex",alignItems:"center",gap:6 }}
          className="qs-nav-link">
          <GithubIcon/> GitHub
        </a>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════
   ROOT EXPORT
══════════════════════════════════════════════════════ */
export default function LandingPage({ onLaunch }) {
  const handleLaunch = useCallback(() => {
    if (typeof onLaunch === "function") onLaunch();
  }, [onLaunch]);

  return (
    <div style={{ background:T.bgRoot, minHeight:"100vh", overflowX:"hidden", overflowY: "auto" }}>
      <GlobalStyles/>
      <ParticleCanvas/>
      <Glows/>
      <GridBg/>
      <Navbar      onLaunch={handleLaunch}/>
      <Hero        onLaunch={handleLaunch}/>
      <StatsBar/>
      <Overview/>
      <Architecture/>
      <Modules/>
      <Algorithms/>
      <TestCases/>
      <TechStack/>
      <CTA         onLaunch={handleLaunch}/>
      <Footer/>
    </div>
  );
}
