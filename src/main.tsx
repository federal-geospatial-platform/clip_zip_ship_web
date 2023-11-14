import App from './app';
import './app.scss';

// Fetch the cgpv module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const w = window as any;
const { react, createRoot } = w.cgpv;
const MAP_ID = 'mapCZS';

// Check the html page language so that we load the application with the corresponding language
const lang = document.documentElement.lang || 'en';

// The map config as json object for convenience; it's turned to string later for GeoView
const mapConfig = {
  map: {
    interaction: 'dynamic',
    viewSettings: {
      zoom: 6,
      center: [-100, 55],
      projection: 3978,
    },
    basemapOptions: {
      basemapId: 'simple',
      shaded: true,
      labeled: false,
    },
    listOfGeoviewLayerConfig: [],
  },
  theme: 'light',
  components: ['north-arrow'],
  appBar: [],
  corePackages: [], // 'layers-panel'
  suportedLanguages: ['en', 'fr'],
};

// Create the root for the application to reside into
const container = createRoot(document.getElementById('root') as HTMLElement);
container.render(
  <react.StrictMode>
    <App mapId={MAP_ID} />
    <div id={MAP_ID} className="llwp-map" style={{ height: '100vh' }} data-lang={lang} data-config={JSON.stringify(mapConfig)} />
  </react.StrictMode>,
);
