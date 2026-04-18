import { useState } from 'react';
import { fetchTournament } from '../services/startgg';

export function DebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('In attesa...');

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  const runTest = async () => {
    setStatus('Esecuzione test...');
    addLog('Avvio test connessione a start.gg...');
    
    try {
      addLog('Chiamata a fetchTournament("torneo-1v1-2026")...');
      const data = await fetchTournament('torneo-1v1-2026');
      
      if (data) {
        addLog(`SUCCESSO! Torneo trovato: ${data.name}`);
        addLog(`ID Torneo: ${data.id}`);
        addLog(`Numero eventi: ${data.events?.length || 0}`);
        setStatus('Test Completato: SUCCESSO');
      } else {
        addLog('ERRORE: Il server ha risposto con successo ma il dato del torneo è NULL.');
        setStatus('Test Fallito: Dato Null');
      }
    } catch (err: any) {
      addLog(`ERRORE CRITICO: ${err.message}`);
      setStatus('Test Fallito con Errore');
    }
  };

  return (
    <div className="p-10 bg-black min-h-screen text-white font-mono">
      <h1 className="text-3xl font-bold mb-8 text-yellow-500">DEBUG API START.GG</h1>
      
      <div className="mb-8 p-4 bg-gray-900 border border-yellow-500/30 rounded-xl">
        <p className="text-sm mb-4">Stato attuale: <span className="font-bold text-yellow-400">{status}</span></p>
        <button 
          onClick={runTest}
          className="px-6 py-2 bg-yellow-600/20 border border-yellow-500/50 rounded-lg hover:bg-yellow-600/40 transition-all text-yellow-500 font-bold uppercase text-xs"
        >
          Esegui Test Ora
        </button>
      </div>

      <div className="bg-black border border-white/10 p-6 rounded-xl overflow-y-auto max-h-[60vh] space-y-2">
        {logs.map((log, i) => (
          <p key={i} className={log.includes('ERRORE') ? 'text-red-400' : 'text-gray-300'}>
            {log}
          </p>
        ))}
        {logs.length === 0 && <p className="text-gray-600 italic">Clicca il tasto sopra per iniziare...</p>}
      </div>
      
      <div className="mt-8 text-xs text-gray-500">
        Se vedi solo messaggi di errore, incolla qui il messaggio rosso.
      </div>
    </div>
  );
}
