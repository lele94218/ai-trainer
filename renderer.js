const { ipcRenderer } = require('electron');
const { marked } = require('marked');

// Screenshot handling
async function captureScreenshot() {
  try {
    const screenshotDataUrl = await ipcRenderer.invoke('capture-screenshot');
    if (screenshotDataUrl) {
      document.getElementById('screenshot-preview').src = screenshotDataUrl;
      document.getElementById('analyzeBtn').disabled = false;  // Enable the analyze button
      // Reset conversation and start new analysis
      await ipcRenderer.invoke('reset-conversation');
      const settings = await ipcRenderer.invoke('get-settings');
      analyzeScreenshot(settings.defaultMessage || "What's in this screenshot?");
      // Clear previous message
      document.getElementById('gptMessage').value = '';
      // Clear previous responses
      const responseDiv = document.getElementById('gptResponse');
      responseDiv.innerHTML = '';
      responseDiv.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
  }
}

// Window management
function hideApp() {
  ipcRenderer.invoke('hide-app');
}

function quitApp() {
  ipcRenderer.invoke('quit-app');
}

// GPT analysis
async function analyzeScreenshot(defaultMessage) {
  const screenshotImg = document.getElementById('screenshot-preview');
  const messageInput = document.getElementById('gptMessage');
  const message = defaultMessage || messageInput.value.trim();
  
  if (!message) {
    console.log('No message provided');
    return;
  }
  
  try {
    const responseDiv = document.getElementById('gptResponse');
    const loadingMessage = defaultMessage ? 'Analyzing screenshot...' : 'Processing your question...';
    
    // Only clear previous responses if this is a new screenshot analysis
    if (defaultMessage) {
      responseDiv.innerHTML = '';
      responseDiv.style.display = 'none';
    }
    
    displayResponse(`*${loadingMessage}*`);
    
    // Get the response from GPT
    const response = await ipcRenderer.invoke('analyze-screenshot', {
      imageData: screenshotImg.src !== 'about:blank' ? screenshotImg.src : null,
      message: message
    });
    
    // Remove only the loading message
    const loadingElement = responseDiv.querySelector('.response-container:last-child');
    if (loadingElement) {
      loadingElement.remove();
    }
    
    // Handle both string and object responses
    const responseText = typeof response === 'object' ? response.result || response.error : response;
    displayResponse(responseText);
    
    // Clear message input if it wasn't a default message
    if (!defaultMessage) {
      messageInput.value = '';
      updateAnalyzeButtonState();
    }
    
  } catch (error) {
    console.error('Analysis failed:', error);
    // Remove the loading message before showing error
    const loadingElement = responseDiv.querySelector('.response-container:last-child');
    if (loadingElement) {
      loadingElement.remove();
    }
    displayResponse(`**Error:** ${error.message || 'Failed to analyze screenshot'}`);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  const screenshotPreview = document.getElementById('screenshot-preview');
  const analyzeBtn = document.getElementById('analyzeBtn');
  
  // Update button state based on message only
  function updateAnalyzeButtonState() {
    const messageInput = document.getElementById('gptMessage');
    const hasMessage = messageInput.value.trim().length > 0;
    analyzeBtn.disabled = !hasMessage;
  }
  
  // Initial button state
  updateAnalyzeButtonState();
  
  // Update button state when message input changes
  const messageInput = document.getElementById('gptMessage');
  messageInput.addEventListener('input', updateAnalyzeButtonState);

  // Handle Enter key in message input for follow-up questions
  messageInput.addEventListener('keydown', async (event) => {
    if ((event.key === 'Enter' && !event.shiftKey) || 
        (event.key === 'Enter' && event.metaKey)) {
      event.preventDefault();
      if (!messageInput.value.trim()) return;
      
      await analyzeScreenshot();
      messageInput.value = '';
      updateAnalyzeButtonState();
    }
  });

  // Listen for screenshots taken via shortcut
  ipcRenderer.on('screenshot-captured', async (event, dataUrl) => {
    if (dataUrl) {
      // Clear previous responses first
      const responseDiv = document.getElementById('gptResponse');
      responseDiv.innerHTML = '';
      responseDiv.style.display = 'none';
      
      // Set new screenshot and wait for it to load
      await new Promise((resolve) => {
        screenshotPreview.onload = resolve;
        screenshotPreview.src = dataUrl;
      });
      
      updateAnalyzeButtonState();

      // Reset conversation and get settings
      await ipcRenderer.invoke('reset-conversation');
      const settings = await ipcRenderer.invoke('get-settings');
      
      // Analyze with new screenshot
      analyzeScreenshot(settings.defaultMessage || "What's in this screenshot?");
      
      // Clear previous message
      messageInput.value = '';
    }
  });

  // Listen for focus-input event
  ipcRenderer.on('focus-input', () => {
    const messageInput = document.getElementById('gptMessage');
    if (messageInput) {
      messageInput.focus();
    }
  });

  // Listen for scroll shortcuts
  ipcRenderer.on('scroll-down', () => {
    window.scrollBy({
      top: window.innerHeight * 0.4,
      behavior: 'smooth'
    });
  });

  ipcRenderer.on('scroll-up', () => {
    window.scrollBy({
      top: -window.innerHeight * 0.4,
      behavior: 'smooth'
    });
  });

  // Set initial font size
  const initialFontSize = document.getElementById('fontSize').value;
  updateFontSize(initialFontSize);

  // Add keyboard shortcut for quick input focus
  document.addEventListener('keydown', (e) => {
    // Only prevent default for Command + I shortcut
    if (e.metaKey && e.key === 'i') {
      e.preventDefault();
      const messageInput = document.getElementById('gptMessage');
      if (messageInput) {
        messageInput.focus();
      }
    }
  });

  // Enable copy/paste in all inputs
  document.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('paste', (e) => {
      // Don't stop propagation, let the event bubble
      e.stopPropagation();
    });
  });
});

// Font size handling
function updateFontSize(size) {
  document.documentElement.style.setProperty('--response-font-size', `${size}px`);
}

// Settings management
function toggleSettings() {
  ipcRenderer.invoke('open-settings');
}

// Export functions for HTML use
window.captureScreenshot = captureScreenshot;
window.hideApp = hideApp;
window.quitApp = quitApp;
window.analyzeScreenshot = analyzeScreenshot;
window.updateFontSize = updateFontSize;
window.toggleSettings = toggleSettings;

function displayResponse(response) {
  if (!response) return;
  
  const responseDiv = document.getElementById('gptResponse');
  const timestamp = new Date().toLocaleString('en-US', { 
    hour: 'numeric', 
    minute: 'numeric',
    hour12: true,
    month: 'short',
    day: 'numeric'
  });
  
  const timestampHtml = `<div class="response-timestamp">${timestamp}</div>`;
  const contentHtml = `<div class="markdown-body">${marked.parse(String(response))}</div>`;
  
  const newResponseHtml = `<div class="response-container">${timestampHtml}${contentHtml}</div>`;
  
  if (!responseDiv.innerHTML.trim()) {
    responseDiv.innerHTML = newResponseHtml;
  } else {
    responseDiv.innerHTML += newResponseHtml;
  }
  
  responseDiv.style.display = 'block';
  
  // Wait for the content to be rendered before scrolling
  setTimeout(() => {
    const lastResponse = responseDiv.lastElementChild;
    if (lastResponse) {
      lastResponse.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, 100);
} 