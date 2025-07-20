# BizForm ERP - Functional Specification & User Guide

---

## 1. Introduction

This document provides a detailed functional specification for the **BizForm ERP** application. It serves as a user guide, outlining the purpose, features, and fields for each page within the system. This guide is intended for end-users, project stakeholders, and clients to understand the complete workflow and capabilities of the application.

---

## 2. Core Concepts

- **Client-Side Storage**: All data entered into this application is stored locally in your web browser's `localStorage`. No data is sent to a server, ensuring complete privacy and offline accessibility.
- **Data Integrity**: The system prevents the deletion of core records (like a Client or a Product) if they are being used in other documents (like a Performa Invoice). This ensures that historical data remains intact.
- **Workflow**: The application is designed around logical business workflows:
    - **Sales**: Performa Invoice -> Purchase Order -> Export Document.
    - **Purchase**: Recording bills from various suppliers.
    - **Finance**: Tracking all payments and receipts in a central transaction ledger.

---

## 3. Page-by-Page Breakdown

### 3.1. Dashboard (`/`)

-   **Purpose**: To provide a high-level, real-time financial overview of the business based on a selected date range.
-   **Functionality**:
    -   Displays key financial metrics: Total Receivables, Total Payables, Net Position, and GST Receivable.
    -   Users can select a date range to filter the data for the entire dashboard.
    -   Each metric card is clickable, opening a modal with a detailed breakdown of the numbers.
    -   Includes a bar chart visually comparing total receivables against total payables (in INR).

### 3.2. Exporter Page (`/exporter`)

-   **Purpose**: To manage the details of your own company (the "Exporter"). This information is used as the "From" address and legal entity on all export documents.
-   **Functionality**: Add, edit, and delete your company profiles. A company cannot be deleted if it is linked to any sale or purchase documents.
-   **Form Fields**:
| Field Name | Type | Description | Validation |
| :--- | :--- | :--- | :--- |
| Company Name | Text | The legal name of your company. | Required, Min. 2 chars |
| Contact Person | Text | The primary contact person for the company. | Required, Min. 2 chars |
| Address | Text Area | The full registered address of the company. | Required, Min. 5 chars |
| Phone Number | Text | The official contact phone number. | Required, Valid phone format |
| IEC Number | Text | The Importer-Exporter Code for the company. | Required, Min. 5 chars |
| GST Number | Text | The Goods and Services Tax Identification Number. | Required, 15 chars |

### 3.3. Client Page (`/client`)

-   **Purpose**: To manage the information of your customers (the "Clients" or "Consignees").
-   **Functionality**: Add, edit, delete, and search for clients. A client cannot be deleted if they are associated with a Performa Invoice.
-   **Form Fields**:
| Field Name | Type | Description | Validation |
| :--- | :--- | :--- | :--- |
| Company Name | Text | The legal name of the client's company. | Required, Min. 2 chars |
| Contact Person | Text | The primary contact person at the client's company. | Required, Min. 2 chars |
| Contact Number | Text | The client's phone number. | Required, Valid phone format |
| Address | Text Area | The full address of the client. | Required, Min. 5 chars |
| City | Text | The city where the client is located. | Required, Min. 2 chars |
| Country | Text | The country where the client is located. | Required, Min. 2 chars |
| PIN Code | Text | The postal or ZIP code for the client's address. | Required, Min. 3 chars |

### 3.4. Manufacturer Page (`/manufacturer`)

-   **Purpose**: To manage the details of the companies that manufacture the goods you export.
-   **Functionality**: Add, edit, delete, and search for manufacturers. A manufacturer cannot be deleted if they are linked to a Purchase Order or Export Document.
-   **Form Fields**:
| Field Name | Type | Description | Validation |
| :--- | :--- | :--- | :--- |
| Company Name | Text | The legal name of the manufacturing company. | Required, Min. 2 chars |
| Contact Person | Text | The primary contact at the manufacturer. | Required, Min. 2 chars |
| Address | Text Area | The full address of the manufacturer. | Required, Min. 5 chars |
| GST Number | Text | The manufacturer's GST Identification Number. | Required, 15 chars |
| Stuffing Permission No. | Text | The official stuffing permission number. | Required, Min. 5 chars |
| Stuffing Permission Date | Date | The date the stuffing permission was granted. | Required |
| Pin Code | Text | The 6-digit postal code for the manufacturer. | Required, 6 digits |

