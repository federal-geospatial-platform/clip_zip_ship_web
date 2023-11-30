import {
  CZS_EVENT_NAMES,
  PyGeoAPICollectionsCollectionResponsePayload,
  PyGeoAPICollectionsCollectionLinkResponsePayload,
  SomePayloadBaseClass,
} from './czs-types';
import { ParentCollections } from './collParent';
import { ThemeCollections } from './collTheme';
import CZSUtils from './czs-utils';
import CZSJobs from './czs_job';
import { sxClasses } from './czs-style';
import T_EN from '../locales/en/translation.json';
import T_FR from '../locales/fr/translation.json';
import ImageMore from './assets/images/more.png';
import ImageZoomIn from './assets/images/zoom_in.png';
import ImageCapabilities from './assets/images/stars.png';
import ImageMetadata from './assets/images/metadata.png';
import ImageArrowUp from './assets/images/arrow_up.png';
import ImageArrowDown from './assets/images/arrow_down.png';

interface CZSPanelProps {
  mapId: string;
  onStartDrawing: () => void;
  onClearDrawing: () => void;
  onExtractFeatures: (email: string, outCrs?: number) => void;
  onZoomToCollection: (collection: PyGeoAPICollectionsCollectionResponsePayload) => void;
  onViewMetadataCollection: (collection: PyGeoAPICollectionsCollectionResponsePayload) => void;
  onViewCapabilitiesCollection: (collection: PyGeoAPICollectionsCollectionResponsePayload) => void;
  onHigher: (collType: string, collId: string) => void;
  onLower: (collType: string, collId: string) => void;
  onCollectionCheckedChanged: (parentColl: ParentCollections, value: string, checked: boolean, checkedColls: string[]) => void;
}

/**
 * Create a container containing a leaflet map using the GeoView viewer
 *
 * @returns {JSX.Elemet} the element that creates the container and the map
 */
