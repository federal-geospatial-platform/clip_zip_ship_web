/**
 * SX Classes for the Clip Zip Ship
 */
export const sxClasses = {
  panel: {
    position: 'relative',
    '& .accordion-group': {
      fontSize: '0.9rem',
      marginBottom: '10px',
    },
    '& .accordion-group ul': {
      whiteSpace: 'unset',
      '& .MuiListItem-root:hover': {
        backgroundColor: '#75a7e2',
      },
    },
    '& .accordion-group .MuiTypography-root': {
      fontSize: 'inherit',
    },
    '& .MuiAccordionSummary-content': {
      paddingLeft: '10px',
    },
    '& .MuiAccordion-root': {
      backgroundColor: '#005fcb52',
    },
    '& .MuiAccordion-root ul': {
      cursor: 'pointer',
    },
    '& .MuiPaper-root.MuiMenu-paper': {
      backgroundColor: '#a1cdff',
    },
    '& .MuiButton-root': {
      border: '1px solid',
      margin: '20px 0px',
      padding: '0px',
    },
    '& .MuiButton-root.Mui-disabled': {
      color: 'rgba(96, 96, 96, 0.3)',
    },
    '& .MuiCheckbox-colorPrimary.Mui-checked': {
      color: '#1b406a',
    },
    '& .text-accordion.MuiAccordion-root': {
      backgroundColor: '#e4b152',
    },
    '& is-debug': {
      backgroundColor: 'red',
    },
    '& .layer-order-layers.loading': {
      cursor: 'default',
      opacity: 0.4,
    },
    '& .layer-order-layers.loading a': {
      pointerEvents: 'none',
    },
    '& .layer-option-img, .menu-option-img': {
      height: '20px',
      width: '20px',
      verticalAlign: 'middle',
      margin: '0px 5px 0px 5px',
    },
    '& .czs-jobs-cell-spin': {
      position: 'relative',
      textAlign: 'right',
      width: '30px',
      '& img': {
        verticalAlign: 'middle',
      },
      '& .MuiCircularProgress-root': {
        width: '25px !important',
        height: '25px !important',
      },
    },
    '& .czs-jobs-cell-progress': {
      width: '100px',
    },
    '& .czs-jobs-cell-info a': {
      textDecoration: 'none',
    },
    '& .czs-jobs-cell-info a:hover': {
      textDecoration: 'underline',
    },
  },
  inputField: {
    '& input': {
      padding: '10px 10px',
      fontSize: '1rem',
    },
  },
  accordionTheme: {
    '& ul': {
      // cursor: 'pointer',
    },
  },
  accordionTextWrapper: {
    '& .MuiAccordion-root': {
      backgroundColor: '#e4b152',
    },
  },
  accordionText: {
    fontSize: 'smaller',
    padding: '0px 10px',
  },
  layerOptionsWrapper: {
    // minWidth: '100px'
  },
  layerOption: {
    display: 'inline-block',
    verticalAlign: 'middle',
    position: 'relative',
    '& .MuiListItemIcon-root': {
      minWidth: 'inherit',
    },
    '& div': {
      display: 'inline-block',
    },
    '& img': {
      height: '20px',
      width: '20px',
      verticalAlign: 'middle',
      margin: '0px 5px 0px 5px',
    },
  },
  menuOption: {
    '& img': {
      height: '20px',
      width: '20px',
      verticalAlign: 'middle',
      margin: '0px 5px 0px 5px',
    },
  },
  loadingSpinnerContainer: {
    position: 'absolute',
    top: '40px',
    right: '40px',
    '& .loading-spinner .MuiCircularProgress-root': {
      width: '60px !important',
      height: '60px !important',
    },
    loadingSpinnerCollections: {
      '& .MuiCircularProgress-root': {
        color: 'rgba(0, 95, 203, 0.666)',
      },
    },
    loadingSpinnerFeatures: {
      '& .MuiCircularProgress-root': {
        // TODO: purposely left empty, could be removed later..
      },
    },
  },
  loadingSpinnerJob: {
    backgroundColor: 'transparent',
  },
  jobs: {
    position: 'relative',
    margin: '20px 0px',
    '& a': {
      color: 'inherit',
      fontSize: '1rem',
    },
    '& table': {
      width: '100%',
    },
    '& .loading-spinner': {
      position: 'relative',
      right: '0px',
      backgroundColor: 'transparent',
      '& .MuiCircularProgress-root': {
        position: 'relative',
        height: '20px !important',
        width: '20px !important',
      },
    },
    '& .job-dismissed:hover': {
      textDecoration: 'none',
    },
  },
};
