import { useState, useEffect } from 'react';
import { X, BellOff } from 'lucide-react';

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

// Remove all alarms whose title matches a task title (used when task is deleted)
export function removeAlarmsByTitle(title) {
  const alarms = loadAlarms().filter(a => a.title !== title);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

export function loadAlarms() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

// Auto-remove alarms that have already fired (timestamp < now)
function cleanExpiredAlarms() {
  const now = Date.now();
  const active = loadAlarms().filter(a => a.timestamp > now);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
  return active;
}

export default function AlarmListModal({ onClose }) {
  const [alarms, setAlarms] = useState([]);

  useEffect(() => {
    // Clean expired alarms on open
    setAlarms(cleanExpiredAlarms());
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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#000',
        width: '100%', height: '100%',
        maxWidth: '500px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 0 100px rgba(99, 102, 241, 0.1)'
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '40px 24px 20px',
        }}>
          <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: '600', margin: 0 }}>鬧鐘清單</h1>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
            color: '#fff', padding: '10px', borderRadius: '50%', display: 'flex'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 20px' }}>
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
                  background: 'rgba(30,30,30,0.8)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '24px', padding: '20px 24px', marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {/* Time */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ color: '#fff', fontSize: '32px', fontWeight: '300', fontFamily: 'monospace' }}>
                        {new Date(alarm.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                        {new Date(alarm.timestamp).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}日，
                        {new Date(alarm.timestamp).toLocaleDateString('zh-TW', { weekday: 'short' })}
                      </span>
                    </div>
                    {/* Task title — bigger font (問題 5) */}
                    <div style={{ color: '#818cf8', fontSize: '18px', marginTop: '6px', fontWeight: '600', lineHeight: '1.4' }}>
                      {alarm.title}
                    </div>
                  </div>

                  {/* Cancel toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', marginLeft: '16px' }}>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => handleCancel(alarm)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              ))
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(139,92,246,0.15)' }}>
          <p style={{ color: '#6b7280', fontSize: '11px', textAlign: 'center', margin: 0 }}>
            響鈴後鬧鐘將自動從清單移除 · 已過期的鬧鐘已自動清除
          </p>
        </div>
      </div>
    </div>
  );
}
