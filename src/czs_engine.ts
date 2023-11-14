/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-underscore-dangle */
import { Mutex } from 'async-mutex';
import {
  CZS_EVENT_NAMES,
  PyGeoAPICollectionsCollectionResponsePayload,
  PyGeoAPIRecordsResponsePayload,
  PyGeoAPIJobIDResponsePayload,
  SomeOLType,
  SomePayloadBaseClass,
} from './czs-types';
import { ParentCollections } from './collParent';
import { ThemeCollections } from './collTheme';
import CZSUtils from './czs-utils';
import CZSServices from './czs_services';
import ImageMarkerGreen from './assets/images/Marker_green.png';

const getLayerAsync = (layer: any, collectionId: string): Promise<any> => {
  // Return the layer once loaded
  return layer.getGeoviewLayerByIdAsync(collectionId, true, 200, 30000);
};

/**
 * Class used to handle CZS core logic
 *
 * @exports
 * @class CheckboxListAPI
 */
export default class CZSEngine {
  // Statics
  static GEOM_GRP_DRAW_ID: string = 'czs_geoms';

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

  _mapLimits: SomeOLType;

  _lang: string = 'en';

  _drawInter: SomeOLType;

  _modifInter: SomeOLType;

  _geometry: SomeOLType | undefined;

  _collections: PyGeoAPICollectionsCollectionResponsePayload[] = [];

  _checkedCollections: string[] = [];

  _viewedCollections: any = {};

  _orderingCollections: string[] = [];

  // Tasks watches
  __watcherLoadCollectionsCounter: number = 0;

  __watcherLoadCollectionsMutex = new Mutex();

  constructor(cgpv: any, mapID: string, language: string = 'en') {
    // Get the cgpv api
    this._cgpvapi = cgpv.api;

    // Get the map
    this._mapID = mapID;
    this._map = this._cgpvapi.maps[mapID];
    this._lang = language;

    // Get the map limits in current map projection
    this._mapLimits = this._cgpvapi.geoUtilities.getExtent(
      [CZSEngine.MAP_LIMITS_X_MIN, CZSEngine.MAP_LIMITS_Y_MIN, CZSEngine.MAP_LIMITS_X_MAX, CZSEngine.MAP_LIMITS_Y_MAX],
      CZSEngine.MAP_LIMITS_CRS,
      this._map.currentProjection,
    );

    // Init
    this.init();
  }

  init = (): void => {
    // Listen to the map loaded event
    this._cgpvapi.event.on(
      this._cgpvapi.eventNames.MAP.EVENT_MAP_LOADED,
      async () => {
        // Create geometry group which will handle the drawing
        const geomGrp = this._map.layer.geometry?.createGeometryGroup(CZSEngine.GEOM_GRP_DRAW_ID);

        // Set the default styling for the vector layer
        geomGrp.vectorLayer.setStyle(this._cgpvapi.geoUtilities.defaultDrawingStyle('orange'));

        // Make sure it'll always be on top of every layers
        geomGrp.vectorLayer.setZIndex(CZSEngine.Z_INDEX_DRAWING);

        // Init modify interaction
        this._modifInter = this._map.initModifyInteractions(CZSEngine.GEOM_GRP_DRAW_ID);
        // const transInter = cgpv.api.maps[this._mapID].initTranslateInteractions();

        // Load the collections off the bat
        await this.loadCollectionsAsync();
      },
      this._mapID,
    );

    // Listen to the draw ended event
    this._cgpvapi.event.on(
      this._cgpvapi.eventNames.INTERACTION.EVENT_DRAW_ENDED,
      async (payload: SomePayloadBaseClass) => {
        // Redirect
        await this.handleDrawEndAsync(payload.drawInfo);
      },
      this._mapID,
    ); // End "on" handler

    // Listen to the modify ended event
    this._cgpvapi.event.on(
      this._cgpvapi.eventNames.INTERACTION.EVENT_MODIFY_ENDED,
      async (payload: SomePayloadBaseClass) => {
        // Redirect
        await this.handleDrawChangeAsync(payload.modifyInfo);
      },
      this._mapID,
    ); // End "on" handler
  };

