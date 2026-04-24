import os
from datetime import datetime, timezone, timedelta
from cryptography.fernet import Fernet
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import json

# Scopes needed for Google Calendar and User Info
SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid'
]

def get_fernet():
    key = os.getenv('ENCRYPTION_KEY')
    if not key:
        raise ValueError("ENCRYPTION_KEY is missing from environment variables")
    return Fernet(key.encode())

def encrypt_token(token: str) -> str:
    if not token: return None
    f = get_fernet()
    return f.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    if not encrypted_token: return None
    f = get_fernet()
    return f.decrypt(encrypted_token.encode()).decode()

def get_client_config():
    """Generates the client config dictionary from env variables."""
    return {
        "web": {
            "client_id": os.getenv("GOOGLE_CLIENT_ID", "dummy_id"),
            "project_id": "taskreminder",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", "dummy_secret")
        }
    }

OAUTH_VERIFIERS = {}

def get_google_auth_url(redirect_uri: str, user_id: str):
    """Generates the Google OAuth authorization URL."""
    flow = Flow.from_client_config(get_client_config(), scopes=SCOPES)
    flow.redirect_uri = redirect_uri
    
    # Generate URL and use user_id as state to map it back
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent', # Force consent to ensure we get a refresh token
        state=str(user_id)
    )
    if hasattr(flow, 'code_verifier'):
        OAUTH_VERIFIERS[str(user_id)] = flow.code_verifier
    return authorization_url

def exchange_code(code: str, redirect_uri: str, user_id: str = None):
    """Exchanges auth code for credentials."""
    flow = Flow.from_client_config(get_client_config(), scopes=SCOPES)
    flow.redirect_uri = redirect_uri
    if user_id and str(user_id) in OAUTH_VERIFIERS:
        flow.code_verifier = OAUTH_VERIFIERS.pop(str(user_id))
        
    flow.fetch_token(code=code)
    credentials = flow.credentials
    return {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }

def get_calendar_service(refresh_token: str):
    """Builds the Google Calendar API service using the refresh token."""
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=SCOPES
    )
    return build('calendar', 'v3', credentials=creds)

def get_user_email(refresh_token: str):
    """Fetches the primary calendar ID which is usually the user email."""
    try:
        service = get_calendar_service(refresh_token)
        calendar = service.calendars().get(calendarId='primary').execute()
        email = calendar.get('id') # Primary calendar ID is the user's email
        print(f"DEBUG: Fetched email {email}")
        return email
    except Exception as e:
        print(f"DEBUG Error fetching email: {e}")
        return None

def sync_task_to_google(refresh_token: str, task, action='create'):
    """Pushes a task to Google Calendar."""
    if not refresh_token: return None
    
    try:
        service = get_calendar_service(refresh_token)
        
        # Prepare event payload
        summary = task.content
        if task.is_completed:
            summary = f"✅[已完成] {summary}"
            
        event_body = {
            'summary': summary,
            'description': 'Created via TaskReminder',
        }
        
        # Determine time
        if task.due_date:
            event_body['start'] = {'dateTime': task.due_date.isoformat() + 'Z'}
            # Default to 1 hour event for deadlines
            from datetime import timedelta
            end_time = task.due_date + timedelta(hours=1)
            event_body['end'] = {'dateTime': end_time.isoformat() + 'Z'}
        else:
            # If no due date, just put it as an all-day event for today
            from datetime import datetime
            today = datetime.utcnow().strftime("%Y-%m-%d")
            event_body['start'] = {'date': today}
            event_body['end'] = {'date': today}
            
        if action == 'create':
            event = service.events().insert(calendarId='primary', body=event_body).execute()
            return event.get('id')
            
        elif action == 'update' and task.google_event_id:
            service.events().patch(calendarId='primary', eventId=task.google_event_id, body=event_body).execute()
            return task.google_event_id
            
        elif action == 'delete' and task.google_event_id:
            service.events().delete(calendarId='primary', eventId=task.google_event_id).execute()
            return None
            
    except Exception as e:
        print(f"Error syncing to Google Calendar: {e}")
        return None

def pull_from_google(user):
    """Pulls updates from Google Calendar using syncToken."""
    if not user.is_calendar_enabled or not user.google_refresh_token_encrypted:
        return {'status': 'not_linked'}
        
    refresh_token = decrypt_token(user.google_refresh_token_encrypted)
    if not refresh_token: return {'status': 'error', 'message': 'No refresh token'}
    
    from models import db, Task
    from datetime import datetime
    
    try:
        service = get_calendar_service(refresh_token)
        sync_token = user.calendar_sync_token
        
        kwargs = {'calendarId': 'primary', 'maxResults': 100, 'showDeleted': True}
        if sync_token:
            kwargs['syncToken'] = sync_token
        else:
            # First sync, get events from today onwards
            kwargs['timeMin'] = datetime.utcnow().isoformat() + 'Z'
            
        try:
            response = service.events().list(**kwargs).execute()
        except Exception as e:
            if 'Sync token is no longer valid' in str(e) or '410' in str(e):
                kwargs.pop('syncToken', None)
                kwargs['timeMin'] = datetime.utcnow().isoformat() + 'Z'
                response = service.events().list(**kwargs).execute()
            else:
                raise e

        updated_count = 0
        deleted_count = 0
        
        for item in response.get('items', []):
            event_id = item.get('id')
            task = Task.query.filter_by(user_id=user.id, google_event_id=event_id).first()
            
            if item.get('status') == 'cancelled':
                if task:
                    db.session.delete(task)
                    deleted_count += 1
            else:
                if task:
                    # Update existing task
                    summary = item.get('summary', 'Untitled')
                    start = item.get('start', {})
                    due_date_str = start.get('dateTime') or start.get('date')
                    
                    task.content = summary
                    if due_date_str:
                        try:
                            # Handle both '2024-04-25T18:30:00+08:00' and '2024-04-25'
                            if 'T' in due_date_str:
                                dt = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
                                task.due_date = dt.astimezone(timezone.utc).replace(tzinfo=None)
                            else:
                                # All-day event: 2024-04-25
                                task.due_date = datetime.fromisoformat(due_date_str)
                        except ValueError:
                            pass
                    updated_count += 1
                    
        user.calendar_sync_token = response.get('nextSyncToken')
        db.session.commit()
        
        return {
            'status': 'success',
            'updated': updated_count,
            'deleted': deleted_count,
            'sync_time': datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Error pulling from Google Calendar: {e}")
        return {'status': 'error', 'message': str(e)}
