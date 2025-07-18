# BizForm ERP - Project Documentation

## 1. Project Overview

**BizForm** is a specialized ERP (Enterprise Resource Planning) application designed to streamline the export documentation and financial management processes for businesses. It provides a suite of tools to manage company data, create and track sales and purchase documents, handle billing, and monitor financial transactions. The application is built as a single-page web app and uses the browser's `localStorage` for data persistence, making it a self-contained, client-side solution.

---

## 2. Core Features

- **Entity Management**: Forms and lists for managing core business entities like Exporters, Clients, Manufacturers, Suppliers, Products, and Banks.
- **Sales Workflow**: A structured process for creating sales documents, starting from a Performa Invoice, which can then be used to generate a Purchase Order, and finally an Export Document.
- **Purchase Workflow**: Modules to record bills received from various parties, including Manufacturers, Transporters, and other Suppliers.
- **Financial Ledger**: A centralized transaction system to log all payments (credits) and receipts (debits), automatically linking them to corresponding bills and invoices.
- **PDF Generation**: On-the-fly generation of professional PDF documents for key business records, including Performa Invoices, Purchase Orders, Packing Lists, and Custom Invoices.
- **Data Persistence**: All application data is stored locally in the user's browser, ensuring privacy and offline accessibility.
- **Dependency Management**: Built-in checks prevent the deletion of entities (like a Client or Product) if they are being used in other documents, ensuring data integrity.

---

## 3. Technology Stack

- **Frontend Framework**: Next.js with React (App Router)
- **UI Components**: ShadCN UI
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Form Management**: React Hook Form with Zod for validation
- **PDF Generation**: jsPDF & jspdf-autotable
- **AI Functionality (Future-ready)**: Genkit for integrating generative AI features.

---

## 4. Data Architecture

The application operates entirely on the client side. All data is stored in the browser's **`localStorage`**. Data is organized using distinct keys for each type of entity or document.

**Key `localStorage` items:**
- `bizform_companies`: Stores Exporter company details.
- `bizform_clients`: Stores Client details.
- `bizform_manufacturers`: Stores Manufacturer details.
- `bizform_suppliers`: Stores general Supplier details.
- `bizform_pallets`: Stores Pallet Supplier details.
- `bizform_transporters`: Stores Transporter details.
- `bizform_banks`: Stores Bank account details.
- `bizform_sizes`: Stores product size specifications.
- `bizform_products`: Stores product details, linked to sizes.
- `bizform_performa_invoices`: The starting point of the sales workflow.
- `bizform_purchase_orders`: Generated from Performa Invoices.
- `bizform_export_documents_v2`: The final export document, generated from Purchase Orders.
- `bizform_manu_bills`, `bizform_trans_bills`, `bizform_supply_bills`: Records of bills from suppliers.
- `bizform_transactions`: A central ledger of all financial movements (payments/receipts).

---

## 5. Page Breakdown

### 5.1. Dashboard (`/`)
- **Purpose**: Provides a high-level financial overview of the business.
- **Features**:
  - Displays key metrics like Total Receivables, Total Payables, Net Position, and GST Receivable within a selected date range.
  - Features interactive cards that open modals with detailed breakdowns of each metric.
  - Includes a bar chart visualizing the comparison between receivables and payables.

### 5.2. Data Entry & Management Pages
These pages follow a consistent pattern: a form at the top for creating or editing an entry, and a paginated, searchable list below to display all existing entries.

- **Exporter (`/exporter`)**: Manages your own company's details (as the exporter).
- **Client (`/client`)**: Manages the details of customers you sell to.
- **Manufacturer (`/manufacturer`)**: Manages the details of companies that produce the goods.
- **Transporter (`/transporter`)**: Manages logistics and transport companies.
- **Suppliers (`/suppliers`)**: Manages general suppliers.
- **Pallet (`/pallet`)**: Manages pallet suppliers.
- **Bank (`/bank`)**: Manages bank account details used in documents.
- **Size (`/size`)**: Defines product dimensions, weights, and pricing, which serves as a template for products.
- **Product (`/product`)**: Defines specific products, linking them to a pre-defined size.

### 5.3. Sales & Export Workflow Pages

- **Performa Invoice (`/performa-invoice`)**:
  - The first step in the sales process.
  - Users create a PI, specifying the client, products, rates, and terms.
  - A saved PI can be used to **Generate a Purchase Order**.
  - Can generate a PDF of the invoice.

- **Purchase Order (`/purchase-order`)**:
  - Can be generated from a Performa Invoice, which auto-populates many fields.
  - Users select a manufacturer and confirm product details.
  - A saved PO can be used to **Generate an Export Document**.
  - Can generate a PDF of the purchase order.

- **Export Document (`/export-document`)**:
  - The final document in the export workflow, typically generated from a PO.
  - Consolidates all information, including container details, shipping info, and product specifics.
  - The detail page (`/export-document/[docId]`) allows for:
    - Entering post-export details like Eway Bill and Shipping Bill numbers.
    - Generating various critical PDF documents: Custom Invoice, Packing List, VGM, and Annexure.

### 5.4. Purchase & Billing Pages

- **Manu Bill / Trans Bill / Supply Bill (`/manu-bill`, etc.)**:
  - Forms to record bills received from Manufacturers, Transporters, or other Suppliers.
  - Each bill is linked to an Export Document for job costing.
  - Saving a bill automatically creates a corresponding `debit` entry in the main transaction ledger.

### 5.5. Financial Pages

- **Transaction (`/transaction`)**:
  - A comprehensive ledger of all financial movements.
  - Users can manually record payments made (`credit`) or received (`debit`).
  - For payments made, users can link the transaction to one or more outstanding bills, and the form will auto-calculate the total amount.
  - Provides a complete audit trail of finances.

- **Party Transaction Pages (`/party-transactions/...`)**:
  - Accessible from the list pages for Clients, Manufacturers, etc.
  - Provides a dedicated ledger view for a single party, showing all their associated bills and payments to calculate a net balance.

- **GST (`/gst`)**:
  - A summary page that calculates the total GST paid (input tax) from all purchase bills and compares it against GST refunds received (recorded as transactions).
  - Displays the net GST receivable amount.
