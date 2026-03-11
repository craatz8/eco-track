from flask import Flask, flash, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_conn

app = Flask(__name__)
app.secret_key = "carbon-secret-key" # Secret key for sessions

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        # check_password_hash is a security best practice!
        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session['user_name'] = user['name']
            return redirect(url_for('index'))
        
        return "Invalid email or password", 401
        
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/')
def index():
    # If 'user_id' isn't in the session, kick them out to the login page
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    return render_template('index.html', name=session.get('user_name'))

@app.route('/api/test-db')
def test_db():
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM activity_factors")
        data = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({"status": "Success", "data": data})
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)})
    
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        
        # 1. Check if email already exists
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        existing_user = cur.fetchone()
        
        if existing_user:
            cur.close()
            conn.close()
            return "Email already registered. Try logging in!", 400

        # 2. Hash the password for security
        hashed_pw = generate_password_hash(password)
        
        # 3. Insert the new user
        try:
            cur.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
                (name, email, hashed_pw)
            )
            conn.commit()
            cur.close()
            conn.close()
            # Redirect to login after successful registration
            return redirect(url_for('login'))
        except Exception as e:
            return f"Database error: {str(e)}", 500
            
    return render_template('register.html')

@app.route('/api/add-log', methods=['POST'])
def add_log():
    # 1. Security check first
    if 'user_id' not in session:
        return jsonify({"status": "Error", "message": "Unauthorized"}), 401
    
    # 2. Get the data
    data = request.get_json()
    if not data:
        return jsonify({"status": "Error", "message": "No data provided"}), 400

    # 3. Try to save to database
    try:
        user_id = session['user_id']
        # Converting to ensure they match the database types (int and float)
        activity_id = int(data.get('activity_id'))
        amount = float(data.get('amount'))

        conn = get_conn()
        cur = conn.cursor()
        
        cur.execute(
            "INSERT INTO user_logs (user_id, activity_id, amount) VALUES (%s, %s, %s)",
            (user_id, activity_id, amount)
        )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"status": "Success", "message": "Activity logged successfully!"})

    except Exception as e:
        # This will now correctly print to your terminal if the table is missing or data is wrong
        print(f"DEBUG ERROR: {e}")
        return jsonify({"status": "Error", "message": str(e)}), 400
    
@app.route('/api/user-stats')
def user_stats():
    if 'user_id' not in session:
        return jsonify({"status": "Error", "message": "Unauthorized"}), 401
    
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        # Use COALESCE to ensure we return 0 instead of None/Null
        query = """
            SELECT 
                COALESCE(SUM(ul.amount * af.co2_per_unit), 0) AS total_co2,
                COUNT(ul.id) AS total_entries
            FROM user_logs ul
            JOIN activity_factors af ON ul.activity_id = af.id
            WHERE ul.user_id = %s
        """
        cur.execute(query, (session['user_id'],))
        stats = cur.fetchone()
        cur.close()
        conn.close()
        return jsonify({"status": "Success", "stats": stats})
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)})
    
@app.route('/api/user-logs')
def get_user_logs():
    if 'user_id' not in session:
        return jsonify({"status": "Error", "message": "Unauthorized"}), 401
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        query = """
            SELECT ul.id, af.activity_name, ul.amount, 
                   (ul.amount * af.co2_per_unit) as total_co2, 
                   DATE_FORMAT(ul.log_date, '%b %d, %Y') as date
            FROM user_logs ul
            JOIN activity_factors af ON ul.activity_id = af.id
            WHERE ul.user_id = %s
            ORDER BY ul.log_date DESC
        """
        cur.execute(query, (session['user_id'],))
        logs = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({"status": "Success", "logs": logs})
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)})

@app.route('/api/delete-log/<int:log_id>', methods=['DELETE'])
def delete_log(log_id):
    if 'user_id' not in session:
        return jsonify({"status": "Error", "message": "Unauthorized"}), 401
    try:
        conn = get_conn()
        cur = conn.cursor()
        # Ensure the user actually owns this log before deleting!
        cur.execute("DELETE FROM user_logs WHERE id = %s AND user_id = %s", (log_id, session['user_id']))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "Success"})
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)})

@app.route('/api/update-log/<int:log_id>', methods=['PUT'])
def update_log(log_id):
    if 'user_id' not in session:
        return jsonify({"status": "Error"}), 401
    data = request.json
    new_amount = data.get('amount')
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("UPDATE user_logs SET amount = %s WHERE id = %s AND user_id = %s", 
                   (new_amount, log_id, session['user_id']))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "Success"})
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 400
    
@app.route('/guide')
def guide():
    return render_template('guide.html')

@app.route('/api/reset-logs', methods=['DELETE'])
def reset_logs():
    if 'user_id' not in session:
        return jsonify({"status": "Error"}), 401
    try:
        conn = get_conn()
        cur = conn.cursor()
        # ONLY delete logs belonging to the logged-in user
        cur.execute("DELETE FROM user_logs WHERE user_id = %s", (session['user_id'],))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "Success", "message": "Your logs have been reset."})
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=8000)