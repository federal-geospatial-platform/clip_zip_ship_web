// Import CZS Panel
import CZSPanel from './czs_panel';
import CZSEngine from './czs_engine';
import { PyGeoAPICollectionsCollectionResponsePayload } from './czs-types';
import { ParentCollections } from './collParent';
import CZSUtils from './czs-utils';

export type AppProps = {
  mapId: string;
};

/**
 * Create the application module for Clip Zip Ship. With GeoView, most is delegated to it.
 *
 * @returns {JSX.Elemet} the element that creates the container and the map
 */
function App(props: AppProps): JSX.Element {
  // Fetch the cgpv module
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const { cgpv } = w;
  const { react } = cgpv;
  const { useEffect, useRef } = react;
  const { mapId } = props;

  const effectRan = useRef(false);
  let czsEngine: CZSEngine;

  function handleStartDrawing(): void {
    // Start the Engine drawing
    czsEngine.startDrawing();
  }

  async function handleClearDrawing(): Promise<void> {
    // Clear the Engine drawing
    await czsEngine.clearDrawingAsync();
  }

  async function handleExtractFeatures(email: string, outCrs?: number): Promise<void> {
    // Extract features
    await czsEngine.extractFeaturesAsync(email, outCrs);
  }

  async function handleZoomToCollection(collection: PyGeoAPICollectionsCollectionResponsePayload): Promise<void> {
    // Zoom to collection
    await czsEngine.zoomToCollection(collection);
  }

  function handleViewCapabilitiesCollection(collection: PyGeoAPICollectionsCollectionResponsePayload): void {
    // Open a new window on the url
    window.open(
      `${CZSUtils.getQGISServiceHost() + collection.org_schema}/${
        collection.parent
      }?service=WMS&version=1.3.0&request=GetCapabilities&LAYERS=${collection.short_name}`,
      '_blank',
    );
  }

  function handleViewMetadataCollection(collection: PyGeoAPICollectionsCollectionResponsePayload): void {
    // Get info
    const link = CZSUtils.getContentMetadata(collection.links);

    // If found, open a new tab on the url
    if (link) window.open(link.href, '_blank');
  }

  async function handleHigher(collType: string, collId: string): Promise<void> {
    // Order the layer higher in z index
    await czsEngine.layerOrderHigherAsync(collType, collId);
  }

  async function handleLower(collType: string, collId: string): Promise<void> {
    // Order the layer lower in z index
    await czsEngine.layerOrderLowerAsync(collType, collId);
  }

  async function handleCollectionCheckedChanged(
    parentColl: ParentCollections,
    value: string,
    checked: boolean,
    checkedColls: string[],
  ): Promise<void> {
    // Update the checked list of collections
    await czsEngine.updateCollectionCheckedAsync(parentColl, value, checked, checkedColls);
  }

  useEffect(() => {
    // Make sure cgpv init is called only once even on multiple useEffect calls, especially since React 18.
    if (!effectRan.current) {
      // Initialize the API
      cgpv.init(() => {
        // Show temporary message
        cgpv.api.utilities.showMessage(mapId, 'This is a pre-alpha release. Only for experimentation purposes.');

        // Button
        const button = {
          id: 'AppbarPanelButtonId',
          tooltip: 'Clip Zip Ship',
          tooltipPlacement: 'right',
          children: cgpv.react.createElement(cgpv.ui.elements.AppsIcon),
        };

        // Panel
        const panel = {
          panelId: 'CZSPanelID',
          title: 'Clip Zip Ship v0.2.5',
          width: 850,
        };

        // Start the engine
        // eslint-disable-next-line react-hooks/exhaustive-deps
        czsEngine = new CZSEngine(cgpv, mapId, document.documentElement.lang);

        // Create a new button panel on the app-bar
        const buttonPanel = cgpv.api.maps[mapId].appBarButtons.createAppbarPanel(button, panel, null);

        // Set panel content
        buttonPanel?.panel?.changeContent(
          <CZSPanel
            mapId={mapId}
            onStartDrawing={() => handleStartDrawing()}
            onClearDrawing={() => handleClearDrawing()}
            onExtractFeatures={(email: string, outCrs?: number | undefined) => handleExtractFeatures(email, outCrs)}
            onZoomToCollection={(collection: PyGeoAPICollectionsCollectionResponsePayload) => handleZoomToCollection(collection)}
            onViewCapabilitiesCollection={(collection: PyGeoAPICollectionsCollectionResponsePayload) =>
              handleViewCapabilitiesCollection(collection)
            }
            onViewMetadataCollection={(collection: PyGeoAPICollectionsCollectionResponsePayload) =>
              handleViewMetadataCollection(collection)
            }
            onHigher={(collType: string, collId: string) => handleHigher(collType, collId)}
            onLower={(collType: string, collId: string) => handleLower(collType, collId)}
            onCollectionCheckedChanged={(parentColl: ParentCollections, value: string, checked: boolean, checkedColls: string[]) =>
              handleCollectionCheckedChanged(parentColl, value, checked, checkedColls)
            }
          />,
        );
      });
    }

    // Use Effect ran once
    return () => {
      effectRan.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div />;
}

export default App;
