import { Component, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { PopulationService, PopulationData } from '../../../shared/services/population.service';
import { ChartComponent } from '../../../shared/components/chart/chart.component';
import { DropdownComponent, DropdownOption } from '../../../shared/components/dropdown/dropdown.component';
import { TableComponent } from '../../../shared/components/table/table.component';
import { MapsComponent } from '../../../shared/components/maps/maps.component';
import { forkJoin, Subject } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  imports: [ChartComponent, DropdownComponent, TableComponent, MapsComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  ngUnsubscribe$ = new Subject<void>();

  dropdownOptions: DropdownOption[] = [
    { label: 'Country', value: 'country' },
    { label: 'Year', value: 'year' }
  ];
  selectedDisplayOption = signal<string | null>('country');

  allPopulationData = signal<PopulationData[]>([]);

  countryOptions = signal<DropdownOption[]>([]);
  selectedCountry = signal<string | null>(null);

  yearOptions = signal<DropdownOption[]>([]);
  selectedYear = signal<string | null>(null);

  // Chart data signal
  fullChartData = signal<{ labels: string[], values: number[] }>({
    labels: [],
    values: []
  });
  // Chart data signal
  chartData = signal<{ labels: string[], values: number[] }>({
    labels: [],
    values: []
  });
  chartTitle = signal<string>('Population (1960-2023)');


  tableData = signal<PopulationData[]>([]);
  currentPage = signal<number>(1);

  // Selected country data with geo_point_2d and geo_shape for maps component
  selectedCountryData = computed(() => {
    const country = this.selectedCountry();
    const allData = this.allPopulationData();

    if (!country || !allData || allData.length === 0) {
      return null;
    }

    // Find the first record for the selected country that has geo_point_2d and geo_shape
    const countryData = allData.find(d =>
      (d.countryName === country) &&
      d.geo_point_2d &&
      d.geo_point_2d.lon &&
      d.geo_point_2d.lat &&
      d.geo_shape &&
      d.geo_shape.geometry
    );

    return countryData || null;
  });

  constructor(private populationService: PopulationService) { }

  ngOnInit() {
    forkJoin({
      populationData: this.populationService.getPopulationData(),
      worldBoundaries: this.populationService.getWorldBoundariesData()
    }).subscribe({
      next: ({ populationData, worldBoundaries }) => {
        const mergedData = this.populationService.mergeDatasets(populationData, worldBoundaries);

        this.allPopulationData.set(mergedData);
        this.extractUniqueYears(mergedData);
        const defaultCountry = this.extractUniqueCountryNames(mergedData);
        if (defaultCountry) {
          this.selectedCountry.set(defaultCountry);
          this.processDataForChart(mergedData, defaultCountry);
          this.processDataForTable(mergedData, defaultCountry);
        }
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }

  /**
   * Extract and sort unique years from the population data
   */
  private extractUniqueYears(data: PopulationData[]): void {
    if (!data || data.length === 0) {
      return;
    }
    const uniqueYears = new Set<number>();
    data.forEach(item => {
      if (item.year && item.year >= 1960 && item.year <= 2023) {
        uniqueYears.add(item.year);
      }
    });

    const sortedYears = Array.from(uniqueYears).sort((a, b) => b - a);

    const yearOptions: DropdownOption[] = sortedYears.map(year => ({
      label: year.toString(),
      value: year.toString()
    }));

    this.yearOptions.set(yearOptions);
  }

  /**
   * Extract unique country names from the population data
   * Returns the first country name from the sorted list
   */
  private extractUniqueCountryNames(data: PopulationData[]): string | null {
    if (!data || data.length === 0) {
      return null;
    }

    const uniqueCountryNames = new Set<string>();

    data.forEach(item => {
      if (item.countryName && item.countryName.trim() !== '') {
        uniqueCountryNames.add(item.countryName);
      }
    });

    const sortedCountryNames: string[] = Array.from(uniqueCountryNames).sort((a, b) => a.localeCompare(b)) || [];

    const countryOptions: DropdownOption[] = sortedCountryNames.map(countryName => ({
      label: countryName,
      value: countryName
    }));

    this.countryOptions.set(countryOptions);

    return sortedCountryNames.length ? sortedCountryNames[0] : null;
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
      countryData = data.filter(d =>
        d.countryName === countryName ||
        d.countryName.toUpperCase() === countryName?.toUpperCase()
      );
    } else {
      // Default toAfghanistan
      countryData = data.filter(d =>
        d.countryName.toUpperCase() === 'AFGHANISTAN' ||
        d.countryName.toUpperCase() === 'AFGHANISTAN)' ||
        d.countryCode === 'AFG'
      );
      countryName = 'Afghanistan';
    }

    if (countryData.length === 0) {
      this.fullChartData.set({ labels: [], values: [] });
      this.chartData.set({ labels: [], values: [] });
      return;
    }

    const filteredData = countryData
      .filter(d => d.year >= 1960 && d.year <= 2023)
      .sort((a, b) => a.year - b.year);

    if (filteredData.length === 0) {
      this.fullChartData.set({ labels: [], values: [] });
      this.chartData.set({ labels: [], values: [] });
      return;
    }

    const labels = filteredData.map(d => d.year.toString());
    const values = filteredData.map(d => d.value);

    this.chartTitle.set(`${countryName} Population (1960-2023)`);

    this.fullChartData.set({ labels, values });

    this.currentPage.set(1);
    this.updatePaginatedChartData(1);
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
      filteredData = data
        .filter(d =>
          (d.countryName === countryName || d.countryName.toUpperCase() === countryName.toUpperCase()) &&
          d.year >= 1960 &&
          d.year <= 2023
        )
        .sort((a, b) => a.year - b.year);
    } else if (this.selectedDisplayOption() === 'year' && year) {
      filteredData = data
        .filter(d => d.year === year)
        .sort((a, b) => b.value - a.value);
    } else {
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

    const yearData = data.filter(d => d.year === yearNumber);

    if (yearData.length === 0) {
      this.fullChartData.set({ labels: [], values: [] });
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

    // Store full chart data
    this.fullChartData.set({ labels, values });

    // Update paginated chart data (first page)
    this.currentPage.set(1);
    this.updatePaginatedChartData(1);
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

  /**
   * Handle table pagination change
   */
  onTablePageChange(event: { page: number; first: number; rows: number }): void {
    console.log(event);
    this.currentPage.set(event.page);
    this.updatePaginatedChartData(event.page);
  }

  /**
   * Update chart data based on current page (10 items per page)
   */
  private updatePaginatedChartData(page: number): void {
    const fullData = this.fullChartData();
    if (!fullData || fullData.labels.length === 0) {
      return;
    }

    const rowsPerPage = 10;
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;

    const paginatedLabels = fullData.labels.slice(startIndex, endIndex);
    const paginatedValues = fullData.values.slice(startIndex, endIndex);

    this.chartData.set({
      labels: paginatedLabels,
      values: paginatedValues
    });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe$.next();
    this.ngUnsubscribe$.complete();
  }
}
