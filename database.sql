
-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS bizform_v2;

-- Use the newly created database
USE bizform_v2;

-- Create the clients table
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    companyName VARCHAR(255) NOT NULL,
    person VARCHAR(255) NOT NULL,
    contactNumber VARCHAR(255),
    address TEXT,
    city VARCHAR(255),
    country VARCHAR(255),
    pinCode VARCHAR(255),
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create the manufacturers table
CREATE TABLE IF NOT EXISTS manufacturers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    companyName VARCHAR(255) NOT NULL,
    contactPerson VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    gstNumber VARCHAR(15) NOT NULL,
    stuffingPermissionNumber VARCHAR(255) NOT NULL,
    stuffingPermissionDate DATE NOT NULL,
    pinCode VARCHAR(10) NOT NULL,
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create the transporters table
CREATE TABLE IF NOT EXISTS transporters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    companyName VARCHAR(255) NOT NULL,
    gstNumber VARCHAR(15) NOT NULL,
    contactPerson VARCHAR(255) NOT NULL,
    contactNumber VARCHAR(20) NOT NULL,
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create the suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    companyName VARCHAR(255) NOT NULL,
    gstNumber VARCHAR(15) NOT NULL,
    contactPerson VARCHAR(255) NOT NULL,
    contactNumber VARCHAR(20) NOT NULL,
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
