/**
 * Internationalization utility for the application
 * This file provides translation functions and language management
 */

// Default language
let currentLanguage = 'en';

// Translation dictionaries
const translations: Record<string, Record<string, string>> = {
  en: {},
  ko: {}
};

/**
 * Set the current application language
 * @param lang Language code (e.g., 'en', 'ko')
 */
export function setLanguage(lang: string): void {
  if (translations[lang]) {
    currentLanguage = lang;
  } else {
    console.warn(`Language '${lang}' not supported. Falling back to default.`);
  }
}

/**
 * Get the current application language
 * @returns Current language code
 */
export function getLanguage(): string {
  return currentLanguage;
}

/**
 * Translate a key into the current language
 * @param key Translation key
 * @param params Optional parameters to replace placeholders in the translation
 * @returns Translated string or the key itself if translation is not found
 */
export function t(key: string, params?: Record<string, string | number>): string {
  // Try to get the translation for the current language
  let translation = translations[currentLanguage]?.[key];
  
  // Fallback to the key itself if translation is not found
  if (!translation) {
    // Only log in development to avoid console spam
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Translation missing for key: ${key} in ${currentLanguage}`);
    }
    translation = key;
  }
  
  // Replace parameters if provided
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      translation = translation.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value));
    });
  }
  
  return translation;
}

/**
 * Load translations for a specific language
 * @param lang Language code
 * @param translationData Dictionary of translations
 */
export function loadTranslations(lang: string, translationData: Record<string, string>): void {
  translations[lang] = {
    ...translations[lang],
    ...translationData
  };
}

/**
 * Default English translation keys for admin interface
 * These keys will be duplicated in the translation file with the actual translated text
 */
const defaultTranslations = {
  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.create': 'Create',
  'common.update': 'Update',
  'common.add': 'Add',
  'common.remove': 'Remove',
  'common.active': 'Active',
  'common.inactive': 'Inactive',
  'common.name': 'Name',
  'common.description': 'Description',
  'common.required': 'Required',
  'common.optional': 'Optional',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.enabled': 'Enabled',
  'common.disabled': 'Disabled',
  'common.settings': 'Settings',
  'common.preview': 'Preview',
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.success': 'Success',
  
  // Admin page
  'admin.title': 'Admin Panel',
  'admin.subtitle': 'Manage chat characters, image generation concepts, and categories',
  
  // Tabs
  'admin.tabs.personas': 'Chat Characters',
  'admin.tabs.categories': 'Chat Categories',
  'admin.tabs.concepts': 'Image Concepts',
  'admin.tabs.conceptCategories': 'Image Categories',
  'admin.tabs.abTesting': 'A/B Testing',
  
  // Personas
  'admin.personas.title': 'Chat Characters',
  'admin.personas.add': 'Add New Character',
  'admin.personas.edit': 'Edit Character',
  'admin.personas.delete': 'Delete Character',
  'admin.personas.deleteConfirm': 'Are you sure you want to delete this character? This action cannot be undone.',
  'admin.personas.noResults': 'No characters found. Create your first character!',
  'admin.personas.batchImport': 'Batch Import',
  
  // Categories
  'admin.categories.title': 'Categories',
  'admin.categories.add': 'Add New Category',
  'admin.categories.edit': 'Edit Category',
  'admin.categories.delete': 'Delete Category',
  'admin.categories.deleteConfirm': 'Are you sure you want to delete this category? This action cannot be undone.',
  'admin.categories.noResults': 'No categories found. Create your first category!',
  
  // Concepts
  'admin.concepts.title': 'Image Generation Concepts',
  'admin.concepts.add': 'Add New Concept',
  'admin.concepts.edit': 'Edit Concept',
  'admin.concepts.delete': 'Delete Concept',
  'admin.concepts.deleteConfirm': 'Are you sure you want to delete this concept? This action cannot be undone and may affect associated images.',
  'admin.concepts.noResults': 'No concepts found. Create your first concept!',
  'admin.concepts.promptTemplate': 'Prompt Template',
  'admin.concepts.promptTemplateTip': 'Use double curly braces {{variable_name}} to define variables that will be replaced.',
  'admin.concepts.promptPreview': 'Prompt Preview',
  'admin.concepts.showPreview': 'Show Preview',
  'admin.concepts.hidePreview': 'Hide Preview',
  'admin.concepts.customizePreview': 'Customize Preview Values:',
  
  // Concept Variables
  'admin.variables.title': 'Variables',
  'admin.variables.add': 'Add Variable',
  'admin.variables.edit': 'Edit Variable',
  'admin.variables.delete': 'Delete Variable',
  'admin.variables.name': 'Name',
  'admin.variables.nameTip': 'Use only letters, numbers, and underscores (e.g., baby_name, bg_color)',
  'admin.variables.type': 'Type',
  'admin.variables.typeTip': 'Controls how users will input this value',
  'admin.variables.description': 'Description',
  'admin.variables.descriptionTip': 'This will be shown to users as a tooltip or helper text',
  'admin.variables.options': 'Options',
  'admin.variables.optionsTip': 'Users will select from these options in a dropdown menu',
  'admin.variables.defaultValue': 'Default Value',
  'admin.variables.defaultValueTip': 'Optional pre-filled value for this variable',
  'admin.variables.required': 'Required field',
  'admin.variables.requiredTip': 'Users must provide a value for this field',
  'admin.variables.type.text': 'Text',
  'admin.variables.type.number': 'Number',
  'admin.variables.type.select': 'Select (Dropdown)',
  'admin.variables.type.boolean': 'Boolean (Yes/No)',
  'admin.variables.usedInPrompt': 'Used in Prompt',
  'admin.variables.unused': 'Unused',
  'admin.variables.noVariables': 'No variables defined. Add variables to make your concept customizable.',
  
  // A/B Testing
  'admin.abTesting.title': 'Coming Soon: A/B Testing For Image Prompts',
  'admin.abTesting.description': 'Track image performance by prompt variation. Compare different prompts for the same concept and see which performs better with your users.',
  'admin.abTesting.promptA': 'Prompt A',
  'admin.abTesting.promptADescription': 'Compare performance metrics for different prompt variations',
  'admin.abTesting.promptB': 'Prompt B',
  'admin.abTesting.promptBDescription': 'See which prompt generates images that users prefer',
};

// Load default English translations
loadTranslations('en', defaultTranslations);

// Create empty dictionary for Korean - will be filled by upload
loadTranslations('ko', {});

// Export a default empty function for use in JSX files
export default t;