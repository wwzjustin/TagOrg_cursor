document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const autoGroupNewTabs = document.getElementById('autoGroupNewTabs');
  const showGroupsInPopup = document.getElementById('showGroupsInPopup');
  const preferMLCategorizer = document.getElementById('preferMLCategorizer');
  const mlConfidenceThreshold = document.getElementById('mlConfidenceThreshold');
  const confidenceValue = document.getElementById('confidenceValue');
  const userFeedbackEnabled = document.getElementById('userFeedbackEnabled');
  const newCategoryInput = document.getElementById('newCategory');
  const categoryKeywordsInput = document.getElementById('categoryKeywords');
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  const categoryList = document.getElementById('categoryList');
  const resetBtn = document.getElementById('resetBtn');
  const statusElement = document.getElementById('status');

  // Initialize tab categorizers
  const tabCategorizer = new TabCategorizer();
  const mlCategorizer = new MLTabCategorizer();

  // Load saved settings
  function loadSettings() {
    chrome.storage.local.get([
      'selectedCategories',
      'userCategoryKeywords',
      'autoGroupNewTabs',
      'showGroupsInPopup',
      'preferMLCategorizer',
      'mlConfidenceThreshold',
      'userFeedbackEnabled'
    ], function(result) {
      // Populate checkboxes
      autoGroupNewTabs.checked = result.autoGroupNewTabs || false;
      showGroupsInPopup.checked = result.showGroupsInPopup !== false; // Default to true
      preferMLCategorizer.checked = result.preferMLCategorizer || false;
      mlConfidenceThreshold.value = result.mlConfidenceThreshold || 50;
      confidenceValue.textContent = `${mlConfidenceThreshold.value}%`;
      userFeedbackEnabled.checked = result.userFeedbackEnabled || false;
      
      // Populate category list
      if (result.selectedCategories) {
        renderCategoryList(result.selectedCategories, result.userCategoryKeywords || {});
      }
    });
  }

  // Initial load
  loadSettings();

  // Save settings
  function saveSettings() {
    chrome.storage.local.get(['selectedCategories', 'userCategoryKeywords'], function(result) {
      const settings = {
        autoGroupNewTabs: autoGroupNewTabs.checked,
        showGroupsInPopup: showGroupsInPopup.checked,
        preferMLCategorizer: preferMLCategorizer.checked,
        mlConfidenceThreshold: parseInt(mlConfidenceThreshold.value),
        userFeedbackEnabled: userFeedbackEnabled.checked,
        selectedCategories: result.selectedCategories || [],
        userCategoryKeywords: result.userCategoryKeywords || {}
      };
      
      chrome.storage.local.set(settings, function() {
        showStatus('Settings saved successfully!', 'success');
      });
    });
  }

  // Event listeners for checkboxes
  autoGroupNewTabs.addEventListener('change', saveSettings);
  showGroupsInPopup.addEventListener('change', saveSettings);
  preferMLCategorizer.addEventListener('change', saveSettings);
  userFeedbackEnabled.addEventListener('change', saveSettings);
  
  // Event listener for confidence slider
  mlConfidenceThreshold.addEventListener('input', function() {
    confidenceValue.textContent = `${mlConfidenceThreshold.value}%`;
  });
  
  mlConfidenceThreshold.addEventListener('change', saveSettings);

  // Add new category
  addCategoryBtn.addEventListener('click', function() {
    const categoryName = newCategoryInput.value.trim();
    if (categoryName) {
      const keywords = categoryKeywordsInput.value
        .split(',')
        .map(keyword => keyword.trim().toLowerCase())
        .filter(keyword => keyword.length > 0);
      
      addCategory(categoryName, keywords);
      newCategoryInput.value = '';
      categoryKeywordsInput.value = '';
    }
  });

  // Reset all settings
  resetBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to reset all settings? This cannot be undone.')) {
      const defaultCategories = ['Social', 'Shopping', 'Technology', 'News', 'Work'];
      chrome.storage.local.set({
        selectedCategories: defaultCategories,
        userCategoryKeywords: {},
        autoGroupNewTabs: false,
        showGroupsInPopup: true,
        preferMLCategorizer: true,
        mlConfidenceThreshold: 50,
        userFeedbackEnabled: true
      }, function() {
        loadSettings();
        showStatus('All settings have been reset to default.', 'success');
      });
    }
  });

  // Add a category
  function addCategory(categoryName, keywords = []) {
    chrome.storage.local.get(['selectedCategories', 'userCategoryKeywords'], function(result) {
      const categories = result.selectedCategories || [];
      const categoryKeywords = result.userCategoryKeywords || {};
      
      if (!categories.includes(categoryName)) {
        categories.push(categoryName);
        categoryKeywords[categoryName] = keywords;
        
        chrome.storage.local.set({
          selectedCategories: categories,
          userCategoryKeywords: categoryKeywords
        }, function() {
          renderCategoryList(categories, categoryKeywords);
          
          // Also add to both categorizers for immediate use
          tabCategorizer.addUserCategory(categoryName, keywords);
          mlCategorizer.addUserCategory(categoryName, keywords, 1.2);
          
          showStatus(`Category "${categoryName}" added successfully!`, 'success');
        });
      } else {
        showStatus(`Category "${categoryName}" already exists.`, 'error');
      }
    });
  }

  // Delete a category
  function deleteCategory(categoryName) {
    chrome.storage.local.get(['selectedCategories', 'userCategoryKeywords'], function(result) {
      const categories = result.selectedCategories || [];
      const categoryKeywords = result.userCategoryKeywords || {};
      
      const index = categories.indexOf(categoryName);
      if (index !== -1) {
        categories.splice(index, 1);
        delete categoryKeywords[categoryName];
        
        chrome.storage.local.set({
          selectedCategories: categories,
          userCategoryKeywords: categoryKeywords
        }, function() {
          renderCategoryList(categories, categoryKeywords);
          showStatus(`Category "${categoryName}" deleted.`, 'success');
        });
      }
    });
  }

  // Render the category list
  function renderCategoryList(categories, categoryKeywords) {
    categoryList.innerHTML = '';
    
    categories.forEach(category => {
      const categoryItem = document.createElement('div');
      categoryItem.className = 'category-item';
      
      const keywords = categoryKeywords[category] || [];
      const keywordText = keywords.length > 0 ? `(${keywords.join(', ')})` : '';
      
      categoryItem.innerHTML = `
        <div>
          <strong>${category}</strong> 
          <span class="keywords">${keywordText}</span>
        </div>
        <button class="delete-btn" data-category="${category}">Delete</button>
      `;
      
      categoryList.appendChild(categoryItem);
    });
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', function() {
        const category = this.getAttribute('data-category');
        deleteCategory(category);
      });
    });
  }

  // Show status message
  function showStatus(message, type) {
    statusElement.textContent = message;
    statusElement.className = 'status ' + type;
    statusElement.style.display = 'block';
    
    setTimeout(function() {
      statusElement.style.display = 'none';
    }, 3000);
  }
}); 