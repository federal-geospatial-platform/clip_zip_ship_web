import { PyGeoAPICollectionsCollectionLinkResponsePayload } from './czs-types';

export default class CZSUtils {
  static isLocal = (): boolean => {
    return window.location.hostname === 'localhost';
  };

  static getPygeoapiHost = (): string => {
    if (CZSUtils.isLocal()) return 'http://localhost:5000';
    return PYGEOAPI_URL_ROOT;
  };

  static getQGISServiceHost = (): string => {
    return QGIS_SERVICE_URL_ROOT;
  };

  static getContentMetadata = (
    links: PyGeoAPICollectionsCollectionLinkResponsePayload[],
  ): PyGeoAPICollectionsCollectionLinkResponsePayload | null => {
    // Find the canonical metadata url if any
    let link: PyGeoAPICollectionsCollectionLinkResponsePayload | null = null;
    links.forEach((l: PyGeoAPICollectionsCollectionLinkResponsePayload) => {
      if (l.type === 'text/html' && l.rel === 'canonical') link = l;
    });
    return link;
  };

  static sortAlphabetically = (string1: string, string2: string): number => {
    if (string1 < string2) return -1;
    if (string1 > string2) return 1;
    return 0;
  };

  static delay = (time: number): Promise<void> => {
    return new Promise((res) => {
      setTimeout(res, time);
    });
  };
}
