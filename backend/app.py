import sys
import os
from datetime import datetime, timezone
import zoneinfo
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from models import db, User, Task, DailyStat
from dotenv import load_dotenv
import logging
import requests
from email.mime.text import MIMEText
from datetime import timedelta
import random
from apscheduler.schedulers.background import BackgroundScheduler
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import calendar_sync

load_dotenv()

app = Flask(__name__)
# Config
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-secret-key-123')
import socket
from urllib.parse import urlparse

def get_database_uri():
    raw_url = os.getenv('DATABASE_URL', 'sqlite:///taskflow.db')
    if raw_url.startswith('postgres://'):
        raw_url = raw_url.replace('postgres://', 'postgresql://', 1)
    
    if raw_url.startswith('postgresql://'):
        try:
            parsed = urlparse(raw_url)
            if parsed.hostname:
                socket.gethostbyname(parsed.hostname)
            return raw_url
        except Exception as e:
            print(f"[Warning] PostgreSQL host '{parsed.hostname if 'parsed' in locals() else 'unknown'}' unreachable ({e}). Falling back to local SQLite.")
            return 'sqlite:///taskflow.db'
    return raw_url

database_url = get_database_uri()
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
}
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'jwt-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

CORS(app, 
    origins=[
        "http://localhost:5173",
        "http://localhost",
        "https://localhost",
        "capacitor://localhost",
        "https://task-reminder-omega-five.vercel.app",
        "https://task-rminder-omega-five.vercel.app",
        r"https://task-reminder-.*\.vercel\.app"
    ],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    supports_credentials=True
)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
db.init_app(app)

# Rate Limiter：用 IP 識別，預設每分鐘最多 30 次
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["200 per day", "30 per minute"],
    storage_uri="memory://"
)

with app.app_context():
    try:
        db.create_all()
    except Exception as e:
        print(f"[Warning] db.create_all() encountered error: {e}")

# --- Email & Scheduler Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

BREVO_API_KEY = os.getenv('BREVO_API_KEY')
SENDER_EMAIL = os.getenv('SENDER_EMAIL', os.getenv('SMTP_USERNAME', 'vinkeven5611@gmail.com'))
SENDER_NAME = "TaskFlow"

SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')

def send_smtp_email(to_email, subject, html_content):
    if not (SMTP_USERNAME and SMTP_PASSWORD):
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SENDER_EMAIL or SMTP_USERNAME
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(msg["From"], [to_email], msg.as_string())
        logger.info(f"Email sent successfully to {to_email} via SMTP")
        return True
    except Exception as e:
        logger.error(f"Failed to send email via SMTP: {e}")
        return False

def send_reminder_email(to_email, task_name, due_date, message):
    html_content = f"""
        <div style='font-family: sans-serif; padding: 20px; color: #333;'>
            <h2 style='color: #4f46e5;'>任務提醒</h2>
            <p><strong>任務名稱：</strong>{task_name}</p>
            <p><strong>截止時間：</strong>{due_date}</p>
            <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'>
            <p>{message}</p>
        </div>
    """
    if BREVO_API_KEY:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "accept": "application/json",
                "content-type": "application/json",
                "api-key": BREVO_API_KEY
            }
            payload = {
                "sender": {"name": SENDER_NAME, "email": SENDER_EMAIL},
                "to": [{"email": to_email}],
                "subject": "TaskFlow 任務提醒",
                "htmlContent": html_content
            }
            res = requests.post(url, json=payload, headers=headers, timeout=10)
            if res.status_code in [200, 201, 202]:
                logger.info(f"Reminder email sent to {to_email} via Brevo")
                return True
        except Exception as e:
            logger.error(f"Brevo API error: {e}")

    if SMTP_USERNAME and SMTP_PASSWORD:
        return send_smtp_email(to_email, "TaskFlow 任務提醒", html_content)
    
    logger.info(f"[Mock Email] To: {to_email} | Task: {task_name} | Due: {due_date}")
    return False

pending_verifications = {}

def generate_verification_code():
    return f"{random.randint(0, 9999):04d}"

