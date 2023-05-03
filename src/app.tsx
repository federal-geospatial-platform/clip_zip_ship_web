// Import CZS Panel
import CZSPanel from './czs_panel';

/**
 * Create the application module for Clip Zip Ship. With GeoView, most is delegated to it.
 *
 * @returns {JSX.Elemet} the element that creates the container and the map
 */
const App = (): JSX.Element => {

    // The Map ID
    const mapID = 'mapCZS';

    // Fetch the cgpv module
	const w = window as any;
    const cgpv = w['cgpv'];
	const { useEffect } = cgpv.react;

    useEffect(() => {
        // Initialize the map
        cgpv.init(function () {
            //console.log("api is ready");

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

            // call an api function to add a panel with a button in the default group
            cgpv.api.map(mapID).appBarButtons.createAppbarPanel(button, panel, null);
        });

    }, []);

    return (
		<div></div>
	);

};

export default App;
