export function Spinner({ size = 24, color = "#6366f1" }) {
  return <div style={{ width: size, height: size, border: "2px solid rgba(255,255,255,0.08)", borderTopColor: color, borderRadius: "50%", animation: "spin 0.65s linear infinite", flexShrink: 0 }} />;
}

export function Avatar({ name = "?", size = 32 }) {
  const init = name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  const colors = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];
  const bg = colors[(name.charCodeAt(0) || 0) % colors.length];
  return <div style={{ width: size, height: size, borderRadius: 2, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 800, color: "#fff", flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }}>{init}</div>;
}

export function Badge({ children, color, bg, border }) {
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 2, fontSize: 11, fontWeight: 800, color, background: bg, border: border || `1px solid ${color}33`, letterSpacing: "0.03em", whiteSpace: "nowrap", textTransform: "uppercase" }}>{children}</span>;
}

export function RoleBadge({ role }) {
  const m = { admin: ["#fbbf24", "rgba(251,191,36,0.07)", "Admin"], sdr: ["#818cf8", "rgba(129,140,248,0.07)", "SDR"], closer: ["#2dd4bf", "rgba(45,212,191,0.07)", "Closer"] };
  const [c, bg, l] = m[role] || ["#64748b", "rgba(100,116,139,0.07)", role];
  return <Badge color={c} bg={bg}>{l}</Badge>;
}

export function ProgressBar({ value, max, color = "#6366f1", height = 4 }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div style={{ width: "100%" }}>
      <div style={{ height, background: "rgba(255,255,255,0.03)", borderRadius: 0, overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </div>
    </div>
  );
}

export function MetricCard({ label, value, icon, color = "#6366f1", sub }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 2, padding: "16px 20px", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#475569", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        <span style={{ fontSize: 16, opacity: 0.5 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-1px", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#475569", marginTop: 8, fontWeight: 700 }}>{sub}</div>}
    </div>
  );
}

export function Field({ label, children, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: 6, letterSpacing: "0.05em" }}>{label}</label>}
      {children}
      {error && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 6, fontWeight: 600 }}>{error}</div>}
    </div>
  );
}

export function Drawer({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(3,7,18,0.4)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 520, height: "100%", background: "#030712", borderLeft: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", animation: "slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <style>{`@keyframes slideLeft{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        <div style={{ padding: "24px 32px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#f1f5f9" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
