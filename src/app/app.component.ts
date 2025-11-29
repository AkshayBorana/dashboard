import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PopulationService, PopulationData } from './shared/services/population.service';
import { ChartComponent } from './shared/components/chart/chart.component';
import { DropdownComponent, DropdownOption } from './shared/components/dropdown/dropdown.component';
import { TableComponent } from './shared/components/table/table.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ChartComponent, DropdownComponent, TableComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  // Dropdown options
  dropdownOptions: DropdownOption[] = [
    { label: 'Country', value: 'country' },
    { label: 'Year', value: 'year' }
  ];

  // Selected dropdown value
  selectedDisplayOption = signal<string | null>('country');

  // Store all population data
  allPopulationData = signal<PopulationData[]>([]);

  // Unique country names for the second dropdown
  countryOptions = signal<DropdownOption[]>([]);
  selectedCountry = signal<string | null>(null);

  // Unique years for the second dropdown
  yearOptions = signal<DropdownOption[]>([]);
  selectedYear = signal<string | null>(null);

  // Chart data signal
  chartData = signal<{ labels: string[], values: number[] }>({
    labels: [],
    values: []
  });

  // Chart title signal
  chartTitle = signal<string>('Population (1960-2023)');

  // Table data signal - filtered based on selection
  tableData = signal<PopulationData[]>([]);

  constructor(private populationService: PopulationService) { }

  ngOnInit() {
    // Execute both API calls in parallel
    forkJoin({
      populationData: this.populationService.getPopulationData(),
      worldBoundaries: this.populationService.getWorldBoundariesData()
    }).subscribe({
      next: ({ populationData, worldBoundaries }) => {

        console.log('Original population data:', populationData);
        console.log('World boundaries data:', worldBoundaries);

        // Merge the datasets where countryCode === iso3
        const mergedData = this.populationService.mergeDatasets(populationData, worldBoundaries);
        
        console.log('Merged data:', mergedData);
        console.log('Sample merged record:', mergedData.find(d => d.geo_shape));

        // Handle merged population data
        this.allPopulationData.set(mergedData);
        this.extractUniqueYears(mergedData);
        const firstCountry = this.extractUniqueCountryNames(mergedData);
        if (firstCountry) {
          this.selectedCountry.set(firstCountry);
          this.processDataForChart(mergedData, firstCountry);
          this.processDataForTable(mergedData, firstCountry);
        }
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }
  /**
   * Extract unique years from the population data
   */
  private extractUniqueYears(data: PopulationData[]): void {
    if (!data || data.length === 0) {
      return;
    }

    // Get unique years using Set
    const uniqueYears = new Set<number>();
    data.forEach(item => {
      if (item.year && item.year >= 1960 && item.year <= 2023) {
        uniqueYears.add(item.year);
      }
    });

    // Convert to array, sort descending (newest first), and create dropdown options
    const sortedYears = Array.from(uniqueYears).sort((a, b) => b - a);

    const yearOptions: DropdownOption[] = sortedYears.map(year => ({
      label: year.toString(),
      value: year.toString()
    }));

    this.yearOptions.set(yearOptions);
    console.log('Unique years extracted:', yearOptions.length);
  }

  /**
   * Extract unique country names from the population data
   * Returns the first country name from the sorted list
   */
  private extractUniqueCountryNames(data: PopulationData[]): string | null {
    if (!data || data.length === 0) {
      return null;
    }

    // Get unique country names using Set
    const uniqueCountryNames = new Set<string>();
    data.forEach(item => {
      if (item.countryName && item.countryName.trim() !== '') {
        uniqueCountryNames.add(item.countryName);
      }
    });

    // Convert to array, sort alphabetically, and create dropdown options
    const sortedCountryNames = Array.from(uniqueCountryNames).sort((a, b) => a.localeCompare(b));

    const countryOptions: DropdownOption[] = sortedCountryNames.map(countryName => ({
      label: countryName,
      value: countryName
    }));

    this.countryOptions.set(countryOptions);

    // Return the first country name from the sorted list
    return sortedCountryNames.length > 0 ? sortedCountryNames[0] : null;
  }

  /**
   * Process population data and format it for the bar chart
   * Filters data for the specified country from 1960 to 2023
   */
  private processDataForChart(data: PopulationData[], countryName: string | null = null): void {
    if (!data || data.length === 0) {
      return;
    }

    // Filter data for the specified country
    let countryData: PopulationData[];

    if (countryName) {
      // Filter by exact country name match
      countryData = data.filter(d =>
        d.countryName === countryName ||
        d.countryName.toUpperCase() === countryName?.toUpperCase()
      );
    } else {
      // Default to India if no country specified
      countryData = data.filter(d =>
        d.countryName.toUpperCase() === 'INDIA' ||
        d.countryName.toUpperCase() === 'INDIA (EXCLUDING TERRITORIES)' ||
        d.countryCode === 'IND'
      );
      countryName = 'India';
    }

    if (countryData.length === 0) {
      this.chartData.set({ labels: [], values: [] });
      return;
    }

    // Filter data from 1960 to 2023 and sort by year
    const filteredData = countryData
      .filter(d => d.year >= 1960 && d.year <= 2023)
      .sort((a, b) => a.year - b.year);

    if (filteredData.length === 0) {
      this.chartData.set({ labels: [], values: [] });
      return;
    }

    // Format data for chart: years as labels, population values as values
    const labels = filteredData.map(d => d.year.toString());
    const values = filteredData.map(d => d.value);

    // Update chart title
    this.chartTitle.set(`${countryName} Population (1960-2023)`);
    this.chartData.set({ labels, values });
  }

  /**
   * Handle dropdown selection change
   */
  onDisplayOptionChange(value: string): void {
    this.selectedDisplayOption.set(value);
    const allData = this.allPopulationData();
    
    // Reset selections when switching display options
    if (value === 'country') {
      this.selectedYear.set(null);
      const currentCountry = this.selectedCountry();
      if (currentCountry && allData.length > 0) {
        this.processDataForTable(allData, currentCountry);
      }
    } else if (value === 'year') {
      this.selectedCountry.set(null);
      const currentYear = this.selectedYear();
      if (currentYear && allData.length > 0) {
        this.processDataForTable(allData, null, parseInt(currentYear));
      }
    }
  }

  /**
   * Handle country selection change
   */
  onCountryChange(value: string): void {
    this.selectedCountry.set(value);

    // Update chart and table with selected country's data
    const allData = this.allPopulationData();
    if (allData.length > 0) {
      this.processDataForChart(allData, value);
      this.processDataForTable(allData, value);
    }
  }

  /**
   * Process data for table based on selected country or year
   */
  private processDataForTable(data: PopulationData[], countryName: string | null = null, year: number | null = null): void {
    if (!data || data.length === 0) {
      this.tableData.set([]);
      return;
    }

    let filteredData: PopulationData[] = [];

    if (this.selectedDisplayOption() === 'country' && countryName) {
      // Filter by country and year range (1960-2023)
      filteredData = data
        .filter(d => 
          (d.countryName === countryName || d.countryName.toUpperCase() === countryName.toUpperCase()) &&
          d.year >= 1960 && 
          d.year <= 2023
        )
        .sort((a, b) => a.year - b.year);
    } else if (this.selectedDisplayOption() === 'year' && year) {
      // Filter by year - show all countries for that year
      filteredData = data
        .filter(d => d.year === year)
        .sort((a, b) => b.value - a.value); // Sort by population descending
    } else {
      // Default: show first country's data if available
      const firstCountry = this.countryOptions()[0]?.value;
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

    this.tableData.set(filteredData);
  }

  /**
   * Process population data by year - shows all countries for the selected year
   */
  private processDataByYear(data: PopulationData[], year: string): void {
    if (!data || data.length === 0) {
      return;
    }

    const yearNumber = parseInt(year, 10);
    if (isNaN(yearNumber)) {
      return;
    }

    // Filter data for the selected year
    const yearData = data.filter(d => d.year === yearNumber);

    if (yearData.length === 0) {
      this.chartData.set({ labels: [], values: [] });
      return;
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

    // Update chart title
    this.chartTitle.set(`Population by Country (${year})`);
    this.chartData.set({ labels, values });

  }

  /**
   * Handle year selection change
   */
  onYearChange(value: string): void {
    this.selectedYear.set(value);
    // Update chart and table with selected year's data
    const allData = this.allPopulationData();
    if (allData.length > 0) {
      this.processDataByYear(allData, value);
      this.processDataForTable(allData, null, parseInt(value));
    }
  }
}