  onLoadCollectionsStarted = (geometry: SomeOLType): void => {
    this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_STARTED, handlerName: this._mapID, geometry });
  };

  onLoadCollectionsEnded = (): void => {
    this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_ENDED, handlerName: this._mapID });
  };

  onLoadCollectionsFeatures = (features: SomeOLType): void => {
    this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_FEATURES, handlerName: this._mapID, collections: features });
  };

  onLoadCollectionsCoverages = (coverages: SomeOLType): void => {
    this._cgpvapi.event.emit({
      event: CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_COVERAGES,
      handlerName: this._mapID,
      collections: coverages,
    });
  };

  onUpdateLayersStarted = (): void => {
    this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_STARTED, handlerName: this._mapID });
  };

  onUpdateLayersEnded = (collections: any): void => {
    // console.log("Updated collections", collections);
    this._cgpvapi.event.emit({
      event: CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_ENDED,
      handlerName: this._mapID,
      viewedCollections: collections,
    });
  };

  onErrorZoomingOutside = (): void => {
    this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_ERROR_ZOOMING_OUTSIDE, handlerName: this._mapID });
  };

  onErrorShowingCollection = (err: unknown): void => {
    console.log('ERROR_SHOWING_COLLECTION', err);
    this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_ERROR_SHOWING_COLLECTION, handlerName: this._mapID, error: err });
  };

  onErrorExtracting = (err: unknown): void => {
    console.log('ERROR_EXTRACTING', err);
    this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_ERROR_EXTRACTING, handlerName: this._mapID, error: err });
  };

  onError = (err: unknown): void => {
    console.log('ERROR', err);
    this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_ERROR, handlerName: this._mapID, error: err });
  };

  startDrawing = (): void => {
    // Clear current drawing
    this._map.layer.geometry?.deleteGeometriesFromGroup(CZSEngine.GEOM_GRP_DRAW_ID);

    // Init drawing interaction
    this._drawInter = this._map.initDrawInteractions(CZSEngine.GEOM_GRP_DRAW_ID, 'Polygon');
  };

  clearDrawingAsync = (): Promise<boolean> => {
    // Clear current drawing
    this._map.layer.geometry?.deleteGeometriesFromGroup(CZSEngine.GEOM_GRP_DRAW_ID);
    // Stop drawing if currently drawing
    this.onStopDrawing();
    // Reload the collections from scratch
    return this.loadCollectionsAsync();
  };

  onStopDrawing = (): void => {
    if (this._drawInter) {
      this._drawInter.stopInteraction();
    }
  };

  handleDrawChangeAsync = (e: SomeOLType): Promise<boolean> => {
    // Reset the geometry and reload the collections
    const geom = e.features.getArray()[0].getGeometry();
    return this.loadCollectionsAsync(geom);
  };

  handleDrawEndAsync = (e: SomeOLType): Promise<boolean> => {
    // console.log("handleDrawEndAsync", e);
    const geom = e.feature.getGeometry();

    // Stop the interaction (doing it in a delay prevents a double-click event)
    setTimeout(() => {
      // Stop drawing interaction
      this.onStopDrawing();
    });

    // Zoom to geometry
    this._map.zoomToExtent(geom.getExtent(), { padding: [100, 100, 100, 100], duration: 1000 });

    // Load collections in geometry
    return this.loadCollectionsAsync(geom);
  };

  updateCollectionCheckedAsync = async (
    parentColl: ParentCollections,
    value: string,
    checked: boolean,
    checkedColls: string[],
  ): Promise<boolean> => {
    try {
      // Find the collection information for that collection id
      const collInfo = this.findCollectionFromID(value);

      // Replace it
      this._checkedCollections = checkedColls;

      // If found
      if (collInfo) {
        // Start loading
        this._cgpvapi.event.emit({
          event: CZS_EVENT_NAMES.ENGINE_COLLECTION_CHANGED_STARTED,
          handlerName: this._mapID,
          parentCollection: parentColl,
          checkedCollections: checkedColls,
        });

        // If showing
        if (checked) {
          // Add collection layer
          await this.addCollectionAsync(collInfo, this._geometry).finally(() => {
            // Done loading
            this._cgpvapi.event.emit({
              event: CZS_EVENT_NAMES.ENGINE_COLLECTION_CHANGED_ENDED,
              handlerName: this._mapID,
              viewedCollections: this._viewedCollections,
            });
          });

          // If there was no geometry
          if (!this._geometry) {
            // Emit
            this._cgpvapi.event.emit({
              event: CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_FOOTPRINT_NO_GEOM,
              handlerName: this._mapID,
              collection: collInfo,
            });
          }
        } else {
          // Remove collection layer
          this.removeCollection(collInfo.id);

          // Done loading
          this._cgpvapi.event.emit({
            event: CZS_EVENT_NAMES.ENGINE_COLLECTION_CHANGED_ENDED,
            handlerName: this._mapID,
            viewedCollections: this._viewedCollections,
          });
        }
      }

      // Done
      return true;
    } catch (err) {
      // Handle error
      this.onErrorShowingCollection(err);
      return false;
    }
  };

  layerOrderHigherAsync = (collType: string, collId: string): Promise<boolean> => {
    // If already ordering the layer
    if (this._orderingCollections.indexOf(collId) >= 0) return Promise.resolve(false);

    this._orderingCollections.push(collId);
    this._cgpvapi.event.emit({
      event: CZS_EVENT_NAMES.ENGINE_LAYER_ORDERED,
      handlerName: this._mapID,
      collections: this._orderingCollections,
    });
    return this.higherAsync(collType, collId).finally(() => {
      const idx = this._orderingCollections.indexOf(collId);
      if (idx >= 0) this._orderingCollections.splice(idx, 1);
      this._cgpvapi.event.emit({
        event: CZS_EVENT_NAMES.ENGINE_LAYER_ORDERED,
        handlerName: this._mapID,
        collections: this._orderingCollections,
      });
    });
  };

  layerOrderLowerAsync = (collType: string, collId: string): Promise<boolean> => {
    // If already ordering the layer
    if (this._orderingCollections.indexOf(collId) >= 0) return Promise.resolve(false);

    this._orderingCollections.push(collId);
    this._cgpvapi.event.emit({
      event: CZS_EVENT_NAMES.ENGINE_LAYER_ORDERED,
      handlerName: this._mapID,
      collections: this._orderingCollections,
    });
    return this.lowerAsync(collType, collId).finally(() => {
      const idx = this._orderingCollections.indexOf(collId);
      if (idx >= 0) this._orderingCollections.splice(idx, 1);
      this._cgpvapi.event.emit({
        event: CZS_EVENT_NAMES.ENGINE_LAYER_ORDERED,
        handlerName: this._mapID,
        collections: this._orderingCollections,
      });
    });
  };

  extractFeaturesAsync = async (email: string, outCrs?: number): Promise<PyGeoAPIJobIDResponsePayload | void> => {
    try {
      // Proceed
      const res: PyGeoAPIJobIDResponsePayload = await CZSServices.extractFeaturesAsync(
        Object.keys(this._viewedCollections),
        email,
        this._cgpvapi.geoUtilities.geometryToWKT(this._geometry),
        this._map.currentProjection,
        outCrs,
      );
      console.log('JOB RESULT', res);

      // Job started
      this._cgpvapi.event.emit({ event: CZS_EVENT_NAMES.ENGINE_EXTRACT_STARTED, handlerName: this._mapID, ...res });

      // Return result
      return res;
    } catch (err) {
      // Handle error
      this.onErrorExtracting(err);
    }
    return Promise.resolve();
  };

  zoomToCollection = async (collection: PyGeoAPICollectionsCollectionResponsePayload): Promise<void> => {
    // Get the wkt for the collection
    const coll: PyGeoAPICollectionsCollectionResponsePayload = await CZSServices.getCollectionWKTAsync(collection);

    // Convert wkt to geometry
    const geom = this._cgpvapi.geoUtilities.wktToGeometry(coll.wkt);

    // Reproject in current map projection
    geom.transform(`EPSG:${CZSEngine.COLLECTION_FOOTPRINT_CRS}`, this._cgpvapi.projection.projections[this._map.currentProjection]);

    // Get extent
    const ext = geom.getExtent();

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
  };

  higherAsync = async (collType: string, collectionId: string): Promise<boolean> => {
    // Depending on the kind of layer
    if (collType === 'feature') {
      // Get the geometry group vector layer
      const vLayer = this._map.layer.geometry?.getGeometryGroup(collectionId).vectorLayer;
      let zindex = vLayer.getZIndex();
      zindex++;
      vLayer.setZIndex(zindex);
      return true;
    }

    // Raster type, those are added like a regular layer
    const lyr = await getLayerAsync(this._map.layer, collectionId);
    let zindex = lyr.gvLayers!.getZIndex();
    zindex++;
    lyr.gvLayers!.setZIndex(zindex);
    return true;
  };

  lowerAsync = async (collType: string, collectionId: string): Promise<boolean> => {
    // Depending on the kind of layer
    if (collType === 'feature') {
      // Get the geometry group vector layer
      const vLayer = this._map.layer.geometry?.getGeometryGroup(collectionId).vectorLayer;
      let zindex = vLayer.getZIndex();
      zindex--;
      vLayer.setZIndex(zindex);
      return true;
    }

    // Raster type, those are added like a regular layer
    const lyr = await getLayerAsync(this._map.layer, collectionId);
    let zindex = lyr.gvLayers!.getZIndex();
    zindex--;
    lyr.gvLayers!.setZIndex(zindex);
    return true;
  };

  findCollectionFromID = (collectionId: string): PyGeoAPICollectionsCollectionResponsePayload | null => {
    // Find the collection information in our data
    let colls: PyGeoAPICollectionsCollectionResponsePayload[] = [];

    // For each collection
    colls = colls.concat(
      this._collections.filter((coll: PyGeoAPICollectionsCollectionResponsePayload) => {
        return coll.id === collectionId;
      }),
    );

    // If found
    if (colls.length > 0) return colls[0];
    return null;
  };

  adjustExtentOnLayerID = (layer: SomeOLType, geom?: SomeOLType): void => {
    let ext;
    if (geom) ext = geom.getExtent();
    layer.olLayers.setExtent(ext);
    layer.olLayers.setVisible(false);
    layer.olLayers.setVisible(true);
  };

  loadCollectionsAsync = async (geom?: unknown): Promise<boolean> => {
    // Synchronizing stuff
    this.__watcherLoadCollectionsCounter++;
    const check = this.__watcherLoadCollectionsCounter;
    const release = await this.__watcherLoadCollectionsMutex.acquire();
    try {
      // If on the right task
      if (check === this.__watcherLoadCollectionsCounter) {
        try {
          // Store the geometry
          this._geometry = geom;

          // On load
          this.onLoadCollectionsStarted(this._geometry);

          // Get the collections
          const colls: PyGeoAPICollectionsCollectionResponsePayload[] = await CZSServices.getCollectionsPOSTAsync(
            `${this._lang}-CA`,
            this._cgpvapi.geoUtilities.geometryToWKT(this._geometry),
            this._map.currentProjection,
          );

          // Group the collections by types, then by themes, then by parents
          this._collections = [];
          const collectionFeatures: ThemeCollections[] = [];
          const collectionCoverages: ThemeCollections[] = [];
          colls.forEach((collection: PyGeoAPICollectionsCollectionResponsePayload) => {
            // Depending on the type
            let themeColls: ThemeCollections[] | undefined;
            if (collection.itemType === 'feature') {
              themeColls = collectionFeatures;
            } else if (collection.itemType === 'coverage') {
              themeColls = collectionCoverages;
            }

            // If found
            if (themeColls) {
              // Find the theme
              let thmColl = themeColls?.find((thmCol: ThemeCollections) => {
                return thmCol.theme.id === collection.theme;
              });

              // If not found
              if (!thmColl) {
                thmColl = new ThemeCollections(
                  {
                    id: collection.theme,
                    title: collection.theme,
                  },
                  [],
                );
                themeColls.push(thmColl);
              }

              // Find the parent
              let parentColl = thmColl.parents?.find((parCol: ParentCollections) => {
                return parCol.parent.id === collection.parent;
              });

              // If not found
              if (!parentColl) {
                parentColl = new ParentCollections(
                  thmColl.theme,
                  {
                    id: collection.parent,
                    title: collection.parent_title,
                  },
                  [],
                );
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
            t.parents.forEach((p: ParentCollections) => {
              p.collections.sort(
                (c1: PyGeoAPICollectionsCollectionResponsePayload, c2: PyGeoAPICollectionsCollectionResponsePayload): number => {
                  return CZSUtils.sortAlphabetically(c1.title, c2.title);
                },
              );
            });
          });

          // Reorder each collection within each theme
          collectionCoverages.forEach((t: ThemeCollections) => {
            t.parents.sort((p1: ParentCollections, p2: ParentCollections): number => {
              return CZSUtils.sortAlphabetically(p1.parent.title, p2.parent.title);
            });

            // Reorder the collections by alphabetical order
            t.parents.forEach((p: ParentCollections) => {
              p.collections.sort(
                (c1: PyGeoAPICollectionsCollectionResponsePayload, c2: PyGeoAPICollectionsCollectionResponsePayload): number => {
                  return CZSUtils.sortAlphabetically(c1.title, c2.title);
                },
              );
            });
          });

          // On loaded features
          this.onLoadCollectionsFeatures(collectionFeatures);
          this.onLoadCollectionsCoverages(collectionCoverages);

          // Display features on map
          await this.updateLayersOnMapAsync(geom);
        } finally {
          // End gracefully
          this.onLoadCollectionsEnded();
        }

        // Loaded
        return true;
      }

      // Skipped
      return false;
    } catch (err) {
      // Handle error
      this.onError(err);
      return false;
    } finally {
      // Release the Mutex
      release();
    }
  };

  updateLayersOnMapAsync = async (geom?: unknown): Promise<boolean> => {
    try {
      // Emit
      this.onUpdateLayersStarted();

      // For each checked collections
      const promises: Promise<boolean>[] = [];
      this._checkedCollections.forEach((collId: string) => {
        // Find the collection information for that collection id
        const collInfo = this.findCollectionFromID(collId);

        // If found
        if (collInfo) {
          // Add collection layer
          const p = this.addCollectionAsync(collInfo, geom);
          promises.push(p);
        } else {
          // We have remaining checked collections which aren't listed anymore.
          // eslint-disable-next-line no-lonely-if
          if (this._viewedCollections[collId]) {
            this.removeCollection(collId);
          }
        }
      });

      // Wait for all promises to finish
      await Promise.all(promises);

      // Done
      return true;
    } finally {
      // Done
      this.onUpdateLayersEnded(this._viewedCollections);
    }
  };

  getAreaInKm2 = (geom: unknown): number => {
    return this._cgpvapi.geoUtilities.getArea(geom, { projection: this._map.getView().getProjection().getCode() }) / 1000000;
  };

  addCollectionAsync = async (collInfo: PyGeoAPICollectionsCollectionResponsePayload, geom?: unknown): Promise<boolean> => {
    // console.log("addCollectionAsync : " + coll_info.id)

    // Check if extraction area is big enough
    if (geom && this.getAreaInKm2(geom) <= collInfo.max_extract_area) {
      // Depending on the collection type
      if (collInfo.itemType === 'feature') {
        // Flush the geometry group
        this.removeCollection(collInfo.id);

        // Add vector collection and wait for its addition to complete
        await this.addCollectionVectorAsync(collInfo, geom);
      } else {
        // Add raster collection
        await this.addCollectionRasterAsync(collInfo, geom);
      }
    } else {
      // Flush the geometry group
      this.removeCollection(collInfo.id);

      // Add fingerprint
      this.addFingerprintCollectionAsync(collInfo);

      // If there was a geometry
      if (geom) {
        // Emit
        this._cgpvapi.event.emit({
          event: CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_FOOTPRINT,
          handlerName: this._mapID,
          collection: collInfo,
        });
      }
    }
    return true;
  };

  addCollectionVectorAsync = async (collInfo: PyGeoAPICollectionsCollectionResponsePayload, geom?: unknown): Promise<boolean> => {
    // Query
    const collRes: PyGeoAPIRecordsResponsePayload = await CZSServices.getFeaturesAsync(
      collInfo,
      this._cgpvapi.geoUtilities.geometryToWKT(geom),
      this._map.currentProjection,
    );

    // console.log("Records", coll_res);
    if (collRes.data.features && collRes.data.features.length > 0) {
      // Create geometry group which will handle the records results
      const geomGrpRes = this._map.layer.geometry?.createGeometryGroup(collInfo.id);

      // Set the zindex
      geomGrpRes.vectorLayer.setZIndex(CZSEngine.Z_INDEX_VECTORS);

      // Set the active geometry group
      this._map.layer.geometry?.setActiveGeometryGroup(collInfo.id);

      // Keep track
      this._viewedCollections[collInfo.id] = {
        type: 'feature',
        info: geomGrpRes,
      };

      // Load the features in the group
      this.loadFeaturesInGroup(collRes.data.features, parseInt(collInfo.crs[0], 10), 'blue', 'green');

      // Emit
      this._cgpvapi.event.emit({
        event: CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_FEATURES,
        handlerName: this._mapID,
        collection: collInfo,
      });
    }

    // Done
    return true;
  };

  addCollectionRasterAsync = async (collInfo: PyGeoAPICollectionsCollectionResponsePayload, geom?: unknown): Promise<boolean> => {
    // If already visible
    if (this._viewedCollections[collInfo.id] && this._viewedCollections[collInfo.id].type === 'raster') {
      // Get the layer as soon as it's in the api
      const lyr = await getLayerAsync(this._map.layer, collInfo.id);

      // Set the visible extent for the layer
      this.adjustExtentOnLayerID(lyr, geom);
    } else {
      // Flush the collection, in case it's been set as a footprint
      this.removeCollection(collInfo.id);

      // Prep the config
      const layerConfig = {
        geoviewLayerType: 'ogcWms',
        geoviewLayerId: collInfo.id,
        geoviewLayerName: { en: collInfo.title, fr: collInfo.title },
        metadataAccessPath: {
          en: `${CZSUtils.getQGISServiceHost() + collInfo.org_schema}/${collInfo.parent}`,
          fr: `${CZSUtils.getQGISServiceHost() + collInfo.org_schema}/${collInfo.parent}`,
        },
        listOfLayerEntryConfig: [
          {
            layerId: collInfo.short_name,
            layerName: { en: collInfo.title, fr: collInfo.title },
            source: {
              dataProjection: 'EPSG:4326', // Default.. will be set later
            },
          },
        ],
      };

      // If crs is defined
      if (collInfo.crs && collInfo.crs.length > 0 && Number.isInteger(collInfo.crs[0]))
        layerConfig.listOfLayerEntryConfig[0].source.dataProjection = `EPSG:${collInfo.crs[0]}`;

      if (CZSUtils.isLocal()) {
        layerConfig.metadataAccessPath = {
          en: 'https://maps.geogratis.gc.ca/wms/hydro_network_en',
          fr: 'https://maps.geogratis.gc.ca/wms/hydro_network_en',
        };
        layerConfig.listOfLayerEntryConfig[0].layerId = 'hydro_network';
        layerConfig.listOfLayerEntryConfig[0].layerName = { en: 'hydro_network', fr: 'hydro_network' };
        // if (coll_info.id == "cdem_mpi__cdem") {
        //     layerConfig['metadataAccessPath'] = { 'en': 'https://maps.geogratis.gc.ca/wms/railway_en', 'fr': 'https://maps.geogratis.gc.ca/wms/railway_fr' };
        //     layerConfig['listOfLayerEntryConfig'][0]['layerId'] = 'railway';
        //     layerConfig['listOfLayerEntryConfig'][0]['layerName'] = { 'en': 'Railways', 'fr': 'Chemins de fer' };
        // }
      }

      // Add the layer
      this._map.layer.addGeoviewLayer(layerConfig);

      // Keep track
      this._viewedCollections[collInfo.id] = {
        type: 'raster',
        info: layerConfig,
      };

      // Get the layer as soon as it's in the api AND loaded on the map
      const lyr = await getLayerAsync(this._map.layer, collInfo.id);

      // Set the visible extent for the layer
      this.adjustExtentOnLayerID(lyr, geom);

      // Adjust its z-index
      lyr.olLayers.setZIndex(CZSEngine.Z_INDEX_RASTERS);

      // Emit
      this._cgpvapi.event.emit({
        event: CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_COVERAGES,
        handlerName: this._mapID,
        collection: collInfo,
      });
    }

    // Done
    return true;
  };

  addFingerprintCollectionAsync = async (collInfo: PyGeoAPICollectionsCollectionResponsePayload): Promise<void> => {
    // Get the wkt for the collection
    const coll: PyGeoAPICollectionsCollectionResponsePayload = await CZSServices.getCollectionWKTAsync(collInfo);

    // Create geometry group which will handle the records results
    const geomGrpRes = this._map.layer.geometry?.createGeometryGroup(collInfo.id);

    // Set the zindex
    geomGrpRes.vectorLayer.setZIndex(CZSEngine.Z_INDEX_VECTORS);

    // Set the active geometry group
    this._map.layer.geometry?.setActiveGeometryGroup(collInfo.id);

    // Load the features in the group
    this.loadFeaturesInGroup([coll.wkt], CZSEngine.COLLECTION_FOOTPRINT_CRS, 'red', 'red');
  };

  removeCollection = (collectionId: string): void => {
    // Delete the collection when it's part of a geometry group
    if (this._map.layer.geometry?.getGeometryGroup(collectionId)) this._map.layer.geometry?.deleteGeometryGroup(collectionId);

    // If the collection is viewable
    // eslint-disable-next-line no-prototype-builtins
    if (this._viewedCollections.hasOwnProperty(collectionId)) {
      const temp = this._viewedCollections[collectionId];
      // If raster type
      if (temp.type === 'raster') {
        this._map.layer.removeGeoviewLayer(temp.info);
      }

      // Done
      delete this._viewedCollections[collectionId];
    }
  };

  loadFeaturesInGroup = (features: SomeOLType[], crs: number, color: string, colorClip: string): void => {
    // For each records in the collection result
    features.forEach((rec: SomeOLType) => {
      // If the feature comes in as a geojson
      let geometry;
      if (rec.geometry) {
        geometry = this._cgpvapi.geoUtilities.geojsonToGeometry(rec.geometry);
      } else {
        geometry = this._cgpvapi.geoUtilities.wktToGeometry(rec);
      }

      // Depending on the geometry type
      if (geometry.getType() === 'LineString') {
        // Add geometry to feature collection
        this._map.layer.geometry?.addPolyline(geometry.getCoordinates(), {
          projection: crs,
          style: { strokeColor: color, strokeOpacity: 0.5, strokeWidth: 1 },
        });
      } else if (geometry.getType() === 'MultiLineString') {
        // For each line
        geometry.getLineStrings().forEach((line: SomeOLType) => {
          // Add geometry to feature collection
          this._map.layer.geometry?.addPolyline(line.getCoordinates(), {
            projection: crs,
            style: { strokeColor: color, strokeOpacity: 1, strokeWidth: 1, fillColor: color, fillOpacity: 0.05 },
          });
        });
      } else if (geometry.getType() === 'Point') {
        // Add geometry to feature collection
        this._map.layer.geometry?.addMarkerIcon(geometry.getCoordinates(), {
          projection: crs,
          style: {
            anchor: [0.5, 256],
            size: [256, 256],
            scale: 0.1,
            anchorXUnits: 'fraction',
            anchorYUnits: 'pixels',
            src: ImageMarkerGreen,
          },
        });
      } else if (geometry.getType() === 'MultiPoint') {
        // For each point
        geometry.getPoints().forEach((point: SomeOLType) => {
          // Add geometry to feature collection
          this._map.layer.geometry?.addMarkerIcon(point.getCoordinates(), {
            projection: crs,
            style: {
              anchor: [0.5, 256],
              size: [256, 256],
              scale: 0.1,
              anchorXUnits: 'fraction',
              anchorYUnits: 'pixels',
              src: ImageMarkerGreen,
            },
          });
        });
      } else if (geometry.getType() === 'Polygon') {
        // Add geometry to feature collection
        this._map.layer.geometry?.addPolygon(geometry.getCoordinates(), {
          projection: crs,
          style: { strokeColor: color, strokeOpacity: 1, strokeWidth: 1, fillColor: color, fillOpacity: 0.05 },
        });
      } else if (geometry.getType() === 'MultiPolygon') {
        // For each polygon
        geometry.getPolygons().forEach((poly: SomeOLType) => {
          // Add geometry to feature collection
          this._map.layer.geometry?.addPolygon(poly.getCoordinates(), {
            projection: crs,
            style: { strokeColor: color, strokeOpacity: 1, strokeWidth: 1, fillColor: color, fillOpacity: 0.05 },
          });
        });
      } else {
        // Error
        console.log('Unknown geometry type', geometry.getType());
      }

      // If was clipped too
      if (rec.geometry_clipped) {
        if (rec.geometry_clipped.type === 'LineString') {
          // If not multi line
          if (!(Array.isArray(rec.geometry_clipped.coordinates[0]) && Array.isArray(rec.geometry_clipped.coordinates[0][0]))) {
            // Make it a multi line for simplicity
            // eslint-disable-next-line no-param-reassign
            rec.geometry_clipped.coordinates = [rec.geometry_clipped.coordinates];
          }

          // For each line segment
          rec.geometry_clipped.coordinates.forEach((coords: number[]) => {
            this._map.layer.geometry?.addPolyline(coords, { projection: crs, style: { strokeColor: colorClip, strokeWidth: 1.5 } });
          });
        } else if (rec.geometry_clipped.type === 'MultiLineString') {
          // For each line
          rec.geometry_clipped.coordinates.forEach((coords: number[][]) => {
            this._map.layer.geometry?.addPolyline(coords, {
              projection: crs,
              style: { strokeColor: colorClip, strokeWidth: 1.5, fillColor: colorClip, fillOpacity: 0.3 },
            });
          });
        } else if (rec.geometry_clipped.type === 'Polygon') {
          this._map.layer.geometry?.addPolygon(rec.geometry_clipped.coordinates, {
            projection: crs,
            style: { strokeColor: colorClip, strokeWidth: 1.5, fillColor: colorClip, fillOpacity: 0.3 },
          });
        } else if (rec.geometry_clipped.type === 'MultiPolygon') {
          // For each polygon
          rec.geometry_clipped.coordinates.forEach((coords: number[][]) => {
            this._map.layer.geometry?.addPolygon(coords, {
              projection: crs,
              style: { strokeColor: colorClip, strokeWidth: 1.5, fillColor: colorClip, fillOpacity: 0.3 },
            });
          });
        } else if (rec.geometry_clipped.type === 'Point' || rec.geometry_clipped.type === 'MultiPoint') {
          // No worries, skip
        } else {
          // Error
          console.log('Ignored geometry clipped type', rec.geometry_clipped.type);
        }
      }
    });
  };
}
