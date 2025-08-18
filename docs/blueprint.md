# BizForm ERP V2 - Project Blueprint

---

## 1. Project Overview

**BizForm ERP V2** is a specialized Enterprise Resource Planning application designed to streamline export documentation and financial management. This version represents a significant architectural evolution from the original `localStorage`-based system to a robust, server-based application with a MySQL database.

This document serves as the central technical and functional blueprint for the V2 system. It outlines the technology stack, database schema, application workflows, and a detailed breakdown of each page and its components.

---

## 2. Core Concepts (V2 Architecture)

- **Client-Server Model**: Unlike the original version, V2 operates on a client-server model. The frontend is a Next.js application, and the backend consists of API routes that communicate with a MySQL database.
- **Centralized Database**: All data is persisted in a central MySQL database, ensuring data integrity, consistency, and the ability for multiple users to access the same information (a feature for future expansion).
- **API-Driven**: The frontend application is completely decoupled from the data layer. It interacts with the database exclusively through a set of RESTful API endpoints defined within the Next.js application.
- **Server-Side Logic**: Data validation, dependency checks (e.g., preventing deletion of a client linked to an invoice), and business logic are handled on the server-side within the API routes, making the application more secure and reliable.

---

## 3. Technology Stack

- **Framework**: Next.js with React (App Router)
- **Language**: TypeScript
- **Backend**: Next.js API Routes with Node.js
- **Database**: MySQL
- **UI Components**: ShadCN UI
- **Styling**: Tailwind CSS
- **Form Management**: React Hook Form with Zod for validation
- **PDF Generation**: jsPDF & jspdf-autotable
- **AI Integration**: Genkit (for future AI features)

---

## 4. Database Schema (MySQL)

This schema is inferred from the API routes in `src/app/api/v2/`.

### `companies` (Exporters)
- `id` (INT, PK, AI)
- `companyName` (VARCHAR)
- `contactPerson` (VARCHAR)
- `address` (TEXT)
- `phoneNumber` (VARCHAR)
- `iecNumber` (VARCHAR)
- `gstNumber` (VARCHAR)
- `isDeleted` (BOOLEAN, default: FALSE)
- `createdAt` (TIMESTAMP, default: CURRENT_TIMESTAMP)

### `clients`
- `id` (INT, PK, AI)
- `companyName` (VARCHAR)
- `person` (VARCHAR)
- `contactNumber` (VARCHAR)
- `address` (TEXT)
- `city` (VARCHAR)
- `country` (VARCHAR)
- `pinCode` (VARCHAR)
- `isDeleted` (BOOLEAN, default: FALSE)
- `createdAt` (TIMESTAMP, default: CURRENT_TIMESTAMP)

### `manufacturers`
- `id` (INT, PK, AI)
- `companyName` (VARCHAR)
- `contactPerson` (VARCHAR)
- `address` (TEXT)
- `gstNumber` (VARCHAR)
- `stuffingPermissionNumber` (VARCHAR)
- `stuffingPermissionDate` (DATE)
- `pinCode` (VARCHAR)
- `isDeleted` (BOOLEAN, default: FALSE)
- `createdAt` (TIMESTAMP, default: CURRENT_TIMESTAMP)

### `transporters`
- `id` (INT, PK, AI)
- `companyName` (VARCHAR)
- `gstNumber` (VARCHAR)
- `contactPerson` (VARCHAR)
- `contactNumber` (VARCHAR)
- `isDeleted` (BOOLEAN, default: FALSE)
- `createdAt` (TIMESTAMP, default: CURRENT_TIMESTAMP)

### `suppliers`
- `id` (INT, PK, AI)
- `companyName` (VARCHAR)
- `gstNumber` (VARCHAR)
- `contactPerson` (VARCHAR)
- `contactNumber` (VARCHAR)
- `isDeleted` (BOOLEAN, default: FALSE)
- `createdAt` (TIMESTAMP, default: CURRENT_TIMESTAMP)

### `pallets` (Pallet Suppliers)
- `id` (INT, PK, AI)
- `companyName` (VARCHAR)
- `gstNumber` (VARCHAR)
- `contactPerson` (VARCHAR)
- `contactNumber` (VARCHAR)
- `isDeleted` (BOOLEAN, default: FALSE)
- `createdAt` (TIMESTAMP, default: CURRENT_TIMESTAMP)

### `banks`
- `id` (INT, PK, AI)
- `bankName` (VARCHAR)
- `bankAddress` (TEXT)
- `accountNumber` (VARCHAR)
- `swiftCode` (VARCHAR)
- `ifscCode` (VARCHAR)
- `isDeleted` (BOOLEAN, default: FALSE)
- `createdAt` (TIMESTAMP, default: CURRENT_TIMESTAMP)

