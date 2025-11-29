import { PopulationData } from '../../core/models/population-data.model';
import { DropdownOption } from '../components/dropdown/dropdown.component';

/**
 * Extract and sort unique years from the population data
 * @param data - Array of population data
 * @returns Array of dropdown options for years (sorted descending)
 */
export function extractUniqueYears(data: PopulationData[]): DropdownOption[] {
  if (!data || data.length === 0) {
    return [];
  }

  const uniqueYears = new Set<number>();
  data.forEach(item => {
    if (item.year && item.year >= 1960 && item.year <= 2023) {
      uniqueYears.add(item.year);
    }
  });

  const sortedYears = Array.from(uniqueYears).sort((a, b) => b - a);

  return sortedYears.map(year => ({
    label: year.toString(),
    value: year.toString()
  }));
}

/**
 * Extract unique country names from the population data
 * @param data - Array of population data
 * @returns Array of dropdown options for countries (sorted alphabetically)
 */
export function extractUniqueCountryNames(data: PopulationData[]): DropdownOption[] {
  if (!data || data.length === 0) {
    return [];
  }

  const uniqueCountryNames = new Set<string>();

  data.forEach(item => {
    if (item.countryName && item.countryName.trim() !== '') {
      uniqueCountryNames.add(item.countryName);
    }
  });

  const sortedCountryNames: string[] = Array.from(uniqueCountryNames).sort((a, b) => a.localeCompare(b));

  return sortedCountryNames.map(countryName => ({
    label: countryName,
    value: countryName
  }));
}

/**
 * Get the first country name from sorted country names
 * @param data - Array of population data
 * @returns First country name or null
 */
export function getFirstCountryName(data: PopulationData[]): string | null {
  const countryOptions = extractUniqueCountryNames(data);
  return countryOptions.length > 0 ? countryOptions[0].value : null;
}

/**
 * Paginate chart data based on page number
 * @param fullData - Full chart data with labels and values
 * @param page - Current page number (1-indexed)
 * @param rowsPerPage - Number of rows per page (default: 10)
 * @returns Paginated chart data
 */
export function paginateChartData(
  fullData: { labels: string[]; values: number[] },
  page: number,
  rowsPerPage: number = 10
): { labels: string[]; values: number[] } {
  if (!fullData || fullData.labels.length === 0) {
    return { labels: [], values: [] };
  }

  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  return {
    labels: fullData.labels.slice(startIndex, endIndex),
    values: fullData.values.slice(startIndex, endIndex)
  };
}

/**
 * Find country data with geo information
 * @param data - Array of population data
 * @param countryName - Country name to search for
 * @returns Country data with geo_point_2d and geo_shape, or null
 */
export function findCountryDataWithGeoInfo(
  data: PopulationData[],
  countryName: string | null
): PopulationData | null {
  if (!countryName || !data || data.length === 0) {
    return null;
  }

  const countryData = data.find(d =>
    (d.countryName === countryName) &&
    d.geo_point_2d &&
    d.geo_point_2d.lon &&
    d.geo_point_2d.lat &&
    d.geo_shape &&
    d.geo_shape.geometry
  );

  return countryData || null;
}

