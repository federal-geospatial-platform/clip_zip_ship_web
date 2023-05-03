

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
    project: string;
    short_name: string;
    org_schema: string;
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

    static getCollectionsPOSTAsync = async (lang: string, geom_wkt: string, crs: number) => {
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

    static extractFeaturesAsync = async (collections: string[], email: string, geom_wkt: any, crs: number) => {
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
                    // If too large (413)
                    if (response.status == 412) {
                        reject("Please draw an extraction area.");
                    }

                    else if (response.status == 413) {
                        reject("Your extraction area is too big. Please use an extraction area less than 1,000 square kilometers.");
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

    // static getFeaturesAsync = async (collection: PyGeoAPICollectionsCollectionResponsePayload, geom_wkt: any, crs: number) => {
    //     let url = URL_FEATURES_EXTRACT.replace("{collectionId}", collection.id);
    //     if (geom_wkt)
    //         url += "&geom=" + geom_wkt + "&geom-crs=" + crs + "&clip=true";
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
    //                 alert("failed getFeatures");
    //                 console.log(response);
    //                 reject("failed");
    //             }
    //         }).catch((error) => {
    //             alert("failed getFeatures");
    //             console.log(error);
    //             reject(error);
    //         });
    //     });

    //     // Return the promise
    //     return promise;
    // };

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
