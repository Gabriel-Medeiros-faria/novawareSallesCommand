import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLeads } from "../hooks/useLeads";
import { useGoals } from "../hooks/useGoals";
import { Avatar, RoleBadge, Spinner } from "../components/ui/Atoms";
import { DashboardPage } from "../pages/DashboardPage";
import { PipelinePage } from "../pages/PipelinePage";
import { LeadsPage } from "../pages/LeadsPage";
import { GoalsPage } from "../pages/GoalsPage";
import { CopilotPage } from "../pages/CopilotPage";
import { UsersPage } from "../pages/UsersPage";
import { LeadDrawer } from "../components/modals/LeadDrawer";
import { NewLeadModal } from "../components/modals/NewLeadModal";

export function AppShell() {
  const { profile, signOut } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { leads, allUsers, loading, updateLead, createLead, refreshLeads } = useLeads(profile);
  const { goals, createGoal } = useGoals(profile);

  useEffect(() => {
    const handleKeys = (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
        if (e.key.toLowerCase() === "c") { e.preventDefault(); setShowNewLead(true); }
        if (e.key === "Escape") { setSelectedLead(null); setShowNewLead(false); }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, []);

  const navItems = [
    { id: "dashboard", label: "DASHBOARD", icon: "◈" },
    ...(["admin", "sdr"].includes(profile?.role) ? [{ id: "sdr_pipeline", label: "PIPELINE SDR", icon: "⟫" }] : []),
    ...(["admin", "closer"].includes(profile?.role) ? [{ id: "closer_pipeline", label: "PIPELINE CLOSER", icon: "⟫" }] : []),
    { id: "leads", label: "LEADS", icon: "⊞" },
    { id: "goals", label: "METAS", icon: "◎" },
    { id: "copilot", label: "COPILOT AI", icon: "✦", accent: true },
    ...(profile?.role === "admin" ? [{ id: "users", label: "USUÁRIOS", icon: "👥", divider: true }] : []),
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "#030712", fontFamily: "'Sora','DM Sans',system-ui,sans-serif", color: "#e2e8f0", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:2px;height:2px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.05)}
        select option{background:#030712;color:#e2e8f0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        input:focus,select:focus,textarea:focus{border-color:rgba(99,102,241,0.4)!important;outline:none}
      `}</style>

      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 240 : 64, background: "rgba(3,7,18,0.6)", backdropFilter: "blur(20px)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", transition: "width 0.3s cubic-bezier(0.16,1,0.3,1)", flexShrink: 0 }}>
        <div style={{ padding: sidebarOpen ? "24px 20px" : "24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 2, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, fontWeight: 900 }}>S</div>
          {sidebarOpen && <span style={{ fontSize: 14, fontWeight: 900, color: "#f1f5f9", letterSpacing: "0.1em", textTransform: "uppercase" }}>Sales Command</span>}
        </div>

        {sidebarOpen && profile && (
          <div style={{ margin: "20px 16px 10px", padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={profile.name || "?"} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "uppercase" }}>{profile.name}</div>
                <div style={{ marginTop: 6 }}><RoleBadge role={profile.role} /></div>
              </div>
            </div>
          </div>
        )}

        <nav style={{ flex: 1, padding: "16px 8px" }}>
          {navItems.map((item, idx) => {
            const active = page === item.id;
            return (
              <div key={item.id || idx}>
                {item.divider && <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "12px 14px" }} />}
                <button onClick={() => setPage(item.id)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: sidebarOpen ? "12px 14px" : "12px", borderRadius: 2, border: "none", background: active ? "rgba(99,102,241,0.08)" : "transparent", color: active ? "#818cf8" : item.accent ? "#fbbf24" : "#64748b", cursor: "pointer", transition: "all 0.2s", textAlign: "left", position: "relative", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 16, flexShrink: 0, opacity: active ? 1 : 0.6 }}>{item.icon}</span>
                  {sidebarOpen && <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{item.label}</span>}
                  {active && <div style={{ position: "absolute", right: 0, top: "25%", height: "50%", width: 2, background: "#6366f1" }} />}
                </button>
              </div>
            );
          })}
        </nav>

        <div style={{ padding: "16px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={signOut} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: sidebarOpen ? "12px 14px" : "12px", borderRadius: 2, border: "none", background: "transparent", color: "#475569", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.05)" }}
            onMouseLeave={e => { e.currentTarget.style.color = "#475569"; e.currentTarget.style.background = "transparent" }}
          >
            <span style={{ fontSize: 16 }}>⎋</span>{sidebarOpen && <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.05em", textTransform: "uppercase" }}>Sair</span>}
          </button>
          <button onClick={() => setSidebarOpen(p => !p)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 36, background: "transparent", color: "#1e293b", cursor: "pointer", border: "none" }}>
            {sidebarOpen ? "«" : "»"}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#030712" }}>
        <div style={{ height: 72, borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", flexShrink: 0, background: "rgba(3,7,18,0.4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#334155", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>{navItems.find(n => n.id === page)?.label}</span>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {loading && <Spinner size={16} />}
            <button onClick={() => setShowNewLead(true)} style={{ background: "#6366f1", border: "none", color: "#fff", borderRadius: 2, padding: "10px 20px", cursor: "pointer", fontSize: 12, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", transition: "transform 0.1s" }} onMouseDown={e => e.currentTarget.style.transform="scale(0.96)"} onMouseUp={e => e.currentTarget.style.transform="scale(1)"}>+ NOVO LEAD</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: page.includes("pipeline") ? "hidden" : "auto", position: "relative" }}>
          <div style={{ 
            padding: "32px", 
            maxWidth: page.includes("pipeline") ? "none" : 1600, 
            height: page.includes("pipeline") ? "100%" : "auto",
            margin: "0 auto", 
            animation: "fade 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            display: "flex",
            flexDirection: "column"
          }}>
            {page === "dashboard" && <DashboardPage leads={leads} goals={goals} profile={profile} allUsers={allUsers} />}
            {page === "sdr_pipeline" && <PipelinePage leads={leads} updateLead={updateLead} pipelineType="sdr" onOpen={setSelectedLead} allUsers={allUsers} />}
            {page === "closer_pipeline" && <PipelinePage leads={leads} updateLead={updateLead} pipelineType="closer" onOpen={setSelectedLead} allUsers={allUsers} />}
            {page === "leads" && <LeadsPage leads={leads} onOpen={setSelectedLead} allUsers={allUsers} />}
            {page === "goals" && <GoalsPage goals={goals} createGoal={createGoal} profile={profile} allUsers={allUsers} />}
            {page === "copilot" && <CopilotPage leads={leads} profile={profile} />}
            {page === "users" && profile?.role === "admin" && <UsersPage allUsers={allUsers} onUserCreated={refreshLeads} />}
          </div>
        </div>
      </div>

      <LeadDrawer open={!!selectedLead} onClose={() => setSelectedLead(null)} lead={selectedLead} onSave={async (id, u) => { await updateLead(id, u); setSelectedLead(null); }} profile={profile} allUsers={allUsers} />
      {showNewLead && <NewLeadModal onClose={() => setShowNewLead(false)} onCreate={createLead} profile={profile} allUsers={allUsers} />}
    </div>
  );
}
