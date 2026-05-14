import { useState } from 'react';
import { Check, Clock, Settings, LogOut } from 'lucide-react';

export default function TaskCard({ task, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(task.content);
  
  const formatForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const [editDueDate, setEditDueDate] = useState(formatForInput(task.due_date));
  
  const isOverdue = !task.is_completed && task.due_date && new Date(task.due_date) < new Date();

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
    <div className={`task-card ${task.is_completed ? 'completed' : ''}`}>
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
              <div className={`task-date-badge ${isOverdue ? 'overdue' : ''}`}>
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

      <div className="task-actions">
        <button className="icon-btn" onClick={handleEdit} title="編輯">
          <Settings size={18} />
        </button>
        <button className="icon-btn delete" onClick={handleDelete} title="刪除">
          <LogOut size={18} style={{ transform: 'rotate(90deg)' }} />
        </button>
      </div>
    </div>
  );
}
