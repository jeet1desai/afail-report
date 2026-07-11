package main

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/xuri/excelize/v2"
)

type Plant struct {
	Mode                 string
	PlantDigi6           string
	DigipinPlantLocation string
	DigipinFacility      string
}

func normalizeHeader(h string) string {
	h = strings.ToLower(h)
	var sb strings.Builder
	for _, r := range h {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			sb.WriteRune(r)
		} else {
			sb.WriteRune(' ')
		}
	}
	return strings.Join(strings.Fields(sb.String()), " ")
}


func findColumn(headers []string, patterns []string) int {
	for idx, header := range headers {
		norm := normalizeHeader(header)
		for _, pattern := range patterns {
			normPattern := normalizeHeader(pattern)
			if norm == normPattern {
				return idx
			}
		}
	}
	return -1
}

func getExactHeader(headers []string, patterns []string, defaultVal string) string {
	idx := findColumn(headers, patterns)
	if idx >= 0 && idx < len(headers) {
		return headers[idx]
	}
	return defaultVal
}

type OutputCol struct {
	FieldName string
	Patterns  []string
	Index     int
	ColName   string
}

func recreateSheet(f *excelize.File, name string) {
	for _, sheet := range f.GetSheetList() {
		if sheet == name {
			if err := f.DeleteSheet(name); err != nil {
				log.Fatalf("failed to delete existing sheet %s: %v", name, err)
			}
			break
		}
	}
	if _, err := f.NewSheet(name); err != nil {
		log.Fatalf("failed to create new sheet %s: %v", name, err)
	}
}

