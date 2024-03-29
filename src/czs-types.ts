// Because we don't have access to the OpenLayer types from the Plugin, I'm using a dummy type to indicaite them all. Could be usefull later, instead of 'any' everywhere.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SomeOLType = any;
// Because we don't have access to the OpenLayer types from the Plugin, I'm using a dummy type to indicaite them all. Could be usefull later, instead of 'any' everywhere.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SomePayloadBaseClass = any;

export type ThemeItem = {
  id: string;
  title: string;
};

export type ParentItem = {
  id: string;
  title: string;
};

export type PyGeoAPICollectionsResponsePayload = {
  collections: PyGeoAPICollectionsCollectionResponsePayload[];
};

export type PyGeoAPICollectionsCollectionResponsePayload = {
  id: string;
  itemType: string;
  title: string;
  theme: string;
  description: string;
  links: PyGeoAPICollectionsCollectionLinkResponsePayload[];
  parent: string;
  parent_title: string;
  short_name: string;
  org_schema: string;
  crs: string[];
  max_extract_area: number;

  wkt: string; // Only available when only 1 collection description has been queried
};

export type PyGeoAPICollectionsCollectionLinkResponsePayload = {
  type: string;
  rel: string;
  title: string;
  href: string;
};

export type PyGeoAPIRecordsResponsePayload = {
  collection: PyGeoAPICollectionsCollectionResponsePayload;
  data: PyGeoAPIRecordsDataResponsePayload;
};

export type PyGeoAPIRecordsDataResponsePayload = {
  features: object[];
  links: object[];
  numberMatched: number;
  numberReturned: number;
  type: string;
};

export type PyGeoAPIJobIDQueryPayload = {
  inputs: PyGeoAPIJobIDQueryInputPayload;
};

export type PyGeoAPIJobIDQueryInputPayload = {
  geom: string;
  geom_crs: number;
  collections: string[];
  email: string;
  out_crs?: number;
};

export type PyGeoAPIJobIDResponsePayload = {
  job_id: string;
};

export type PyGeoAPIJobStatusResponsePayload = {
  processID: string;
  jobID: string;
  status: string;
  message: string;
  progress: number;
  parameters: unknown;
  job_start_datetime: string;
  job_end_datetime: string;
};

export type PyGeoAPIJobResultResponsePayload = {
  extract_url: string;
};

/** Valid keys for the CLIP ZIP SHIP category */
export type CZSEngineEventKey =
  | 'ENGINE_LOAD_COLLECTIONS_STARTED'
  | 'ENGINE_LOAD_COLLECTIONS_ENDED'
  | 'ENGINE_LOAD_COLLECTIONS_FEATURES'
  | 'ENGINE_LOAD_COLLECTIONS_COVERAGES'
  | 'ENGINE_UPDATE_VIEWED_COLLECTIONS_STARTED'
  | 'ENGINE_UPDATE_VIEWED_COLLECTIONS_FEATURES'
  | 'ENGINE_UPDATE_VIEWED_COLLECTIONS_COVERAGES'
  | 'ENGINE_UPDATE_VIEWED_COLLECTIONS_FOOTPRINT'
  | 'ENGINE_UPDATE_VIEWED_COLLECTIONS_FOOTPRINT_NO_GEOM'
  | 'ENGINE_UPDATE_VIEWED_COLLECTIONS_ENDED'
  | 'ENGINE_COLLECTION_CHANGED_STARTED'
  | 'ENGINE_COLLECTION_CHANGED_ENDED'
  | 'ENGINE_EXTRACT_STARTED'
  | 'ENGINE_LAYER_ORDERED'
  | 'ENGINE_ERROR'
  | 'ENGINE_ERROR_ZOOMING_OUTSIDE'
  | 'ENGINE_ERROR_SHOWING_COLLECTION'
  | 'ENGINE_ERROR_EXTRACTING';

/**
 * Event names
 */
export type CZSEngineEventStringId =
  | 'czs/engine/ENGINE-LOAD_COLLECTIONS_STARTED'
  | 'czs/engine/ENGINE-LOAD_COLLECTIONS_ENDED'
  | 'czs/engine/ENGINE-LOAD_COLLECTIONS_FEATURES'
  | 'czs/engine/ENGINE-LOAD_COLLECTIONS_COVERAGES'
  | 'czs/engine/ENGINE-UPDATE_VIEWED_COLLECTIONS_STARTED'
  | 'czs/engine/ENGINE-UPDATE_VIEWED_COLLECTIONS_FEATURES'
  | 'czs/engine/ENGINE-UPDATE_VIEWED_COLLECTIONS_COVERAGES'
  | 'czs/engine/ENGINE-UPDATE_VIEWED_COLLECTIONS_FOOTPRINT'
  | 'czs/engine/ENGINE-UPDATE_VIEWED_COLLECTIONS_FOOTPRINT_NO_GEOM'
  | 'czs/engine/ENGINE-UPDATE_VIEWED_COLLECTIONS_ENDED'
  | 'czs/engine/ENGINE-COLLECTION_CHANGED_STARTED'
  | 'czs/engine/ENGINE-COLLECTION_CHANGED_ENDED'
  | 'czs/engine/ENGINE-EXTRACT_STARTED'
  | 'czs/engine/ENGINE-LAYER_ORDERED'
  | 'czs/engine/ENGINE-ERROR'
  | 'czs/engine/ENGINE_ERROR_ZOOMING_OUTSIDE'
  | 'czs/engine/ENGINE-ERROR_SHOWING_COLLECTION'
  | 'czs/engine/ENGINE-ERROR_EXTRACTING';

