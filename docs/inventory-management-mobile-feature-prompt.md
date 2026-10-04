# Inventory Management Feature — Mobile Application Implementation Prompt

## Objective

Add a complete **Inventory Management module** to the existing mobile application.

This feature must integrate cleanly with the existing application, database, authentication, navigation, API architecture, and design system.

**Important:** This is a **mobile application**, so all screens, forms, dialogs, lists, accordions, tables, buttons, and reports must be designed primarily for mobile touch interaction.

Do not rewrite or break existing functionality. Reuse the existing application architecture, components, services, authentication, database patterns, and UI conventions wherever possible.

---

# 1. Main Features

The Inventory Management module must support:

- Main Products
- Dynamic/custom product fields
- Sub Products
- Stock In
- Stock Out
- Current stock tracking
- Inventory transaction history
- Editing transactions
- Deleting transactions
- Editing products and sub products
- Safe deletion/archive behavior
- Inventory reports
- PDF export
- Excel export
- Search
- Filtering
- Mobile-friendly UI

---

# 2. Main Product

A Main Product must have:

### Required Field

- Product Name

### Dynamic Fields

Each product can have unlimited custom fields called **Other Fields**.

The user must be able to add as many custom labels as required.

Example:

```text
Product Name
Laptop

Other Fields
- Brand
- Model
- RAM
- Storage
- Processor
- Color
```

Another product can have completely different fields:

```text
Product Name
Mobile Phone

Other Fields
- Brand
- Model
- Storage
- RAM
- Color
- SIM Type
```

Do not hardcode any custom fields.

---

# 3. Create Product — Mobile UI

Create a mobile-friendly product form.

Example:

```text
Create Product

Product Name
[____________________]

Other Fields

Brand
[____________________] [Delete]

Model
[____________________] [Delete]

RAM
[____________________] [Delete]

[ + Add Other Field ]

[ Cancel ] [ Create ]
```

Requirements:

- Product Name is required.
- Custom field labels cannot be empty.
- Duplicate labels should not be allowed within the same product.
- User can add unlimited custom fields.
- User can remove fields before saving.
- User can edit fields later.
- Use mobile-friendly input sizes and touch targets.

The keyboard should not unnecessarily cover the active input.

---

# 4. Sub Products

Every Main Product can contain multiple Sub Products.

A Sub Product must contain all custom fields defined by its parent Main Product.

Example:

### Main Product

```text
Laptop
```

### Custom Fields

```text
Brand
Model
RAM
Storage
Color
```

### Sub Product Form

```text
Create Sub Product

Brand
[ Dell ]

Model
[ Latitude 5420 ]

RAM
[ 16 GB ]

Storage
[ 512 GB SSD ]

Color
[ Black ]

[ Create Sub Product ]
```

The user can enter any value into these fields.

Custom field values must be stored against the specific Sub Product.

---

# 5. Dynamic Field Behavior

Custom fields belong to the Main Product.

When creating a Sub Product:

1. Fetch the parent's custom fields.
2. Dynamically generate an input for every field.
3. Store the entered value.
4. Allow values to be edited later.
5. Do not hardcode field names.
6. Preserve existing values when possible if custom field labels are changed.

For example, if:

```text
RAM
```

is renamed to:

```text
Memory
```

existing Sub Product values must not be lost.

---

# 6. Main Inventory Screen

Create the main Inventory screen using a mobile-friendly accordion/list structure.

Example:

```text
Inventory

[ Search inventory... ]

▼ Laptop
   Dell Latitude 5420

   Brand: Dell
   Model: Latitude 5420
   RAM: 16 GB
   Storage: 512 GB

   [ − ]     25     [ + ]

   HP EliteBook

   Brand: HP
   Model: 840 G8
   RAM: 16 GB

   [ − ]     10     [ + ]

▶ Mobile Phone

▶ Keyboard
```

Requirements:

- All Main Products appear as accordion sections.
- Tapping the Main Product expands/collapses it.
- Sub Products appear inside their parent Product.
- Display relevant custom field values.
- Display current stock.
- Keep the UI compact and easy to use on a phone.
- Use touch-friendly controls.

Do not force a desktop-style wide table onto a mobile screen.

---

# 7. Sub Product Stock Controls

Every Sub Product must have:

```text
[ − ]   Current Stock   [ + ]
```

The controls must be large enough for comfortable touch interaction.

Example:

