import { Component, OnInit, signal, computed, OnDestroy, inject } from '@angular/core';
import { PopulationService } from '../../../core/services/population.service';
import { PopulationDataTransformerService } from '../../../core/services/population-data-transformer.service';
import { DashboardDataService } from './dashboard-data.service';
import { ChartComponent } from '../../../shared/components/chart/chart.component';
import { DropdownComponent, DropdownOption } from '../../../shared/components/dropdown/dropdown.component';
import { TableComponent } from '../../../shared/components/table/table.component';
import { MapsComponent } from '../../../shared/components/maps/maps.component';
import { forkJoin, Subject } from 'rxjs';
import { PopulationData } from '../../../core/models/population-data.model';
import {
  extractUniqueYears,
  extractUniqueCountryNames,
  getFirstCountryName,
  paginateChartData,
  findCountryDataWithGeoInfo
} from '../../../shared/utils/population-data.util';

@Component({
  selector: 'app-dashboard',
  imports: [ChartComponent, DropdownComponent, TableComponent, MapsComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})

export class DashboardComponent implements OnInit, OnDestroy {
  private populationService: PopulationService = inject(PopulationService);
  private populationDataTransformerService: PopulationDataTransformerService = inject(PopulationDataTransformerService);
  private dashboardDataService: DashboardDataService = inject(DashboardDataService);

  private ngUnsubscribe$ = new Subject<void>();

  public dropdownOptions: DropdownOption[] = [
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
    return findCountryDataWithGeoInfo(this.allPopulationData(), this.selectedCountry());
  });

  constructor() { }

  ngOnInit() {
    forkJoin({
      populationData: this.populationService.getPopulationData(),
      worldBoundaries: this.populationService.getWorldBoundariesData()
    }).subscribe({
      next: ({ populationData, worldBoundaries }) => {
        const mergedData = this.populationDataTransformerService.mergeDatasets(populationData, worldBoundaries);

        this.allPopulationData.set(mergedData);

        // Extract unique years and countries
        const yearOptions = extractUniqueYears(mergedData);
        const countryOptions = extractUniqueCountryNames(mergedData);
        this.yearOptions.set(yearOptions);
        this.countryOptions.set(countryOptions);

        // Set default country and process initial data
        const defaultCountry = getFirstCountryName(mergedData);
        if (defaultCountry) {
          this.selectedCountry.set(defaultCountry);
          this.updateChartData(mergedData, defaultCountry);
          this.updateTableData(mergedData);
        }
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }

  /**
   * Update chart data based on country or year selection
   */
  private updateChartData(data: PopulationData[], countryName: string | null = null): void {
    const chartData = this.dashboardDataService.processDataForChart(data, countryName);
    this.chartTitle.set(chartData.title);
    this.fullChartData.set({ labels: chartData.labels, values: chartData.values });
    this.currentPage.set(1);
    this.updatePaginatedChartData(1);
  }

  /**
   * Update chart data based on year selection
   */
  private updateChartDataByYear(data: PopulationData[], year: string): void {
    const chartData = this.dashboardDataService.processDataByYear(data, year);
    this.chartTitle.set(chartData.title);
    this.fullChartData.set({ labels: chartData.labels, values: chartData.values });
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
        this.updateTableData(allData);
      }
    } else if (value === 'year') {
      this.selectedCountry.set(null);
      const currentYear = this.selectedYear();
      if (currentYear && allData.length > 0) {
        this.updateTableData(allData);
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
      this.updateChartData(allData, value);
      this.updateTableData(allData);
    }
  }

  /**
   * Update table data based on current selections
   */
  private updateTableData(data: PopulationData[]): void {
    const displayOption = this.selectedDisplayOption() || 'country';
    const countryName = this.selectedCountry();
    const year = this.selectedYear() ? parseInt(this.selectedYear()!, 10) : null;
    const defaultCountry = this.countryOptions()[0]?.value || null;

    const filteredData = this.dashboardDataService.processDataForTable(
      data,
      displayOption,
      countryName,
      year,
      defaultCountry
    );

    this.tableData.set(filteredData);
  }

  /**
   * Handle year selection change
   */
  onYearChange(value: string): void {
    this.selectedYear.set(value);
    // Update chart and table with selected year's data
    const allData = this.allPopulationData();
    if (allData.length > 0) {
      this.updateChartDataByYear(allData, value);
      this.updateTableData(allData);
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
    const paginatedData = paginateChartData(fullData, page, 10);
    this.chartData.set(paginatedData);
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe$.next();
    this.ngUnsubscribe$.complete();
  }
}
