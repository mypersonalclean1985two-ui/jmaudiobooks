import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

try:
    from backend.database import db, Book, User
except ImportError:
    from database import db, Book, User

app = Flask(__name__)
CORS(app)

# Database config
basedir = os.path.abspath(os.path.dirname(__file__))
data_dir = os.path.join(os.path.dirname(basedir), 'data')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(data_dir, 'library.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'dev-secret-key'

db.init_app(app)

@app.route('/api/books', methods=['GET'])
def get_books():
    books = Book.query.all()
    return jsonify([book.to_dict() for book in books])

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        return jsonify({"success": True, "user": user.to_dict()})
    
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

# Serve covers and files
@app.route('/data/covers/<path:filename>')
def serve_cover(filename):
    return send_from_directory(os.path.join(data_dir, 'covers'), filename)

@app.route('/data/files/<path:filename>')
def serve_file(filename):
    return send_from_directory(os.path.join(data_dir, 'files'), filename)

# Serve Web App
@app.route('/webapp/<path:filename>')
def serve_webapp(filename):
    webapp_dir = os.path.join(os.path.dirname(basedir), 'webapp')
    return send_from_directory(webapp_dir, filename)

@app.route('/')
def index():
    return "Server is running. Go to <a href='/webapp/index.html'>/webapp/index.html</a>"

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
