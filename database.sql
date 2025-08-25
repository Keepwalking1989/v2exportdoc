-- Main table for Exporter companies
CREATE TABLE IF NOT EXISTS `companies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `companyName` VARCHAR(255) NOT NULL,
  `contactPerson` VARCHAR(255) NOT NULL,
  `address` TEXT NOT NULL,
  `phoneNumber` VARCHAR(50) NOT NULL,
  `iecNumber` VARCHAR(100) NOT NULL,
  `gstNumber` VARCHAR(15) NOT NULL,
  `isDeleted` BOOLEAN DEFAULT FALSE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Main table for Client companies
CREATE TABLE IF NOT EXISTS `clients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `companyName` VARCHAR(255) NOT NULL,
  `person` VARCHAR(255) NOT NULL,
  `contactNumber` VARCHAR(50) NOT NULL,
  `address` TEXT NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `country` VARCHAR(100) NOT NULL,
  `pinCode` VARCHAR(20) NOT NULL,
  `isDeleted` BOOLEAN DEFAULT FALSE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Main table for Manufacturer companies
CREATE TABLE IF NOT EXISTS `manufacturers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `companyName` VARCHAR(255) NOT NULL,
  `contactPerson` VARCHAR(255) NOT NULL,
  `address` TEXT NOT NULL,
  `gstNumber` VARCHAR(15) NOT NULL,
  `stuffingPermissionNumber` VARCHAR(100) NOT NULL,
  `stuffingPermissionDate` DATE NOT NULL,
  `pinCode` VARCHAR(10) NOT NULL,
  `isDeleted` BOOLEAN DEFAULT FALSE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Main table for Transporter companies
CREATE TABLE IF NOT EXISTS `transporters` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `companyName` VARCHAR(255) NOT NULL,
  `gstNumber` VARCHAR(15) NOT NULL,
  `contactPerson` VARCHAR(255) NOT NULL,
  `contactNumber` VARCHAR(50) NOT NULL,
  `isDeleted` BOOLEAN DEFAULT FALSE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Main table for general Supplier companies
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `companyName` VARCHAR(255) NOT NULL,
  `gstNumber` VARCHAR(15) NOT NULL,
  `contactPerson` VARCHAR(255) NOT NULL,
  `contactNumber` VARCHAR(50) NOT NULL,
  `isDeleted` BOOLEAN DEFAULT FALSE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Main table for Pallet Supplier companies
CREATE TABLE IF NOT EXISTS `pallets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `companyName` VARCHAR(255) NOT NULL,
  `gstNumber` VARCHAR(15) NOT NULL,
  `contactPerson` VARCHAR(255) NOT NULL,
  `contactNumber` VARCHAR(50) NOT NULL,
  `isDeleted` BOOLEAN DEFAULT FALSE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Main table for Banks
CREATE TABLE IF NOT EXISTS `banks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bankName` VARCHAR(255) NOT NULL,
  `bankAddress` TEXT NOT NULL,
  `accountNumber` VARCHAR(100) NOT NULL,
  `swiftCode` VARCHAR(20) NOT NULL,
  `ifscCode` VARCHAR(20) NOT NULL,
  `isDeleted` BOOLEAN DEFAULT FALSE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Main table for Product Sizes
CREATE TABLE IF NOT EXISTS `sizes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `size` VARCHAR(100) NOT NULL,
  `sqmPerBox` DECIMAL(10, 4) NOT NULL,
  `boxWeight` DECIMAL(10, 2) NOT NULL,
  `purchasePrice` DECIMAL(10, 2) NOT NULL,
  `salesPrice` DECIMAL(10, 2) NOT NULL,
  `hsnCode` VARCHAR(20) NOT NULL,
  `palletDetails` TEXT NOT NULL,
  `isDeleted` BOOLEAN DEFAULT FALSE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Main table for Products
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sizeId` INT NOT NULL,
  `designName` VARCHAR(255) NOT NULL,
  `salesPrice` DECIMAL(10, 2),
  `boxWeight` DECIMAL(10, 2),
  `imageUrl` VARCHAR(255) NULL,
  `isDeleted` BOOLEAN DEFAULT FALSE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`sizeId`) REFERENCES `sizes`(`id`)
);

