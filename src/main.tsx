import App from './app';
import "./app.scss";

// Fetch the cgpv module
const w = window as any;
const { react, reactDOM } = w['cgpv'];

// Check the html page language so that we load the application with the corresponding language
const lang = document.documentElement.lang || 'en';

// The map config as json object for convenience; it's turned to string later for GeoView
const map_config = {
	'map': {
		'interaction': 'dynamic',
		'viewSettings': {
			'zoom': 4,
			'minZoom': 2,
			'maxZoom': 12,
			'center': [-100, 60],
			'projection': 3978
		},
		'basemapOptions': {
			'basemapId': 'simple',
			'shaded': true,
			'labeled': false
		},
		'listOfGeoviewLayerConfig__': [
			{
				'geoviewLayerId': 'ogcFeatureLYR1',
				'geoviewLayerName': {
					'en': 'MProjects Inv Points'
				},
				'metadataAccessPath': {
					'en': 'http://localhost:5000'
				},
				'geoviewLayerType': 'ogcFeature',
				'listOfLayerEntryConfig': [
					{
						'layerId': 'cdem_mpi__major_projects_inventory_point'
					}
				]
			},
			{
				'geoviewLayerId': 'ogcFeatureLYR2',
				'geoviewLayerName': {
					'en': 'MProjects Inv Lines'
				},
				'metadataAccessPath': {
					'en': 'http://localhost:5000'
				},
				'geoviewLayerType': 'ogcFeature',
				'listOfLayerEntryConfig': [
					{
						'layerId': 'cdem_mpi__major_projects_inventory_line'
					}
				]
			}
		]
	},
	'theme': 'dark',
	'components': ['app-bar', 'nav-bar', 'north-arrow', 'overview-map', 'footer-bar'],
	'corePackages': [],
	'corePackages___': ['layers-panel'],
	'suportedLanguages': ['en', 'fr']
};

// Create the root for the application to reside into
const container = document.getElementById('root');
reactDOM.render(
	<react.StrictMode>
		<App />
		<div
			id="mapWM"
			className="llwp-map"
			style={{'height':'100vh'}}
			data-lang={lang}
			data-config={ JSON.stringify(map_config) }
		></div>
	</react.StrictMode>, container
);
