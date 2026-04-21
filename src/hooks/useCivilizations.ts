/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { civilizationsData, unitsList } from '../data/aoe4Data';
import type { Civilization, Unit } from '../data/aoe4Data';

export function useCivilizations() {
  const [civs, setCivs] = useState<Civilization[]>([]);
  const [globalUnits, setGlobalUnits] = useState<Unit[]>([]);
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

      // Fetch Global Units
      const { data: globalData, error: guError } = await supabase
        .from('global_units')
        .select('*')
        .order('age');

      if (guError) throw guError;

      const formattedGlobalUnits: Unit[] = globalData.map((row: any) => {
        const localUnit = (unitsList as Unit[]).find(u => u.id === row.id);
        return {
          id: row.id,
          name: row.name,
          type: row.type as any,
          age: row.age as any,
          stats: row.stats,
          strengths: row.strengths || (localUnit?.strengths || []),
          weaknesses: row.weaknesses || (localUnit?.weaknesses || []),
          description: row.description || (localUnit?.description || ''),
          imageId: row.image_id || localUnit?.imageId,
          excludedCivs: localUnit?.excludedCivs || []
        };
      });

      setGlobalUnits(formattedGlobalUnits);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCivs(true);
  }, []);

  const updateCivLocally = (updatedCiv: Civilization) => {
    setCivs(prev => prev.map(c => c.id === updatedCiv.id ? updatedCiv : c));
  };

  const updateGlobalUnitLocally = (updatedGu: Unit) => {
    setGlobalUnits(prev => prev.map(gu => gu.id === updatedGu.id ? updatedGu : gu));
  };

  return { civs, globalUnits, loading, error, refreshCivs: () => fetchCivs(false), updateCivLocally, updateGlobalUnitLocally };
}
