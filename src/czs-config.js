const PYGEOAPI_URL_ROOT = "http://localhost:5000";
const PYGEOAPI_URL_ENDPOINT = PYGEOAPI_URL_ROOT + "/collections?f=json";
const PYGEOAPI_URL_COLLECTION_ID = PYGEOAPI_URL_ROOT + "/collections/{collectionId}?f=json";
const PYGEOAPI_URL_FEATURES_EXTRACT = PYGEOAPI_URL_ROOT + "/collections/{collectionId}/items?f=json";
//const PYGEOAPI_URL_COVERAGE_EXTRACT = PYGEOAPI_URL_ROOT + "/collections/{collectionId}/coverage?f=json";
const PYGEOAPI_URL_EXTRACT_PROCESS = PYGEOAPI_URL_ROOT + "/processes/extract/execution";
const PYGEOAPI_URL_JOBS = PYGEOAPI_URL_ROOT + "/jobs/{jobId}?j=json";
const PYGEOAPI_URL_JOBS_RESULTS = PYGEOAPI_URL_ROOT + "/jobs/{jobId}/results?j=json";
const QGIS_SERVICE_URL_ROOT = "https://qgis-stage.services.geo.ca/dev/";
