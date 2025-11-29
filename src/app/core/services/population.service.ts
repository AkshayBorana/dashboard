import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, retry, switchMap } from 'rxjs/operators';
import { PopulationData } from '../models/population-data.model';
import { parseCsvToJson } from '../../shared/utils/csv-parser.util';

@Injectable({
  providedIn: 'root',
})
export class PopulationService {
  // Using CORS proxy to bypass CORS restrictions
  private readonly apiUrl = '/api/core/population/_r/-/data/population.csv';

  // OpenDataSoft API endpoint for world administrative boundaries
  private readonly boundariesApiBaseUrl = `https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/world-administrative-boundaries/records/`;

  private http: HttpClient = inject(HttpClient);

  constructor() {}

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
          const parsed = parseCsvToJson(csvText);
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
          error: error.error,
        });
        throw new Error(
          `Failed to fetch population data: ${error.message || 'Network error'}`
        );
      })
    );
  }

  /**
   * Fetches world administrative boundaries data from OpenDataSoft API
   * Handles pagination to fetch all entries using the total_count property
   * @returns Observable of the API response with all results combined
   */
  getWorldBoundariesData(): Observable<any> {
    const limit = 100;
    const initCallUrl = `${this.boundariesApiBaseUrl}?limit=${limit}&offset=0`;

    // Make the first call to get initial data and total_count
    return this.http.get<any>(initCallUrl).pipe(
      switchMap((firstResponse) => {
        const totalCount = firstResponse.total_count || 0;
        const initResults = firstResponse.results || [];

        // If we already have all the data, return it
        if (initResults.length >= totalCount) {
          return of(firstResponse);
        }

        // Calculate how many additional calls needed
        const remainingCount = totalCount - initResults.length;
        const additionalCallsCount = Math.ceil(remainingCount / limit);

        // Create an array of observables for additional calls
        const additionalCalls: Observable<any>[] = [];
        for (let i = 1; i <= additionalCallsCount; i++) {
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
            const combinedResults = [...initResults, ...allAdditionalResults];

            // Return response in the same format as the original
            return {
              ...firstResponse,
              results: combinedResults,
              total_count: totalCount,
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
          error: error.error,
        });
        throw new Error(
          `Failed to fetch world boundaries data: ${
            error.message || 'Network error'
          }`
        );
      })
    );
  }
}
