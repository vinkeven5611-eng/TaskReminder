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

  const handleSaveEdit = () => {
    const isDateChanged = editDueDate !== formatForInput(task.due_date);
    if (editContent.trim() && (editContent !== task.content || isDateChanged)) {
      const utcDueDate = editDueDate ? new Date(editDueDate).toISOString() : null;
      onUpdate(task.id, { content: editContent, due_date: utcDueDate });
    }
    setIsEditing(false);
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`task-card ${task.is_completed ? 'completed' : ''}`}>
      <div className="custom-checkbox" onClick={toggleComplete}>
        <Check size={16} strokeWidth={3} />
      </div>
      
      <div className="task-content">
        {isEditing ? (
          <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              value={editContent} 
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
              autoFocus
              style={{ padding: '0.4rem 0.75rem', flex: 1 }}
            />
            <input 
              type="datetime-local"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', width: '200px' }}
            />
          </div>
        ) : (
          <span className="task-text">{task.content}</span>
        )}
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span className="task-date-badge">
            <Clock size={12} /> {formatDate(task.created_at)}
          </span>
          {task.due_date && (
            <span className="task-date-badge date-due">
              <Calendar size={12} /> 到期：{formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        {isEditing ? (
          <>
            <button className="icon-btn" onClick={handleSaveEdit}><Check size={18} color="var(--primary)" /></button>
            <button className="icon-btn" onClick={() => { setIsEditing(false); setEditContent(task.content); }}><X size={18} /></button>
          </>
        ) : (
          <>
            <button className="icon-btn" onClick={() => setIsEditing(true)}><Edit2 size={18} /></button>
            <button className="icon-btn danger" onClick={() => onDelete(task.id)}><Trash2 size={18} /></button>
          </>
        )}
      </div>
    </div>
  );
}
