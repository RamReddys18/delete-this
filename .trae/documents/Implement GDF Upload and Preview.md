## Goal
Enable uploading a `.gdf` file and show a full preview: parsed nodes/edges tables and an interactive graph visualization. All processing stays client-side.

## Features
1. Upload `.gdf` via file picker and drag-and-drop
2. Parse GDF (nodedef/edgedef sections, typed columns, rows)
3. Preview tables: nodes and edges with sortable columns
4. Graph view: pan/zoom, fit-to-screen, select node to highlight neighbors
5. Error handling: invalid format, large files, missing sections
6. No server; privacy-safe local parsing

## Tech Choice
- Minimal single-page web app (HTML/CSS/JS) to avoid framework dependencies
- Graph rendering with `vis-network` via CDN for fast, reliable network visualization
- Modular JS: `gdfParser.js` and `graphRenderer.js`

## Parsing Implementation
1. Read file as text with `FileReader`
2. Split lines; trim BOM if present
3. Identify `nodedef>` header; parse column names/types (e.g., `name VARCHAR`, `label VARCHAR`, numeric types)
4. Parse node rows respecting CSV rules (quoted values, commas)
5. Identify `edgedef>` header; parse edge columns (e.g., `node1`, `node2`, `weight`)
6. Build normalized data structures:
   - `nodes: Array<{id: string, label?: string, [attrs]: any}>`
   - `edges: Array<{from: string, to: string, weight?: number, [attrs]: any}>`
7. Validate: ensure ids exist; coerce types; collect parse warnings

## Rendering Implementation
1. Tables: render nodes and edges with fixed header; paginate for large datasets
2. Graph: transform to `vis-network` format (`nodes[{id,label}]`, `edges[{from,to, label/weight}]`)
3. Layout: use physics-based layout with stabilizing; provide controls to toggle physics and fit
4. Interaction: select nodes to highlight neighbors; tooltip on hover with attributes

## UI/UX
- Two tabs: "Graph" and "Tables"
- Controls: upload button, drag area, fit-to-screen, physics toggle, search node by id/label
- Status bar: file name, node/edge counts, parse warnings

## Error Handling
- Detect unsupported or missing `nodedef`/`edgedef`; show message
- Gracefully handle very large files (basic pagination and physics off by default)
- Fallback to text preview if parsing fails

## Validation
- Use sample `.gdf` files to verify parsing and rendering
- Test edge cases: quotes, extra attributes, missing labels, integer/float types

## Files
- `index.html`: structure, file input, tabs, containers
- `styles.css`: layout and basic styling
- `gdfParser.js`: robust GDF parser returning `{nodes, edges, warnings}`
- `graphRenderer.js`: `vis-network` setup and interactions
- `app.js`: glue code (upload, parse, render, state)

## Deliverable
A self-contained folder you can open in a browser, select a `.gdf`, and immediately see a full preview (tables + interactive graph). If your files use `.dgf` instead, we will accept both `.gdf` and `.dgf` extensions.

## After Approval
- Implement the files, wire the UI, and verify with sample GDFs
- Provide guidance on running locally (open `index.html` or serve statically)