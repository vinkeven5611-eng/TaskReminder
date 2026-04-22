import os
from cryptography.fernet import Fernet
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import json

# Scopes needed for Google Calendar
SCOPES = ['https://www.googleapis.com/auth/calendar.events']

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
    return authorization_url

def exchange_code(code: str, redirect_uri: str):
    """Exchanges auth code for credentials."""
    flow = Flow.from_client_config(get_client_config(), scopes=SCOPES)
    flow.redirect_uri = redirect_uri
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

def sync_task_to_google(refresh_token: str, task, action='create'):
    """Pushes a task to Google Calendar."""
    if not refresh_token: return None
    
    try:
        service = get_calendar_service(refresh_token)
        
        # Prepare event payload
        event_body = {
            'summary': task.content,
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
