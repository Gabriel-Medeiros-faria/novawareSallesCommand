export const SUPABASE_URL = "https://hribnuztzuurqeslfvbp.supabase.co";
export const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyaWJudXp0enV1cnFlc2xmdmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjc0MzYsImV4cCI6MjA4ODkwMzQzNn0.JtdvTEWSsohPBQODUSQen9KjCUugJbU1C2cDjS4dUlg"

export const tempColor = t => t === "Quente" ? "#ef4444" : t === "Morno" ? "#f59e0b" : "#3b82f6";
export const tempBg = t => t === "Quente" ? "rgba(239,68,68,0.14)" : t === "Morno" ? "rgba(245,158,11,0.14)" : "rgba(59,130,246,0.14)";

export const fmt = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);

export const daysSince = d => {
  if (!d) return 99;
  return Math.floor((new Date() - new Date(d)) / 86400000);
};

export const goalLabel = t => ({
  leads_contatados: "Leads Contatados",
  leads_qualificados: "Leads Qualificados",
  reunioes_agendadas: "Reuniões Agendadas",
  reunioes_realizadas: "Reuniões Realizadas",
  contratos_fechados: "Contratos Fechados",
  valor_vendido: "Valor Vendido"
})[t] || t;

export const periodLabel = p => ({
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
  anual: "Anual"
})[p || "mensal"] || "Mensal";

export const periodColor = p => ({
  diaria: "#ef4444",
  semanal: "#f59e0b",
  mensal: "#6366f1",
  anual: "#8b5cf6"
})[p || "mensal"] || "#6366f1";

export const actIcon = t => ({ email: "✉", call: "📞", meeting: "📅", meeting_scheduled: "📅", note: "📝" })[t] || "📝";

export const INP = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  color: "#e2e8f0",
  borderRadius: 8,
  padding: "8px 11px",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box"
};
