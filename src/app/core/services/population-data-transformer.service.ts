import { Injectable } from '@angular/core';
import { PopulationData } from '../models/population-data.model';

@Injectable({
  providedIn: 'root',
})
export class PopulationDataTransformerService {
  /**
   * Merges worldBoundaries data into populationData where countryCode === iso3
   * @param populationData - Array of population data objects
   * @param worldBoundaries - World boundaries API response
   * @returns Merged population data array
   */
  mergeDatasets(
    populationData: PopulationData[],
    worldBoundaries: any
  ): PopulationData[] {
    if (!populationData || populationData.length === 0) {
      return populationData;
    }

    if (!worldBoundaries) {
      return populationData;
    }

    let boundariesArray: any[] =
      worldBoundaries &&
      worldBoundaries['results'] &&
      worldBoundaries['results'].length &&
      worldBoundaries['results'];

    const boundariesMap = new Map<string, any>();

    boundariesArray.forEach((boundary: any) => {
      const iso3 = boundary.iso3;
      if (iso3 && typeof iso3 === 'string' && iso3.trim() !== '') {
        const key = iso3.trim().toUpperCase();
        if (!boundariesMap.has(key)) {
          boundariesMap.set(key, boundary);
        }
      }
    });

    const mergedData = populationData.map((popData) => {
      const countryCode = popData.countryCode?.trim().toUpperCase();

      if (countryCode && boundariesMap.has(countryCode)) {
        const boundary = boundariesMap.get(countryCode);
        return {
          ...popData,
          ...boundary,
        };
      }

      return popData;
    });

    return mergedData;
  }
}

