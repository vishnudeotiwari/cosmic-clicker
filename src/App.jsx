import { useState, useEffect, useRef, useCallback } from "react";

// ─── Game Data ────────────────────────────────────────────────────────────────

const BUILDINGS = [
  { id: "panel",    emoji: "🌱", name: "Solar Panel",    desc: "Catches drifting starlight",        baseCost: 15,    baseSps: 0.1  },
  { id: "bot",      emoji: "🤖", name: "Star Bot",       desc: "Tirelessly harvests star dust",     baseCost: 100,   baseSps: 0.5  },
  { id: "scope",    emoji: "🔭", name: "Observatory",    desc: "Spots and claims distant stars",    baseCost: 500,   baseSps: 2    },
  { id: "rocket",   emoji: "🚀", name: "Rocket",         desc: "Flies out to collect them",         baseCost: 2000,  baseSps: 8    },
  { id: "station",  emoji: "🛸", name: "Space Station",  desc: "Orbiting star collector",           baseCost: 8000,  baseSps: 25   },
  { id: "nebula",   emoji: "🌀", name: "Nebula Farm",    desc: "Cultivates newborn stars",          baseCost: 30000, baseSps: 100  },
  { id: "hole",     emoji: "⚫", name: "Black Hole",     desc: "Pulls stars from other galaxies",   baseCost: 150000,baseSps: 400  },
  { id: "engine",   emoji: "🌌", name: "Galaxy Engine",  desc: "Manufactures whole star systems",   baseCost: 750000,baseSps: 2000 },
];

const CLICK_UPGRADES = [
  { id: "cu1", name: "Focused Light",    desc: "+1 star per click",  cost: 50,     bonus: 1  },
  { id: "cu2", name: "Solar Flare",      desc: "+3 stars per click", cost: 300,    bonus: 3  },
  { id: "cu3", name: "Supernova Tap",    desc: "+8 per click",       cost: 2000,   bonus: 8  },
  { id: "cu4", name: "Pulsar Burst",     desc: "+25 per click",      cost: 15000,  bonus: 25 },
  { id: "cu5", name: "Quasar Strike",    desc: "+100 per click",     cost: 100000, bonus: 100},
];

const MILESTONES = [
  { at: 100,         msg: "First light!",        emoji: "✨" },
  { at: 1000,        msg: "Stargazer",            emoji: "🔭" },
  { at: 10000,       msg: "Constellation",        emoji: "🌟" },
  { at: 100000,      msg: "Nebula Wanderer",      emoji: "🌀" },
  { at: 1000000,     msg: "Galaxy Brain",         emoji: "🌌" },
  { at: 10000000,    msg: "Cosmic Force",         emoji: "⚡" },
  { at: 1000000000,  msg: "Universe Architect",   emoji: "🌍" },
];

function buildingCost(base, owned) {
  return Math.floor(base * Math.pow(1.15, owned));
}

function fmt(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3)  return (n / 1e3).toFixed(1) + "K";
  return Math.floor(n).toString();
}

// ─── Floating Number Component ────────────────────────────────────────────────

function FloatNum({ item }) {
  return (
    <div style={{
      position: "fixed", left: item.x, top: item.y,
      pointerEvents: "none", zIndex: 9999,
      fontFamily: "'Orbitron', sans-serif",
      fontWeight: 700, fontSize: 15,
      color: "#ffd700",
      textShadow: "0 0 8px #ffaa00",
      animation: "floatUp 1.1s ease-out forwards",
    }}>+{item.val}⭐</div>
  );
}

// ─── Sun Component ────────────────────────────────────────────────────────────

