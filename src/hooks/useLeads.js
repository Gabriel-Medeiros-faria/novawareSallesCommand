import { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabase";

export function useLeads(profile, { handoffStages = [], stagesLoading = false } = {}) {
  const [leads, setLeads] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id,name,email,role").order("name");
    if (data) setAllUsers(data);
  }, []);

  const fetchLeads = useCallback(async () => {
    if (!profile || stagesLoading) return;
    setLoading(true);
    let query = supabase.from("leads").select("*");
    
    const role = profile.role?.toLowerCase();
    
    if (role === "sdr") {
      query = query.eq("sdr_id", profile.id);
    } else if (role === "vendedor") {
      query = query.or(`sdr_id.eq.${profile.id},closer_id.eq.${profile.id}`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) console.error("Error fetching leads:", error);
    
    if (data) {
      if (profile.role?.toLowerCase() === "closer") {
        const filtered = data.filter(l => 
          l.closer_id === profile.id || 
          (handoffStages.includes(l.status) && !l.closer_id)
        );
        setLeads(filtered);
      } else {
        setLeads(data);
      }
    }
    setLoading(false);
  }, [profile, handoffStages, stagesLoading]);

  useEffect(() => {
    if (profile) {
      fetchUsers();
      fetchLeads();
    }
  }, [profile, fetchUsers, fetchLeads]);

  const updateLead = useCallback(async (id, updates) => {
    let payload = { ...updates, last_interaction: new Date().toISOString().split("T")[0] };
    
    // Auto-claiming logic for updates (e.g., column move)
    const role = profile?.role?.toLowerCase();
    // Auto-claiming logic for updates (e.g., column move)
    if (["closer", "vendedor"].includes(role)) {
      const currentLead = leads.find(l => l.id === id);
      if (currentLead && !currentLead.closer_id) {
        payload.closer_id = profile.id;
      }
    }

    const { error } = await supabase.from("leads").update(payload).eq("id", id);
    if (!error) setLeads(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));
    return { error };
  }, [profile, leads]);

  const createLead = useCallback(async (payload) => {
    const { data, error } = await supabase.from("leads").insert([payload]).select().single();
    if (data) setLeads(prev => [data, ...prev]);
    return { data, error };
  }, []);

  const refreshAll = useCallback(() => {
    fetchUsers();
    fetchLeads();
  }, [fetchUsers, fetchLeads]);

  return { leads, allUsers, loading, updateLead, createLead, refreshLeads: refreshAll };
}
