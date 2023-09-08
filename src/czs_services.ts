import {
    PyGeoAPICollectionsResponsePayload,
    PyGeoAPICollectionsCollectionResponsePayload,
    PyGeoAPIRecordsResponsePayload,
    PyGeoAPIRecordsDataResponsePayload,
    PyGeoAPIJobIDQueryPayload,
    PyGeoAPIJobIDResponsePayload,
    PyGeoAPIJobStatusResponsePayload,
    PyGeoAPIJobResultResponsePayload
} from './czs_types';
import CZSUtils from './czs_utils';

export default class CZSServices {

    static getCollectionsPOSTAsync = async (lang: string, geom_wkt: string, crs: number): Promise<PyGeoAPICollectionsCollectionResponsePayload[]> => {
        let promise = new Promise<PyGeoAPICollectionsCollectionResponsePayload[]>((resolve, reject) => {
            fetch(CZSUtils.getPygeoapiHost() + "/collections?f=json&lang=" + lang, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: "POST",
                body: JSON.stringify({
                    "geom": geom_wkt,
                    "geom-crs": crs
                })
            }).then((response) => {
                // Only process valid response
                if (response.status === 200) {
                    response.json().then((data: PyGeoAPICollectionsResponsePayload) => {
                        // Resolve
                        resolve(data.collections);
                    }).catch((err) => {
                        console.log(err);
                        reject("Invalid response returned by the server.");
                    });
                }

                else {
                    console.log("Invalid status: " + response.status);
                    reject("The server couldn't provide the collections list.");
                }
            }).catch((error) => {
                console.log(error);
                reject("Failed to communicate with the server to retrieve the collections.");
            });
        });

