import { Injectable } from '@angular/core';
import { PopulationData } from '../../../core/models/population-data.model';

export interface ChartData {
  labels: string[];
  values: number[];
  title: string;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardDataService {
  /**
   * Process population data and format it for the bar chart
   * Filters data for the specified country from 1960 to 2023
   * @param data - Array of population data
   * @param countryName - Country name to filter by (optional)
   * @returns Chart data with labels, values, and title
   */
  processDataForChart(data: PopulationData[], countryName: string | null = null): ChartData {
    if (!data || data.length === 0) {
      return { labels: [], values: [], title: 'Population (1960-2023)' };
    }

    // Filter data for the specified country
    let countryData: PopulationData[];

    if (countryName) {
      countryData = data.filter(d =>
        d.countryName === countryName ||
        d.countryName.toUpperCase() === countryName?.toUpperCase()
      );
    } else {
      // Default to Afghanistan
      countryData = data.filter(d =>
        d.countryName.toUpperCase() === 'AFGHANISTAN' ||
        d.countryName.toUpperCase() === 'AFGHANISTAN)' ||
        d.countryCode === 'AFG'
      );
      countryName = 'Afghanistan';
    }

    if (countryData.length === 0) {
      return { labels: [], values: [], title: 'Population (1960-2023)' };
    }

    const filteredData = countryData
      .filter(d => d.year >= 1960 && d.year <= 2023)
      .sort((a, b) => a.year - b.year);

    if (filteredData.length === 0) {
      return { labels: [], values: [], title: 'Population (1960-2023)' };
    }

    const labels = filteredData.map(d => d.year.toString());
    const values = filteredData.map(d => d.value);
    const title = `${countryName} Population (1960-2023)`;

    return { labels, values, title };
  }

  /**
   * Process population data by year - shows all countries for the selected year
   * @param data - Array of population data
   * @param year - Year string to filter by
   * @returns Chart data with labels, values, and title
   */
  processDataByYear(data: PopulationData[], year: string): ChartData {
    if (!data || data.length === 0) {
      return { labels: [], values: [], title: 'Population (1960-2023)' };
    }

    const yearNumber = parseInt(year, 10);
    if (isNaN(yearNumber)) {
      return { labels: [], values: [], title: 'Population (1960-2023)' };
    }

    const yearData = data.filter(d => d.year === yearNumber);

    if (yearData.length === 0) {
      return { labels: [], values: [], title: 'Population (1960-2023)' };
    }

    // Sort by population value (descending) to show largest countries first
    const sortedData = yearData
      .filter(d => d.countryName && d.countryName.trim() !== '')
      .sort((a, b) => b.value - a.value);

    // Get top countries (limit to top 50 for better visualization)
    const topCountries = sortedData.slice(0, 50);

    // Format data for chart: country names as labels, population values as values
    const labels = topCountries.map(d => d.countryName);
    const values = topCountries.map(d => d.value);
    const title = `Population by Country (${year})`;

    return { labels, values, title };
  }

  /**
   * Process data for table based on selected country or year
   * @param data - Array of population data
   * @param displayOption - Display option ('country' or 'year')
   * @param countryName - Country name to filter by (optional)
   * @param year - Year to filter by (optional)
   * @param defaultCountry - Default country to use if no filter specified
   * @returns Filtered and sorted population data array
   */
  processDataForTable(
    data: PopulationData[],
    displayOption: string,
    countryName: string | null = null,
    year: number | null = null,
    defaultCountry: string | null = null
  ): PopulationData[] {
    if (!data || data.length === 0) {
      return [];
    }

    let filteredData: PopulationData[] = [];

    if (displayOption === 'country' && countryName) {
      filteredData = data
        .filter(d =>
          (d.countryName === countryName || d.countryName.toUpperCase() === countryName.toUpperCase()) &&
          d.year >= 1960 &&
          d.year <= 2023
        )
        .sort((a, b) => a.year - b.year);
    } else if (displayOption === 'year' && year) {
      filteredData = data
        .filter(d => d.year === year)
        .sort((a, b) => b.value - a.value);
    } else {
      // Default: show first country's data if available
      const firstCountry = defaultCountry || countryName;
      if (firstCountry) {
        filteredData = data
          .filter(d =>
            d.countryName === firstCountry &&
            d.year >= 1960 &&
            d.year <= 2023
          )
          .sort((a, b) => a.year - b.year);
      }
    }

    return filteredData;
  }
}

