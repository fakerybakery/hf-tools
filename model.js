(function() {
    // Try both model and dataset sidebar classes
    const sidebar = document.querySelector('.pt-8.border-gray-100.md\\:col-span-5.pt-6.md\\:pb-24.md\\:pl-6.md\\:border-l.order-first.md\\:order-none') || 
                   document.querySelector('.pt-6.border-gray-100.md\\:pb-24.md\\:pl-6.md\\:w-64.lg\\:w-80.xl\\:w-96.flex-none.order-first.md\\:order-none.md\\:border-l.\\!pt-3.md\\:\\!pt-6');
    
    if (sidebar) {
        console.log('Found sidebar:', sidebar);

        // Check settings before adding features
        chrome.storage.sync.get({
            showRepoSize: true // default value
        }, (settings) => {
            if (settings.showRepoSize) {
                addStorageEstimate();
            }
        });

        function addStorageEstimate() {
            const toolsContainer = document.createElement('div');
            toolsContainer.classList.add('hf-tools-container');
            
            // Add storage estimate section
            const storageEstimate = document.createElement('div');
            storageEstimate.classList.add('flex', 'gap-1.5', 'flex-wrap');
            
            const storageLabel = document.createElement('div');
            storageLabel.classList.add('mr-auto', 'flex', 'flex-none', 'items-center', 'gap-1', 'overflow-hidden', 'rounded-lg', 'text-sm', 'font-semibold');
            storageLabel.textContent = 'Total Size';
            
            const storageWrapper = document.createElement('div');
            storageWrapper.classList.add('flex', 'flex-wrap', 'gap-x-1.5', 'gap-y-1', 'text-sm');
            
            const storageValue = document.createElement('div');
            storageValue.classList.add('inline-flex', 'h-6', 'shrink-0', 'items-center', 'overflow-hidden', 'rounded-lg', 'border');
            
            // Add calculating text
            const calculatingText = document.createElement('div');
            calculatingText.classList.add('px-2', 'animate-pulse');
            calculatingText.textContent = 'Calculating...';
            storageValue.appendChild(calculatingText);
            
            storageWrapper.appendChild(storageValue);
            storageEstimate.appendChild(storageLabel);
            storageEstimate.appendChild(storageWrapper);
            toolsContainer.appendChild(storageEstimate);

            const divider = document.createElement('div');
            divider.classList.add('divider-column-vertical');
            toolsContainer.appendChild(divider);

            sidebar.insertBefore(toolsContainer, sidebar.firstChild);
            
            // Get path from URL and determine if it's a model or dataset
            const pathParts = window.location.pathname.split('/').slice(1);
            const isDataset = pathParts[0] === 'datasets';
            const path = isDataset ? pathParts.slice(1, 3).join('/') : pathParts.slice(0, 2).join('/');
            const type = isDataset ? 'datasets' : 'models';
            
            // Function to format bytes
            const formatBytes = (bytes) => {
                const units = ['B', 'KB', 'MB', 'GB', 'TB'];
                let size = bytes;
                let unitIndex = 0;
                
                while (size >= 1024 && unitIndex < units.length - 1) {
                    size /= 1024;
                    unitIndex++;
                }
                
                return `${size.toFixed(2)} ${units[unitIndex]}`;
            };

            // Fetch size
            fetch(`https://huggingface.co/api/${type}/${path}/treesize/main`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                const diskSpaceLabel = document.createElement('div');
                diskSpaceLabel.classList.add('border-r', 'px-2', 'text-gray-500');
                diskSpaceLabel.textContent = 'Repo Size';
                
                const diskSpaceValue = document.createElement('div');
                diskSpaceValue.classList.add('px-1.5');
                diskSpaceValue.textContent = formatBytes(data.size);
                
                storageValue.innerHTML = '';
                storageValue.appendChild(diskSpaceLabel);
                storageValue.appendChild(diskSpaceValue);
            })
            .catch(error => {
                console.error('Error fetching size:', error);
                storageValue.innerHTML = '';
                storageValue.textContent = 'Error calculating size';
            });
        }
    } else {
        console.log('Sidebar not found');
    }
})();