        // Return the promise
        return promise;
    };

    static extractFeaturesAsync = async (collections: string[], email: string, geom_wkt: any, crs: number, out_crs?: number): Promise<PyGeoAPIJobIDResponsePayload> => {
        let promise = new Promise<PyGeoAPIJobIDResponsePayload>((resolve, reject) => {
            let inputs : PyGeoAPIJobIDQueryPayload = {
                'inputs': {
                    'geom': geom_wkt,
                    'geom_crs': crs,
                    'collections': collections,
                    'email': email
                }
            };
            if (out_crs)
                inputs['inputs']['out_crs'] = out_crs;

            fetch(CZSUtils.getPygeoapiHost() + "/processes/extract/execution", {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: "POST",
                body: JSON.stringify(inputs)
            }).then((response) => {
                // Only process valid response
                if (response.status === 200 || response.status === 201) {
                    response.json().then((data: any) => {
                        // Resolve
                        resolve(data);
                    }).catch((err) => {
                        console.log(err);
                        reject("Invalid response returned by the server.");
                    });
                }

                else {
                    // If too large (413)
                    if (response.status == 412) {
                        reject("Please draw an extraction area.");
                    }

                    else if (response.status == 413) {
                        reject("Your extraction area is too big.");
                    }

                    else {
                        console.log("Invalid status: " + response.status);
                        reject("The server couldn't extract the data.");
                    }
                }
            }).catch((error) => {
                console.log(error);
                reject("Failed to communicate with the server to extract the data.");
            });
        });

        // Return the promise
        return promise;
    };

    static getJobStatusAsync = async (jobId: string): Promise<PyGeoAPIJobStatusResponsePayload> => {
        let url = (CZSUtils.getPygeoapiHost() + "/jobs/{jobId}?j=json").replace("{jobId}", jobId);
        let promise = new Promise<PyGeoAPIJobStatusResponsePayload>((resolve, reject) => {
            fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: "GET"
            }).then((response) => {
                // Only process valid response
                if (response.status === 200) {
                    response.json().then((data: any) => {
                        // Resolve
                        resolve(data);
                    }).catch((err) => {
                        console.log(err);
                        reject("Invalid response returned by the server.");
                    });
                }

                else {
                    console.log("Invalid status: " + response.status);
                    reject("The server couldn't get the job status.");
                }
            }).catch((error) => {
                console.log(error);
                reject("Failed to communicate with the server to check the job status.");
            });
        });

        // Return the promise
        return promise;
    };

    static getJobResultAsync = async (jobId: string): Promise<PyGeoAPIJobResultResponsePayload> => {
        let url = (CZSUtils.getPygeoapiHost() + "/jobs/{jobId}/results?j=json").replace("{jobId}", jobId);
        let promise = new Promise<PyGeoAPIJobResultResponsePayload>((resolve, reject) => {
            fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: "GET"
            }).then((response) => {
                // Only process valid response
                if (response.status === 200) {
                    response.json().then((data: any) => {
                        // Resolve
                        resolve(data);
                    }).catch((err) => {
                        console.log(err);
                        reject("Invalid response returned by the server.");
                    });
                }

                else {
                    console.log("Invalid status: " + response.status);
                    reject("The server couldn't get the job status.");
                }
            }).catch((error) => {
                console.log(error);
                reject("Failed to communicate with the server to check the job status.");
            });
        });

        // Return the promise
        return promise;
    };

    static getFeaturesAsync = async (collection: PyGeoAPICollectionsCollectionResponsePayload, geom_wkt: any, crs: number): Promise<PyGeoAPIRecordsResponsePayload> => {
        let url = (CZSUtils.getPygeoapiHost() + "/collections/{collectionId}/items?f=json").replace("{collectionId}", collection.id);
        if (geom_wkt)
            url += "&geom=" + geom_wkt + "&geom-crs=" + crs + "&clip=2";
        let promise = new Promise<PyGeoAPIRecordsResponsePayload>((resolve, reject) => {
            fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: "GET"
            }).then((response) => {
                // Only process valid response
                if (response.status === 200) {
                    response.json().then((data: PyGeoAPIRecordsDataResponsePayload) => {
                        // Resolve
                        resolve({
                            collection: collection,
                            data: data
                        });
                    }).catch((err) => {
                        console.log(err);
                        reject("Invalid response returned by the server.");
                    });
                }

                else {
                    // If too large (413)
                    if (response.status == 412) {
                        reject("Please draw an extraction area.");
                    }

                    else if (response.status == 413) {
                        reject("Your extraction area is too big.");
                    }

                    else {
                        console.log("Invalid status: " + response.status);
                        reject("The server couldn't extract the data.");
                    }
                }
            }).catch((error) => {
                console.log(error);
                reject("Failed to communicate with the server to fetch features for collection: " + collection.title);
            });
        });

        // Return the promise
        return promise;
    };

    static getCollectionWKTAsync = async (collection: PyGeoAPICollectionsCollectionResponsePayload): Promise<PyGeoAPICollectionsCollectionResponsePayload> => {
        let url = (CZSUtils.getPygeoapiHost() + "/collections/{collectionId}?f=json").replace("{collectionId}", collection.id);
        let promise = new Promise<PyGeoAPICollectionsCollectionResponsePayload>((resolve, reject) => {
            fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: "GET"
            }).then((response) => {
                // Only process valid response
                if (response.status === 200) {
                    response.json().then((data: PyGeoAPICollectionsCollectionResponsePayload) => {
                        // Resolve
                        resolve(data);
                    }).catch((err) => {
                        console.log(err);
                        reject("Invalid response returned by the server.");
                    });
                }

                else {
                    console.log("Invalid request for wkt: " + response.status);
                        reject("The server couldn't find the WKT for the collection.");
                }
            }).catch((error) => {
                console.log(error);
                reject("Failed to communicate with the server to get WKT for the collection: " + collection.title);
            });
        });

        // Return the promise
        return promise;
    };

    // static getCoverageAsync = async (collection: PyGeoAPICollectionsCollectionResponsePayload, geom_wkt: any, crs: number) => {
    //     let url = URL_COVERAGE_EXTRACT.replace("{collectionId}", collection.id);
    //     if (geom_wkt)
    //         url += "&geom=" + geom_wkt + "&geom-crs=" + crs;
    //     let promise = new Promise<PyGeoAPIRecordsResponsePayload>((resolve, reject) => {
    //         fetch(url, {
    //             headers: {
    //                 'Accept': 'application/json',
    //                 'Content-Type': 'application/json'
    //             },
    //             method: "GET"
    //         }).then((response) => {
    //             // Only process valid response
    //             if (response.status === 200) {
    //                 response.json().then((data: PyGeoAPIRecordsDataResponsePayload) => {
    //                     // Resolve
    //                     resolve({
    //                         collection: collection,
    //                         data: data
    //                     });
    //                 });
    //             }

    //             else {
    //                 // If too large (413)
    //                 if (response.status == 413) {
    //                     alert("Your extraction area is too big for collection " + collection.title + ". Please use an extraction area less than 1,000 square kilometers.");
    //                 }

    //                 else {
    //                     alert("failed getCoverage");
    //                 }
    //                 console.log(response, collection);
    //                 reject("failed");
    //             }
    //         }).catch((error) => {
    //             debugger;
    //             alert("failed getCoverage");
    //             console.log(error);
    //             reject(error);
    //         });
    //     });

    //     // Return the promise
    //     return promise;
    // };
}
