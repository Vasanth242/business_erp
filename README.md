# ERP System – Business Overview

## 1. Project Overview

This project is a business ERP system designed to manage day-to-day business operations from a single application.

The system brings together:

- Product management
- Customer management
- Supplier management
- Stock and inventory management
- Purchase management
- Sales management
- Customer and supplier payments
- Payment allocation against invoices
- Expense management
- Customer outstanding tracking
- Business dashboard and reporting
- Activity/audit tracking

The main objective is to ensure that activities performed in one part of the business are reflected in the relevant areas of the system.

---

## 2. Main Business Modules

### Products
Central product/item master used by purchasing, sales and inventory activities.

### Customers
Maintains customer information and connects customers with sales, invoices, payments and outstanding amounts.

### Suppliers
Maintains supplier information and connects suppliers with purchases and supplier payments.

### Stock Locations
Allows stock to be associated with warehouses, godowns, branches or other business locations.

### Purchases
Records goods received from suppliers. A purchase contains supplier, invoice information, dates, location, products, quantities, rates, discounts, tax and notes.

Completing a purchase updates the relevant inventory.

### Sales
Records goods sold to customers. Completing a sale reduces the relevant inventory and creates the invoice that can later be settled through customer payments.

### Inventory
Tracks stock movements including opening stock, purchases, stock-in, transfers, sales, stock-out and adjustments.

### Payments
Supports both customer receipts and supplier payments. Payments have their own lifecycle and can be completed after creation.

### Payment Allocation
Allows completed customer payments to be allocated against specific sales/invoices.

Invoices can therefore be identified as:

- Unpaid
- Partially Paid
- Paid

### Expenses
Records business expenses separately from purchases and sales.

### Dashboard
Provides a consolidated view of sales, purchases, expenses, payments, inventory, outstanding amounts, trends, top products and recent transactions.

---

## 3. Overall Business Flow

```text
Master Data
    |
    +--> Products
    +--> Customers
    +--> Suppliers
    +--> Stock Locations
            |
            v
       Business Operations
            |
     +------+------+
     |             |
  Purchases       Sales
     |             |
     v             v
 Stock Increase  Stock Decrease
     |             |
     +------+------+
            |
            v
        Inventory
            |
            v
        Payments
            |
            v
   Invoice Settlement
            |
            v
       Outstanding
            |
            v
         Dashboard
```

---

## 4. Purchase Flow

```text
Supplier
   |
   v
Create Purchase
   |
   v
Add Products and Quantities
   |
   v
Select Stock Location
   |
   v
Save Purchase
   |
   v
Complete Purchase
   |
   v
Inventory Updated
```

Example: if 100 units are purchased, available stock increases by the relevant quantity when the purchase is completed.

---

## 5. Sales Flow

```text
Customer
   |
   v
Create Sale
   |
   v
Add Products and Quantities
   |
   v
Complete Sale
   |
   v
Inventory Updated
   |
   v
Customer Invoice
```

Example: if 20 units are sold, available stock decreases by 20 units when the sale is completed.

---

## 6. Customer Payment Flow

```text
Customer
   |
   v
Sale / Invoice
   |
   v
Customer Makes Payment
   |
   v
Payment Completed
   |
   v
Payment Allocated to Invoice
   |
   v
Outstanding Recalculated
```

Example:

```text
Invoice       ₹50,000
Payment       ₹30,000
Outstanding   ₹20,000
Status        Partially Paid
```

After the remaining ₹20,000 is paid:

```text
Invoice       ₹50,000
Total Paid    ₹50,000
Outstanding   ₹0
Status        Paid
```

---

## 7. Supplier Payment Flow

```text
Supplier
   |
   v
Purchase
   |
   v
Amount Payable
   |
   v
Supplier Payment
   |
   v
Payment Completed
```

---

## 8. Inventory Flow

```text
Opening Stock
     +
Purchases
     +
Stock In
     +
Transfers In
     +
Positive Adjustments
     -
Sales
     -
Stock Out
     -
Transfers Out
     -
Negative Adjustments
     =
Current Stock
```

