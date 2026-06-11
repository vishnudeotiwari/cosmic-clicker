import { useState, useEffect, useRef, useCallback } from "react";

// ─── Game Data ────────────────────────────────────────────────────────────────

const BUILDINGS = [
  { id: "panel",   emoji: "🌱", name: "Solar Panel",   desc: "Catches drifting starlight",      baseCost: 15,     baseSps: 0.1  },
  { id: "bot",     emoji: "🤖", name: "Star Bot",      desc: "Tirelessly harvests star dust",   baseCost: 100,    baseSps: 0.5  },
  { id: "scope",   emoji: "🔭", name: "Observatory",   desc: "Spots and claims distant stars",  baseCost: 500,    baseSps: 2    },
  { id: "rocket",  emoji: "🚀", name: "Rocket",        desc: "Flies out to collect them",       baseCost: 2000,   baseSps: 8    },
  { id: "station", emoji: "🛸", name: "Space Station", desc: "Orbiting star collector",         baseCost: 8000,   baseSps: 25   },
  { id: "nebula",  emoji: "🌀", name: "Nebula Farm",   desc: "Cultivates newborn stars",        baseCost: 30000,  baseSps: 100  },
  { id: "hole",    emoji: "⚫", name: "Black Hole",    desc: "Pulls stars from other galaxies", baseCost: 150000, baseSps: 400  },
  { id: "engine",  emoji: "🌌", name: "Galaxy Engine", desc: "Manufactures whole star systems", baseCost: 750000, baseSps: 2000 },
];

const CLICK_UPGRADES = [
  { id: "cu1", name: "Focused Light",  desc: "+1 star per click",   cost: 50,     bonus: 1   },
  { id: "cu2", name: "Solar Flare",    desc: "+3 stars per click",  cost: 300,    bonus: 3   },
  { id: "cu3", name: "Supernova Tap",  desc: "+8 per click",        cost: 2000,   bonus: 8   },
  { id: "cu4", name: "Pulsar Burst",   desc: "+25 per click",       cost: 15000,  bonus: 25  },
  { id: "cu5", name: "Quasar Strike",  desc: "+100 per click",      cost: 100000, bonus: 100 },
];

// Rebirth upgrades — bought with quarks, persist across rebirths
const REBIRTH_UPGRADES = [
  { id: "ru1", name: "Quark Resonance",   emoji: "⚛️",  desc: "Start each run with 50 free stars",        cost: 1,  effect: "startStars", value: 50   },
  { id: "ru2", name: "Stellar Memory",    emoji: "🧠",  desc: "Buildings cost 10% less",                  cost: 2,  effect: "costMult",   value: 0.90 },
  { id: "ru3", name: "Quark Magnet",      emoji: "🧲",  desc: "Earn 25% more quarks on rebirth",          cost: 3,  effect: "quarkBonus", value: 0.25 },
  { id: "ru4", name: "Star Imprint",      emoji: "🌠",  desc: "Start with +2 click power",                cost: 3,  effect: "clickBonus", value: 2    },
  { id: "ru5", name: "Void Acceleration", emoji: "⚡",  desc: "All generators produce 20% more",          cost: 5,  effect: "spsBoost",   value: 0.20 },
  { id: "ru6", name: "Cosmic Echo",       emoji: "🔮",  desc: "Buildings cost 20% less (stacks)",         cost: 6,  effect: "costMult",   value: 0.80 },
  { id: "ru7", name: "Quark Cascade",     emoji: "💠",  desc: "Earn 50% more quarks on rebirth (stacks)", cost: 8,  effect: "quarkBonus", value: 0.50 },
  { id: "ru8", name: "Singularity Core",  emoji: "🌑",  desc: "All generators produce 50% more (stacks)", cost: 12, effect: "spsBoost",   value: 0.50 },
];

