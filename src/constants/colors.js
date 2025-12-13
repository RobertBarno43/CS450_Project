// Centralized color scheme for consistent visualization across all charts

export const COLOR_SCHEMES = {
  // Furnishing status colors (as requested, furnished = red)
  furnishingStatus: {
    'furnished': '#E74C3C',        // Red
    'semi-furnished': '#F39C12',   // Orange
    'unfurnished': '#95A5A6'       // Gray
  },

  // Bedroom count colors
  bedrooms: {
    1: '#3498DB',    // Blue
    2: '#2ECC71',    // Green
    3: '#E74C3C',    // Red
    4: '#F39C12',    // Orange
    5: '#9B59B6',    // Purple
    6: '#95A5A6'     // Gray
  },

  // Bathroom count colors
  bathrooms: {
    1: '#3498DB',    // Blue
    2: '#2ECC71',    // Green
    3: '#E74C3C',    // Red
    4: '#F39C12',    // Orange
    5: '#9B59B6',    // Purple
    6: '#1ABC9C'     // Teal
  },

  // Stories colors
  stories: {
    1: '#3498DB',    // Blue
    2: '#2ECC71',    // Green
    3: '#E74C3C',    // Red
    4: '#F39C12',    // Orange
    5: '#9B59B6'     // Purple
  },

  // Boolean feature colors
  booleanFeatures: {
    true: '#2ECC71',   // Green for "Yes/True"
    false: '#E74C3C'   // Red for "No/False"
  },

  // Air conditioning colors
  airConditioning: {
    'With AC': '#2ECC71',    // Green
    'No AC': '#E74C3C'       // Red
  },

  // Parking colors
  parking: {
    'With Parking': '#2ECC71',    // Green
    'No Parking': '#E74C3C'       // Red
  },

  // Location preference colors
  location: {
    'Preferred Area': '#2ECC71',     // Green
    'Standard Area': '#95A5A6'       // Gray
  },

  // Feature premium chart colors (specific features)
  featurePremium: {
    'airconditioning': '#E74C3C',     // Red
    'parking': '#2ECC71',             // Green
    'prefarea': '#3498DB',            // Blue
    'hotwaterheating': '#F1C40F',     // Yellow
    'guestroom': '#9B59B6',           // Purple
    'basement': '#1ABC9C',            // Teal
    'mainroad': '#E67E22'             // Dark Orange
  }
};

// Helper function to get color for a category
export const getColor = (category, value) => {
  const colorMap = COLOR_SCHEMES[category];
  if (!colorMap) {
    console.warn(`Color scheme for category '${category}' not found`);
    return '#95A5A6'; // Default gray
  }
  
  return colorMap[value] || '#95A5A6'; // Default gray if value not found
};

// Helper function to get color array for D3 scale
export const getColorArray = (category, domain) => {
  const colorMap = COLOR_SCHEMES[category];
  if (!colorMap) {
    console.warn(`Color scheme for category '${category}' not found`);
    return domain.map(() => '#95A5A6');
  }
  
  return domain.map(value => colorMap[value] || '#95A5A6');
};