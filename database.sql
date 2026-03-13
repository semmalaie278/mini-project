-- Blood Bank Management System Database Schema
-- Run this script to setup the database

CREATE DATABASE IF NOT EXISTS blood_bank;
USE blood_bank;

-- Donors Table
CREATE TABLE IF NOT EXISTS donors (
    donor_id INT PRIMARY KEY AUTO_INCREMENT,
    donor_name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    address TEXT,
    last_donation_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blood Stock Table
CREATE TABLE IF NOT EXISTS blood_stock (
    stock_id INT PRIMARY KEY AUTO_INCREMENT,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL UNIQUE,
    units_available INT DEFAULT 0
);

-- Donations Table
CREATE TABLE IF NOT EXISTS donations (
    donation_id INT PRIMARY KEY AUTO_INCREMENT,
    donor_id INT NOT NULL,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    donation_date DATE NOT NULL,
    units_donated INT DEFAULT 1,
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE
);

-- Initialize Blood Stock with 0 units for all blood groups
INSERT INTO blood_stock (blood_group, units_available) VALUES
('A+', 0), ('A-', 0), ('B+', 0), ('B-', 0),
('AB+', 0), ('AB-', 0), ('O+', 0), ('O-', 0)
ON DUPLICATE KEY UPDATE blood_group = blood_group;

-- Sample Donor Data
INSERT INTO donors (donor_name, age, gender, blood_group, phone_number, address, last_donation_date) VALUES
('Arjun Kumar', 28, 'Male', 'O+', '9876543210', '12, MG Road, Bangalore', '2026-01-15'),
('Priya Sharma', 24, 'Female', 'A+', '9876543211', '45, Park Street, Hyderabad', '2026-02-10'),
('Rahul Mehta', 35, 'Male', 'B+', '9876543212', '78, Civil Lines, Delhi', '2026-01-28'),
('Anita Reddy', 30, 'Female', 'AB+', '9876543213', '22, Jubilee Hills, Hyderabad', '2026-03-01'),
('Vikram Singh', 27, 'Male', 'O-', '9876543214', '5, Sector 18, Noida', '2026-02-20');

-- Sample Donation Records
INSERT INTO donations (donor_id, blood_group, donation_date, units_donated) VALUES
(1, 'O+', '2026-01-15', 1),
(2, 'A+', '2026-02-10', 2),
(3, 'B+', '2026-01-28', 2),
(4, 'AB+', '2026-03-01', 1),
(5, 'O-', '2026-02-20', 1);

-- Update stock based on donations
UPDATE blood_stock SET units_available = 5 WHERE blood_group = 'O+';
UPDATE blood_stock SET units_available = 4 WHERE blood_group = 'A+';
UPDATE blood_stock SET units_available = 6 WHERE blood_group = 'B+';
UPDATE blood_stock SET units_available = 2 WHERE blood_group = 'AB+';
UPDATE blood_stock SET units_available = 3 WHERE blood_group = 'O-';
UPDATE blood_stock SET units_available = 1 WHERE blood_group = 'A-';
UPDATE blood_stock SET units_available = 2 WHERE blood_group = 'B-';
UPDATE blood_stock SET units_available = 1 WHERE blood_group = 'AB-';
