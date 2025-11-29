import { Component, Input, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Graphic from '@arcgis/core/Graphic';
import Polygon from '@arcgis/core/geometry/Polygon';
import Point from '@arcgis/core/geometry/Point';
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

    // Load all countries when allPopulationData is available
    if (changes['allPopulationData'] && this.isViewReady) {
      if (this.allPopulationData && this.allPopulationData.length > 0) {
        setTimeout(() => {
          this.loadAllCountries();
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
    // Make sure it's configured for interaction
    this.countriesLayer = new GraphicsLayer({
      listMode: 'show',
      visible: true
    });

    // Create a new map
    // Put countriesLayer first so it's on top and receives clicks
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
        
        // Set up hover handler for cursor pointer
        this.setupHoverHandler();

        // Load all countries if data is available
        if (this.allPopulationData && this.allPopulationData.length > 0) {
          this.loadAllCountries();
        }
      }, 200);
    }).catch((error) => {
      console.error('Error initializing MapView:', error);
    });
  }

  /**
   * Set up click handler on the map view to detect country clicks
   */
  private setupClickHandler(): void {
    if (!this.view || !this.countriesLayer) {
      return;
    }

    // Use click event with improved hitTest
    this.view.on('click', (event) => {
      this.handleCountryClick(event);
    });
  }

  /**
   * Handle country click event with improved reliability
   */
  private handleCountryClick(event: any): void {
    if (!this.view || !this.countriesLayer) {
      return;
    }

    // Use hitTest to find graphics at click location
    this.view.hitTest(event).then((response) => {
      
      if (!response || !response.results || response.results.length === 0) {
        return;
      }

      // Look through all results to find a country graphic
      for (const result of response.results) {
        const graphic = (result as any).graphic;
        const layer = (result as any).layer;
                
        // Check if this is a country graphic
        if (graphic && graphic.attributes) {
          const countryName = graphic.attributes.countryName;
          const countryCode = graphic.attributes.countryCode;
    
          // If it's from countries layer or has countryName, show popup
          if (countryName && (layer === this.countriesLayer || countryName)) {
            const mapPoint = event.mapPoint;
            if (mapPoint) {
              this.showCountryPopup(mapPoint, countryName, countryCode);
              return; // Exit after showing popup
            } else {
              console.log('No mapPoint in event');
            }
          }
        }
      }
      
    }).catch((error) => {
      console.error('Error in hit test:', error);
    });
  }

  /**
   * Set up hover handler to change cursor to pointer when hovering over countries
   */
  private setupHoverHandler(): void {
    if (!this.view) {
      return;
    }

    this.view.on('pointer-move', (event) => {
      if (!this.view || !this.countriesLayer) {
        return;
      }

      // Query graphics at the pointer location
      this.view.hitTest(event).then((response) => {
        const container = this.view?.container;
        if (!container) {
          return;
        }

        if (response.results.length > 0) {
          const result = response.results[0];
          const graphic = (result as any).graphic;
          if (graphic && graphic.attributes && graphic.attributes.countryName) {
            // Change cursor to pointer when over a country
            container.style.cursor = 'pointer';
          } else {
            container.style.cursor = 'default';
          }
        } else {
          // Reset cursor when not over a country
          container.style.cursor = 'default';
        }
      }).catch((error) => {
        // On error, reset cursor
        const container = this.view?.container;
        if (container) {
          container.style.cursor = 'default';
        }
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
    
    if (!this.view) {
      console.error('View not available');
      return;
    }
    
    if (!this.allPopulationData || this.allPopulationData.length === 0) {
      console.error('Population data not available');
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
      console.warn('No population data found for country:', countryName);
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
    try {
      if (this.view && this.view.popup) {
        // Ensure location is a Point object
        let popupLocation: Point;
        if (location instanceof Point) {
          popupLocation = location;
        } else if (location && location.longitude !== undefined && location.latitude !== undefined) {
          popupLocation = new Point({
            longitude: location.longitude,
            latitude: location.latitude,
            spatialReference: { wkid: 4326 }
          });
        } else if (location && location.x !== undefined && location.y !== undefined) {
          popupLocation = new Point({
            x: location.x,
            y: location.y,
            spatialReference: location.spatialReference || { wkid: 4326 }
          });
        } else {
          console.error('Invalid location format:', location);
          return;
        }
        
        // Set popup properties
        this.view.popup.title = countryName;
        this.view.popup.content = popupContent;
        this.view.popup.location = popupLocation;
        this.view.popup.visible = true;
      } else {
        console.error('View or popup not available', {
          hasView: !!this.view,
          hasPopup: !!(this.view && this.view.popup)
        });
      }
    } catch (error) {
      console.error('Error showing popup:', error);
    }
  }
}

