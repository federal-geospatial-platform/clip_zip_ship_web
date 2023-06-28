// Import CZS Panel
import CZSPanel from './czs_panel';
import CZSEngine from './czs_engine';
import { PyGeoAPICollectionsCollectionResponsePayload, ParentCollections } from './czs_types';
import CZSUtils from './czs_utils';

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

    function handleStartDrawing() {
        // Start the Engine drawing
        czs_engine.startDrawing();
    }

    async function handleClearDrawing() {
        // Clear the Engine drawing
        await czs_engine.clearDrawingAsync();
    }

    async function handleExtractFeatures(email: string) {
        // Extract features
        await czs_engine.extractFeaturesAsync(email);
    }

    async function handleZoomToCollection(collection: PyGeoAPICollectionsCollectionResponsePayload) {
        // Zoom to collection
        await czs_engine.zoomToCollection(collection);
    }

    async function handleViewCapabilitiesCollection(collection: PyGeoAPICollectionsCollectionResponsePayload) {
        // Open a new window on the url
        window.open(QGIS_SERVICE_URL_ROOT + collection.org_schema + "/" + collection.parent + '?service=WMS&version=1.3.0&request=GetCapabilities&LAYERS=' + collection.short_name, '_blank');
    }

    async function handleViewMetadataCollection(collection: PyGeoAPICollectionsCollectionResponsePayload) {
        // Get info
        let link = CZSUtils.getContentMetadata(collection.links);

        // If found, open a new tab on the url
        if (link) window.open(link.href, '_blank');
    }

    async function handleHigher(coll_type: string, coll_id: string) {
        // Order the layer higher in z index
        await czs_engine.layerOrderHigherAsync(coll_type, coll_id);
    }

    async function handleLower(coll_type: string, coll_id: string) {
        // Order the layer lower in z index
        await czs_engine.layerOrderLowerAsync(coll_type, coll_id);
    }

    async function handleCollectionCheckedChanged(value: string, checked: boolean, parentColl: ParentCollections, checkedColls: string[]) {
        // Update the checked list of collections
        await czs_engine.updateCollectionCheckedAsync(value, checked, parentColl, checkedColls);
    }

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
                content: cgpv.react.createElement(CZSPanel, {
                    handleStartDrawing,
                    handleClearDrawing,
                    handleExtractFeatures,
                    handleZoomToCollection,
                    handleViewCapabilitiesCollection,
                    handleViewMetadataCollection,
                    handleHigher,
                    handleLower,
                    handleCollectionCheckedChanged
                }),
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
