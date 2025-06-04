// Background script for AI Tab Organizer

// Initialize the tab categorizers for background processing
let tabCategorizer;
let mlCategorizer;

// Load the TabCategorizer classes when needed
function loadCategorizers() {
  if (!tabCategorizer && typeof TabCategorizer !== 'undefined') {
    tabCategorizer = new TabCategorizer();
  }
  
  if (!mlCategorizer && typeof MLTabCategorizer !== 'undefined') {
    mlCategorizer = new MLTabCategorizer();
    
    // Load user categories from storage
    chrome.storage.local.get(['selectedCategories', 'userCategoryKeywords'], function(result) {
      if (result.selectedCategories) {
        result.selectedCategories.forEach(category => {
          const keywords = result.userCategoryKeywords && result.userCategoryKeywords[category] 
            ? result.userCategoryKeywords[category] 
            : [];
          mlCategorizer.addUserCategory(category, keywords, 1.2);
        });
      }
    });
  }
}

// Listen for installation
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // Set default categories
    const defaultCategories = ['Social', 'Shopping', 'Technology', 'News', 'Work'];
    chrome.storage.local.set({selectedCategories: defaultCategories});
    
    // Open onboarding page
    chrome.tabs.create({
      url: 'chrome-extension://' + chrome.runtime.id + '/popup.html'
    });
  }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // Check if auto-grouping is enabled
  if (changeInfo.status === 'complete') {
    chrome.storage.local.get(['autoGroupNewTabs'], function(result) {
      if (result.autoGroupNewTabs) {
        // Apply automatic categorization if enabled
        suggestTabCategory(tab);
      }
    });
  }
});

// Listen for tab creation
chrome.tabs.onCreated.addListener(function(tab) {
  // Check if auto-grouping is enabled for new tabs
  chrome.storage.local.get(['autoGroupNewTabs'], function(result) {
    if (result.autoGroupNewTabs) {
      // Wait for the tab to fully load before suggesting a category
      setTimeout(function() {
        chrome.tabs.get(tab.id, function(updatedTab) {
          if (updatedTab && !chrome.runtime.lastError) {
            suggestTabCategory(updatedTab);
          }
        });
      }, 1000);
    }
  });
});

// For future implementation: automatic grouping based on user patterns
chrome.tabs.onActivated.addListener(function(activeInfo) {
  // Track tab usage patterns for future ML implementation
});

// Suggest category for a tab using ML
function suggestTabCategory(tab) {
  loadCategorizers();
  
  if (mlCategorizer) {
    // Learn from current tabs
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      mlCategorizer.learn(tabs);
      
      // Get category prediction
      const prediction = mlCategorizer.categorizeTab(tab);
      
      // Store the prediction for potential use in the popup
      chrome.storage.local.set({
        [`tabPrediction_${tab.id}`]: {
          category: prediction.category,
          confidence: prediction.confidence,
          timestamp: Date.now()
        }
      });
      
      // Could show a notification with the prediction
      // chrome.notifications.create({
      //   type: 'basic',
      //   iconUrl: 'images/icon48.png',
      //   title: 'Tab Category Suggestion',
      //   message: `This tab might belong in the "${prediction.category}" group.`
      // });
    });
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getTabGroups') {
    chrome.tabGroups.query({windowId: chrome.windows.WINDOW_ID_CURRENT}, function(groups) {
      sendResponse({groups: groups});
    });
    return true; // Required for async response
  }
  
  if (request.action === 'categorizeTab') {
    loadCategorizers();
    
    if (request.useML && mlCategorizer) {
      chrome.tabs.query({currentWindow: true}, function(tabs) {
        mlCategorizer.learn(tabs);
        const prediction = mlCategorizer.categorizeTab(request.tab);
        sendResponse({prediction: prediction});
      });
    } else if (tabCategorizer) {
      const category = tabCategorizer.simpleTabCategorization(request.tab);
      sendResponse({category: category});
    } else {
      sendResponse({error: 'Tab categorizer not available'});
    }
    return true;
  }
  
  if (request.action === 'getPredictions') {
    loadCategorizers();
    
    if (mlCategorizer) {
      chrome.tabs.query({currentWindow: true}, function(tabs) {
        mlCategorizer.learn(tabs);
        const categorizedTabs = mlCategorizer.categorizeTabs(tabs);
        sendResponse({categorizedTabs: categorizedTabs});
      });
    } else {
      sendResponse({error: 'ML categorizer not available'});
    }
    return true;
  }
}); 