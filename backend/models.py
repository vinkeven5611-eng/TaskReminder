from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    skip_2fa = db.Column(db.Boolean, default=False)
    
    # --- Google Calendar 同步擴充欄位 ---
    google_refresh_token_encrypted = db.Column(db.Text, nullable=True)
    is_calendar_enabled = db.Column(db.Boolean, default=False)
    google_email = db.Column(db.String(120), nullable=True)
    calendar_webhook_id = db.Column(db.String(100), nullable=True)
    calendar_sync_token = db.Column(db.String(100), nullable=True)

    tasks = db.relationship('Task', backref='owner', lazy=True)

class Task(db.Model):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.String(255), nullable=False)
    is_completed = db.Column(db.Boolean, default=False)
    due_date = db.Column(db.DateTime, nullable=True)
    
    # 前端通知狀態
    notified_24h = db.Column(db.Boolean, default=False)
    notified_1h = db.Column(db.Boolean, default=False)
    notified_due = db.Column(db.Boolean, default=False)
    
    # 後端 Email 通知狀態
    email_notified_24h = db.Column(db.Boolean, default=False)
    email_notified_1h = db.Column(db.Boolean, default=False)
    
    # --- Google Calendar 同步擴充欄位 ---
    google_event_id = db.Column(db.String(255), index=True, nullable=True)
    last_synced_at = db.Column(db.DateTime, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DailyStat(db.Model):
    __tablename__ = 'daily_stats'
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, unique=True, nullable=False)
    active_users = db.Column(db.Integer, default=0)