### 3.5. Transporter Page (`/transporter`)

-   **Purpose**: To manage details of logistics and transport companies.
-   **Functionality**: Add, edit, delete, and search for transporters. A transporter cannot be deleted if they are used in an Export Document.
-   **Form Fields**:
| Field Name | Type | Description | Validation |
| :--- | :--- | :--- | :--- |
| Company Name | Text | The name of the transport company. | Required, Min. 2 chars |
| GST Number | Text | The transporter's GST Identification Number. | Required, 15 chars |
| Contact Person | Text | The primary contact at the transport company. | Required, Min. 2 chars |
| Contact Number | Text | The transporter's phone number. | Required, Valid phone format |

### 3.6. Suppliers Page (`/suppliers`)

-   **Purpose**: To manage general-purpose suppliers who are not manufacturers or transporters (e.g., for office supplies, miscellaneous services).
-   **Functionality**: Add, edit, delete, and search for suppliers.
-   **Form Fields**:
| Field Name | Type | Description | Validation |
| :--- | :--- | :--- | :--- |
| Company Name | Text | The name of the supplier. | Required, Min. 2 chars |
| GST Number | Text | The supplier's GST Identification Number. | Required, 15 chars |
| Contact Person | Text | The primary contact at the supplier. | Required, Min. 2 chars |
| Contact Number | Text | The supplier's phone number. | Required, Valid phone format |

### 3.7. Pallet Page (`/pallet`)

-   **Purpose**: To specifically manage suppliers of pallets.
-   **Functionality**: Add, edit, delete, and search for pallet suppliers.
-   **Form Fields**:
| Field Name | Type | Description | Validation |
| :--- | :--- | :--- | :--- |
| Company Name | Text | The name of the pallet supply company. | Required, Min. 2 chars |
| GST Number | Text | The company's GST Identification Number. | Required, 15 chars |
| Contact Person | Text | The primary contact at the company. | Required, Min. 2 chars |
| Contact Number | Text | The company's phone number. | Required, Valid phone format |

### 3.8. Size Page (`/size`)

-   **Purpose**: To define the specifications for different product sizes. This acts as a template for products, standardizing weight, dimensions, and pricing.
-   **Functionality**: Add, edit, delete, and search for size templates. A size cannot be deleted if it is used by any Product.
-   **Form Fields**:
| Field Name | Type | Description | Validation |
| :--- | :--- | :--- | :--- |
| Size | Text | The dimensions of the product (e.g., 600x600mm). | Required |
| SQM per Box | Number | The area in square meters that one box covers. | Required, Positive number |
| Box Weight (kg) | Number | The weight of a single box in kilograms. | Required, Positive number |
| Purchase Price | Number | The default cost to purchase one unit (e.g., per SQM). | Required, Non-negative |
| Sales Price | Number | The default price to sell one unit (e.g., per SQM). | Required, Non-negative |
| HSN Code | Text | The Harmonized System of Nomenclature code for this size category. | Required, Min. 4 chars |
| Pallet Details | Text Area | Description of how this size is packed on a pallet (e.g., boxes per pallet). | Required, Min. 5 chars |

### 3.9. Product Page (`/product`)

-   **Purpose**: To create specific products, linking them to a pre-defined size template.
-   **Functionality**: Add, edit, delete, and search for products. Products can be created in bulk by entering comma-separated design names. A product cannot be deleted if it is used in any sales or purchase document.
-   **Form Fields**:
| Field Name | Type | Description | Validation |
| :--- | :--- | :--- | :--- |
| Select Size | Dropdown | Links the product to a master size template. | Required |
| Design Name(s) | Text | Name of the product design. Can be one or many (comma-separated). | Required |
| Sales Price | Number | Pre-fills from the selected size, but can be overridden for this specific product. | Required, Non-negative |
| Box Weight (kg) | Number | Pre-fills from the selected size, but can be overridden. | Required, Positive number |

### 3.10. Bank Page (`/bank`)

