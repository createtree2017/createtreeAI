<?php
/**
 * CreateTree Culture Center AI Utilities Embed PHP Helper
 * 
 * This file provides a PHP wrapper for easily embedding the AI utilities
 * into your PHP site. Copy this file to your PHP project and use it as shown
 * in the examples below.
 * 
 * IMPORTANT: Replace [YOUR-REPLIT-APP-URL] with your actual Replit App URL.
 */

class CreateTreeEmbed {
    private $appUrl = 'https://[YOUR-REPLIT-APP-URL]';
    private $defaultWidth = '100%';
    private $defaultHeight = '670px';
    private $defaultMaxWidth = '450px';
    
    // Available features
    const FEATURE_LULLABY = 'music';
    const FEATURE_MEMORY = 'image';
    const FEATURE_SUPPORT = 'chat';
    
    // Constructor
    public function __construct($appUrl = null) {
        if ($appUrl) {
            $this->appUrl = $appUrl;
        }
    }
    
    // Main embed method
    public function embed($options = []) {
        // Default options
        $defaults = [
            'target' => 'createtree-embed-' . uniqid(),
            'feature' => null,
            'width' => $this->defaultWidth,
            'height' => $this->defaultHeight,
            'maxWidth' => $this->defaultMaxWidth,
            'showBorder' => true,
            'showShadow' => true,
            'includeScript' => true
        ];
        
        // Merge options with defaults
        $options = array_merge($defaults, $options);
        
        // Validate feature
        if ($options['feature'] && !$this->isValidFeature($options['feature'])) {
            $options['feature'] = null;
        }
        
        // Generate target ID if it doesn't look like an ID
        if (strpos($options['target'], '#') !== 0 && strpos($options['target'], '.') !== 0) {
            $targetId = $options['target'];
            $options['target'] = '#' . $targetId;
        } else {
            $targetId = substr($options['target'], 1); // Remove the # or .
        }
        
        // Build the iframe URL
        $iframeUrl = $this->appUrl;
        if ($options['feature']) {
            $iframeUrl .= '/' . $options['feature'];
        }
        
        // Generate HTML
        $html = '';
        
        // Include the script if requested
        if ($options['includeScript']) {
            $html .= '<script src="' . $this->appUrl . '/embed.js"></script>' . PHP_EOL;
        }
        
        // Add container div
        $html .= '<div id="' . $targetId . '"></div>' . PHP_EOL;
        
        // Add initialization script
        $html .= '<script>' . PHP_EOL;
        $html .= 'document.addEventListener("DOMContentLoaded", function() {' . PHP_EOL;
        
        // Use the appropriate method based on feature
        if ($options['feature'] === self::FEATURE_LULLABY) {
            $html .= '  createTreeEmbed.lullaby({' . PHP_EOL;
        } else if ($options['feature'] === self::FEATURE_MEMORY) {
            $html .= '  createTreeEmbed.memory({' . PHP_EOL;
        } else if ($options['feature'] === self::FEATURE_SUPPORT) {
            $html .= '  createTreeEmbed.support({' . PHP_EOL;
        } else {
            $html .= '  createTreeEmbed({' . PHP_EOL;
        }
        
        $html .= '    target: "' . $options['target'] . '",' . PHP_EOL;
        $html .= '    height: "' . $options['height'] . '",' . PHP_EOL;
        $html .= '    width: "' . $options['width'] . '",' . PHP_EOL;
        $html .= '    maxWidth: "' . $options['maxWidth'] . '",' . PHP_EOL;
        $html .= '    showBorder: ' . ($options['showBorder'] ? 'true' : 'false') . ',' . PHP_EOL;
        $html .= '    showShadow: ' . ($options['showShadow'] ? 'true' : 'false') . PHP_EOL;
        $html .= '  });' . PHP_EOL;
        $html .= '});' . PHP_EOL;
        $html .= '</script>' . PHP_EOL;
        
        return $html;
    }
    
    // Helper method for Lullaby feature
    public function lullaby($options = []) {
        $options['feature'] = self::FEATURE_LULLABY;
        return $this->embed($options);
    }
    
    // Helper method for Memory feature
    public function memory($options = []) {
        $options['feature'] = self::FEATURE_MEMORY;
        return $this->embed($options);
    }
    
    // Helper method for Support feature
    public function support($options = []) {
        $options['feature'] = self::FEATURE_SUPPORT;
        return $this->embed($options);
    }
    
    // Validate feature
    private function isValidFeature($feature) {
        return in_array($feature, [
            self::FEATURE_LULLABY,
            self::FEATURE_MEMORY,
            self::FEATURE_SUPPORT
        ]);
    }
    
    // Include only the embed script
    public function includeScript() {
        return '<script src="' . $this->appUrl . '/embed.js"></script>';
    }
}

/**
 * USAGE EXAMPLES:
 * 
 * // Initialize with your Replit app URL
 * $embed = new CreateTreeEmbed('https://your-replit-app-url.replit.app');
 * 
 * // Example 1: Embed the entire app
 * echo $embed->embed([
 *     'target' => 'app-container',
 *     'height' => '700px'
 * ]);
 * 
 * // Example 2: Embed only the Lullaby feature
 * echo $embed->lullaby([
 *     'target' => 'lullaby-container',
 *     'height' => '600px'
 * ]);
 * 
 * // Example 3: Embed only the Memory feature
 * echo $embed->memory([
 *     'target' => 'memory-container',
 *     'height' => '800px'
 * ]);
 * 
 * // Example 4: Embed only the Support Chat feature
 * echo $embed->support([
 *     'target' => 'support-container',
 *     'height' => '650px'
 * ]);
 */
?>