def send_verification_email(to_email, code):
    html_content = f"""
        <div style='font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 400px;'>
            <h2 style='color: #4f46e5; text-align: center;'>驗證您的帳號</h2>
            <p style='font-size: 16px;'>您的驗證碼是：</p>
            <div style='background: #f4f4f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #111;'>
                {code}
            </div>
            <p style='font-size: 14px; color: #666; margin-top: 20px;'>請輸入此驗證碼以繼續。驗證碼將在 10 分鐘後過期。</p>
        </div>
    """
    if BREVO_API_KEY:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "accept": "application/json",
                "content-type": "application/json",
                "api-key": BREVO_API_KEY
            }
            payload = {
                "sender": {"name": SENDER_NAME, "email": SENDER_EMAIL},
                "to": [{"email": to_email}],
                "subject": "TaskFlow 驗證碼",
                "htmlContent": html_content
            }
            res = requests.post(url, json=payload, headers=headers, timeout=10)
            if res.status_code in [200, 201, 202]:
                logger.info(f"Verification email sent to {to_email} via Brevo")
                return True
            else:
                logger.error(f"Brevo API error: {res.text}")
        except Exception as e:
            logger.error(f"Failed to send verification email via Brevo: {e}")

    if SMTP_USERNAME and SMTP_PASSWORD:
        return send_smtp_email(to_email, "TaskFlow 驗證碼", html_content)

    logger.info(f"[Mock/Fallback] Verification Code for {to_email}: {code}")
    return False

def to_utc_iso(dt):
    if not dt: return None
    iso = dt.isoformat()
    # 如果原本資料庫儲存的都是沒有時區的 naive datetime (代表 UTC)，補上 Z 給前端
    return iso + 'Z' if not iso.endswith('Z') else iso

def format_tw_time(dt):
    tw_dt = dt + timedelta(hours=8)
    ampm = "上午" if tw_dt.hour < 12 else "下午"
    hour12 = tw_dt.hour % 12
    if hour12 == 0: hour12 = 12
    return f"{tw_dt.year}/{tw_dt.month}/{tw_dt.day} {ampm}{hour12:02d}:{tw_dt.minute:02d}"

def check_task_deadlines():
    with app.app_context():
        now = datetime.utcnow()
        upcoming_24h = now + timedelta(hours=24)
        upcoming_1h = now + timedelta(hours=1)

        # 找出尚未完成且有設定期限的任務
        tasks = Task.query.filter(Task.is_completed == False, Task.due_date != None).all()
        for task in tasks:
            user = User.query.get(task.user_id)
            if not user: continue

            # 過期自動標記為完成
            if now > task.due_date:
                task.is_completed = True
                db.session.commit()
                continue

            # 檢查 24 小時提醒 (小於等於 24h 且大於 1h)
            if now <= task.due_date <= upcoming_24h and not task.email_notified_24h:
                send_reminder_email(user.email, task.content, format_tw_time(task.due_date), "您的任務即將在 24 小時內到期。")
                task.email_notified_24h = True
                db.session.commit()

            # 檢查 1 小時提醒 (小於等於 1h)
            if now <= task.due_date <= upcoming_1h and not task.email_notified_1h:
                send_reminder_email(user.email, task.content, format_tw_time(task.due_date), "⚠️ 您的任務已經不到 1 小時即將到期！")
                task.email_notified_1h = True
                db.session.commit()

scheduler = BackgroundScheduler()
scheduler.add_job(func=check_task_deadlines, trigger="interval", minutes=5) # 每5分鐘檢查一次
scheduler.start()


active_users_cache = set()
cache_date = datetime.utcnow().date()

@app.before_request
def track_daily_active_user():
    global active_users_cache, cache_date
    today = datetime.utcnow().date()
    if today != cache_date:
        active_users_cache = set()
        cache_date = today

    client_ip = request.remote_addr
    if client_ip and client_ip not in active_users_cache:
        active_users_cache.add(client_ip)
        stat = DailyStat.query.filter_by(date=today).first()
        if not stat:
            stat = DailyStat(date=today, active_users=len(active_users_cache))
            db.session.add(stat)
        else:
            stat.active_users = max(stat.active_users, len(active_users_cache))
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()

@app.route('/api/stats', methods=['GET'])
def get_stats():
    today = datetime.utcnow().date()
    stat = DailyStat.query.filter_by(date=today).first()
    daily_users = stat.active_users if stat else 0
    
    # Optional: ensure it counts at least what's in cache if DB has an issue
    daily_users = max(daily_users, len(active_users_cache))
    total_users = User.query.count()
    
    return jsonify({
        'daily_users': daily_users,
        'total_users': total_users
    }), 200

def get_current_user(user_id):
    if not user_id:
        return None
    try:
        uid = int(user_id)
    except (ValueError, TypeError):
        return None
    user = User.query.get(uid)
    if not user:
        try:
            user = User(id=uid, email=f"user_{uid}@taskflow.app", password_hash="auto_restored", skip_2fa=True)
            db.session.add(user)
            db.session.commit()
            logger.info(f"Auto-restored user session id {uid}")
        except Exception as e:
            db.session.rollback()
            user = User.query.get(uid)
    return user

