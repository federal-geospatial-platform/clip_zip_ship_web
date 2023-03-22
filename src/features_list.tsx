
/**
 * Type to create a FeaturesList UI element
 */
export type FeaturesListProps = {
  // FeaturesList ID
  id?: string;
  featuresCollections: Array<FeatureCollectionItem>;
  hoverOnCallback: (feature: object) => void;
  hoverOutCallback: (feature: object) => void;
};

/**
 * Type to represent a Feature Collection item in the list
 */
export type FeatureCollectionItem = {
  collection: string;
  attributes: Array<string>;
  features: Array<any>;
};

/**
 * Create a FeaturesList UI element
 *
 * @returns {JSX.Element} the Clip Zip Ship UI element
 */
export default function FeaturesList(props: FeaturesListProps): JSX.Element {
  const { featuresCollections, hoverOnCallback, hoverOutCallback } = props;

  // State used to store latitude and longtitude after map drag end
  //const [features, _setFeatures] = useState([]);

  //// Render
  // useEffect(() => {

  // }, []);

  return (
    <div>
      <div>
        {Object.values(featuresCollections).map((feat: FeatureCollectionItem) => (
          <div key={feat.collection} className="table-wrapper">
          <table>
          <thead>
          <tr>
            <th key={feat.collection}
                className="czs-feat-collection" colSpan={100}>
              {feat.collection}
            </th>
          </tr>
          <tr>
            {Object.values(feat.attributes).map((att: string) => (
              <th key={att}>
                {att}
              </th>
            ))}
          </tr>
          </thead>
          <tbody key={feat.collection}>
            {Object.values(feat.features).map((f) => (
              <tr key={f.properties.id}
                  onMouseOver={(e) => hoverOnCallback(f)}
                  onMouseOut={(e) => hoverOutCallback(f)}>
                {Object.values(feat.attributes)
                  .filter((x) => {
                    return (x in f.properties);
                  })
                  .map((att: string) => (
                  <td key={f.properties[att]}>
                    {f.properties[att]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          </table>
          </div>
        ))}
      </div>
    </div>
  );
};
