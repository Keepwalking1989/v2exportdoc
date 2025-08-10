
-- Use this file to initialize your database schema

CREATE TABLE IF NOT EXISTS clients (
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

CREATE TABLE IF NOT EXISTS transporters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    companyName VARCHAR(255) NOT NULL,
    gstNumber VARCHAR(15) NOT NULL,
    contactPerson VARCHAR(255) NOT NULL,
    contactNumber VARCHAR(50) NOT NULL,
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    companyName VARCHAR(255) NOT NULL,
    gstNumber VARCHAR(15) NOT NULL,
    contactPerson VARCHAR(255) NOT NULL,
    contactNumber VARCHAR(50) NOT NULL,
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pallets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    companyName VARCHAR(255) NOT NULL,
    gstNumber VARCHAR(15) NOT NULL,
    contactPerson VARCHAR(255) NOT NULL,
    contactNumber VARCHAR(50) NOT NULL,
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    size VARCHAR(255) NOT NULL,
    sqmPerBox DECIMAL(10, 4) NOT NULL,
    boxWeight DECIMAL(10, 2) NOT NULL,
    purchasePrice DECIMAL(10, 2) NOT NULL,
    salesPrice DECIMAL(10, 2) NOT NULL,
    hsnCode VARCHAR(50) NOT NULL,
    palletDetails TEXT NOT NULL,
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sizeId INT NOT NULL,
    designName VARCHAR(255) NOT NULL,
    salesPrice DECIMAL(10, 2),
    boxWeight DECIMAL(10, 2),
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sizeId) REFERENCES sizes(id)
);

CREATE TABLE IF NOT EXISTS banks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bankName VARCHAR(255) NOT NULL,
    bankAddress TEXT NOT NULL,
    accountNumber VARCHAR(50) NOT NULL,
    swiftCode VARCHAR(20) NOT NULL,
    ifscCode VARCHAR(20) NOT NULL,
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    companyName VARCHAR(255) NOT NULL,
    contactPerson VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phoneNumber VARCHAR(50) NOT NULL,
    iecNumber VARCHAR(50) NOT NULL,
    gstNumber VARCHAR(15) NOT NULL,
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tables for Sales & Purchase Workflow
CREATE TABLE IF NOT EXISTS performa_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exporterId INT NOT NULL,
    invoiceNumber VARCHAR(255) NOT NULL UNIQUE,
    invoiceDate DATETIME NOT NULL,
    clientId INT NOT NULL,
    selectedBankId INT,
    finalDestination VARCHAR(255) NOT NULL,
    totalContainer INT NOT NULL,
    containerSize VARCHAR(50) NOT NULL,
    currencyType VARCHAR(10) NOT NULL,
    totalGrossWeight VARCHAR(255) NOT NULL,
    freight DECIMAL(12, 2) DEFAULT 0,
    discount DECIMAL(12, 2) DEFAULT 0,
    notifyPartyLine1 TEXT,
    notifyPartyLine2 TEXT,
    termsAndConditions TEXT,
    note TEXT,
    items_json JSON,
    subTotal DECIMAL(15, 2),
    grandTotal DECIMAL(15, 2),
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sourcePiId INT NOT NULL,
    exporterId INT NOT NULL,
    manufacturerId INT NOT NULL,
    poNumber VARCHAR(255) NOT NULL UNIQUE,
    poDate DATETIME NOT NULL,
    sizeId INT NOT NULL,
    numberOfContainers INT NOT NULL,
    items_json JSON,
    termsAndConditions TEXT,
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS export_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exporterId INT NOT NULL,
    clientId INT NOT NULL,
    purchaseOrderId INT,
    transporterId INT,
    exportInvoiceNumber VARCHAR(255) NOT NULL UNIQUE,
    exportInvoiceDate DATETIME NOT NULL,
    manufacturerDetails_json JSON,
    countryOfFinalDestination VARCHAR(255),
    vesselFlightNo VARCHAR(255),
    portOfLoading VARCHAR(255),
    portOfDischarge VARCHAR(255),
    finalDestination VARCHAR(255),
    termsOfDeliveryAndPayment TEXT,
    conversationRate DECIMAL(10, 4),
    exchangeNotification VARCHAR(255),
    exchangeDate DATETIME,
    freight DECIMAL(12, 2),
    gst VARCHAR(20),
    discount DECIMAL(12, 2),
    containerItems_json JSON,
    ewayBillNumber VARCHAR(255),
    ewayBillDate DATETIME,
    ewayBillDocument TEXT,
    shippingBillNumber VARCHAR(255),
    shippingBillDate DATETIME,
    shippingBillDocument TEXT,
    blNumber VARCHAR(255),
    blDate DATETIME,
    blDocument TEXT,
    brcDocument TEXT,
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manu_bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exportDocumentId INT NOT NULL,
    manufacturerId INT NOT NULL,
    invoiceNumber VARCHAR(255) NOT NULL,
    invoiceDate DATETIME NOT NULL,
    ackNo VARCHAR(255),
    ackDate DATETIME,
    items_json JSON,
    remarks TEXT,
    subTotal DECIMAL(15, 2) NOT NULL,
    discountAmount DECIMAL(15, 2),
    insuranceAmount DECIMAL(15, 2),
    freightAmount DECIMAL(15, 2),
    finalSubTotal DECIMAL(15, 2) NOT NULL,
    centralTaxRate DECIMAL(5, 2) NOT NULL,
    centralTaxAmount DECIMAL(15, 2) NOT NULL,
    stateTaxRate DECIMAL(5, 2) NOT NULL,
    stateTaxAmount DECIMAL(15, 2) NOT NULL,
    roundOff DECIMAL(10, 2),
    grandTotal DECIMAL(15, 2) NOT NULL,
    billDocumentUri TEXT,
    ewayBillDocumentUri TEXT,
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
