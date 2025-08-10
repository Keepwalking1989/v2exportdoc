
CREATE TABLE `banks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bankName` varchar(255) NOT NULL,
  `bankAddress` text NOT NULL,
  `accountNumber` varchar(50) NOT NULL,
  `swiftCode` varchar(20) NOT NULL,
  `ifscCode` varchar(20) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `clients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyName` varchar(255) NOT NULL,
  `person` varchar(255) NOT NULL,
  `contactNumber` varchar(50) NOT NULL,
  `address` text NOT NULL,
  `city` varchar(100) NOT NULL,
  `country` varchar(100) NOT NULL,
  `pinCode` varchar(20) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `companies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyName` varchar(255) NOT NULL,
  `contactPerson` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `phoneNumber` varchar(50) NOT NULL,
  `iecNumber` varchar(50) NOT NULL,
  `gstNumber` varchar(50) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `export_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `exporterId` int(11) NOT NULL,
  `clientId` int(11) NOT NULL,
  `performaInvoiceId` int(11) DEFAULT NULL,
  `purchaseOrderId` int(11) DEFAULT NULL,
  `transporterId` int(11) NOT NULL,
  `exportInvoiceNumber` varchar(100) NOT NULL,
  `exportInvoiceDate` datetime NOT NULL,
  `manufacturerDetails_json` json DEFAULT NULL,
  `countryOfFinalDestination` varchar(100) NOT NULL,
  `vesselFlightNo` varchar(100) DEFAULT NULL,
  `portOfLoading` varchar(100) NOT NULL,
  `portOfDischarge` varchar(100) NOT NULL,
  `finalDestination` varchar(100) NOT NULL,
  `termsOfDeliveryAndPayment` text NOT NULL,
  `conversationRate` decimal(10,2) NOT NULL,
  `exchangeNotification` varchar(100) NOT NULL,
  `exchangeDate` datetime NOT NULL,
  `freight` decimal(12,2) NOT NULL,
  `gst` varchar(10) NOT NULL,
  `discount` decimal(12,2) DEFAULT 0.00,
  `containerItems_json` json DEFAULT NULL,
  `ewayBillNumber` varchar(100) DEFAULT NULL,
  `ewayBillDate` datetime DEFAULT NULL,
  `ewayBillDocument` longtext DEFAULT NULL,
  `shippingBillNumber` varchar(100) DEFAULT NULL,
  `shippingBillDate` datetime DEFAULT NULL,
  `shippingBillDocument` longtext DEFAULT NULL,
  `blNumber` varchar(100) DEFAULT NULL,
  `blDate` datetime DEFAULT NULL,
  `blDocument` longtext DEFAULT NULL,
  `brcDocument` longtext DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `manu_bills` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `exportDocumentId` int(11) NOT NULL,
  `manufacturerId` int(11) NOT NULL,
  `invoiceNumber` varchar(100) NOT NULL,
  `invoiceDate` datetime NOT NULL,
  `ackNo` varchar(100) DEFAULT NULL,
  `ackDate` datetime DEFAULT NULL,
  `items_json` json NOT NULL,
  `remarks` text DEFAULT NULL,
  `subTotal` decimal(12,2) NOT NULL,
  `discountAmount` decimal(12,2) DEFAULT 0.00,
  `insuranceAmount` decimal(12,2) DEFAULT 0.00,
  `freightAmount` decimal(12,2) DEFAULT 0.00,
  `finalSubTotal` decimal(12,2) NOT NULL,
  `centralTaxRate` decimal(5,2) NOT NULL,
  `centralTaxAmount` decimal(12,2) NOT NULL,
  `stateTaxRate` decimal(5,2) NOT NULL,
  `stateTaxAmount` decimal(12,2) NOT NULL,
  `roundOff` decimal(10,2) DEFAULT 0.00,
  `grandTotal` decimal(12,2) NOT NULL,
  `billDocumentUri` longtext DEFAULT NULL,
  `ewayBillDocumentUri` longtext DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `manufacturers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyName` varchar(255) NOT NULL,
  `contactPerson` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `gstNumber` varchar(50) NOT NULL,
  `stuffingPermissionNumber` varchar(100) NOT NULL,
  `stuffingPermissionDate` date NOT NULL,
  `pinCode` varchar(20) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `pallets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyName` varchar(255) NOT NULL,
  `gstNumber` varchar(50) NOT NULL,
  `contactPerson` varchar(255) NOT NULL,
  `contactNumber` varchar(50) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `performa_invoices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `exporterId` int(11) NOT NULL,
  `invoiceNumber` varchar(100) NOT NULL,
  `invoiceDate` datetime NOT NULL,
  `clientId` int(11) NOT NULL,
  `selectedBankId` int(11) DEFAULT NULL,
  `finalDestination` varchar(100) NOT NULL,
  `totalContainer` int(11) NOT NULL,
  `containerSize` enum('20 ft','40 ft') NOT NULL,
  `currencyType` enum('INR','USD','Euro') NOT NULL,
  `totalGrossWeight` varchar(50) NOT NULL,
  `freight` decimal(12,2) NOT NULL,
  `discount` decimal(12,2) NOT NULL,
  `notifyPartyLine1` varchar(255) DEFAULT NULL,
  `notifyPartyLine2` varchar(255) DEFAULT NULL,
  `termsAndConditions` text NOT NULL,
  `note` text DEFAULT NULL,
  `items_json` json NOT NULL,
  `subTotal` decimal(12,2) DEFAULT NULL,
  `grandTotal` decimal(12,2) DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sizeId` int(11) NOT NULL,
  `designName` varchar(255) NOT NULL,
  `salesPrice` decimal(10,2) DEFAULT NULL,
  `boxWeight` decimal(10,2) DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `purchase_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sourcePiId` int(11) NOT NULL,
  `exporterId` int(11) NOT NULL,
  `manufacturerId` int(11) NOT NULL,
  `poNumber` varchar(100) NOT NULL,
  `poDate` datetime NOT NULL,
  `sizeId` int(11) NOT NULL,
  `numberOfContainers` int(11) NOT NULL,
  `items_json` json NOT NULL,
  `termsAndConditions` text DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `sizes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `size` varchar(50) NOT NULL,
  `sqmPerBox` decimal(10,2) NOT NULL,
  `boxWeight` decimal(10,2) NOT NULL,
  `purchasePrice` decimal(10,2) NOT NULL,
  `salesPrice` decimal(10,2) NOT NULL,
  `hsnCode` varchar(50) NOT NULL,
  `palletDetails` text NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyName` varchar(255) NOT NULL,
  `gstNumber` varchar(50) NOT NULL,
  `contactPerson` varchar(255) NOT NULL,
  `contactNumber` varchar(50) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `supply_bills` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `exportDocumentId` int(11) NOT NULL,
  `supplierId` int(11) NOT NULL,
  `invoiceNumber` varchar(100) NOT NULL,
  `invoiceDate` datetime NOT NULL,
  `ackNo` varchar(100) DEFAULT NULL,
  `ackDate` datetime DEFAULT NULL,
  `items_json` json NOT NULL,
  `remarks` text DEFAULT NULL,
  `subTotal` decimal(12,2) NOT NULL,
  `discountAmount` decimal(12,2) DEFAULT 0.00,
  `insuranceAmount` decimal(12,2) DEFAULT 0.00,
  `freightAmount` decimal(12,2) DEFAULT 0.00,
  `finalSubTotal` decimal(12,2) NOT NULL,
  `centralTaxRate` decimal(5,2) NOT NULL,
  `centralTaxAmount` decimal(12,2) NOT NULL,
  `stateTaxRate` decimal(5,2) NOT NULL,
  `stateTaxAmount` decimal(12,2) NOT NULL,
  `roundOff` decimal(10,2) DEFAULT 0.00,
  `grandTotal` decimal(12,2) NOT NULL,
  `billDocumentUri` longtext DEFAULT NULL,
  `ewayBillDocumentUri` longtext DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `trans_bills` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `exportDocumentId` int(11) NOT NULL,
  `transporterId` int(11) NOT NULL,
  `invoiceNumber` varchar(100) NOT NULL,
  `invoiceDate` datetime NOT NULL,
  `shippingLine` varchar(255) DEFAULT NULL,
  `portOfLoading` varchar(100) DEFAULT NULL,
  `portOfDischarge` varchar(100) DEFAULT NULL,
  `items_json` json NOT NULL,
  `remarks` text DEFAULT NULL,
  `subTotal` decimal(12,2) NOT NULL,
  `cgstRate` decimal(5,2) NOT NULL,
  `cgstAmount` decimal(12,2) NOT NULL,
  `sgstRate` decimal(5,2) NOT NULL,
  `sgstAmount` decimal(12,2) NOT NULL,
  `totalTax` decimal(12,2) NOT NULL,
  `totalAfterTax` decimal(12,2) NOT NULL,
  `roundOff` decimal(10,2) DEFAULT 0.00,
  `totalPayable` decimal(12,2) NOT NULL,
  `billDocumentUri` longtext DEFAULT NULL,
  `lrDocumentUri` longtext DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` datetime NOT NULL,
  `type` enum('credit','debit') NOT NULL,
  `partyType` varchar(50) NOT NULL,
  `partyId` varchar(255) NOT NULL,
  `exportDocumentId` int(11) DEFAULT NULL,
  `relatedInvoices_json` json DEFAULT NULL,
  `sourceBillId` varchar(255) DEFAULT NULL,
  `sourceBillType` varchar(50) DEFAULT NULL,
  `currency` enum('USD','EUR','INR') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `description` text DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `transporters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyName` varchar(255) NOT NULL,
  `gstNumber` varchar(50) NOT NULL,
  `contactPerson` varchar(255) NOT NULL,
  `contactNumber` varchar(50) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
