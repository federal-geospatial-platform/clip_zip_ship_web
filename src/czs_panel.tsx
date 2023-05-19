import {
    CZS_EVENT_NAMES, CZS_EVENT_NAMES_UI,
    ThemeCollections,
    PyGeoAPICollectionsCollectionResponsePayload,
    PyGeoAPICollectionsCollectionLinkResponsePayload
} from './czs_types';
import T_EN from '../locales/en/translation.json';
import T_FR from '../locales/fr/translation.json';

/**
 * Create a container containing a leaflet map using the GeoView viewer
 *
 * @returns {JSX.Elemet} the element that creates the container and the map
 */
const CZSPanel = (): JSX.Element => {

    // Fetch the cgpv module
    const w = window as any;
    const cgpv = w['cgpv'];
    const { api, react, ui, useTranslation } = cgpv;
    const { createElement: h, useState, useEffect } = react;
    const { makeStyles, useTheme } = ui;
    const { Button, CircularProgress, Accordion, CheckboxListAlex, TextField } = ui.elements;
    const MAP_ID = "mapCZS";

    // Translation
    const { t, i18n } = useTranslation();

    // States
    const [collectionsFeatures, _setCollectionsFeatures] = useState([]);
    const [collectionsCoverages, _setCollectionsCoverages] = useState([]);
    const [checkedCollections, _setCheckedCollections] = useState({});
    const [clearButtonState, _setClearButtonState] = useState({});
    //const [extractButtonActive, _setExtractButtonActive] = useState(false);
    const [hasViewedCollections, _setHasViewedCollections] = useState(false);
    const [email, _setEmail] = useState("alexandre.roy@nrcan-rncan.gc.ca");
    const [isLoading, _setIsLoading] = useState(false);
    const [isLoadingFeatures, _setIsLoadingFeatures] = useState(false);
    const [isOrderLoading, _setIsOrderLoading] = useState([]);
    const [isExtracting, _setIsExtracting] = useState(false);

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
        // Show temporary message
        api.utilities.showMessage(MAP_ID, "This is a pre-alpha release. Only for experimentation purposes.");

        // Add CZS translations file
        i18n.addResourceBundle("en", "translation", T_EN);
        i18n.addResourceBundle("fr", "translation", T_FR);

        // Listen to the engine load collections started event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_STARTED,
            (payload: any) => {
                // Set the state
                _setClearButtonState({ active: !!payload.geometry });
                // Is loading
                _setIsLoading(true);
            },
            MAP_ID
        );

        // Listen to the engine load collections ended event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_ENDED,
            (payload: any) => {
                _setIsLoading(false);
            },
            MAP_ID
        );

        api.event.on(
            CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_FEATURES,
            (payload: any) => {
                _setCollectionsFeatures(payload.collections);
            },
            MAP_ID
        );

        api.event.on(
            CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_COVERAGES,
            (payload: any) => {
                _setCollectionsCoverages(payload.collections);
            },
            MAP_ID
        );

        // Listen to the engine extraction started event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_EXTRACT_STARTED,
            (payload: any) => {
                // Is loading
                _setIsExtracting(true);
                _setIsLoadingFeatures(true);
            },
            MAP_ID
        );

        // Listen to the engine extraction ended event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_EXTRACT_ENDED,
            (payload: any) => {
                // Is done
                _setIsExtracting(false);
                _setIsLoadingFeatures(false);
            },
            MAP_ID
        );

        // Listen to the engine extraction completed event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_EXTRACT_COMPLETED,
            (payload: any) => {
                // Show message to user
                api.utilities.showSuccess(MAP_ID, "Extraction completed, check your emails!");
            },
            MAP_ID
        );

        // Listen to the engine extraction started event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_COLLECTION_CHANGED_STARTED,
            (payload: any) => {
                // Is loading
                _setIsLoadingFeatures(true);
                _setCheckedCollections({ ...payload.checkedCollections });
            },
            MAP_ID
        );

        // Listen to the engine extraction ended event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_COLLECTION_CHANGED_ENDED,
            (payload: any) => {
                // Is loading
                _setIsLoadingFeatures(false);
                // If extraction is possible
                _setHasViewedCollections(!!Object.keys(payload.viewedCollections).length)
            },
            MAP_ID
        );

        // Listen to the engine layer ordered event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_LAYER_ORDERED,
            (payload: any) => {
                _setIsOrderLoading([... payload.collections]);
            },
            MAP_ID
        );

        // Listen to the engine layer ordered event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_STARTED,
            (payload: any) => {
                // Is loading
                _setIsLoadingFeatures(true);
            },
            MAP_ID
        );

        // Listen to the engine layer ordered event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_FOOTPRINT,
            (payload: any) => {
                // Show error
                api.utilities.showWarning(MAP_ID, "Extraction area too big for collection: " + payload.collection.title);
            },
            MAP_ID
        );

        // Listen to the engine layer ordered event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_ENDED,
            (payload: any) => {
                // Is loading
                _setIsLoadingFeatures(false);
                // If extraction is possible
                _setHasViewedCollections(!!Object.keys(payload.collections).length);
            },
            MAP_ID
        );

        // Listen to the engine error event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_ERROR,
            (payload: any) => {
                api.utilities.showError(MAP_ID, payload.error);
            },
            MAP_ID
        );

        // Listen to the engine error event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_ERROR_SHOWING_COLLECTION,
            (payload: any) => {
                api.utilities.showError(MAP_ID, payload.error);
            },
            MAP_ID
        );

        // Listen to the engine error event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_ERROR_EXTRACTING,
            (payload: any) => {
                api.utilities.showError(MAP_ID, payload.error);
            },
            MAP_ID
        );

    }, []);

    function handleStartDrawing() {
        api.event.emit({ event: CZS_EVENT_NAMES_UI.UI_START_DRAWING, handlerName: MAP_ID });
    }

    function handleClearDrawing() {
        api.event.emit({ event: CZS_EVENT_NAMES_UI.UI_CLEAR_DRAWING, handlerName: MAP_ID });
    }

    function handleEmailChange(e: any): void {
        const txtEmail: typeof TextField = document.getElementById('czs_email');
        _setEmail(txtEmail?.value);
    }

    function handleExtractFeatures() {
        api.event.emit({ event: CZS_EVENT_NAMES_UI.UI_START_EXTRACTION, handlerName: MAP_ID, email: email });
    }

    function handleHigher(e: any, coll_type: string, collection_id: string) {
        api.event.emit({ event: CZS_EVENT_NAMES_UI.UI_ORDER_HIGHER_STARTED, handlerName: MAP_ID, coll_type: coll_type, coll_id: collection_id });
    }

    function handleLower(e: any, coll_type: string, collection_id: string) {
        api.event.emit({ event: CZS_EVENT_NAMES_UI.UI_ORDER_LOWER_STARTED, handlerName: MAP_ID, coll_type: coll_type, coll_id: collection_id });
    }

    function handleCollectionCheckedChanged(list_key: string, themeColl: ThemeCollections, value: string, checked: boolean, checkedColls: Array<string>) {
        api.event.emit({ event: CZS_EVENT_NAMES_UI.UI_COLLECTION_CHECKED, handlerName: MAP_ID, list_key: list_key, themeColl: themeColl, value: value, checked: checked, checkedColls: checkedColls });
    }

    function getContentThemes(list_key: string, thmColls: ThemeCollections[]) {
        // For each theme
        return <Accordion
            className="accordion-theme"
            items={Object.values(thmColls).map((thmColl: ThemeCollections) => (
                {
                    title: thmColl.theme.name + " (" + thmColl.collections.length + ")",
                    content: getContentColls(list_key, thmColl)
                }
            ))}
        ></Accordion>;
    }

    function getContentColls(list_key: string, thmColl: ThemeCollections) {
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
                checkedCallback={(value: string, checked: boolean, allChecked: Array<string>) => handleCollectionCheckedChanged(list_key, thmColl, value, checked, allChecked)}
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
                        <a onClick={ (e) => { handleHigher(e, coll.itemType, coll.id); } } title="Bring to front">
                            <img src='./img/arrow_up.png' style={{
                                'width': '20px',
                                'height': '20px',
                                'marginTop': '2px',
                                'marginLeft': '5px',
                            }}></img>
                        </a>
                        <a onClick={ (e) => { handleLower(e, coll.itemType, coll.id); } } title="Send to back">
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

    // Return coordinates
    return (
        <div>
            <div>
                <Button
                    type="text"
                    onClick={ handleStartDrawing }
                    size="small"
                >{ t('czs.draw') }</Button>
                <Button
                type="text"
                onClick={ handleClearDrawing }
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
                            content: getContentThemes("features", collectionsFeatures)
                        }
                    ]}
                ></Accordion>
                <Accordion
                    items={[
                        {
                            title: t('czs.list_coverage_colls'),
                            content: getContentThemes("coverages", collectionsCoverages)
                        }
                    ]}
                ></Accordion>
            </div>

            <TextField
                id="czs_email"
                type="email"
                placeholder={t('czs.enter_email')}
                style={{ marginTop: 30, width: '100%' }}
                onChange={ handleEmailChange }
                value={email}
            ></TextField>

            <Button
                className="btn-extract"
                type="text"
                onClick={ handleExtractFeatures }
                size="small"
                disabled={ !(hasViewedCollections && email && !isExtracting) }
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
        </div>
    );

};

export default CZSPanel;
