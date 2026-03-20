import { useState } from "react";
import { Spinner, Drawer, Field } from "../ui/Atoms";
import { INP } from "../../utils/constants";

export function NewLeadModal({ onClose, onCreate, profile, allUsers, stagesData }) {
  const { sdrStages = [] } = stagesData || {};
  const sdrs = allUsers.filter(u => u.role === "sdr" || u.role === "vendedor");
  const closers = allUsers.filter(u => u.role === "closer" || u.role === "vendedor");
  
  const [form, setForm] = useState({ 
    nome_lead: "", empresa: "", telefone: "", email: "", 
    origem_lead: "LinkedIn", temperatura: "Morno", qualidade: "Média", 
    observacoes: "", 
    sdr_id: ["sdr", "vendedor"].includes(profile?.role) ? profile.id : (sdrs[0]?.id || ""), 
    closer_id: profile?.role === "vendedor" ? profile.id : "", 
    deal_value: "" 
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.nome_lead || !form.empresa) {
      setError("Nome e empresa são obrigatórios."); return;
    }
    setLoading(true);
    
    const finalForm = { ...form };
    if (profile?.role === "sdr") finalForm.sdr_id = profile.id;
    if (profile?.role === "vendedor") {
      finalForm.sdr_id = profile.id;
      finalForm.closer_id = profile.id;
    }
    if (profile?.role === "closer") finalForm.closer_id = profile.id;

    const defaultStatus = sdrStages[0]?.name || "Novo Lead";

    const { error } = await onCreate({ 
        ...finalForm, deal_value: Number(finalForm.deal_value) || 0, 
        sdr_id: finalForm.sdr_id || null, closer_id: finalForm.closer_id || null, status: defaultStatus
    });
    if (error) {
      setError(error.message); setLoading(false);
    } else onClose();
  };

  return (
    <Drawer open={true} onClose={onClose} title="Novo Lead Estratégico">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Nome do Lead"><input type="text" value={form.nome_lead} onChange={set("nome_lead")} style={INP} /></Field>
          <Field label="Empresa"><input type="text" value={form.empresa} onChange={set("empresa")} style={INP} /></Field>
          <Field label="Telefone"><input type="text" value={form.telefone} onChange={set("telefone")} style={INP} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={set("email")} style={INP} /></Field>
          <Field label="Estimativa de Valor"><input type="number" value={form.deal_value} onChange={set("deal_value")} style={INP} /></Field>
          
          <Field label="Origem">
            <select value={form.origem_lead} onChange={set("origem_lead")} style={INP}>
              {["LinkedIn", "Indicação", "Site", "Evento", "Cold Outreach", "Parceiro"].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          
          <Field label="Temperatura">
            <select value={form.temperatura} onChange={set("temperatura")} style={INP}>
                {["Quente", "Morno", "Frio"].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          
          <Field label="Qualidade Inicial">
            <select value={form.qualidade} onChange={set("qualidade")} style={INP}>
                {["Alta", "Média", "Baixa"].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>

          {profile?.role === "admin" && (
            <>
              <Field label="Atribuir SDR">
                <select value={form.sdr_id} onChange={set("sdr_id")} style={INP}>
                    <option value="">— Nenhum —</option>
                    {sdrs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Atribuir Closer">
                <select value={form.closer_id} onChange={set("closer_id")} style={INP}>
                    <option value="">— Nenhum —</option>
                    {closers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </>
          )}

          <div style={{ gridColumn: "1/-1" }}>
            <Field label="Notas Adicionais">
              <textarea value={form.observacoes} onChange={set("observacoes")} rows={3} style={{ ...INP, resize: "none" }} />
            </Field>
          </div>
        </div>

        {error && (
            <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)", padding: "12px", borderRadius: 2, color: "#ef4444", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                ERRO: {error}
            </div>
        )}

        <div style={{ marginTop: "auto", display: "flex", gap: 12 }}>
          <button onClick={onClose} style={{ flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#475569", borderRadius: 2, padding: "12px", cursor: "pointer", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Cancelar</button>
          <button onClick={handleCreate} disabled={loading} style={{ flex: 2, background: "#6366f1", border: "none", color: "#fff", borderRadius: 2, padding: "12px", cursor: "pointer", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
            {loading && <Spinner size={14} color="#fff" />}
            {loading ? "PROCESSANDO..." : "CRIAR LEAD AGORA"}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
