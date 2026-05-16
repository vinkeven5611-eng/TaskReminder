import { useState, useEffect } from 'react';
import { X, Trash2, Bell, BellOff } from 'lucide-react';

const STORAGE_KEY = 'taskflow_alarms';

export function saveAlarm(requestCode, title, timestamp) {
  const alarms = loadAlarms();
  alarms.push({ requestCode, title, timestamp, id: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

export function removeAlarm(id) {
  const alarms = loadAlarms().filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

export function loadAlarms() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function AlarmListModal({ onClose }) {
  const [alarms, setAlarms] = useState([]);

  useEffect(() => {
    setAlarms(loadAlarms());
  }, []);

  const handleCancel = async (alarm) => {
    if (window.Capacitor?.Plugins?.AlarmPlugin) {
      try {
        await window.Capacitor.Plugins.AlarmPlugin.cancelAlarm({ requestCode: alarm.requestCode });
      } catch (err) {
        console.warn('Cancel alarm failed:', err);
      }
    }
    removeAlarm(alarm.id);
    setAlarms(prev => prev.filter(a => a.id !== alarm.id));
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', weekday: 'short'
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(30,20,60,0.98), rgba(15,10,40,0.98))',
        border: '1px solid rgba(139,92,246,0.35)',
        borderRadius: '20px',
        width: '100%', maxWidth: '420px',
        maxHeight: '75vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 14px',
          borderBottom: '1px solid rgba(139,92,246,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={18} color="#a78bfa" />
            <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '16px' }}>已排定的鬧鐘</span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8', padding: '4px'
          }}>
            <X size={18} />
          </button>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
          {alarms.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '40px 0', gap: '12px'
            }}>
              <BellOff size={36} color="#4b5563" />
              <span style={{ color: '#6b7280', fontSize: '14px' }}>目前沒有已排定的鬧鐘</span>
            </div>
          ) : (
            alarms
              .sort((a, b) => a.timestamp - b.timestamp)
              .map(alarm => (
                <div key={alarm.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(139,92,246,0.08)',
                  border: '1px solid rgba(139,92,246,0.18)',
                  borderRadius: '12px', padding: '12px 14px', marginBottom: '8px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: '#e2e8f0', fontSize: '14px', fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {alarm.title}
                    </div>
                    <div style={{ color: '#a78bfa', fontSize: '12px', marginTop: '4px' }}>
                      {formatTime(alarm.timestamp)}
                    </div>
                  </div>
                  <button onClick={() => handleCancel(alarm)} style={{
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '8px', padding: '6px 10px',
                    cursor: 'pointer', color: '#f87171',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '12px', marginLeft: '10px', flexShrink: 0
                  }}>
                    <Trash2 size={13} />
                    取消
                  </button>
                </div>
              ))
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(139,92,246,0.15)' }}>
          <p style={{ color: '#6b7280', fontSize: '11px', textAlign: 'center', margin: 0 }}>
            響鈴後鬧鐘將自動從清單移除
          </p>
        </div>
      </div>
    </div>
  );
}
