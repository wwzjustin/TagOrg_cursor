/**
 * Tab Categorizer
 * 
 * A simple classification approach to categorize tabs based on their content.
 * This implementation uses keyword matching and basic scoring.
 */

class TabCategorizer {
  constructor() {
    // Predefined categories and their associated keywords
    this.categoryKeywords = {
      'Social': [
        'facebook', 'twitter', 'instagram', 'linkedin', 'social', 'friend', 
        'profile', 'post', 'feed', 'follow', 'share', 'message', 'chat',
        'comment', 'like', 'reddit', 'community', 'discord', 'slack', 'whatsapp'
      ],
      'Shopping': [
        'amazon', 'ebay', 'etsy', 'walmart', 'shop', 'store', 'buy', 'price',
        'product', 'cart', 'checkout', 'order', 'shipping', 'discount', 'deal',
        'purchase', 'sale', 'shopping', 'ecommerce', 'marketplace'
      ],
      'Technology': [
        'github', 'stackoverflow', 'code', 'programming', 'developer', 'tech',
        'software', 'hardware', 'app', 'computer', 'gadget', 'digital', 'IT',
        'data', 'cloud', 'API', 'algorithm', 'javascript', 'python', 'mobile'
      ],
      'News': [
        'news', 'article', 'report', 'headline', 'journalism', 'media', 'press',
        'breaking', 'latest', 'update', 'cnn', 'bbc', 'nytimes', 'reuters',
        'politics', 'economy', 'world', 'local', 'national', 'international'
      ],
      'Work': [
        'docs', 'sheets', 'slides', 'office', 'excel', 'word', 'powerpoint',
        'notion', 'trello', 'jira', 'asana', 'project', 'task', 'meeting',
        'calendar', 'email', 'document', 'report', 'business', 'corporate'
      ],
      'Entertainment': [
        'youtube', 'netflix', 'hulu', 'spotify', 'disney', 'movie', 'video',
        'music', 'stream', 'play', 'game', 'watch', 'listen', 'show', 'series',
        'entertainment', 'fun', 'leisure', 'hobby', 'podcast'
      ],
      'Travel': [
        'travel', 'trip', 'vacation', 'flight', 'hotel', 'booking', 'airbnb',
        'expedia', 'map', 'destination', 'tour', 'guide', 'holiday', 'resort',
        'adventure', 'explore', 'journey', 'tourism', 'transportation', 'lodging'
      ]
    };

    // User-defined categories and keywords
    this.userCategories = {};
  }

  /**
   * Add user-defined categories
   * @param {Object} categories - Map of category names to keywords
   */
  addUserCategories(categories) {
    this.userCategories = {...this.userCategories, ...categories};
  }

  /**
   * Add a single user-defined category
   * @param {string} category - Category name
   * @param {Array} keywords - Array of keywords
   */
  addUserCategory(category, keywords = []) {
    // If no keywords provided, use the category name as the only keyword
    if (keywords.length === 0) {
      keywords = [category.toLowerCase()];
    }
    this.userCategories[category] = keywords;
  }

  /**
   * Extract domain from a URL
   * @param {string} url - The tab's URL
   * @returns {string} - Domain name
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (e) {
      return '';
    }
  }

  /**
   * Group tabs by domain
   * @param {Array} tabs - Array of browser tabs
   * @returns {Object} - Tabs grouped by domain
   */
  groupTabsByDomain(tabs) {
    const groupedTabs = {};
    
    tabs.forEach(tab => {
      const domain = this.extractDomain(tab.url);
      if (domain) {
        if (!groupedTabs[domain]) {
          groupedTabs[domain] = [];
        }
        groupedTabs[domain].push(tab);
      }
    });
    
    // Remove domains with only one tab
    Object.keys(groupedTabs).forEach(domain => {
      if (groupedTabs[domain].length < 2) {
        delete groupedTabs[domain];
      }
    });
    
    return groupedTabs;
  }

