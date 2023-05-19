// Import CZS Panel
import CZSPanel from './czs_panel';
import CZSEngine from './czs_engine';

/**
 * Create the application module for Clip Zip Ship. With GeoView, most is delegated to it.
 *
 * @returns {JSX.Elemet} the element that creates the container and the map
 */
const App = (): JSX.Element => {

    // Fetch the cgpv module
	const w = window as any;
    const cgpv = w['cgpv'];
    const { react } = cgpv;
    const { useEffect } = react;
    const MAP_ID = "mapCZS";
    let czs_engine: CZSEngine;

    useEffect(() => {
        // Initialize the map
        cgpv.init(function () {
            // Now that the API is initialized;
            // Initialize the CZS Engine
            czs_engine = new CZSEngine(cgpv, MAP_ID, document.documentElement.lang);

            // Button
            const button = {
                id: 'AppbarPanelButtonId',
                tooltip: 'Clip Zip Ship',
                tooltipPlacement: 'right',
                children: cgpv.react.createElement(cgpv.ui.elements.AppsIcon),
            };

            // Panel
            const panel = {
                panelId: 'CZSPanelID',
                title: 'Clip Zip Ship (PRE-ALPHA BUILD)',
                content: cgpv.react.createElement(CZSPanel),
                width: 450,
            };

            // Call an api function to add a panel with a button in the default group
            cgpv.api.map(MAP_ID).appBarButtons.createAppbarPanel(button, panel, null);
        });

    }, []);

    return (
		<div></div>
	);

};

export default App;