-- Main table for Performa Invoices
CREATE TABLE IF NOT EXISTS `performa_invoices` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `exporterId` INT NOT NULL,
    `invoiceNumber` VARCHAR(100) NOT NULL,
    `invoiceDate` DATETIME NOT NULL,
    `clientId` INT NOT NULL,
    `selectedBankId` INT,
    `finalDestination` VARCHAR(255) NOT NULL,
    `currencyType` ENUM('INR', 'USD', 'Euro') NOT NULL,
    `totalGrossWeight` VARCHAR(100) NOT NULL,
    `freight` DECIMAL(12, 2) DEFAULT 0,
    `discount` DECIMAL(12, 2) DEFAULT 0,
    `notifyPartyLine1` VARCHAR(255),
    `notifyPartyLine2` VARCHAR(255),
    `termsAndConditions` TEXT,
    `note` TEXT,
    `subTotal` DECIMAL(15, 2),
    `grandTotal` DECIMAL(15, 2),
    `items_json` JSON,
    `containers_json` JSON,
    `isDeleted` BOOLEAN DEFAULT FALSE,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`exporterId`) REFERENCES `companies`(`id`),
    FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`),
    FOREIGN KEY (`selectedBankId`) REFERENCES `banks`(`id`)
);


-- Main table for Purchase Orders
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sourcePiId` INT NOT NULL,
  `exporterId` INT NOT NULL,
  `manufacturerId` INT NOT NULL,
  `poNumber` VARCHAR(100) NOT NULL,
  `poDate` DATETIME NOT NULL,
  `sizeId` INT NOT NULL,
  `numberOfContainers` INT NOT NULL,
  `items_json` JSON,
  `termsAndConditions` TEXT,
  `isDeleted` BOOLEAN DEFAULT FALSE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`sourcePiId`) REFERENCES `performa_invoices`(`id`),
  FOREIGN KEY (`exporterId`) REFERENCES `companies`(`id`),
  FOREIGN KEY (`manufacturerId`) REFERENCES `manufacturers`(`id`),
  FOREIGN KEY (`sizeId`) REFERENCES `sizes`(`id`)
);

-- Main table for Export Documents
CREATE TABLE IF NOT EXISTS `export_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `exporterId` INT NOT NULL,
  `purchaseOrderId` INT,
  `exportInvoiceNumber` VARCHAR(100) NOT NULL,
  `exportInvoiceDate` DATETIME NOT NULL,
  `manufacturerDetails_json` JSON,
  `countryOfFinalDestination` VARCHAR(255),
  `vesselFlightNo` VARCHAR(100),
  `portOfLoading` VARCHAR(100),
  `portOfDischarge` VARCHAR(100),
  `finalDestination` VARCHAR(255),
  `termsOfDeliveryAndPayment` TEXT,
  `conversationRate` DECIMAL(10, 4),
  `exchangeNotification` VARCHAR(255),
  `exchangeDate` DATETIME,
  `transporterId` INT,
  `freight` DECIMAL(12, 2),
  `gst` VARCHAR(10),
  `discount` DECIMAL(12, 2),
  `containerItems_json` JSON,
  `ewayBillNumber` VARCHAR(100),
  `ewayBillDate` DATE,
  `ewayBillDocument` TEXT,
  `shippingBillNumber` VARCHAR(100),
  `shippingBillDate` DATE,
  `shippingBillDocument` TEXT,
  `blNumber` VARCHAR(100),
  `blDate` DATE,
  `blDocument` TEXT,
  `brcDocument` TEXT,
  `isDeleted` BOOLEAN DEFAULT FALSE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`exporterId`) REFERENCES `companies`(`id`),
  FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`),
  FOREIGN KEY (`transporterId`) REFERENCES `transporters`(`id`)
);

