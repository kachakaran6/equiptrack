# EquipTrack — Categorized Components & Multi-Component PDF Report

Implement a **Categorized Components and Multi-Component PDF Report** feature in the existing EquipTrack application.

Do not redesign or rebuild unrelated existing functionality. Reuse the existing component UI, database structure, component details page, and especially the existing **single-component PDF generation logic**.

## 1. Component Categories

Inside each Machine's Components page, add a **Create Category** option.

Users should be able to create categories such as Bearings, Motors, Pumps, Electrical, ABC, Side A, and Side B.

Each category belongs to the current machine.

The hierarchy should be:

```text
Machine
├── Category A
│   ├── Component 1
│   ├── Component 2
│   └── Component 3
├── Category B
│   ├── Component 4
│   └── Component 5
└── Uncategorized
    └── Component 6
```

## 2. Category UI

On the Machine Components page, replace the flat component list with category-based accordion sections.

Example:

```text
Machine 01

[ + Create Category ]

▼ Bearings (3)
   Component A
   Component B
   Component C

▼ Motors (2)
   Component D
   Component E

▶ Uncategorized (1)
```

Requirements:
- Categories must be expandable/collapsible accordions.
- Show the number of components in each category.
- Multiple categories can be expanded.
- Keep the existing component cards/list design inside the accordion.
- Preserve all existing component actions.

## 3. Component Category Assignment

Update the existing Create/Edit Component form to include a **Category** field.

```text
Category
[ Bearings ▼ ]
```

The dropdown should show only categories belonging to the current machine.

Allow **No Category / Uncategorized**.

A component can belong to one category only. Users must be able to move an existing component from one category to another.

## 4. Category CRUD

Users should be able to:
- Create category
- Edit category
- Delete category

Deleting a category must **not delete its components**. Its components should automatically become **Uncategorized**.

Prevent duplicate category names within the same machine.

## 5. Database

Add a category table:

```text
categories
-----------
id
machine_id
name
created_at
updated_at
```

Add to the existing component:

```text
category_id
```

Relationship:

```text
Machine 1 → Many Categories
Category 1 → Many Components
```

Existing components without a category must continue working and appear under **Uncategorized**.

The application uses shared/global data, so **all authenticated users can view and manage all machines, categories, and components**. Do not introduce user-specific ownership restrictions.

## 6. Multi-Component PDF Export

Add a PDF export option directly on the **Machine Components page**:

```text
[ Select for Report ]
```

Users can select:
- Individual components
- Multiple components
- Entire categories

Example:

```text
☑ Bearings
   ☑ Component A
   ☑ Component B
   ☐ Component C

[-] Motors
   ☑ Component D
   ☐ Component E
```

Selecting a category should select all components inside that category.

If only some components are selected, show an indeterminate/partial selection state.

Also provide:

```text
Select All
Clear Selection
```

## 7. Generate PDF

After selecting components, show:

```text
[ Generate PDF (3) ]
```

The number represents the selected components.

If no component is selected, prevent generation and show an appropriate validation message.

## 8. Combined PDF Requirement

When multiple components are selected, generate **ONE PDF file**, not separate PDF files.

For example:

```text
Component A
Component B
Component C
```

should generate:

```text
EquipTrack_Component_Report.pdf
```

with:

```text
Page 1 → Component A
Page 2 → Component B
Page 3 → Component C
```

Every component must have its own page.

## 9. Reuse Existing Single-Component PDF

This is critical.

The existing single-component PDF layout is the source of truth.

Do **not** create a new report design for the multi-component PDF.

Refactor the existing PDF generation logic into a reusable component report builder/service:

```text
Single Component
→ Existing PDF format

Multiple Components
→ Same existing component format
→ One component per page
→ One combined PDF
```

Future changes to the single-component PDF should automatically apply to the multi-component PDF.

## 10. PDF Ordering

The combined PDF should follow the component display order:

```text
Category order
    ↓
Component order
```

Example:

```text
Bearings
  Component A
  Component B

Motors
  Component C
  Component D
```

PDF:

```text
Page 1 → Component A
Page 2 → Component B
Page 3 → Component C
Page 4 → Component D
```

## 11. PDF Context

Each component page should retain the existing component report information, including where applicable:
- Machine name
- Category name
- Component name
- Existing component details
- Existing usage/history table
- Existing report formatting

Do not add unnecessary extra pages.

## 12. PDF UX

While generating:

```text
Generating PDF...
```

For large reports, show progress where practical.

After successful generation:

```text
PDF generated successfully.

[ Open ] [ Share ]
```

Use the device's native sharing functionality.

## 13. Existing Functionality

The existing single-component PDF export must continue working exactly as before.

The new functionality should simply add:

```text
Machine Components
        ↓
Select Multiple Components
        ↓
Generate One Combined PDF
```

Do not break existing:
- Component CRUD
- Component details
- Usage records
- Single-component reports
- Machine functionality

## 14. Final Expected Flow

```text
Machine
   ↓
Components
   ↓
Categories
   ↓
Components inside categories
   ↓
Select for Report
   ↓
Select categories/components
   ↓
Generate PDF
   ↓
One PDF
   ↓
One component per page
```

Implement this feature cleanly using the existing EquipTrack architecture and coding conventions. Avoid unnecessary duplication and keep the PDF generation logic reusable.
