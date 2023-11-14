import { ThemeItem } from './czs-types';
import { ParentCollections } from './collParent';

export class ThemeCollections {
  theme: ThemeItem;

  parents: Array<ParentCollections>;

  constructor(theme: ThemeItem, parents: Array<ParentCollections>) {
    this.theme = theme;
    this.parents = parents;
  }
}
