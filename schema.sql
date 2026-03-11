USE eco_track_db;

-- Create the users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
);

-- Create the activity types table
CREATE TABLE activity_factors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_name VARCHAR(100),
  category VARCHAR(50), 
  co2_per_unit FLOAT, -- kg of CO2
  unit_label VARCHAR(20) -- e.g., 'miles', 'servings'
);

-- Insert some starter data
INSERT INTO activity_factors (activity_name, category, co2_per_unit, unit_label) VALUES 
('Gasoline Car Driving', 'Transport', 0.404, 'miles'),
('Electricity Usage', 'Home', 0.385, 'kWh'),
('Beef Meal', 'Food', 6.5, 'servings'),
('Flight (Short Haul)', 'Transport', 0.25, 'miles'),
('Flight (Long Haul)', 'Transport', 0.18, 'miles');

CREATE TABLE user_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    log_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- These "Foreign Keys" link your tables together professionally
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (activity_id) REFERENCES activity_factors(id)
);