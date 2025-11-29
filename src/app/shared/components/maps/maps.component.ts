import { Component, Input, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Graphic from '@arcgis/core/Graphic';
import Polygon from '@arcgis/core/geometry/Polygon';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import Color from '@arcgis/core/Color';
import { PopulationData } from '../../services/population.service';

@Component({
  selector: 'app-maps',
  standalone: true,
  imports: [],
  templateUrl: './maps.component.html',
  styleUrl: './maps.component.scss'
})
export class MapsComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapViewNode', { static: false }) mapViewEl!: ElementRef;
  @Input() selectedCountryData: PopulationData | null = null;
  @Input() allPopulationData: PopulationData[] = [];

  private map: Map | null = null;
  private view: MapView | null = null;
  private graphicsLayer: GraphicsLayer | null = null;
  private countriesLayer: GraphicsLayer | null = null;
  private isViewReady: boolean = false;
  private countryGraphicsMap: { [key: string]: Graphic } = {};

  ngOnInit(): void {
    // Map initialization will happen in ngAfterViewInit
  }

  ngAfterViewInit(): void {
    // Initialize map after view is ready
    this.initializeMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes);

    // Load all countries when allPopulationData is available
    if (changes['allPopulationData'] && this.isViewReady) {
      if (this.allPopulationData && this.allPopulationData.length > 0) {
        setTimeout(() => {
          this.loadAllCountries();
        }, 100);
      }
    }

    // Update map location and highlight when selectedCountryData changes
    if (changes['selectedCountryData'] && !changes['selectedCountryData'].firstChange) {
      if (this.isViewReady && this.selectedCountryData) {
        // Use setTimeout to ensure change detection completes
        setTimeout(() => {
          this.highlightAndCenterCountry();
        }, 100);
      }
    }
  }

  ngOnDestroy(): void {
    // Clean up map view
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
    if (this.graphicsLayer) {
      this.graphicsLayer = null;
    }
    if (this.countriesLayer) {
      this.countriesLayer = null;
    }
    if (this.map) {
      this.map = null;
    }
    this.countryGraphicsMap = {};
    this.isViewReady = false;
  }

  private initializeMap(): void {
    if (!this.mapViewEl?.nativeElement) {
      console.error('Map container element not found');
      return;
    }

    const container = this.mapViewEl.nativeElement;

    // Ensure container has dimensions
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn('Map container has no dimensions, waiting...');
      setTimeout(() => {
        this.initializeMap();
      }, 100);
      return;
    }

    // Create a graphics layer for highlighting countries
    this.graphicsLayer = new GraphicsLayer();
    
    // Create a graphics layer for all countries (clickable)
    this.countriesLayer = new GraphicsLayer();

    // Create a new map
    this.map = new Map({
      basemap: 'streets-navigation-vector',
      layers: [this.countriesLayer, this.graphicsLayer]
    });

    // Create a new map view
    this.view = new MapView({
      container: container,
      map: this.map,
      zoom: 2,
      center: [0, 0] // Default center, will be updated when country data is available
    });

    // Wait for the view to be ready before using it
    this.view.when(() => {
      // Wait a bit to ensure all internal properties are initialized
      setTimeout(() => {
        this.isViewReady = true;
        console.log('MapView is ready');

        // Set up click handler for country selection
        this.setupClickHandler();

        // Load all countries if data is available
        if (this.allPopulationData && this.allPopulationData.length > 0) {
          this.loadAllCountries();
        }

        // Update map location and highlight if country data is already available
        if (this.selectedCountryData) {
          setTimeout(() => {
            this.highlightAndCenterCountry();
          }, 200);
        }
      }, 200);
    }).catch((error) => {
      console.error('Error initializing MapView:', error);
    });
  }

  private highlightAndCenterCountry(): void {
    if (!this.selectedCountryData || !this.view || !this.isViewReady || !this.graphicsLayer) {
      return;
    }

    const geoShape = this.selectedCountryData.geo_shape;
    const geoPoint = this.selectedCountryData.geo_point_2d;

    // First, highlight the country border using geo_shape
    if (geoShape && geoShape.geometry && geoShape.geometry.coordinates) {
      this.highlightCountryBorder();
    }

    // Then center the map on the country
    if (geoPoint && geoPoint.lon && geoPoint.lat) {
      // Use a small delay to ensure the graphic is added first
      setTimeout(() => {
        this.centerOnCountry();
      }, 100);
    }
  }

  private centerOnCountry(): void {
    if (!this.view || !this.isViewReady || !this.selectedCountryData) {
      return;
    }

    const geoPoint = this.selectedCountryData.geo_point_2d;
    if (!geoPoint || !geoPoint.lon || !geoPoint.lat) {
      return;
    }

    // Center the map on the country's coordinates
    this.view.goTo({
      center: [geoPoint.lon, geoPoint.lat],
      zoom: 5
    }).catch((error) => {
      console.error('Error centering map:', error);
    });
  }

  private highlightCountryBorder(): void {
    if (!this.selectedCountryData || !this.graphicsLayer || !this.isViewReady) {
      return;
    }

    const geoShape = this.selectedCountryData.geo_shape;
    if (!geoShape || !geoShape.geometry || !geoShape.geometry.coordinates) {
      console.warn('No valid geo_shape found for selected country');
      return;
    }

    try {
      // Clear existing graphics
      this.graphicsLayer.removeAll();

      // Create polygon geometry from geo_shape
      const geometry = geoShape.geometry;
      const geometryType = geometry.type;
      const coordinates = geometry.coordinates;

      let polygon: Polygon;

      if (geometryType === 'MultiPolygon') {
        // Handle MultiPolygon: coordinates is an array of polygons
        // Each polygon is an array of rings, each ring is an array of [lon, lat] coordinates
        const allRings: number[][][] = [];
        const multiPolyCoords = coordinates as unknown as number[][][][];
        multiPolyCoords.forEach((polygonCoords: number[][][]) => {
          polygonCoords.forEach((ring: number[][]) => {
            const convertedRing = ring.map((coord: number[]) => [coord[0], coord[1]]);
            allRings.push(convertedRing);
          });
        });

        polygon = new Polygon({
          rings: allRings,
          spatialReference: { wkid: 4326 } // WGS84
        });
      } else {
        // Handle Polygon: coordinates is an array of rings
        // Each ring is an array of [lon, lat] coordinates
        const rings = (coordinates as unknown as number[][][]).map((ring: number[][]) =>
          ring.map((coord: number[]) => [coord[0], coord[1]])
        );

        polygon = new Polygon({
          rings: rings,
          spatialReference: { wkid: 4326 } // WGS84
        });
      }

      // Create highlight symbol with visible border
      const fillSymbol = new SimpleFillSymbol({
        color: new Color([255, 0, 0, 0.2]), // Red fill with 20% opacity
        outline: new SimpleLineSymbol({
          color: new Color([255, 0, 0, 1]), // Red border with full opacity
          width: 3 // Thicker border for visibility
        })
      });

      // Create graphic
      const graphic = new Graphic({
        geometry: polygon,
        symbol: fillSymbol
      });

      // Add graphic to layer
      this.graphicsLayer.add(graphic);

      console.log('Country border highlighted:', this.selectedCountryData.countryName);

      // Try to fit the view to the country boundary
      if (this.view && this.isViewReady) {
        setTimeout(() => {
          if (this.view && this.isViewReady) {
            this.view.goTo({
              target: polygon,
              padding: 50
            }).catch((error) => {
              console.warn('Error fitting view to country boundary, using center point instead');
              // Fallback handled in centerOnCountry
            });
          }
        }, 200);
      }
    } catch (error) {
      console.error('Error highlighting country border:', error);
    }
  }

  /**
   * Set up click handler on the map view to detect country clicks
   */
  private setupClickHandler(): void {
    if (!this.view) {
      return;
    }

    this.view.on('click', (event) => {
      if (!this.view || !this.countriesLayer) {
        return;
      }

      // Query graphics at the click location
      this.view.hitTest(event).then((response) => {
        if (response.results.length > 0) {
          const result = response.results[0];
          const graphic = (result as any).graphic;
          if (graphic && graphic.attributes) {
            const countryName = graphic.attributes.countryName;
            const countryCode = graphic.attributes.countryCode;
            
            if (countryName) {
              this.showCountryPopup(event.mapPoint, countryName, countryCode);
            }
          }
        }
      }).catch((error) => {
        console.error('Error in hit test:', error);
      });
    });
  }

  /**
   * Load all countries onto the map as clickable graphics
   */
  private loadAllCountries(): void {
    if (!this.countriesLayer || !this.allPopulationData || this.allPopulationData.length === 0) {
      return;
    }

    // Clear existing country graphics
    this.countriesLayer.removeAll();
    this.countryGraphicsMap = {};

    // Group population data by country to get unique countries with geo_shape
    const countryMap: { [key: string]: PopulationData } = {};
    
    this.allPopulationData.forEach((data) => {
      if (data.countryName && data.geo_shape && data.geo_shape.geometry) {
        const key = data.countryName.toUpperCase();
        if (!countryMap[key]) {
          countryMap[key] = data;
        }
      }
    });

    // Create graphics for each country
    Object.keys(countryMap).forEach((key) => {
      const countryData = countryMap[key];
      try {
        const geoShape = countryData.geo_shape;
        if (!geoShape || !geoShape.geometry || !geoShape.geometry.coordinates) {
          return;
        }

        const geometry = geoShape.geometry;
        const geometryType = geometry.type;
        const coordinates = geometry.coordinates;

        let polygon: Polygon;

        if (geometryType === 'MultiPolygon') {
          const allRings: number[][][] = [];
          const multiPolyCoords = coordinates as unknown as number[][][][];
          multiPolyCoords.forEach((polygonCoords: number[][][]) => {
            polygonCoords.forEach((ring: number[][]) => {
              const convertedRing = ring.map((coord: number[]) => [coord[0], coord[1]]);
              allRings.push(convertedRing);
            });
          });

          polygon = new Polygon({
            rings: allRings,
            spatialReference: { wkid: 4326 }
          });
        } else {
          const rings = (coordinates as unknown as number[][][]).map((ring: number[][]) =>
            ring.map((coord: number[]) => [coord[0], coord[1]])
          );

          polygon = new Polygon({
            rings: rings,
            spatialReference: { wkid: 4326 }
          });
        }

        // Create a subtle symbol for countries (semi-transparent)
        const fillSymbol = new SimpleFillSymbol({
          color: new Color([100, 150, 200, 0.1]), // Light blue with low opacity
          outline: new SimpleLineSymbol({
            color: new Color([100, 150, 200, 0.3]), // Light blue border
            width: 1
          })
        });

        // Create graphic with country attributes
        const graphic = new Graphic({
          geometry: polygon,
          symbol: fillSymbol,
          attributes: {
            countryName: countryData.countryName,
            countryCode: countryData.countryCode,
            iso3: countryData.iso3
          }
        });

        // Add graphic to layer
        if (this.countriesLayer) {
          this.countriesLayer.add(graphic);
          this.countryGraphicsMap[key] = graphic;
        }
      } catch (error) {
        console.warn(`Error loading country ${countryData.countryName}:`, error);
      }
    });

    console.log(`Loaded ${Object.keys(countryMap).length} countries onto the map`);
  }

  /**
   * Format large numbers to readable format (e.g., 1.4billion)
   */
  private formatPopulation(total: number): string {
    if (total >= 1_000_000_000_000) {
      // Trillions
      return `${(total / 1_000_000_000_000).toFixed(1)}trillion`;
    } else if (total >= 1_000_000_000) {
      // Billions
      return `${(total / 1_000_000_000).toFixed(1)}billion`;
    } else if (total >= 1_000_000) {
      // Millions
      return `${(total / 1_000_000).toFixed(1)}million`;
    } else if (total >= 1_000) {
      // Thousands
      return `${(total / 1_000).toFixed(1)}thousand`;
    } else {
      return total.toLocaleString('en-US');
    }
  }

  /**
   * Show popup with total population from 1960-2023
   */
  private showCountryPopup(location: any, countryName: string, countryCode: string): void {
    if (!this.view || !this.allPopulationData) {
      return;
    }

    // Filter population data for this country from 1960 to 2023
    const countryData = this.allPopulationData.filter(
      (data) => 
        (data.countryName === countryName || data.countryCode === countryCode) &&
        data.year >= 1960 &&
        data.year <= 2023 &&
        data.value != null &&
        !isNaN(data.value)
    );

    if (countryData.length === 0) {
      return;
    }

    // Sum all population values from 1960 to 2023
    const totalPopulation = countryData.reduce((sum, data) => sum + data.value, 0);

    // Format the total population
    const formattedTotal = this.formatPopulation(totalPopulation);

    // Create HTML content for popup
    const popupContent = `
      <div style="max-width: 350px; padding: 5px;">
        <p style="margin: 0; font-size: 16px; line-height: 1.5;">
          Population of ${countryName} from year 1960-2023 is ${formattedTotal}
        </p>
      </div>
    `;

    // Show popup using the view's popup
    if (this.view && this.view.popup) {
      this.view.popup.title = countryName;
      this.view.popup.content = popupContent;
      this.view.popup.open({
        location: location
      });
    }
  }
}

