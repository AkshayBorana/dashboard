import { Component, input, signal, effect, OnInit, OnDestroy, ViewChild, HostListener, ElementRef, AfterViewInit } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsCoreOption, ECharts } from 'echarts/core';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [NgxEchartsDirective],
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.scss'
})
export class ChartComponent implements OnInit, OnDestroy, AfterViewInit {
  // Input signals for chart data
  chartData = input.required<{ labels: string[], values: number[] }>();
  title = input<string>('Bar Chart');
  height = input<string>('400px');
  width = input<string>('100%');

  @ViewChild(NgxEchartsDirective, { static: false }) chartInstance?: NgxEchartsDirective;

  // Chart options signal
  chartOptions = signal<EChartsCoreOption>({});

  private echartsInstance?: ECharts;
  private resizeObserver?: ResizeObserver;
  private isMobile = signal<boolean>(false);
  private isTablet = signal<boolean>(false);

  constructor(private elementRef: ElementRef) {
    // Effect to update chart options when data or screen size changes
    effect(() => {
      const data = this.chartData();
      const chartTitle = this.title();
      // Read responsive signals to trigger effect on screen size change
      const mobile = this.isMobile();
      const tablet = this.isTablet();

      // Responsive configuration
      const titleFontSize = mobile ? 14 : tablet ? 16 : 18;
      const labelFontSize = mobile ? 10 : tablet ? 11 : 12;
      const axisNameFontSize = mobile ? 11 : tablet ? 12 : 13;
      const gridLeft = mobile ? '8%' : tablet ? '5%' : '3%';
      const gridRight = mobile ? '5%' : tablet ? '4%' : '4%';
      const gridBottom = mobile ? '15%' : tablet ? '10%' : '8%';
      const nameGapX = mobile ? 20 : tablet ? 25 : 30;
      const nameGapY = mobile ? 40 : tablet ? 50 : 60;

      // Calculate x-axis label interval based on screen size and data length
      const labelCount = data.labels.length;
      let xAxisInterval = 0;
      let xAxisRotate = 0;

      if (mobile) {
        xAxisInterval = labelCount > 10 ? Math.floor(labelCount / 8) : 0;
        xAxisRotate = labelCount > 15 ? 45 : labelCount > 10 ? 30 : 0;
      } else if (tablet) {
        xAxisInterval = labelCount > 20 ? Math.floor(labelCount / 10) : 0;
        xAxisRotate = labelCount > 25 ? 45 : labelCount > 20 ? 30 : 0;
      } else {
        xAxisInterval = labelCount > 30 ? Math.floor(labelCount / 10) : 0;
        xAxisRotate = labelCount > 20 ? 45 : 0;
      }

      const options: EChartsCoreOption = {
        title: {
          text: chartTitle,
          left: 'center',
          textStyle: {
            fontSize: titleFontSize
          },
          top: mobile ? 5 : 10
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: (params: any) => {
            const param = params[0];
            const value = param.value;
            const label = param.name;
            let formattedValue: string;
            if (value >= 1e9) {
              formattedValue = (value / 1e9).toFixed(2) + ' Billion';
            } else if (value >= 1e6) {
              formattedValue = (value / 1e6).toFixed(2) + ' Million';
            } else if (value >= 1e3) {
              formattedValue = (value / 1e3).toFixed(0) + ' Thousand';
            } else {
              formattedValue = value.toLocaleString();
            }
            return `${label}<br/>Population: ${formattedValue}`;
          },
          textStyle: {
            fontSize: mobile ? 11 : 12
          }
        },
        grid: {
          left: gridLeft,
          right: gridRight,
          bottom: gridBottom,
          top: mobile ? '15%' : tablet ? '12%' : '10%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: data.labels,
          axisTick: {
            alignWithLabel: true,
            length: mobile ? 3 : 4
          },
          axisLabel: {
            rotate: xAxisRotate,
            interval: xAxisInterval,
            fontSize: labelFontSize,
            margin: mobile ? 8 : 10
          },
          name: 'Year',
          nameLocation: 'middle',
          nameGap: nameGapX,
          nameTextStyle: {
            fontSize: axisNameFontSize
          }
        },
        yAxis: {
          type: 'value',
          name: 'Population',
          nameLocation: 'middle',
          nameGap: nameGapY,
          nameTextStyle: {
            fontSize: axisNameFontSize
          },
          axisLabel: {
            fontSize: labelFontSize,
            formatter: (value: number) => {
              if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
              if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
              if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
              return value.toString();
            }
          }
        },
        series: [
          {
            name: 'Population',
            type: 'bar',
            data: data.values,
            itemStyle: {
              color: '#3498db'
            },
            emphasis: {
              itemStyle: {
                color: '#2980b9'
              }
            }
          }
        ]
      };

      this.chartOptions.set(options);
    });
  }

  ngOnInit(): void {
    this.checkScreenSize();
  }

  ngAfterViewInit(): void {
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
    // Trigger chart resize
    if (this.chartInstance) {
      setTimeout(() => {
        this.chartInstance?.resize();
      }, 100);
    }
  }

  onChartInit(echartsInstance: ECharts): void {
    this.echartsInstance = echartsInstance;
  }

  private checkScreenSize(): void {
    const width = window.innerWidth;
    this.isMobile.set(width < 768);
    this.isTablet.set(width >= 768 && width < 1024);
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.checkScreenSize();
        if (this.chartInstance) {
          this.chartInstance.resize();
        }
      });

      const container = this.elementRef.nativeElement.querySelector('.chart-container');
      if (container) {
        this.resizeObserver.observe(container);
      }
    }
  }
}
