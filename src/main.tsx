import App from './app';
import "./app.scss";

// Fetch the cgpv module
const w = window as any;
const { react, reactDOM } = w['cgpv'];

// Check the html page language so that we load the application with the corresponding language
const lang = document.documentElement.lang || 'en';

// The Map ID
const mapID = 'mapCZS';

// The map config as json object for convenience; it's turned to string later for GeoView
const map_config = {
	'map': {
		'interaction': 'dynamic',
		'viewSettings': {
			'zoom': 4,
			'center': [-100, 50],
			'projection': 3978
		},
		'basemapOptions': {
			'basemapId': 'simple',
			'shaded': true,
			'labeled': false
		},
		'listOfGeoviewLayerConfig': [{"geoviewLayerId":"cdem_alex__cdem","geoviewLayerName":{"en":"Canadian Digital Elevation Model, 1945-2011 - alex","fr":"Canadian Digital Elevation Model, 1945-2011 - alex"},"metadataAccessPath":{"en":"https://maps.geogratis.gc.ca/wms/hydro_network_en","fr":"https://maps.geogratis.gc.ca/wms/hydro_network_en"},"geoviewLayerType":"ogcWms","listOfLayerEntryConfig":[{"layerId":"hydro_network","layerName":{"en":"hydro_network","fr":"hydro_network"}}]}]
	},
	'theme': 'dark',
	'components': ['app-bar', 'nav-bar', 'north-arrow', 'overview-map', 'footer-bar'],
	'corePackages': ['layers-panel'],
	'suportedLanguages': ['en', 'fr']
};

// Create the root for the application to reside into
const container = document.getElementById('root');
reactDOM.render(
	<react.StrictMode>
		<App />
		<div
			id={mapID}
			className="llwp-map"
			style={{'height':'100vh'}}
			data-lang={lang}
			data-config={ JSON.stringify(map_config) }
		></div>
	</react.StrictMode>, container
);