### `sizes`
- `id` (INT, PK, AI)
- `size` (VARCHAR)
- `sqmPerBox` (DECIMAL)
- `boxWeight` (DECIMAL)
- `purchasePrice` (DECIMAL)
- `salesPrice` (DECIMAL)
- `hsnCode` (VARCHAR)
- `palletDetails` (TEXT)
- `isDeleted` (BOOLEAN, default: FALSE)
- `createdAt` (TIMESTAMP, default: CURRENT_TIMESTAMP)

### `products`
- `id` (INT, PK, AI)
- `sizeId` (INT, FK -> sizes.id)
- `designName` (VARCHAR)
- `salesPrice` (DECIMAL)
- `boxWeight` (DECIMAL)
- `isDeleted` (BOOLEAN, default: FALSE)
- `createdAt` (TIMESTAMP, default: CURRENT_TIMESTAMP)

### `performa_invoices`
- `id` (INT, PK, AI)
- `exporterId` (INT, FK -> companies.id)
- `clientId` (INT, FK -> clients.id)
- `invoiceNumber` (VARCHAR)
- `invoiceDate` (DATETIME)
- `items_json` (JSON) - Stores an array of `PerformaInvoiceItem` objects.
- `... other fields like finalDestination, currencyType, etc.`
- `isDeleted` (BOOLEAN, default: FALSE)
- `createdAt` (TIMESTAMP, default: CURRENT_TIMESTAMP)

### `purchase_orders`
- `id` (INT, PK, AI)
- `sourcePiId` (INT, FK -> performa_invoices.id)
- `exporterId` (INT, FK -> companies.id)
- `manufacturerId` (INT, FK -> manufacturers.id)
- `poNumber` (VARCHAR)
- `poDate` (DATETIME)
- `items_json` (JSON) - Stores an array of `PurchaseOrderItem` objects.
- `... other fields like sizeId, termsAndConditions, etc.`
- `isDeleted` (BOOLEAN, default: FALSE)
- `createdAt` (TIMESTAMP, default: CURRENT_TIMESTAMP)

### `export_documents`
- `id` (INT, PK, AI)
- `purchaseOrderId` (INT, FK -> purchase_orders.id)
- `exporterId` (INT, FK -> companies.id)
- `... other FKs and data fields.`
- `containerItems_json` (JSON)
- `manufacturerDetails_json` (JSON)
- `isDeleted` (BOOLEAN, default: FALSE)
- `createdAt` (TIMESTAMP, default: CURRENT_TIMESTAMP)

### `manu_bills`, `trans_bills`, `supply_bills`
These tables follow a similar structure, linking to an `exportDocumentId` and a party (`manufacturerId`, `transporterId`, `supplierId`). They store bill details and have an `items_json` column for line items.

### `transactions`
- `id` (INT, PK, AI)
- `date` (DATETIME)
- `type` (ENUM('credit', 'debit'))
- `partyType` (VARCHAR)
- `partyId` (INT)
- `amount` (DECIMAL)
- `relatedInvoices_json` (JSON) - Used to link payments to specific bills.
- `... other fields like description, currency, etc.`
- `isDeleted` (BOOLEAN, default: FALSE)
- `createdAt` (TIMESTAMP, default: CURRENT_TIMESTAMP)

---

## 5. Page-by-Page Breakdown (V2)

This section details the primary pages of the V2 application.

### 5.1. Dashboard (`/v2/dashboard`)
- **Purpose**: Provides a high-level financial overview of the business based on data from the database.
- **Key Responsibilities**:
  - Fetches data from all relevant API endpoints (`transaction-data`, `export-document-data`, `manu-bill-data`, etc.).
  - Calculates key metrics: Total Receivables, Total Payables, Net Position, and GST Receivable.
  - Allows filtering by a date range.
  - Renders a bar chart comparing receivables and payables.
- **Associated Files**:
  - `src/app/v2/dashboard/page.tsx`
  - (Uses data from nearly all API routes)

### 5.2. Data Entry & Management Pages
These pages share a consistent architecture: a page component that manages state, a form component for data entry, a list component for display, and a dedicated API route for database interaction.

**Example: Client Page (`/v2/client`)**
- **Purpose**: Manage customer (client) information in the database.
- **Key Responsibilities (`page.tsx`)**:
  - Fetches the list of clients from its API route on load.
  - Manages the `clientToEdit` state to control the form's mode (create vs. edit).
  - Contains `handleSaveClient` and `handleDeleteClient` functions that make `POST`, `PUT`, and `DELETE` requests to the API.
