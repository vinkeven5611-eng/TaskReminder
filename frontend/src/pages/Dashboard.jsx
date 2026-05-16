import { useEffect, useState, useRef } from 'react';
// Trigger redeploy for UI update verification
import { taskAPI, googleAPI } from '../services/api';
import TaskCard from '../components/TaskCard';
import AlarmListModal from '../components/AlarmListModal';
import { LogOut, Plus, Search, Calendar, Inbox, CheckSquare, Clock, Settings, Link as LinkIcon, Unlink, Bell } from 'lucide-react';

export default function Dashboard({ setAuth }) {
  const [tasks, setTasks] = useState([]);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, completed
  const username = localStorage.getItem('taskflow_username') || 'User';
  
  // Google Calendar State
  const [showSettings, setShowSettings] = useState(false);
  const [showAlarmList, setShowAlarmList] = useState(false);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const [confirmData, setConfirmData] = useState(null); // { id, type: 'toggle'|'delete', is_completed?, content }
  const [googleStatus, setGoogleStatus] = useState({ is_linked: false, is_calendar_enabled: false, google_email: null });
  const [isLinking, setIsLinking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  
  const CURRENT_VERSION = "2.7"; // Must match build.gradle and version.json
  const [syncHistory, setSyncHistory] = useState([]); // Array of recent sync results
  const callbackHandled = useRef(false);

  useEffect(() => {
    fetchTasks();
    checkGoogleStatus();
    
    // Handle OAuth Callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code && !callbackHandled.current) {
      callbackHandled.current = true;
      handleGoogleCallback(code);
    }

    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const REDIRECT_URI = window.location.origin + '/dashboard';

  const checkGoogleStatus = async () => {
    try {
      const status = await googleAPI.getStatus();
      setGoogleStatus(status);
    } catch (err) {
      console.error('Failed to get Google status:', err);
    }
  };

  const handleGoogleCallback = async (code) => {
    try {
      setIsLinking(true);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      const redirectUri = window.location.origin + window.location.pathname;
      const result = await googleAPI.callback(code, redirectUri);
      setGoogleStatus({ is_linked: true, is_calendar_enabled: result.is_calendar_enabled, google_email: result.google_email });
      alert('Google 日曆連結成功！');
    } catch (err) {
      alert('連結失敗，請重試！');
    } finally {
      setIsLinking(false);
    }
  };

  const handleLinkGoogle = async () => {
    try {
      const redirectUri = window.location.origin + window.location.pathname;
      const { url } = await googleAPI.getAuthUrl(redirectUri);
      window.location.href = url;
    } catch (err) {
      alert('無法獲取授權網址');
    }
  };

  const handleToggleSync = async () => {
    try {
      const newState = !googleStatus.is_calendar_enabled;
      await googleAPI.toggleSync(newState);
      setGoogleStatus(prev => ({ ...prev, is_calendar_enabled: newState }));
    } catch (err) {
      alert('切換失敗');
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!window.confirm('確定要解除連結嗎？這不會刪除已同步的日曆事件。')) return;
    try {
      await googleAPI.unlink();
      setGoogleStatus({ is_linked: false, is_calendar_enabled: false });
      setLastSyncTime(null);
    } catch (err) {
      alert('解除連結失敗');
    }
  };

  const performSync = async (isManual = false) => {
    if (!googleStatus.is_linked || !googleStatus.is_calendar_enabled) return;
    
    try {
      setIsSyncing(true);
      const res = await googleAPI.syncTasks();
      
      if (res.status === 'success') {
        const now = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncTime(now);
        
        // Add to history
        const newLog = `🔄 ${now}: 同步完成 (更新:${res.updated} 刪除:${res.deleted})`;
        setSyncHistory(prev => [newLog, ...prev].slice(0, 3));

        if (res.updated > 0 || res.deleted > 0) {
           await fetchTasks(); // Refresh list if changes pulled
           if (isManual) {
             alert(`從 Google 日曆同步完成！更新: ${res.updated}，刪除: ${res.deleted}`);
           }
        } else if (isManual) {
           alert('已經是最新狀態，沒有新的變更。');
        }
      }
    } catch (err) {
      console.error(err);
      if (isManual) alert('同步失敗');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualSync = () => performSync(true);

  // Auto-sync when user returns to the tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && googleStatus.is_calendar_enabled) {
        performSync(false);
      }
    };
    
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [googleStatus.is_calendar_enabled, googleStatus.is_linked]);

  const handleCheckUpdate = async () => {
    try {
      setIsCheckingUpdate(true);
      // Add timestamp to bypass cache
      const response = await fetch(`https://task-reminder-omega-five.vercel.app/version.json?t=${Date.now()}`);
      const data = await response.json();
      
      if (data.version !== CURRENT_VERSION) {
        if (window.confirm(`發現新版本 ${data.version}！\n確定要下載並自動安裝嗎？`)) {
          const apkUrl = 'https://task-reminder-omega-five.vercel.app/TaskFlow.apk';
          if (window.Capacitor?.Plugins?.AlarmPlugin) {
            await window.Capacitor.Plugins.AlarmPlugin.installApk({ url: apkUrl });
          } else {
            window.open(apkUrl, '_blank');
          }
        }
      } else {
        alert('當前是最新版本');
      }

    } catch (err) {
      console.error('Update check failed:', err);
      // Fallback: just open the link if check fails
      window.open('https://task-reminder-omega-five.vercel.app/TaskFlow.apk', '_blank');
    } finally {
      setIsCheckingUpdate(false);
    }
  };


  useEffect(() => {
    const checkTasks = () => {
      if ('Notification' in window && Notification.permission === 'granted') {
        const now = new Date();
        tasks.forEach(task => {
          if (task.is_completed || !task.due_date) return;
          
          const dueDate = new Date(task.due_date);
          const timeDiff = dueDate - now;
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          
          let updates = {};
          let shouldNotify = false;
          let notifyMsg = '';

          if (hoursDiff <= 0 && !task.notified_due) {
            shouldNotify = true;
            notifyMsg = `任務「${task.content}」已經到期！已自動標記為完成。`;
            updates.notified_due = true;
            updates.is_completed = true;
            taskAPI.updateTask(task.id, { is_completed: true }).catch(console.error);
          } else if (hoursDiff > 0 && hoursDiff <= 1 && !task.notified_1h) {
            shouldNotify = true;
            notifyMsg = `任務「${task.content}」將在 1 小時內到期！`;
            updates.notified_1h = true;
          } else if (hoursDiff > 1 && hoursDiff <= 24 && !task.notified_24h) {
             shouldNotify = true;
             notifyMsg = `任務「${task.content}」將在 24 小時內到期。`;
             updates.notified_24h = true;
          }

          if (shouldNotify) {
            try {
              new Notification('TaskFlow 任務提醒', { body: notifyMsg });
            } catch (err) {}
            taskAPI.updateNotifyStatus(task.id, updates).catch(console.error);
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updates } : t));
          }
        });
      }
    };
    checkTasks();
    const intervalId = setInterval(checkTasks, 60000);
    return () => clearInterval(intervalId);
  }, [tasks]);

  const fetchTasks = async () => {
    try {
      const data = await taskAPI.getTasks();
      setTasks(data);
    } catch (err) {
      if (err.message.includes('token') || err.message.includes('fetch') || err.message.includes('tasks')) {
         handleLogout(); 
      }
    }
  };

  const handleLogout = () => {
    setConfirmData({ type: 'logout' });
  };



  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskContent.trim()) {
      alert('請先輸入你要設定的任務內容！');
      return;
    }

    if (!newTaskDueDate) {
      alert('請記得點擊日曆圖示設定「任務截止時間」！');
      return;
    }
    
    try {
      const utcDueDate = newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null;
      const task = await taskAPI.createTask({ content: newTaskContent, due_date: utcDueDate });
      setTasks([task, ...tasks]);
      setNewTaskContent('');
      setNewTaskDueDate('');
    } catch (err) {
      alert('新增失敗，您的登入狀態可能已過期，請重新登入！');
      handleLogout();
    }
  };

  const handleUpdateTask = (id, data) => {
    // If we are toggling completion, show confirmation modal
    if (data.hasOwnProperty('is_completed')) {
      const task = tasks.find(t => t.id === id);
      setConfirmData({ id, type: 'toggle', is_completed: data.is_completed, content: task.content });
      return;
    }
    executeTaskUpdate(id, data);
  };

  const executeTaskUpdate = async (id, data) => {
    try {
      const updatedTask = await taskAPI.updateTask(id, data);
      setTasks(tasks.map(t => t.id === id ? { ...t, ...updatedTask } : t));
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const handleConfirmAction = () => {
    if (confirmData) {
      if (confirmData.type === 'toggle') {
        executeTaskUpdate(confirmData.id, { is_completed: confirmData.is_completed });
      } else if (confirmData.type === 'delete') {
        executeTaskDelete(confirmData.id);
      } else if (confirmData.type === 'logout') {
        localStorage.removeItem('taskflow_token');
        localStorage.removeItem('taskflow_username');
        setAuth(false);
      }
      setConfirmData(null);
    }
  };


  const handleDeleteTask = (id) => {
    const task = tasks.find(t => t.id === id);
    setConfirmData({ id, type: 'delete', content: task.content });
  };

  const executeTaskDelete = async (id) => {
    try {
      await taskAPI.deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return !task.is_completed;
    if (filter === 'completed') return task.is_completed;
    return true;
  });

  return (
    <div className="container">
      {showAlarmList && <AlarmListModal onClose={() => setShowAlarmList(false)} />}
      <header className="dashboard-header fade-in">
        <div style={{ width: '100%' }}>
          <h2>早安，{username}</h2>
          <p>今天是 {new Date().toLocaleDateString('zh-TW')}，準備好完成目標了嗎？</p>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginTop: '1rem' 
          }}>
            {isAndroid ? (
              <button 
                onClick={() => setShowAlarmList(true)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  background: 'rgba(167,139,250,0.1)', 
                  border: '1px solid rgba(167,139,250,0.2)',
                  borderRadius: '8px',
                  padding: '0.4rem 0.75rem',
                  color: '#a78bfa',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                <Bell size={16} />
                鬧鐘清單
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {googleStatus.is_linked ? (
                <button className="icon-btn" style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)' }} onClick={() => setShowSettings(true)} title="系統設定 (已連結 Google 日曆)">
                  <div style={{ position: 'relative', display: 'flex' }}>
                    <Calendar size={20} color="var(--primary)" />
                    <span style={{ position: 'absolute', bottom: '-2px', right: '-4px', width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', border: '1.5px solid var(--panel-bg)' }}></span>
                  </div>
                </button>
              ) : (
                <button className="icon-btn" style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)' }} onClick={() => setShowSettings(true)} title="系統設定">
                  <Settings size={20} />
                </button>
              )}

              <button className="icon-btn" style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }} onClick={handleLogout} title="登出">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>


      {/* Dynamic CTA Banner */}
      {!googleStatus.is_linked && (
        <div className="cta-banner fade-in delay-1" onClick={() => setShowSettings(true)}>
          <div className="cta-content">
            <div className="cta-icon-wrapper">
              <Calendar size={24} color="#fff" />
            </div>
            <div className="cta-text">
              <h3>連結 Google 日曆</h3>
              <p>讓任務自動同步到手機，重要行程不漏接！</p>
            </div>
          </div>
          <span className="cta-arrow">→</span>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
            maxHeight: '90vh', 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden' 
          }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <Settings size={24} /> 系統設定與整合
            </h3>
            
            <div className="settings-scroll-area" style={{ 
              flex: 1,
              maxHeight: '60vh', 
              overflowY: 'auto', 
              paddingRight: '8px', 
              margin: '0 -8px',
              WebkitOverflowScrolling: 'touch'
            }}>
              <div style={{ padding: '0 8px' }}>
                <div className="setting-card" style={{ background: 'rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calendar size={20} style={{ color: '#4285F4' }} />
                    </div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Google 日曆雙向同步</h4>
                  </div>
                  
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                    將您的任務自動同步到 Google 日曆，並在日曆上修改時自動更新回 TaskReminder。
                  </p>
                  
                  {!googleStatus.is_linked ? (
                    <button 
                      onClick={handleLinkGoogle}
                      disabled={isLinking}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', background: '#fff', color: '#3c4043', padding: '0.75rem', borderRadius: '8px', border: '1px solid #dadce0', fontWeight: '500', fontSize: '0.9rem' }}
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: '16px', height: '16px' }} />
                      {isLinking ? '連結中...' : '使用 Google 帳號連結'}
                    </button>
                  ) : (
                    <div className="google-settings">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0.85rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>自動同步已啟用</span>
                          {googleStatus.google_email && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{googleStatus.google_email}</span>
                          )}
                        </div>
                        <label className="toggle-switch" style={{ flexShrink: 0 }}>
                          <input type="checkbox" checked={googleStatus.is_calendar_enabled} onChange={handleToggleSync} />
                          <span className="slider"></span>
                        </label>
                      </div>
                      
                      {googleStatus.is_calendar_enabled && (
                        <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#10b981', fontWeight: '600' }}>
                              <span className="status-dot pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
                              即時連線中
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.25rem' }}>
                              上次同步：{lastSyncTime ? lastSyncTime : '剛剛'}
                            </div>
                          </div>

                          <button 
                            onClick={handleManualSync}
                            disabled={isSyncing}
                            style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '500' }}
                          >
                            {isSyncing ? '🔄 同步中...' : '🔄 立即檢查變更'}
                          </button>
                        </div>
                      )}

                      <button onClick={handleUnlinkGoogle} style={{ marginTop: '1.5rem', width: '100%', padding: '0.6rem', background: 'transparent', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', fontSize: '0.8rem' }}>
                        解除 Google 連結
                      </button>
                    </div>
                  )}
                </div>
                
                {/* App Update Section inside scroll area */}
                {(window.Capacitor || isAndroid) && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <Inbox size={20} style={{ color: '#fbbf24' }} />
                      <h4 style={{ margin: 0 }}>軟體更新</h4>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '8px' }}>
                       <div style={{ display: 'flex', flexDirection: 'column' }}>
                         <span style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: '500' }}>發現新功能？</span>
                         <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>點擊按鈕下載最新版 APK</span>
                       </div>
                    <button 
                      onClick={handleCheckUpdate}
                      disabled={isCheckingUpdate}
                      style={{ padding: '0.5rem 1rem', background: '#fbbf24', color: '#000', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', opacity: isCheckingUpdate ? 0.7 : 1 }}
                    >
                      {isCheckingUpdate ? '檢查中...' : '檢查最新版本'}
                    </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={() => setShowSettings(false)}
              style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', flexShrink: 0 }}
            >
              關閉
            </button>
          </div>
        </div>
      )}


      <form className="chat-input-bar fade-in delay-1" onSubmit={handleAddTask}>
        <div className="input-wrapper" style={{ flex: 1 }}>
          <Plus className="input-icon" size={20} />
          <input 
            type="text" 
            placeholder="新增任務..." 
            value={newTaskContent}
            onChange={(e) => setNewTaskContent(e.target.value)}
          />
        </div>
        <div className="chat-actions">
           <div 
             className={`date-picker-wrapper ${newTaskDueDate ? 'has-date' : ''}`} 
             title="設定截止時間"
             onClick={() => document.getElementById('date-picker-input').showPicker()}
           >
             <Calendar size={18} className="date-icon" style={{ pointerEvents: 'none' }} />
             <input 
               id="date-picker-input"
               type="datetime-local"
               value={newTaskDueDate}
               onChange={(e) => setNewTaskDueDate(e.target.value)}
               style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
             />
           </div>
           <button type="submit" className="submit-btn" disabled={!newTaskContent.trim()} title="發送">
             <Plus size={20} />
           </button>
        </div>
      </form>

      <div className="filters fade-in delay-2">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          全部
        </button>
        <button className={`filter-btn ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>
          待辦
        </button>
        <button className={`filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>
          已完成
        </button>
      </div>

      <div className="task-list fade-in delay-3">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            {tasks.length === 0 ? (
              // Initial State: No tasks at all
              <div className="empty-state-content animate-float">
                <div className="empty-icon-wrapper welcome">
                  <Plus size={40} />
                </div>
                <h3>新的一天開始了！</h3>
                <p>準備好要征服哪些目標了嗎？在上方新增你的第一個任務吧 🚀</p>
              </div>
            ) : filter === 'active' ? (
              // All Tasks Done State
              <div className="empty-state-content animate-pulse-soft">
                <div className="empty-icon-wrapper success">
                  <CheckSquare size={40} />
                </div>
                <h3>太棒了，大功告成！</h3>
                <p>你已經解決了所有待辦事項，現在是享受放鬆的最佳時刻 ☕✨</p>
                <div className="celebration-glow"></div>
              </div>
            ) : (
              // Other empty states (e.g., no completed tasks yet)
              <div className="empty-state-content">
                <div className="empty-icon-wrapper">
                  <Inbox size={40} />
                </div>
                <p>目前沒有相符的任務，享受片刻的寧靜吧！</p>
              </div>
            )}
          </div>
        ) : (
          filteredTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onUpdate={handleUpdateTask} 
              onDelete={handleDeleteTask} 
            />
          ))
        )}
      </div>
      {/* Confirmation Modal */}
      {confirmData && (
        <div className="modal-overlay">
          <div className="modal-content fade-in" style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              background: (confirmData.type === 'delete' || confirmData.type === 'logout') ? 'rgba(239, 68, 68, 0.1)' : (confirmData.is_completed ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.05)'),
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: (confirmData.type === 'delete' || confirmData.type === 'logout') ? 'var(--danger)' : 'var(--primary)'
            }}>
              {confirmData.type === 'logout' ? <LogOut size={30} /> : (confirmData.type === 'delete' ? <LogOut size={30} style={{ transform: 'rotate(90deg)' }} /> : <CheckSquare size={30} />)}
            </div>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>
              {confirmData.type === 'logout' ? '登出帳號' : (confirmData.type === 'delete' ? '確認刪除' : '確認操作')}
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
              {confirmData.type === 'logout' ? (
                <>確定要登出 TaskFlow 嗎？您之後需要重新登入才能存取您的任務。</>
              ) : confirmData.type === 'delete' ? (
                <>確定要永久刪除「<span style={{ color: '#fff', fontWeight: '600' }}>{confirmData.content}</span>」嗎？此操作無法復原。</>
              ) : (
                <>確定要將任務「<span style={{ color: '#fff', fontWeight: '600' }}>{confirmData.content}</span>」標記為{confirmData.is_completed ? '已完成' : '未完成'}嗎？</>
              )}
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="secondary" style={{ flex: 1 }} onClick={() => setConfirmData(null)}>
                取消
              </button>
              <button 
                style={{ flex: 1, background: confirmData.type === 'delete' ? 'var(--danger)' : 'var(--primary)' }} 
                onClick={handleConfirmAction}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
