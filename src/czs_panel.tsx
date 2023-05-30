import {
    CZS_EVENT_NAMES,
    ThemeCollections,
    PyGeoAPICollectionsCollectionResponsePayload
} from './czs_types';
import CZSUtils from './czs_utils';
import T_EN from '../locales/en/translation.json';
import T_FR from '../locales/fr/translation.json';


interface CZSPanelProps {
    handleStartDrawing: () => void;
    handleClearDrawing: () => void;
    handleExtractFeatures: (email: string) => void;
    handleZoomToCollection: (collection: PyGeoAPICollectionsCollectionResponsePayload) => void;
    handleViewMetadataCollection: (collection: PyGeoAPICollectionsCollectionResponsePayload) => void;
    handleViewCapabilitiesCollection: (collection: PyGeoAPICollectionsCollectionResponsePayload) => void;
    handleHigher: (coll_type: string, coll_id: string) => void;
    handleLower: (coll_type: string, coll_id: string) => void;
    handleCollectionCheckedChanged: (list_key: string, themeColl: ThemeCollections, value: string, checked: boolean, checkedColls: Array<string>) => void;
}

/**
 * Create a container containing a leaflet map using the GeoView viewer
 *
 * @returns {JSX.Elemet} the element that creates the container and the map
 */
const CZSPanel = (props: CZSPanelProps): JSX.Element => {

    // Fetch the cgpv module
    const w = window as any;
    const cgpv = w['cgpv'];
    const { api, react, ui, useTranslation } = cgpv;
    const { createElement: h, useState, useEffect } = react;
    //const { makeStyles, useTheme } = ui;
    const { Button, CircularProgress, Accordion, CheckboxListAlex, TextField, Menu, MenuItem, ListItem, ListItemText, ListItemIcon } = ui.elements;
    const MAP_ID = "mapCZS";

    // Translation
    const { t, i18n } = useTranslation();

    // States
    const [collectionsFeatures, _setCollectionsFeatures] = useState([]);
    const [collectionsCoverages, _setCollectionsCoverages] = useState([]);
    const [checkedCollections, _setCheckedCollections] = useState({});
    const [clearButtonState, _setClearButtonState] = useState({});
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    const [contextMenuCollection, setContextMenuCollection] = useState(null);
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

        // Listen to the engine event completed for loading the collections of type features
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_FEATURES,
            (payload: any) => {
                _setCollectionsFeatures(payload.collections);
            },
            MAP_ID
        );

        // Listen to the engine event completed for loading the collections of type coverages
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_COVERAGES,
            (payload: any) => {
                _setCollectionsCoverages(payload.collections);
            },
            MAP_ID
        );

        // Listen to the engine event completed for loading collection of any type
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_ENDED,
            (payload: any) => {
                _setIsLoading(false);
            },
            MAP_ID
        );

        // Listen to the engine event when a new collection has been checked/unchecked and process has started
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_COLLECTION_CHANGED_STARTED,
            (payload: any) => {
                // Is loading
                _setIsLoadingFeatures(true);
                _setCheckedCollections({ ...payload.checkedCollections });
            },
            MAP_ID
        );

        // Listen to the engine event when a new collection has been checked/unchecked and process has completed
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

        // Listen to the engine is changing the z-index visibility order of some collections
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_LAYER_ORDERED,
            (payload: any) => {
                // Is layer ordering
                _setIsOrderLoading([...payload.collections]);
            },
            MAP_ID
        );

        // Listen to the engine event when started updating the collections list and their map visibility
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_STARTED,
            (payload: any) => {
                // Is loading
                _setIsLoadingFeatures(true);
            },
            MAP_ID
        );

        // Listen to the engine event when some collections couldn't be shown on map, only their footprints
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_FOOTPRINT,
            (payload: any) => {
                // Show error
                api.utilities.showWarning(MAP_ID, "Extraction area too big for collection: " + payload.collection.title);
            },
            MAP_ID
        );

        // Listen to the engine event when finished updating the collections list and their map visibility
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

        // Listen to the engine error event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_ERROR,
            (payload: any) => {
                // Show error
                api.utilities.showError(MAP_ID, payload.error);
            },
            MAP_ID
        );

        // Listen to the engine warning when trying to zoom outside of map extent limits
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_ERROR_ZOOMING_OUTSIDE,
            (payload: any) => {
                // Show warning
                api.utilities.showWarning(MAP_ID, "Some elements were outside of the map extent limits.");
            },
            MAP_ID
        );

        // Listen to the engine error when trying to show a collection
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_ERROR_SHOWING_COLLECTION,
            (payload: any) => {
                // Show error
                api.utilities.showError(MAP_ID, payload.error);
            },
            MAP_ID
        );

        // Listen to the engine error when extracting records
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_ERROR_EXTRACTING,
            (payload: any) => {
                // Show error
                api.utilities.showError(MAP_ID, payload.error);
            },
            MAP_ID
        );

    }, []);

    function handleStartDrawing() {
        props.handleStartDrawing?.();
    }

    function handleClearDrawing() {
        props.handleClearDrawing?.();
    }

    function handleExtractFeatures() {
        props.handleExtractFeatures?.(email);
    }

    function handleMenuMore(e: any, coll: PyGeoAPICollectionsCollectionResponsePayload) {
        setContextMenuCollection(coll);
        setAnchorEl(e.currentTarget);
    }

    function handleZoomToCollection() {
        props.handleZoomToCollection?.(contextMenuCollection);
        // Close popup
        setAnchorEl(null);
    }

    function handleViewMetadataCollection() {
        props.handleViewMetadataCollection?.(contextMenuCollection);
        // Close popup
        setAnchorEl(null);
    }

    function handleViewCapabilitiesCollection() {
        props.handleViewCapabilitiesCollection?.(contextMenuCollection);
        // Close popup
        setAnchorEl(null);
    }

    function handleHigher(coll_type: string, coll_id: string) {
        props.handleHigher?.(coll_type, coll_id);
    }

    function handleLower(coll_type: string, coll_id: string) {
        props.handleLower?.(coll_type, coll_id);
    }

    function handleCollectionCheckedChanged(list_key: string, themeColl: ThemeCollections, value: string, checked: boolean, checkedColls: Array<string>) {
        props.handleCollectionCheckedChanged?.(list_key, themeColl, value, checked, checkedColls);
    }

    function handleEmailChange(): void {
        const txtEmail: typeof TextField = document.getElementById('czs_email');
        _setEmail(txtEmail?.value);
    }

    function handleCloseContextMenu() {
        // Close popup
        setAnchorEl(null);
    }

    function renderContentThemes(list_key: string, thmColls: ThemeCollections[]) {
        // For each theme
        //console.log("renderContentThemes");
        return <Accordion
            className="accordion-theme"
            items={Object.values(thmColls).map((thmColl: ThemeCollections) => (
                {
                    title: thmColl.theme.name + " (" + thmColl.collections.length + ")",
                    content: renderContentColls(list_key, thmColl)
                }
            ))}
        ></Accordion>;
    }

    function renderContentColls(list_key: string, thmColl: ThemeCollections) {
        // If a regular feature/coverage collection
        if (thmColl.collections && thmColl.collections.length > 0) {
            let key = list_key + "_" + thmColl.theme.id;
            return <CheckboxListAlex
                multiselect={true}
                listItems={Object.values(thmColl.collections).map((coll: PyGeoAPICollectionsCollectionResponsePayload) => {
                    return {
                        display: coll.title,
                        value: coll.id,
                        content: renderContentLayer(key, coll)
                    };
                })}
                checkedValues={checkedCollections[key] || []}
                checkedCallback={(value: string, checked: boolean, allChecked: Array<string>) => handleCollectionCheckedChanged(list_key, thmColl, value, checked, allChecked)}
            ></CheckboxListAlex>;
        }

        else
            return null;
    }

    function renderContentLayer(key: string, coll: PyGeoAPICollectionsCollectionResponsePayload) {

        let menu_more: JSX.Element = <span></span>;
        menu_more = <div className="layer-options layer-option">
            <ListItem button title='Options...' onClick={ (e: any) => { handleMenuMore(e, coll); } }>
                <ListItemIcon>
                    <img src='./img/more.png'></img>
                </ListItemIcon>
            </ListItem>
        </div>;

        let orders: JSX.Element = <span></span>;
        if (checkedCollections[key] && checkedCollections[key].includes(coll.id)) {
            orders = <div className={`layer-order-layers layer-option ${isOrderLoading.includes(coll.id) ? "loading" : ""}`}>
                        <div onClick={ (e) => { handleHigher(coll.itemType, coll.id); } } title="Bring to front">
                            <img src='./img/arrow_up.png'></img>
                        </div>
                        <div onClick={ (e) => { handleLower(coll.itemType, coll.id); } } title="Send to back">
                            <img src='./img/arrow_down.png'></img>
                        </div>
                    </div>;
        }
        return <div className="layer-options-wrapper">{menu_more}{orders}</div>;
    }

    function renderMenuOptions() {
        //console.log("renderMenuOptions", contextMenu);

        // Read info
        let link = null;
        if (contextMenuCollection)
            link = CZSUtils.getContentMetadata(contextMenuCollection.links);

        let metadata_node: JSX.Element = <MenuItem></MenuItem>;
        if (link) {
            metadata_node = <MenuItem className="layer-metadata" onClick={(e: React.MouseEventHandler<HTMLButtonElement>) => handleViewMetadataCollection()}>
                <ListItemIcon>
                    <img src='./img/metadata.png'></img>
                </ListItemIcon>
                <ListItemText>View Metadata</ListItemText>
            </MenuItem>
        }

        return <Menu className="czs_menu_options" anchorEl={anchorEl} open={open} onClose={handleCloseContextMenu}>
            <MenuItem onClick={(e: React.MouseEventHandler<HTMLButtonElement>) => handleZoomToCollection()}>
                <ListItemIcon>
                    <img src='./img/zoom_in.png'></img>
                </ListItemIcon>
                <ListItemText>Zoom to</ListItemText>
            </MenuItem>
            <MenuItem onClick={(e: React.MouseEventHandler<HTMLButtonElement>) => handleViewCapabilitiesCollection()}>
                <ListItemIcon>
                    <img src='./img/stars.png'></img>
                </ListItemIcon>
                <ListItemText>View Capabilities</ListItemText>
            </MenuItem>
            { metadata_node }
        </Menu>;
    }

    // Return coordinates
    return (
        <div className="czs_panel">
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
                            content: renderContentThemes("features", collectionsFeatures)
                        }
                    ]}
                ></Accordion>
                <Accordion
                    items={[
                        {
                            title: t('czs.list_coverage_colls'),
                            content: renderContentThemes("coverages", collectionsCoverages)
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
            { renderMenuOptions() }
        </div>
    );

};

export default CZSPanel;
