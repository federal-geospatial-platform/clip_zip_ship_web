import { Mutex } from 'async-mutex';
import {
    CZS_EVENT_NAMES,
    ThemeCollections,
    PyGeoAPICollectionsCollectionResponsePayload,
    PyGeoAPIRecordsResponsePayload,
    PyGeoAPIJobIDResponsePayload,
    ParentCollections
} from './czs_types';
import CZSUtils from './czs_utils';
import CZSServices from './czs_services';
import ImageMarkerGreen from './assets/images/Marker_green.png';


/**
 * Class used to handle CZS core logic
 *
 * @exports
 * @class CheckboxListAPI
 */
export default class CZSEngine {

    // Statics
    static GEOM_GRP_DRAW_ID: string = "czs_geoms";
    static Z_INDEX_VECTORS: number = 101;
    static Z_INDEX_RASTERS: number = 100;
    static Z_INDEX_DRAWING: number = 1000;
    static COLLECTION_FOOTPRINT_CRS: number = 4617;
    static MAP_LIMITS_X_MIN: number = -2750565;
    static MAP_LIMITS_Y_MIN: number = -936657;
    static MAP_LIMITS_X_MAX: number = 3583872;
    static MAP_LIMITS_Y_MAX: number = 4659267;
    static MAP_LIMITS_CRS: number = 3978;

    // Attributes
    _cgpvapi: any;
    _mapID: string;
    _map: any;
    _mapLimits: any;
    _lang: string = "en";
    _drawInter: any;
    _modifInter: any;
    _geometry: any | undefined;
    _collections: PyGeoAPICollectionsCollectionResponsePayload[] = [];
    _checkedCollections: any = [];
    _viewedCollections: any = {};
    _orderingCollections: any = [];
    _isDebug: boolean = window.location.hostname === "localhost";

    // Tasks watches
    __watcherLoadCollectionsCounter: number = 0;
    __watcherLoadCollectionsMutex = new Mutex();

    constructor(cgpv: any, mapID: string, language: string = "en") {
        // Get the cgpv api
        this._cgpvapi = cgpv.api;

        // Get the map
        this._mapID = mapID;
        this._map = this._cgpvapi.map(mapID);
        this._lang = language;

        // Get the map limits in current map projection
        this._mapLimits = this._cgpvapi.geoUtilities.getExtent([CZSEngine.MAP_LIMITS_X_MIN,
            CZSEngine.MAP_LIMITS_Y_MIN,
            CZSEngine.MAP_LIMITS_X_MAX,
            CZSEngine.MAP_LIMITS_Y_MAX], CZSEngine.MAP_LIMITS_CRS, this._map.currentProjection);

        // Init
        this.init();
    }

    init = () => {
        // Listen to the map loaded event
        this._cgpvapi.event.on(
            this._cgpvapi.eventNames.MAP.EVENT_MAP_LOADED,
            async (payload: any) => {
                // Create geometry group which will handle the drawing
                const geomGrp = this._map.layer.vector.createGeometryGroup(CZSEngine.GEOM_GRP_DRAW_ID);

                // Set the default styling for the vector layer
                geomGrp.vectorLayer.setStyle(this._cgpvapi.geoUtilities.defaultDrawingStyle('orange'));

                // Make sure it'll always be on top of every layers
                geomGrp.vectorLayer.setZIndex(CZSEngine.Z_INDEX_DRAWING);

                // Init modify interaction
                this._modifInter = this._map.initModifyInteractions(CZSEngine.GEOM_GRP_DRAW_ID);
                //const transInter = cgpv.api.map(this._mapID).initTranslateInteractions();

                // Load the collections off the bat
                let loaded: boolean = await this.loadCollectionsAsync();
            },
            this._mapID
        );

        // Listen to the draw ended event
        this._cgpvapi.event.on(
            this._cgpvapi.eventNames.INTERACTION.EVENT_DRAW_ENDED,
            async (payload: any) => {
                // Redirect
                let loaded: boolean = await this.handleDrawEndAsync(payload.drawInfo);
            },
            this._mapID
        ); // End "on" handler

        // Listen to the modify ended event
        this._cgpvapi.event.on(
            this._cgpvapi.eventNames.INTERACTION.EVENT_MODIFY_ENDED,
            async (payload: any) => {
                // Redirect
                let loaded: boolean = await this.handleDrawChangeAsync(payload.modifyInfo);
            },
            this._mapID
        ); // End "on" handler
    }