function Sun({ onClick, clickPower }) {
  const [clicked, setClicked] = useState(false);
  const [particles, setParticles] = useState([]);

  const handleClick = (e) => {
    setClicked(true);
    setTimeout(() => setClicked(false), 120);
    const id = Date.now() + Math.random();
    const angle = Math.random() * Math.PI * 2;
    setParticles(p => [...p, { id, angle }]);
    setTimeout(() => setParticles(p => p.filter(x => x.id !== id)), 700);
    onClick(e);
  };

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Outer glow ring */}
      <div style={{
        position: "absolute", width: 230, height: 230, borderRadius: "50%",
        background: "radial-gradient(circle, #ffcc0015 0%, transparent 70%)",
        animation: "breathe 3s ease-in-out infinite",
        pointerEvents: "none",
      }} />
      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          width: 8, height: 8, borderRadius: "50%",
          background: "#ffd700",
          boxShadow: "0 0 6px #ffd700",
          animation: "particlePop 0.7s ease-out forwards",
          transformOrigin: "center",
          left: "50%", top: "50%",
          marginLeft: -4, marginTop: -4,
          "--angle": p.angle + "rad",
        }} />
      ))}
      {/* The Sun */}
      <div
        onClick={handleClick}
        style={{
          width: 160, height: 160, borderRadius: "50%",
          cursor: "pointer",
          background: "radial-gradient(circle at 38% 38%, #fff7aa, #ffd700 40%, #ff8c00 75%, #c45000)",
          boxShadow: clicked
            ? "0 0 20px #ffd700, 0 0 50px #ff8c0080"
            : "0 0 40px #ffd70060, 0 0 80px #ff8c0040, 0 0 120px #ff440020",
          transform: clicked ? "scale(0.93)" : "scale(1)",
          transition: "transform 0.1s, box-shadow 0.1s",
          animation: "sunPulse 4s ease-in-out infinite",
          userSelect: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 52,
        }}
      >
        ☀️
      </div>
      {/* Click power label */}
      <div style={{
        position: "absolute", bottom: -28,
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 12, color: "#ffd70099", letterSpacing: 1,
      }}>
        +{clickPower} per click
      </div>
    </div>
  );
}

// ─── Building Row ─────────────────────────────────────────────────────────────

function BuildingRow({ b, owned, cost, canAfford, onBuy, sps }) {
  return (
    <button
      onClick={onBuy}
      disabled={!canAfford}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "8px 12px",
        background: canAfford ? "rgba(255,215,0,0.07)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${canAfford ? "#ffd70030" : "#ffffff0d"}`,
        borderRadius: 10, cursor: canAfford ? "pointer" : "not-allowed",
        transition: "background 0.15s, border-color 0.15s",
        textAlign: "left", color: "inherit",
        opacity: canAfford ? 1 : 0.45,
      }}
      onMouseEnter={e => canAfford && (e.currentTarget.style.background = "rgba(255,215,0,0.14)")}
      onMouseLeave={e => e.currentTarget.style.background = canAfford ? "rgba(255,215,0,0.07)" : "rgba(255,255,255,0.02)"}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>{b.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700,
          color: canAfford ? "#ffd700" : "#aaa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {b.name}
        </div>
        <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>{b.desc}</div>
        <div style={{ fontSize: 10, color: "#ffd70080", marginTop: 1 }}>
          {sps > 0 ? `${sps.toFixed(1)} ⭐/s total` : `${b.baseSps} ⭐/s each`}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: canAfford ? "#ffd700" : "#666" }}>
          {fmt(cost)} ⭐
        </div>
        <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
          owned: <span style={{ color: "#ddd" }}>{owned}</span>
        </div>
      </div>
    </button>
  );
}

// ─── Main Game ────────────────────────────────────────────────────────────────

