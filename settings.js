const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Load models from JSON file
function loadModels() {
  try {
    const modelsPath = path.join(__dirname, 'models.json');
    const modelsData = fs.readFileSync(modelsPath, 'utf8');
    return JSON.parse(modelsData).models;
  } catch (error) {
    console.error('Error loading models:', error);
    return [];
  }
}

// Populate model select options
function populateModelSelect() {
  const modelSelect = document.getElementById('gptModel');
  const models = loadModels();
  
  // Clear existing options
  modelSelect.innerHTML = '';
  
  // Add options from models.json
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = `${model.name}`;
    if (model.default) {
      option.selected = true;
    }
    modelSelect.appendChild(option);
  });
}

// Settings management
function toggleTokenVisibility() {
  const tokenInput = document.getElementById('openaiToken');
  const toggleButton = document.querySelector('.token-toggle');
  
  if (tokenInput.type === 'password') {
    tokenInput.type = 'text';
    toggleButton.textContent = 'Hide';
  } else {
    tokenInput.type = 'password';
    toggleButton.textContent = 'Show';
  }
}

function closeSettings() {
  ipcRenderer.invoke('close-settings');
}

async function saveSettings() {
  const apiKey = document.getElementById('openaiToken').value.trim();
  const model = document.getElementById('gptModel').value;
  const defaultMessage = document.getElementById('defaultMessage').value.trim() || "What's in this screenshot?";
  
  try {
    await ipcRenderer.invoke('save-settings', { apiKey, model, defaultMessage });
    closeSettings();
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

async function loadSettings() {
  try {
    const settings = await ipcRenderer.invoke('get-settings');
    document.getElementById('openaiToken').value = settings.apiKey || '';
    document.getElementById('defaultMessage').value = settings.defaultMessage || "What's in this screenshot?";
    
    // Only set the model if it exists in our options
    const modelSelect = document.getElementById('gptModel');
    if (settings.model && Array.from(modelSelect.options).some(opt => opt.value === settings.model)) {
      modelSelect.value = settings.model;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Enable copy/paste in inputs
document.addEventListener('DOMContentLoaded', () => {
  // Populate model select options
  populateModelSelect();
  
  // Load settings when page loads
  loadSettings();

  // Enable copy/paste in all inputs
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('paste', (e) => {
      e.stopPropagation();
    });
  });

  // Make token input selectable
  const tokenInput = document.getElementById('openaiToken');
  tokenInput.addEventListener('focus', () => {
    tokenInput.select();
  });
}); 