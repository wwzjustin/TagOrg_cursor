document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements - Navigation
  const navButtons = document.querySelectorAll('.nav-btn');
  const adminSections = document.querySelectorAll('.admin-section');
  
  // DOM Elements - Labels Section
  const labelSearch = document.getElementById('labelSearch');
  const labelTypeFilter = document.getElementById('labelTypeFilter');
  const allLabelsContainer = document.getElementById('allLabels');
  
  // DOM Elements - Groups Section
  const groupSearch = document.getElementById('groupSearch');
  const groupFilter = document.getElementById('groupFilter');
  const activeGroupsContainer = document.getElementById('activeGroups');
  
  // DOM Elements - Settings Section
  const globalMLThreshold = document.getElementById('globalMLThreshold');
  const thresholdValue = document.getElementById('thresholdValue');
  const enableGlobalML = document.getElementById('enableGlobalML');
  const maxCategories = document.getElementById('maxCategories');
  const resetCategoriesBtn = document.getElementById('resetCategoriesBtn');
  const newDefaultCategory = document.getElementById('newDefaultCategory');
  const addDefaultCategoryBtn = document.getElementById('addDefaultCategoryBtn');
  const defaultCategoriesList = document.getElementById('defaultCategoriesList');
  const retentionPeriod = document.getElementById('retentionPeriod');
  const clearAllDataBtn = document.getElementById('clearAllDataBtn');
  
  // DOM Elements - Notification
  const adminNotification = document.getElementById('adminNotification');
  
  // DOM Elements - Refresh
  const refreshDataBtn = document.getElementById('refreshDataBtn');
  
  // State
  let allLabels = [];
  let allGroups = [];
  let allWindows = [];
  let defaultCategories = [];
  let adminSettings = {};
  
  // Initial Load
  loadAllData();
  
  // Navigation Event Listeners
  navButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetSection = this.getAttribute('data-section');
      
      // Update active button
      navButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Show the target section
      adminSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === `${targetSection}-section`) {
          section.classList.add('active');
        }
      });
    });
  });
  
  // Labels Section Event Listeners
  labelSearch.addEventListener('input', filterLabels);
  labelTypeFilter.addEventListener('change', filterLabels);
  
  // Groups Section Event Listeners
  groupSearch.addEventListener('input', filterGroups);
  groupFilter.addEventListener('change', filterGroups);
  
  // Settings Section Event Listeners
  globalMLThreshold.addEventListener('input', function() {
    thresholdValue.textContent = `${this.value}%`;
  });
  
  globalMLThreshold.addEventListener('change', saveSettings);
  enableGlobalML.addEventListener('change', saveSettings);
  maxCategories.addEventListener('change', saveSettings);
  retentionPeriod.addEventListener('change', saveSettings);
  
  addDefaultCategoryBtn.addEventListener('click', function() {
    const category = newDefaultCategory.value.trim();
    if (category) {
      addDefaultCategory(category);
      newDefaultCategory.value = '';
    }
  });
  
  resetCategoriesBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to reset all user categories? This cannot be undone.')) {
      resetAllUserCategories();
    }
  });
  
  clearAllDataBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all user data? This will reset the extension completely and cannot be undone.')) {
      clearAllUserData();
    }
  });
  
  // Refresh Data Event Listener
  refreshDataBtn.addEventListener('click', loadAllData);
  
  // Functions
  function loadAllData() {
    loadLabels();
    loadGroups();
    loadSettings();
    loadMetrics(); // This function will be in admin-metrics.js
  }
  
  function loadLabels() {
    // Show loading state
    allLabelsContainer.innerHTML = '<div class="label-loading">Loading labels...</div>';
    
    // Get all labels from storage
    chrome.storage.local.get(['selectedCategories', 'userCategoryKeywords', 'mlGeneratedCategories'], function(result) {
      allLabels = [];
      
      // Predefined categories
      const predefinedCategories = [
        'Social', 'Shopping', 'Technology', 'News', 'Work', 
        'Entertainment', 'Travel', 'Education', 'Finance'
      ];
      
      predefinedCategories.forEach(category => {
        allLabels.push({
          name: category,
          type: 'predefined',
          usage: getUsageCount(category),
          keywords: []
        });
      });
      
      // User-created categories
      if (result.selectedCategories) {
        result.selectedCategories.forEach(category => {
          if (!predefinedCategories.includes(category)) {
            allLabels.push({
              name: category,
              type: 'user',
              usage: getUsageCount(category),
              keywords: result.userCategoryKeywords && result.userCategoryKeywords[category] 
                ? result.userCategoryKeywords[category] 
                : []
            });
          }
        });
      }
      
      // ML-generated categories
      if (result.mlGeneratedCategories) {
        Object.keys(result.mlGeneratedCategories).forEach(category => {
          if (!predefinedCategories.includes(category) && 
              (!result.selectedCategories || !result.selectedCategories.includes(category))) {
            allLabels.push({
              name: category,
              type: 'ml',
              usage: getUsageCount(category),
              keywords: result.mlGeneratedCategories[category].keywords || []
            });
          }
        });
      }
      
      renderLabels();
    });
  }
  
  function getUsageCount(category) {
    // This would be based on actual usage data
    // For now, generate a random number for demonstration
    return Math.floor(Math.random() * 50);
  }
  
  function renderLabels() {
    if (allLabels.length === 0) {
      allLabelsContainer.innerHTML = '<div class="label-loading">No labels found</div>';
      return;
    }
    
    let html = '';
    const filteredLabels = getFilteredLabels();
    
    filteredLabels.forEach(label => {
      html += `
        <div class="label-card">
          <div class="label-header">
            <div class="label-title">${label.name}</div>
            <div class="label-type ${label.type}">${label.type}</div>
          </div>
          <div class="label-stats">
            <div>Usage: ${label.usage} times</div>
            <div>Keywords: ${label.keywords.length > 0 ? label.keywords.join(', ') : 'None'}</div>
          </div>
        </div>
      `;
    });
    
    allLabelsContainer.innerHTML = html;
  }
  
  function getFilteredLabels() {
    const searchTerm = labelSearch.value.toLowerCase();
    const filterType = labelTypeFilter.value;
    
    return allLabels.filter(label => {
      const matchesSearch = label.name.toLowerCase().includes(searchTerm);
      const matchesType = filterType === 'all' || label.type === filterType;
      return matchesSearch && matchesType;
    });
  }
  
  function filterLabels() {
    renderLabels();
  }
  
  function loadGroups() {
    // Show loading state
    activeGroupsContainer.innerHTML = '<div class="group-loading">Loading groups...</div>';
    
    // Get all windows
    chrome.windows.getAll({ populate: true }, function(windows) {
      allWindows = windows;
      allGroups = [];
      
      // Populate the window filter
      populateWindowFilter();
      
      // Get tab groups for each window
      let windowsProcessed = 0;
      
      windows.forEach(window => {
        chrome.tabGroups.query({ windowId: window.id }, function(groups) {
          // Store groups with their tabs
          groups.forEach(group => {
            const groupTabs = window.tabs.filter(tab => tab.groupId === group.id);
            allGroups.push({
              id: group.id,
              windowId: window.id,
              title: group.title || 'Unnamed Group',
              color: group.color,
              isMLGenerated: group.title && group.title.endsWith(' (ML)'),
              tabs: groupTabs
            });
          });
          
          windowsProcessed++;
          if (windowsProcessed === windows.length) {
            renderGroups();
          }
        });
      });
      
      if (windows.length === 0) {
        activeGroupsContainer.innerHTML = '<div class="group-loading">No windows open</div>';
      }
    });
  }
  
  function populateWindowFilter() {
    groupFilter.innerHTML = '<option value="all">All Windows</option>';
    
    allWindows.forEach((window, index) => {
      groupFilter.innerHTML += `<option value="${window.id}">Window ${index + 1}</option>`;
    });
  }
  
  function renderGroups() {
    if (allGroups.length === 0) {
      activeGroupsContainer.innerHTML = '<div class="group-loading">No active groups found</div>';
      return;
    }
    
    let html = '';
    const filteredGroups = getFilteredGroups();
    
    filteredGroups.forEach(group => {
      const displayTitle = group.isMLGenerated ? group.title.replace(' (ML)', '') : group.title;
      
      html += `
        <div class="group-card">
          <div class="group-header">
            <div class="group-title">
              <div class="color-indicator" style="background-color: ${group.color}"></div>
              ${displayTitle}
              ${group.isMLGenerated ? '<span class="ml-badge">ML</span>' : ''}
            </div>
            <div class="group-actions">
              <button class="secondary-btn view-group" data-group-id="${group.id}" data-window-id="${group.windowId}">Focus</button>
            </div>
          </div>
          <div>Window ${allWindows.findIndex(w => w.id === group.windowId) + 1} • ${group.tabs.length} tabs</div>
          <div class="group-tabs">
      `;
      
      // Add the first 5 tabs
      const displayTabs = group.tabs.slice(0, 5);
      displayTabs.forEach(tab => {
        html += `
          <div class="tab-chip" title="${tab.title}">
            <img src="${tab.favIconUrl || 'chrome://favicon'}" alt="">
            ${tab.title.length > 20 ? tab.title.substring(0, 20) + '...' : tab.title}
          </div>
        `;
      });
      
      // Add a "more" indicator if there are more tabs
      if (group.tabs.length > 5) {
        html += `<div class="tab-chip">+${group.tabs.length - 5} more</div>`;
      }
      
      html += `
          </div>
        </div>
      `;
    });
    
    activeGroupsContainer.innerHTML = html;
    
    // Add event listeners to the view buttons
    document.querySelectorAll('.view-group').forEach(button => {
      button.addEventListener('click', function() {
        const groupId = parseInt(this.getAttribute('data-group-id'));
        const windowId = parseInt(this.getAttribute('data-window-id'));
        
        // Focus the window and group
        chrome.windows.update(windowId, { focused: true }, function() {
          // Find a tab in the group and focus it
          const group = allGroups.find(g => g.id === groupId);
          if (group && group.tabs.length > 0) {
            chrome.tabs.update(group.tabs[0].id, { active: true });
          }
        });
      });
    });
  }
  
  function getFilteredGroups() {
    const searchTerm = groupSearch.value.toLowerCase();
    const filterWindowId = groupFilter.value;
    
    return allGroups.filter(group => {
      const matchesSearch = group.title.toLowerCase().includes(searchTerm) || 
                           group.tabs.some(tab => tab.title.toLowerCase().includes(searchTerm));
      const matchesWindow = filterWindowId === 'all' || group.windowId === parseInt(filterWindowId);
      return matchesSearch && matchesWindow;
    });
  }
  
  function filterGroups() {
    renderGroups();
  }
  
  function loadSettings() {
    chrome.storage.local.get([
      'adminSettings',
      'selectedCategories'
    ], function(result) {
      // Load admin settings
      adminSettings = result.adminSettings || {
        globalMLThreshold: 50,
        enableGlobalML: true,
        maxCategories: 20,
        retentionPeriod: 30
      };
      
      // Apply settings to the UI
      globalMLThreshold.value = adminSettings.globalMLThreshold;
      thresholdValue.textContent = `${adminSettings.globalMLThreshold}%`;
      enableGlobalML.checked = adminSettings.enableGlobalML;
      maxCategories.value = adminSettings.maxCategories;
      retentionPeriod.value = adminSettings.retentionPeriod;
      
      // Load default categories
      defaultCategories = result.selectedCategories || [
        'Social', 'Shopping', 'Technology', 'News', 'Work'
      ];
      
      renderDefaultCategories();
    });
  }
  
  function renderDefaultCategories() {
    let html = '';
    
    defaultCategories.forEach(category => {
      html += `
        <div class="category-item">
          <span>${category}</span>
          <button class="remove-btn" data-category="${category}">×</button>
        </div>
      `;
    });
    
    defaultCategoriesList.innerHTML = html;
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.category-item .remove-btn').forEach(button => {
      button.addEventListener('click', function() {
        const category = this.getAttribute('data-category');
        removeDefaultCategory(category);
      });
    });
  }
  
  function addDefaultCategory(category) {
    if (!defaultCategories.includes(category)) {
      defaultCategories.push(category);
      saveDefaultCategories();
      renderDefaultCategories();
      showNotification('Category added to defaults', 'success');
    } else {
      showNotification('Category already exists', 'warning');
    }
  }
  
  function removeDefaultCategory(category) {
    defaultCategories = defaultCategories.filter(cat => cat !== category);
    saveDefaultCategories();
    renderDefaultCategories();
    showNotification('Category removed from defaults', 'success');
  }
  
  function saveDefaultCategories() {
    chrome.storage.local.set({ selectedCategories: defaultCategories });
  }
  
  function saveSettings() {
    adminSettings.globalMLThreshold = parseInt(globalMLThreshold.value);
    adminSettings.enableGlobalML = enableGlobalML.checked;
    adminSettings.maxCategories = parseInt(maxCategories.value);
    adminSettings.retentionPeriod = parseInt(retentionPeriod.value);
    
    chrome.storage.local.set({ adminSettings: adminSettings }, function() {
      showNotification('Settings saved successfully', 'success');
    });
  }
  
  function resetAllUserCategories() {
    chrome.storage.local.get(['selectedCategories'], function(result) {
      // Keep only the default categories
      const predefinedCategories = [
        'Social', 'Shopping', 'Technology', 'News', 'Work', 
        'Entertainment', 'Travel', 'Education', 'Finance'
      ];
      
      const newCategories = result.selectedCategories.filter(cat => 
        predefinedCategories.includes(cat) || defaultCategories.includes(cat)
      );
      
      chrome.storage.local.set({
        selectedCategories: newCategories,
        userCategoryKeywords: {}
      }, function() {
        showNotification('All user categories have been reset', 'success');
        loadLabels();
      });
    });
  }
  
  function clearAllUserData() {
    chrome.storage.local.clear(function() {
      // Reset to default settings
      chrome.storage.local.set({
        selectedCategories: ['Social', 'Shopping', 'Technology', 'News', 'Work'],
        adminSettings: {
          globalMLThreshold: 50,
          enableGlobalML: true,
          maxCategories: 20,
          retentionPeriod: 30
        }
      }, function() {
        showNotification('All user data has been cleared', 'success');
        loadAllData();
      });
    });
  }
  
  function showNotification(message, type = 'default') {
    adminNotification.textContent = message;
    adminNotification.className = `admin-notification ${type}`;
    adminNotification.classList.add('show');
    
    setTimeout(function() {
      adminNotification.classList.remove('show');
    }, 3000);
  }
}); 