-   **Purpose**: To manage the details of your bank accounts. This information is used in the "Beneficiary Bank" section of sales documents.
-   **Functionality**: Add, edit, and delete bank account details. An account cannot be deleted if it's linked to a Performa Invoice.
-   **Form Fields**:
| Field Name | Type | Description | Validation |
| :--- | :--- | :--- | :--- |
| Bank Name | Text | The name of the bank. | Required, Min. 2 chars |
| Bank Address | Text Area | The full address of the bank branch. | Required, Min. 5 chars |
| Bank A/C No. | Text | Your account number. | Required, Min. 5 chars |
| Bank SWIFT Code | Text | The SWIFT code for international transactions. | Required, 8-11 chars |
| Bank IFSC Code | Text | The IFSC code for domestic (Indian) transactions. | Required, 11 chars |

### 3.11. Performa Invoice Page (`/performa-invoice`)

-   **Purpose**: The first step in the sales workflow. Create a preliminary bill of sale for the client.
-   **Functionality**:
    -   Create, edit, delete, and search for Performa Invoices (PIs).
    -   Generate a PDF of the PI.
    -   Generate a Purchase Order directly from a saved PI, which pre-fills data.
-   **Form Fields**: Includes selections for Exporter, Client, Bank, and a dynamic list of product items. Key fields include final destination, container details, currency, freight, discount, and payment terms.

### 3.12. Purchase Order Page (`/purchase-order`)

-   **Purpose**: The second step in the sales workflow, typically generated from a PI. This document is an official order placed with a manufacturer.
-   **Functionality**:
    -   Create, edit, delete, and search for Purchase Orders (POs).
    -   Generate a PDF of the PO.
    -   Generate an Export Document from a saved PO.
-   **Form Fields**: Includes selections for Exporter, Manufacturer, and the specific Size for the order. Product items are then populated based on the selected size from the source PI. Key fields include PO number, PO date, number of containers, and terms.

### 3.13. Export Document Page (`/export-document`)

-   **Purpose**: The final document in the core sales workflow, consolidating all information for the shipment.
-   **Functionality**:
    -   Create, edit, delete, and search for Export Documents.
    -   A dedicated detail page (`/export-document/[docId]`) allows for entering post-export information (like Eway Bill, Shipping Bill numbers) and downloading critical PDFs.
-   **Form Fields**: A comprehensive form that links Client, PI, PO, Exporter, Manufacturer, and Transporter. It includes sections for invoice details, shipping details, exchange rate information, and a detailed breakdown of items within each container.

### 3.14. Bill Pages (`/manu-bill`, `/trans-bill`, `/supply-bill`)

-   **Purpose**: To record incoming bills from various parties (Manufacturers, Transporters, other Suppliers).
-   **Functionality**:
    -   Each page has a form to create/edit a bill specific to that party type.
    -   Bills are linked to an Export Document for job costing.
    -   Saving a bill automatically creates a corresponding `debit` entry in the main Transaction ledger, increasing the amount owed to that party.
-   **Form Fields**: Includes selection for the party, the linked Export Document, invoice number, date, bill items, and tax details (GST).

### 3.15. Transaction Page (`/transaction`)

-   **Purpose**: To provide a centralized ledger for all financial movements. This is the single source of truth for payments and receipts.
-   **Functionality**:
    -   Manually record payments made (`credit`) or payments received (`debit`).
    -   When recording a payment made to a supplier, you can link it to one or more of their outstanding bills. The form will auto-calculate the total amount.
    -   Provides a complete, searchable history of all financial transactions.
-   **Form Fields**: Includes transaction type (Credit/Debit), party type, specific party, date, amount, currency, and description.

### 3.16. GST Page (`/gst`)

-   **Purpose**: To provide a summary of GST paid vs. GST received.
-   **Functionality**:
    -   Automatically calculates the total GST paid (Input Tax Credit) from all recorded purchase bills (Manu, Trans, Supply).
    -   Compares this against GST refunds, which are recorded as `credit` transactions from the "Government (GST)" party.
    -   Displays the net GST receivable amount.
    -   Provides detailed, paginated lists of all GST-paid bills and all GST-received transactions.

---
