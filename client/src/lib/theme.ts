/**
 * Theme Configuration for Maternity Lifestyle Platform
 * 
 * This file contains color schemes, sizing, and design tokens
 * for maintaining a consistent visual language across the application.
 */

export const colors = {
  // Primary palette
  primary: {
    lavender: "#D9CAEE", // Light lavender - primary brand color
    mint: "#C2E6DA",     // Mint green - secondary brand color
    sage: "#A8C7B5",     // Sage green - accent color
    beige: "#F7EEE2",    // Warm beige - background color
    skyBlue: "#C9DEF0",  // Sky blue - accent color
  },
  
  // Text colors
  text: {
    primary: "#333333",   // Dark gray for main text
    secondary: "#666666", // Medium gray for secondary text
    tertiary: "#999999",  // Light gray for subtle text
    inverse: "#FFFFFF",   // White text for dark backgrounds
  },
  
  // Background colors
  background: {
    main: "#FFFFFF",      // White main background
    secondary: "#F8F9FA", // Light gray secondary background
    tertiary: "#F0F2F5",  // Slightly darker gray for card backgrounds
    highlight: "#FFFCF9", // Warm white highlight
  },
  
  // Feedback colors
  feedback: {
    success: "#8CB4A3", // Soft green for success states
    warning: "#FFCF9E", // Soft orange for warning states
    error: "#F2BDBD",   // Soft red for error states
    info: "#B8D0EB",    // Soft blue for info states
  },
  
  // Gradient definitions
  gradients: {
    primaryHeader: "linear-gradient(135deg, #D9CAEE 0%, #C2E6DA 100%)", // Lavender to mint
    cardHighlight: "linear-gradient(135deg, #F7EEE2 0%, #C9DEF0 100%)", // Beige to sky blue
    activeNav: "linear-gradient(180deg, #D9CAEE 0%, #D9CAEE40 100%)",   // Lavender fade
  }
};

export const typography = {
  fontFamily: {
    primary: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    secondary: "'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  fontSize: {
    xs: "0.75rem",   // 12px
    sm: "0.875rem",  // 14px
    base: "1rem",    // 16px
    md: "1.125rem",  // 18px
    lg: "1.25rem",   // 20px
    xl: "1.5rem",    // 24px
    "2xl": "1.75rem", // 28px
    "3xl": "2rem",    // 32px
    "4xl": "2.5rem",  // 40px
  },
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const spacing = {
  px: "1px",
  0.5: "0.125rem", // 2px
  1: "0.25rem",    // 4px
  2: "0.5rem",     // 8px
  3: "0.75rem",    // 12px
  4: "1rem",       // 16px
  5: "1.25rem",    // 20px
  6: "1.5rem",     // 24px
  8: "2rem",       // 32px
  10: "2.5rem",    // 40px
  12: "3rem",      // 48px
  16: "4rem",      // 64px
  20: "5rem",      // 80px
  24: "6rem",      // 96px
  32: "8rem",      // 128px
};

export const borderRadius = {
  none: "0",
  sm: "0.25rem",   // 4px
  md: "0.5rem",    // 8px
  lg: "1rem",      // 16px
  xl: "1.5rem",    // 24px
  "2xl": "2rem",   // 32px
  full: "9999px",  // Fully rounded
};

export const shadows = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)",
  card: "0 4px 12px rgba(0, 0, 0, 0.04)",
  button: "0 2px 10px rgba(216, 201, 237, 0.4)",
};

export const transitions = {
  default: "all 0.2s ease-in-out",
  slow: "all 0.3s ease-in-out",
  fast: "all 0.1s ease-in-out",
};

// Screen size breakpoints
export const breakpoints = {
  xs: "320px",
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};

export const zIndices = {
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  navbar: 100,
  modal: 200,
  tooltip: 300,
  toast: 400,
};