const MILESTONES = [
  { at: 100,        msg: "First light!",       emoji: "✨" },
  { at: 1000,       msg: "Stargazer",          emoji: "🔭" },
  { at: 10000,      msg: "Constellation",      emoji: "🌟" },
  { at: 100000,     msg: "Nebula Wanderer",    emoji: "🌀" },
  { at: 1000000,    msg: "Galaxy Brain",       emoji: "🌌" },
  { at: 10000000,   msg: "Cosmic Force",       emoji: "⚡" },
  { at: 1000000000, msg: "Universe Architect", emoji: "🌍" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildingCost(base, owned, costMult) {
  return Math.floor(base * Math.pow(1.15, owned) * costMult);
}

function fmt(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3)  return (n / 1e3).toFixed(1) + "K";
  return Math.floor(n).toString();
}

// Quark formula: R(sqrt(x)) where x = stars / 1_000_000
// Math.round rounds 0.5 up in JS — matches spec
function calcQuarks(totalStars, quarkMult) {
  const x = totalStars / 1_000_000;
  if (x <= 0) return 0;
  return Math.max(0, Math.round(Math.sqrt(x) * (1 + quarkMult)));
}

// ─── Floating Number ──────────────────────────────────────────────────────────

function FloatNum({ item }) {
  return (
    <div style={{
      position: "fixed", left: item.x, top: item.y,
      pointerEvents: "none", zIndex: 9999,
      fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 15,
      color: item.quark ? "#a78bfa" : "#ffd700",
      textShadow: item.quark ? "0 0 8px #7c3aed" : "0 0 8px #ffaa00",
      animation: "floatUp 1.1s ease-out forwards",
    }}>{item.label}</div>
  );
}

// ─── Sun ──────────────────────────────────────────────────────────────────────

function Sun({ onClick, clickPower }) {
  const [clicked, setClicked] = useState(false);
  const [particles, setParticles] = useState([]);
  const handleClick = (e) => {
    setClicked(true);
    setTimeout(() => setClicked(false), 120);
    const id = Date.now() + Math.random();
    setParticles(p => [...p, { id, angle: Math.random() * Math.PI * 2 }]);
    setTimeout(() => setParticles(p => p.filter(x => x.id !== id)), 700);
    onClick(e);
  };
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", width: 230, height: 230, borderRadius: "50%",
        background: "radial-gradient(circle, #ffcc0015 0%, transparent 70%)",
        animation: "breathe 3s ease-in-out infinite", pointerEvents: "none" }} />
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute", width: 8, height: 8, borderRadius: "50%",
          background: "#ffd700", boxShadow: "0 0 6px #ffd700",
          animation: "particlePop 0.7s ease-out forwards",
          left: "50%", top: "50%", marginLeft: -4, marginTop: -4,
          "--angle": p.angle + "rad",
        }} />
      ))}
      <div onClick={handleClick} style={{
        width: 160, height: 160, borderRadius: "50%", cursor: "pointer",
        background: "radial-gradient(circle at 38% 38%, #fff7aa, #ffd700 40%, #ff8c00 75%, #c45000)",
        boxShadow: clicked
          ? "0 0 20px #ffd700, 0 0 50px #ff8c0080"
          : "0 0 40px #ffd70060, 0 0 80px #ff8c0040, 0 0 120px #ff440020",
        transform: clicked ? "scale(0.93)" : "scale(1)",
        transition: "transform 0.1s, box-shadow 0.1s",
        animation: "sunPulse 4s ease-in-out infinite",
        userSelect: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52,
      }}>☀️</div>
      <div style={{ position: "absolute", bottom: -28, fontFamily: "'Orbitron', sans-serif",
        fontSize: 12, color: "#ffd70099", letterSpacing: 1 }}>+{clickPower} per click</div>
    </div>
  );
}

// ─── Building Row ─────────────────────────────────────────────────────────────

function BuildingRow({ b, owned, cost, canAfford, onBuy, sps }) {
  return (
    <button onClick={onBuy} disabled={!canAfford} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px",
      background: canAfford ? "rgba(255,215,0,0.07)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${canAfford ? "#ffd70030" : "#ffffff0d"}`,
      borderRadius: 10, cursor: canAfford ? "pointer" : "not-allowed",
      transition: "background 0.15s", textAlign: "left", color: "inherit",
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
        <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>owned: <span style={{ color: "#ddd" }}>{owned}</span></div>
      </div>
    </button>
  );
}

// ─── Rebirth Screen ───────────────────────────────────────────────────────────

