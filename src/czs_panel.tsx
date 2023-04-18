import CZSAPI, { PyGeoAPICollectionsCollectionResponsePayload,
                 PyGeoAPIRecordsResponsePayload,
                 PyGeoAPICollectionsCollectionLinkResponsePayload } from './czs_pygeoapi';
import T_EN from '../locales/en/translation.json';
import T_FR from '../locales/fr/translation.json';

// CONFIG
const mapID ="mapWM";
const geomGrpDrawID = "czs_geoms";
const geomGrpResultsID = "czs_geoms_res";


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
    const { showMessage } = api;
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
    const [geometryWKT, _setGeometryWKT] = useState({});
    const [clearButtonState, _setClearButtonState] = useState({});
    const [displayButtonState, _setDisplayButtonState] = useState({});
    const [extractButtonState, _setExtractButtonState] = useState({});
    const [email, _setEmail] = useState("alexandre.roy@nrcan-rncan.gc.ca");
    const [isLoading, _setIsLoading] = useState(false);
    const [isLoadingFeatures, _setIsLoadingFeatures] = useState(false);

    // Style the container
    const useStyles = makeStyles((theme: any) => ({
        positionContainer: {
            marginLeft: 75,
            backgroundColor: '#fff',
            padding: 10,
            height: '100%',
            'min-width': 400,
            overflow: 'auto',
            pointerEvents: 'initial',
        },
        listCollections: {
            'padding-inline-start': 0,
        }
    }));

    // Get the classes for the styles
    //const defaultTheme = useTheme();
    const classes = useStyles();

    useEffect(() => {
        console.log("CZSPanel useEffect");
        console.log(types);

        // Add CZS translations file
        i18n.addResourceBundle("en", "translation", T_EN);
        i18n.addResourceBundle("fr", "translation", T_FR);

        // Listen to the map loaded event
        api.event.on(
            api.eventNames.MAP.EVENT_MAP_LOADED,
            (payload: any) => {
                // The map
                let map = cgpv.api.map(mapID);

                // Load the collections off the bat
                loadCollections();

                // Create geometry group which will handle the drawing
                let geomGrp = map.layer.vector.createGeometryGroup(geomGrpDrawID);

                // Create geometry group which will handle the records results
                let geomGrpRes = map.layer.vector.createGeometryGroup(geomGrpResultsID);
                map.layer.vector.setActiveGeometryGroup(geomGrpResultsID);

                // Init drawing, modifying and snapping interaction
                const intDraw = map.initDrawInteractions(geomGrpDrawID, "Polygon");
                const intModify = map.initModifyInteractions(geomGrpDrawID);

                // Set the default styling for the vector layer
                geomGrp.vectorLayer.setStyle(defaultDrawingStyle('orange'));
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
                onDrawEnd(payload.drawInfo);
            },
            mapID
        ); // End "on" handler

        // Listen to the modify ended event
        api.event.on(
            api.eventNames.INTERACTION.EVENT_MODIFY_ENDED,
            (payload: any) => {
                // Redirect
                onDrawChange(payload.modifyInfo);
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

    function onClearDrawing() {
        // Clear the geometries from the geometry group
        cgpv.api.map(mapID).layer.vector.deleteGeometriesFromGroup(geomGrpDrawID);
        loadCollections();
    }

    function onDrawStart() {
        // Clear the geometries from the geometry group
        cgpv.api.map(mapID).layer.vector.deleteGeometriesFromGroup(geomGrpDrawID);
    }

    function onDrawChange(e: any) {
        // Reset the geometry and reload the collections
        let geom = e.features.getArray()[0].getGeometry();
        loadCollections(geom);
    }

    function onDrawEnd(e: any) {
        //console.log("onDrawEnd", e);
        let geom = e.feature.getGeometry();
        loadCollections(geom);
    }

    function loadCollections(geom?: any) {
        // Get the geometry
        const geomWKT = geometryToWKT(geom);
        console.log("loadCollections", geomWKT);

        // Set the state
        _setGeometryWKT(geomWKT);
        _setClearButtonState({active: !!geomWKT});

        // Is loading
        _setIsLoading(true);

        // Get the collections
        CZSAPI.getCollectionsPOST(i18n.language + "-CA", geomWKT, 3978)
        .then((colls: PyGeoAPICollectionsCollectionResponsePayload[]) => {
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

            // Done loading
            _setIsLoading(false);
        });
    }

    function callDisplayFeatures() {
        //console.log("callDisplayFeatures", checkedCollections, geometryWKT);

        // Is loading
        _setIsLoadingFeatures(true);

        // Clear the geometries from the geometry group
        cgpv.api.map(mapID).layer.vector.deleteGeometriesFromGroup(geomGrpResultsID);

        // Set the active geometry group
        cgpv.api.map(mapID).layer.vector.setActiveGeometryGroup(geomGrpResultsID);

        // For each checked collections
        let promises : Promise<PyGeoAPIRecordsResponsePayload>[] = [];
        getCheckedCollections().forEach((coll: string) => {
            // Find the collection information for that collection id
            let coll_info = findCollectionFromID(coll);

            // Depending on the collection type
            if (coll_info?.itemType == "feature") {
                // Get the collection features
                promises.push(CZSAPI.getFeatures(coll_info, geometryWKT, 3978));
            }

            else if (coll_info?.itemType == "coverage") {
                // Get the collection coverage
                promises.push(CZSAPI.getCoverage(coll_info, geometryWKT, 3978));
            }

            else {
                console.log("SKIPPED COLLECTION TYPE", coll_info?.itemType);
            }
        });

        // When all records found
        Promise.all(promises).then((colls_res: PyGeoAPIRecordsResponsePayload[]) => {
            // For each collection result
            colls_res.forEach((coll_res: PyGeoAPIRecordsResponsePayload) => {
                // If anything
                console.log("Records", coll_res);
                if (coll_res.data.features && coll_res.data.features.length > 0) {
                    // Depending on the collection type
                    if (coll_res.collection.itemType == "feature") {
                        // For each records in the collection result
                        coll_res.data.features.forEach((rec: any) => {
                            // Depending on the geometry type
                            if (rec.geometry.type == "LineString")
                            {
                                // add geometry to feature collection
                                cgpv.api.map(mapID).layer.vector.addPolyline(rec.geometry.coordinates, { projection: 3978, style: {strokeColor: "blue", strokeOpacity: 0.5, strokeWidth: 1}});

                                // If was clipped too
                                if (rec.geometry_clipped) {
                                    // If not multi line
                                    if (!(Array.isArray(rec.geometry_clipped.coordinates[0]) &&
                                        Array.isArray(rec.geometry_clipped.coordinates[0][0])))
                                    {
                                        // Make it a multi line for simplicity
                                        rec.geometry_clipped.coordinates = [rec.geometry_clipped.coordinates];
                                    }

                                    // For each line segment
                                    rec.geometry_clipped.coordinates.forEach((coords: number[]) => {
                                        cgpv.api.map(mapID).layer.vector.addPolyline(coords, { projection: 3978, style: {strokeColor: "green", strokeWidth: 2}});
                                    });
                                }
                            }

                            else if (rec.geometry.type == "Point")
                            {
                                // add geometry to feature collection
                                cgpv.api.map(mapID).layer.vector.addMarkerIcon(rec.geometry.coordinates,
                                    {
                                        projection: 3978,
                                        style: {
                                            anchor: [0.5, 256],
                                            size: [256, 256],
                                            scale: 0.1,
                                            anchorXUnits: 'fraction',
                                            anchorYUnits: 'pixels',
                                            src: './img/Marker.png',
                                        }
                                    }
                                );
                            }

                            else
                            {
                                // Error
                                console.log("Unknown geometry type");
                            }
                        });
                    }

                    else {
                        console.log("UNKNOWN COLLECTION TYPE", coll_res.collection.itemType, coll_res);
                    }
                }
            });

            // Done loading
            _setIsLoadingFeatures(false);

        }).catch((err: any) => {
            console.log("ERROR", err);

            // Done loading
            _setIsLoadingFeatures(false);
        });
    }

    function callExtractFeatures(email: string) {
        //console.log("callExtractFeatures", checkedCollections, geometryWKT);

        // Is loading
        _setIsLoadingFeatures(true);

        // Extract the collections
        CZSAPI.extractFeatures(getCheckedCollections(), email, geometryWKT, 3978)
        .then((res: any) => {
            // Show message to user
            showMessage(mapID, "Extraction completed, check your emails!");
            console.log("EXTRACTION RESULT", res);

            // Done loading
            _setIsLoadingFeatures(false);

        }).catch((err: any) => {
            console.log("ERROR", err);

            // Done loading
            _setIsLoadingFeatures(false);
        });
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
                    let link = getContentMetadata(coll.links);
                    return {
                        display: coll.title,
                        value: coll.id,
                        content: link ? <a href={link.href} title={link.title} target='_blank'>
                                <img src='./img/metadata.png' style={{
                                    'width': '20px',
                                    'height': '20px',
                                    'marginTop': '2px',
                                    'marginLeft': '5px',
                                }}></img>
                            </a> : ""
                    };
                })}
                checkedValues={(list_key + "_" + thmColl.theme.id in checkedCollections && checkedCollections[list_key + "_" + thmColl.theme.id]) || []}
                checkedCallback={(value: string, checked: boolean, allChecked: Array<string>) => onCollectionCheckedChanged(list_key, thmColl, value, checked, allChecked)}
            ></CheckboxListAlex>;
        }

        else
            return null;
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

    function onCollectionCheckedChanged(list_key: string, themeColl: ThemeCollections, value: string, checked: boolean, checkedColls: Array<string>) : void {
        //console.log("collection checked changed", themeColl, value, checked, checkedColls);
        const the_key = list_key + "_" + themeColl.theme.id;

        // Replace it
        checkedCollections[the_key] = checkedColls;
        _setCheckedCollections(checkedCollections);

        // If any are checked
        _setDisplayButtonState({active: checkDisplayButtonActive()});
        _setExtractButtonState({active: checkExtractButtonActive()});
    }

    function checkDisplayButtonActive() {
        return !!(getCheckedCollections()?.length);
    }

    function checkExtractButtonActive() {
        return !!(getCheckedCollections().length) && email.length;
    }

    function onShowPreview(): void {
        // Query the collections individually to show them on the map
        callDisplayFeatures();
    }

    function onEmailChange(e: any): void {
        const txtEmail: typeof TextField = document.getElementById('czs_email');
        _setEmail(txtEmail?.value)
        _setExtractButtonState({active: checkExtractButtonActive()});
    }

    function onExtractFeatures(): void {
        // Extract the collections as a zip
        callExtractFeatures(email);
    }


    function onFeatureHoverOn(feature: object): void {
        console.log("hover on", feature);
    }

    function onFeatureHoverOff(feature: object): void {
        console.log("hover off", feature);
    }

    // Return coordinates
    return (
        <div>
            <Button
                type="text"
                onClick={ onClearDrawing }
                size="small"
                disabled={ !clearButtonState.active }
            >{ t('czs.clear') }</Button>
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
            <Button
                type="text"
                onClick={ onShowPreview }
                size="small"
                disabled={ !displayButtonState.active }
            >{ t('czs.show_preview') }</Button>

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