```text
Dell Latitude 5420

Brand: Dell
Model: Latitude 5420
RAM: 16 GB

        [ − ]   25   [ + ]
```

Where:

- `+` = Stock In
- `−` = Stock Out
- Number = Current Stock

Current stock must always be accurate.

Unless the existing business rules explicitly allow negative inventory, Stock Out must never make stock negative.

---

# 8. Stock In

When the user taps `+`, open a mobile-friendly modal, bottom sheet, or full-screen form depending on the existing application's UI architecture.

Title:

**Add Inventory**

Fields:

### Quantity

- Numeric input
- Required
- Must be greater than 0

### Date

- Date picker
- Required
- Default to current date where appropriate

### Remarks

- Multiline text input
- Optional

Example:

```text
Add Inventory

Quantity
[ 10 ]

Date
[ 04/10/2026 ]

Remarks
[ Received from supplier ]

[ Cancel ] [ Add Stock ]
```

On submission:

1. Validate input.
2. Create an inventory transaction.
3. Set transaction type to `IN`.
4. Increase inventory.
5. Refresh/update the current stock.
6. Show success feedback.
7. Add the transaction to inventory history.

---

# 9. Stock Out

When the user taps `−`, show a similar mobile form.

Title:

**Remove Inventory**

Fields:

```text
Quantity
[ 5 ]

Date
[ 04/10/2026 ]

Remarks
[ Sold to customer ]

[ Cancel ] [ Remove Stock ]
```

On submission:

1. Validate quantity.
2. Check available stock.
3. Prevent the transaction if quantity exceeds available stock.
4. Create an `OUT` transaction.
5. Reduce stock.
6. Update the UI.
7. Show success feedback.
8. Add the transaction to history.

---

# 10. Inventory Transactions

Every Stock In/Stock Out operation must create a permanent transaction record.

Minimum fields:

```text
Transaction ID
Sub Product ID
Transaction Type
Quantity
Date
Remarks
Created At
Updated At
```

Transaction type:

```text
IN
OUT
```

Do not only store the current stock.

The transaction history is the source of truth for inventory changes.

---

# 11. Stock Calculation

Current stock should be calculated as:

```text
Current Stock = Total IN Quantity - Total OUT Quantity
```

Example:

```text
IN  +10
IN  +20
OUT -5
IN  +15
OUT -10

Current Stock = 30
```

Stock must remain consistent across:

- Inventory screen
- Sub Product details
- Reports
- PDF export
- Excel export

Use database-level aggregation/server-side calculations where appropriate instead of inefficient frontend calculations.

---

# 12. Sub Product Details

When the user taps a Sub Product, open a mobile-friendly details screen, bottom sheet, or modal.

Prefer a dedicated details screen if that fits the existing navigation architecture.

Display:

## Sub Product Information

- Main Product
- Sub Product
- All custom fields
- All custom field values
- Current stock

## Inventory History

Use mobile cards or a responsive list rather than a wide desktop table.

Example:

```text
Inventory History

┌──────────────────────────┐
│ IN                       │
│ Quantity: 50             │
│ Date: 04/10/2026         │
│ Remarks: Initial stock   │
│                          │
│ Edit        Delete       │
└──────────────────────────┘

┌──────────────────────────┐
│ OUT                      │
│ Quantity: 10             │
│ Date: 05/10/2026         │
│ Remarks: Sold            │
│                          │
│ Edit        Delete       │
└──────────────────────────┘
```

Clearly distinguish IN and OUT visually using the existing application design system.

---

# 13. Transaction Editing

Every inventory transaction must be editable.

Editable fields:

- Quantity
- Date
- Remarks

Example:

```text
Edit Inventory Transaction

Quantity
[ 20 ]

Date
[ 04/10/2026 ]

Remarks
[ Supplier delivery ]

[ Cancel ] [ Save ]
```

After editing:

- Recalculate inventory correctly.
- Update current stock.
- Update history.
- Update reports.
- Update exports.

Do not simply manually modify the current stock.

The resulting stock must come from the complete transaction history.

---

# 14. Transaction Deletion

Every inventory transaction must be deletable.

Before deletion, show a mobile confirmation dialog:

```text
Delete Transaction?

Are you sure you want to delete this transaction?

This will affect the current stock.

[ Cancel ] [ Delete ]
```

After deletion:

- Delete the transaction.
- Recalculate stock.
- Refresh UI.
- Update reports.
- Update exports.

Do not leave inconsistent stock values.

---

# 15. Sub Product Editing

Users must be able to edit Sub Products.