function RebirthScreen({ totalStars, quarks, rebirthUpgrades, onBuyRebirthUpgrade, onConfirmRebirth, onCancel, pendingQuarks }) {
  const [confirmStep, setConfirmStep] = useState(false);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "radial-gradient(ellipse at center, #1a0a2e 0%, #07030f 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "'Orbitron', sans-serif", color: "#e8e8f0",
      overflowY: "auto", padding: "30px 16px 40px",
    }}>
      {/* Purple starfield */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${(i * 37.3) % 100}%`,
            top: `${(i * 53.7) % 100}%`,
            width: 1, height: 1, borderRadius: "50%",
            background: "#a78bfa", opacity: 0.3 + (i % 5) * 0.1,
          }} />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 560 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🌀</div>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, color: "#a78bfa",
            textShadow: "0 0 20px #7c3aed" }}>REBIRTH</div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 6, letterSpacing: 1 }}>
            COLLAPSE YOUR UNIVERSE. EMERGE STRONGER.
          </div>
        </div>

        {/* Quark preview */}
        <div style={{
          background: "rgba(124,58,237,0.12)", border: "1px solid #7c3aed40",
          borderRadius: 14, padding: "16px 20px", marginBottom: 20, textAlign: "center",
        }}>
          <div style={{ fontSize: 11, color: "#a78bfa99", letterSpacing: 2, marginBottom: 6 }}>YOU WILL RECEIVE</div>
          <div style={{ fontSize: 42, fontWeight: 900, color: "#a78bfa",
            textShadow: "0 0 20px #7c3aed80", lineHeight: 1 }}>
            {pendingQuarks} ⚛️
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
            QUARKS &nbsp;·&nbsp; Total after rebirth: {quarks + pendingQuarks} ⚛️
          </div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>
            R(√{(totalStars / 1_000_000).toFixed(3)}) = {pendingQuarks}
          </div>
          {pendingQuarks === 0 && (
            <div style={{ fontSize: 11, color: "#ff6688", marginTop: 10 }}>
              ⚠ Reach at least 1M stars to earn quarks
            </div>
          )}
        </div>

        {/* What you lose / keep */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid #ef444430",
            borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: "#ef4444", letterSpacing: 1, marginBottom: 6 }}>✗ YOU LOSE</div>
            {["All stars", "All buildings", "Click upgrades", "All-time stars"].map(x => (
              <div key={x} style={{ fontSize: 10, color: "#ef444480", marginBottom: 3 }}>✗ {x}</div>
            ))}
          </div>
          <div style={{ background: "rgba(34,197,94,0.07)", border: "1px solid #22c55e30",
            borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: "#22c55e", letterSpacing: 1, marginBottom: 6 }}>✓ YOU KEEP</div>
            {["Quarks", "Rebirth upgrades", "Rebirth count"].map(x => (
              <div key={x} style={{ fontSize: 10, color: "#22c55e80", marginBottom: 3 }}>✓ {x}</div>
            ))}
          </div>
        </div>

        {/* Rebirth Upgrades Shop */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#a78bfa80",
            marginBottom: 12, textAlign: "center" }}>
            REBIRTH UPGRADES &nbsp;·&nbsp; <span style={{ color: "#a78bfa" }}>{quarks} ⚛️ available</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {REBIRTH_UPGRADES.map(ru => {
              const bought = rebirthUpgrades.includes(ru.id);
              const canSpend = !bought && quarks >= ru.cost;
              return (
                <button key={ru.id}
                  onClick={() => canSpend && onBuyRebirthUpgrade(ru)}
                  disabled={bought || !canSpend}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                    background: bought ? "rgba(124,58,237,0.08)" : canSpend ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${bought ? "#7c3aed40" : canSpend ? "#7c3aed60" : "#ffffff0a"}`,
                    borderRadius: 10,
                    cursor: bought ? "default" : canSpend ? "pointer" : "not-allowed",
                    opacity: bought ? 0.55 : canSpend ? 1 : 0.4,
                    color: "inherit", textAlign: "left", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => canSpend && (e.currentTarget.style.background = "rgba(124,58,237,0.28)")}
                  onMouseLeave={e => e.currentTarget.style.background = bought ? "rgba(124,58,237,0.08)" : canSpend ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.02)"}
                >
                  <span style={{ fontSize: 22 }}>{ru.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: bought ? "#a78bfa80" : "#a78bfa" }}>
                      {bought ? "✓ " : ""}{ru.name}
                    </div>
                    <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{ru.desc}</div>
                  </div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12,
                    color: bought ? "#555" : canSpend ? "#a78bfa" : "#444", flexShrink: 0 }}>
                    {bought ? "owned" : `${ru.cost} ⚛️`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "12px", borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: "1px solid #ffffff15",
            color: "#aaa", fontFamily: "'Orbitron', sans-serif", fontSize: 11,
            cursor: "pointer", letterSpacing: 1,
          }}>← BACK</button>
          {!confirmStep ? (
            <button onClick={() => setConfirmStep(true)} style={{
              flex: 2, padding: "12px", borderRadius: 10,
              background: "linear-gradient(135deg, #4c1d95, #7c3aed)",
              border: "1px solid #7c3aed80", color: "#fff",
              fontFamily: "'Orbitron', sans-serif", fontSize: 11,
              cursor: "pointer", letterSpacing: 1,
              boxShadow: "0 0 20px #7c3aed40",
            }}>REBIRTH +{pendingQuarks} ⚛️</button>
          ) : (
            <button onClick={onConfirmRebirth} style={{
              flex: 2, padding: "12px", borderRadius: 10,
              background: "linear-gradient(135deg, #7f1d1d, #ef4444)",
              border: "1px solid #ef444480", color: "#fff",
              fontFamily: "'Orbitron', sans-serif", fontSize: 11,
              cursor: "pointer", letterSpacing: 1,
              animation: "breathe 1s ease-in-out infinite",
              boxShadow: "0 0 20px #ef444440",
            }}>⚠ CONFIRM REBIRTH</button>
          )}
        </div>
        {confirmStep && (
          <div style={{ textAlign: "center", fontSize: 10, color: "#ef444480", marginTop: 8 }}>
            This cannot be undone. Your stars and buildings will be lost forever.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Rebirth Badge ────────────────────────────────────────────────────────────

function RebirthBadge({ rebirthCount, quarks, activeEffects }) {
  const [expanded, setExpanded] = useState(false);
  if (rebirthCount === 0) return null;
  return (
    <div style={{ position: "fixed", bottom: 16, left: 16, zIndex: 100, maxWidth: 260 }}>
      <div onClick={() => setExpanded(e => !e)} style={{
        background: "rgba(88,28,200,0.88)", border: "1px solid #a78bfa50",
        borderRadius: expanded ? "12px 12px 0 0" : 12,
        padding: "7px 13px", cursor: "pointer",
        fontFamily: "'Orbitron', sans-serif", fontSize: 10,
        color: "#e9d5ff", letterSpacing: 1,
        boxShadow: "0 0 16px #7c3aed50",
        display: "flex", alignItems: "center", gap: 8, userSelect: "none",
      }}>
        <span>🌀</span>
        <span>REBORN ×{rebirthCount}</span>
        <span style={{ color: "#c4b5fd" }}>⚛️ {quarks}</span>
        <span style={{ fontSize: 8, opacity: 0.7, marginLeft: "auto" }}>{expanded ? "▼" : "▲"}</span>
      </div>
      {expanded && (
        <div style={{
          background: "rgba(12,4,28,0.97)", border: "1px solid #7c3aed30",
          borderTop: "none", borderRadius: "0 0 12px 12px", padding: "10px 13px",
        }}>
          <div style={{ fontSize: 9, letterSpacing: 1, color: "#a78bfa60", marginBottom: 7 }}>ACTIVE BONUSES</div>
          {activeEffects.length === 0
            ? <div style={{ fontSize: 10, color: "#444" }}>No upgrades purchased yet</div>
            : activeEffects.map((ef, i) => (
              <div key={i} style={{ fontSize: 10, color: "#c4b5fd", marginBottom: 4, lineHeight: 1.4 }}>✦ {ef}</div>
            ))
          }
        </div>
      )}
    </div>
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

  // Persistent rebirth state
  const [quarks, setQuarks] = useState(0);
  const [rebirthCount, setRebirthCount] = useState(0);
  const [rebirthUpgrades, setRebirthUpgrades] = useState([]);
  const [showRebirth, setShowRebirth] = useState(false);

  const buildingsRef = useRef(buildings);
  buildingsRef.current = buildings;
  const spsBoostRef = useRef(0);

  // ── Compute rebirth effects ──
  const costMult = rebirthUpgrades.reduce((m, id) => {
    const ru = REBIRTH_UPGRADES.find(x => x.id === id);
    return ru?.effect === "costMult" ? m * ru.value : m;
  }, 1);

  const spsBoost = rebirthUpgrades.reduce((m, id) => {
    const ru = REBIRTH_UPGRADES.find(x => x.id === id);
    return ru?.effect === "spsBoost" ? m + ru.value : m;
  }, 0);
  spsBoostRef.current = spsBoost;

  const quarkMult = rebirthUpgrades.reduce((m, id) => {
    const ru = REBIRTH_UPGRADES.find(x => x.id === id);
    return ru?.effect === "quarkBonus" ? m + ru.value : m;
  }, 0);

  const clickBonus = rebirthUpgrades.reduce((m, id) => {
    const ru = REBIRTH_UPGRADES.find(x => x.id === id);
    return ru?.effect === "clickBonus" ? m + ru.value : m;
  }, 0);

  const startStars = rebirthUpgrades.reduce((m, id) => {
    const ru = REBIRTH_UPGRADES.find(x => x.id === id);
    return ru?.effect === "startStars" ? m + ru.value : m;
  }, 0);

  const clickPower = 1 + clickBonus + boughtUpgrades.reduce((sum, id) => {
    const u = CLICK_UPGRADES.find(x => x.id === id);
    return sum + (u ? u.bonus : 0);
  }, 0);

  const sps = BUILDINGS.reduce((sum, b) => sum + (buildings[b.id] * b.baseSps * (1 + spsBoost)), 0);
  const pendingQuarks = calcQuarks(totalStars, quarkMult);

  const activeEffects = rebirthUpgrades.map(id => {
    const ru = REBIRTH_UPGRADES.find(x => x.id === id);
    return ru ? `${ru.emoji} ${ru.name}: ${ru.desc}` : null;
  }).filter(Boolean);

  // Auto-produce stars
  useEffect(() => {
    const tick = setInterval(() => {
      const gain = BUILDINGS.reduce(
        (sum, b) => sum + (buildingsRef.current[b.id] * b.baseSps * (1 + spsBoostRef.current)), 0
      ) / 20;
      setStars(s => s + gain);
      setTotalStars(t => t + gain);
    }, 50);
    return () => clearInterval(tick);
  }, []);

  // Milestones
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
    const id = Date.now() + Math.random();
    const jitter = () => (Math.random() - 0.5) * 60;
    setFloats(f => [...f, { id, x: e.clientX + jitter(), y: e.clientY - 20 + jitter(), label: `+${gain}⭐`, quark: false }]);
    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1100);
  }, [clickPower]);

  const buyBuilding = (b) => {
    const cost = buildingCost(b.baseCost, buildings[b.id], costMult);
    if (stars < cost) return;
    setStars(s => s - cost);
    setBuildings(prev => ({ ...prev, [b.id]: prev[b.id] + 1 }));
  };

  const buyUpgrade = (u) => {
    if (stars < u.cost || boughtUpgrades.includes(u.id)) return;
    setStars(s => s - u.cost);
    setBoughtUpgrades(prev => [...prev, u.id]);
  };

  const buyRebirthUpgrade = (ru) => {
    if (quarks < ru.cost || rebirthUpgrades.includes(ru.id)) return;
    setQuarks(q => q - ru.cost);
    setRebirthUpgrades(prev => [...prev, ru.id]);
  };

  const confirmRebirth = () => {
    const earned = pendingQuarks;
    // Reset this run completely
    setStars(startStars);
    setTotalStars(0);
    setBuildings(Object.fromEntries(BUILDINGS.map(b => [b.id, 0])));
    setBoughtUpgrades([]);
    setShownMilestones([]);
    setMilestone(null);
    setFloats([]);
    // Grant quarks + increment
    setQuarks(q => q + earned);
    setRebirthCount(r => r + 1);
    setShowRebirth(false);
    // Show quark float
    const id = Date.now();
    setTimeout(() => {
      setFloats([{ id, x: window.innerWidth / 2 - 50, y: window.innerHeight / 2 - 20, label: `+${earned} ⚛️`, quark: true }]);
      setTimeout(() => setFloats([]), 1200);
    }, 100);
  };

  const nextMilestone = MILESTONES.find(m => totalStars < m.at);
  const milestoneProgress = nextMilestone ? Math.min(1, totalStars / nextMilestone.at) : 1;
  const rebirthReady = totalStars >= 1_000_000;

  return (
    <div style={{ minHeight: "100vh", background: "#04060f",
      fontFamily: "'Inter', system-ui, sans-serif", color: "#e8e8f0",
      overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes floatUp { 0% { opacity:1;transform:translateY(0) scale(1); } 100% { opacity:0;transform:translateY(-70px) scale(0.8); } }
        @keyframes sunPulse { 0%,100% { box-shadow:0 0 40px #ffd70060,0 0 80px #ff8c0040; } 50% { box-shadow:0 0 60px #ffd70080,0 0 120px #ff8c0060; } }
        @keyframes breathe { 0%,100% { transform:scale(1);opacity:0.6; } 50% { transform:scale(1.06);opacity:1; } }
        @keyframes particlePop { 0% { transform:translate(0,0) scale(1);opacity:1; } 100% { transform:translate(calc(cos(var(--angle))*60px),calc(sin(var(--angle))*60px)) scale(0);opacity:0; } }
        @keyframes milestoneIn { 0% { opacity:0;transform:translateY(20px) scale(0.9); } 15% { opacity:1;transform:translateY(0) scale(1.05); } 85% { opacity:1; } 100% { opacity:0;transform:translateY(-10px); } }
        @keyframes rebirthGlow { 0%,100% { box-shadow:0 0 8px #7c3aed40; } 50% { box-shadow:0 0 20px #7c3aed, 0 0 40px #7c3aed50; } }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:#0a0c18; }
        ::-webkit-scrollbar-thumb { background:#ffd70030;border-radius:3px; }
      `}</style>

      {/* Rebirth overlay */}
      {showRebirth && (
        <RebirthScreen
          totalStars={totalStars} quarks={quarks}
          rebirthUpgrades={rebirthUpgrades}
          onBuyRebirthUpgrade={buyRebirthUpgrade}
          onConfirmRebirth={confirmRebirth}
          onCancel={() => setShowRebirth(false)}
          pendingQuarks={pendingQuarks}
        />
      )}

      {/* Starfield */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        {Array.from({ length: 80 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${(i * 41.7) % 100}%`,
            top: `${(i * 67.3) % 100}%`,
            width: i % 8 === 0 ? 2 : 1, height: i % 8 === 0 ? 2 : 1,
            borderRadius: "50%", background: "#fff", opacity: 0.1 + (i % 6) * 0.08,
          }} />
        ))}
      </div>

      {/* Floats */}
      {floats.map(f => <FloatNum key={f.id} item={f} />)}

      {/* Milestone toast */}
      {milestone && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, background: "linear-gradient(135deg, #1a1030, #2a1a50)",
          border: "1px solid #ffd70060", borderRadius: 16, padding: "14px 28px", textAlign: "center",
          animation: "milestoneIn 3s ease forwards", boxShadow: "0 0 30px #ffd70030" }}>
          <div style={{ fontSize: 28 }}>{milestone.emoji}</div>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "#ffd700", marginTop: 4 }}>{milestone.msg}</div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{fmt(milestone.at)} stars reached!</div>
        </div>
      )}

      {/* Header */}
      <div style={{ position: "relative", zIndex: 10, padding: "12px 20px",
        borderBottom: "1px solid #ffffff08", background: "rgba(4,6,15,0.9)",
        backdropFilter: "blur(10px)", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 17,
            letterSpacing: 3, color: "#ffd700", textShadow: "0 0 20px #ffd70060" }}>✦ COSMIC CLICKER</div>
          <div style={{ fontSize: 10, color: "#777", letterSpacing: 1, marginTop: 2 }}>
            ALL-TIME: {fmt(totalStars)} ⭐
            {rebirthCount > 0 && (
              <span style={{ color: "#a78bfa", marginLeft: 10 }}>🌀 ×{rebirthCount} &nbsp; ⚛️ {quarks}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Rebirth button */}
          <button onClick={() => setShowRebirth(true)} style={{
            fontFamily: "'Orbitron', sans-serif", fontSize: 10, padding: "7px 13px",
            background: rebirthReady ? "rgba(124,58,237,0.22)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${rebirthReady ? "#7c3aed90" : "#ffffff10"}`,
            borderRadius: 8, color: rebirthReady ? "#c4b5fd" : "#444",
            cursor: "pointer", letterSpacing: 1,
            animation: rebirthReady ? "rebirthGlow 2s ease infinite" : "none",
            transition: "all 0.3s",
          }}>
            🌀 REBIRTH{rebirthReady ? ` +${pendingQuarks}⚛️` : ""}
          </button>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 24, fontWeight: 900,
              color: "#ffd700", textShadow: "0 0 15px #ffd70080", lineHeight: 1 }}>{fmt(stars)} ⭐</div>
            <div style={{ fontSize: 11, color: "#ffd70099", marginTop: 2 }}>{sps.toFixed(1)}/sec</div>
          </div>
        </div>
      </div>

      {/* Milestone progress bar */}
      {nextMilestone && (
        <div style={{ position: "relative", zIndex: 10, height: 3, background: "#ffffff06" }}>
          <div style={{ height: "100%", background: "linear-gradient(90deg, #ffd700, #ff8c00)",
            width: `${milestoneProgress * 100}%`, transition: "width 0.5s",
            boxShadow: "0 0 8px #ffd70080" }} />
        </div>
      )}

      {/* Main layout */}
      <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexWrap: "wrap", overflow: "hidden" }}>

        {/* Left: Sun + click upgrades */}
        <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column",
          alignItems: "center", padding: "40px 20px 24px",
          borderRight: "1px solid #ffffff08", minHeight: 400 }}>
          <Sun onClick={handleSunClick} clickPower={clickPower} />
          <div style={{ marginTop: 60, width: "100%", maxWidth: 320 }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10,
              letterSpacing: 2, color: "#ffd70060", marginBottom: 10, textAlign: "center" }}>CLICK UPGRADES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {CLICK_UPGRADES.map(u => {
                const bought = boughtUpgrades.includes(u.id);
                const canAfford = !bought && stars >= u.cost;
                return (
                  <button key={u.id} onClick={() => buyUpgrade(u)} disabled={bought || !canAfford}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px", borderRadius: 8,
                      background: bought ? "rgba(255,215,0,0.05)" : canAfford ? "rgba(255,215,0,0.09)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${bought ? "#ffd70040" : canAfford ? "#ffd70030" : "#ffffff0a"}`,
                      cursor: bought ? "default" : canAfford ? "pointer" : "not-allowed",
                      opacity: bought ? 0.5 : canAfford ? 1 : 0.35, color: "inherit",
                    }}>
                    <div>
                      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10,
                        color: bought ? "#ffd70060" : "#ffd700" }}>{bought ? "✓ " : ""}{u.name}</div>
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
        <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column",
          padding: "20px 16px", overflow: "hidden" }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10,
            letterSpacing: 2, color: "#ffd70060", marginBottom: 12, textAlign: "center" }}>STAR GENERATORS</div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
            {BUILDINGS.map(b => {
              const owned = buildings[b.id];
              const cost = buildingCost(b.baseCost, owned, costMult);
              const canAfford = stars >= cost;
              const totalSps = owned * b.baseSps * (1 + spsBoost);
              return (
                <BuildingRow key={b.id} b={b} owned={owned}
                  cost={cost} canAfford={canAfford}
                  onBuy={() => buyBuilding(b)} sps={totalSps} />
              );
            })}
          </div>

          {/* Stats */}
          <div style={{ marginTop: 16, padding: "10px 12px",
            background: "rgba(255,215,0,0.04)", border: "1px solid #ffd70015",
            borderRadius: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              ["Stars/click", `${clickPower} ⭐`],
              ["Stars/sec",   `${sps.toFixed(1)} ⭐`],
              ["Generators",  Object.values(buildings).reduce((a, b) => a + b, 0)],
              ["Quarks",      `${quarks} ⚛️`],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 9, letterSpacing: 1, color: "#555", textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "#ffd700", marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Persistent rebirth badge bottom-left */}
      <RebirthBadge rebirthCount={rebirthCount} quarks={quarks} activeEffects={activeEffects} />
    </div>
  );
}
