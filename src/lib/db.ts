
import mysql from 'mysql2/promise';
import 'dotenv/config'

// Create a connection pool instead of a single connection for better performance
// The pool manages multiple connections and reuses them, which is more efficient.
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'bizform_v2',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper function to handle potential null values from the database
export function nullToUndefined<T>(value: T | null): T | undefined {
    return value === null ? undefined : value;
}

--
-- Table structure for table `banks`
--

CREATE TABLE `banks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `bankName` varchar(255) NOT NULL,
  `bankAddress` text NOT NULL,
  `accountNumber` varchar(255) NOT NULL,
  `swiftCode` varchar(255) NOT NULL,
  `ifscCode` varchar(255) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for table `banks`
--
ALTER TABLE `banks`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for table `banks`
--
ALTER TABLE `banks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
  
--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `companyName` varchar(255) NOT NULL,
  `person` varchar(255) NOT NULL,
  `contactNumber` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `city` varchar(255) NOT NULL,
  `country` varchar(255) NOT NULL,
  `pinCode` varchar(255) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`);
  
--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Table structure for table `companies`
--

CREATE TABLE `companies` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `companyName` varchar(255) NOT NULL,
  `contactPerson` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `phoneNumber` varchar(255) NOT NULL,
  `iecNumber` varchar(255) NOT NULL,
  `gstNumber` varchar(255) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for table `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for table `companies`
--
ALTER TABLE `companies`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Table structure for table `manufacturers`
--

CREATE TABLE `manufacturers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `companyName` varchar(255) NOT NULL,
  `contactPerson` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `gstNumber` varchar(255) NOT NULL,
  `stuffingPermissionNumber` varchar(255) NOT NULL,
  `stuffingPermissionDate` date NOT NULL,
  `pinCode` varchar(255) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for table `manufacturers`
--
ALTER TABLE `manufacturers`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for table `manufacturers`
--
ALTER TABLE `manufacturers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Table structure for table `pallets`
--

CREATE TABLE `pallets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `companyName` varchar(255) NOT NULL,
  `gstNumber` varchar(255) NOT NULL,
  `contactPerson` varchar(255) NOT NULL,
  `contactNumber` varchar(255) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for table `pallets`
--
ALTER TABLE `pallets`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for table `pallets`
--
ALTER TABLE `pallets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `sizeId` bigint(20) UNSIGNED NOT NULL,
  `designName` varchar(255) NOT NULL,
  `salesPrice` decimal(10,2) DEFAULT NULL,
  `boxWeight` decimal(10,2) DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `products_sizeid_foreign` (`sizeId`);

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Table structure for table `sizes`
--

CREATE TABLE `sizes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `size` varchar(255) NOT NULL,
  `sqmPerBox` decimal(8,4) NOT NULL,
  `boxWeight` decimal(8,2) NOT NULL,
  `purchasePrice` decimal(10,2) NOT NULL,
  `salesPrice` decimal(10,2) NOT NULL,
  `hsnCode` varchar(255) NOT NULL,
  `palletDetails` text NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for table `sizes`
--
ALTER TABLE `sizes`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for table `sizes`
--
ALTER TABLE `sizes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `companyName` varchar(255) NOT NULL,
  `gstNumber` varchar(255) NOT NULL,
  `contactPerson` varchar(255) NOT NULL,
  `contactNumber` varchar(255) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Table structure for table `transporters`
--

CREATE TABLE `transporters` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `companyName` varchar(255) NOT NULL,
  `gstNumber` varchar(255) NOT NULL,
  `contactPerson` varchar(255) NOT NULL,
  `contactNumber` varchar(255) NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for table `transporters`
--
ALTER TABLE `transporters`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for table `transporters`
--
ALTER TABLE `transporters`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_sizeid_foreign` FOREIGN KEY (`sizeId`) REFERENCES `sizes` (`id`);
COMMIT;

--
-- Table structure for table `performa_invoices`
--
CREATE TABLE `performa_invoices` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `exporterId` varchar(255) NOT NULL,
  `invoiceNumber` varchar(255) NOT NULL,
  `invoiceDate` datetime NOT NULL,
  `clientId` varchar(255) NOT NULL,
  `selectedBankId` varchar(255) DEFAULT NULL,
  `finalDestination` varchar(255) NOT NULL,
  `totalContainer` int(11) NOT NULL,
  `containerSize` enum('20 ft','40 ft') NOT NULL,
  `currencyType` enum('INR','USD','Euro') NOT NULL,
  `totalGrossWeight` varchar(255) NOT NULL,
  `freight` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) NOT NULL,
  `notifyPartyLine1` varchar(255) DEFAULT NULL,
  `notifyPartyLine2` varchar(255) DEFAULT NULL,
  `termsAndConditions` text NOT NULL,
  `note` text DEFAULT NULL,
  `items_json` json NOT NULL,
  `subTotal` decimal(12,2) DEFAULT NULL,
  `grandTotal` decimal(12,2) DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `performa_invoices`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `performa_invoices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Table structure for table `purchase_orders`
--
CREATE TABLE `purchase_orders` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `sourcePiId` varchar(255) NOT NULL,
  `exporterId` varchar(255) NOT NULL,
  `manufacturerId` varchar(255) NOT NULL,
  `poNumber` varchar(255) NOT NULL,
  `poDate` datetime NOT NULL,
  `sizeId` varchar(255) NOT NULL,
  `numberOfContainers` int(11) NOT NULL,
  `termsAndConditions` text NOT NULL,
  `items_json` json NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `purchase_orders`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
  
