
-- SQL Query to set up the 'bizform_v2' database and 'clients' table.
-- Copy and paste this into the SQL tab of phpMyAdmin and click "Go".

-- Drop the database if it already exists to start fresh (optional)
DROP DATABASE IF EXISTS bizform_v2;

-- Create the new database
CREATE DATABASE bizform_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Select the database to use
USE bizform_v2;

-- Drop the table if it already exists (for easy re-running of the script)
DROP TABLE IF EXISTS clients;

-- Create the 'clients' table
CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    companyName VARCHAR(255) NOT NULL,
    person VARCHAR(255) NOT NULL,
    contactNumber VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    pinCode VARCHAR(20) NOT NULL,
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Optional: Insert some sample data to test with
INSERT INTO `clients` (`companyName`, `person`, `contactNumber`, `address`, `city`, `country`, `pinCode`) VALUES
('Test Client Inc.', 'John Doe', '+1-555-123-4567', '123 Business Rd, Suite 100', 'New York', 'USA', '10001'),
('Global Exports Ltd.', 'Jane Smith', '+44 20 7946 0958', '456 Commerce Ave', 'London', 'United Kingdom', 'SW1A 0AA');

