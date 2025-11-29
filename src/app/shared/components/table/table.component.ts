import { Component, input, ViewChild, effect, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { TableModule, Table } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { PopulationData } from '../../../services/population.service';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [TableModule, CommonModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss'
})
export class TableComponent implements AfterViewInit {
  data = input<PopulationData[]>([]);
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
      this.cdr.detectChanges();
    }
  }
}

