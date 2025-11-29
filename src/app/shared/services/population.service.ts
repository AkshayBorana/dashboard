import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PopulationData {
  countryName: string;
  countryCode: string;
  year: number;
  value: number;
  // Merged properties from worldBoundaries
  geo_point_2d?: {
    lon: number;
    lat: number;
  };
  geo_shape?: {
    type: string;
    geometry: {
      coordinates: number[][][];
      type: string;
    };
    properties: any;
  };
  status?: string;
  color_code?: string;
  continent?: string;
  region?: string;
  iso_3166_1_alpha_2_codes?: string | null;
  french_short?: string;
  iso3?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PopulationService {
  // Using CORS proxy to bypass CORS restrictions
  private readonly apiUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent('https://datahub.io/core/population/_r/-/data/population.csv')}`;

  // OpenDataSoft API endpoint for world administrative boundaries
  // Using CORS proxy to bypass CORS restrictions
  private readonly boundariesApiUrl = `https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/world-administrative-boundaries/records/?limit=100&offset=0`;

  constructor(private http: HttpClient) {}

  /**
   * Fetches population data from the API and converts CSV to JSON format
   * @returns Observable of array of PopulationData objects
   */
  getPopulationData(): Observable<PopulationData[]> {
    return this.http.get(this.apiUrl, { responseType: 'text' }).pipe(
      map((csvText: string) => {
        if (!csvText || csvText.trim() === '') {
          throw new Error('Empty response from API');
        }
        const parsed = this.parseCsvToJson(csvText);
        return parsed;
      })
    );
  }

  /**
   * Parses CSV text and converts it to JSON array
   * @param csvText - The CSV content as a string
   * @returns Array of parsed population data objects
   */
  private parseCsvToJson(csvText: string): PopulationData[] {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');

    if (lines.length === 0) {
      return [];
    }

    // Extract header row
    const headers = this.parseCsvLine(lines[0]);

    // Find column indices
    const countryNameIndex = headers.indexOf('Country Name');
    const countryCodeIndex = headers.indexOf('Country Code');
    const yearIndex = headers.indexOf('Year');
    const valueIndex = headers.indexOf('Value\r');

    // Validate that all required columns exist
    if (countryNameIndex === -1 || countryCodeIndex === -1 || yearIndex === -1 || valueIndex === -1) {
      throw new Error('CSV file does not contain all required columns');
    }

    // Parse data rows
    const data: PopulationData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);

      // Skip empty rows
      if (values.length === 0 || values.every(v => v.trim() === '')) {
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
        value: value
      });
    }

    return data;
  }

  /**
   * Parses a CSV line, handling quoted values
   * @param line - A single line from the CSV file
   * @returns Array of parsed values
   */
  private parseCsvLine(line: string): string[] {
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
   * Fetches world administrative boundaries data from OpenDataSoft API
   * @returns Observable of the API response
   */
  getWorldBoundariesData(): Observable<any> {
    return this.http.get(this.boundariesApiUrl).pipe(
      map((responseText) => {
        return responseText
      })
    );
  }

  /**
   * Merges worldBoundaries data into populationData where countryCode === iso3
   * @param populationData - Array of population data objects
   * @param worldBoundaries - World boundaries API response
   * @returns Merged population data array
   */
  mergeDatasets(populationData: PopulationData[], worldBoundaries: any): PopulationData[] {
    if (!populationData || populationData.length === 0) {
      return populationData;
    }

    if (!worldBoundaries) {
      return populationData;
    }

    // Extract the actual records array from the API response
    // Handle different possible response structures
    let boundariesArray: any[] = worldBoundaries && worldBoundaries['results'] && worldBoundaries['results'].length && worldBoundaries['results'];

    // if (Array.isArray(worldBoundaries)) {
    //   // Direct array
    //   boundariesArray = worldBoundaries;
    // } else if (worldBoundaries.records && Array.isArray(worldBoundaries.records)) {
    //   // OpenDataSoft API structure: { records: [...] }
    //   boundariesArray = worldBoundaries.records.map((record: any) => {
    //     // Handle nested record structure
    //     return record.record?.fields || record.fields || record;
    //   });
    // } else if (worldBoundaries.results && Array.isArray(worldBoundaries.results)) {
    //   // Alternative API structure
    //   boundariesArray = worldBoundaries.results;
    // }

    // Create a map of boundaries by iso3 for efficient lookup
    const boundariesMap = new Map<string, any>();

    boundariesArray.forEach((boundary: any) => {
      const iso3 = boundary.iso3;
      if (iso3 && typeof iso3 === 'string' && iso3.trim() !== '') {
        // Use uppercase for case-insensitive matching
        const key = iso3.trim().toUpperCase();
        // Store the first matching boundary (or you could handle duplicates differently)
        if (!boundariesMap.has(key)) {
          boundariesMap.set(key, boundary);
        }
      }
    });

    // Merge the datasets
    const mergedData = populationData.map((popData) => {
      const countryCode = popData.countryCode?.trim().toUpperCase();

      if (countryCode && boundariesMap.has(countryCode)) {
        const boundary = boundariesMap.get(countryCode);

        // Create a new object with merged properties
        return {
          ...popData,
          geo_point_2d: boundary.geo_point_2d,
          geo_shape: boundary.geo_shape,
          status: boundary.status,
          color_code: boundary.color_code,
          continent: boundary.continent,
          region: boundary.region,
          iso_3166_1_alpha_2_codes: boundary.iso_3166_1_alpha_2_codes,
          french_short: boundary.french_short,
          iso3: boundary.iso3
        };
      }

      // Return original data if no match found
      return popData;
    });

    return mergedData;
  }
}

