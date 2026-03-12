import { useState, useEffect } from "react";
import supabase from "../lib/supabase";

export function useGoals(profile) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase.from("goals").select("*").order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setGoals(data);
        setLoading(false);
      });
  }, [profile]);

  const createGoal = async (payload) => {
    const { data, error } = await supabase.from("goals").insert([payload]).select().single();
    if (data) setGoals(prev => [...prev, data]);
    return { data, error };
  };

  return { goals, loading, createGoal };
}