export const CZS_EVENT_NAMES: Record<CZSEngineEventKey, CZSEngineEventStringId> = {
  /**
   * Event is triggered when the engine has started fetching the collections
   */
  ENGINE_LOAD_COLLECTIONS_STARTED: 'czs/engine/ENGINE-LOAD_COLLECTIONS_STARTED',

  /**
   * Event is triggered when the engine has completed fetching the collections
   */
  ENGINE_LOAD_COLLECTIONS_ENDED: 'czs/engine/ENGINE-LOAD_COLLECTIONS_ENDED',

  /**
   * Event is triggered when the engine has completed fetching the collections and formatting the results to a list of feature collections
   */
  ENGINE_LOAD_COLLECTIONS_FEATURES: 'czs/engine/ENGINE-LOAD_COLLECTIONS_FEATURES',

  /**
   * Event is triggered when the engine has completed fetching the collections and formatting the results to a list of coverage collections
   */
  ENGINE_LOAD_COLLECTIONS_COVERAGES: 'czs/engine/ENGINE-LOAD_COLLECTIONS_COVERAGES',

  /**
   * Event is triggered when the engine has started updating the list of viewed collections based on the currently checked collections and a given geometry
   */
  ENGINE_UPDATE_VIEWED_COLLECTIONS_STARTED: 'czs/engine/ENGINE-UPDATE_VIEWED_COLLECTIONS_STARTED',

  /**
   * Event is triggered when the engine has loaded a features collection on map
   */
  ENGINE_UPDATE_VIEWED_COLLECTIONS_FEATURES: 'czs/engine/ENGINE-UPDATE_VIEWED_COLLECTIONS_FEATURES',

  /**
   * Event is triggered when the engine has loaded a features collection on map
   */
  ENGINE_UPDATE_VIEWED_COLLECTIONS_COVERAGES: 'czs/engine/ENGINE-UPDATE_VIEWED_COLLECTIONS_COVERAGES',

  /**
   * Event is triggered when the engine has loaded a features collection on map
   */
  ENGINE_UPDATE_VIEWED_COLLECTIONS_FOOTPRINT: 'czs/engine/ENGINE-UPDATE_VIEWED_COLLECTIONS_FOOTPRINT',

  /**
   * Event is triggered when the engine has tried loading a collection on map, but there was no geometry
   */
  ENGINE_UPDATE_VIEWED_COLLECTIONS_FOOTPRINT_NO_GEOM: 'czs/engine/ENGINE-UPDATE_VIEWED_COLLECTIONS_FOOTPRINT_NO_GEOM',

  /**
   * Event is triggered when the engine has finished updating the list of viewed collections based on the currently checked collections and a given geometry
   */
  ENGINE_UPDATE_VIEWED_COLLECTIONS_ENDED: 'czs/engine/ENGINE-UPDATE_VIEWED_COLLECTIONS_ENDED',

  /**
   * Event is triggered when the engine has started updating the checked collections
   */
  ENGINE_COLLECTION_CHANGED_STARTED: 'czs/engine/ENGINE-COLLECTION_CHANGED_STARTED',

  /**
   * Event is triggered when the engine has finished updating the checked collections
   */
  ENGINE_COLLECTION_CHANGED_ENDED: 'czs/engine/ENGINE-COLLECTION_CHANGED_ENDED',

  /**
   * Event is triggered when the engine has started extracting data for the viewed (not the checked) collections
   */
  ENGINE_EXTRACT_STARTED: 'czs/engine/ENGINE-EXTRACT_STARTED',

  /**
   * Event is triggered when the engine has finished extracting data for the viewed (not the checked) collections
   */
  //  ENGINE_EXTRACT_ENDED: 'czs/engine/ENGINE-EXTRACT_ENDED',

  /**
   * Event is triggered when the engine has completed extracting data for the viewed (not the checked) collections
   */
  //  ENGINE_EXTRACT_COMPLETED: 'czs/engine/ENGINE-EXTRACT_COMPLETED',

  /**
   * Event is triggered when the engine is re-ordering the layers
   */
  ENGINE_LAYER_ORDERED: 'czs/engine/ENGINE-LAYER_ORDERED',

  /**
   * Event is triggered when the engine has generated an error
   */
  ENGINE_ERROR: 'czs/engine/ENGINE-ERROR',

  /**
   * Event is triggered when the engine has tried to zoom outside the map extent limits
   */
  ENGINE_ERROR_ZOOMING_OUTSIDE: 'czs/engine/ENGINE_ERROR_ZOOMING_OUTSIDE',

  /**
   * Event is triggered when the engine has generated an error when trying to show a collection
   */
  ENGINE_ERROR_SHOWING_COLLECTION: 'czs/engine/ENGINE-ERROR_SHOWING_COLLECTION',

  /**
   * Event is triggered when the engine has generated an error when extracting
   */
  ENGINE_ERROR_EXTRACTING: 'czs/engine/ENGINE-ERROR_EXTRACTING',
};
