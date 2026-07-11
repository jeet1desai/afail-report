# Main Sheet Report Generator (Go Script)

This directory contains a Go script to process the large shipment data spreadsheet (`Main Sheet.XLSX`) using plant master mappings (`Plants.csv`). It performs the exact same calculations as the "Generate Report" button in the React UI but does so offline and updates `Main Sheet.XLSX` in-place.

## Files

- `main.go`: The Go script source file.
- `go.mod` / `go.sum`: Go module definitions and locked package hashes.
- `Plants.csv`: Plant master data mapping file.
- `Main Sheet.XLSX`: The main sheet data file (updated in-place).

---

## Calculations Performed

For each row in the Excel sheet:

1.  **Message test2**:
    - Splits the `Message text` column by `:` and takes the first part.
    - If `Message text` is empty or the first part is empty, it defaults to `"Processed Successfully"`.
2.  **CT Flag**:
    - Splits `Message text` by `:` and takes the second part.
    - Splits the second part by `_` and extracts the 4th element (index 3).
    - If the value is in `["DE", "DC", "IT", "MTK"]`, it is ignored (written as empty string `""`).
3.  **Plant Lookup (`Mode`, `Digipin L6`, `Plant Name`)**:
    - Looks up the `Plant` code from the Excel row in `Plants.csv` (case-insensitively).
    - If a match is found:
      - `Mode` is set to the plant's mode.
      - `Digipin L6` is set to the plant's `plant_digi6`.
      - `Plant Name` is set to `digipin_plant_location` (if `Mode` is `"Primary"`) or `digipin_facility` (if otherwise).
    - If no match is found, these fields are left blank.

---

## How to Run

### Prerequisites

- [Go](https://go.dev/) installed (version 1.20+ recommended).

### Running the Script

Open your terminal, navigate to the `src/script` directory, and run:

```bash
go run main.go
```

The script will:

1. Load `Plants.csv`.
2. Open `Main Sheet.XLSX`.
3. Auto-detect if columns `Mode`, `Digipin L6`, `Plant Name`, `Message test2`, and `CT Flag` already exist. If any are missing, it appends them to the end of the sheet.
4. Process rows, displaying progress for every 5,000 rows.
5. Save the updated spreadsheet in-place.

### Building an Executable

To compile the script into a standalone binary:

```bash
go build -o generate_report
./generate_report
```

---

## Offline / Proxy Cache Troubleshooting

If you are compiling or resolving dependencies in a restricted network environment, use the local module cache as the Go proxy:

```bash
# Locate your GOMODCACHE path
go env GOMODCACHE # default: ~/go/pkg/mod

# Run tidy / build pointing to your local download cache
GOPROXY=file://$(go env GOPATH)/pkg/mod/cache/download go mod tidy
```

---

## ⚠️ Important Note

Since this script modifies `Main Sheet.XLSX` **in-place**, always make a backup copy of your Excel file before running it:

```bash
cp "Main Sheet.XLSX" "Main Sheet.XLSX.bak"
```
