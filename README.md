# Population Dashboard

A comprehensive web application for visualizing and exploring global population data from 1960 to 2023. The dashboard provides interactive visualizations through maps, charts, and tables, enabling users to analyze population trends by country or year.

## About

The Population Dashboard is an Angular-based application that fetches and visualizes global population data. It integrates population statistics with geographic boundaries to provide an interactive exploration experience. Users can:

- **Explore by Country**: View population trends over time (1960-2023) for any country
- **Compare by Year**: See population distribution across all countries for a specific year
- **Interactive Map**: Click on countries to view population summaries
- **Data Tables**: Browse detailed population records with pagination

The application merges population data from datahub.io with world administrative boundaries from OpenDataSoft to create a rich, interactive visualization experience.

## Prerequisites

- **Node.js**: Version 19.x or higher
- **npm**: Comes with Node.js (or use yarn/pnpm)

To check your Node.js version:
```bash
node --version
```

If you need to install or update Node.js, visit [nodejs.org](https://nodejs.org/).

## Tech Stack

### Core Framework
- **Angular**: ^19.2.0

### UI Libraries
- **PrimeNG**: ^19.1.4 (Data tables and UI components)
- **@primeng/themes**: ^19.1.4 (Theme system)
- **ECharts**: ^5.6.0 (Charting library)
- **ngx-echarts**: ^19.0.0 (Angular wrapper for ECharts)
- **ArcGIS Maps SDK**: ^4.34.0 (Interactive maps)
- **@arcgis/map-components**: ^4.34.0 (Map components)

### Utilities & Runtime
- **RxJS**: ~7.8.0 (Reactive programming)
- **TypeScript**: ^5.7.2 (Type-safe JavaScript)
- **Zone.js**: ~0.15.0 (Change detection)
- **tslib**: ^2.3.0 (TypeScript runtime library)

### Development Tools
- **Angular CLI**: ^19.2.19
- **@angular-devkit/build-angular**: ^19.2.19
- **Karma**: ^6.4.0 (Test runner)
- **Jasmine**: ^5.6.0 (Testing framework)

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dashboard
```

2. Install dependencies:
```bash
npm install
```

### Development Server

To start a local development server, run:

```bash
ng serve
# or
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

### Building

To build the project for production, run:

```bash
ng build
# or
npm run build
```

This will compile your project and store the build artifacts in the `dist/` directory. The production build optimizes your application for performance and speed.

### Running Tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use:

```bash
ng test
# or
npm test
```

## Project Structure

```
src/app/
├── app.component.ts          # Main application component
├── app.routes.ts             # Application routes
├── app.config.ts             # Application configuration
├── shared/
│   ├── components/           # Reusable components
│   │   ├── chart/           # Chart visualization component
│   │   ├── dropdown/        # Dropdown filter component
│   │   ├── maps/            # Interactive map component
│   │   └── table/           # Data table component
│   └── services/            # Shared services
│       └── population.service.ts  # Population data service
└── styles.scss              # Global styles
```

## Features

- **Interactive World Map**: Click on countries to view population summaries
- **Bar Charts**: Visualize population trends with pagination (10 items per page)
- **Data Tables**: Browse detailed records with PrimeNG tables
- **Dual View Modes**: 
  - Country view: Time series data (1960-2023)
  - Year view: Cross-country comparison
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Real-time Data**: Fetches data from external APIs

## API Endpoints

The application uses the following data sources:

- **Population Data**: `/api/core/population/_r/-/data/population.csv` (proxied to datahub.io)
- **World Boundaries**: `https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/world-administrative-boundaries/records/`

Note: A proxy configuration (`proxy.conf.json`) is used during development to handle CORS restrictions.

## Code Scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Additional Resources

- [Angular Documentation](https://angular.dev)
- [Angular CLI Overview](https://angular.dev/tools/cli)
- [PrimeNG Documentation](https://primeng.org)
- [ECharts Documentation](https://echarts.apache.org)
- [ArcGIS Maps SDK Documentation](https://developers.arcgis.com/javascript/latest/)

## License

This project is private and proprietary.
