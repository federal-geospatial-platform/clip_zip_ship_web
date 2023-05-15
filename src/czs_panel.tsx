import CZSServices, { PyGeoAPICollectionsCollectionResponsePayload,
    PyGeoAPIRecordsResponsePayload,
    PyGeoAPICollectionsCollectionLinkResponsePayload
} from './czs_services';
import T_EN from '../locales/en/translation.json';
import T_FR from '../locales/fr/translation.json';

// CONFIG
const mapID ="mapCZS";
const geomGrpDrawID = "czs_geoms";
const zIndexVectors = 101;
const zIndexRasters = 100;
const zIndexDrawing = 1000;

let _isDebug = false;
let _drawInter: { stopInteraction: Function };
let _geometry: any | undefined;
let _collections: Array<PyGeoAPICollectionsCollectionResponsePayload> = [];
let _checkedCollections: any = {};
let _viewedCollections: any = {};

export class ThemeCollections {
    theme: ThemeItem;
    collections: Array<PyGeoAPICollectionsCollectionResponsePayload>;

    constructor(theme: ThemeItem, collections: Array<PyGeoAPICollectionsCollectionResponsePayload>) {
      this.theme = theme;
      this.collections = collections;
    }
};

export type ThemeItem = {
    id: string;
    name: string;
};


/**
 * Create a container containing a leaflet map using the GeoView viewer
 *
 * @returns {JSX.Elemet} the element that creates the container and the map
 */
