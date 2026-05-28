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
          flag: row.flag 
            ? row.flag.replace('.png', '.webp').replace("Jeanne d'Arc", "jeannedarc") 
            : localCiv?.flag?.replace('.png', '.webp'),
          difficulty: row.difficulty,
          shortDescription: row.short_description || localCiv?.shortDescription || '',
          passiveBonuses: row.passive_bonuses !== null && row.passive_bonuses !== undefined ? row.passive_bonuses : (localCiv?.passiveBonuses || []),
          uniqueUnits: row.unique_units !== null && row.unique_units !== undefined ? row.unique_units : (localCiv?.uniqueUnits || []),
          technologies: row.technologies !== null && row.technologies !== undefined ? row.technologies : (localCiv?.technologies || []),
          landmarks: row.landmarks !== null && row.landmarks !== undefined ? row.landmarks : (localCiv?.landmarks || []),
          videos: row.videos !== null && row.videos !== undefined ? row.videos : (localCiv?.videos || []),
          buildOrders: row.build_orders !== null && row.build_orders !== undefined ? row.build_orders : (localCiv?.buildOrders || []),
          strengths: row.strengths !== null && row.strengths !== undefined ? row.strengths : (localCiv?.strengths || []),
          weaknesses: row.weaknesses !== null && row.weaknesses !== undefined ? row.weaknesses : (localCiv?.weaknesses || []),
          primaryColor: row.primary_color || localCiv?.primaryColor
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
      console.error('Error fetching data from Supabase:', err);
      
      // If we have a network error or block, fallback to local data
      // so the site remains usable even if the server is unreachable
      if (civs.length === 0) {
        console.log('Using local fallback data...');
        const localFormattedCivs: Civilization[] = civilizationsData.map(c => ({
          ...c,
          shortDescription: c.shortDescription || '',
          passiveBonuses: c.passiveBonuses || [],
          uniqueUnits: c.uniqueUnits || [],
          technologies: c.technologies || [],
          landmarks: c.landmarks || [],
          videos: c.videos || [],
          buildOrders: c.buildOrders || [],
          strengths: c.strengths || [],
          weaknesses: c.weaknesses || []
        }));
        setCivs(localFormattedCivs);
        setGlobalUnits(unitsList as Unit[]);
      }
      
      // We set a non-blocking error message or null if we have fallback data
      setError(null); 
      // Log specifically the connection issue for debugging
      if (err.message === 'Failed to fetch') {
        console.warn('Connessione al database bloccata. Verificare se la rete aziendale limita i WebSockets o le API Supabase.');
      }
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
