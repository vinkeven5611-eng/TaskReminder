import calendar_sync
from models import User, db
from app import app

def fix():
    with app.app_context():
        user = User.query.filter_by(email='vinkeven5611@gmail.com').first()
        if not user:
            print("User not found")
            return
        print(f"User ID: {user.id}")
        if not user.google_refresh_token_encrypted:
            print("No refresh token")
            return
        
        token = calendar_sync.decrypt_token(user.google_refresh_token_encrypted)
        email = calendar_sync.get_user_email(token)
        print(f"Fetched Email: {email}")
        
        if email:
            user.google_email = email
            db.session.commit()
            print("Successfully saved to database")
        else:
            print("Failed to fetch email from Google")

if __name__ == "__main__":
    fix()