Editable:

- Custom field values

Example:

```text
Edit Sub Product

Brand
[ Dell ]

Model
[ Latitude 5420 ]

RAM
[ 32 GB ]

Storage
[ 1 TB ]

Color
[ Black ]

[ Cancel ] [ Save Changes ]
```

Do not modify stock from this form.

Stock changes must happen only through inventory transactions.

---

# 16. Sub Product Deletion

Users must be able to delete Sub Products safely.

If the Sub Product has transaction history, do not permanently delete it in a way that destroys historical reporting.

Preferred approach:

- Prevent deletion when historical transactions exist, or
- Use soft-delete/archive.

Choose the approach that fits the existing architecture best.

---

# 17. Main Product Editing

Users must be able to edit Main Products.

Supported operations:

- Rename Product.
- Add Other Fields.
- Rename Other Fields.
- Remove Other Fields where safe.

Do not silently delete existing Sub Product data when changing custom fields.

If a custom field is renamed, existing values should remain connected to the renamed field.

---

# 18. Search

Add search to the main Inventory screen.

Example:

```text
[ 🔍 Search inventory... ]
```

Search should support, where practical:

- Main Product name
- Sub Product values
- Custom field values

Example:

Searching:

```text
Dell
```

should find:

```text
Brand: Dell
```

Use debouncing if searches trigger API requests.

---

# 19. Filtering

Provide mobile-friendly filters.

Possible filters:

- Product
- Sub Product
- Transaction Type
- Date range

Use a filter button that opens a bottom sheet or dedicated filter screen.

Example:

```text
[ Filters ]

Filters

Product
[ All Products ]

Type
[ All | IN | OUT ]

Date
[ Start Date ] - [ End Date ]

[ Reset ] [ Apply ]
```

---

# 20. Inventory Reports

Provide an inventory report screen.

Inventory summary should contain:

```text
Product
Sub Product
Custom Fields
Current Stock
Total Stock In
Total Stock Out
```

Transaction report should contain:

```text
Product
Sub Product
Transaction Type
Quantity
Date
Remarks
```

Allow filtering by:

- Product
- Sub Product
- Transaction Type
- Date range

Design reports specifically for mobile.

If a table is too wide, use expandable cards or horizontal scrolling rather than making text unreadable.

---

# 21. Excel Export

Provide:

**Export Excel**

The export should contain clean tabular data.

Recommended sheets:

### Inventory Summary

```text
Product
Sub Product
Custom Fields
Current Stock
Total In
Total Out
```

### Transactions

```text
Product
Sub Product
Transaction Type
Quantity
Date
Remarks
```

Dynamic custom fields should become columns where practical.

Example:

```text
Product | Sub Product | Brand | Model | RAM | Stock
```

The export should respect active filters where appropriate.

---

# 22. PDF Export

Provide:

**Export PDF**

The PDF should be professionally formatted.

Include:

- Application name/logo if available
- Report title
- Generated date
- Active filters
- Inventory summary
- Transaction details where relevant

If exporting a specific Sub Product, the PDF should focus on that Sub Product and its inventory history.

The PDF generation should work reliably from the mobile application.

If the existing backend already handles document generation, prefer generating the file through the backend rather than adding unnecessary heavy processing to the mobile client.

---

# 23. Database Structure

Use the existing application's database technology and conventions.

Recommended conceptual schema:

## Product

```text
id
name
createdAt
updatedAt
```

## Product Custom Field

```text
id
productId
label
position
createdAt
updatedAt
```

## Sub Product

```text
id
productId
createdAt
updatedAt
```

## Sub Product Custom Value

```text
id
subProductId
customFieldId
value
createdAt
updatedAt
```

## Inventory Transaction

```text
id
subProductId
type
quantity
date
remarks
createdAt
updatedAt
```

Where:

```text
type = IN | OUT
```

Add appropriate:

- Foreign keys
- Indexes
- Unique constraints
- Validation
- Cascade/restrict rules

Do not introduce another database technology.

---

# 24. Data Integrity

Inventory changes are critical and must be atomic.

For Stock In/Stock Out:

```text
Create transaction
+
Update/recalculate inventory
```

must not partially succeed.

Use database transactions where supported.

Avoid:

```text
Transaction created
but stock failed
```

or:

```text
Stock updated
but transaction failed
```

The backend must validate important inventory rules.

---

# 25. API / Backend

Follow the existing backend architecture.

Create/reuse services and endpoints for:

