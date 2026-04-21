import sys
import os
from datetime import datetime
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from models import db, User, Task, DailyStat
from dotenv import load_dotenv
import logging
import smtplib
from email.mime.text import MIMEText
from datetime import timedelta
import random
from apscheduler.schedulers.background import BackgroundScheduler

load_dotenv()

app = Flask(__name__)
# Config
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-secret-key-123')
# Fix for Render/Heroku which may give postgres:// instead of postgresql://
database_url = os.getenv('DATABASE_URL', 'sqlite:///taskflow.db')
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
}
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'jwt-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

CORS(app, origins=[
    "http://localhost:5173",
    "https://task-reminder-omega-five.vercel.app",
])
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
db.init_app(app)

with app.app_context():
    db.create_all()

# --- Email & Scheduler Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
SENDER_EMAIL = os.getenv('SENDER_EMAIL', 'noreply@taskflow.local')

def send_reminder_email(to_email, task_name, due_date, message):
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.info(f"[Mock Email] To: {to_email} | Task: {task_name} | Due: {due_date} | Message: {message}")
        return

    try:
        msg = MIMEText(f"任務名稱：{task_name}\n截止時間：{due_date}\n\n{message}")
        msg['Subject'] = 'TaskFlow 任務提醒'
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"Email sent successfully to {to_email} for task {task_name}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email} for task {task_name}: {e}")

pending_verifications = {}

def generate_verification_code():
    return f"{random.randint(0, 9999):04d}"

def send_verification_email(to_email, code):
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.info(f"[Mock Email] To: {to_email} | Code: {code}")
        return
        
    try:
        msg = MIMEText(f"您的驗證碼是：{code}\n\n請輸入此驗證碼以繼續。")
        msg['Subject'] = 'TaskFlow 驗證碼'
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"Verification email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send verification email to {to_email}: {e}")

def to_utc_iso(dt):
    if not dt: return None
    iso = dt.isoformat()
    # 如果原本資料庫儲存的都是沒有時區的 naive datetime (代表 UTC)，補上 Z 給前端
    return iso + 'Z' if not iso.endswith('Z') else iso
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
                send_reminder_email(user.email, task.content, task.due_date.strftime("%Y-%m-%d %H:%M"), "您的任務即將在 24 小時內到期。")
                task.email_notified_24h = True
                db.session.commit()

            # 檢查 1 小時提醒 (小於等於 1h)
            if now <= task.due_date <= upcoming_1h and not task.email_notified_1h:
                send_reminder_email(user.email, task.content, task.due_date.strftime("%Y-%m-%d %H:%M"), "⚠️ 您的任務已經不到 1 小時即將到期！")
                task.email_notified_1h = True
                db.session.commit()

scheduler = BackgroundScheduler()
scheduler.add_job(func=check_task_deadlines, trigger="interval", minutes=60) # 每小時檢查一次
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

# --- Auth Routes ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'message': 'Missing email or password'}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'User already exists'}), 400
        
    code = generate_verification_code()
    send_verification_email(email, code)
    
    pending_verifications[email] = {
        'code': code,
        'action': 'register',
        'password_hash': bcrypt.generate_password_hash(password).decode('utf-8'),
        'expires_at': datetime.utcnow() + timedelta(minutes=10)
    }
    
    return jsonify({'status': 'pending_verification'}), 200

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({'message': 'Invalid credentials'}), 401
    
    if user.skip_2fa:
        access_token = create_access_token(identity=str(user.id))
        return jsonify({'status': 'success', 'token': access_token, 'username': user.email.split('@')[0]}), 200
        
    code = generate_verification_code()
    send_verification_email(email, code)
    
    pending_verifications[email] = {
        'code': code,
        'action': 'login',
        'expires_at': datetime.utcnow() + timedelta(minutes=10)
    }
    
    return jsonify({'status': 'pending_verification'}), 200

@app.route('/api/verify-code', methods=['POST'])
def verify_code():
    data = request.get_json()
    email = data.get('email')
    code = data.get('code')
    skip_2fa = data.get('skip_2fa', False)
    
    if not email or not code:
        return jsonify({'message': 'Missing data'}), 400
        
    pending = pending_verifications.get(email)
    if not pending:
        return jsonify({'message': 'No pending verification or expired'}), 400
        
    if datetime.utcnow() > pending['expires_at']:
        del pending_verifications[email]
        return jsonify({'message': 'Verification code expired'}), 400
        
    if pending['code'] != code:
        return jsonify({'message': 'Invalid verification code'}), 401
        
    action = pending['action']
    
    if action == 'register':
        new_user = User(email=email, password_hash=pending['password_hash'], skip_2fa=skip_2fa)
        db.session.add(new_user)
        db.session.commit()
        user = new_user
    else:
        user = User.query.filter_by(email=email).first()
        user.skip_2fa = skip_2fa
        db.session.commit()
        
    del pending_verifications[email]
    
    access_token = create_access_token(identity=str(user.id))
    return jsonify({'status': 'success', 'token': access_token, 'username': user.email.split('@')[0]}), 200

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

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=user_id).first()
    
    if not task:
        return jsonify({'message': 'Task not found'}), 404
        
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
