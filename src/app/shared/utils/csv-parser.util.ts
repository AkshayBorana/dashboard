import { PopulationData } from '../../core/models/population-data.model';

/**
 * Parses a CSV line, handling quoted values
 * @param line - A single line from the CSV file
 * @returns Array of parsed values
 */
export function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentValue += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      values.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  // Add the last value
  values.push(currentValue);

  return values;
}

/**
 * Parses CSV text and converts it to JSON array
 * @param csvText - The CSV content as a string
 * @returns Array of parsed population data objects
 */
export function parseCsvToJson(csvText: string): PopulationData[] {
  const lines = csvText
    .replace(/\r\n/g, '\n') // Convert Windows line endings
    .replace(/\r/g, '\n') // Convert Mac line endings
    .split('\n')
    .filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return [];
  }

  // Extract header row
  const headers = parseCsvLine(lines[0]).map((h) =>
    h.trim().replace(/\r$/, '').replace(/\n$/, '')
  );

  // Find column indices with case-insensitive matching
  const countryNameIndex = headers.findIndex(
    (h) => h.toLowerCase() === 'country name'
  );
  const countryCodeIndex = headers.findIndex(
    (h) => h.toLowerCase() === 'country code'
  );
  const yearIndex = headers.findIndex((h) => h.toLowerCase() === 'year');
  const valueIndex = headers.findIndex((h) => h.toLowerCase() === 'value');

  // Better error message if columns not found
  if (
    countryNameIndex === -1 ||
    countryCodeIndex === -1 ||
    yearIndex === -1 ||
    valueIndex === -1
  ) {
    throw new Error(
      `CSV file missing required columns. Found headers: ${headers.join(
        ', '
      )}`
    );
  }

  // Parse data rows
  const data: PopulationData[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);

    // Skip empty rows
    if (values.length === 0 || values.every((v) => v.trim() === '')) {
      continue;
    }

    const year = parseInt(values[yearIndex], 10);
    const value = parseFloat(values[valueIndex]);

    // Skip rows with invalid numeric values
    if (isNaN(year) || isNaN(value)) {
      continue;
    }

    data.push({
      countryName: values[countryNameIndex].trim(),
      countryCode: values[countryCodeIndex].trim(),
      year: year,
      value: value,
    });
  }

  return data;
}

