/**
 * ML-based Tab Categorizer
 * 
 * Uses TF-IDF (Term Frequency-Inverse Document Frequency) algorithm
 * to analyze and categorize tabs based on their content.
 */

class MLTabCategorizer {
  constructor() {
    // Predefined categories and their associated keywords with weights
    this.categories = {
      'Social': {
        keywords: [
          'facebook', 'twitter', 'instagram', 'linkedin', 'social', 'friend', 
          'profile', 'post', 'feed', 'follow', 'share', 'message', 'chat',
          'comment', 'like', 'reddit', 'community', 'discord', 'slack', 'whatsapp'
        ],
        weight: 1.0
      },
      'Shopping': {
        keywords: [
          'amazon', 'ebay', 'etsy', 'walmart', 'shop', 'store', 'buy', 'price',
          'product', 'cart', 'checkout', 'order', 'shipping', 'discount', 'deal',
          'purchase', 'sale', 'shopping', 'ecommerce', 'marketplace'
        ],
        weight: 1.0
      },
      'Technology': {
        keywords: [
          'github', 'stackoverflow', 'code', 'programming', 'developer', 'tech',
          'software', 'hardware', 'app', 'computer', 'gadget', 'digital', 'IT',
          'data', 'cloud', 'API', 'algorithm', 'javascript', 'python', 'mobile'
        ],
        weight: 1.0
      },
      'News': {
        keywords: [
          'news', 'article', 'report', 'headline', 'journalism', 'media', 'press',
          'breaking', 'latest', 'update', 'cnn', 'bbc', 'nytimes', 'reuters',
          'politics', 'economy', 'world', 'local', 'national', 'international'
        ],
        weight: 1.0
      },
      'Work': {
        keywords: [
          'docs', 'sheets', 'slides', 'office', 'excel', 'word', 'powerpoint',
          'notion', 'trello', 'jira', 'asana', 'project', 'task', 'meeting',
          'calendar', 'email', 'document', 'report', 'business', 'corporate'
        ],
        weight: 1.0
      },
      'Entertainment': {
        keywords: [
          'youtube', 'netflix', 'hulu', 'spotify', 'disney', 'movie', 'video',
          'music', 'stream', 'play', 'game', 'watch', 'listen', 'show', 'series',
          'entertainment', 'fun', 'leisure', 'hobby', 'podcast'
        ],
        weight: 1.0
      },
      'Travel': {
        keywords: [
          'travel', 'trip', 'vacation', 'flight', 'hotel', 'booking', 'airbnb',
          'expedia', 'map', 'destination', 'tour', 'guide', 'holiday', 'resort',
          'adventure', 'explore', 'journey', 'tourism', 'transportation', 'lodging'
        ],
        weight: 1.0
      },
      'Education': {
        keywords: [
          'learn', 'course', 'class', 'education', 'tutorial', 'study', 'school',
          'university', 'college', 'academy', 'lecture', 'lesson', 'training',
          'teach', 'student', 'knowledge', 'skill', 'degree', 'certificate', 'mooc'
        ],
        weight: 1.0
      },
      'Finance': {
        keywords: [
          'bank', 'finance', 'money', 'invest', 'stock', 'market', 'trading',
          'crypto', 'bitcoin', 'currency', 'economy', 'fund', 'loan', 'mortgage',
          'paypal', 'payment', 'transaction', 'wallet', 'credit', 'debit'
        ],
        weight: 1.0
      }
    };
    
    // User-defined categories and keywords
    this.userCategories = {};
    
    // Frequency data for IDF calculation
    this.documentFrequency = {};
    this.totalDocuments = 0;
    
    // Cached tab data
    this.tabsData = [];
  }
  
  /**
   * Add user-defined categories
   * @param {Object} categories - Map of category names to keywords
   * @param {number} weight - Weight factor for user categories (default: 1.2)
   */
  addUserCategories(categories, weight = 1.2) {
    Object.keys(categories).forEach(category => {
      this.userCategories[category] = {
        keywords: categories[category],
        weight: weight
      };
    });
  }
  
  /**
   * Add a single user-defined category
   * @param {string} category - Category name
   * @param {Array} keywords - Array of keywords
   * @param {number} weight - Weight factor for this category
   */
  addUserCategory(category, keywords = [], weight = 1.2) {
    // If no keywords provided, use the category name as the only keyword
    if (keywords.length === 0) {
      keywords = [category.toLowerCase()];
    }
    this.userCategories[category] = {
      keywords: keywords,
      weight: weight
    };
  }
  
  /**
   * Learn from a set of tabs to build document frequency data
   * @param {Array} tabs - Array of browser tabs
   */
  learn(tabs) {
    this.tabsData = tabs.map(tab => this.preprocessTab(tab));
    this.totalDocuments = this.tabsData.length;
    
    // Build document frequency for each term
    this.documentFrequency = {};
    
    this.tabsData.forEach(tabData => {
      // Track unique terms in this document
      const uniqueTerms = new Set();
      
      tabData.terms.forEach(term => {
        uniqueTerms.add(term);
      });
      
      // Update document frequency
      uniqueTerms.forEach(term => {
        if (!this.documentFrequency[term]) {
          this.documentFrequency[term] = 0;
        }
        this.documentFrequency[term]++;
      });
    });
  }
  