Inventory is therefore based on business movements rather than being treated as an isolated manually maintained number.

---

## 9. Customer Outstanding Flow

```text
Completed Sales
       -
Payments Allocated to Sales
       =
Customer Outstanding
```

Each invoice can show:

- Total amount
- Amount paid
- Remaining amount
- Payment status

---

## 10. Dashboard Flow

```text
Sales -----------+
Purchases -------+
Expenses --------+
Payments --------+
Inventory -------+
Customers -------+
Products --------+
Suppliers -------+
                  |
                  v
             Dashboard
                  |
       +----------+----------+
       |          |          |
      KPIs      Trends    Activities
       |
       +--> Outstanding
       +--> Inventory
       +--> Top Products
       +--> Recent Transactions
```

The dashboard can also be used as a navigation point. For example, selecting the Sales summary takes the user to Sales, while selecting Inventory takes the user to Inventory.

---

## 11. Business Transaction Lifecycle

A typical transaction follows:

```text
Create
  |
  v
Review
  |
  v
Complete
  |
  v
Business Effect
```

For example:

```text
Purchase
   |
   v
Complete
   |
   v
Inventory increases
```

and:

```text
Sale
   |
   v
Complete
   |
   v
Inventory decreases
```

---

## 12. Validation and Business Controls

Important business rules are validated before transactions are accepted.

Examples include:

- Required information must be provided.
- Quantities and amounts must be valid.
- Customer payments require a customer.
- Supplier payments require a supplier.
- Customer payments cannot be assigned to suppliers.
- Supplier payments cannot be assigned to customers.
- Payments must be completed before they can be allocated.
- A payment cannot be allocated for more than the available payment amount.
- An invoice cannot receive more than its outstanding amount.
- The customer associated with a payment must match the customer on the invoice.

---

## 13. Interactive Features

Current interactive areas include:

- Dashboard data loaded from business data
- Dashboard period selection
- Clickable dashboard KPI cards
- Navigation from dashboard sections to business modules
- Search in business modules
- Create and edit forms
- Purchase completion
- Payment completion
- Success and error feedback
- Dynamic customer/supplier payment selection
- Customer outstanding information
- Invoice payment status
- Recent transaction information

---

## 14. Example End-to-End Business Scenario

### Step 1 – Purchase

The business purchases 100 units from a supplier.

After completing the purchase:

```text
Inventory: +100
```

### Step 2 – Sale

The business sells 30 units to a customer.

After completing the sale:

```text
Inventory: 100 - 30 = 70 units
```

### Step 3 – Customer Payment

The customer has an invoice of ₹50,000 and pays ₹30,000.

```text
Paid: ₹30,000
Outstanding: ₹20,000
Status: Partially Paid
```

### Step 4 – Remaining Payment

The customer later pays ₹20,000.

```text
Paid: ₹50,000
Outstanding: ₹0
Status: Paid
```

### Step 5 – Dashboard

The dashboard reflects the updated:

- Sales
- Payments
- Inventory
- Outstanding
- Recent activity

---

## 15. Project Value

The ERP provides a centralized view of business operations instead of requiring users to maintain separate records for purchases, sales, inventory, payments, expenses and customer dues.

The connected workflow helps the business maintain a consistent view of:

- What was purchased
- What was sold
- What stock is currently available
- What has been paid
- What remains outstanding
- What is happening across the business

---

## 16. Current Status

The dashboard crash issue has been resolved.

The dashboard is now connected to live business data and supports interactive navigation and data-driven sections.

The current integrated workflow is:

```text
Master Data
     ↓
Purchases / Sales
     ↓
Inventory
     ↓
Payments
     ↓
Outstanding
     ↓
Dashboard & Business Visibility
```

---

## 17. Future Enhancement Areas

Potential future enhancements include:

- Supplier outstanding tracking
- More advanced inventory valuation
- Historical sales-rate based product reporting
- Advanced financial/accounting reports
- Profit and loss reporting
- General ledger/accounting integration
- More advanced reporting and export functionality
- Role-based permissions and workflow controls
