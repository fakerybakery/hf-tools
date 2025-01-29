// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get({
    showRepoSize: true,
    showDiscussionSearch: true,
    showFullTextSearch: false // default to off for beta feature
  }, (items) => {
    document.getElementById('showRepoSize').checked = items.showRepoSize;
    document.getElementById('showDiscussionSearch').checked = items.showDiscussionSearch;
    document.getElementById('showFullTextSearch').checked = items.showFullTextSearch;
    
    // Set initial disabled state of full-text search
    const fullTextSearch = document.getElementById('showFullTextSearch');
    const fullTextRow = fullTextSearch.closest('.setting-row');
    fullTextSearch.disabled = !items.showDiscussionSearch;
    fullTextRow.classList.toggle('disabled', !items.showDiscussionSearch);
  });
});

// Save settings when changed
document.getElementById('showRepoSize').addEventListener('change', (e) => {
  chrome.storage.sync.set({
    showRepoSize: e.target.checked
  });
});

document.getElementById('showDiscussionSearch').addEventListener('change', (e) => {
  const fullTextSearch = document.getElementById('showFullTextSearch');
  const fullTextRow = fullTextSearch.closest('.setting-row');
  
  chrome.storage.sync.set({
    showDiscussionSearch: e.target.checked
  });

  // If discussion search is turned off, disable and uncheck full-text search
  if (!e.target.checked) {
    fullTextSearch.checked = false;
    fullTextSearch.disabled = true;
    fullTextRow.classList.add('disabled');
    chrome.storage.sync.set({
      showFullTextSearch: false
    });
  } else {
    // Enable full-text search option when discussion search is on
    fullTextSearch.disabled = false;
    fullTextRow.classList.remove('disabled');
  }
});

function showModal(options) {
  const { 
    message, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel', 
    confirmClass = 'primary',
    onConfirm, 
    onCancel 
  } = options;

  const modal = document.getElementById('confirmModal');
  const content = document.getElementById('modalContent');
  const confirmBtn = document.getElementById('modalConfirm');
  const cancelBtn = document.getElementById('modalCancel');

  content.textContent = message;
  confirmBtn.textContent = confirmText;
  cancelBtn.textContent = cancelText;
  
  // Reset and set new button class
  confirmBtn.className = 'modal-button ' + confirmClass;

  const closeModal = () => {
    modal.classList.remove('visible');
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  confirmBtn.onclick = () => {
    closeModal();
    onConfirm?.();
  };

  cancelBtn.onclick = () => {
    closeModal();
    onCancel?.();
  };

  modal.classList.add('visible');
}

document.getElementById('showFullTextSearch').addEventListener('change', (e) => {
  if (e.target.checked) {
    showModal({
      message: 'Full-text search is currently in beta and requires sending search queries to an external server. Results may be incomplete or inaccurate. Do you want to enable this feature?',
      confirmText: 'Enable',
      onConfirm: () => {
        chrome.storage.sync.set({
          showFullTextSearch: true
        });
      },
      onCancel: () => {
        e.target.checked = false;
        chrome.storage.sync.set({
          showFullTextSearch: false
        });
      }
    });
  } else {
    chrome.storage.sync.set({
      showFullTextSearch: false
    });
  }
});

// Add reset button handler
document.getElementById('resetSettings').addEventListener('click', () => {
  showModal({
    message: 'Are you sure you want to reset all settings to their defaults?',
    confirmText: 'Reset Settings',
    confirmClass: 'danger',
    onConfirm: () => {
      const defaultSettings = {
        showRepoSize: true,
        showDiscussionSearch: true,
        showFullTextSearch: false
      };
      
      chrome.storage.sync.set(defaultSettings, () => {
        // Update UI
        document.getElementById('showRepoSize').checked = defaultSettings.showRepoSize;
        document.getElementById('showDiscussionSearch').checked = defaultSettings.showDiscussionSearch;
        document.getElementById('showFullTextSearch').checked = defaultSettings.showFullTextSearch;
        
        // Update full-text search disabled state
        const fullTextSearch = document.getElementById('showFullTextSearch');
        const fullTextRow = fullTextSearch.closest('.setting-row');
        fullTextSearch.disabled = !defaultSettings.showDiscussionSearch;
        fullTextRow.classList.toggle('disabled', !defaultSettings.showDiscussionSearch);
      });
    }
  });
});

// Add search functionality
document.getElementById('settingsSearch').addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const settingRows = document.querySelectorAll('.setting-row');
  const sections = document.querySelectorAll('.section');
  
  sections.forEach(section => {
    let hasVisibleSettings = false;
    const sectionSettings = section.querySelectorAll('.setting-row');
    
    sectionSettings.forEach(row => {
      const text = row.textContent.toLowerCase();
      const matches = text.includes(searchTerm);
      row.classList.toggle('hidden', !matches);
      if (matches) hasVisibleSettings = true;
    });
    
    // Hide section if it has no matching settings
    section.classList.toggle('hidden', !hasVisibleSettings);
  });
}); 