const CZSPanel = (): JSX.Element => {

    // Fetch the cgpv module
    const w = window as any;
    const cgpv = w['cgpv'];
    const { api, react, types, ui, useTranslation, draw: Draw } = cgpv;
    //const { AbstractGeoViewLayer } = types; // TODO: This explodes in the core..
    const { utilities } = api;
    const { geometryToWKT, wktToGeometry, geojsonToGeometry, getArea, defaultDrawingStyle } = api.geoUtilities;
    const { createElement: h, useState, useEffect, useCallback } = react;
    const { makeStyles, useTheme } = ui;
    const { Button, CircularProgress, Accordion, CheckboxListAlex, TextField } = ui.elements;

    // Translation
    const { t, i18n } = useTranslation();

    // States
    const [collectionsFeatures, _setCollectionsFeatures] = useState([]);
    const [collectionsCoverages, _setCollectionsCoverages] = useState([]);
    const [checkedCollections, _setCheckedCollections] = useState({});
    const [clearButtonState, _setClearButtonState] = useState({});
    const [extractButtonActive, _setExtractButtonActive] = useState(false);
    const [email, _setEmail] = useState("alexandre.roy@nrcan-rncan.gc.ca");
    const [isLoading, _setIsLoading] = useState(false);
    const [isLoadingFeatures, _setIsLoadingFeatures] = useState(false);
    const [isOrderLoading, _setIsOrderLoading] = useState([]);
    const [isDEBUG, _setIsDEBUG] = useState(false);

    // // Style the container
    // const useStyles = makeStyles((theme: any) => ({
    //     positionContainer: {
    //         marginLeft: 75,
    //         backgroundColor: '#fff',
    //         padding: 10,
    //         height: '100%',
    //         'min-width': 600,
    //         overflow: 'auto',
    //         pointerEvents: 'initial',
    //     },
    //     listCollections: {
    //         'padding-inline-start': 0,
    //     }
    // }));

    // Get the classes for the styles
    //const defaultTheme = useTheme();
    //const classes = useStyles();

    useEffect(() => {
        //console.log("CZSPanel useEffect");
        utilities.showMessage(mapID, "This is a pre-alpha release. Only for experimentation purposes.");

        // Add CZS translations file
        i18n.addResourceBundle("en", "translation", T_EN);
        i18n.addResourceBundle("fr", "translation", T_FR);

        // Listen to the map loaded event
        api.event.on(
            api.eventNames.MAP.EVENT_MAP_LOADED,
            (payload: any) => {
                // The map
                const map = cgpv.api.map(mapID);

                // Create geometry group which will handle the drawing
                const geomGrp = map.layer.vector.createGeometryGroup(geomGrpDrawID);

                // Set the default styling for the vector layer
                geomGrp.vectorLayer.setStyle(defaultDrawingStyle('orange'));

                // Make sure it'll always be on top of every layers
                geomGrp.vectorLayer.setZIndex(zIndexDrawing);

                // Init modify interaction
                const modifInter = cgpv.api.map(mapID).initModifyInteractions(geomGrpDrawID);
                //const transInter = cgpv.api.map(mapID).initTranslateInteractions();

                // Load the collections off the bat
                loadCollectionsAsync();
            },
            mapID
        );

        // Listen to the draw ended event
        api.event.on(
            api.eventNames.INTERACTION.EVENT_DRAW_ENDED,
            (payload: any) => {
                // Redirect
                onDrawEndAsync(payload.drawInfo);
            },
            mapID
        ); // End "on" handler

        // Listen to the modify ended event
        api.event.on(
            api.eventNames.INTERACTION.EVENT_MODIFY_ENDED,
            (payload: any) => {
                // Redirect
                onDrawChangeAsync(payload.modifyInfo);
            },
            mapID
        ); // End "on" handler

    }, []);

    async function onStartDrawingAsync() {
        // Clear current drawing
        cgpv.api.map(mapID).layer.vector.deleteGeometriesFromGroup(geomGrpDrawID);

        // Init drawing interaction
        _drawInter = cgpv.api.map(mapID).initDrawInteractions(geomGrpDrawID, "Polygon");
    }

    function onStopDrawing() {
        if (_drawInter) {
            _drawInter.stopInteraction();
        }
    }

    async function onClearDrawingAsync() {
        // Clear current drawing
        cgpv.api.map(mapID).layer.vector.deleteGeometriesFromGroup(geomGrpDrawID);
        // Stop drawing if currently drawing
        onStopDrawing();
        // Reload the collections from scratch
        await loadCollectionsAsync();
    }

    async function onDrawChangeAsync(e: any) {
        // Reset the geometry and reload the collections
        let geom = e.features.getArray()[0].getGeometry();
        await loadCollectionsAsync(geom);
    }

    async function onDrawEndAsync(e: any) {
        //console.log("onDrawEnd", e);
        let geom = e.feature.getGeometry();

        // Stop the interaction
        // TODO: Refactor: Delay the stoppage of the interaction, because we're handling it on the stop event of said interaction itself (prevents a double-click event)
        setTimeout(() => {
            // Stop drawing interaction
            onStopDrawing();
        });

        // Zoom to geometry
        api.map(mapID).zoomToExtent(geom.getExtent(), { padding: [100, 100, 100, 100], duration: 1000 });

        // Load collections in geometry
        await loadCollectionsAsync(geom);
    }

    async function loadCollectionsAsync(geom?: any) {
        // Store the geometry
        _geometry = geom;

        // Get the geometry
        console.log("loadCollectionsAsync", geom);

        // Set the state
        _setClearButtonState({active: !!_geometry});

        // Is loading
        _setIsLoading(true);

        // Get the collections
        let colls: PyGeoAPICollectionsCollectionResponsePayload[] | void = await CZSServices.getCollectionsPOSTAsync(i18n.language + "-CA", geometryToWKT(_geometry), 3978).catch(_handleError).finally(() => {
            // Done loading
            _setIsLoading(false);
        });

        // If any
        if (colls) {
            // Group the collections by types and then by themes
            _collections = [];
            let collectionFeatures: Array<ThemeCollections> = [];
            let collectionCoverages: Array<ThemeCollections> = [];
            colls.forEach((collection: PyGeoAPICollectionsCollectionResponsePayload) => {
                // Depending on the type
                let themeColls: ThemeCollections[] | undefined;
                if (collection.itemType == "feature") {
                    themeColls = collectionFeatures;
                }

                else if (collection.itemType == "coverage") {
                    themeColls = collectionCoverages;
                }

                // If found
                if (themeColls) {
                    // Find the theme
                    let thmColl = themeColls?.find((thmCol: ThemeCollections) => {
                        return thmCol.theme.id == collection.theme;
                    });

                    // If not found
                    if (!thmColl) {
                        thmColl = new ThemeCollections({
                            id: collection.theme,
                            name: collection.theme
                        }, []);
                        themeColls.push(thmColl);
                    }

                    // Add the collection to the ThemeCollections
                    thmColl.collections.push(collection);
                    _collections.push(collection);
                }
            });

            // Proceed to change the state
            _setCollectionsFeatures(collectionFeatures);
            _setCollectionsCoverages(collectionCoverages);

            // Display features on map
            await updateLayersOnMapAsync(geom);
        }
    }

    async function callExtractFeaturesAsync(email: string) {
        // Is loading
        _setIsLoadingFeatures(true);

        // Extract the collections
        let res = await CZSServices.extractFeaturesAsync(Object.keys(_viewedCollections), email, geometryToWKT(_geometry), 3978).catch(_handleError).finally(() => {
            // Stop loading
            _setIsLoadingFeatures(false);
        });
        if (!res) return;

        // Show message to user
        utilities.showSuccess(mapID, "Extraction completed, check your emails!");
        console.log("EXTRACTION RESULT", res);
    }

    async function onCollectionCheckedChanged(list_key: string, themeColl: ThemeCollections, value: string, checked: boolean, checkedColls: Array<string>) {
        //console.log("collection checked changed", themeColl, value, checked, checkedColls);
        const the_key = list_key + "_" + themeColl.theme.id;

        // Replace it
        _checkedCollections[the_key] = checkedColls;
        _setCheckedCollections({ ..._checkedCollections });

        // Find the collection information for that collection id
        let coll_info = findCollectionFromID(value);

        // If found
        if (coll_info) {
            // If showing
            if (checked) {
                // Is loading
                _setIsLoadingFeatures(true);

                // Add collection layer
                await addCollectionAsync(coll_info, _geometry).finally(() => {
                    // Done loading
                    _setIsLoadingFeatures(false);
                });
            }

            else {
                // Remove collection layer
                removeCollection(coll_info.id);
            }

            // If extraction is possible
            _setExtractButtonActive(!!(Object.keys(_viewedCollections).length) && email);
        }
    }

    async function updateLayersOnMapAsync(geom?: any) {
        try {
            // Is loading
            _setIsLoadingFeatures(true);

            // Get the checked collections
            const checkedColls: string[] = getCheckedCollections();

            // For each checked collections
            for await (const coll_id of checkedColls) {
                // Find the collection information for that collection id
                let coll_info = findCollectionFromID(coll_id);

                // If found
                if (coll_info) {
                    // Add collection layer
                    await addCollectionAsync(coll_info, geom);
                }

                else {
                    // We have remaining checked collections which aren't listed anymore.
                    if (_viewedCollections[coll_id]) {
                        removeCollection(coll_id)
                    }
                }
            }

            // // For each viewed collection
            // if (_viewedCollections) {
            //     for (let k in _viewedCollections) {
            //         console.log("This coll is visible", k);
            //     }
            // }

            console.log("Updated collections", checkedColls, _viewedCollections);

            // If extraction is possible
            _setExtractButtonActive(!!(Object.keys(_viewedCollections).length) && email);
        }

        finally {
            // Done loading
            _setIsLoadingFeatures(false);
        }
    }

    async function addCollectionAsync(coll_info: PyGeoAPICollectionsCollectionResponsePayload, geom?: any) {
        // Check if extraction area is big enough
        if (geom && getAreaInKm2(geom) <= getFakeAreaColl(coll_info.id)) {
            // Depending on the collection type
            if (coll_info.itemType == "feature") {
                // Flush the geometry group
                removeCollection(coll_info.id);

                // Add vector collection
                await addCollectionVectorAsync(coll_info, geom);
            }

            else {
                // Add raster collection
                await addCollectionRasterAsync(coll_info, geom);
            }
        }

        else {
            // Flush the geometry group
            removeCollection(coll_info.id);

            // Add fingerprint
            _addFingerprintCollection(coll_info);
        }
    }

    async function addCollectionVectorAsync(coll_info: PyGeoAPICollectionsCollectionResponsePayload, geom?: any) {
        // Query
        let coll_res: PyGeoAPIRecordsResponsePayload | void = await CZSServices.getFeaturesAsync(coll_info, geometryToWKT(geom), 3978).catch(_handleError);

        //console.log("Records", coll_res);
        if (coll_res && coll_res.data.features && coll_res.data.features.length > 0) {
            // Create geometry group which will handle the records results
            const geomGrpRes = cgpv.api.map(mapID).layer.vector.createGeometryGroup(coll_info.id);

            // Set the zindex
            geomGrpRes.vectorLayer.setZIndex(zIndexVectors)

            // Set the active geometry group
            cgpv.api.map(mapID).layer.vector.setActiveGeometryGroup(coll_info.id);

            // Keep track
            _viewedCollections[coll_info.id] = {
                type: 'feature',
                info: geomGrpRes
            };

            // Load the features in the group
            _loadFeaturesInGroup(coll_res.data.features, parseInt(coll_info.crs[0]), "blue", "green");
        }
    }

    async function addCollectionRasterAsync(coll_info: PyGeoAPICollectionsCollectionResponsePayload, geom?: any) {
        // Prep the config
        let layerConfig = {
            'geoviewLayerType': 'ogcWms',
            'geoviewLayerId': coll_info.id,
            'geoviewLayerName': { 'en': coll_info.title, 'fr': coll_info.title },
            'metadataAccessPath': { 'en': QGIS_SERVICE_URL_ROOT + coll_info.org_schema + '/' + coll_info.parent, 'fr': QGIS_SERVICE_URL_ROOT + coll_info.org_schema + '/' + coll_info.parent },
            'listOfLayerEntryConfig': [
                {
                    'layerId': coll_info.id,
                    'layerName': { 'en': coll_info.title, 'fr': coll_info.title },
                    'source': {
                        'dataProjection': "EPSG:4326" // Default..
                    },
                }
            ]
        };

        // If crs is defined
        if (coll_info.crs && coll_info.crs.length > 0 && Number.isInteger(coll_info.crs[0]))
            layerConfig['listOfLayerEntryConfig'][0]['source']['dataProjection'] = 'EPSG:' + coll_info.crs[0];

        if (_isDebug) {
            layerConfig['metadataAccessPath'] = { 'en': 'https://maps.geogratis.gc.ca/wms/hydro_network_en', 'fr': 'https://maps.geogratis.gc.ca/wms/hydro_network_en' };
            layerConfig['listOfLayerEntryConfig'][0]['layerId'] = 'hydro_network';
            layerConfig['listOfLayerEntryConfig'][0]['layerName'] = { 'en': 'hydro_network', 'fr': 'hydro_network' };
            if (coll_info.id == "cdem_mpi__cdem") {
                layerConfig['metadataAccessPath'] = { 'en': 'https://maps.geogratis.gc.ca/wms/railway_en', 'fr': 'https://maps.geogratis.gc.ca/wms/railway_fr' };
                layerConfig['listOfLayerEntryConfig'][0]['layerId'] = 'railway';
                layerConfig['listOfLayerEntryConfig'][0]['layerName'] = { 'en': 'Railways', 'fr': 'Chemins de fer' };
            }
        }

        // If already visible
        if (_viewedCollections[coll_info.id] && _viewedCollections[coll_info.id].type == "raster") {
            // Get the layer as soon as it's in the api
            let lyr = await api.map(mapID).layer.getGeoviewLayerByIdAsync(coll_info.id, false);

            // Set the visible extent for the layer
            adjustExtentOnLayerID(lyr, geom);
        }

        else {
            // Flush the collection, in case it's been set as a footprint
            removeCollection(coll_info.id);

            // Add the layer
            api.map(mapID).layer.addGeoviewLayer(layerConfig);

            // Get the layer as soon as it's in the api
            let lyr = await api.map(mapID).layer.getGeoviewLayerByIdAsync(coll_info.id, false);

            // Set the visible extent for the layer
            adjustExtentOnLayerID(lyr, geom);

            // Get the layer as soon as it's in the api AND loaded on the map
            lyr = await api.map(mapID).layer.getGeoviewLayerByIdAsync(coll_info.id, true);

            // Now we can adjust its z-index
            lyr.gvLayers.setZIndex(zIndexRasters);

            // Keep track
            _viewedCollections[coll_info.id] = {
                type: 'raster',
                info: layerConfig
            };
        }
    }

    function _addFingerprintCollection(coll_info: PyGeoAPICollectionsCollectionResponsePayload) {
        // Create geometry group which will handle the records results
        const geomGrpRes = cgpv.api.map(mapID).layer.vector.createGeometryGroup(coll_info.id);

        // Set the zindex
        geomGrpRes.vectorLayer.setZIndex(zIndexVectors)

        // Set the active geometry group
        cgpv.api.map(mapID).layer.vector.setActiveGeometryGroup(coll_info.id);

        // Load the features in the group
        _loadFeaturesInGroup([coll_info.wkt], 4617, "red", "red");

        // Show error
        utilities.showError(mapID, "Extraction area too big for collection: " + coll_info.title);
    }

    function removeCollection(collection_id: string) {
        // Delete the collection when it's part of a geometry group
        if (cgpv.api.map(mapID).layer.vector.getGeometryGroup(collection_id))
            cgpv.api.map(mapID).layer.vector.deleteGeometryGroup(collection_id);

        // If the collection is viewable
        if (_viewedCollections.hasOwnProperty(collection_id)) {
            let temp = _viewedCollections[collection_id];
            // If raster type
            if (temp.type == "raster") {
                api.map(mapID).layer.removeGeoviewLayer(temp.info);
            }

            // Done
            delete _viewedCollections[collection_id];
        }
    }

    function _loadFeaturesInGroup(features: any[], crs: number, color: string, colorClip: string) {
        // For each records in the collection result
        features.forEach((rec: any) => {
            // If the feature comes in as a geojson
            let geometry;
            if (rec.geometry) {
                geometry = geojsonToGeometry(rec.geometry);
            }
            else {
                geometry = wktToGeometry(rec);
            }

            // Depending on the geometry type
            if (geometry.getType() == "LineString") {
                // Add geometry to feature collection
                cgpv.api.map(mapID).layer.vector.addPolyline(geometry.getCoordinates(), { projection: crs, style: { strokeColor: color, strokeOpacity: 0.5, strokeWidth: 1 } });
            }

            else if (geometry.getType() == "Point") {
                // Add geometry to feature collection
                cgpv.api.map(mapID).layer.vector.addMarkerIcon(geometry.getCoordinates(), {
                    projection: crs,
                    style: {
                        anchor: [0.5, 256],
                        size: [256, 256],
                        scale: 0.1,
                        anchorXUnits: 'fraction',
                        anchorYUnits: 'pixels',
                        src: './img/Marker_green.png',
                    }
                });
            }

            else if (geometry.getType() == "Polygon") {
                // Add geometry to feature collection
                cgpv.api.map(mapID).layer.vector.addPolygon(geometry.getCoordinates(), { projection: crs, style: { strokeColor: color, strokeOpacity: 1, strokeWidth: 1, fillColor: color, fillOpacity: 0.05 } });
            }

            else if (geometry.getType() == "MultiPolygon") {
                // For each polygon
                geometry.getPolygons().forEach((poly: any) => {
                    // Add geometry to feature collection
                    cgpv.api.map(mapID).layer.vector.addPolygon(poly.getCoordinates(), { projection: crs, style: { strokeColor: color, strokeOpacity: 1, strokeWidth: 1, fillColor: color, fillOpacity: 0.05 } });
                });
            }

            else {
                // Error
                console.log("Unknown geometry type");
            }

            // If was clipped too
            if (rec.geometry_clipped) {
                if (rec.geometry_clipped.type == "LineString") {
                    // If not multi line
                    if (!(Array.isArray(rec.geometry_clipped.coordinates[0]) &&
                        Array.isArray(rec.geometry_clipped.coordinates[0][0]))) {
                        // Make it a multi line for simplicity
                        rec.geometry_clipped.coordinates = [rec.geometry_clipped.coordinates];
                    }

                    // For each line segment
                    rec.geometry_clipped.coordinates.forEach((coords: number[]) => {
                        cgpv.api.map(mapID).layer.vector.addPolyline(coords, { projection: crs, style: { strokeColor: colorClip, strokeWidth: 1 } });
                    });
                }

                else if (rec.geometry_clipped.type == "Polygon") {
                    cgpv.api.map(mapID).layer.vector.addPolygon(rec.geometry_clipped.coordinates, { projection: crs, style: { strokeColor: colorClip, strokeWidth: 1, fillColor: colorClip, fillOpacity: 0.3 } });
                }

                else if (rec.geometry_clipped.type == "MultiPolygon") {
                    // For each polygon
                    rec.geometry_clipped.coordinates.forEach((coords: number[][]) => {
                        cgpv.api.map(mapID).layer.vector.addPolygon(coords, { projection: crs, style: { strokeColor: colorClip, strokeWidth: 1, fillColor: colorClip, fillOpacity: 0.3 } });
                    });
                }

                else if (rec.geometry_clipped.type == "Point" || rec.geometry_clipped.type == "MultiPoint") {
                    // No worries, skip
                }

                else {
                    // Error
                    console.log("Unknown geometry clipped type", rec.geometry_clipped.type);
                }
            }
        });
    }

    function _handleHigher(e: any, coll_type: string, collection_id: string) {
        // Is loading
        isOrderLoading.push(collection_id);
        _setIsOrderLoading([...isOrderLoading]);

        // Go
        higherAsync(coll_type, collection_id).finally(() => {
            _setIsOrderLoading(isOrderLoading.filter(function (val: string) { return val !== collection_id }));
        });
    }

    function _handleLower(e: any, coll_type: string, collection_id: string) {
        // Is loading
        isOrderLoading.push(collection_id);
        _setIsOrderLoading([...isOrderLoading]);

        // Go
        lowerAsync(coll_type, collection_id).finally(() => {
            _setIsOrderLoading(isOrderLoading.filter(function(val: string) { return val !== collection_id }));
        });
    }

    async function higherAsync(coll_type: string, collection_id: string) {
        // Depending on the kind of layer
        if (coll_type == "feature") {
            // Get the geometry group vector layer
            let vLayer = cgpv.api.map(mapID).layer.vector.getGeometryGroup(collection_id).vectorLayer;
            let zindex = vLayer.getZIndex();
            zindex++;
            vLayer.setZIndex(zindex);
        }

        else {
            // Raster type, those are added like a regular layer
            const lyr = await api.map(mapID).layer.getGeoviewLayerByIdAsync(collection_id, true);
            let zindex = lyr.gvLayers.getZIndex();
            zindex++;
            await setZIndexAsync(lyr, zindex);
        }
    }

    async function lowerAsync(coll_type: string, collection_id: string) {
        // Depending on the kind of layer
        if (coll_type == "feature") {
            // Get the geometry group vector layer
            let vLayer = cgpv.api.map(mapID).layer.vector.getGeometryGroup(collection_id).vectorLayer;
            let zindex = vLayer.getZIndex();
            zindex--;
            vLayer.setZIndex(zindex);
        }

        else {
            // Raster type, those are added like a regular layer
            const lyr = await api.map(mapID).layer.getGeoviewLayerByIdAsync(collection_id, true);
            let zindex = lyr.gvLayers.getZIndex();
            zindex--;
            await setZIndexAsync(lyr, zindex);
        }
    }

    function onEmailChange(e: any): void {
        const txtEmail: typeof TextField = document.getElementById('czs_email');
        _setEmail(txtEmail?.value);
        _setExtractButtonActive(!!(Object.keys(_viewedCollections).length) && txtEmail?.value);
    }

    async function onExtractFeatures() {
        // Extract the collections as a zip
        await callExtractFeaturesAsync(email);
    }

    function writeTitle(thmColl: ThemeCollections) {
        // Theme name with numbers of collections
        return thmColl.theme.name + " (" + thmColl.collections.length + ")";
    }

    function writeContentThemes(list_key: string, thmColls: ThemeCollections[]) {
        // For each theme
        return <Accordion
            className="accordion-theme"
            items={Object.values(thmColls).map((thmColl: ThemeCollections) => (
                {
                    title: writeTitle(thmColl),
                    content: writeContentColls(list_key, thmColl)
                }
            ))}
        ></Accordion>;
    }

    function writeContentColls(list_key: string, thmColl: ThemeCollections) {
        // If a regular feature/coverage collection
        if (thmColl.collections && thmColl.collections.length > 0) {
            let key = list_key + "_" + thmColl.theme.id;
            return <CheckboxListAlex
                multiselect={true}
                listItems={Object.values(thmColl.collections).map((coll: PyGeoAPICollectionsCollectionResponsePayload) => {
                    return {
                        display: coll.title,
                        value: coll.id,
                        content: getContentLayer(key, coll)
                    };
                })}
                checkedValues={checkedCollections[key] || []}
                checkedCallback={(value: string, checked: boolean, allChecked: Array<string>) => onCollectionCheckedChanged(list_key, thmColl, value, checked, allChecked)}
            ></CheckboxListAlex>;
        }

        else
            return null;
    }

    function getContentLayer(key: string, coll: PyGeoAPICollectionsCollectionResponsePayload) {
        let link = getContentMetadata(coll.links);
        let html_link: JSX.Element = <span></span>;
        if (link) {
            html_link = <div className="layer-metadata">
                    <a href={link.href} title={link.title} target='_blank'>
                        <img src='./img/metadata.png' style={{
                            'width': '20px',
                            'height': '20px',
                            'marginTop': '2px',
                            'marginLeft': '5px',
                        }}></img>
                    </a>
                </div>;
        }
        let orders: JSX.Element = <span></span>;
        if (checkedCollections[key] && checkedCollections[key].includes(coll.id)) {
            orders = <div className={`layer-order-layers ${isOrderLoading.includes(coll.id) ? "loading" : ""}`}>
                        <a onClick={ (e) => { _handleHigher(e, coll.itemType, coll.id); } } title="Bring to front">
                            <img src='./img/arrow_up.png' style={{
                                'width': '20px',
                                'height': '20px',
                                'marginTop': '2px',
                                'marginLeft': '5px',
                            }}></img>
                        </a>
                        <a onClick={ (e) => { _handleLower(e, coll.itemType, coll.id); } } title="Send to back">
                            <img src='./img/arrow_down.png' style={{
                                'width': '20px',
                                'height': '20px',
                                'marginTop': '2px',
                                'marginLeft': '5px',
                            }}></img>
                        </a>
                    </div>;
        }
        return <div>{html_link}{orders}</div>;
    }

    function getContentMetadata(links: PyGeoAPICollectionsCollectionLinkResponsePayload[]): PyGeoAPICollectionsCollectionLinkResponsePayload | null {
        // Find the canonical metadata url if any
        let link = null;
        links.forEach((l) => {
            if (l.type == "text/html" && l.rel == "canonical")
                link = l;
        });
        return link;
    }

    /**
     * Set the z-index of a layer and one can await until it's actually set and effective.
     *
     * @param {number} zindex The z-index to set.
     */
    async function setZIndexAsync(layer: any, zindex: number) {
        if (layer.gvLayers) {
            layer.gvLayers.setZIndex(zindex);
            await utilities.whenThisThenAsync(() => {
                return layer.gvLayers.state_.zIndex === zindex;
            }, 50000);
        }
    }

    function getCheckedCollections() {
        let checkedcolls: string[] = [];
        Object.keys(_checkedCollections).forEach((the_key: string) => {
            checkedcolls = checkedcolls.concat(_checkedCollections[the_key]);
        });
        return checkedcolls;
    }

    function getAreaInKm2(geom: any) {
        return getArea(geom, {projection: 'EPSG:3978'}) / 1000000
    }

    function getFakeAreaColl(collection_id: string) {
        //if (collection_id == "major_projects___major_projects_inventory_point") return 1000000;
        //if (collection_id == "major_projects___major_projects_inventory_line") return 250000;
        return 1000;
    }

    function findCollectionFromID(collection_id: string): PyGeoAPICollectionsCollectionResponsePayload | null {
        // Find the collection information in our data
        let colls : PyGeoAPICollectionsCollectionResponsePayload[] = [];

        // For each collection
        colls = colls.concat(_collections.filter((coll: PyGeoAPICollectionsCollectionResponsePayload) => {
            return coll.id == collection_id;
        }));

        // If found
        if (colls.length > 0)
            return colls[0];
        return null;
    }

    function _handleError(err: any) {
        console.log("ERROR", err);
        utilities.showError(mapID, err);
    }

    function toggleDebug() {
        _isDebug = !_isDebug;
        _setIsDEBUG(_isDebug);
    }

    function adjustExtentOnLayerID(layer: any, geom?: any) {
        let ext = undefined;
        if (geom) ext = geom.getExtent();
        layer.setExtent(ext);
        layer.setVisible(false);
        layer.setVisible(true);
    }

    // Return coordinates
    return (
        <div>
            <div>
                <Button
                    type="text"
                    onClick={ onStartDrawingAsync }
                    size="small"
                >{ t('czs.draw') }</Button>
                <Button
                type="text"
                onClick={ onClearDrawingAsync }
                size="small"
                disabled={ !clearButtonState.active }
                >{ t('czs.clear') }</Button>
            </div>
            <div className='loading-spinner-container'>
                <CircularProgress
                    isLoaded={!isLoading}
                    className='loading-spinner loading-collections'
                ></CircularProgress>
                <CircularProgress
                    isLoaded={!isLoadingFeatures}
                    className='loading-spinner loading-features'
                ></CircularProgress>
            </div>
            <div className='collections-group'>
                <Accordion
                    items={[
                        {
                            title: t('czs.list_feature_colls'),
                            content: writeContentThemes("features", collectionsFeatures)
                        }
                    ]}
                ></Accordion>
                <Accordion
                    items={[
                        {
                            title: t('czs.list_coverage_colls'),
                            content: writeContentThemes("coverages", collectionsCoverages)
                        }
                    ]}
                ></Accordion>
            </div>

            <TextField
                id="czs_email"
                type="email"
                placeholder={t('czs.enter_email')}
                style={{ marginTop: 30, width: '100%' }}
                onChange={onEmailChange}
                value={email}
            ></TextField>

            <Button
                className="btn-extract"
                type="text"
                onClick={ onExtractFeatures }
                size="small"
                disabled={ !extractButtonActive }
            >{ t('czs.extract_features') }</Button>

            <Accordion
                className="need-help"
                items={[
                    {
                        title: t('czs.help_title'),
                        content: <div className="help-text" dangerouslySetInnerHTML={{ __html: t('czs.help_text') }}></div>
                    }
                ]}
            ></Accordion>

            {/* <Button
                type="text"
                onClick={toggleDebug}
                className={ isDEBUG ? "is-debug" : ""}
                size="x-small"
            >DEBUG</Button> */}
        </div>
    );

};

export default CZSPanel;