- **Form Fields (`client-form.tsx`)**: Company Name, Contact Person, Contact Number, Address, City, Country, PIN Code.
- **Associated Files**:
  - Page: `src/app/v2/client/page.tsx`
  - Form: `src/components/v2/client-form.tsx`
  - List: `src/components/v2/client-list.tsx`
  - API: `src/app/api/v2/client-data/route.ts`
  - Type: `src/types/client.ts`

*(This structure is repeated for: Exporter, Manufacturer, Transporter, Supplier, Pallet, Bank, Size, and Product pages under the `/v2/` directory.)*

### 5.3. Sales & Export Workflow

#### 5.3.1. Performa Invoice (`/v2/performa-invoice`)
- **Purpose**: The first step in the sales workflow. Create a preliminary bill of sale for a client.
- **Key Responsibilities**:
  - Fetches all necessary data for dropdowns (Exporters, Clients, Banks, Products, Sizes).
  - Manages state for the PI form and list.
  - The list component contains the "Generate PO" button which navigates to the Purchase Order page with the PI's ID as a URL parameter.
- **Workflow**: `(Start) -> Performa Invoice -> Purchase Order`
- **Associated Files**:
  - Page: `src/app/v2/performa-invoice/page.tsx`
  - Form: `src/components/v2/performa-invoice-form.tsx`
  - List: `src/components/v2/performa-invoice-list.tsx`
  - API: `src/app/api/v2/performa-invoice-data/route.ts`
  - Type: `src/types/performa-invoice.ts`
  - PDF: `src/lib/performa-invoice-pdf.ts`

#### 5.3.2. Purchase Order (`/v2/purchase-order`)
- **Purpose**: The second step, an official order placed with a manufacturer, typically generated from a Performa Invoice.
- **Key Responsibilities**:
  - Reads the `sourcePiId` from the URL to fetch the source PI and pre-fill data like Exporter and Client information.
  - Filters the "Size" dropdown to only show sizes that were present on the source PI.
  - Pre-populates the items table based on the selected size.
  - The list component contains the "Generate Export Doc" button.
- **Workflow**: `Performa Invoice -> Purchase Order -> Export Document`
- **Associated Files**:
  - Page: `src/app/v2/purchase-order/page.tsx`
  - Form: `src/components/v2/purchase-order-form.tsx`
  - List: `src/components/v2/purchase-order-list.tsx`
  - API: `src/app/api/v2/purchase-order-data/route.ts`
  - Type: `src/types/purchase-order.ts`
  - PDF: `src/lib/purchase-order-pdf.ts`

#### 5.3.3. Export Document (`/v2/export-document`)
- **Purpose**: The final and most complex document in the sales workflow, consolidating all shipment information.
- **Key Responsibilities**:
  - The main page (`page.tsx`) handles creation (from a PO) and listing.
  - Reads the `sourcePoId` from the URL to pre-fill data.
  - Features a complex, multi-part form for all export details, including nested forms for containers and products.
- **Workflow**: `Purchase Order -> Export Document -> (Post-Export Data Entry)`
- **Associated Files**:
  - Page: `src/app/v2/export-document/page.tsx`
  - Form: `src/components/v2/export-document-form.tsx`
  - List: `src/components/v2/export-document-list.tsx`
  - API: `src/app/api/v2/export-document-data/route.ts`
  - Type: `src/types/export-document.ts`

#### 5.3.4. Export Document Details (`/v2/export-document/[docId]`)
- **Purpose**: A dedicated page to manage post-export details for a single document.
- **Key Responsibilities**:
  - Fetches a single document by its `docId`.
  - Provides a tabbed interface for entering E-way Bill, Shipping Bill, and BRC document details.
  - Contains buttons to trigger the generation of all final PDFs (Custom Invoice, Packing List, VGM, Annexure).
- **Workflow**: This is the final management hub for a single export job.
- **Associated Files**:
  - Page: `src/app/v2/export-document/[docId]/page.tsx`
  - PDF Libs: `src/lib/custom-invoice-pdf.ts`, `src/lib/packing-list-pdf.ts`, `src/lib/vgm-pdf.ts`, `src/lib/annexure-pdf.ts`

### 5.4. Purchase & Financial Pages
The Bill pages (`/v2/manu-bill`, `/v2/trans-bill`, `/v2/supply-bill`) and the Transaction page (`/v2/transaction`) follow the same standard architecture as the data entry pages, each with its own page, form, list, API route, and type definition. Their key function is to record expenses and financial movements, which are then aggregated on the Dashboard and GST pages.
