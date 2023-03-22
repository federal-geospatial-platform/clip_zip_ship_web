
const URL_PYGEOAPI_ENDPOINT = "http://localhost:5000/collections?f=json";
const URL_FEATURES_EXTRACT = "http://localhost:5000/collections/{collectionId}/items?f=json";
const URL_COVERAGE_EXTRACT = "http://localhost:5000/collections/{collectionId}/coverage?f=json";
const URL_EXTRACT_PROCESS = "http://localhost:5000/processes/extract/execution"


export type PyGeoAPICollectionsResponsePayload = {
    collections: PyGeoAPICollectionsCollectionResponsePayload[]
};

export type PyGeoAPICollectionsCollectionResponsePayload = {
    id: string;
    itemType: string;
    title: string;
    theme: string;
    description: string;
    links: PyGeoAPICollectionsCollectionLinkResponsePayload[];
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

export type PyGeoAPIExtractResponsePayload = {

};

export default class CZSAPI {

    static getCollectionsPOST = (lang: string, geom_wkt: string, crs: number) => {
      let promise = new Promise<PyGeoAPICollectionsCollectionResponsePayload[]>((resolve, reject) => {
        fetch(URL_PYGEOAPI_ENDPOINT + "&lang=" + lang, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify({
                "geom": geom_wkt,
                "geom-crs": crs
            })
        })
        .then((response) => {
          // only process valid response
          if (response.status === 200) {
              response.json().then((data: PyGeoAPICollectionsResponsePayload) => {
                  // Resolve
                  resolve(data.collections);
              });
          }

          else {
              alert("failed getCollections");
              console.log(response);
              reject("failed");
          }
        })
        .catch((error) => {
            alert("bug getCollections");
            console.log(error);
            reject(error);
        });
      });

      // Return the promise
      return promise;
  };

  static getFeatures = (collection: PyGeoAPICollectionsCollectionResponsePayload, geom_wkt: any, crs: number) => {
    let url = URL_FEATURES_EXTRACT.replace("{collectionId}", collection.id);
    if (geom_wkt)
        url += "&geom=" + geom_wkt + "&geom-crs=" + crs + "&clip=true";
    let promise = new Promise<PyGeoAPIRecordsResponsePayload>((resolve, reject) => {
        fetch(url, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            method: "GET"
        })
        .then((response) => {
            // only process valid response
            if (response.status === 200) {
            response.json().then((data: PyGeoAPIRecordsDataResponsePayload) => {
                // Resolve
                resolve({
                    collection: collection,
                    data: data
                });
            });
            }

            else {
                alert("failed getFeatures");
                console.log(response);
                reject("failed");
            }
        })
        .catch((error) => {
            alert("failed getFeatures");
            console.log(error);
            reject(error);
        });
      });

      // Return the promise
      return promise;
  };

  static getCoverage = (collection: PyGeoAPICollectionsCollectionResponsePayload, geom_wkt: any, crs: number) => {
    let url = URL_COVERAGE_EXTRACT.replace("{collectionId}", collection.id);
    if (geom_wkt)
        url += "&geom=" + geom_wkt + "&geom-crs=" + crs;
    let promise = new Promise<PyGeoAPIRecordsResponsePayload>((resolve, reject) => {
        fetch(url, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            method: "GET"
        })
        .then((response) => {
            // only process valid response
            if (response.status === 200) {
            response.json().then((data: PyGeoAPIRecordsDataResponsePayload) => {
                // Resolve
                resolve({
                    collection: collection,
                    data: data
                });
            });
            }

            else {
                alert("failed getCoverage");
                console.log(response);
                reject("failed");
            }
        })
        .catch((error) => {
            alert("failed getCoverage");
            console.log(error);
            reject(error);
        });
      });

      // Return the promise
      return promise;
  };

  static extractFeatures = (collections: string[], email: string, geom_wkt: any, crs: number) => {
    let promise = new Promise((resolve, reject) => {
        fetch(URL_EXTRACT_PROCESS, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify({
                'inputs': {
                    'geom': geom_wkt,
                    'geom_crs': crs,
                    'collections': collections,
                    'email': email
                }
            })
        })
        .then((response) => {
            // only process valid response
            if (response.status === 200) {
            response.json().then((data: any) => {
                // Resolve
                resolve(data);
            });
            }

            else {
                alert("failed extractFeatures");
                console.log(response);
                reject("failed");
            }
        })
        .catch((error) => {
            alert("failed extractFeatures");
            console.log(error);
            reject(error);
        });
      });

      // Return the promise
      return promise;
  };

}
