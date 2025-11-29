import { Component, input, output, ViewChild, effect, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { TableModule, Table, TablePageEvent } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { PopulationData } from '../../services/population.service';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [TableModule, CommonModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss'
})
export class TableComponent implements AfterViewInit {
  data = input<PopulationData[]>([]);
  pageChange = output<{ page: number; first: number; rows: number }>();
  @ViewChild('dataTable') table!: Table;
  private isViewInitialized = false;

  constructor(private cdr: ChangeDetectorRef) {
    // Reset pagination to first page when data changes
    effect(() => {
      const currentData = this.data();
      if (currentData && this.isViewInitialized && this.table) {
        // Reset to first page when data changes
        setTimeout(() => {
          if (this.table) {
            this.table.first = 0;
            // Emit page change event to notify parent about the reset
            this.pageChange.emit({
              page: 1,
              first: 0,
              rows: 10
            });
            this.cdr.detectChanges();
          }
        }, 0);
      }
    });
  }

  ngAfterViewInit(): void {
    this.isViewInitialized = true;
    // Reset pagination on initial load
    if (this.table && this.data().length > 0) {
      this.table.first = 0;
      // Emit initial page change event
      this.pageChange.emit({
        page: 1,
        first: 0,
        rows: 10
      });
      this.cdr.detectChanges();
    }
  }

  onPageChange(event: TablePageEvent): void {
    // Calculate current page number (0-indexed first / rows per page = page number)
    const page = Math.floor(event.first / event.rows) + 1;
    this.pageChange.emit({
      page: page,
      first: event.first,
      rows: event.rows
    });
  }
}