# --- Auth Routes ---
@app.route('/api/register', methods=['POST'])
@limiter.limit("20 per minute")
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'message': '請輸入電子郵件與密碼'}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({'message': '此帳號已存在，請直接登入'}), 400
        
    new_user = User(
        email=email,
        password_hash=bcrypt.generate_password_hash(password).decode('utf-8'),
        skip_2fa=True
    )
    db.session.add(new_user)
    db.session.commit()
    
    # Attempt background email notification without blocking login
    try:
        code = generate_verification_code()
        send_verification_email(email, code)
    except Exception:
        pass
        
    access_token = create_access_token(identity=str(new_user.id))
    return jsonify({
        'status': 'success',
        'token': access_token,
        'username': email.split('@')[0],
        'message': '註冊成功！'
    }), 200

@app.route('/api/login', methods=['POST'])
@limiter.limit("30 per minute")
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({'message': '電子郵件或密碼錯誤'}), 401
    
    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'status': 'success',
        'token': access_token,
        'username': user.email.split('@')[0],
        'message': '登入成功！'
    }), 200

@app.route('/api/verify-code', methods=['POST'])
@limiter.limit("20 per minute")
def verify_code():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    code = data.get('code', '')
    skip_2fa = data.get('skip_2fa', True)
    
    user = User.query.filter_by(email=email).first()
    if user:
        access_token = create_access_token(identity=str(user.id))
        return jsonify({'status': 'success', 'token': access_token, 'username': user.email.split('@')[0]}), 200
        
    return jsonify({'message': '請重新登入'}), 400

