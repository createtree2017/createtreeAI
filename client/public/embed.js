/**
 * CreateTree Culture Center AI Utilities Embed Script
 * This script provides a way to embed the AI utilities in any website
 */

(function() {
  // Configuration
  const DEFAULT_HEIGHT = '670px';
  const DEFAULT_WIDTH = '100%';
  const MAX_WIDTH = '450px';
  const BORDER_RADIUS = '12px';
  const BORDER = '1px solid #e5e7eb';
  const SHADOW = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
  
  // Available features
  const FEATURES = {
    LULLABY: 'music',
    MEMORY: 'image',
    SUPPORT: 'chat'
  };
  
  // Create embed function
  window.createTreeEmbed = function(config) {
    // Default configuration
    const options = {
      target: config.target || null,
      feature: config.feature && FEATURES[config.feature.toUpperCase()] 
        ? FEATURES[config.feature.toUpperCase()] 
        : null,
      height: config.height || DEFAULT_HEIGHT,
      width: config.width || DEFAULT_WIDTH,
      maxWidth: config.maxWidth || MAX_WIDTH,
      showBorder: config.showBorder !== undefined ? config.showBorder : true,
      showShadow: config.showShadow !== undefined ? config.showShadow : true,
    };
    
    if (!options.target) {
      console.error('CreateTree Embed: Target element not specified');
      return;
    }
    
    // Get target element
    const targetElement = 
      typeof options.target === 'string' 
        ? document.querySelector(options.target) 
        : options.target;
    
    if (!targetElement) {
      console.error(`CreateTree Embed: Target element "${options.target}" not found`);
      return;
    }
    
    // Create iframe
    const iframe = document.createElement('iframe');
    
    // Set iframe attributes
    iframe.style.width = options.width;
    iframe.style.height = options.height;
    iframe.style.maxWidth = options.maxWidth;
    iframe.style.border = options.showBorder ? BORDER : 'none';
    iframe.style.borderRadius = BORDER_RADIUS;
    iframe.style.boxShadow = options.showShadow ? SHADOW : 'none';
    iframe.scrolling = 'no';
    iframe.allow = 'microphone; camera';
    iframe.frameBorder = '0';
    
    // Set source URL based on feature
    let appUrl = window.location.hostname.includes('replit.app') 
      ? 'https://' + window.location.hostname 
      : 'https://{REPLACE_WITH_ACTUAL_URL}';
    
    // Add feature path if specified
    if (options.feature) {
      appUrl += '/' + options.feature;
    }
    
    iframe.src = appUrl;
    
    // Append iframe to target element
    targetElement.appendChild(iframe);
    
    // Return the iframe for any additional manipulation
    return iframe;
  };
  
  // Create shorthand methods for specific features
  window.createTreeEmbed.lullaby = function(config) {
    return window.createTreeEmbed({
      ...config,
      feature: 'LULLABY'
    });
  };
  
  window.createTreeEmbed.memory = function(config) {
    return window.createTreeEmbed({
      ...config,
      feature: 'MEMORY'
    });
  };
  
  window.createTreeEmbed.support = function(config) {
    return window.createTreeEmbed({
      ...config,
      feature: 'SUPPORT'
    });
  };
})();