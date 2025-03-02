const { ipcRenderer } = require('electron');
const { marked } = require('marked');

// Screenshot handling
async function captureScreenshot() {
  try {
    const screenshotDataUrl = await ipcRenderer.invoke('capture-screenshot');
    if (screenshotDataUrl) {
      document.getElementById('screenshot-preview').src = screenshotDataUrl;
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
async function analyzeScreenshot(defaultMessage = null) {
  
  const imageData = document.getElementById('screenshot-preview').src;
  const message = defaultMessage || document.getElementById('gptMessage').value;
  const responseDiv = document.getElementById('gptResponse');
  const analyzeBtn = document.getElementById('analyzeBtn');
  
  if (!message.trim()) {
    return;
  }

  try {
    analyzeBtn.disabled = true;
    
    // For follow-up questions, keep the previous responses
    if (!defaultMessage) {
      const existingContent = responseDiv.innerHTML;
      responseDiv.innerHTML = existingContent + '<div class="gpt-response loading">Thinking...</div>';
    } else {
      responseDiv.className = 'gpt-response loading';
      responseDiv.textContent = 'Analyzing screenshot...';
    }
    responseDiv.style.display = 'block';

    // Only send imageData if it's a valid screenshot (not empty or default image)
    const hasValidScreenshot = imageData && !imageData.endsWith('screenshot-preview');
    const response = await ipcRenderer.invoke('analyze-screenshot', {
      imageData: hasValidScreenshot ? imageData : null,
      message
    });

    if (response.error) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'gpt-response error';
      errorDiv.textContent = `Error: ${response.error}`;
      responseDiv.appendChild(errorDiv);
    } else {
      const responseWrapper = document.createElement('div');
      responseWrapper.className = 'gpt-response';
      
      // Convert markdown to HTML
      const htmlContent = marked(response.result);
      responseWrapper.innerHTML = `<div class="markdown-body">${htmlContent}</div>`;

      if (defaultMessage) {
        // For first message, replace content
        responseDiv.innerHTML = '';
        responseDiv.appendChild(responseWrapper);
      } else {
        // For follow-ups, append new response
        // Remove the loading message first
        const loadingDiv = responseDiv.querySelector('.loading');
        if (loadingDiv) loadingDiv.remove();
        responseDiv.appendChild(responseWrapper);
      }

      // Scroll to the new response
      responseWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'gpt-response error';
    errorDiv.textContent = `Error: ${error.message}`;
    responseDiv.appendChild(errorDiv);
  } finally {
    analyzeBtn.disabled = false;
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Enable analyze button by default
  document.getElementById('analyzeBtn').disabled = false;

  // Listen for screenshots taken via shortcut
  ipcRenderer.on('screenshot-captured', async (event, dataUrl) => {
    if (dataUrl) {
      // Clear previous responses first
      const responseDiv = document.getElementById('gptResponse');
      responseDiv.innerHTML = '';
      responseDiv.style.display = 'none';
      
      // Set new screenshot and wait for it to load
      const screenshotPreview = document.getElementById('screenshot-preview');
      await new Promise((resolve) => {
        screenshotPreview.onload = resolve;
        screenshotPreview.src = dataUrl;
      });

      // Reset conversation and get settings
      await ipcRenderer.invoke('reset-conversation');
      const settings = await ipcRenderer.invoke('get-settings');
      
      // Analyze with new screenshot
      analyzeScreenshot(settings.defaultMessage || "What's in this screenshot?");
      
      // Clear previous message
      document.getElementById('gptMessage').value = '';
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
      top: window.innerHeight * 0.8,
      behavior: 'smooth'
    });
  });

  ipcRenderer.on('scroll-up', () => {
    window.scrollBy({
      top: -window.innerHeight * 0.8,
      behavior: 'smooth'
    });
  });

  // Set initial font size
  const initialFontSize = document.getElementById('fontSize').value;
  updateFontSize(initialFontSize);

  // Handle Enter key in message input for follow-up questions
  const messageInput = document.getElementById('gptMessage');
  messageInput.addEventListener('keydown', (event) => {
    // Only prevent default for Enter key submission
    if ((event.key === 'Enter' && !event.shiftKey) || 
        (event.key === 'Enter' && event.metaKey)) {
      event.preventDefault();
      analyzeScreenshot();
      messageInput.value = '';
    }
  });

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

  // Make token input selectable
  tokenInput.addEventListener('focus', () => {
    tokenInput.select();
  });

  // Load settings when app starts
  loadSettings();
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