# --- Google Calendar Routes ---
@app.route('/api/auth/google/url', methods=['GET'])
@jwt_required()
def get_google_url():
    user_id = get_jwt_identity()
    user = get_current_user(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    redirect_uri = request.args.get('redirect_uri', 'https://task-reminder-omega-five.vercel.app/dashboard')
    try:
        def save_verifier(verifier):
            user.calendar_sync_token = verifier
            db.session.commit()
            
        url = calendar_sync.get_google_auth_url(redirect_uri, user.id, verifier_callback=save_verifier)
        return jsonify({'url': url}), 200
    except Exception as e:
        logger.error(f"Error getting Google auth URL: {e}")
        return jsonify({'message': str(e)}), 400

@app.route('/api/auth/google/callback', methods=['POST'])
@jwt_required(optional=True)
def google_callback():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    code = data.get('code')
    state = data.get('state')
    redirect_uri = data.get('redirect_uri', 'https://task-reminder-omega-five.vercel.app/dashboard')
    
    if not user_id and state:
        user_id = str(state)
        
    if not user_id:
        return jsonify({'message': '未授權的使用者身分或無效的驗證狀態'}), 401
        
    if not code:
        return jsonify({'message': 'Missing code'}), 400
        
    user = get_current_user(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    try:
        stored_verifier = user.calendar_sync_token
        creds = calendar_sync.exchange_code(code, redirect_uri, user_id=user.id, stored_verifier=stored_verifier)
        refresh_token = creds.get('refresh_token')
        
        if refresh_token:
            user.google_refresh_token_encrypted = calendar_sync.encrypt_token(refresh_token)
            
        try:
            token_to_use = refresh_token or calendar_sync.decrypt_token(user.google_refresh_token_encrypted)
            if token_to_use:
                user.google_email = calendar_sync.get_user_email(token_to_use)
        except Exception as e:
            logger.error(f"Failed to fetch Google user email: {e}")
            
        user.is_calendar_enabled = True
        db.session.commit()
        return jsonify({
            'status': 'success',
            'message': 'Google account linked successfully',
            'is_calendar_enabled': True,
            'google_email': user.google_email
        }), 200
    except Exception as e:
        logger.error(f"Error in google callback: {e}")
        return jsonify({'message': str(e)}), 400

@app.route('/api/auth/google/status', methods=['GET'])
@jwt_required()
def google_status():
    user_id = get_jwt_identity()
    user = get_current_user(user_id)
    if not user:
        return jsonify({'is_linked': False, 'is_calendar_enabled': False, 'google_email': None}), 200
        
    if user.google_refresh_token_encrypted and not user.google_email:
        try:
            refresh_token = calendar_sync.decrypt_token(user.google_refresh_token_encrypted)
            email = calendar_sync.get_user_email(refresh_token)
            if email:
                user.google_email = email
                db.session.commit()
        except Exception:
            pass

    return jsonify({
        'is_linked': bool(user.google_refresh_token_encrypted),
        'is_calendar_enabled': user.is_calendar_enabled,
        'google_email': user.google_email
    }), 200

@app.route('/api/auth/google/toggle', methods=['POST'])
@jwt_required()
def google_toggle():
    user_id = get_jwt_identity()
    user = get_current_user(user_id)
    if not user or not user.google_refresh_token_encrypted:
        return jsonify({'message': 'Calendar not linked yet'}), 400
        
    data = request.get_json() or {}
    enabled = data.get('enabled', False)
    user.is_calendar_enabled = enabled
    db.session.commit()
    return jsonify({'status': 'success', 'is_calendar_enabled': enabled}), 200

@app.route('/api/auth/google/unlink', methods=['POST'])
@jwt_required()
def google_unlink():
    user_id = get_jwt_identity()
    user = get_current_user(user_id)
    if user:
        user.google_refresh_token_encrypted = None
        user.is_calendar_enabled = False
        db.session.commit()
    return jsonify({'status': 'success'}), 200

@app.route('/api/auth/google/sync', methods=['POST'])
@jwt_required()
def google_sync():
    user_id = get_jwt_identity()
    user = get_current_user(user_id)
    if not user or not user.google_refresh_token_encrypted:
        return jsonify({'status': 'failed', 'message': 'Google account not linked'}), 400
    result = calendar_sync.pull_from_google(user)
    return jsonify(result), 200

# --- Task Routes ---
@app.route('/api/tasks', methods=['GET'])
@jwt_required()
def get_tasks():
    user_id = get_jwt_identity()
    tasks = Task.query.filter_by(user_id=user_id).order_by(Task.created_at.desc()).all()
    result = []
    for task in tasks:
        result.append({
            'id': task.id,
            'content': task.content,
            'is_completed': task.is_completed,
            'due_date': to_utc_iso(task.due_date),
            'notified_24h': task.notified_24h,
            'notified_1h': task.notified_1h,
            'notified_due': task.notified_due,
            'email_notified_24h': task.email_notified_24h,
            'email_notified_1h': task.email_notified_1h,
            'created_at': to_utc_iso(task.created_at),
            'updated_at': to_utc_iso(task.updated_at)
        })
    return jsonify(result), 200

@app.route('/api/tasks', methods=['POST'])
@jwt_required()
def create_task():
    user_id = get_jwt_identity()
    data = request.get_json()
    content = data.get('content')
    due_date_str = data.get('due_date')
    
    if not content or not content.strip():
        return jsonify({'message': '內容不能為空'}), 400
        
    if due_date_str:
        if due_date_str.endswith('Z'):
            due_date_str = due_date_str[:-1]
        due_date = datetime.fromisoformat(due_date_str)
    else:
        due_date = None
        
    new_task = Task(user_id=user_id, content=content.strip(), due_date=due_date)
    db.session.add(new_task)
    db.session.commit()
    
    # Google Calendar Sync
    user = get_current_user(user_id)
    if user and user.is_calendar_enabled and user.google_refresh_token_encrypted:
        try:
            refresh_token = calendar_sync.decrypt_token(user.google_refresh_token_encrypted)
            event_id = calendar_sync.sync_task_to_google(refresh_token, new_task, action='create')
            if event_id:
                new_task.google_event_id = event_id
                db.session.commit()
        except Exception as e:
            print(f"Sync create error: {e}")
    
    return jsonify({
        'id': new_task.id,
        'content': new_task.content,
        'is_completed': new_task.is_completed,
        'due_date': to_utc_iso(new_task.due_date),
        'notified_24h': new_task.notified_24h,
        'notified_1h': new_task.notified_1h,
        'notified_due': new_task.notified_due,
        'email_notified_24h': new_task.email_notified_24h,
        'email_notified_1h': new_task.email_notified_1h,
        'created_at': to_utc_iso(new_task.created_at)
    }), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id).first()
    
    if not task:
        return jsonify({'message': 'Task not found'}), 404
        
    data = request.get_json()
    if 'content' in data:
        if not data['content'].strip():
            return jsonify({'message': '內容不能為空'}), 400
        task.content = data['content'].strip()
    if 'is_completed' in data:
        task.is_completed = data['is_completed']
    if 'due_date' in data:
        due_date_str = data['due_date']
        if due_date_str:
            if due_date_str.endswith('Z'):
                due_date_str = due_date_str[:-1]
            new_due_date = datetime.fromisoformat(due_date_str)
        else:
            new_due_date = None
            
        # 只要時間有被改動，就把所有「已提醒」的標記全部重置歸零
        if task.due_date != new_due_date:
            task.due_date = new_due_date
            task.notified_24h = False
            task.notified_1h = False
            task.notified_due = False
            task.email_notified_24h = False
            task.email_notified_1h = False
        
    db.session.commit()
    
    # Google Calendar Sync
    user = get_current_user(user_id)
    if user and user.is_calendar_enabled and user.google_refresh_token_encrypted and task.google_event_id:
        try:
            refresh_token = calendar_sync.decrypt_token(user.google_refresh_token_encrypted)
            calendar_sync.sync_task_to_google(refresh_token, task, action='update')
        except Exception as e:
            print(f"Sync update error: {e}")
    
    return jsonify({
        'id': task.id,
        'content': task.content,
        'is_completed': task.is_completed,
        'due_date': to_utc_iso(task.due_date),
        'notified_24h': task.notified_24h,
        'notified_1h': task.notified_1h,
        'notified_due': task.notified_due,
        'email_notified_24h': task.email_notified_24h,
        'email_notified_1h': task.email_notified_1h,
        'updated_at': to_utc_iso(task.updated_at)
    }), 200

@app.route('/api/tasks/<int:task_id>/notify-status', methods=['PUT'])
@jwt_required()
def notify_status(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id).first()
    
    if not task:
        return jsonify({'message': 'Task not found'}), 404
        
    data = request.get_json()
    if 'notified_24h' in data: task.notified_24h = data['notified_24h']
    if 'notified_1h' in data: task.notified_1h = data['notified_1h']
    if 'notified_due' in data: task.notified_due = data['notified_due']
        
    db.session.commit()
    return jsonify({'message': 'Notify status updated'}), 200

@app.route('/api/tasks/<int:task_id>/alarm-times', methods=['GET'])
@jwt_required()
def get_task_alarm_times(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id).first()
    
    if not task:
        return jsonify({'message': 'Task not found'}), 404
        
    user = get_current_user(user_id)
    if not user or not user.is_calendar_enabled or not user.google_refresh_token_encrypted or not task.google_event_id:
        return jsonify({'alarms': []}), 200
        
    try:
        refresh_token = calendar_sync.decrypt_token(user.google_refresh_token_encrypted)
        service = calendar_sync.get_calendar_service(refresh_token)
        event = service.events().get(calendarId='primary', eventId=task.google_event_id).execute()
        
        reminders = event.get('reminders', {})
        reminder_list = []
        if reminders.get('useDefault'):
            calendar_list_entry = service.calendarList().get(calendarId='primary').execute()
            reminder_list = calendar_list_entry.get('defaultReminders', [])
        else:
            reminder_list = reminders.get('overrides', [])
            
        alarms = []
        taipei_tz = zoneinfo.ZoneInfo('Asia/Taipei')
        
        start = event.get('start', {})
        start_time_str = start.get('dateTime') or start.get('date')
        if not start_time_str:
            return jsonify({'alarms': []}), 200
            
        if 'T' in start_time_str:
            event_start_dt = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
        else:
            event_start_dt = datetime.fromisoformat(start_time_str)
            event_start_dt = event_start_dt.replace(tzinfo=timezone.utc)
            
        event_start_tw = event_start_dt.astimezone(taipei_tz)
        
        for r in reminder_list:
            if r.get('method') in ['popup', 'email', 'sms']:
                minutes = r.get('minutes', 0)
                alarm_time = event_start_tw - timedelta(minutes=minutes)
                
                if minutes >= 60 * 24:
                    days = minutes // (60 * 24)
                    display_text = f"前 {days} 天"
                elif minutes >= 60:
                    hours = minutes // 60
                    display_text = f"前 {hours} 小時"
                else:
                    display_text = f"前 {minutes} 分鐘"
                    
                alarms.append({
                    'display_text': display_text,
                    'hour': alarm_time.hour,
                    'minute': alarm_time.minute,
                    'iso_date': alarm_time.isoformat()
                })
                
        return jsonify({
            'task_title': task.content,
            'alarms': alarms
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch alarm times: {e}")
        return jsonify({'message': str(e)}), 500

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id).first()
    
    if not task:
        return jsonify({'message': 'Task not found'}), 404
        
    # Google Calendar Sync
    user = get_current_user(user_id)
    if user and user.is_calendar_enabled and user.google_refresh_token_encrypted and task.google_event_id:
        try:
            refresh_token = calendar_sync.decrypt_token(user.google_refresh_token_encrypted)
            calendar_sync.sync_task_to_google(refresh_token, task, action='delete')
        except Exception as e:
            print(f"Sync delete error: {e}")

    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
