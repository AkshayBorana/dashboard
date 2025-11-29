import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, retry, switchMap } from 'rxjs/operators';

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
  private readonly apiUrl = '/api/core/population/_r/-/data/population.csv';

  // OpenDataSoft API endpoint for world administrative boundaries
  // Using CORS proxy to bypass CORS restrictions
  private readonly boundariesApiBaseUrl = `https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/world-administrative-boundaries/records/`;

  constructor(private http: HttpClient) {}

  /**
   * Fetches population data from the API and converts CSV to JSON format
   * @returns Observable of array of PopulationData objects
   */
getPopulationData(): Observable<PopulationData[]> {
  return this.http.get(this.apiUrl, { responseType: 'text' }).pipe(
    retry(2), // Retry up to 2 times on failure
    map((csvText: string) => {
      if (!csvText || csvText.trim() === '') {
        throw new Error('Empty response from API');
      }
      try {
        const parsed = this.parseCsvToJson(csvText);
        if (parsed.length === 0) {
          console.warn('CSV parsed but resulted in empty array');
        }
        return parsed;
      } catch (error) {
        console.error('Error parsing CSV:', error);
        console.error('CSV content preview:', csvText.substring(0, 500));
        throw error;
      }
    }),
    catchError((error) => {
      console.error('Error fetching population data:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        url: this.apiUrl,
        error: error.error
      });
      throw new Error(`Failed to fetch population data: ${error.message || 'Network error'}`);
    })
  );
}

  /**
   * Parses CSV text and converts it to JSON array
   * @param csvText - The CSV content as a string
   * @returns Array of parsed population data objects
   */
  private parseCsvToJson(csvText: string): PopulationData[] {
    const lines = csvText
      .replace(/\r\n/g, '\n')  // Convert Windows line endings
      .replace(/\r/g, '\n')     // Convert Mac line endings
      .split('\n')
      .filter(line => line.trim() !== '');

    if (lines.length === 0) {
      return [];
    }

    // Extract header row
    const headers = this.parseCsvLine(lines[0]).map(h => h.trim().replace(/\r$/, '').replace(/\n$/, ''));;

    // Find column indices with case-insensitive matching
    const countryNameIndex = headers.findIndex(h =>
      h.toLowerCase() === 'country name'
    );
    const countryCodeIndex = headers.findIndex(h =>
      h.toLowerCase() === 'country code'
    );
    const yearIndex = headers.findIndex(h =>
      h.toLowerCase() === 'year'
    );
    const valueIndex = headers.findIndex(h =>
      h.toLowerCase() === 'value'
    );

    // Better error message if columns not found
    if (countryNameIndex === -1 || countryCodeIndex === -1 || yearIndex === -1 || valueIndex === -1) {
      throw new Error(`CSV file missing required columns. Found headers: ${headers.join(', ')}`);
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
   * Handles pagination to fetch all entries using the total_count property
   * @returns Observable of the API response with all results combined
   */
  getWorldBoundariesData(): Observable<any> {
    const limit = 100;
    const firstCallUrl = `${this.boundariesApiBaseUrl}?limit=${limit}&offset=0`;

    // Make the first call to get initial data and total_count
    return this.http.get<any>(firstCallUrl).pipe(
      switchMap((firstResponse) => {
        const totalCount = firstResponse.total_count || 0;
        const firstResults = firstResponse.results || [];

        // If we already have all the data, return it
        if (firstResults.length >= totalCount) {
          return of(firstResponse);
        }

        // Calculate how many additional calls are needed
        const remainingCount = totalCount - firstResults.length;
        const additionalCallsNeeded = Math.ceil(remainingCount / limit);

        // Create an array of observables for additional calls
        const additionalCalls: Observable<any>[] = [];
        for (let i = 1; i <= additionalCallsNeeded; i++) {
          const offset = i * limit;
          const url = `${this.boundariesApiBaseUrl}?limit=${limit}&offset=${offset}`;
          additionalCalls.push(this.http.get<any>(url));
        }

        // Execute all additional calls in parallel
        return forkJoin(additionalCalls).pipe(
          map((additionalResponses) => {
            // Combine all results from additional calls
            const allAdditionalResults: any[] = [];
            additionalResponses.forEach((response) => {
              if (response.results && Array.isArray(response.results)) {
                allAdditionalResults.push(...response.results);
              }
            });

            // Combine first results with all additional results
            const combinedResults = [...firstResults, ...allAdditionalResults];

            // Return response in the same format as the original
            return {
              ...firstResponse,
              results: combinedResults,
              total_count: totalCount
            };
          })
        );
      }),
      catchError((error) => {
        console.error('Error fetching world boundaries data:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: this.boundariesApiBaseUrl,
          error: error.error
        });
        throw new Error(`Failed to fetch world boundaries data: ${error.message || 'Network error'}`);
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
        return {
          ...popData,
          ...boundary
        };
      }

      return popData;
    });

    return mergedData;
  }
}

