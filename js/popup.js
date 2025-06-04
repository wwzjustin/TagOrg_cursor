document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const categoriesInput = document.getElementById('categoriesInput');
  const selectedCategoriesContainer = document.getElementById('selectedCategories');
  const aiGroupBtn = document.getElementById('aiGroupBtn');
  const manualGroupBtn = document.getElementById('manualGroupBtn');
  const ungroupAllBtn = document.getElementById('ungroupAllBtn');
  const tabGroupsContainer = document.getElementById('tabGroups');

  // Add Undo button to action buttons
  const actionButtons = document.querySelector('.action-buttons');
  const undoBtn = document.createElement('button');
  undoBtn.id = 'undoBtn';
  undoBtn.className = 'secondary-btn';
  undoBtn.textContent = 'Undo';
  undoBtn.disabled = true;
  
  // Add the button after AI Group button
  aiGroupBtn.insertAdjacentElement('afterend', undoBtn);

  // Initialize tab categorizers
  const tabCategorizer = new TabCategorizer();
  const mlCategorizer = new MLTabCategorizer();

  // State
  let selectedCategories = [];
  let currentTabGroups = [];
  let allTabs = [];
  let isMLGroupingActive = false;
  
  // Action history for undo
  let actionHistory = [];
  let currentHistoryIndex = -1;
  const MAX_HISTORY_SIZE = 10;

  // Load saved categories from storage
  chrome.storage.local.get(['selectedCategories', 'userCategoryKeywords', 'tabGroupHistory'], function(result) {
    if (result.selectedCategories) {
      selectedCategories = result.selectedCategories;
      renderSelectedCategories();
      
      // Add categories to ML categorizer with any saved keywords
      if (result.userCategoryKeywords) {
        Object.keys(result.userCategoryKeywords).forEach(category => {
          mlCategorizer.addUserCategory(category, result.userCategoryKeywords[category], 1.2);
        });
      }
    }
    
    // Load action history if available
    if (result.tabGroupHistory) {
      actionHistory = result.tabGroupHistory;
      currentHistoryIndex = actionHistory.length - 1;
      updateUndoButtonState();
    }
  });

  // Get current tabs and groups
  function loadCurrentState() {
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      allTabs = tabs;
      
      chrome.tabGroups.query({windowId: chrome.windows.WINDOW_ID_CURRENT}, function(groups) {
        currentTabGroups = groups;
        renderTabGroups();
      });
    });
  }

  // Initial load
  loadCurrentState();

  // Event Listeners
  categoriesInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && categoriesInput.value.trim()) {
      addCategory(categoriesInput.value.trim());
      categoriesInput.value = '';
    }
  });

  aiGroupBtn.addEventListener('click', function() {
    showAIGroupDialog();
  });

  manualGroupBtn.addEventListener('click', function() {
    showManualGroupDialog();
  });

  ungroupAllBtn.addEventListener('click', function() {
    // Save current state before ungrouping
    saveStateToHistory();
    ungroupAllTabs();
  });
  
  undoBtn.addEventListener('click', function() {
    undoLastAction();
  });

  // Functions
  function addCategory(category, keywords = []) {
    if (!selectedCategories.includes(category)) {
      selectedCategories.push(category);
      
      // Add to both categorizers
      tabCategorizer.addUserCategory(category, keywords);
      mlCategorizer.addUserCategory(category, keywords, 1.2);
      
      // Save keywords if provided
      if (keywords.length > 0) {
        chrome.storage.local.get(['userCategoryKeywords'], function(result) {
          const userCategoryKeywords = result.userCategoryKeywords || {};
          userCategoryKeywords[category] = keywords;
          chrome.storage.local.set({userCategoryKeywords: userCategoryKeywords});
        });
      }
      
      renderSelectedCategories();
      saveCategories();
    }
  }

  function removeCategory(category) {
    selectedCategories = selectedCategories.filter(cat => cat !== category);
    renderSelectedCategories();
    saveCategories();
  }

  function saveCategories() {
    chrome.storage.local.set({selectedCategories: selectedCategories});
  }

  function renderSelectedCategories() {
    selectedCategoriesContainer.innerHTML = '';
    
    selectedCategories.forEach(category => {
      const categoryTag = document.createElement('div');
      categoryTag.className = 'category-tag';
      categoryTag.innerHTML = `
        ${category}
        <span class="remove" data-category="${category}">×</span>
      `;
      selectedCategoriesContainer.appendChild(categoryTag);
    });

    // Add event listeners for removal
    document.querySelectorAll('.category-tag .remove').forEach(el => {
      el.addEventListener('click', function() {
        removeCategory(this.getAttribute('data-category'));
      });
    });
  }

  function renderTabGroups() {
    tabGroupsContainer.innerHTML = '';
    
    // Get tabs in each group
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      
      // Group tabs by groupId
      const tabsByGroup = {};
      tabs.forEach(tab => {
        if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
          if (!tabsByGroup[tab.groupId]) {
            tabsByGroup[tab.groupId] = [];
          }
          tabsByGroup[tab.groupId].push(tab);
        }
      });
      
      // Create group elements
      Object.keys(tabsByGroup).forEach(groupId => {
        const group = currentTabGroups.find(g => g.id === parseInt(groupId));
        if (group) {
          const groupElement = createTabGroupElement(group, tabsByGroup[groupId]);
          tabGroupsContainer.appendChild(groupElement);
        }
      });
    });
  }

  function createTabGroupElement(group, tabs) {
    const groupElement = document.createElement('div');
    groupElement.className = 'tab-group';
    
    // Add ML badge if this was created by ML
    const isMLGroup = group.title.endsWith(' (ML)');
    const displayTitle = isMLGroup ? group.title.replace(' (ML)', '') : group.title;
    
    const headerHTML = `
      <div class="tab-group-header">
        <div class="tab-group-title">
          <div class="icon" style="background-color: ${group.color || '#ccc'}"></div>
          ${displayTitle || 'Unnamed Group'}
          ${isMLGroup ? '<span class="ml-badge">ML</span>' : ''}
          ${isMLGroup ? '<button class="feedback-btn" title="Provide feedback" data-group-id="' + group.id + '">⭐</button>' : ''}
        </div>
        <div class="tab-group-actions">
          <button class="secondary-btn rename-group" data-group-id="${group.id}">Rename</button>
          <button class="secondary-btn ungroup" data-group-id="${group.id}">Ungroup</button>
        </div>
      </div>
    `;
    
    let tabsHTML = '<div class="tab-list">';
    tabs.forEach(tab => {
      tabsHTML += `
        <div class="tab-item" data-tab-id="${tab.id}">
          <img class="favicon" src="${tab.favIconUrl || 'chrome://favicon'}" alt="">
          <div class="title">${tab.title}</div>
          <div class="close" data-tab-id="${tab.id}">×</div>
        </div>
      `;
    });
    tabsHTML += '</div>';
    
    groupElement.innerHTML = headerHTML + tabsHTML;
    
    // Add event listeners
    setTimeout(() => {
      // Rename group
      groupElement.querySelector('.rename-group').addEventListener('click', function() {
        const groupId = parseInt(this.getAttribute('data-group-id'));
        const currentTitle = isMLGroup ? displayTitle : group.title;
        const newTitle = prompt('Enter new group name:', currentTitle);
        if (newTitle !== null) {
          // Save current state before renaming
          saveStateToHistory();
          
          chrome.tabGroups.update(groupId, {title: newTitle}, function() {
            loadCurrentState();
          });
        }
      });
      
      // Ungroup tabs
      groupElement.querySelector('.ungroup').addEventListener('click', function() {
        const groupId = parseInt(this.getAttribute('data-group-id'));
        const tabIds = tabs.map(tab => tab.id);
        
        // Save current state before ungrouping
        saveStateToHistory();
        
        chrome.tabs.ungroup(tabIds, function() {
          loadCurrentState();
        });
      });
      
      // Feedback button for ML groups
      if (isMLGroup) {
        groupElement.querySelector('.feedback-btn').addEventListener('click', function() {
          const groupId = parseInt(this.getAttribute('data-group-id'));
          showFeedbackDialog(group, tabs);
        });
      }
      
      // Close tab
      groupElement.querySelectorAll('.tab-item .close').forEach(el => {
        el.addEventListener('click', function(e) {
          e.stopPropagation();
          const tabId = parseInt(this.getAttribute('data-tab-id'));
          chrome.tabs.remove(tabId, function() {
            loadCurrentState();
          });
        });
      });
      
      // Click on tab to activate
      groupElement.querySelectorAll('.tab-item').forEach(el => {
        el.addEventListener('click', function() {
          const tabId = parseInt(this.getAttribute('data-tab-id'));
          chrome.tabs.update(tabId, {active: true});
        });
      });
    }, 0);
    
    return groupElement;
  }

  // AI Grouping Dialog
  function showAIGroupDialog() {
    isMLGroupingActive = true;
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      // Use ML categorizer to generate suggestions
      mlCategorizer.learn(tabs);
      const categorizedTabs = mlCategorizer.categorizeTabs(tabs);
      
      // Create the dialog
      const overlay = document.createElement('div');
      overlay.className = 'overlay';
      
      const dialog = document.createElement('div');
      dialog.className = 'ai-group-dialog';
      
      let dialogHTML = `
        <h2>AI Tab Grouping</h2>
        <p>The AI suggests the following groups based on your open tabs:</p>
        <div class="ai-suggestions">
      `;
      
      // Generate suggestions UI
      Object.keys(categorizedTabs).forEach(category => {
        const tabCount = categorizedTabs[category].length;
        
        dialogHTML += `
          <div class="suggestion-group">
            <div class="suggestion-header">
              <input type="checkbox" id="category-${category}" data-category="${category}" checked>
              <div class="category-name">
                <label for="category-${category}">${category}</label>
                <input type="text" class="category-rename" data-category="${category}" value="${category}">
              </div>
              <span class="tab-count"><span class="tab-count-value" data-category="${category}">${tabCount}</span> tabs</span>
              <div class="confidence-indicator" style="width: ${Math.min(categorizedTabs[category][0].confidence * 100, 100)}%"></div>
            </div>
            <div class="suggestion-tabs" data-category="${category}">
        `;
        
        // Add tab previews with delete buttons
        categorizedTabs[category].forEach(item => {
          const tab = item.tab;
          dialogHTML += `
            <div class="tab-preview" title="${tab.title}" data-tab-id="${tab.id}">
              <img src="${tab.favIconUrl || 'chrome://favicon'}" alt="">
              <span>${tab.title.length > 30 ? tab.title.substring(0, 30) + '...' : tab.title}</span>
              <button class="remove-tab-btn" data-tab-id="${tab.id}" data-category="${category}">×</button>
            </div>
          `;
        });
        
        dialogHTML += `
            </div>
          </div>
        `;
      });
      
      dialogHTML += `
        </div>
        <div class="ai-dialog-controls">
          <button id="applyGroupsBtn" class="primary-btn">Apply Groups</button>
          <button id="cancelGroupingBtn" class="secondary-btn">Cancel</button>
        </div>
      `;
      
      dialog.innerHTML = dialogHTML;
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      
      // Add event listeners for tab removal
      dialog.querySelectorAll('.remove-tab-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const tabId = parseInt(this.getAttribute('data-tab-id'));
          const category = this.getAttribute('data-category');
          
          // Remove the tab from the categorizedTabs data
          categorizedTabs[category] = categorizedTabs[category].filter(item => item.tab.id !== tabId);
          
          // Remove the tab preview element
          const tabPreview = this.closest('.tab-preview');
          tabPreview.remove();
          
          // Update the tab count
          const tabCountEl = dialog.querySelector(`.suggestion-group .suggestion-header .tab-count-value[data-category="${category}"]`);
          if (tabCountEl) {
            const newCount = categorizedTabs[category].length;
            tabCountEl.textContent = newCount;
          }
          
          // If there's only 0 or 1 tab left, disable the checkbox
          if (categorizedTabs[category].length < 2) {
            const checkbox = dialog.querySelector(`#category-${category}`);
            if (checkbox) {
              checkbox.checked = false;
              checkbox.disabled = true;
            }
          }
        });
      });
      
      // Add event listeners for apply/cancel
      dialog.querySelector('#applyGroupsBtn').addEventListener('click', function() {
        // Save current state before applying AI groups
        saveStateToHistory();
        
        // Get selected categories and their new names
        const selectedCategories = {};
        dialog.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
          const category = checkbox.getAttribute('data-category');
          // Skip categories with fewer than 2 tabs
          if (categorizedTabs[category].length < 2) return;
          
          const renameInput = dialog.querySelector(`.category-rename[data-category="${category}"]`);
          const newName = renameInput.value.trim();
          
          if (newName) {
            selectedCategories[category] = newName;
          }
        });
        
        // Apply the groups
        applyAIGroups(categorizedTabs, selectedCategories);
        
        // Close dialog
        document.body.removeChild(overlay);
      });
      
      dialog.querySelector('#cancelGroupingBtn').addEventListener('click', function() {
        document.body.removeChild(overlay);
      });
    });
  }

  function applyAIGroups(categorizedTabs, selectedCategories) {
    // Keep track of processed tabs to avoid duplicates
    const processedTabIds = new Set();
    
    // Sort categories by tab count (largest first) to prioritize larger groups
    const sortedCategories = Object.keys(selectedCategories)
      .filter(category => categorizedTabs[category] && categorizedTabs[category].length > 1)
      .sort((a, b) => categorizedTabs[b].length - categorizedTabs[a].length);
    
    // Count of groups actually created
    let groupsCreated = 0;
    
    // Create tab groups based on ML suggestions, starting with the largest groups
    sortedCategories.forEach(category => {
      // Filter out tabs that have already been processed
      const unprocessedTabs = categorizedTabs[category].filter(item => !processedTabIds.has(item.tab.id));
      
      // Skip if not enough tabs left after filtering
      if (unprocessedTabs.length < 2) return;
      
      // Mark these tabs as processed
      unprocessedTabs.forEach(item => processedTabIds.add(item.tab.id));
      
      const tabIds = unprocessedTabs.map(item => item.tab.id);
      const newName = selectedCategories[category];
      
      chrome.tabs.group({tabIds: tabIds}, function(groupId) {
        chrome.tabGroups.update(groupId, {
          // Add (ML) suffix to identify ML-generated groups
          title: `${newName} (ML)`,
          color: getRandomColor()
        }, function() {
          loadCurrentState();
        });
      });
      
      groupsCreated++;
    });
    
    // Track the action for metrics - use the actual count of groups created
    if (groupsCreated > 0) {
      trackGroupingAction('ai', groupsCreated);
    }
  }

  // Tab organization functions using the simple categorizer
  function organizeTabsByCategory() {
    // Add user-defined categories to the categorizer
    selectedCategories.forEach(category => {
      tabCategorizer.addUserCategory(category);
    });

    chrome.tabs.query({currentWindow: true}, function(tabs) {
      // Use the tab categorizer to group tabs by basic categories
      const categorizedTabs = tabCategorizer.groupTabsByCategory(tabs);
      
      // Create tab groups for categories with more than 1 tab
      Object.keys(categorizedTabs).forEach(category => {
        if (categorizedTabs[category].length > 1) {
          const tabIds = categorizedTabs[category].map(tab => tab.id);
          
          chrome.tabs.group({tabIds: tabIds}, function(groupId) {
            chrome.tabGroups.update(groupId, {
              title: category,
              color: getRandomColor()
            }, function() {
              loadCurrentState();
            });
          });
        }
      });
    });
  }

  // Manual Group Dialog
  function showManualGroupDialog() {
    // Create and show the manual grouping dialog overlay
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'manual-group-dialog';
    
    // Get all current tabs
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      let dialogHTML = `
        <h2>Manual Tab Grouping</h2>
        <div class="manual-group-options">
          <div class="manual-group-method">
            <label>
              <input type="radio" name="groupMethod" value="domain" checked> Group by Domain
            </label>
            <label>
              <input type="radio" name="groupMethod" value="keyword"> Group by Keyword
            </label>
          </div>
          
          <div class="keyword-input" style="display: none;">
            <input type="text" id="keywordInput" placeholder="Enter keyword for grouping...">
          </div>
          
          <div class="domain-selector">
            <select id="domainSelector">
              <option value="">Select a domain...</option>
      `;
      
      // Extract unique domains
      const domains = {};
      tabs.forEach(tab => {
        try {
          const url = new URL(tab.url);
          const domain = url.hostname.replace('www.', '');
          if (domain && !domains[domain]) {
            domains[domain] = true;
            dialogHTML += `<option value="${domain}">${domain}</option>`;
          }
        } catch (e) {
          // Skip invalid URLs
        }
      });
      
      dialogHTML += `
            </select>
          </div>
        </div>
        
        <div class="manual-group-controls">
          <button id="createGroupBtn" class="primary-btn">Create Group</button>
          <button id="cancelBtn" class="secondary-btn">Cancel</button>
        </div>
      `;
      
      dialog.innerHTML = dialogHTML;
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      
      // Setup event listeners
      const methodRadios = dialog.querySelectorAll('input[name="groupMethod"]');
      const keywordInput = dialog.querySelector('.keyword-input');
      const domainSelector = dialog.querySelector('.domain-selector');
      
      methodRadios.forEach(radio => {
        radio.addEventListener('change', function() {
          if (this.value === 'domain') {
            keywordInput.style.display = 'none';
            domainSelector.style.display = 'block';
          } else {
            keywordInput.style.display = 'block';
            domainSelector.style.display = 'none';
          }
        });
      });
      
      // Handle create group button
      dialog.querySelector('#createGroupBtn').addEventListener('click', function() {
        // Save current state before creating group
        saveStateToHistory();
        
        const selectedMethod = dialog.querySelector('input[name="groupMethod"]:checked').value;
        
        if (selectedMethod === 'domain') {
          const selectedDomain = dialog.querySelector('#domainSelector').value;
          if (selectedDomain) {
            createGroupByDomain(selectedDomain, tabs);
          }
        } else {
          const keyword = dialog.querySelector('#keywordInput').value.trim();
          if (keyword) {
            createGroupByKeyword(keyword, tabs);
          }
        }
        
        // Close the dialog
        document.body.removeChild(overlay);
      });
      
      // Handle cancel button
      dialog.querySelector('#cancelBtn').addEventListener('click', function() {
        document.body.removeChild(overlay);
      });
    });
  }

  function createGroupByDomain(domain, tabs) {
    const matchingTabs = tabs.filter(tab => {
      try {
        const url = new URL(tab.url);
        return url.hostname.replace('www.', '') === domain;
      } catch (e) {
        return false;
      }
    });
    
    if (matchingTabs.length > 1) {
      const tabIds = matchingTabs.map(tab => tab.id);
      chrome.tabs.group({tabIds: tabIds}, function(groupId) {
        chrome.tabGroups.update(groupId, {
          title: domain,
          color: getRandomColor()
        }, function() {
          loadCurrentState();
        });
      });
      
      // Track the action for metrics
      trackGroupingAction('manual-domain', 1);
    }
  }

  function createGroupByKeyword(keyword, tabs) {
    const matchingTabs = tabs.filter(tab => {
      return tab.title.toLowerCase().includes(keyword.toLowerCase()) || 
             tab.url.toLowerCase().includes(keyword.toLowerCase());
    });
    
    if (matchingTabs.length > 1) {
      const tabIds = matchingTabs.map(tab => tab.id);
      chrome.tabs.group({tabIds: tabIds}, function(groupId) {
        chrome.tabGroups.update(groupId, {
          title: keyword,
          color: getRandomColor()
        }, function() {
          loadCurrentState();
        });
      });
      
      // Track the action for metrics
      trackGroupingAction('manual-keyword', 1);
    } else {
      alert('Not enough tabs match this keyword. Groups need at least 2 tabs.');
    }
  }

  function ungroupAllTabs() {
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      const tabIds = tabs.map(tab => tab.id);
      chrome.tabs.ungroup(tabIds, function() {
        loadCurrentState();
      });
      
      // Track the action for metrics
      trackGroupingAction('ungroup-all', 1);
    });
  }
  
  // History and Undo Functions
  
  function saveStateToHistory() {
    // Get current state of tabs and groups
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      chrome.tabGroups.query({windowId: chrome.windows.WINDOW_ID_CURRENT}, function(groups) {
        // Create a snapshot of the current state
        const snapshot = {
          timestamp: Date.now(),
          tabs: tabs.map(tab => ({
            id: tab.id,
            url: tab.url,
            title: tab.title,
            groupId: tab.groupId
          })),
          groups: groups.map(group => ({
            id: group.id,
            title: group.title,
            color: group.color
          }))
        };
        
        // Add to history, removing oldest items if needed
        if (currentHistoryIndex < actionHistory.length - 1) {
          // If we're not at the end of the history, remove future states
          actionHistory = actionHistory.slice(0, currentHistoryIndex + 1);
        }
        
        actionHistory.push(snapshot);
        
        // Limit history size
        if (actionHistory.length > MAX_HISTORY_SIZE) {
          actionHistory.shift();
        }
        
        currentHistoryIndex = actionHistory.length - 1;
        
        // Save history to storage
        chrome.storage.local.set({tabGroupHistory: actionHistory});
        
        // Update undo button state
        updateUndoButtonState();
      });
    });
  }
  
  function undoLastAction() {
    if (currentHistoryIndex <= 0) {
      return; // No history to undo
    }
    
    // Move back one step in history
    currentHistoryIndex--;
    const previousState = actionHistory[currentHistoryIndex];
    
    // First ungroup all tabs
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      const tabIds = tabs.map(tab => tab.id);
      chrome.tabs.ungroup(tabIds, function() {
        // Then recreate groups from history
        restoreGroupsFromSnapshot(previousState);
      });
    });
    
    // Update undo button state
    updateUndoButtonState();
  }
  
  function restoreGroupsFromSnapshot(snapshot) {
    // Maps to keep track of tab ID changes
    const tabIdMap = {};
    
    // First, get current tabs to map by URL
    chrome.tabs.query({currentWindow: true}, function(currentTabs) {
      // Create a mapping from URLs to current tab IDs
      const urlToTabId = {};
      currentTabs.forEach(tab => {
        urlToTabId[tab.url] = tab.id;
      });
      
      // Group the tabs according to the snapshot
      const groupsToCreate = {};
      
      snapshot.tabs.forEach(historyTab => {
        if (historyTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
          // If we have this URL in the current tabs
          if (urlToTabId[historyTab.url]) {
            const currentTabId = urlToTabId[historyTab.url];
            if (!groupsToCreate[historyTab.groupId]) {
              groupsToCreate[historyTab.groupId] = [];
            }
            groupsToCreate[historyTab.groupId].push(currentTabId);
          }
        }
      });
      
      // Create each group
      Object.keys(groupsToCreate).forEach(historyGroupId => {
        const tabIds = groupsToCreate[historyGroupId];
        if (tabIds.length > 0) {
          // Find the group in the snapshot
          const groupInfo = snapshot.groups.find(g => g.id === parseInt(historyGroupId));
          
          if (groupInfo) {
            chrome.tabs.group({tabIds: tabIds}, function(newGroupId) {
              chrome.tabGroups.update(newGroupId, {
                title: groupInfo.title,
                color: groupInfo.color
              });
            });
          }
        }
      });
      
      // Refresh UI after a delay to ensure all operations complete
      setTimeout(loadCurrentState, 500);
    });
  }
  
  function updateUndoButtonState() {
    undoBtn.disabled = currentHistoryIndex <= 0;
  }
  
  // Metrics tracking
  function trackGroupingAction(actionType, count) {
    chrome.storage.local.get(['metrics'], function(result) {
      const metrics = result.metrics || {
        groupingActions: {},
        aiGroupsCreated: 0,
        manualGroupsCreated: 0,
        totalUngroupActions: 0,
        lastUpdated: Date.now()
      };
      
      // Update metrics
      if (!metrics.groupingActions[actionType]) {
        metrics.groupingActions[actionType] = 0;
      }
      metrics.groupingActions[actionType] += count;
      
      // Update specific counters
      if (actionType.startsWith('ai')) {
        metrics.aiGroupsCreated += count;
      } else if (actionType.startsWith('manual')) {
        metrics.manualGroupsCreated += count;
      } else if (actionType.startsWith('ungroup')) {
        metrics.totalUngroupActions += count;
      }
      
      metrics.lastUpdated = Date.now();
      
      // Save updated metrics
      chrome.storage.local.set({metrics: metrics});
    });
  }

  // Helper functions
  function getRandomColor() {
    const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Feedback Dialog Functions
  function showFeedbackDialog(group, tabs) {
    const feedbackDialog = document.getElementById('feedbackDialog');
    const betterCategoryInput = document.getElementById('betterCategory');
    const feedbackCommentsInput = document.getElementById('feedbackComments');
    const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
    const cancelFeedbackBtn = document.getElementById('cancelFeedbackBtn');
    
    // Reset form
    document.querySelector('input[name="helpful"][value="yes"]').checked = true;
    betterCategoryInput.value = '';
    feedbackCommentsInput.value = '';
    
    // Set current group data as a data attribute
    feedbackDialog.setAttribute('data-group-id', group.id);
    
    // Pre-fill with the current category name
    const displayTitle = group.title.replace(' (ML)', '');
    betterCategoryInput.value = displayTitle;
    
    // Show dialog
    feedbackDialog.classList.add('show');
    
    // Handle submit button
    const handleSubmit = function() {
      const isHelpful = document.querySelector('input[name="helpful"]:checked').value === 'yes';
      const betterCategory = betterCategoryInput.value.trim();
      const comments = feedbackCommentsInput.value.trim();
      
      submitFeedback(group, tabs, isHelpful, betterCategory, comments);
      feedbackDialog.classList.remove('show');
      
      // Remove event listeners
      submitFeedbackBtn.removeEventListener('click', handleSubmit);
      cancelFeedbackBtn.removeEventListener('click', handleCancel);
    };
    
    // Handle cancel button
    const handleCancel = function() {
      feedbackDialog.classList.remove('show');
      
      // Remove event listeners
      submitFeedbackBtn.removeEventListener('click', handleSubmit);
      cancelFeedbackBtn.removeEventListener('click', handleCancel);
    };
    
    // Add event listeners
    submitFeedbackBtn.addEventListener('click', handleSubmit);
    cancelFeedbackBtn.addEventListener('click', handleCancel);
  }

  function submitFeedback(group, tabs, isHelpful, betterCategory, comments) {
    // Create feedback object
    const feedback = {
      timestamp: Date.now(),
      groupId: group.id,
      originalCategory: group.title.replace(' (ML)', ''),
      isHelpful: isHelpful,
      suggestedCategory: betterCategory,
      comments: comments,
      tabCount: tabs.length,
      tabSample: tabs.slice(0, 3).map(tab => ({
        title: tab.title,
        url: tab.url
      }))
    };
    
    // Save feedback to storage
    chrome.storage.local.get(['mlFeedback'], function(result) {
      const mlFeedback = result.mlFeedback || [];
      mlFeedback.push(feedback);
      
      chrome.storage.local.set({mlFeedback: mlFeedback}, function() {
        // Show confirmation message
        showNotification('Thank you for your feedback!');
        
        // If not helpful and a better category was provided, add it to user categories
        if (!isHelpful && betterCategory && betterCategory !== feedback.originalCategory) {
          addCategory(betterCategory);
          
          // Use the feedback to improve ML categorizer
          updateMLCategorizerWithFeedback(feedback, tabs);
        }
      });
    });
  }

  function updateMLCategorizerWithFeedback(feedback, tabs) {
    // Extract keywords from the tabs
    const keywords = [];
    tabs.forEach(tab => {
      // Extract words from title
      const titleWords = tab.title.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      // Add unique words to keywords
      titleWords.forEach(word => {
        if (!keywords.includes(word)) {
          keywords.push(word);
        }
      });
    });
    
    // Limit to top 5 keywords
    const topKeywords = keywords.slice(0, 5);
    
    // Add the category with these keywords
    if (topKeywords.length > 0) {
      // Add to ML categorizer
      mlCategorizer.addUserCategory(feedback.suggestedCategory, topKeywords, 1.5);
      
      // Save keywords to storage
      chrome.storage.local.get(['userCategoryKeywords'], function(result) {
        const userCategoryKeywords = result.userCategoryKeywords || {};
        userCategoryKeywords[feedback.suggestedCategory] = topKeywords;
        chrome.storage.local.set({userCategoryKeywords: userCategoryKeywords});
      });
    }
  }

  function showNotification(message) {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'notification';
      document.body.appendChild(notification);
    }
    
    // Set message and show
    notification.textContent = message;
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(function() {
      notification.classList.remove('show');
    }, 3000);
  }
}); 