## Products

```text
Create Product
Get Products
Get Product
Update Product
Delete Product
```

## Sub Products

```text
Create Sub Product
Get Sub Products
Get Sub Product
Update Sub Product
Delete Sub Product
```

## Inventory

```text
Add Stock
Remove Stock
Get Inventory History
Update Transaction
Delete Transaction
```

## Reports

```text
Get Inventory Summary
Get Inventory Transactions
Export Inventory
```

Do not duplicate business logic unnecessarily between mobile client and backend.

Inventory calculations and critical validation must happen server-side.

---

# 26. Mobile Navigation

Integrate the Inventory module into the existing mobile application's navigation.

Use the existing navigation system.

Possible structure:

```text
Inventory
│
├── Product List
│
├── Product Details
│
├── Create Product
│
├── Edit Product
│
├── Create Sub Product
│
├── Sub Product Details
│
├── Inventory Transaction
│
└── Reports
```

Do not introduce a second navigation architecture.

Use the application's existing:

- Stack navigation
- Tabs
- Drawer
- Routing
- Back navigation

as applicable.

The Android back button/system back gesture must behave correctly.

---

# 27. Mobile UX Requirements

The application must be designed primarily for touch.

Requirements:

- Comfortable touch targets.
- Avoid tiny buttons.
- Use appropriate mobile spacing.
- Use native/mobile-friendly date pickers where available.
- Use numeric keyboard for quantity.
- Use multiline input for remarks.
- Keep forms scrollable when the keyboard opens.
- Avoid content being hidden behind the keyboard.
- Support Android back navigation.
- Show loading indicators during network operations.
- Prevent duplicate submissions by disabling submit buttons while requests are running.
- Use pull-to-refresh where appropriate.
- Preserve scroll position where practical.
- Use confirmation dialogs for destructive actions.

---

# 28. Loading, Empty and Error States

Implement proper states.

## Loading

Use existing skeleton/loading components where available.

## Empty Inventory

```text
No products found.

Create your first product to start managing inventory.

[ + Add Product ]
```

## Empty Sub Products

```text
No sub products found.

[ + Add Sub Product ]
```

## Empty Transaction History

```text
No inventory transactions yet.
```

## Error

Show user-friendly error messages.

Never expose raw database or backend errors.

## Success

Show a toast/snackbar or equivalent mobile feedback after:

- Product creation
- Product update
- Product deletion
- Sub Product creation
- Sub Product update
- Stock In
- Stock Out
- Transaction update
- Transaction deletion
- Export

---

# 29. Authentication and Permissions

Use the existing authentication system.

Do not create another authentication system.

Follow existing permissions for:

- Product creation
- Product editing
- Product deletion
- Sub Product management
- Inventory management
- Reports
- Export

If the current application allows all authenticated users to access the same inventory data, preserve that behavior.

---

# 30. Performance

The application may eventually contain many:

- Products
- Sub Products
- Transactions

Therefore:

- Avoid loading unnecessary transaction history.
- Load transaction history when the user opens a Sub Product.
- Use pagination for large histories.
- Use database aggregation for stock.
- Add indexes to frequently queried fields.
- Avoid N+1 queries.
- Avoid loading every transaction on the main inventory screen.
- Cache/refresh data appropriately according to the existing architecture.

---

# 31. Auditability

Inventory changes must be traceable.

Every transaction should preserve:

- Transaction type
- Quantity
- Date
- Remarks
- Created timestamp
- Updated timestamp

If the existing application has audit logging, integrate inventory operations with it.

---

# 32. Business Rules

Implement these rules consistently:

1. Product Name is required.
2. Custom field labels cannot be empty.
3. Duplicate custom field labels are not allowed within one Product.
4. Sub Products must belong to a Main Product.
5. Sub Products inherit their parent's custom fields.
6. Custom field values can contain arbitrary user-entered values.
7. Quantity must be greater than zero.
8. Stock Out cannot exceed available stock unless negative inventory is explicitly supported.
9. Every Stock In/Out creates a transaction.
10. Editing a transaction correctly recalculates stock.
11. Deleting a transaction correctly recalculates stock.
12. Current stock must always match transaction history.
13. Historical data must not be silently destroyed.
14. Important validation must happen server-side.
15. Inventory changes must be atomic.
16. Existing application functionality must remain unaffected.

---

# 33. Example Complete Flow

## Step 1 — Create Product

```text
Product Name
Laptop

Other Fields
Brand
Model
RAM
Storage
Color
```

