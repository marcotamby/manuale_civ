import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { civilizationsData } from '../data/aoe4Data';
import type { Civilization } from '../data/aoe4Data';

export function useCivilizations() {
  const [civs, setCivs] = useState<Civilization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCivs = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const { data, error: sbError } = await supabase
        .from('civilizations')
        .select('*')
        .order('name');

      if (sbError) throw sbError;

      // Map snake_case from DB to camelCase for the frontend and apply local fallbacks
      const formattedCivs: Civilization[] = data.map((row: any) => {
        const localCiv = civilizationsData.find(c => c.id === row.id);
        
        return {
          id: row.id,
          name: row.name,
          flag: row.flag,
          difficulty: row.difficulty,
          shortDescription: row.short_description || localCiv?.shortDescription || '',
          passiveBonuses: (row.passive_bonuses && row.passive_bonuses.length > 0) ? row.passive_bonuses : (localCiv?.passiveBonuses || []),
          uniqueUnits: (row.unique_units && row.unique_units.length > 0) ? row.unique_units : (localCiv?.uniqueUnits || []),
          technologies: (row.technologies && row.technologies.length > 0) ? row.technologies : (localCiv?.technologies || []),
          landmarks: (row.landmarks && row.landmarks.length > 0) ? row.landmarks : (localCiv?.landmarks || []),
          videos: (row.videos && row.videos.length > 0) ? row.videos : (localCiv?.videos || []),
          buildOrders: (row.build_orders && row.build_orders.length > 0) ? row.build_orders : (localCiv?.buildOrders || []),
          strengths: (row.strengths && row.strengths.length > 0) ? row.strengths : (localCiv?.strengths || []),
          weaknesses: (row.weaknesses && row.weaknesses.length > 0) ? row.weaknesses : (localCiv?.weaknesses || [])
        };
      });

      setCivs(formattedCivs);
    } catch (err: any) {
      console.error('Error fetching civilizations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCivs(true);
  }, []);

  return { civs, loading, error, refreshCivs: () => fetchCivs(false) };
}
