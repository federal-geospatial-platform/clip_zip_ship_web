import { ThemeItem, ParentItem, PyGeoAPICollectionsCollectionResponsePayload } from './czs-types';

export class ParentCollections {
  theme: ThemeItem;

  parent: ParentItem;

  collections: Array<PyGeoAPICollectionsCollectionResponsePayload>;

  constructor(theme: ThemeItem, parent: ParentItem, collections: Array<PyGeoAPICollectionsCollectionResponsePayload>) {
    this.theme = theme;
    this.parent = parent;
    this.collections = collections;
  }
}