  /**
   * Match tabs by a specific term
   * @param {Array} tabs - Array of browser tabs
   * @param {string} term - Term to match
   * @returns {Array} - Tabs matching the term
   */
  findTabsByTerm(tabs, term) {
    if (!term) return [];
    
    const lowerTerm = term.toLowerCase();
    return tabs.filter(tab => {
      return tab.title.toLowerCase().includes(lowerTerm) || 
             tab.url.toLowerCase().includes(lowerTerm);
    });
  }

  /**
   * Categorize a tab based on simple keyword matching
   * @param {Object} tab - The browser tab object
   * @returns {string} - Best matching category
   */
  simpleTabCategorization(tab) {
    const url = tab.url.toLowerCase();
    const title = tab.title.toLowerCase();
    
    // Check for social media
    if (url.includes('facebook') || url.includes('twitter') || url.includes('instagram') || 
        url.includes('linkedin') || url.includes('reddit')) {
      return 'Social';
    } 
    // Check for shopping
    else if (url.includes('amazon') || url.includes('ebay') || url.includes('etsy') || 
             url.includes('walmart') || url.includes('shop')) {
      return 'Shopping';
    } 
    // Check for work/productivity
    else if (url.includes('docs.') || url.includes('sheets.') || url.includes('office') || 
             url.includes('notion') || url.includes('trello') || url.includes('jira')) {
      return 'Work';
    } 
    // Check for news
    else if (url.includes('news') || url.includes('bbc') || url.includes('cnn') || 
             url.includes('nytimes') || url.includes('reuters')) {
      return 'News';
    } 
    // Check for entertainment
    else if (url.includes('youtube') || url.includes('netflix') || url.includes('hulu') || 
             url.includes('spotify') || url.includes('disney')) {
      return 'Entertainment';
    } 
    // Check for technology
    else if (url.includes('github') || url.includes('stackoverflow') || url.includes('dev.') || 
             url.includes('tech') || url.includes('apple') || url.includes('google')) {
      return 'Technology';
    } 
    // Check for travel
    else if (url.includes('travel') || url.includes('booking') || url.includes('airbnb') || 
             url.includes('hotel') || url.includes('flight')) {
      return 'Travel';
    }
    
    // Default category if no match
    return 'Other';
  }

  /**
   * Group tabs by predefined categories
   * @param {Array} tabs - Array of browser tabs
   * @returns {Object} - Tabs grouped by category
   */
  groupTabsByCategory(tabs) {
    const groupedTabs = {
      'Social': [],
      'Shopping': [],
      'Work': [],
      'News': [],
      'Entertainment': [],
      'Technology': [],
      'Travel': [],
      'Other': []
    };
    
    // Add user categories
    Object.keys(this.userCategories).forEach(category => {
      groupedTabs[category] = [];
    });
    
    // Categorize each tab
    tabs.forEach(tab => {
      const category = this.simpleTabCategorization(tab);
      if (groupedTabs[category]) {
        groupedTabs[category].push(tab);
      } else {
        groupedTabs['Other'].push(tab);
      }
    });
    
    // Remove empty categories
    Object.keys(groupedTabs).forEach(category => {
      if (groupedTabs[category].length < 2) {
        delete groupedTabs[category];
      }
    });
    
    return groupedTabs;
  }

  /**
   * Group tabs by custom categories
   * @param {Array} tabs - Array of browser tabs
   * @param {Array} categories - Categories to use for grouping
   * @returns {Object} - Tabs grouped by custom category
   */
  groupTabsByCustomCategories(tabs, categories) {
    const groupedTabs = {};
    
    // Initialize categories
    categories.forEach(category => {
      groupedTabs[category] = [];
    });
    
    // Group tabs by matching categories
    tabs.forEach(tab => {
      const url = tab.url.toLowerCase();
      const title = tab.title.toLowerCase();
      
      categories.forEach(category => {
        const lowerCategory = category.toLowerCase();
        if (title.includes(lowerCategory) || url.includes(lowerCategory)) {
          groupedTabs[category].push(tab);
        }
      });
    });
    
    // Remove categories with only one tab
    Object.keys(groupedTabs).forEach(category => {
      if (groupedTabs[category].length < 2) {
        delete groupedTabs[category];
      }
    });
    
    return groupedTabs;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined') {
  module.exports = TabCategorizer;
} 