-- Main table for Manufacturer Bills
CREATE TABLE IF NOT EXISTS `manu_bills` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `exportDocumentId` INT NOT NULL,
    `manufacturerId` INT NOT NULL,
    `invoiceNumber` VARCHAR(100) NOT NULL,
    `invoiceDate` DATETIME NOT NULL,
    `ackNo` VARCHAR(100),
    `ackDate` DATETIME,
    `items_json` JSON,
    `remarks` TEXT,
    `subTotal` DECIMAL(15, 2),
    `discountAmount` DECIMAL(15, 2) DEFAULT 0,
    `insuranceAmount` DECIMAL(15, 2) DEFAULT 0,
    `freightAmount` DECIMAL(15, 2) DEFAULT 0,
    `finalSubTotal` DECIMAL(15, 2),
    `centralTaxRate` DECIMAL(5, 2),
    `centralTaxAmount` DECIMAL(15, 2),
    `stateTaxRate` DECIMAL(5, 2),
    `stateTaxAmount` DECIMAL(15, 2),
    `roundOff` DECIMAL(10, 2) DEFAULT 0,
    `grandTotal` DECIMAL(15, 2),
    `billDocumentUri` VARCHAR(255),
    `ewayBillDocumentUri` VARCHAR(255),
    `isDeleted` BOOLEAN DEFAULT FALSE,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`exportDocumentId`) REFERENCES `export_documents`(`id`),
    FOREIGN KEY (`manufacturerId`) REFERENCES `manufacturers`(`id`)
);

-- Main table for Transporter Bills
CREATE TABLE IF NOT EXISTS `trans_bills` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `exportDocumentId` INT NOT NULL,
    `transporterId` INT NOT NULL,
    `invoiceNumber` VARCHAR(100) NOT NULL,
    `invoiceDate` DATETIME NOT NULL,
    `shippingLine` VARCHAR(255),
    `portOfLoading` VARCHAR(255),
    `portOfDischarge` VARCHAR(255),
    `items_json` JSON,
    `remarks` TEXT,
    `subTotal` DECIMAL(15, 2),
    `cgstRate` DECIMAL(5, 2),
    `cgstAmount` DECIMAL(15, 2),
    `sgstRate` DECIMAL(5, 2),
    `sgstAmount` DECIMAL(15, 2),
    `totalTax` DECIMAL(15, 2),
    `totalAfterTax` DECIMAL(15, 2),
    `roundOff` DECIMAL(10, 2) DEFAULT 0,
    `totalPayable` DECIMAL(15, 2),
    `billDocumentUri` VARCHAR(255),
    `lrDocumentUri` VARCHAR(255),
    `isDeleted` BOOLEAN DEFAULT FALSE,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`exportDocumentId`) REFERENCES `export_documents`(`id`),
    FOREIGN KEY (`transporterId`) REFERENCES `transporters`(`id`)
);

-- Main table for Supply Bills (for Suppliers and Pallets)
CREATE TABLE IF NOT EXISTS `supply_bills` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `exportDocumentId` INT NOT NULL,
    `supplierId` INT NOT NULL, -- Generic ID, can refer to suppliers or pallets table
    `invoiceNumber` VARCHAR(100) NOT NULL,
    `invoiceDate` DATETIME NOT NULL,
    `ackNo` VARCHAR(100),
    `ackDate` DATETIME,
    `items_json` JSON,
    `remarks` TEXT,
    `subTotal` DECIMAL(15, 2),
    `discountAmount` DECIMAL(15, 2) DEFAULT 0,
    `insuranceAmount` DECIMAL(15, 2) DEFAULT 0,
    `freightAmount` DECIMAL(15, 2) DEFAULT 0,
    `finalSubTotal` DECIMAL(15, 2),
    `centralTaxRate` DECIMAL(5, 2),
    `centralTaxAmount` DECIMAL(15, 2),
    `stateTaxRate` DECIMAL(5, 2),
    `stateTaxAmount` DECIMAL(15, 2),
    `roundOff` DECIMAL(10, 2) DEFAULT 0,
    `grandTotal` DECIMAL(15, 2),
    `billDocumentUri` VARCHAR(255),
    `ewayBillDocumentUri` VARCHAR(255),
    `isDeleted` BOOLEAN DEFAULT FALSE,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`exportDocumentId`) REFERENCES `export_documents`(`id`)
);

-- Main table for Financial Transactions
CREATE TABLE IF NOT EXISTS `transactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `date` DATETIME NOT NULL,
    `type` ENUM('credit', 'debit') NOT NULL,
    `partyType` ENUM('client', 'manufacturer', 'transporter', 'supplier', 'pallet', 'gst', 'duty_drawback', 'road_tp') NOT NULL,
    `partyId` VARCHAR(255) NOT NULL,
    `exportDocumentId` INT,
    `relatedInvoices_json` JSON,
    `currency` ENUM('USD', 'EUR', 'INR') NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `description` TEXT,
    `isDeleted` BOOLEAN DEFAULT FALSE,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