    onLoadCollectionsStarted = (geometry: any) => {
        this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_STARTED, handlerName: this._mapID, geometry: geometry });
    }

    onLoadCollectionsEnded = () => {
        this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_ENDED, handlerName: this._mapID });
    }

    onLoadCollectionsFeatures = (features: any) => {
        this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_FEATURES, handlerName: this._mapID, collections: features });
    }

    onLoadCollectionsCoverages = (coverages: any) => {
        this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_COVERAGES, handlerName: this._mapID, collections: coverages });
    }

    onUpdateLayersStarted = () => {
        this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_STARTED, handlerName: this._mapID });
    }

    onUpdateLayersEnded = (collections: any) => {
        //console.log("Updated collections", collections);
        this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_ENDED, handlerName: this._mapID, viewedCollections: collections });
    }

    onErrorZoomingOutside = () => {
        this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_ERROR_ZOOMING_OUTSIDE, handlerName: this._mapID });
    }

    onErrorShowingCollection = (err: any) => {
        console.log("ERROR_SHOWING_COLLECTION", err);
        this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_ERROR_SHOWING_COLLECTION, handlerName: this._mapID, error: err });
    }

    onErrorExtracting = (err: any) => {
        console.log("ERROR_EXTRACTING", err);
        this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_ERROR_EXTRACTING, handlerName: this._mapID, error: err });
    }

    onError = (err: any) => {
        console.log("ERROR", err);
        this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_ERROR, handlerName: this._mapID, error: err });
    }

    startDrawing = (): void => {
        // Clear current drawing
        this._map.layer.vector.deleteGeometriesFromGroup(CZSEngine.GEOM_GRP_DRAW_ID);

        // Init drawing interaction
        this._drawInter = this._map.initDrawInteractions(CZSEngine.GEOM_GRP_DRAW_ID, "Polygon");
    }

    clearDrawingAsync = async (): Promise<boolean> => {
        // Clear current drawing
        this._map.layer.vector.deleteGeometriesFromGroup(CZSEngine.GEOM_GRP_DRAW_ID);
        // Stop drawing if currently drawing
        this.onStopDrawing();
        // Reload the collections from scratch
        return await this.loadCollectionsAsync();
    }

    onStopDrawing = () => {
        if (this._drawInter) {
            this._drawInter.stopInteraction();
        }
    }

    handleDrawChangeAsync = async (e: any): Promise<boolean> => {
        // Reset the geometry and reload the collections
        let geom = e.features.getArray()[0].getGeometry();
        return await this.loadCollectionsAsync(geom);
    }

    handleDrawEndAsync = async (e: any): Promise<boolean> => {
        //console.log("handleDrawEndAsync", e);
        let geom = e.feature.getGeometry();

        // Stop the interaction (doing it in a delay prevents a double-click event)
        setTimeout(() => {
            // Stop drawing interaction
            this.onStopDrawing();
        });

        // Zoom to geometry
        this._map.zoomToExtent(geom.getExtent(), { padding: [100, 100, 100, 100], duration: 1000 });

        // Load collections in geometry
        return await this.loadCollectionsAsync(geom);
    }

    updateCollectionCheckedAsync = async (value: string, checked: boolean, parentColl: ParentCollections, checkedColls: string[]): Promise<boolean> => {
        try {
            // Find the collection information for that collection id
            let coll_info = this.findCollectionFromID(value);

            // Replace it
            this._checkedCollections = checkedColls;

            // If found
            if (coll_info) {
                // Start loading
                this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_COLLECTION_CHANGED_STARTED, handlerName: this._mapID, parentCollection: parentColl, checkedCollections: checkedColls });

                // If showing
                if (checked) {
                    // Add collection layer
                    await this.addCollectionAsync(coll_info, this._geometry).finally(() => {
                        // Done loading
                        this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_COLLECTION_CHANGED_ENDED, handlerName: this._mapID, viewedCollections: this._viewedCollections });
                    });

                    // If there was no geometry
                    if (!this._geometry) {
                        // Emit
                        this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_FOOTPRINT_NO_GEOM, handlerName: this._mapID, collection: coll_info });
                    }
                }

                else {
                    // Remove collection layer
                    this.removeCollection(coll_info.id);

                    // Done loading
                    this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_COLLECTION_CHANGED_ENDED, handlerName: this._mapID, viewedCollections: this._viewedCollections });
                }
            }

            // Done
            return true;
        }

        catch (err) {
            // Handle error
            this.onErrorShowingCollection(err);
            return false;
        }
    }

    layerOrderHigherAsync = async (coll_type: string, coll_id: string): Promise<boolean> => {
        // If already ordering the layer
        if (this._orderingCollections.indexOf(coll_id) >= 0) return false;

        this._orderingCollections.push(coll_id);
        this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_LAYER_ORDERED, handlerName: this._mapID, collections: this._orderingCollections });
        return await this.higherAsync(coll_type, coll_id).finally(() => {
            const idx = this._orderingCollections.indexOf(coll_id);
            if (idx >= 0) this._orderingCollections.splice(idx, 1);
            this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_LAYER_ORDERED, handlerName: this._mapID, collections: this._orderingCollections });
        });
    }

    layerOrderLowerAsync = async (coll_type: string, coll_id: string): Promise<boolean> => {
        // If already ordering the layer
        if (this._orderingCollections.indexOf(coll_id) >= 0) return false;

        this._orderingCollections.push(coll_id);
        this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_LAYER_ORDERED, handlerName: this._mapID, collections: this._orderingCollections });
        return await this.lowerAsync(coll_type, coll_id).finally(() => {
            const idx = this._orderingCollections.indexOf(coll_id);
            if (idx >= 0) this._orderingCollections.splice(idx, 1);
            this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_LAYER_ORDERED, handlerName: this._mapID, collections: this._orderingCollections });
        });
    }

    extractFeaturesAsync = async (email: string): Promise<any> => {
        try {
            // Proceed
            let res: PyGeoAPIJobIDResponsePayload = await CZSServices.extractFeaturesAsync(Object.keys(this._viewedCollections), email, this._cgpvapi.geoUtilities.geometryToWKT(this._geometry), this._map.currentProjection)
            console.log("JOB RESULT", res);

            // Job started
            this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_EXTRACT_STARTED, handlerName: this._mapID, ...res });

            // Return result
            return res;
        }

        catch (err) {
            // Handle error
            this.onErrorExtracting(err);
        }
    }

    zoomToCollection = async (collection: PyGeoAPICollectionsCollectionResponsePayload) => {
        // Get the wkt for the collection
        let coll: PyGeoAPICollectionsCollectionResponsePayload = await CZSServices.getCollectionWKTAsync(collection);

        // Convert wkt to geometry
        const geom = this._cgpvapi.geoUtilities.wktToGeometry(coll.wkt);

        // Reproject in current map projection
        geom.transform(
            `EPSG:${CZSEngine.COLLECTION_FOOTPRINT_CRS}`,
            this._cgpvapi.projection.projections[this._map.currentProjection]
        );

        // Get extent
        let ext = geom.getExtent();

        // If the geometry falls outside the basemap boundaries
        let wasOutside = false;
        if (ext[0] < this._mapLimits[0]) wasOutside = true;
        if (ext[1] < this._mapLimits[1]) wasOutside = true;
        if (ext[2] > this._mapLimits[2]) wasOutside = true;
        if (ext[3] > this._mapLimits[3]) wasOutside = true;

        // Zoom to geometry
        this._map.zoomToExtent(ext, { padding: [100, 100, 100, 100], duration: 1000 });

        // If was outside
        if (wasOutside) this.onErrorZoomingOutside();
    }

    higherAsync = async (coll_type: string, collection_id: string): Promise<boolean> => {
        // Depending on the kind of layer
        if (coll_type == "feature") {
            // Get the geometry group vector layer
            let vLayer = this._map.layer.vector.getGeometryGroup(collection_id).vectorLayer;
            let zindex = vLayer.getZIndex();
            zindex++;
            vLayer.setZIndex(zindex);
            return true;
        }

        else {
            // Raster type, those are added like a regular layer
            const lyr = await this.getLayerAsync(collection_id);
            let zindex = lyr.gvLayers!.getZIndex();
            zindex++;
            lyr.gvLayers!.setZIndex(zindex);
            return true;
        }
    }

    lowerAsync = async (coll_type: string, collection_id: string): Promise<boolean> => {
        // Depending on the kind of layer
        if (coll_type == "feature") {
            // Get the geometry group vector layer
            let vLayer = this._map.layer.vector.getGeometryGroup(collection_id).vectorLayer;
            let zindex = vLayer.getZIndex();
            zindex--;
            vLayer.setZIndex(zindex);
            return true;
        }

        else {
            // Raster type, those are added like a regular layer
            const lyr = await this.getLayerAsync(collection_id);
            let zindex = lyr.gvLayers!.getZIndex();
            zindex--;
            lyr.gvLayers!.setZIndex(zindex);
            return true;
        }
    }

    findCollectionFromID = (collection_id: string): PyGeoAPICollectionsCollectionResponsePayload | null => {
        // Find the collection information in our data
        let colls: PyGeoAPICollectionsCollectionResponsePayload[] = [];

        // For each collection
        colls = colls.concat(this._collections.filter((coll: PyGeoAPICollectionsCollectionResponsePayload) => {
            return coll.id == collection_id;
        }));

        // If found
        if (colls.length > 0)
            return colls[0];
        return null;
    }

    adjustExtentOnLayerID = (layer: any, geom?: any) => {
        let ext = undefined;
        if (geom) ext = geom.getExtent();
        layer.setExtent(ext);
        layer.setVisible(false);
        layer.setVisible(true);
    }

    loadCollectionsAsync = async (geom?: any): Promise<boolean> => {
        // Synchronizing stuff
        this.__watcherLoadCollectionsCounter++;
        let check = this.__watcherLoadCollectionsCounter;
        let release = await this.__watcherLoadCollectionsMutex.acquire();
        try {
            // If on the right task
            if (check == this.__watcherLoadCollectionsCounter) {
                try {
                    // Store the geometry
                    this._geometry = geom;

                    // On load
                    this.onLoadCollectionsStarted(this._geometry);

                    // Get the collections
                    let colls: PyGeoAPICollectionsCollectionResponsePayload[] = await CZSServices.getCollectionsPOSTAsync(this._lang + "-CA", this._cgpvapi.geoUtilities.geometryToWKT(this._geometry), this._map.currentProjection);

                    // Group the collections by types, then by themes, then by parents
                    this._collections = [];
                    let collectionFeatures: ThemeCollections[] = [];
                    let collectionCoverages: ThemeCollections[] = [];
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
                                    title: collection.theme
                                }, []);
                                themeColls.push(thmColl);
                            }

                            // Find the parent
                            let parentColl = thmColl.parents?.find((parCol: ParentCollections) => {
                                return parCol.parent.id == collection.parent;
                            });

                            // If not found
                            if (!parentColl) {
                                parentColl = new ParentCollections(thmColl.theme, {
                                    id: collection.parent,
                                    title: collection.parent_title
                                }, []);
                                thmColl.parents.push(parentColl);
                            }

                            // Add the collection to the ParentCollections
                            parentColl.collections.push(collection);

                            // Add the collection in the overall list
                            this._collections.push(collection);
                        }
                    });

                    // Reorder the themes by alphabetical order
                    collectionFeatures.sort((t1: ThemeCollections, t2: ThemeCollections): number => {
                        return CZSUtils.sortAlphabetically(t1.theme.title, t2.theme.title);
                    });

                    // Reorder the themes by alphabetical order
                    collectionCoverages.sort((t1: ThemeCollections, t2: ThemeCollections): number => {
                        return CZSUtils.sortAlphabetically(t1.theme.title, t2.theme.title);
                    });

                    // Reorder the parents by alphabetical order
                    collectionFeatures.forEach((t: ThemeCollections) => {
                        t.parents.sort((p1: ParentCollections, p2: ParentCollections): number => {
                            return CZSUtils.sortAlphabetically(p1.parent.title, p2.parent.title);
                        });

                        // Reorder the collections by alphabetical order
                        t.parents.forEach((t: ParentCollections) => {
                            t.collections.sort((c1: PyGeoAPICollectionsCollectionResponsePayload, c2: PyGeoAPICollectionsCollectionResponsePayload): number => {
                                return CZSUtils.sortAlphabetically(c1.title, c2.title);
                            });
                        });
                    });

                    // Reorder each collection within each theme
                    collectionCoverages.forEach((t: ThemeCollections) => {
                        t.parents.sort((p1: ParentCollections, p2: ParentCollections): number => {
                            return CZSUtils.sortAlphabetically(p1.parent.title, p2.parent.title);
                        });

                        // Reorder the collections by alphabetical order
                        t.parents.forEach((t: ParentCollections) => {
                            t.collections.sort((c1: PyGeoAPICollectionsCollectionResponsePayload, c2: PyGeoAPICollectionsCollectionResponsePayload): number => {
                                return CZSUtils.sortAlphabetically(c1.title, c2.title);
                            });
                        });
                    });

                    // On loaded features
                    this.onLoadCollectionsFeatures(collectionFeatures);
                    this.onLoadCollectionsCoverages(collectionCoverages);

                    // Display features on map
                    await this.updateLayersOnMapAsync(geom);
                }

                finally {
                    // End gracefully
                    this.onLoadCollectionsEnded();
                }

                // Loaded
                return true;
            }

            // Skipped
            return false;
        }

        catch (err) {
            // Handle error
            this.onError(err);
            return false;
        }

        finally {
            // Release the Mutex
            release();
        }
    }

    updateLayersOnMapAsync = async (geom?: any): Promise<boolean> => {
        try {
            // Emit
            this.onUpdateLayersStarted();

            // For each checked collections
            let promises = [];
            for (const coll_id of this.getCheckedCollections()) {
                // Find the collection information for that collection id
                let coll_info = this.findCollectionFromID(coll_id);

                // If found
                if (coll_info) {
                    // Add collection layer
                    let p = this.addCollectionAsync(coll_info, geom);
                    promises.push(p);
                }

                else {
                    // We have remaining checked collections which aren't listed anymore.
                    if (this._viewedCollections[coll_id]) {
                        this.removeCollection(coll_id)
                    }
                }
            }

            // Wait for all promises to finish
            await Promise.all(promises);

            // Done
            return true;
        }

        finally {
            // Done
            this.onUpdateLayersEnded(this._viewedCollections);
        }
    }

    getCheckedCollections = () => {
        let checkedcolls: string[] = [];
        Object.keys(this._checkedCollections).forEach((the_key: string) => {
            checkedcolls = checkedcolls.concat(this._checkedCollections[the_key]);
        });
        return checkedcolls;
    }

    getAreaInKm2 = (geom: any) => {
        return this._cgpvapi.geoUtilities.getArea(geom, {projection: this._map.getView().getProjection().getCode()}) / 1000000
    }

    addCollectionAsync = async (coll_info: PyGeoAPICollectionsCollectionResponsePayload, geom?: any): Promise<boolean> => {
        //console.log("addCollectionAsync : " + coll_info.id)

        // Check if extraction area is big enough
        if (geom && this.getAreaInKm2(geom) <= coll_info.max_area) {
            // Depending on the collection type
            if (coll_info.itemType == "feature") {
                // Flush the geometry group
                this.removeCollection(coll_info.id);

                // Add vector collection and wait for its addition to complete
                await this.addCollectionVectorAsync(coll_info, geom);
            }

            else {
                // Add raster collection
                await this.addCollectionRasterAsync(coll_info, geom);
            }
        }

        else {
            // Flush the geometry group
            this.removeCollection(coll_info.id);

            // Add fingerprint
            this.addFingerprintCollectionAsync(coll_info);

            // If there was a geometry
            if (geom) {
                // Emit
                this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_FOOTPRINT, handlerName: this._mapID, collection: coll_info });
            }
        }
        return true;
    }

    addCollectionVectorAsync = async (coll_info: PyGeoAPICollectionsCollectionResponsePayload, geom?: any): Promise<boolean> => {
        // Query
        let coll_res: PyGeoAPIRecordsResponsePayload = await CZSServices.getFeaturesAsync(coll_info, this._cgpvapi.geoUtilities.geometryToWKT(geom), this._map.currentProjection);

        //console.log("Records", coll_res);
        if (coll_res.data.features && coll_res.data.features.length > 0) {
            // Create geometry group which will handle the records results
            const geomGrpRes = this._map.layer.vector.createGeometryGroup(coll_info.id);

            // Set the zindex
            geomGrpRes.vectorLayer.setZIndex(CZSEngine.Z_INDEX_VECTORS)

            // Set the active geometry group
            this._map.layer.vector.setActiveGeometryGroup(coll_info.id);

            // Keep track
            this._viewedCollections[coll_info.id] = {
                type: 'feature',
                info: geomGrpRes
            };

            // Load the features in the group
            this.loadFeaturesInGroup(coll_res.data.features, parseInt(coll_info.crs[0]), "blue", "green");

            // Emit
            this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_FEATURES, handlerName: this._mapID, collection: coll_info });
        }

        // Done
        return true;
    }

    addCollectionRasterAsync = async (coll_info: PyGeoAPICollectionsCollectionResponsePayload, geom?: any): Promise<boolean> => {
        // If already visible
        if (this._viewedCollections[coll_info.id] && this._viewedCollections[coll_info.id].type == "raster") {
            // Get the layer as soon as it's in the api
            let lyr = await this.getLayerAsync(coll_info.id);

            // Set the visible extent for the layer
            this.adjustExtentOnLayerID(lyr, geom);
        }

        else {
            // Flush the collection, in case it's been set as a footprint
            this.removeCollection(coll_info.id);

            // Prep the config
            let layerConfig = {
                'geoviewLayerType': 'ogcWms',
                'geoviewLayerId': coll_info.id,
                'geoviewLayerName': { 'en': coll_info.title, 'fr': coll_info.title },
                'metadataAccessPath': { 'en': QGIS_SERVICE_URL_ROOT + coll_info.org_schema + '/' + coll_info.parent, 'fr': QGIS_SERVICE_URL_ROOT + coll_info.org_schema + '/' + coll_info.parent },
                'listOfLayerEntryConfig': [
                    {
                        'layerId': coll_info.short_name,
                        'layerName': { 'en': coll_info.title, 'fr': coll_info.title },
                        'source': {
                            'dataProjection': "EPSG:4326" // Default.. will be set later
                        },
                    }
                ]
            };

            // If crs is defined
            if (coll_info.crs && coll_info.crs.length > 0 && Number.isInteger(coll_info.crs[0]))
                layerConfig['listOfLayerEntryConfig'][0]['source']['dataProjection'] = 'EPSG:' + coll_info.crs[0];

            if (this._isDebug) {
                layerConfig['metadataAccessPath'] = { 'en': 'https://maps.geogratis.gc.ca/wms/hydro_network_en', 'fr': 'https://maps.geogratis.gc.ca/wms/hydro_network_en' };
                layerConfig['listOfLayerEntryConfig'][0]['layerId'] = 'hydro_network';
                layerConfig['listOfLayerEntryConfig'][0]['layerName'] = { 'en': 'hydro_network', 'fr': 'hydro_network' };
                // if (coll_info.id == "cdem_mpi__cdem") {
                //     layerConfig['metadataAccessPath'] = { 'en': 'https://maps.geogratis.gc.ca/wms/railway_en', 'fr': 'https://maps.geogratis.gc.ca/wms/railway_fr' };
                //     layerConfig['listOfLayerEntryConfig'][0]['layerId'] = 'railway';
                //     layerConfig['listOfLayerEntryConfig'][0]['layerName'] = { 'en': 'Railways', 'fr': 'Chemins de fer' };
                // }
            }

            // Add the layer
            this._map.layer.addGeoviewLayer(layerConfig);

            // Get the layer as soon as it's in the api AND loaded on the map
            let lyr = await this.getLayerAsync(coll_info.id);

            // Set the visible extent for the layer
            this.adjustExtentOnLayerID(lyr, geom);

            // Adjust its z-index
            lyr.gvLayers.setZIndex(CZSEngine.Z_INDEX_RASTERS);

            // Keep track
            this._viewedCollections[coll_info.id] = {
                type: 'raster',
                info: layerConfig
            };

            // Emit
            this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_COVERAGES, handlerName: this._mapID, collection: coll_info });
        }

        // Done
        return true;
    }

    addFingerprintCollectionAsync = async (coll_info: PyGeoAPICollectionsCollectionResponsePayload) => {
        // Get the wkt for the collection
        let coll: PyGeoAPICollectionsCollectionResponsePayload = await CZSServices.getCollectionWKTAsync(coll_info);

        // Create geometry group which will handle the records results
        const geomGrpRes = this._map.layer.vector.createGeometryGroup(coll_info.id);

        // Set the zindex
        geomGrpRes.vectorLayer.setZIndex(CZSEngine.Z_INDEX_VECTORS)

        // Set the active geometry group
        this._map.layer.vector.setActiveGeometryGroup(coll_info.id);

        // Load the features in the group
        this.loadFeaturesInGroup([coll.wkt], CZSEngine.COLLECTION_FOOTPRINT_CRS, "red", "red");
    }

    removeCollection = (collection_id: string) => {
        // Delete the collection when it's part of a geometry group
        if (this._map.layer.vector.getGeometryGroup(collection_id))
            this._map.layer.vector.deleteGeometryGroup(collection_id);

        // If the collection is viewable
        if (this._viewedCollections.hasOwnProperty(collection_id)) {
            let temp = this._viewedCollections[collection_id];
            // If raster type
            if (temp.type == "raster") {
                this._map.layer.removeGeoviewLayer(temp.info);
            }

            // Done
            delete this._viewedCollections[collection_id];
        }
    }

    loadFeaturesInGroup = (features: any[], crs: number, color: string, colorClip: string) => {
        // For each records in the collection result
        features.forEach((rec: any) => {
            // If the feature comes in as a geojson
            let geometry;
            if (rec.geometry) {
                geometry = this._cgpvapi.geoUtilities.geojsonToGeometry(rec.geometry);
            }
            else {
                geometry = this._cgpvapi.geoUtilities.wktToGeometry(rec);
            }

            // Depending on the geometry type
            if (geometry.getType() == "LineString") {
                // Add geometry to feature collection
                this._map.layer.vector.addPolyline(geometry.getCoordinates(), { projection: crs, style: { strokeColor: color, strokeOpacity: 0.5, strokeWidth: 1 } });
            }

            else if (geometry.getType() == "MultiLineString") {
                // For each line
                geometry.getLineStrings().forEach((line: any) => {
                    // Add geometry to feature collection
                    this._map.layer.vector.addPolyline(line.getCoordinates(), { projection: crs, style: { strokeColor: color, strokeOpacity: 1, strokeWidth: 1, fillColor: color, fillOpacity: 0.05 } });
                });
            }

            else if (geometry.getType() == "Point") {
                // Add geometry to feature collection
                this._map.layer.vector.addMarkerIcon(geometry.getCoordinates(), {
                    projection: crs,
                    style: {
                        anchor: [0.5, 256],
                        size: [256, 256],
                        scale: 0.1,
                        anchorXUnits: 'fraction',
                        anchorYUnits: 'pixels',
                        src: ImageMarkerGreen,
                    }
                });
            }

            else if (geometry.getType() == "MultiPoint") {
                // For each point
                geometry.getPoints().forEach((point: any) => {
                   // Add geometry to feature collection
                    this._map.layer.vector.addMarkerIcon(point.getCoordinates(), {
                        projection: crs,
                        style: {
                            anchor: [0.5, 256],
                            size: [256, 256],
                            scale: 0.1,
                            anchorXUnits: 'fraction',
                            anchorYUnits: 'pixels',
                            src: ImageMarkerGreen,
                        }
                    });
                });
            }

            else if (geometry.getType() == "Polygon") {
                // Add geometry to feature collection
                this._map.layer.vector.addPolygon(geometry.getCoordinates(), { projection: crs, style: { strokeColor: color, strokeOpacity: 1, strokeWidth: 1, fillColor: color, fillOpacity: 0.05 } });
            }

            else if (geometry.getType() == "MultiPolygon") {
                // For each polygon
                geometry.getPolygons().forEach((poly: any) => {
                    // Add geometry to feature collection
                    this._map.layer.vector.addPolygon(poly.getCoordinates(), { projection: crs, style: { strokeColor: color, strokeOpacity: 1, strokeWidth: 1, fillColor: color, fillOpacity: 0.05 } });
                });
            }

            else {
                // Error
                console.log("Unknown geometry type", geometry.getType());
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
                        this._map.layer.vector.addPolyline(coords, { projection: crs, style: { strokeColor: colorClip, strokeWidth: 1.5 } });
                    });
                }

                else if (rec.geometry_clipped.type == "MultiLineString") {
                    // For each line
                    rec.geometry_clipped.coordinates.forEach((coords: number[][]) => {
                        this._map.layer.vector.addPolyline(coords, { projection: crs, style: { strokeColor: colorClip, strokeWidth: 1.5, fillColor: colorClip, fillOpacity: 0.3 } });
                    });
                }

                else if (rec.geometry_clipped.type == "Polygon") {
                    this._map.layer.vector.addPolygon(rec.geometry_clipped.coordinates, { projection: crs, style: { strokeColor: colorClip, strokeWidth: 1.5, fillColor: colorClip, fillOpacity: 0.3 } });
                }

                else if (rec.geometry_clipped.type == "MultiPolygon") {
                    // For each polygon
                    rec.geometry_clipped.coordinates.forEach((coords: number[][]) => {
                        this._map.layer.vector.addPolygon(coords, { projection: crs, style: { strokeColor: colorClip, strokeWidth: 1.5, fillColor: colorClip, fillOpacity: 0.3 } });
                    });
                }

                else if (rec.geometry_clipped.type == "Point" || rec.geometry_clipped.type == "MultiPoint") {
                    // No worries, skip
                }

                else {
                    // Error
                    console.log("Ignored geometry clipped type", rec.geometry_clipped.type);
                }
            }
        });
    }

    getLayerAsync = async (coll_id: string): Promise<any | null> => {
        // Layer types
        // console.log("YO", this._cgpvapi.layerTypes);

        // Return the layer once loaded
        return await this._map.layer.getGeoviewLayerByIdAsync(coll_id, true, 200, 20000);
    }

}