## Step 2 — Create Sub Product

```text
Brand: Dell
Model: Latitude 5420
RAM: 16 GB
Storage: 512 GB
Color: Black
```

## Step 3 — Inventory Screen

```text
▼ Laptop

Dell Latitude 5420

Brand: Dell
Model: Latitude 5420
RAM: 16 GB
Storage: 512 GB
Color: Black

[ − ]   0   [ + ]
```

## Step 4 — Add Stock

Tap `+`.

```text
Quantity: 50
Date: 04/10/2026
Remarks: Initial inventory
```

Stock becomes:

```text
50
```

## Step 5 — Remove Stock

Tap `−`.

```text
Quantity: 10
Date: 05/10/2026
Remarks: Sold
```

Stock becomes:

```text
40
```

## Step 6 — Open Sub Product

Show:

```text
Dell Latitude 5420

Current Stock: 40

Inventory History

IN   50   04/10/2026   Initial inventory
OUT  10   05/10/2026   Sold
```

## Step 7 — Edit Transaction

Change:

```text
OUT 10
```

to:

```text
OUT 15
```

Current stock becomes:

```text
35
```

## Step 8 — Export

Allow:

```text
Export PDF
Export Excel
```

---

# 34. Testing Requirements

Test all Product operations:

- Create
- Read
- Update
- Delete
- Add custom fields
- Remove custom fields
- Rename custom fields
- Duplicate field validation

Test all Sub Product operations:

- Create
- Read
- Update
- Delete/archive
- Dynamic field rendering
- Custom value storage

Test inventory:

```text
Initial stock = 0

IN 100 → Stock = 100
IN 50  → Stock = 150
OUT 30 → Stock = 120
OUT 20 → Stock = 100
```

Edit:

```text
OUT 20 → OUT 40
Stock = 80
```

Delete:

```text
Delete OUT 40
Stock = 120
```

Also test:

- Stock Out greater than available stock
- Quantity = 0
- Negative quantity
- Missing date
- Invalid date
- Missing required fields
- Duplicate submissions
- Network failure
- App navigation/back behavior
- Mobile keyboard behavior
- Large transaction history
- PDF export
- Excel export

---

# 35. Acceptance Criteria

The feature is complete only when:

- Main Products can be created with unlimited custom fields.
- Sub Products can be created under Main Products.
- Sub Products automatically use the parent's custom fields.
- Custom field values are editable.
- Main Products are displayed as mobile-friendly accordions.
- Sub Products appear inside their respective Product.
- Every Sub Product displays:
  - Minus button
  - Current stock
  - Plus button
- Plus creates Stock In transactions.
- Minus creates Stock Out transactions.
- Every transaction contains:
  - Quantity
  - Date
  - Remarks
  - Transaction type
- Tapping a Sub Product shows complete inventory history.
- Transactions can be edited.
- Transactions can be deleted safely.
- Stock is always calculated correctly.
- Negative inventory is prevented unless explicitly supported.
- Products and Sub Products can be edited/deleted safely.
- Inventory reports are available.
- Inventory can be exported to Excel.
- Inventory can be exported to PDF.
- Existing authentication and permissions are respected.
- UI follows the existing mobile application's design system.
- The feature works properly on different mobile screen sizes.
- Database operations maintain data integrity.
- No unnecessary duplicate architecture is introduced.
- Existing application functionality continues to work.

---

# 36. Implementation Instructions for the Coding Agent

Before writing code:

1. Inspect the existing project structure.
2. Identify the mobile framework being used.
3. Identify the backend/API architecture.
4. Identify the database.
5. Identify the authentication system.
6. Identify the existing navigation system.
7. Identify existing reusable UI components.
8. Identify existing form/validation patterns.
9. Identify existing export/report functionality.
10. Inspect existing database models and relationships.

Then implement the feature using the existing architecture.

### Do not:

- Replace the existing architecture unnecessarily.
- Introduce a second authentication system.
- Introduce a second database.
- Hardcode custom product fields.
- Hardcode stock values.
- Calculate critical inventory rules only on the client.
- Break existing screens.
- Create a desktop-first UI for a mobile application.
- Duplicate existing services/components unnecessarily.

### Prioritize:

- Data integrity
- Maintainability
- Mobile UX
- Performance
- Reusability
- Clear validation
- Safe inventory calculations
- Clean navigation
- Consistency with the existing application

**First inspect the existing application, then implement the feature.**
