// Admin Metrics for Tab Organizer
// Handles data collection and visualization for the metrics section

// We'll use a simple method for drawing charts without external dependencies
function loadMetrics() {
  // DOM Elements
  const timeframeButtons = document.querySelectorAll('.time-btn');
  const totalGroupsElement = document.getElementById('totalGroups');
  const popularCategoriesElement = document.getElementById('popularCategories');
  const aiPercentageElement = document.getElementById('aiPercentage');
  const manualPercentageElement = document.getElementById('manualPercentage');
  const mlAccuracyElement = document.getElementById('mlAccuracy');
  
  // Charts
  const groupsChart = document.getElementById('groupsChart');
  const groupingTypeChart = document.getElementById('groupingTypeChart');
  const accuracyChart = document.getElementById('accuracyChart');
  
  // State
  let currentTimeframe = 'week';
  let metricsData = {};
  
  // Event Listeners
  timeframeButtons.forEach(button => {
    button.addEventListener('click', function() {
      const timeframe = this.getAttribute('data-timeframe');
      
      // Update active button
      timeframeButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Update metrics for the selected timeframe
      currentTimeframe = timeframe;
      renderMetrics();
    });
  });
  
  // Load metrics data from storage
  loadMetricsData();
  
  function loadMetricsData() {
    chrome.storage.local.get(['metrics', 'groupHistory', 'mlFeedback'], function(result) {
      // Generate sample data for demonstration
      generateSampleMetrics();
      
      // Render metrics
      renderMetrics();
    });
  }
  
  function generateSampleMetrics() {
    const today = new Date();
    
    // Generate data for last 30 days
    const days = [];
    const groupCounts = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(formatDate(date));
      
      // Random count between 1-10
      groupCounts.push(Math.floor(Math.random() * 10) + 1);
    }
    
    // Most popular categories
    const popularCategories = [
      { name: 'Technology', count: 45 },
      { name: 'Work', count: 32 },
      { name: 'Social', count: 28 },
      { name: 'Shopping', count: 21 },
      { name: 'News', count: 14 }
    ];
    
    // AI vs Manual data
    const aiGroupsCount = 67;
    const manualGroupsCount = 48;
    const totalGroups = aiGroupsCount + manualGroupsCount;
    
    // ML Accuracy data (percentage of groups that were not modified after creation)
    const mlAccuracy = 78;
    
    // Store the metrics
    metricsData = {
      days: days,
      groupCounts: groupCounts,
      popularCategories: popularCategories,
      aiGroupsCount: aiGroupsCount,
      manualGroupsCount: manualGroupsCount,
      totalGroups: totalGroups,
      mlAccuracy: mlAccuracy
    };
  }
  
  function renderMetrics() {
    // Filter data based on selected timeframe
    const { filteredDays, filteredCounts } = filterDataByTimeframe(
      metricsData.days, 
      metricsData.groupCounts
    );
    
    // Update total groups
    const sum = filteredCounts.reduce((a, b) => a + b, 0);
    totalGroupsElement.textContent = sum;
    
    // Update most popular categories
    renderPopularCategories();
    
    // Update AI vs Manual percentages
    const aiPercentage = Math.round((metricsData.aiGroupsCount / metricsData.totalGroups) * 100);
    const manualPercentage = 100 - aiPercentage;
    
    aiPercentageElement.textContent = `${aiPercentage}%`;
    manualPercentageElement.textContent = `${manualPercentage}%`;
    
    // Update ML accuracy
    mlAccuracyElement.textContent = `${metricsData.mlAccuracy}%`;
    
    // Render charts
    renderGroupsLineChart(filteredDays, filteredCounts);
    renderGroupingTypePieChart();
    renderAccuracyBarChart();
  }
  
  function filterDataByTimeframe(days, counts) {
    let startIndex = 0;
    
    switch (currentTimeframe) {
      case 'week':
        startIndex = days.length - 7;
        break;
      case 'month':
        startIndex = 0; // Already 30 days
        break;
      case 'all':
        startIndex = 0;
        break;
    }
    
    return {
      filteredDays: days.slice(startIndex),
      filteredCounts: counts.slice(startIndex)
    };
  }
  
  function renderPopularCategories() {
    let html = '';
    
    metricsData.popularCategories.forEach(category => {
      html += `
        <div class="metric-list-item">
          <span class="label">${category.name}</span>
          <span class="value">${category.count}</span>
        </div>
      `;
    });
    
    popularCategoriesElement.innerHTML = html;
  }
  
  function renderGroupsLineChart(days, counts) {
    // Simple line chart with canvas
    const width = groupsChart.clientWidth;
    const height = groupsChart.clientHeight || 150;
    
    // Clear previous chart
    groupsChart.innerHTML = '';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    groupsChart.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Draw chart
    const maxCount = Math.max(...counts);
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Background
    ctx.fillStyle = '#f9f9f9';
    ctx.fillRect(0, 0, width, height);
    
    // Grid lines
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Draw line
    ctx.strokeStyle = 'var(--primary-color)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    counts.forEach((count, i) => {
      const x = padding + (chartWidth / (counts.length - 1)) * i;
      const y = height - padding - (count / maxCount) * chartHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = 'var(--primary-color)';
    
    counts.forEach((count, i) => {
      const x = padding + (chartWidth / (counts.length - 1)) * i;
      const y = height - padding - (count / maxCount) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw x-axis labels (show first, last, and middle date)
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    
    // First date
    ctx.fillText(days[0], padding, height - 5);
    
    // Middle date
    const middleIndex = Math.floor(days.length / 2);
    const middleX = padding + (chartWidth / (counts.length - 1)) * middleIndex;
    ctx.fillText(days[middleIndex], middleX, height - 5);
    
    // Last date
    ctx.fillText(days[days.length - 1], width - padding, height - 5);
  }
  
  function renderGroupingTypePieChart() {
    // Simple pie chart with canvas
    const width = groupingTypeChart.clientWidth;
    const height = groupingTypeChart.clientHeight || 150;
    
    // Clear previous chart
    groupingTypeChart.innerHTML = '';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    groupingTypeChart.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Data
    const aiCount = metricsData.aiGroupsCount;
    const manualCount = metricsData.manualGroupsCount;
    const total = aiCount + manualCount;
    
    // Draw pie chart
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    // AI Portion
    const aiAngle = (aiCount / total) * Math.PI * 2;
    
    ctx.fillStyle = 'var(--ml-color)';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, 0, aiAngle);
    ctx.closePath();
    ctx.fill();
    
    // Manual Portion
    ctx.fillStyle = 'var(--chart-color-2)';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, aiAngle, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    
    // Legend
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    
    // AI Legend
    ctx.fillStyle = 'var(--ml-color)';
    ctx.fillRect(10, height - 30, 10, 10);
    ctx.fillStyle = '#666';
    ctx.fillText('AI Generated', 25, height - 21);
    
    // Manual Legend
    ctx.fillStyle = 'var(--chart-color-2)';
    ctx.fillRect(10, height - 15, 10, 10);
    ctx.fillStyle = '#666';
    ctx.fillText('Manual', 25, height - 6);
  }
  
  function renderAccuracyBarChart() {
    // Simple bar chart for ML accuracy
    const width = accuracyChart.clientWidth;
    const height = accuracyChart.clientHeight || 150;
    
    // Clear previous chart
    accuracyChart.innerHTML = '';
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    accuracyChart.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Draw bar chart
    const accuracy = metricsData.mlAccuracy;
    const barWidth = width - 40;
    const barHeight = 20;
    const x = 20;
    const y = height / 2 - barHeight / 2;
    
    // Background bar
    ctx.fillStyle = '#eee';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Accuracy bar
    ctx.fillStyle = 'var(--primary-color)';
    ctx.fillRect(x, y, (accuracy / 100) * barWidth, barHeight);
    
    // Text
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ML Accuracy', width / 2, y - 10);
    
    // Scale
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    
    // 0%
    ctx.fillText('0%', x, y + barHeight + 15);
    
    // 50%
    ctx.fillText('50%', x + barWidth / 2, y + barHeight + 15);
    
    // 100%
    ctx.fillText('100%', x + barWidth, y + barHeight + 15);
  }
  
  function formatDate(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  }
} 