import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Civilization } from '../data/aoe4Data';

export function useCivilizations() {
  const [civs, setCivs] = useState<Civilization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCivs = async () => {
    try {
      setLoading(true);
      const { data, error: sbError } = await supabase
        .from('civilizations')
        .select('*')
        .order('name');

      if (sbError) throw sbError;

      // Map snake_case from DB to camelCase for the frontend
      const formattedCivs: Civilization[] = data.map((row: any) => ({
        id: row.id,
        name: row.name,
        flag: row.flag,
        difficulty: row.difficulty,
        shortDescription: row.short_description,
        passiveBonuses: row.passive_bonuses || [],
        uniqueUnits: row.unique_units || [],
        technologies: row.technologies || [],
        landmarks: row.landmarks || [],
        videos: row.videos || [],
        buildOrders: row.build_orders || []
      }));

      setCivs(formattedCivs);
    } catch (err: any) {
      console.error('Error fetching civilizations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCivs();
  }, []);

  return { civs, loading, error, refreshCivs: fetchCivs };
}
