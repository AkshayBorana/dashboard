export interface PopulationData {
  countryName: string;
  countryCode: string;
  year: number;
  value: number;
  // Merged properties from worldBoundaries
  geo_point_2d?: {
    lon: number;
    lat: number;
  };
  geo_shape?: {
    type: string;
    geometry: {
      coordinates: number[][][];
      type: string;
    };
    properties: any;
  };
  status?: string;
  color_code?: string;
  continent?: string;
  region?: string;
  iso_3166_1_alpha_2_codes?: string | null;
  french_short?: string;
  iso3?: string;
}
