import './index.css';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { RadarResponse } from '../shared/api';

export const App = () => {
  const [data, setData] = useState<RadarResponse | null>(null);
  const [lockStatus, setLockStatus] = useState<'IDLE' | 'LOCKING' | 'LOCKED' | 'ERROR'>('IDLE');
  const [purgeStatus, setPurgeStatus] = useState<'IDLE' | 'PURGING' | 'PURGED' | 'ERROR'>('IDLE');
  const [resetStatus, setResetStatus] = useState<'IDLE' | 'RESETTING' | 'ERROR'>('IDLE');

  useEffect(() => {
    const fetchRadarData = async () => {
      try {
        const response = await fetch('/api/radar');
        if (response.ok) {
          const json = await response.json() as RadarResponse;
          setData(json);
        }
      } catch (e) {
        console.error('Failed to fetch radar data', e);
      }
    };

    fetchRadarData();
    const interval = setInterval(fetchRadarData, 2000);
    return () => clearInterval(interval);
  }, []);

  const executeLockdown = async () => {
    setLockStatus('LOCKING');
    try {
      const response = await fetch('/api/lockdown', { method: 'POST' });
      if (response.ok) setLockStatus('LOCKED');
      else setLockStatus('ERROR');
    } catch (e) {
      setLockStatus('ERROR');
    }
  };

  const executePurge = async () => {
    setPurgeStatus('PURGING');
    try {
      const response = await fetch('/api/purge', { method: 'POST' });
      if (response.ok) setPurgeStatus('PURGED');
      else setPurgeStatus('ERROR');
    } catch (e) {
      setPurgeStatus('ERROR');
    }
  };

  const executeReset = async () => {
    setResetStatus('RESETTING');
    try {
      const response = await fetch('/api/reset', { method: 'POST' });
      if (response.ok) {
        // The dashboard will automatically turn green on the next 2-second polling interval
        setTimeout(() => {
          setResetStatus('IDLE');
          setLockStatus('IDLE');
          setPurgeStatus('IDLE');
        }, 2000);
      } else {
        setResetStatus('ERROR');
      }
    } catch (e) {
      setResetStatus('ERROR');
    }
  };

  const isHighThreat = data?.threatLevel === 'High';

  return (
    <div className={`flex flex-col justify-center items-center min-h-screen gap-6 transition-colors duration-500 ${isHighThreat ? 'bg-red-950' : 'bg-gray-900'}`}>
      
      <div className="flex flex-col items-center gap-2 p-8 border border-gray-700 rounded-xl bg-gray-800 shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-white tracking-wider flex items-center gap-3">
          🛡️ ModAAegis
        </h1>
        <h2 className="text-sm font-mono text-gray-400 mb-6 uppercase tracking-widest">
          Active Threat Radar
        </h2>

        {/* Radar Metric Box */}
        <div className={`p-6 rounded-lg w-full text-center border transition-all duration-300 ${isHighThreat ? 'border-red-500 bg-red-900/50 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-green-500 bg-green-900/20'}`}>
          <p className="text-gray-300 font-mono text-sm mb-2">CURRENT MINUTE VELOCITY</p>
          <p className={`text-7xl font-black ${isHighThreat ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
            {data ? data.spamCount : 0}
          </p>
          <p className="text-gray-400 font-mono text-xs mt-2">comments / min</p>
        </div>

        {/* Status Bar */}
        <div className="w-full mt-4 flex justify-between items-center bg-gray-900 p-4 rounded border border-gray-700">
          <span className="text-gray-400 font-mono text-sm">THREAT LEVEL</span>
          <span className={`font-bold uppercase tracking-wide ${isHighThreat ? 'text-red-500' : data?.threatLevel === 'Medium' ? 'text-yellow-400' : 'text-green-400'}`}>
            {data ? data.threatLevel : 'SCANNING...'}
          </span>
        </div>

        {/* Emergency Defense Protocols */}
        {isHighThreat && (
           <div className="w-full flex flex-col items-center gap-3 mt-6">
             <div className="p-3 bg-red-600 text-white font-black tracking-widest uppercase rounded w-full text-center animate-bounce shadow-lg shadow-red-600/50 mb-2">
               🚨 SPAM BURST DETECTED 🚨
             </div>
             
             {/* PROTOCOL ALPHA: LOCKDOWN */}
             <button 
               onClick={executeLockdown}
               disabled={lockStatus !== 'IDLE' && lockStatus !== 'ERROR'}
               className={`w-full py-3 rounded font-bold tracking-widest uppercase transition-all duration-300 ${
                 lockStatus === 'LOCKED' ? 'bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600' :
                 lockStatus === 'LOCKING' ? 'bg-yellow-600 text-white cursor-wait' :
                 'bg-orange-600 hover:bg-orange-500 text-white border border-orange-400'
               }`}
             >
               {lockStatus === 'IDLE' && '1. EXECUTE LOCKDOWN'}
               {lockStatus === 'LOCKING' && 'EXECUTING...'}
               {lockStatus === 'LOCKED' && '🔒 THREAD LOCKED'}
               {lockStatus === 'ERROR' && '❌ LOCKDOWN FAILED'}
             </button>

             {/* PROTOCOL BETA: PURGE & BAN */}
             <button 
               onClick={executePurge}
               disabled={purgeStatus !== 'IDLE' && purgeStatus !== 'ERROR'}
               className={`w-full py-3 rounded font-black tracking-widest uppercase transition-all duration-300 ${
                 purgeStatus === 'PURGED' ? 'bg-gray-800 text-red-900 cursor-not-allowed border border-gray-700' :
                 purgeStatus === 'PURGING' ? 'bg-red-800 text-white cursor-wait' :
                 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-red-400'
               }`}
             >
               {purgeStatus === 'IDLE' && '2. PURGE & BAN ATTACKER'}
               {purgeStatus === 'PURGING' && 'NEUTRALIZING...'}
               {purgeStatus === 'PURGED' && '☢️ THREAT PURGED'}
               {purgeStatus === 'ERROR' && '❌ PURGE FAILED'}
             </button>

             {/* PROTOCOL OMEGA: SYSTEM RESET */}
             <button 
               onClick={executeReset}
               disabled={resetStatus === 'RESETTING'}
               className={`w-full mt-2 py-2 rounded text-sm font-bold tracking-widest uppercase transition-all duration-300 ${
                 resetStatus === 'RESETTING' ? 'bg-gray-700 text-gray-400 cursor-wait' :
                 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-500'
               }`}
             >
               {resetStatus === 'IDLE' && '🔄 CLEAR RADAR & RESET'}
               {resetStatus === 'RESETTING' && 'CLEARING...'}
               {resetStatus === 'ERROR' && '❌ RESET FAILED'}
             </button>
           </div>
        )}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);