func main() {
	// 1. Get execution directory or files relative to script
	execDir, err := os.Getwd()
	if err != nil {
		log.Fatalf("failed to get current working directory: %v", err)
	}

	plantsPath := filepath.Join(execDir, "Plants.csv")
	mainSheetPath := filepath.Join(execDir, "Main Sheet.XLSX")

	fmt.Printf("Loading plants data from: %s\n", plantsPath)
	fmt.Printf("Loading main sheet from: %s\n", mainSheetPath)

	// 2. Open and parse Plants.csv
	csvFile, err := os.Open(plantsPath)
	if err != nil {
		log.Fatalf("failed to open Plants.csv: %v", err)
	}
	defer csvFile.Close()

	reader := csv.NewReader(csvFile)
	records, err := reader.ReadAll()
	if err != nil {
		log.Fatalf("failed to read Plants.csv: %v", err)
	}

	if len(records) == 0 {
		log.Fatalf("Plants.csv is empty")
	}

	csvHeaders := records[0]
	plantCodeIdx := findColumn(csvHeaders, []string{"plant code", "plantcode", "plant_code"})
	modeIdx := findColumn(csvHeaders, []string{"mode"})
	plantDigi6Idx := findColumn(csvHeaders, []string{"plant digi6", "plant_digi6", "plantdigi6"})
	digipinPlantLocationIdx := findColumn(csvHeaders, []string{"digipin plant location", "digipin_plant_location", "digipinplantlocation"})
	digipinFacilityIdx := findColumn(csvHeaders, []string{"digipin facility", "digipin_facility", "digipinfacility"})

	if plantCodeIdx == -1 || modeIdx == -1 || plantDigi6Idx == -1 || digipinPlantLocationIdx == -1 || digipinFacilityIdx == -1 {
		log.Fatalf("Plants.csv missing required headers. Headers found: %v", csvHeaders)
	}

	plantMap := make(map[string]Plant)
	for i := 1; i < len(records); i++ {
		row := records[i]
		if len(row) <= plantCodeIdx || len(row) <= modeIdx || len(row) <= plantDigi6Idx || len(row) <= digipinPlantLocationIdx || len(row) <= digipinFacilityIdx {
			continue
		}
		code := strings.ToUpper(strings.TrimSpace(row[plantCodeIdx]))
		if code == "" {
			continue
		}
		plantMap[code] = Plant{
			Mode:                 strings.TrimSpace(row[modeIdx]),
			PlantDigi6:           strings.TrimSpace(row[plantDigi6Idx]),
			DigipinPlantLocation: strings.TrimSpace(row[digipinPlantLocationIdx]),
			DigipinFacility:      strings.TrimSpace(row[digipinFacilityIdx]),
		}
	}
	fmt.Printf("Loaded %d plant mappings successfully.\n", len(plantMap))

	// 3. Open Main Sheet.XLSX
	f, err := excelize.OpenFile(mainSheetPath)
	if err != nil {
		log.Fatalf("failed to open Main Sheet.XLSX: %v", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		log.Fatalf("no sheets found in Main Sheet.XLSX")
	}
	sheetName := sheets[0]
	fmt.Printf("Processing sheet: %s\n", sheetName)

	// Get all rows
	rows, err := f.GetRows(sheetName)
	if err != nil {
		log.Fatalf("failed to read rows from sheet %s: %v", sheetName, err)
	}

	if len(rows) == 0 {
		log.Fatalf("Main Sheet.XLSX sheet %s has no rows", sheetName)
	}

	headers := rows[0]

	plantIdx := findColumn(headers, []string{"plant", "plnt"})
	messageTextIdx := findColumn(headers, []string{"message text", "messagetext", "message_text", "message"})

	if plantIdx == -1 {
		log.Fatalf("required column 'Plant' not found in main sheet headers")
	}
	if messageTextIdx == -1 {
		log.Fatalf("required column 'Message text' not found in main sheet headers")
	}

	outputCols := []*OutputCol{
		{FieldName: "Mode", Patterns: []string{"mode"}, Index: -1},
		{FieldName: "Digipin L6", Patterns: []string{"digipin l6", "digipin_l6", "digipinl6"}, Index: -1},
		{FieldName: "digipin_facility", Patterns: []string{"digipin_facility", "digipin facility", "digipinfacility", "plant name", "plant_name", "plantname"}, Index: -1},
		{FieldName: "Message text2", Patterns: []string{"message text2", "message_text2", "messagetext2", "message text 2", "message_text_2", "messageText2", "message test2", "message_test2", "messagetest2"}, Index: -1},
		{FieldName: "CT Flag", Patterns: []string{"ct flag", "ct_flag", "ctflag"}, Index: -1},
	}

	nextColIdx := len(headers)
	for _, col := range outputCols {
		col.Index = findColumn(headers, col.Patterns)
		if col.Index == -1 {
			col.Index = nextColIdx
			nextColIdx++
			colName, err := excelize.ColumnNumberToName(col.Index + 1)
			if err != nil {
				log.Fatalf("failed to convert column index to name: %v", err)
			}
			col.ColName = colName
			cellCoord := fmt.Sprintf("%s1", col.ColName)
			if err := f.SetCellValue(sheetName, cellCoord, col.FieldName); err != nil {
				log.Fatalf("failed to set header value %s: %v", col.FieldName, err)
			}
			fmt.Printf("Added missing output column: %s at %s\n", col.FieldName, cellCoord)
		} else {
			colName, err := excelize.ColumnNumberToName(col.Index + 1)
			if err != nil {
				log.Fatalf("failed to convert column index to name: %v", err)
			}
			col.ColName = colName
			// Ensure it has the correct normalized name (e.g. rename "Plant Name" -> "digipin_facility")
			cellCoord := fmt.Sprintf("%s1", col.ColName)
			if err := f.SetCellValue(sheetName, cellCoord, col.FieldName); err != nil {
				log.Fatalf("failed to update header value to %s: %v", col.FieldName, err)
			}
		}
	}

	getCellString := func(row []string, idx int) string {
		if idx >= 0 && idx < len(row) {
			return strings.TrimSpace(row[idx])
		}
		return ""
	}

	// 4. Update data rows in-place
	totalRows := len(rows)
	fmt.Printf("Beginning in-place report generation for %d data rows...\n", totalRows-1)

	for i := 2; i <= totalRows; i++ {
		row := rows[i-1]

		plantCode := strings.ToUpper(getCellString(row, plantIdx))
		messageText := getCellString(row, messageTextIdx)

		// A. Split Message Text
		messageText2 := ""
		if messageText == "" {
			messageText2 = "Processed Successfully"
		} else {
			parts := strings.Split(messageText, ":")
			firstPart := ""
			if len(parts) > 0 {
				firstPart = strings.TrimSpace(parts[0])
			}
			if firstPart == "" {
				messageText2 = "Processed Successfully"
			} else {
				messageText2 = firstPart
			}
		}

		// B. Plant Lookup
		mode := ""
		digipinL6 := ""
		plantName := ""

		if matchedPlant, ok := plantMap[plantCode]; ok {
			mode = matchedPlant.Mode
			digipinL6 = matchedPlant.PlantDigi6
			if mode == "Primary" {
				plantName = matchedPlant.DigipinPlantLocation
			} else {
				plantName = matchedPlant.DigipinFacility
			}
		}

		// C. Fetch CT Flag
		ctFlagValue := ""
		partsForCT := strings.Split(messageText, ":")
		if len(partsForCT) > 1 {
			secondPart := partsForCT[1]
			subParts := strings.Split(secondPart, "_")
			if len(subParts) > 3 {
				ctFlagValue = strings.TrimSpace(subParts[3])
			}
		}

		excludedFlags := map[string]bool{
			"DE": true, "DC": true, "IT": true, "MTK": true,
		}
		if excludedFlags[ctFlagValue] {
			ctFlagValue = ""
		}

		// Write values
		for _, col := range outputCols {
			var val string
			switch col.FieldName {
			case "Mode":
				val = mode
			case "Digipin L6":
				val = digipinL6
			case "digipin_facility":
				val = plantName
			case "Message text2":
				val = messageText2
			case "CT Flag":
				val = ctFlagValue
			}
			cellCoord := fmt.Sprintf("%s%d", col.ColName, i)
			if err := f.SetCellValue(sheetName, cellCoord, val); err != nil {
				log.Fatalf("failed to write value %s at %s: %v", val, cellCoord, err)
			}
		}

		if (i-1)%5000 == 0 || i == totalRows {
			fmt.Printf("Processed %d/%d rows...\n", i-1, totalRows-1)
		}
	}

	// 5. Generate Pivot Tables
	fmt.Println("Generating Pivot Tables...")

	lastColName, err := excelize.ColumnNumberToName(nextColIdx)
	if err != nil {
		log.Fatalf("failed to get last column name: %v", err)
	}

	dataRange := fmt.Sprintf("%s!$A$1:$%s$%d", sheetName, lastColName, totalRows)

	// Fetch exact casing of original sheet headers for Pivot Table setup
	actGdsMvmntDateHeader := getExactHeader(headers, []string{"act gds mvmnt date", "actgdsmvmntdate", "act_gds_mvmnt_date", "act gds mvmnt", "actual goods movement date", "ac gi date", "acgidate"}, "Act. Gds Mvmnt Date")
	shipToRegionHeader := getExactHeader(headers, []string{"ship to region", "shiptoregion", "ship_to_region", "sh reg", "shreg"}, "Ship To Region")
	billingDocumentHeader := getExactHeader(headers, []string{"billing document", "billingdocument", "billing_document", "billing doc", "bill doc"}, "Billing Document")
	billedQtyHeader := getExactHeader(headers, []string{"billed qty", "billedqty", "billed_qty", "billed quantity", "bill qty in sku", "billqtyinsku"}, "Billed Qty")

	// Pivot Table 1 (Pivot1) - messageText2 columns, Billing Document count
	recreateSheet(f, "Pivot1")
	fmt.Println("Creating Pivot Table 1 in worksheet: Pivot1")
	err = f.AddPivotTable(&excelize.PivotTableOptions{
		DataRange:       dataRange,
		PivotTableRange: "Pivot1!$A$3:$J$30",
		Rows: []excelize.PivotTableField{
			{Data: actGdsMvmntDateHeader, DefaultSubtotal: true},
		},
		Columns: []excelize.PivotTableField{
			{Data: "Message text2"},
		},
		Filter: []excelize.PivotTableField{
			{Data: "Mode"},
			{Data: "digipin_facility"},
			{Data: "CT Flag"},
			{Data: shipToRegionHeader},
		},
		Data: []excelize.PivotTableField{
			{Data: billingDocumentHeader, Subtotal: "Count"},
		},
		PivotTableStyleName: "PivotStyleLight16",
	})
	if err != nil {
		log.Fatalf("failed to add pivot table on Pivot1: %v", err)
	}

	// Pivot Table 2 (Pivot2) - No columns, Billing Document count + Billed Qty sum (no decimals)
	recreateSheet(f, "Pivot2")
	fmt.Println("Creating Pivot Table 2 in worksheet: Pivot2")
	err = f.AddPivotTable(&excelize.PivotTableOptions{
		DataRange:       dataRange,
		PivotTableRange: "Pivot2!$A$3:$J$30",
		Rows: []excelize.PivotTableField{
			{Data: actGdsMvmntDateHeader, DefaultSubtotal: true},
		},
		Filter: []excelize.PivotTableField{
			{Data: "Mode"},
			{Data: "digipin_facility"},
			{Data: "CT Flag"},
			{Data: shipToRegionHeader},
		},
		Data: []excelize.PivotTableField{
			{Data: billingDocumentHeader, Subtotal: "Count"},
			{Data: billedQtyHeader, Subtotal: "Sum", NumFmt: 3},
		},
		PivotTableStyleName: "PivotStyleLight16",
	})
	if err != nil {
		log.Fatalf("failed to add pivot table on Pivot2: %v", err)
	}

	// 6. Save Excel file
	fmt.Printf("Saving modifications back to: %s...\n", mainSheetPath)
	if err := f.Save(); err != nil {
		log.Fatalf("failed to save Excel file: %v", err)
	}

	fmt.Println("Success! Main Sheet has been processed and updated in-place with Pivot Tables.")
}
