import mysql.connector

# This dictionary holds your connection details
DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 8889,          # MAMP default port.
    "user": "root",
    "password": "root",    # Change this to your password if it's not 'root'
    "database": "eco_track_db",
    "charset": "utf8mb4",
}

def get_conn():
    """Return a new MySQL connection."""
    return mysql.connector.connect(**DB_CONFIG)