export default function CosmicClicker() {
  const [stars, setStars] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [buildings, setBuildings] = useState(() => Object.fromEntries(BUILDINGS.map(b => [b.id, 0])));
  const [boughtUpgrades, setBoughtUpgrades] = useState([]);
  const [floats, setFloats] = useState([]);
  const [milestone, setMilestone] = useState(null);
  const [shownMilestones, setShownMilestones] = useState([]);

  const starsRef = useRef(0);
  const totalRef = useRef(0);
  const buildingsRef = useRef(buildings);
  buildingsRef.current = buildings;

  const clickPower = 1 + boughtUpgrades.reduce((sum, id) => {
    const u = CLICK_UPGRADES.find(x => x.id === id);
    return sum + (u ? u.bonus : 0);
  }, 0);

  const sps = BUILDINGS.reduce((sum, b) => sum + (buildings[b.id] * b.baseSps), 0);

  // Auto-produce stars
  useEffect(() => {
    starsRef.current = stars;
  }, [stars]);

  useEffect(() => {
    const tick = setInterval(() => {
      const gain = BUILDINGS.reduce((sum, b) => sum + (buildingsRef.current[b.id] * b.baseSps), 0) / 20;
      setStars(s => s + gain);
      setTotalStars(t => {
        totalRef.current = t + gain;
        return t + gain;
      });
    }, 50);
    return () => clearInterval(tick);
  }, []);

  // Milestone check
  useEffect(() => {
    for (const m of MILESTONES) {
      if (totalStars >= m.at && !shownMilestones.includes(m.at)) {
        setShownMilestones(s => [...s, m.at]);
        setMilestone(m);
        setTimeout(() => setMilestone(null), 3000);
        break;
      }
    }
  }, [totalStars, shownMilestones]);

  const handleSunClick = useCallback((e) => {
    const gain = clickPower;
    setStars(s => s + gain);
    setTotalStars(t => t + gain);
    // Floating number
    const id = Date.now() + Math.random();
    const jitter = () => (Math.random() - 0.5) * 60;
    setFloats(f => [...f, { id, x: e.clientX + jitter(), y: e.clientY - 20 + jitter(), val: gain }]);
    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1100);
  }, [clickPower]);

  const buyBuilding = (b) => {
    const cost = buildingCost(b.baseCost, buildings[b.id]);
    if (stars < cost) return;
    setStars(s => s - cost);
    setBuildings(prev => ({ ...prev, [b.id]: prev[b.id] + 1 }));
  };

  const buyUpgrade = (u) => {
    if (stars < u.cost || boughtUpgrades.includes(u.id)) return;
    setStars(s => s - u.cost);
    setBoughtUpgrades(prev => [...prev, u.id]);
  };

  const nextMilestone = MILESTONES.find(m => totalStars < m.at);
  const milestoneProgress = nextMilestone
    ? Math.min(1, totalStars / nextMilestone.at)
    : 1;

  return (
    <div style={{
      minHeight: "100vh", background: "#04060f",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: "#e8e8f0", overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-70px) scale(0.8); }
        }
        @keyframes sunPulse {
          0%, 100% { box-shadow: 0 0 40px #ffd70060, 0 0 80px #ff8c0040; }
          50%       { box-shadow: 0 0 60px #ffd70080, 0 0 120px #ff8c0060; }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50%       { transform: scale(1.08); opacity: 1; }
        }
        @keyframes particlePop {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(calc(cos(var(--angle)) * 60px), calc(sin(var(--angle)) * 60px)) scale(0); opacity: 0; }
        }
        @keyframes milestoneIn {
          0%   { opacity: 0; transform: translateY(20px) scale(0.9); }
          15%  { opacity: 1; transform: translateY(0) scale(1.05); }
          85%  { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        @keyframes starfield {
          from { transform: translateY(0); }
          to   { transform: translateY(-50%); }
        }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #0a0c18; }
        ::-webkit-scrollbar-thumb { background: #ffd70030; border-radius: 3px; }
      `}</style>

      {/* Starfield background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden",
      }}>
        {Array.from({ length: 80 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: Math.random() > 0.85 ? 2 : 1,
            height: Math.random() > 0.85 ? 2 : 1,
            borderRadius: "50%",
            background: "#fff",
            opacity: Math.random() * 0.6 + 0.1,
          }} />
        ))}
      </div>

      {/* Floating numbers */}
      {floats.map(f => <FloatNum key={f.id} item={f} />)}

      {/* Milestone toast */}
      {milestone && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, background: "linear-gradient(135deg, #1a1030, #2a1a50)",
          border: "1px solid #ffd70060", borderRadius: 16,
          padding: "14px 28px", textAlign: "center",
          animation: "milestoneIn 3s ease forwards",
          boxShadow: "0 0 30px #ffd70030",
        }}>
          <div style={{ fontSize: 28 }}>{milestone.emoji}</div>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "#ffd700", marginTop: 4 }}>
            {milestone.msg}
          </div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
            {fmt(milestone.at)} stars reached!
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        position: "relative", zIndex: 10,
        padding: "14px 20px", borderBottom: "1px solid #ffffff08",
        background: "rgba(4,6,15,0.85)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 18,
            letterSpacing: 3, color: "#ffd700", textShadow: "0 0 20px #ffd70060" }}>
            ✦ COSMIC CLICKER
          </div>
          <div style={{ fontSize: 11, color: "#888", letterSpacing: 1, marginTop: 2 }}>
            ALL-TIME: {fmt(totalStars)} ⭐
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 26, fontWeight: 900,
            color: "#ffd700", textShadow: "0 0 15px #ffd70080", lineHeight: 1 }}>
            {fmt(stars)} ⭐
          </div>
          <div style={{ fontSize: 12, color: "#ffd70099", marginTop: 3 }}>
            {sps.toFixed(1)} per second
          </div>
        </div>
      </div>

      {/* Progress bar toward next milestone */}
      {nextMilestone && (
        <div style={{ position: "relative", zIndex: 10, height: 3, background: "#ffffff08" }}>
          <div style={{
            height: "100%", background: "linear-gradient(90deg, #ffd700, #ff8c00)",
            width: `${milestoneProgress * 100}%`,
            transition: "width 0.5s",
            boxShadow: "0 0 8px #ffd70080",
          }} />
        </div>
      )}

      {/* Main layout */}
      <div style={{
        position: "relative", zIndex: 10,
        flex: 1, display: "flex", flexWrap: "wrap",
        overflow: "hidden",
      }}>

        {/* Left: Sun + click upgrades */}
        <div style={{
          flex: "1 1 300px", display: "flex", flexDirection: "column",
          alignItems: "center", padding: "40px 20px 24px",
          borderRight: "1px solid #ffffff08",
          minHeight: 400,
        }}>
          <Sun onClick={handleSunClick} clickPower={clickPower} />

          {/* Click Upgrades */}
          <div style={{ marginTop: 60, width: "100%", maxWidth: 320 }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10,
              letterSpacing: 2, color: "#ffd70060", marginBottom: 10, textAlign: "center" }}>
              CLICK UPGRADES
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {CLICK_UPGRADES.map(u => {
                const bought = boughtUpgrades.includes(u.id);
                const canAfford = !bought && stars >= u.cost;
                return (
                  <button key={u.id} onClick={() => buyUpgrade(u)} disabled={bought || !canAfford}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px", borderRadius: 8,
                      background: bought ? "rgba(255,215,0,0.05)" : canAfford ? "rgba(255,215,0,0.08)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${bought ? "#ffd70040" : canAfford ? "#ffd70030" : "#ffffff0a"}`,
                      cursor: bought ? "default" : canAfford ? "pointer" : "not-allowed",
                      opacity: bought ? 0.5 : canAfford ? 1 : 0.35,
                      color: "inherit",
                      transition: "background 0.15s",
                    }}>
                    <div>
                      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10,
                        color: bought ? "#ffd70060" : "#ffd700" }}>
                        {bought ? "✓ " : ""}{u.name}
                      </div>
                      <div style={{ fontSize: 10, color: "#666", marginTop: 1 }}>{u.desc}</div>
                    </div>
                    {!bought && (
                      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11,
                        color: canAfford ? "#ffd700" : "#555", flexShrink: 0, marginLeft: 8 }}>
                        {fmt(u.cost)} ⭐
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Buildings */}
        <div style={{
          flex: "1 1 300px", display: "flex", flexDirection: "column",
          padding: "20px 16px",
          overflow: "hidden",
        }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10,
            letterSpacing: 2, color: "#ffd70060", marginBottom: 12, textAlign: "center" }}>
            STAR GENERATORS
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
            {BUILDINGS.map(b => {
              const owned = buildings[b.id];
              const cost = buildingCost(b.baseCost, owned);
              const canAfford = stars >= cost;
              const totalSps = owned * b.baseSps;
              return (
                <BuildingRow
                  key={b.id} b={b} owned={owned}
                  cost={cost} canAfford={canAfford}
                  onBuy={() => buyBuilding(b)}
                  sps={totalSps}
                />
              );
            })}
          </div>

          {/* Stats footer */}
          <div style={{
            marginTop: 16, padding: "10px 12px",
            background: "rgba(255,215,0,0.04)",
            border: "1px solid #ffd70015", borderRadius: 10,
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
          }}>
            {[
              ["Stars/click", `${clickPower} ⭐`],
              ["Stars/sec", `${sps.toFixed(1)} ⭐`],
              ["Generators", Object.values(buildings).reduce((a, b) => a + b, 0)],
              ["Upgrades", `${boughtUpgrades.length}/${CLICK_UPGRADES.length}`],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 9, letterSpacing: 1, color: "#666", textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "#ffd700", marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