function CZSPanel(props: CZSPanelProps): JSX.Element {
  // Fetch the cgpv module
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const { cgpv } = w;
  const { api, react, ui, useTranslation } = cgpv;
  const { useState, useEffect } = react;
  const {
    Box,
    Button,
    CircularProgress,
    Accordion,
    CheckboxListEnhanced,
    TextField,
    Menu,
    MenuItem,
    ListItem,
    ListItemText,
    ListItemIcon,
    Select,
    TypeMenuItemProps,
  } = ui.elements;
  const {
    mapId,
    onStartDrawing,
    onClearDrawing,
    onExtractFeatures,
    onZoomToCollection,
    onViewMetadataCollection,
    onViewCapabilitiesCollection,
    onHigher,
    onLower,
    onCollectionCheckedChanged,
  } = props;

  // Translation
  const { t, i18n } = useTranslation();

  // States
  const [collectionsFeatures, _setCollectionsFeatures] = useState([]);
  const [collectionsCoverages, _setCollectionsCoverages] = useState([]);
  const [checkedCollections, _setCheckedCollections] = useState([]);
  const [viewedCollections, _setViewedCollections] = useState({});
  const [clearButtonState, _setClearButtonState] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const [contextMenuCollection, setContextMenuCollection] = useState(null);
  const [email, _setEmail] = useState(CZSUtils.isLocal() ? 'alexandre.roy@nrcan-rncan.gc.ca' : null);
  const [isLoading, _setIsLoading] = useState(false);
  const [isLoadingFeatures, _setIsLoadingFeatures] = useState(false);
  const [isOrderLoading, _setIsOrderLoading] = useState([]);
  // const [isExtracting, _setIsExtracting] = useState(false);
  const [outCrs, _setOutCrs] = useState() as [number | undefined, React.Dispatch<number | undefined>];

  // Effect hook to add and remove event listeners
  useEffect(() => {
    console.log('IN USE EFFECT - PANEL');
    // Listen to the engine load collections started event
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_STARTED,
      (payload: SomePayloadBaseClass) => {
        // Set the state
        _setClearButtonState({ active: !!payload.geometry });
        // Is loading
        _setIsLoading(true);
      },
      mapId,
    );

    // Listen to the engine event completed for loading the collections of type features
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_FEATURES,
      (payload: SomePayloadBaseClass) => {
        _setCollectionsFeatures(payload.collections);
      },
      mapId,
    );

    // Listen to the engine event completed for loading the collections of type coverages
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_COVERAGES,
      (payload: SomePayloadBaseClass) => {
        _setCollectionsCoverages(payload.collections);
      },
      mapId,
    );

    // Listen to the engine event completed for loading collection of any type
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_ENDED,
      () => {
        _setIsLoading(false);
      },
      mapId,
    );

    // Listen to the engine event when a new collection has been checked/unchecked and process has started
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_COLLECTION_CHANGED_STARTED,
      (payload: SomePayloadBaseClass) => {
        // Is loading
        _setIsLoadingFeatures(true);
        _setCheckedCollections(payload.checkedCollections);
      },
      mapId,
    );

    // Listen to the engine event when a new collection has been checked/unchecked and process has completed
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_COLLECTION_CHANGED_ENDED,
      (payload: SomePayloadBaseClass) => {
        // Is loading
        _setIsLoadingFeatures(false);
        // Set viewed collections
        _setViewedCollections({ ...payload.viewedCollections });
      },
      mapId,
    );

    // Listen to the engine is changing the z-index visibility order of some collections
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_LAYER_ORDERED,
      (payload: SomePayloadBaseClass) => {
        // Is layer ordering
        _setIsOrderLoading([...payload.collections]);
      },
      mapId,
    );

    // Listen to the engine event when started updating the collections list and their map visibility
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_STARTED,
      () => {
        // Is loading
        _setIsLoadingFeatures(true);
      },
      mapId,
    );

    // Listen to the engine event when some collections couldn't be shown on map, only their footprints
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_FOOTPRINT,
      (payload: SomePayloadBaseClass) => {
        // Show error
        api.utilities.showWarning(mapId, `${t('czs.warning_extraction_area_too_big')}: ${payload.collection.title}`);
      },
      mapId,
    );

    // Listen to the engine event when some collections couldn't be shown on map, only their footprints
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_FOOTPRINT_NO_GEOM,
      () => {
        // Show error
        api.utilities.showWarning(mapId, t('czs.warning_extraction_area_missing'));
      },
      mapId,
    );

    // Listen to the engine event when finished updating the collections list and their map visibility
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_ENDED,
      (payload: SomePayloadBaseClass) => {
        // Is loading
        _setIsLoadingFeatures(false);
        // Set viewed collections
        _setViewedCollections({ ...payload.viewedCollections });
      },
      mapId,
    );

    // Listen to the engine error event
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_ERROR,
      (payload: SomePayloadBaseClass) => {
        // Show error
        api.utilities.showError(mapId, payload.error);
      },
      mapId,
    );

    // Listen to the engine warning when trying to zoom outside of map extent limits
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_ERROR_ZOOMING_OUTSIDE,
      () => {
        // Show warning
        api.utilities.showWarning(mapId, t('czs.error_some_elements_outside'));
      },
      mapId,
    );

    // Listen to the engine error when trying to show a collection
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_ERROR_SHOWING_COLLECTION,
      (payload: SomePayloadBaseClass) => {
        // Show error
        api.utilities.showError(mapId, payload.error);
      },
      mapId,
    );

    // Listen to the engine error when extracting records
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_ERROR_EXTRACTING,
      (payload: SomePayloadBaseClass) => {
        // Show error
        api.utilities.showError(mapId, payload.error);
      },
      mapId,
    );

    return () => {
      // Unwire handlers
      api.event.off(CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_STARTED, mapId);
      api.event.off(CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_FEATURES, mapId);
      api.event.off(CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_COVERAGES, mapId);
      api.event.off(CZS_EVENT_NAMES.ENGINE_LOAD_COLLECTIONS_ENDED, mapId);
      api.event.off(CZS_EVENT_NAMES.ENGINE_COLLECTION_CHANGED_STARTED, mapId);
      api.event.off(CZS_EVENT_NAMES.ENGINE_COLLECTION_CHANGED_ENDED, mapId);
      api.event.off(CZS_EVENT_NAMES.ENGINE_LAYER_ORDERED, mapId);
      api.event.off(CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_STARTED, mapId);
      api.event.off(CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_FOOTPRINT, mapId);
      api.event.off(CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_FOOTPRINT_NO_GEOM, mapId);
      api.event.off(CZS_EVENT_NAMES.ENGINE_UPDATE_VIEWED_COLLECTIONS_ENDED, mapId);
      api.event.off(CZS_EVENT_NAMES.ENGINE_ERROR, mapId);
      api.event.off(CZS_EVENT_NAMES.ENGINE_ERROR_ZOOMING_OUTSIDE, mapId);
      api.event.off(CZS_EVENT_NAMES.ENGINE_ERROR_SHOWING_COLLECTION, mapId);
      api.event.off(CZS_EVENT_NAMES.ENGINE_ERROR_EXTRACTING, mapId);
    };
  }, [api.event, api.utilities, mapId, t]);

  // Effect hook to be executed with i18n
  useEffect(() => {
    // Add GeoChart translations file
    i18n.addResourceBundle('en', 'translation', T_EN);
    i18n.addResourceBundle('fr', 'translation', T_FR);
  }, [i18n]);

  function handleStartDrawing(): void {
    onStartDrawing?.();
  }

  function handleClearDrawing(): void {
    onClearDrawing?.();
  }

  function handleExtractFeatures(): void {
    // Callback
    onExtractFeatures?.(email, outCrs);
  }

  function handleMenuMore(e: Event, coll: PyGeoAPICollectionsCollectionResponsePayload): void {
    setContextMenuCollection(coll);
    setAnchorEl(e.currentTarget);
  }

  function handleZoomToCollection(): void {
    onZoomToCollection?.(contextMenuCollection);
    // Close popup
    setAnchorEl(null);
  }

  function handleViewMetadataCollection(): void {
    onViewMetadataCollection?.(contextMenuCollection);
    // Close popup
    setAnchorEl(null);
  }

  function handleViewCapabilitiesCollection(): void {
    onViewCapabilitiesCollection?.(contextMenuCollection);
    // Close popup
    setAnchorEl(null);
  }

  function handleHigher(collType: string, collId: string): void {
    onHigher?.(collType, collId);
  }

  function handleLower(collType: string, collId: string): void {
    onLower?.(collType, collId);
  }

  function handleCollectionCheckedChanged(parentColl: ParentCollections, value: string, checked: boolean, checkedColls: string[]): void {
    onCollectionCheckedChanged?.(parentColl, value, checked, checkedColls);
  }

  function handleEmailChange(): void {
    const txtEmail: typeof TextField = document.getElementById('czs_email');
    _setEmail(txtEmail?.value);
  }

  function handleCloseContextMenu(): void {
    // Close popup
    setAnchorEl(null);
  }

  function handleOutCrsChanged(value: number | undefined): void {
    _setOutCrs(value);
  }

  function getParentsHasChecked(themeColl: ThemeCollections): ParentCollections[] {
    // If none checked
    if (!checkedCollections || checkedCollections.length === 0) return [];

    // For each parent collection in the theme
    const parents: ParentCollections[] = [];
    themeColl.parents.forEach((par: ParentCollections) => {
      const lst = par.collections.filter((col: PyGeoAPICollectionsCollectionResponsePayload) => {
        return checkedCollections.includes(col.id);
      });

      // If any collection is checked under this parent
      if (lst && lst.length > 0) {
        parents.push(par);
      }
    });

    // Return content
    return parents;
  }

  function renderContentLayer(coll: PyGeoAPICollectionsCollectionResponsePayload): JSX.Element {
    let menuMore: JSX.Element = <span />;
    menuMore = (
      <Box sx={sxClasses.layerOption}>
        <ListItem
          button
          title={t('czs.layer_options')}
          onClick={(e: Event) => {
            handleMenuMore(e, coll);
          }}
        >
          <ListItemIcon sx={{ minWidth: '10px' }}>
            <img src={ImageMore} alt="" />
          </ListItemIcon>
        </ListItem>
      </Box>
    );

    let orders: JSX.Element = <span />;
    if (coll && viewedCollections[coll.id]) {
      orders = (
        <Box sx={sxClasses.layerOption} className={`${isOrderLoading.includes(coll.id) ? 'loading' : ''}`}>
          <Box
            onClick={() => {
              handleHigher(coll.itemType, coll.id);
            }}
            title={t('czs.layer_bring_to_front')}
          >
            <img src={ImageArrowUp} alt="" />
          </Box>
          <Box
            onClick={() => {
              handleLower(coll.itemType, coll.id);
            }}
            title={t('czs.layer_send_to_back')}
          >
            <img src={ImageArrowDown} alt="" />
          </Box>
        </Box>
      );
    }
    return (
      <Box sx={sxClasses.layerOptionsWrapper}>
        {menuMore}
        {orders}
      </Box>
    );
  }

  function renderContentColls(parColl: ParentCollections): JSX.Element {
    // If a regular feature/coverage collection
    if (parColl.collections && parColl.collections.length > 0) {
      return (
        <CheckboxListEnhanced
          multiselect
          listItems={Object.values(parColl.collections).map((coll: PyGeoAPICollectionsCollectionResponsePayload) => {
            return {
              display: coll.title,
              value: coll.id,
              contentRight: renderContentLayer(coll),
            };
          })}
          checkedValues={checkedCollections || []}
          checkedCallback={(value: string, checked: boolean, allChecked: string[]) =>
            handleCollectionCheckedChanged(parColl, value, checked, allChecked)
          }
        />
      );
    }

    return <Box />;
  }

  function renderContentParents(parColls: ParentCollections[], checkedParents: ParentCollections[]): JSX.Element {
    // If a regular feature/coverage collection
    if (parColls && parColls.length > 0) {
      return (
        <Accordion
          items={Object.values(parColls).map((parColl: ParentCollections) => ({
            title: `${parColl.parent.title} (${parColl.collections.length})${
              checkedParents.filter((x: ParentCollections) => {
                return x.parent.id === parColl.parent.id;
              }).length > 0
                ? ' *'
                : ''
            }`,
            content: renderContentColls(parColl),
          }))}
        />
      );
    }

    return <Box />;
  }

  function renderContentThemes(thmColls: ThemeCollections[]): JSX.Element {
    // For each theme
    return (
      <Accordion
        sx={sxClasses.accordionTheme}
        items={Object.values(thmColls).map((thmColl: ThemeCollections) => {
          // Get the parents that are checked on under this theme
          const checkedParents: ParentCollections[] = getParentsHasChecked(thmColl);

          // Render
          return {
            title: `${thmColl.theme.title} (${thmColl.parents.length})${checkedParents.length > 0 ? ' *' : ''}`,
            content: renderContentParents(thmColl.parents, checkedParents),
          };
        })}
      />
    );
  }

  function renderMenuOptions(): JSX.Element {
    // Read info
    let link: PyGeoAPICollectionsCollectionLinkResponsePayload | null = null;
    if (contextMenuCollection) link = CZSUtils.getContentMetadata(contextMenuCollection.links);

    let metadataNode: JSX.Element = <MenuItem />;
    if (link) {
      metadataNode = (
        <MenuItem onClick={() => handleViewMetadataCollection()}>
          <ListItemIcon>
            <img src={ImageMetadata} alt="" />
          </ListItemIcon>
          <ListItemText>{t('czs.view_metadata')}</ListItemText>
        </MenuItem>
      );
    }

    return (
      <Menu sx={sxClasses.menuOption} anchorEl={anchorEl} open={open} onClose={() => handleCloseContextMenu()}>
        <MenuItem onClick={() => handleZoomToCollection()}>
          <ListItemIcon>
            <img src={ImageZoomIn} alt="" />
          </ListItemIcon>
          <ListItemText>{t('czs.zoom_to')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleViewCapabilitiesCollection()}>
          <ListItemIcon>
            <img src={ImageCapabilities} alt="" />
          </ListItemIcon>
          <ListItemText>{t('czs.view_capabilities')}</ListItemText>
        </MenuItem>
        {metadataNode}
      </Menu>
    );
  }

  // Create the menu items
  const menuItems: (typeof TypeMenuItemProps)[] = [];
  [{ label: t('czs.project_source'), value: undefined }, ...PROJECTIONS].forEach((proj: { label: string; value: number | undefined }) => {
    menuItems.push({ key: proj.value, item: { value: proj.value, children: proj.label } });
  });

  // Return Panel UI
  return (
    <Box sx={sxClasses.panel}>
      <Box>
        <Button type="text" tooltip={t('czs.draw_tooltip')} tooltipPlacement="right" onClick={() => handleStartDrawing()} size="small">
          {t('czs.draw')}
        </Button>
        <Button
          type="text"
          tooltip={t('czs.clear_tooltip')}
          tooltipPlacement="right"
          onClick={() => handleClearDrawing()}
          size="small"
          disabled={!clearButtonState.active}
        >
          {t('czs.clear')}
        </Button>
      </Box>
      <Box sx={sxClasses.loadingSpinnerContainer}>
        <CircularProgress sx={sxClasses.loadingSpinnerContainer.loadingSpinnerCollections} isLoaded={!isLoading} />
        <CircularProgress sx={sxClasses.loadingSpinnerContainer.loadingSpinnerFeatures} isLoaded={!isLoadingFeatures} />
      </Box>
      <Box>
        <Accordion
          items={[
            {
              title: t('czs.list_feature_colls'),
              content: renderContentThemes(collectionsFeatures),
            },
          ]}
        />
        <Accordion
          items={[
            {
              title: t('czs.list_coverage_colls'),
              content: renderContentThemes(collectionsCoverages),
            },
          ]}
        />
      </Box>

      <Box sx={{ marginTop: '20px' }}>
        <Box title={t('czs.email_tooltip')} aria-label={t('czs.email_tooltip')}>
          Email:
        </Box>
        <TextField
          id="czs_email"
          sx={sxClasses.inputField}
          type="email"
          tooltip={t('czs.email_tooltip')}
          tooltipPlacement="right"
          placeholder={t('czs.enter_email')}
          style={{ width: '100%' }}
          onChange={() => handleEmailChange()}
          value={email}
        />
      </Box>

      <Box sx={{ marginTop: '20px' }}>
        <Select
          id="czs_out_crs"
          label={t('czs.projection_title')}
          tooltip={t('czs.projection_tooltip')} // GeoView Core Select component not supporting tooltips at the time of coding, but writing it still..
          tooltipPlacement="right"
          value={outCrs}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange={(e: Event) => handleOutCrsChanged((e.target as any).value)}
          menuItems={menuItems}
          fullWidth
        />
      </Box>

      <Button
        type="text"
        tooltip={t('czs.extract_tooltip')}
        tooltipPlacement="right"
        onClick={() => handleExtractFeatures()}
        size="small"
        disabled={!(!!Object.keys(viewedCollections).length && email)}
      >
        {t('czs.extract_features')}
      </Button>

      <CZSJobs mapId={mapId} />

      <Accordion
        sx={sxClasses.accordionTextWrapper}
        className="text-accordion"
        items={[
          {
            title: t('czs.help_title'),
            content: <Box sx={sxClasses.accordionText} dangerouslySetInnerHTML={{ __html: t('czs.help_text') }} />,
          },
        ]}
      />
      <Accordion
        sx={sxClasses.accordionTextWrapper}
        className="text-accordion"
        items={[
          {
            title: t('czs.feedback_title'),
            content: <Box sx={sxClasses.accordionText} dangerouslySetInnerHTML={{ __html: t('czs.feedback_text') }} />,
          },
        ]}
      />
      {renderMenuOptions()}
    </Box>
  );
}

export default CZSPanel;
