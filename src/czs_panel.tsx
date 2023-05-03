import CZSAPI, { PyGeoAPICollectionsCollectionResponsePayload,
                 PyGeoAPIRecordsResponsePayload,
                 PyGeoAPICollectionsCollectionLinkResponsePayload } from './czs_pygeoapi';
import T_EN from '../locales/en/translation.json';
import T_FR from '../locales/fr/translation.json';

// CONFIG
const mapID ="mapCZS";
const geomGrpDrawID = "czs_geoms";
const geomGrpResultsID = "czs_geoms_res";
const QGIS_SERVICE_URL_ROOT = "https://qgis-stage.services.geo.ca/dev/";

let drawInter: {stopInteraction: Function};

export class ThemeCollectionsWrapper {
    features: ThemeCollections[] = [];
    coverages: ThemeCollections[] = [];
}

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
    const { geometryToWKT, defaultDrawingStyle } = api.geoUtilities;
    const { createElement: h, useState, useEffect, useCallback } = react;
    const { makeStyles, useTheme } = ui;
    const { Button, CircularProgress, Accordion, CheckboxListAlex, TextField } = ui.elements;

    // Translation
    const { t, i18n } = useTranslation();

    // States
    const [collectionsFeatures, _setCollectionsFeatures] = useState([]);
    const [collectionsCoverages, _setCollectionsCoverages] = useState([]);
    const [checkedCollections, _setCheckedCollections] = useState({});
    const [viewedLayers, _setViewedLayers] = useState({});
    const [geometry, _setGeometry] = useState();
    const [geometryWKT, _setGeometryWKT] = useState({});
    const [clearButtonState, _setClearButtonState] = useState({});
    //const [displayButtonState, _setDisplayButtonState] = useState({});
    const [extractButtonState, _setExtractButtonState] = useState({});
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

                // Load the collections off the bat
                loadCollectionsAsync();

                // Create geometry group which will handle the drawing
                const geomGrp = map.layer.vector.createGeometryGroup(geomGrpDrawID);

                // Create geometry group which will handle the records results
                const geomGrpRes = map.layer.vector.createGeometryGroup(geomGrpResultsID);
                map.layer.vector.setActiveGeometryGroup(geomGrpResultsID);

                // Set the default styling for the vector layer
                geomGrp.vectorLayer.setStyle(defaultDrawingStyle('orange'));

                // Make sure it'll always be on top of every layers
                geomGrp.vectorLayer.setZIndex(1000);

                // Init modify interaction
                const modifInter = cgpv.api.map(mapID).initModifyInteractions(geomGrpDrawID);
            },
            mapID
        );

        // Listen to the draw started event
        api.event.on(
            api.eventNames.INTERACTION.EVENT_DRAW_STARTED,
            (payload: any) => {
                // Redirect
                onDrawStart();
            },
            mapID
        ); // End "on" handler

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


    function getCheckedCollections() {
        let checkedcolls: string[] = [];
        Object.keys(checkedCollections).forEach((the_key: string) => {
            checkedcolls = checkedcolls.concat(checkedCollections[the_key]);
        });
        return checkedcolls;
    }

    function findCollectionFromID(collection_id: string): PyGeoAPICollectionsCollectionResponsePayload | null {
        // Find the collection information in our data
        let colls : PyGeoAPICollectionsCollectionResponsePayload[] = [];
        collectionsFeatures.forEach((collTheme: ThemeCollections) => {
            // For each collection
            colls = colls.concat(collTheme.collections.filter((coll: PyGeoAPICollectionsCollectionResponsePayload) => {
                return coll.id == collection_id;
            }));
        });
        collectionsCoverages.forEach((collTheme: ThemeCollections) => {
            // For each collection
            colls = colls.concat(collTheme.collections.filter((coll: PyGeoAPICollectionsCollectionResponsePayload) => {
                return coll.id == collection_id;
            }));
        });
        if (colls.length > 0)
            return colls[0];
        return null;
    }

    async function onStartDrawingAsync() {
        // Clear
        onClearDrawingAsync();

        // Init drawing interaction
        drawInter = cgpv.api.map(mapID).initDrawInteractions(geomGrpDrawID, "Polygon");
    }

    function onStopDrawing() {
        if (drawInter) {
            drawInter.stopInteraction();
        }
    }

    async function onClearDrawingAsync() {
        // Clear the geometries from the geometry group
        cgpv.api.map(mapID).layer.vector.deleteGeometriesFromGroup(geomGrpDrawID);
        // Stop drawing if currently drawing
        onStopDrawing();
        // Reload the collections from scratch
        loadCollectionsAsync();
    }

    function onDrawStart() {
        // Clear the geometries from the geometry group
        cgpv.api.map(mapID).layer.vector.deleteGeometriesFromGroup(geomGrpDrawID);
    }

    async function onDrawChangeAsync(e: any) {
        // Reset the geometry and reload the collections
        let geom = e.features.getArray()[0].getGeometry();
        loadCollectionsAsync(geom);
    }

    async function onDrawEndAsync(e: any) {
        //console.log("onDrawEnd", e);
        let geom = e.feature.getGeometry();
        loadCollectionsAsync(geom);

        // Stop the interaction
        // TODO: Refactor: Delay the stoppage of the interaction, because we're handling it on the stop event of said interaction itself (prevents a double-click event)
        setTimeout(() => {
            // Stop drawing interaction
            onStopDrawing();
        });
    }

    async function loadCollectionsAsync(geom?: any) {
        // Get the geometry
        const geomWKT = geometryToWKT(geom);
        console.log("loadCollections", geomWKT);

        // Set the state
        _setGeometry(geom);
        _setGeometryWKT(geomWKT);
        _setClearButtonState({active: !!geomWKT});

        // Is loading
        _setIsLoading(true);

        // Get the collections
        let colls: PyGeoAPICollectionsCollectionResponsePayload[] | void = await CZSAPI.getCollectionsPOSTAsync(i18n.language + "-CA", geomWKT, 3978).catch(_handleError).finally(() => {
            // Done loading
            _setIsLoading(false);
        });
        if (!colls) return;

        // Group the collections by types and then by themes
        let collsWrapper = new ThemeCollectionsWrapper();
        colls.forEach((collection: PyGeoAPICollectionsCollectionResponsePayload) => {
            // Depending on the type
            let themeColls: ThemeCollections[] | undefined;
            if (collection.itemType == "feature") {
                themeColls = collsWrapper.features;
            }

            else if (collection.itemType == "coverage") {
                themeColls = collsWrapper.coverages;
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
            }
        });

        // Proceed to change the state
        _setCollectionsFeatures(collsWrapper.features);
        _setCollectionsCoverages(collsWrapper.coverages);

        // Adjust the visibility of the currently selected layers
        await adjustExtentOnVisibleLayersAsync(geom);
    }

    async function adjustExtentOnVisibleLayersAsync(geom?: any) {
        // For each visible layers
        for (let layerID in viewedLayers) {
            let lyr = await api.map(mapID).layer.getGeoviewLayerByIdAsync(layerID, false);
            adjustExtentOnLayerID(lyr, geom);
        }
    }

    function adjustExtentOnLayerID(layer: any, geom?: any) {
        let ext = undefined;
        if (geom) ext = geom.getExtent();
        layer.setExtent(ext);
        layer.setVisible(false);
        layer.setVisible(true);
    }

    // function _OBSOLETE_callDisplayFeatures() {
    //     //console.log("callDisplayFeatures", checkedCollections, geometryWKT);

    //     // Is loading
    //     _setIsLoadingFeatures(true);

    //     // Clear the geometries from the geometry group
    //     cgpv.api.map(mapID).layer.vector.deleteGeometriesFromGroup(geomGrpResultsID);

    //     // Set the active geometry group
    //     cgpv.api.map(mapID).layer.vector.setActiveGeometryGroup(geomGrpResultsID);

    //     // For each checked collections
    //     let promises : Promise<PyGeoAPIRecordsResponsePayload>[] = [];
    //     getCheckedCollections().forEach((coll: string) => {
    //         // Find the collection information for that collection id
    //         let coll_info = findCollectionFromID(coll);

    //         // Depending on the collection type
    //         if (coll_info?.itemType == "feature") {
    //             // Get the collection features
    //             promises.push(CZSAPI.getFeaturesAsync(coll_info, geometryWKT, 3978));
    //         }

    //         else if (coll_info?.itemType == "coverage") {
    //             // Get the collection coverage
    //             promises.push(CZSAPI.getCoverageAsync(coll_info, geometryWKT, 3978));
    //         }

    //         else {
    //             console.log("SKIPPED COLLECTION TYPE", coll_info?.itemType);
    //         }
    //     });

    //     // When all records found
    //     Promise.all(promises).then((colls_res: PyGeoAPIRecordsResponsePayload[]) => {
    //         // For each collection result
    //         colls_res.forEach((coll_res: PyGeoAPIRecordsResponsePayload) => {
    //             // If anything
    //             console.log("Records", coll_res);
    //             if (coll_res.data.features && coll_res.data.features.length > 0) {
    //                 // Depending on the collection type
    //                 if (coll_res.collection.itemType == "feature") {
    //                     // For each records in the collection result
    //                     coll_res.data.features.forEach((rec: any) => {
    //                         // Depending on the geometry type
    //                         if (rec.geometry.type == "LineString")
    //                         {
    //                             // add geometry to feature collection
    //                             cgpv.api.map(mapID).layer.vector.addPolyline(rec.geometry.coordinates, { projection: 3978, style: {strokeColor: "blue", strokeOpacity: 0.5, strokeWidth: 1}});

    //                             // If was clipped too
    //                             if (rec.geometry_clipped) {
    //                                 // If not multi line
    //                                 if (!(Array.isArray(rec.geometry_clipped.coordinates[0]) &&
    //                                     Array.isArray(rec.geometry_clipped.coordinates[0][0])))
    //                                 {
    //                                     // Make it a multi line for simplicity
    //                                     rec.geometry_clipped.coordinates = [rec.geometry_clipped.coordinates];
    //                                 }

    //                                 // For each line segment
    //                                 rec.geometry_clipped.coordinates.forEach((coords: number[]) => {
    //                                     cgpv.api.map(mapID).layer.vector.addPolyline(coords, { projection: 3978, style: {strokeColor: "green", strokeWidth: 2}});
    //                                 });
    //                             }
    //                         }

    //                         else if (rec.geometry.type == "Point")
    //                         {
    //                             // add geometry to feature collection
    //                             cgpv.api.map(mapID).layer.vector.addMarkerIcon(rec.geometry.coordinates,
    //                                 {
    //                                     projection: 3978,
    //                                     style: {
    //                                         anchor: [0.5, 256],
    //                                         size: [256, 256],
    //                                         scale: 0.1,
    //                                         anchorXUnits: 'fraction',
    //                                         anchorYUnits: 'pixels',
    //                                         src: './img/Marker.png',
    //                                     }
    //                                 }
    //                             );
    //                         }

    //                         else
    //                         {
    //                             // Error
    //                             console.log("Unknown geometry type");
    //                         }
    //                     });
    //                 }

    //                 else {
    //                     console.log("UNKNOWN COLLECTION TYPE", coll_res.collection.itemType, coll_res);
    //                 }
    //             }
    //         });

    //         // Done loading
    //         _setIsLoadingFeatures(false);

    //     }).catch((err: any) => {
    //         console.log("ERROR", err);

    //         // Done loading
    //         _setIsLoadingFeatures(false);
    //     });
    // }

    async function callExtractFeaturesAsync(email: string) {
        //console.log("callExtractFeatures", checkedCollections, geometryWKT);

        // Is loading
        _setIsLoadingFeatures(true);

        // Extract the collections
        let res = await CZSAPI.extractFeaturesAsync(getCheckedCollections(), email, geometryWKT, 3978).catch(_handleError).finally(() => {
            // Stop loading
            _setIsLoadingFeatures(false);
        });
        if (!res) return;

        // Show message to user
        utilities.showSuccess(mapID, "Extraction completed, check your emails!");
        console.log("EXTRACTION RESULT", res);
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
            return <CheckboxListAlex
                multiselect={true}
                listItems={Object.values(thmColl.collections).map((coll: PyGeoAPICollectionsCollectionResponsePayload) => {
                    return {
                        display: coll.title,
                        value: coll.id,
                        content: getContentLayer(coll)
                    };
                })}
                checkedValues={(list_key + "_" + thmColl.theme.id in checkedCollections && checkedCollections[list_key + "_" + thmColl.theme.id]) || []}
                checkedCallback={(value: string, checked: boolean, allChecked: Array<string>) => onCollectionCheckedChangedAsync(list_key, thmColl, value, checked, allChecked)}
            ></CheckboxListAlex>;
        }

        else
            return null;
    }

    function getContentLayer(coll: PyGeoAPICollectionsCollectionResponsePayload) {
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
        if (viewedLayers.hasOwnProperty(coll.id)) {
            orders = <div className={`layer-order-layers ${isOrderLoading.includes(coll.id) ? "loading" : ""}`}>
                        <a onClick={ (e) => { _handleHigher(e, coll.id); } } title="Bring to front">
                            <img src='./img/arrow_up.png' style={{
                                'width': '20px',
                                'height': '20px',
                                'marginTop': '2px',
                                'marginLeft': '5px',
                            }}></img>
                        </a>
                        <a onClick={ (e) => { _handleLower(e, coll.id); } } title="Send to back">
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

    function _handleHigher(e: any, layerID: string) {
        // Is loading
        isOrderLoading.push(layerID);
        _setIsOrderLoading([...isOrderLoading]);

        // Go
        higherAsync(layerID).finally(() => {
            _setIsOrderLoading(isOrderLoading.filter(function (val: string) { return val !== layerID }));
        });
    }

    function _handleLower(e: any, layerID: string) {
        // Is loading
        isOrderLoading.push(layerID);
        _setIsOrderLoading([...isOrderLoading]);

        // Go
        lowerAsync(layerID).finally(() => {
            _setIsOrderLoading(isOrderLoading.filter(function(val: string) { return val !== layerID }));
        });
    }

    async function higherAsync(layerID: string) {
        let lyr = await api.map(mapID).layer.getGeoviewLayerByIdAsync(layerID, true);
        let zindex = lyr.gvLayers.getZIndex();
        zindex++;
        await setZIndexAsync(lyr, zindex);
    }

    async function lowerAsync(layerID: string) {
        let lyr = await api.map(mapID).layer.getGeoviewLayerByIdAsync(layerID, true);
        let zindex = lyr.gvLayers.getZIndex();
        zindex--;
        await setZIndexAsync(lyr, zindex);
    }


    /** ***************************************************************************************************************************
     * Set the z-index of a layer and one can await until it's actually set and effective.
     *
     * @param {number} zindex The z-index to set.
     */
    async function setZIndexAsync(layer: any, zindex: number) {
        if (layer.gvLayers) {
            layer.gvLayers.setZIndex(zindex);
            await utilities.whenThisThenAsync(() => {
                return layer.gvLayers.state_.zIndex === zindex;
            }, 10000);
        }
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

    async function onCollectionCheckedChangedAsync(list_key: string, themeColl: ThemeCollections, value: string, checked: boolean, checkedColls: Array<string>) {
        //console.log("collection checked changed", themeColl, value, checked, checkedColls);
        const the_key = list_key + "_" + themeColl.theme.id;

        // Replace it
        checkedCollections[the_key] = checkedColls;
        _setCheckedCollections(checkedCollections);

        // Find the collection information for that collection id
        let coll_info = findCollectionFromID(value);

        // If not found
        if (!coll_info) return;

        let layerConfig = {
            'geoviewLayerId': coll_info.id,
            'geoviewLayerName': { 'en': coll_info.title, 'fr': coll_info.title },
            'metadataAccessPath': { 'en': QGIS_SERVICE_URL_ROOT + coll_info.org_schema + '/' + coll_info.project + '_en', 'fr': QGIS_SERVICE_URL_ROOT + coll_info.org_schema + '/' + coll_info.project + '_fr' },
            'geoviewLayerType': 'ogcWms',
            'listOfLayerEntryConfig': [
              {
                'layerId': coll_info.short_name,
                'layerName': { 'en': coll_info.title, 'fr': coll_info.title}
              }
            ]
        };
        let zIndex = 100;

        if (list_key == "features") {
            zIndex = 101;
            layerConfig['geoviewLayerType'] = 'ogcWfs';
            if (isDEBUG) {
                layerConfig['metadataAccessPath'] = { 'en': 'https://ahocevar.com/geoserver/wfs', 'fr': 'https://ahocevar.com/geoserver/wfs' },
                layerConfig['listOfLayerEntryConfig'][0]['layerId'] = 'states';
                layerConfig['listOfLayerEntryConfig'][0]['layerName'] = { 'en': 'states', 'fr': 'states'};
            }
        }

        else if (isDEBUG && list_key == "coverages") {
            layerConfig['metadataAccessPath'] = { 'en': 'https://maps.geogratis.gc.ca/wms/hydro_network_en', 'fr': 'https://maps.geogratis.gc.ca/wms/hydro_network_en' },
            layerConfig['listOfLayerEntryConfig'][0]['layerId'] = 'hydro_network';
            layerConfig['listOfLayerEntryConfig'][0]['layerName'] = { 'en': 'hydro_network', 'fr': 'hydro_network'};
            if (coll_info.id == "cdem_mpi__cdem") {
                layerConfig['metadataAccessPath'] = { 'en': 'https://maps.geogratis.gc.ca/wms/railway_en', 'fr': 'https://maps.geogratis.gc.ca/wms/railway_fr' },
                layerConfig['listOfLayerEntryConfig'][0]['layerId'] = 'railway';
                layerConfig['listOfLayerEntryConfig'][0]['layerName'] = { 'en': 'Railways', 'fr': 'Chemins de fer'};
            }
        }

        // Show/Hide layer on map
        console.log("Working on service/layer", layerConfig['metadataAccessPath']['en'], layerConfig['listOfLayerEntryConfig'][0]['layerId']);
        console.log(layerConfig['metadataAccessPath']['en'] + "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities&LAYERS=" + coll_info.short_name);
        console.log(layerConfig);
        console.log(JSON.stringify(layerConfig));
        if (checked) {
            // Add the layer
            api.map(mapID).layer.addGeoviewLayer(layerConfig);

            // Get the layer as soon as it's in the api
            let lyr = await api.map(mapID).layer.getGeoviewLayerByIdAsync(coll_info.id, false);

            // Set the visible extent for the layer
            adjustExtentOnLayerID(lyr, geometry);

            // Get the layer as soon as it's in the api AND loaded on the map
            lyr = await api.map(mapID).layer.getGeoviewLayerByIdAsync(coll_info.id, true);

            // Now we can adjust its z-index
            lyr.gvLayers.setZIndex(zIndex);

            // All good
            viewedLayers[coll_info.id] = layerConfig;
        }

        else if (viewedLayers[coll_info.id]) {
            api.map(mapID).layer.removeGeoviewLayer(viewedLayers[coll_info.id]);
            delete viewedLayers[coll_info.id];
        }
        _setViewedLayers(viewedLayers);

        // NOTES
        // https://qgis-stage.services.geo.ca/dev/nrcan/major_projects_inventory_en?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=-2340914.25,-700216.125,3444951,1858118.5&CRS=EPSG:3978&WIDTH=596&HEIGHT=264&LAYERS=major_projects_inventory_point&STYLES=&FORMAT=image/png&DPI=96&MAP_RESOLUTION=96&FORMAT_OPTIONS=dpi:96&TRANSPARENT=TRUE
        // https://qgis-stage.services.geo.ca/dev/nrcan/cdem_en?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=-2340914.25,-700216.125,3444951,1858118.5&CRS=EPSG:3978&WIDTH=596&HEIGHT=264&LAYERS=cdem&STYLES=&FORMAT=image/png&DPI=96&MAP_RESOLUTION=96&FORMAT_OPTIONS=dpi:96&TRANSPARENT=TRUE

        // let layerConfig2 = {
        //     'geoviewLayerId': 'wmsLYR1-Root',
        //     'geoviewLayerName': { 'en': 'Weather Group', 'fr': 'Weather Group' },
        //     'metadataAccessPath': { 'en': 'https://geo.weather.gc.ca/geomet', 'fr': 'https://geo.weather.gc.ca/geomet' },
        //     'geoviewLayerType': 'ogcWms',
        //     'listOfLayerEntryConfig': [
        //       {
        //         'entryType': 'group',
        //         'layerId': 'wmsLYR1-Group',
        //         'layerName': { 'en': 'Group', 'fr': 'Group' },
        //         'listOfLayerEntryConfig': [
        //           {
        //             'layerId': 'CURRENT_CONDITIONS',
        //             'source': {
        //               'featureInfo': {
        //                 'queryable': true,
        //                 'nameField': { 'en': 'plain_text', 'fr': 'plain_texte' },
        //                 'fieldTypes': 'string',
        //                 'outfields': { 'en': 'plain_text', 'fr': 'plain_texte' },
        //                 'aliasFields':  { 'en': 'Forcast', 'fr': 'Prévision' }
        //               }
        //             }
        //           },
        //           {
        //             'layerId': 'CGSL.ETA_ICEC',
        //             'layerName': { 'en': 'Ice Cover', 'fr': 'Ice Cover' }
        //           }
        //         ]
        //       }
        //     ]
        // }


        // If any are checked
        //_setDisplayButtonState({active: checkDisplayButtonActive()});
        _setExtractButtonState({active: checkExtractButtonActive()});
    }

    function checkDisplayButtonActive() {
        return !!(getCheckedCollections()?.length);
    }

    function checkExtractButtonActive() {
        return !!(getCheckedCollections().length) && email.length;
    }

    function onEmailChange(e: any): void {
        const txtEmail: typeof TextField = document.getElementById('czs_email');
        _setEmail(txtEmail?.value)
        _setExtractButtonState({active: checkExtractButtonActive()});
    }

    async function onExtractFeatures() {
        // Extract the collections as a zip
        await callExtractFeaturesAsync(email);
    }


    function onFeatureHoverOn(feature: object): void {
        console.log("hover on", feature);
    }

    function onFeatureHoverOff(feature: object): void {
        console.log("hover off", feature);
    }

    function _handleError(err: any) {
        console.log("ERROR", err);
        utilities.showError(mapID, err);
    }

    function toggleDebug() {
        _setIsDEBUG(!isDEBUG);
    }

    // Return coordinates
    return (
        <div>
            <div>
                <Button
                    type="text"
                    onClick={ onStartDrawingAsync }
                    size="small"
                    // disabled={ clearButtonState.active }
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
                    className='loading-spinner'
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

            <TextField id="czs_email" type="email" placeholder={ t('czs.enter_email') } style={ { marginTop: 30, width: '100%' } } onChange={ onEmailChange } value={ email }></TextField>

            <Button
                type="text"
                onClick={ onExtractFeatures }
                size="small"
                disabled={ !extractButtonState.active }
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

            <Button
                type="text"
                onClick={toggleDebug}
                className={ isDEBUG ? "is-debug" : ""}
                size="x-small"
            >DEBUG</Button>

            <div className='loading-spinner-container'>
                <CircularProgress
                    isLoaded={!isLoadingFeatures}
                    className='loading-spinner loading-features'
                ></CircularProgress>
            </div>

            {/* <div>Features:</div>
            <div>
                <FeaturesList
                    featuresCollections={featuresCollections}
                    hoverOnCallback={onFeatureHoverOn}
                    hoverOutCallback={onFeatureHoverOff}
                ></FeaturesList>
            </div> */}
        </div>
    );

};

export default CZSPanel;
