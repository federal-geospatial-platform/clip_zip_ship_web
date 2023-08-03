import { PyGeoAPICollectionsCollectionLinkResponsePayload } from "./czs_types";
import config from './czs-config.json';

export default class CZSUtils {

    static isLocal = () => {
        return window.location.hostname === "localhost";
    };

    static getPygeoapiHost = () => {
        if (CZSUtils.isLocal())
            return "http://localhost:5000";
        return config.PYGEOAPI_URL_ROOT;
    };

    static getQGISServiceHost = () => {
        return config.QGIS_SERVICE_URL_ROOT;
    };

    static getContentMetadata = (links: PyGeoAPICollectionsCollectionLinkResponsePayload[]): PyGeoAPICollectionsCollectionLinkResponsePayload | null => {
        // Find the canonical metadata url if any
        let link: PyGeoAPICollectionsCollectionLinkResponsePayload | null = null;
        links.forEach((l: PyGeoAPICollectionsCollectionLinkResponsePayload) => {
            if (l.type == "text/html" && l.rel == "canonical")
                link = l;
        });
        return link;
    };

    static sortAlphabetically = (string1: string, string2: string): number => {
        if (string1 < string2)
            return -1;
        else if (string1 > string2)
            return 1;
        return 0;
    };

    static delay = async (time: number) => {
        return new Promise(res => {
            setTimeout(res, time)
        });
    };

}