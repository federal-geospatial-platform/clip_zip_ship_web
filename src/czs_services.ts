/* eslint-disable no-console */
import {
  PyGeoAPICollectionsCollectionResponsePayload,
  PyGeoAPIRecordsResponsePayload,
  PyGeoAPIRecordsDataResponsePayload,
  PyGeoAPIJobIDQueryPayload,
  PyGeoAPIJobIDResponsePayload,
  PyGeoAPIJobStatusResponsePayload,
  PyGeoAPIJobResultResponsePayload,
} from './czs-types';
import CZSUtils from './czs-utils';

export default class CZSServices {
  static getCollectionsPOSTAsync = async (
    lang: string,
    geomWkt: string,
    crs: number,
  ): Promise<PyGeoAPICollectionsCollectionResponsePayload[]> => {
    try {
      // Fetch
      const response = await fetch(`${CZSUtils.getPygeoapiHost()}/collections?f=json&lang=${lang}`, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          geom: geomWkt,
          'geom-crs': crs,
        }),
      });

      // Only process valid response
      if (response.status === 200) {
        return (await response.json()).collections;
      }

      console.log(`Invalid status: ${response.status}`);
      throw Error("The server couldn't provide the collections list.");
    } catch (err) {
      console.error(err);
      throw Error('Failed to communicate with the server to retrieve the collections.');
    }
  };

  static extractFeaturesAsync = async (
    collections: string[],
    email: string,
    geomWkt: string,
    crs: number,
    outCrs?: number,
  ): Promise<PyGeoAPIJobIDResponsePayload> => {
    try {
      const inputs: PyGeoAPIJobIDQueryPayload = {
        inputs: {
          geom: geomWkt,
          geom_crs: crs,
          collections,
          email,
        },
      };
      if (outCrs) inputs.inputs.out_crs = outCrs;

      const response = await fetch(`${CZSUtils.getPygeoapiHost()}/processes/extract/execution`, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(inputs),
      });

      // Only process valid response
      if (response.status === 200 || response.status === 201) {
        return await response.json();
      }

      // Depending on the status
      if (response.status === 412) {
        throw Error('Please draw an extraction area.');
      } else if (response.status === 413) {
        throw Error('Your extraction area is too big.');
      } else {
        console.log(`Invalid status: ${response.status}`);
        throw Error("The server couldn't extract the data.");
      }
    } catch (err) {
      console.error(err);
      throw Error('Failed to communicate with the server to extract the data.');
    }
  };

  static getJobStatusAsync = async (jobId: string): Promise<PyGeoAPIJobStatusResponsePayload> => {
    const url = `${CZSUtils.getPygeoapiHost()}/jobs/{jobId}?j=json`.replace('{jobId}', jobId);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'GET',
      });

      // Only process valid response
      if (response.status === 200) {
        return await response.json();
      }

      console.log(`Invalid status: ${response.status}`);
      throw Error("The server couldn't get the job status.");
    } catch (err) {
      console.error(err);
      throw Error('Failed to communicate with the server to check the job status.');
    }
  };

  static getJobResultAsync = async (jobId: string): Promise<PyGeoAPIJobResultResponsePayload> => {
    const url = `${CZSUtils.getPygeoapiHost()}/jobs/{jobId}/results?j=json`.replace('{jobId}', jobId);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'GET',
      });

      // Only process valid response
      if (response.status === 200) {
        return await response.json();
      }

      console.log(`Invalid status: ${response.status}`);
      throw Error("The server couldn't get the job results.");
    } catch (err) {
      console.error(err);
      throw Error('Failed to communicate with the server to check the job results.');
    }
  };

  static getFeaturesAsync = async (
    collection: PyGeoAPICollectionsCollectionResponsePayload,
    geomWkt: string,
    crs: number,
  ): Promise<PyGeoAPIRecordsResponsePayload> => {
    let url = `${CZSUtils.getPygeoapiHost()}/collections/{collectionId}/items?f=json`.replace('{collectionId}', collection.id);
    if (geomWkt) url += `&geom=${geomWkt}&geom-crs=${crs}&clip=2`;
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'GET',
      });

      // Only process valid response
      if (response.status === 200) {
        const respJson: PyGeoAPIRecordsDataResponsePayload = await response.json();
        return {
          collection,
          data: respJson,
        };
      }

      // If too large (413)
      // eslint-disable-next-line no-lonely-if
      if (response.status === 412) {
        throw Error('Please draw an extraction area.');
      } else if (response.status === 413) {
        throw Error('Your extraction area is too big.');
      } else {
        console.log(`Invalid status: ${response.status}`);
        throw Error("The server couldn't extract the data.");
      }
    } catch (err) {
      console.log(err);
      throw Error(`Failed to communicate with the server to fetch features for collection: ${collection.title}`);
    }
  };

  static getCollectionWKTAsync = async (
    collection: PyGeoAPICollectionsCollectionResponsePayload,
  ): Promise<PyGeoAPICollectionsCollectionResponsePayload> => {
    const url = `${CZSUtils.getPygeoapiHost()}/collections/{collectionId}?f=json`.replace('{collectionId}', collection.id);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'GET',
      });

      // Only process valid response
      if (response.status === 200) {
        return await response.json();
      }

      console.log(`Invalid request for wkt: ${response.status}`);
      throw Error("The server couldn't find the WKT for the collection.");
    } catch (err) {
      console.log(err);
      throw Error(`Failed to communicate with the server to get WKT for the collection: ${collection.title}`);
    }
  };
}
