import { useState, useRef, useEffect } from 'react';
import { Check, Clock, Settings, Trash, Bell, Loader2, X } from 'lucide-react';
import { taskAPI } from '../services/api';

export default function TaskCard({ task, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(task.content);
  
  const formatForInput = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const z = d.getTimezoneOffset() * 60 * 1000;
    const localDate = new Date(d.getTime() - z);
    return localDate.toISOString().slice(0, 16);
  };

  const [editDueDate, setEditDueDate] = useState(formatForInput(task.due_date));
  const [showAlarms, setShowAlarms] = useState(false);
  const [alarms, setAlarms] = useState([]);
  const [loadingAlarms, setLoadingAlarms] = useState(false);
  const [clickedAlarms, setClickedAlarms] = useState({});
  const popoverRef = useRef(null);
  
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.is_completed;
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowAlarms(false);
      }
    };
    if (showAlarms) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAlarms]);

  const handleAlarmClick = async (e) => {
    e.stopPropagation();
    if (showAlarms) {
      setShowAlarms(false);
      return;
    }
    
    setShowAlarms(true);
    setLoadingAlarms(true);
    try {
      const data = await taskAPI.getAlarms(task.id);
      setAlarms(data || []);
      setClickedAlarms({});
    } catch (err) {
      console.error('Failed to fetch alarms:', err);
    } finally {
      setLoadingAlarms(false);
    }
  };

  const triggerAndroidAlarm = (e, index, hour, minute, content, iso_date) => {
    e.stopPropagation();
    if (window.Capacitor && window.Capacitor.Plugins.AlarmPlugin) {
      const timestamp = new Date(iso_date).getTime();
      window.Capacitor.Plugins.AlarmPlugin.setAlarm({
        timestamp: timestamp,
        title: content
      }).then(() => {
        setClickedAlarms(prev => ({ ...prev, [index]: true }));
      }).catch(err => {
        alert("設定鬧鐘失敗: " + err.message);
      });
    } else {
      alert("鬧鐘功能僅支援 Android 版本");
    }
  };

  const toggleComplete = (e) => {
    e.stopPropagation();
    onUpdate(task.id, { is_completed: !task.is_completed });
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(task.id);
  };

  const saveEdit = () => {
    const utcDate = editDueDate ? new Date(editDueDate).toISOString() : null;
    onUpdate(task.id, { content: editContent, due_date: utcDate });
    setIsEditing(false);
  };

  return (
    <div className={`task-card ${task.is_completed ? 'completed' : ''} ${showAlarms ? 'popover-open' : ''}`}>

      {!task.is_completed && (
        <div 
          className="custom-checkbox" 
          onClick={toggleComplete}
          title="點擊標記為完成"
        >
          <Check size={16} strokeWidth={3} />
        </div>
      )}
      
      <div className="task-content">
        {isEditing ? (
          <div className="edit-mode" onClick={e => e.stopPropagation()}>
            <input 
              type="text" 
              value={editContent} 
              onChange={(e) => setEditContent(e.target.value)}
              autoFocus
            />
            <input 
              type="datetime-local" 
              value={editDueDate} 
              onChange={(e) => setEditDueDate(e.target.value)}
            />
            <div className="edit-actions">
              <button onClick={() => setIsEditing(false)}>取消</button>
              <button className="primary" onClick={saveEdit}>儲存</button>
            </div>
          </div>
        ) : (
          <>
            <span className="task-text">{task.content}</span>
            {task.due_date && (
              <div className={`task-date-badge date-due ${isOverdue ? 'overdue' : ''}`}>
                <Clock size={12} />
                <span>
                  {isOverdue ? '已逾期：' : '到期：'}
                  {new Date(task.due_date).toLocaleString('zh-TW', {
                    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="task-actions" style={{ position: 'relative' }}>
        {isAndroid && task.due_date && !task.is_completed && (
          <>
            <button className="icon-btn alarm-btn" onClick={handleAlarmClick} title="設定鬧鐘" style={{ color: '#fbbf24', position: 'relative' }}>
              <Bell size={18} />
            </button>
            
            {showAlarms && (
              <div ref={popoverRef} className="alarm-popover fade-in" onClick={e => e.stopPropagation()}>
                <div className="popover-header">
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fff' }}>設定系統鬧鐘</span>
                  <X size={16} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowAlarms(false)} />
                </div>
                <div className="popover-body">
                  {loadingAlarms ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', color: 'var(--primary)' }}>
                      <Loader2 size={20} className="animate-spin" />
                    </div>
                  ) : alarms.length > 0 ? (
                    alarms.map((alarm, idx) => (
                      <button 
                        key={idx} 
                        className={`alarm-item-btn ${clickedAlarms[idx] ? 'clicked' : ''}`}
                        onClick={(e) => triggerAndroidAlarm(e, idx, alarm.hour, alarm.minute, task.content, alarm.iso_date)}
                        disabled={clickedAlarms[idx]}
                      >
                        <Bell size={14} />
                        <span>{clickedAlarms[idx] ? '已跳轉' : `${alarm.display_text} (${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')})`}</span>
                      </button>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Google 日曆未設定提醒
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        <button className="icon-btn" onClick={handleEdit} title="編輯">
          <Settings size={18} />
        </button>
        <button className="icon-btn delete" onClick={handleDelete} title="刪除">
          <Trash size={18} />
        </button>

      </div>
    </div>
  );
}
