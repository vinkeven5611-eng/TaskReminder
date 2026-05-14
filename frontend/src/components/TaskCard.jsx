import { useState } from 'react';
import { Trash2, Edit2, Check, X, Calendar, Clock } from 'lucide-react';

export default function TaskCard({ task, onUpdate, onDelete }) {
  const formatForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(task.content);
  const [editDueDate, setEditDueDate] = useState(formatForInput(task.due_date));

  const toggleComplete = () => {
    onUpdate(task.id, { is_completed: !task.is_completed });
  };

  const handleEdit = () => {
    setIsEditing(true);
    resetSwipe();
  };

  const handleDelete = () => {
    onDelete(task.id);
    resetSwipe();
  };

  const saveEdit = () => {
    const utcDate = editDueDate ? new Date(editDueDate).toISOString() : null;
    onUpdate(task.id, { content: editContent, due_date: utcDate });
    setIsEditing(false);
  };

  return (
    <div className="task-card-container">
      <div className="task-card-actions-bg">
        <button className="swipe-action-btn edit" onClick={handleEdit}>
          <Settings size={20} />
          <span>編輯</span>
        </button>
        <button className="swipe-action-btn delete" onClick={handleDelete}>
          <LogOut size={20} style={{ transform: 'rotate(90deg)' }} />
          <span>刪除</span>
        </button>
      </div>

      <div 
        className={`task-card ${task.is_completed ? 'completed' : ''}`}
        style={{ transform: `translateX(${translateX}px)`, transition: touchStart ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={isSwiped ? resetSwipe : undefined}
      >
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
        )}
      </div>
    </div>
  );
}
