import json
import os
from server import app, db
from database import Book, User

def migrate():
    with app.app_context():
        db.create_all()
        
        # Check if books already exist
        if Book.query.first():
            print("Books already exist in DB.")
        else:
            # Load books.json
            json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'books.json')
            if os.path.exists(json_path):
                with open(json_path, 'r') as f:
                    books_data = json.load(f)

                for b in books_data:
                    book = Book(
                        title=b['title'],
                        author=b['author'],
                        category=b['category'],
                        price=b['price'],
                        cover=b['cover'],
                        file=b['file'],
                        description=b.get('description', '')
                    )
                    db.session.add(book)
                print(f"Migrated {len(books_data)} books.")
            else:
                print("books.json not found.")
        
        # Create Admin User
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                email='admin@example.com',
                is_admin=True,
                bio='System Administrator'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            print("Created admin user.")

        db.session.commit()
        print("Migration completed.")

if __name__ == '__main__':
    migrate()
