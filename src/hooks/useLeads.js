import { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabase";

export function useLeads(profile) {
  const [leads, setLeads] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id,name,email,role").order("name");
    if (data) setAllUsers(data);
  }, []);

  const fetchLeads = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (data) setLeads(data);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    if (profile) {
      fetchUsers();
      fetchLeads();
    }
  }, [profile, fetchUsers, fetchLeads]);

  const updateLead = useCallback(async (id, updates) => {
    const payload = { ...updates, last_interaction: new Date().toISOString().split("T")[0] };
    const { error } = await supabase.from("leads").update(payload).eq("id", id);
    if (!error) setLeads(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));
    return { error };
  }, []);

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
