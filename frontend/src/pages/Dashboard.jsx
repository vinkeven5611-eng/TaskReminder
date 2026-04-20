import { useEffect, useState } from 'react';
import { taskAPI } from '../services/api';
import TaskCard from '../components/TaskCard';
import { LogOut, Plus, Search, Calendar, Inbox, CheckSquare, Clock } from 'lucide-react';

export default function Dashboard({ setAuth }) {
  const [tasks, setTasks] = useState([]);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, completed
  const username = localStorage.getItem('taskflow_username') || 'User';

  useEffect(() => {
    fetchTasks();
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

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
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_username');
    setAuth(false);
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskContent.trim()) {
      alert('請先輸入你要設定的任務內容！');
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

  const handleUpdateTask = async (id, data) => {
    try {
      const updatedTask = await taskAPI.updateTask(id, data);
      setTasks(tasks.map(t => t.id === id ? { ...t, ...updatedTask } : t));
    } catch (err) {}
  };

  const handleDeleteTask = async (id) => {
    try {
      await taskAPI.deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (err) {}
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return !task.is_completed;
    if (filter === 'completed') return task.is_completed;
    return true;
  });

  return (
    <div className="container">
      <header className="dashboard-header fade-in">
        <div>
          <h2>早安，{username}</h2>
          <p>今天是 {new Date().toLocaleDateString('zh-TW')}，準備好完成目標了嗎？</p>
        </div>
        <button className="secondary" onClick={handleLogout} title="登出">
          <LogOut size={18} /> 登出
        </button>
      </header>

      <form className="task-input-section fade-in delay-1" onSubmit={handleAddTask}>
        <div className="input-wrapper" style={{ flex: 1 }}>
          <Search className="input-icon" size={20} />
          <input 
            type="text" 
            placeholder="今天需要專注完成什麼任務？" 
            value={newTaskContent}
            onChange={(e) => setNewTaskContent(e.target.value)}
          />
        </div>
        <div className="input-wrapper" style={{ width: 'max-content' }}>
          <Clock className="input-icon" size={20} />
          <input 
            type="datetime-local"
            value={newTaskDueDate}
            onChange={(e) => setNewTaskDueDate(e.target.value)}
          />
        </div>
        <button type="submit">
          <Plus size={20} /> 新增
        </button>
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
            <Inbox size={48} />
            <p>目前沒有相符的任務，享受片刻的寧靜吧！</p>
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
    </div>
  );
}