--
-- Table structure for table `export_documents`
--
CREATE TABLE `export_documents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `exporterId` varchar(255) NOT NULL,
  `clientId` varchar(255) NOT NULL,
  `performaInvoiceId` varchar(255) DEFAULT NULL,
  `purchaseOrderId` varchar(255) DEFAULT NULL,
  `transporterId` varchar(255) NOT NULL,
  `exportInvoiceNumber` varchar(255) NOT NULL,
  `exportInvoiceDate` datetime NOT NULL,
  `countryOfOrigin` varchar(255) DEFAULT NULL,
  `countryOfFinalDestination` varchar(255) NOT NULL,
  `vesselFlightNo` varchar(255) DEFAULT NULL,
  `portOfLoading` varchar(255) NOT NULL,
  `portOfDischarge` varchar(255) NOT NULL,
  `finalDestination` varchar(255) NOT NULL,
  `termsOfDeliveryAndPayment` text NOT NULL,
  `conversationRate` decimal(10,4) NOT NULL,
  `exchangeNotification` varchar(255) NOT NULL,
  `exchangeDate` datetime NOT NULL,
  `freight` decimal(10,2) NOT NULL,
  `gst` varchar(255) NOT NULL,
  `discount` decimal(10,2) DEFAULT NULL,
  `totalInvoiceValue` decimal(12,2) DEFAULT NULL,
  `ewayBillNumber` varchar(255) DEFAULT NULL,
  `ewayBillDate` date DEFAULT NULL,
  `ewayBillDocument` longtext DEFAULT NULL,
  `shippingBillNumber` varchar(255) DEFAULT NULL,
  `shippingBillDate` date DEFAULT NULL,
  `shippingBillDocument` longtext DEFAULT NULL,
  `blNumber` varchar(255) DEFAULT NULL,
  `blDate` date DEFAULT NULL,
  `blDocument` longtext DEFAULT NULL,
  `brcDocument` longtext DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `manufacturerDetails_json` json DEFAULT NULL,
  `containerItems_json` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `export_documents`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `export_documents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
  
--
-- Table structure for table `manu_bills`
--
CREATE TABLE `manu_bills` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `exportDocumentId` varchar(255) NOT NULL,
  `manufacturerId` varchar(255) NOT NULL,
  `invoiceNumber` varchar(255) NOT NULL,
  `invoiceDate` datetime NOT NULL,
  `ackNo` varchar(255) DEFAULT NULL,
  `ackDate` datetime DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `subTotal` decimal(12,2) NOT NULL,
  `discountAmount` decimal(10,2) DEFAULT NULL,
  `insuranceAmount` decimal(10,2) DEFAULT NULL,
  `freightAmount` decimal(10,2) DEFAULT NULL,
  `finalSubTotal` decimal(12,2) NOT NULL,
  `centralTaxRate` decimal(5,2) NOT NULL,
  `centralTaxAmount` decimal(10,2) NOT NULL,
  `stateTaxRate` decimal(5,2) NOT NULL,
  `stateTaxAmount` decimal(10,2) NOT NULL,
  `roundOff` decimal(5,2) DEFAULT NULL,
  `grandTotal` decimal(12,2) NOT NULL,
  `billDocumentUri` longtext DEFAULT NULL,
  `ewayBillDocumentUri` longtext DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `items_json` json NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `manu_bills`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `manu_bills`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Table structure for table `trans_bills`
--
CREATE TABLE `trans_bills` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `exportDocumentId` varchar(255) NOT NULL,
  `transporterId` varchar(255) NOT NULL,
  `invoiceNumber` varchar(255) NOT NULL,
  `invoiceDate` datetime NOT NULL,
  `shippingLine` varchar(255) DEFAULT NULL,
  `portOfLoading` varchar(255) DEFAULT NULL,
  `portOfDischarge` varchar(255) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `subTotal` decimal(12,2) NOT NULL,
  `cgstRate` decimal(5,2) NOT NULL,
  `cgstAmount` decimal(10,2) NOT NULL,
  `sgstRate` decimal(5,2) NOT NULL,
  `sgstAmount` decimal(10,2) NOT NULL,
  `totalTax` decimal(12,2) NOT NULL,
  `totalAfterTax` decimal(12,2) NOT NULL,
  `roundOff` decimal(5,2) DEFAULT NULL,
  `totalPayable` decimal(12,2) NOT NULL,
  `billDocumentUri` longtext DEFAULT NULL,
  `lrDocumentUri` longtext DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `items_json` json NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `trans_bills`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `trans_bills`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Table structure for table `supply_bills`
--
CREATE TABLE `supply_bills` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `exportDocumentId` varchar(255) NOT NULL,
  `supplierId` varchar(255) NOT NULL,
  `invoiceNumber` varchar(255) NOT NULL,
  `invoiceDate` datetime NOT NULL,
  `ackNo` varchar(255) DEFAULT NULL,
  `ackDate` datetime DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `subTotal` decimal(12,2) NOT NULL,
  `discountAmount` decimal(10,2) DEFAULT NULL,
  `insuranceAmount` decimal(10,2) DEFAULT NULL,
  `freightAmount` decimal(10,2) DEFAULT NULL,
  `finalSubTotal` decimal(12,2) NOT NULL,
  `centralTaxRate` decimal(5,2) NOT NULL,
  `centralTaxAmount` decimal(10,2) NOT NULL,
  `stateTaxRate` decimal(5,2) NOT NULL,
  `stateTaxAmount` decimal(10,2) NOT NULL,
  `roundOff` decimal(5,2) DEFAULT NULL,
  `grandTotal` decimal(12,2) NOT NULL,
  `billDocumentUri` longtext DEFAULT NULL,
  `ewayBillDocumentUri` longtext DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `items_json` json NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `supply_bills`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `supply_bills`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
