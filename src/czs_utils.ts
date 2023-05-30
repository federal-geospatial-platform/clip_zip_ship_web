import { PyGeoAPICollectionsCollectionLinkResponsePayload } from "./czs_types";

export default class CZSUtils {

    static getContentMetadata = (links: PyGeoAPICollectionsCollectionLinkResponsePayload[]): PyGeoAPICollectionsCollectionLinkResponsePayload | null => {
        // Find the canonical metadata url if any
        let link = null;
        links.forEach((l: PyGeoAPICollectionsCollectionLinkResponsePayload) => {
            if (l.type == "text/html" && l.rel == "canonical")
                link = l;
        });
        return link;
    }

}