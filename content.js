// This script will run on all huggingface.co pages
console.log('%c🤗 HF Tools 🤗', 'color: yellow; font-size: 24px; font-weight: bold; font-family: Source Sans Pro;');

// Check if it is a model/dataset/space page
var page_type = null;

// Check for model
if (document.querySelector('meta[property="og:image"]')?.content.includes('/models/') || document.querySelector('.tab-alternate')?.innerText == 'Model card') {
    console.log('This is a model page');
    page_type = 'model';
    
    // Send message to background script to inject model.js
    chrome.runtime.sendMessage({ type: 'MODEL_PAGE' });
}

// Check for dataset
if (window.location.pathname.startsWith('/datasets/')) {
    console.log('This is a dataset page');
    page_type = 'dataset';
    chrome.runtime.sendMessage({ type: 'MODEL_PAGE' });
}

// Check for space 
if (window.location.pathname.startsWith('/spaces/')) {
    console.log('This is a space page');
    page_type = 'space';
}

// Check for discussions page
if (window.location.pathname.endsWith('/discussions')) {
    console.log('This is a discussions page');
    
    // Check settings before adding search
    chrome.storage.sync.get({
        showDiscussionSearch: true,
        showFullTextSearch: false
    }, (settings) => {
        if (settings.showDiscussionSearch) {
            const discussionSection = document.querySelector('section[class*="pt-8"][class*="border-gray-100"][class*="col-span-9"]');
            
            if (discussionSection) {
                // Check if repo is private
                const privateLabel = document.querySelector('.inline-flex.h-5.items-center.rounded.border.border-gray-200.px-1\\.5.text-xs.leading-none.text-gray-500.mr-2');
                const isPrivate = privateLabel?.innerText === 'private';
                
                const searchBar = document.createElement('div');
                searchBar.classList.add('hf-discussion-search', 'mb-4');
                
                const placeholder = isPrivate && settings.showFullTextSearch ? 
                    "Full-text search is not available on private repos" :
                    settings.showFullTextSearch ? "Full-text search" : 
                    "Search discussions...";
                
                searchBar.innerHTML = `
                    <input 
                        type="search" 
                        placeholder="${placeholder}" 
                        class="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500
                        dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
                        style="transition: all 0.2s ease-in-out;"
                    >
                `;

                // Insert at the top of the discussion section
                discussionSection.insertBefore(searchBar, discussionSection.firstChild);

                // Add search functionality
                const searchInput = searchBar.querySelector('input');
                
                // Basic search function used by both modes
                const performBasicSearch = (searchTerm) => {
                    const discussionItems = document.querySelectorAll('.relative.h-16.w-full');
                    discussionItems.forEach(item => {
                        const text = item.textContent.toLowerCase();
                        item.style.display = text.includes(searchTerm) ? '' : 'none';
                    });
                };

                // Always add basic search on input
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    performBasicSearch(searchTerm);
                });
                
                if (settings.showFullTextSearch && !isPrivate) {
                    // Create modal container if it doesn't exist
                    let modalContainer = document.getElementById('hf-search-modal');
                    if (!modalContainer) {
                        modalContainer = document.createElement('div');
                        modalContainer.id = 'hf-search-modal';
                        modalContainer.style.cssText = `
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            background: rgba(0, 0, 0, 0.5);
                            backdrop-filter: blur(2px);
                            -webkit-backdrop-filter: blur(2px);
                            display: none;
                            justify-content: center;
                            align-items: center;
                            z-index: 9999;
                        `;
                        
                        // Add iframe container
                        const iframeContainer = document.createElement('div');
                        iframeContainer.style.cssText = `
                            width: 90%;
                            height: 90%;
                            max-width: 1200px;
                            background: white;
                            border-radius: 12px;
                            overflow: hidden;
                            position: relative;
                        `;
                        
                        // Add close button
                        const closeButton = document.createElement('button');
                        closeButton.innerHTML = '×';
                        closeButton.style.cssText = `
                            position: absolute;
                            top: 12px;
                            right: 12px;
                            width: 32px;
                            height: 32px;
                            border-radius: 16px;
                            background: rgba(0, 0, 0, 0.1);
                            border: none;
                            color: #666;
                            font-size: 24px;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 1;
                        `;
                        
                        // Add iframe
                        const iframe = document.createElement('iframe');
                        iframe.style.cssText = `
                            width: 100%;
                            height: 100%;
                            border: none;
                        `;
                        
                        iframeContainer.appendChild(closeButton);
                        iframeContainer.appendChild(iframe);
                        modalContainer.appendChild(iframeContainer);
                        document.body.appendChild(modalContainer);
                        
                        // Close modal function
                        const closeModal = () => {
                            modalContainer.style.display = 'none';
                        };
                        
                        // Close modal on button click or outside click
                        closeButton.addEventListener('click', closeModal);
                        modalContainer.addEventListener('click', (e) => {
                            if (e.target === modalContainer) {
                                closeModal();
                            }
                        });
                        
                        // Close on ESC key
                        document.addEventListener('keydown', (e) => {
                            if (e.key === 'Escape' && modalContainer.style.display === 'flex') {
                                closeModal();
                            }
                        });
                    }
                    
                    // Handle search input for Enter key
                    searchInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            const modal = document.getElementById('hf-search-modal');
                            const iframe = modal.querySelector('iframe');
                            
                            // Get repo type and name from URL
                            const pathParts = window.location.pathname.split('/');
                            const repoPath = `${pathParts[1]}/${pathParts[2]}/${pathParts[3]}`;
                            
                            // Pass the search query as a URL parameter
                            const searchQuery = encodeURIComponent(searchInput.value);
                            iframe.src = `https://mrfakename-hf-search.hf.space/?repo=${repoPath}&query=${searchQuery}`;
                            
                            // Show modal
                            modal.style.display = 'flex';
                        }
                    });
                }
            }
        }
    });
}