  /**
   * Preprocess a tab for analysis
   * @param {Object} tab - The browser tab object
   * @returns {Object} - Processed tab data
   */
  preprocessTab(tab) {
    // Extract text from tab
    const url = tab.url.toLowerCase();
    const title = tab.title.toLowerCase();
    const domain = this.extractDomain(url);
    
    // Combine and tokenize
    const text = `${title} ${domain} ${this.extractPathTerms(url)}`;
    const terms = this.tokenize(text);
    
    return {
      tab: tab,
      domain: domain,
      title: title,
      url: url,
      terms: terms
    };
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
   * Extract meaningful terms from URL path
   * @param {string} url - The tab's URL
   * @returns {string} - Processed path terms
   */
  extractPathTerms(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname
        .replace(/[\/\-_\.]/g, ' ')  // Replace separators with spaces
        .replace(/[0-9]/g, '')      // Remove numbers
        .toLowerCase();
    } catch (e) {
      return '';
    }
  }
  
  /**
   * Tokenize text into terms
   * @param {string} text - The text to tokenize
   * @returns {Array} - Array of terms
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Replace non-alphanumeric with space
      .split(/\s+/)              // Split on whitespace
      .filter(term => term.length > 2)  // Only terms with 3+ chars
      .filter(term => !this.isStopWord(term));  // Remove stop words
  }
  
  /**
   * Check if a term is a stop word
   * @param {string} term - The term to check
   * @returns {boolean} - True if stop word
   */
  isStopWord(term) {
    const stopWords = ['the', 'and', 'for', 'with', 'this', 'that', 'from', 'not', 'are', 'was', 'were', 'have', 'has'];
    return stopWords.includes(term);
  }
  
  /**
   * Calculate TF-IDF score for a term in a document
   * @param {string} term - The term
   * @param {Array} terms - All terms in the document
   * @returns {number} - TF-IDF score
   */
  calculateTfIdf(term, terms) {
    // Term frequency
    const tf = terms.filter(t => t === term).length / terms.length;
    
    // Inverse document frequency
    const idf = Math.log((this.totalDocuments + 1) / ((this.documentFrequency[term] || 0) + 1));
    
    return tf * idf;
  }
  
  /**
   * Categorize a tab using TF-IDF
   * @param {Object} tab - The browser tab object
   * @returns {Object} - Category with confidence score
   */
  categorizeTab(tab) {
    const tabData = this.preprocessTab(tab);
    const categories = {...this.categories, ...this.userCategories};
    
    let bestCategory = 'Other';
    let bestScore = 0;
    let scores = {};
    
    // Calculate score for each category
    Object.keys(categories).forEach(category => {
      const categoryData = categories[category];
      let score = 0;
      
      // Score based on keyword matches with TF-IDF
      categoryData.keywords.forEach(keyword => {
        if (tabData.terms.includes(keyword)) {
          score += this.calculateTfIdf(keyword, tabData.terms) * categoryData.weight;
        }
      });
      
      // Add score for domain match
      if (categoryData.keywords.some(keyword => tabData.domain.includes(keyword))) {
        score += 0.5 * categoryData.weight;
      }
      
      scores[category] = score;
      
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    });
    
    // If no good match, check if we can use domain grouping
    if (bestScore < 0.1) {
      bestCategory = tabData.domain || 'Other';
    }
    
    return {
      category: bestCategory,
      confidence: bestScore,
      scores: scores
    };
  }
  
  /**
   * Categorize multiple tabs at once
   * @param {Array} tabs - Array of browser tabs
   * @returns {Object} - Tabs grouped by category
   */
  categorizeTabs(tabs) {
    // Learn from all tabs first
    this.learn(tabs);
    
    const groupedTabs = {};
    
    // Categorize each tab
    tabs.forEach(tab => {
      const result = this.categorizeTab(tab);
      const category = result.category;
      
      if (!groupedTabs[category]) {
        groupedTabs[category] = [];
      }
      
      groupedTabs[category].push({
        tab: tab,
        confidence: result.confidence
      });
    });
    
    // Remove categories with only one tab
    Object.keys(groupedTabs).forEach(category => {
      if (groupedTabs[category].length < 2) {
        // Move to "Other" category
        if (!groupedTabs['Other']) {
          groupedTabs['Other'] = [];
        }
        groupedTabs['Other'].push(...groupedTabs[category]);
        delete groupedTabs[category];
      }
    });
    
    // If "Other" category has fewer than 2 tabs, remove it
    if (groupedTabs['Other'] && groupedTabs['Other'].length < 2) {
      delete groupedTabs['Other'];
    }
    
    return groupedTabs;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined') {
  module.exports = MLTabCategorizer;
} 