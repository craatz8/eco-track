from flask import Flask, flash, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_conn
from datetime import datetime, timedelta

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
        else:
            flash("Invalid email or password. Please try again.", "error")
            return render_template('login.html'), 401

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
            flash("Email already registered. Try logging in!", "error")
            return render_template('register.html'), 400

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
    
from datetime import datetime, timedelta

@app.route('/api/user-stats')
def user_stats():
    if 'user_id' not in session:
        return jsonify({"status": "Error", "message": "Unauthorized"}), 401
    
    # Get parameters for historical views (e.g. ?month=3&year=2026)
    month = request.args.get('month')
    year = request.args.get('year')
    
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        
        base_query = """
            SELECT 
                COALESCE(SUM(ul.amount * af.co2_per_unit), 0) AS total_co2,
                COUNT(ul.id) AS total_entries
            FROM user_logs ul
            JOIN activity_factors af ON ul.activity_id = af.id
            WHERE ul.user_id = %s
        """
        
        if month and year:
            # HISTORICAL VIEW: Filter by Month and Year
            query = base_query + " AND MONTH(ul.log_date) = %s AND YEAR(ul.log_date) = %s"
            cur.execute(query, (session['user_id'], month, year))
        else:
            # WEEKLY RESET LOGIC: Default to current week (starting Monday)
            now = datetime.now()
            start_of_week = now - timedelta(days=now.weekday())
            # We set the time to 00:00:00 of Monday
            monday_start = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
            
            query = base_query + " AND ul.log_date >= %s"
            cur.execute(query, (session['user_id'], monday_start))

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

@app.route('/profile')
def profile():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('profile.html', name=session.get('user_name'))

@app.route('/api/projections')
def get_projections():
    if 'user_id' not in session:
        return jsonify({"status": "Error"}), 401
    
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        
        # Get total for current month and how many days have passed
        now = datetime.now()
        day_of_month = now.day
        days_in_month = 30 # Simplified or use calendar.monthrange
        
        query = """
            SELECT COALESCE(SUM(ul.amount * af.co2_per_unit), 0) AS current_month_total
            FROM user_logs ul
            JOIN activity_factors af ON ul.activity_id = af.id
            WHERE ul.user_id = %s 
            AND MONTH(ul.log_date) = %s AND YEAR(ul.log_date) = %s
        """
        cur.execute(query, (session['user_id'], now.month, now.year))
        result = cur.fetchone()
        
        total_so_far = result['current_month_total']
        
        # Simple Linear Projection: (Total / Days Passed) * Total Days in Month
        projected_total = (total_so_far / day_of_month) * days_in_month
        
        cur.close()
        conn.close()
        
        return jsonify({
            "status": "Success",
            "current_total": total_so_far,
            "projected_total": round(projected_total, 2),
            "days_remaining": days_in_month - day_of_month
        })
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=8000)