if (document.querySelector('div[data-target="UserProfile"]') && document.querySelectorAll('.flex.items-center.text-lg.font-semibold.capitalize.flex-wrap.sm\\:flex-nowrap.gap-3.mb-4')?.length == 3) {
    console.log('This is a user profile page');
    
    // Check settings before adding join date
    chrome.storage.sync.get({
        showJoinDate: true
    }, (settings) => {
        if (settings.showJoinDate) {
            // Get username from URL
            const username = window.location.pathname.slice(1).replace('/', '');

            // Create join date element immediately with loading state
            if (document.querySelector('.mb-8.flex.items-center.gap-2.whitespace-nowrap.text-gray-500')) {
                const joinDate = document.createElement('div');
                joinDate.classList.add('flex', 'items-center', 'text-gray-500', 'text-sm', 'mb-4');
                
                // Create calendar icon
                const calendarIcon = document.createElement('span');
                calendarIcon.innerHTML = `<svg class="mr-1.5 text-gray-500 flex-none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path d="M19 4h-2V3a1 1 0 0 0-2 0v1H9V3a1 1 0 0 0-2 0v1H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm1 15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9h16v9zm0-11H4V7a1 1 0 0 1 1-1h2v1a1 1 0 0 0 2 0V6h6v1a1 1 0 0 0 2 0V6h2a1 1 0 0 1 1 1v1z" fill="currentColor"/></svg>`;
                
                // Add loading text initially
                joinDate.appendChild(calendarIcon);
                const loadingText = document.createTextNode('Loading...');
                joinDate.appendChild(loadingText);
                
                const container = document.querySelector('.mb-8.flex.items-center.gap-2.whitespace-nowrap.text-gray-500');
                container.after(joinDate);
                container.classList.replace('mb-8', 'mb-2');

                // Fetch user info from HF API
                fetch(`https://huggingface.co/api/users/${username}/overview`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.createdAt) {
                            // Format date
                            const date = new Date(data.createdAt);
                            const formattedDate = date.toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });

                            // Replace loading text with actual date
                            joinDate.removeChild(loadingText);
                            const dateText = document.createTextNode(`Joined ${formattedDate}`);
                            joinDate.appendChild(dateText);
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching user data:', error);
                        // Replace loading text with error message
                        joinDate.removeChild(loadingText);
                        const errorText = document.createTextNode('Failed to load join date');
                        joinDate.appendChild(errorText);
                    });
            }
        }
    });
}
