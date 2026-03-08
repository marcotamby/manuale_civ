import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const INITIAL_CIV_VIDEOS: Record<string, string[]> = {
  'english': ['tB98m5TWOfU', 'fyHjmbag8ao', 'xWoBZ6RyPno'],
  'french': ['ke1j9wULVMw', 'pAPlT9T5G7Y'],
  'hre': ['50FBAal_5MY', '9tF33wSHaVc', 'xFRGNXAUe34'],
  'rus': ['bmHZc7agrU0', '9tF33wSHaVc'],
  'chinese': ['13Vg4Um-gTM', '1Xv7KzxSxV0'],
  'delhi': ['OwTuGgYt9CM', 'ox4pEuivqcM', 'd_aIoM5Seq0', '1tmWiCZBsnk', '8-k8Gzx_f8w', 'vjM4rDqfocE', 'oc_3Z1VhdzA'],
  'abbasid': ['8-O-mR_B4uE', '8-k8Gzx_f8w', 'vjM4rDqfocE'],
  'mongols': ['x66WfzK3d2s', 'CSBO_dQhYy4', 'stGrmOcwWBY', 'ox4pEuivqcM'],
  'malians': ['ZK5fPbCzeeI'],
  'ottomans': ['zRNJZ0tmqS8', 'xFRGNXAUe34'],
  'japanese': ['bmHZc7agrU0', 'WYleGQJH6CI', 'HxlVI2JmSGI', 'xWoBZ6RyPno'],
  'byzantines': ['R6duDrI-rxI', 'Ra8hy4Fw-Uo', '3TpCRZJGVi8', '5Z1prUa8Bqg', 'pAPlT9T5G7Y', 'oc_3Z1VhdzA'],
  'ayyubids': ['WYleGQJH6CI', '50-nZof-uGM'],
  'zhuxi': ['50-nZof-uGM'],
  'orderofthedragon': ['zhSvMC6euco', '50FBAal_5MY', '5Z1prUa8Bqg'],
  'jeannedarc': ['R6duDrI-rxI', '3TpCRZJGVi8', 'd_aIoM5Seq0', '1tmWiCZBsnk', '1Xv7KzxSxV0'],
  'sengoku': ['H92Vl2QUiJs'],
  'macedonian': ['p5DkJ1n4DHI', 'Zhoru1aK8Iw'],
  'goldenhorde': ['Skfh1-iTtfg'],
  'lancaster': ['BlUjHRlpSFU', 'fyHjmbag8ao', 'R5ZvaFmTobU', 'stGrmOcwWBY', 'RONBa3ydUD0'],
  'templar': ['0Ld_Kum3sh0', 'R5ZvaFmTobU', 'RONBa3ydUD0'],
};

async function syncDynamicData() {
    console.log('🚀 Sincronizzazione video e build orders...');

    for (const [civId, videos] of Object.entries(INITIAL_CIV_VIDEOS)) {
        console.log(`📡 Aggiornamento ${civId}...`);
        const { error } = await supabase
            .from('civilizations')
            .update({ 
                videos: videos,
                build_orders: [] // Inizialmente vuoti
            })
            .eq('id', civId);

        if (error) {
            console.error(`❌ Errores su ${civId}:`, error.message);
        } else {
            console.log(`✅ ${civId} aggiornata.`);
        }
    }

    console.log('🎉 Sincronizzazione completata!');
}

syncDynamicData();
