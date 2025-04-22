document.addEventListener('DOMContentLoaded', function() {
    // Theme switcher functionality
    const themeSwitch = document.getElementById('themeSwitch');
    const htmlEl = document.documentElement;
    
    // Check for saved theme preference or use preferred color scheme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        htmlEl.setAttribute('data-bs-theme', 'dark');
        themeSwitch.checked = true;
    }
    
    // Theme switch event listener
    themeSwitch.addEventListener('change', function() {
        htmlEl.classList.add('theme-transition');
        if (this.checked) {
            htmlEl.setAttribute('data-bs-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            htmlEl.setAttribute('data-bs-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
        
        // Remove transition class after the transition is complete
        setTimeout(() => {
            htmlEl.classList.remove('theme-transition');
        }, 300);
    });

    // Get DOM elements
    const apiForm = document.getElementById('apiForm');
    const addHeaderBtn = document.getElementById('addHeader');
    const headersContainer = document.getElementById('headers-container');
    const loadingIndicator = document.getElementById('loading');
    const resultSection = document.getElementById('result');
    const errorMessage = document.getElementById('errorMessage');
    const savedRequestsContainer = document.getElementById('savedRequests');
    const noSavedRequestsMessage = document.getElementById('noSavedRequests');
    
    // Load saved requests when page loads
    loadSavedRequests();
    
    // Add header button click event
    addHeaderBtn.addEventListener('click', function() {
        addHeaderRow();
    });
    
    // Form submit event
    apiForm.addEventListener('submit', function(e) {
        e.preventDefault();
        testAPI();
    });
    
    // Headers container delegation for remove buttons
    headersContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-header') || e.target.closest('.remove-header')) {
            e.target.closest('.header-row').remove();
        }
    });
    
    // Copy buttons functionality
    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const text = document.getElementById(targetId).textContent;
            navigator.clipboard.writeText(text).then(() => {
                // Show copied feedback
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="bi bi-check"></i>';
                setTimeout(() => {
                    this.innerHTML = originalText;
                }, 1500);
            });
        });
    });
    
    // Add header row to the form
    function addHeaderRow(key = '', value = '') {
        const headerRow = document.createElement('div');
        headerRow.className = 'header-row';
        headerRow.innerHTML = `
            <div class="row align-items-center">
                <div class="col-md-5">
                    <input type="text" class="form-control header-key" placeholder="Key" value="${key}">
                </div>
                <div class="col-md-5">
                    <input type="text" class="form-control header-value" placeholder="Value" value="${value}">
                </div>
                <div class="col-md-2 text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger remove-header">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        headersContainer.appendChild(headerRow);
    }
    
    // API testing function
    async function testAPI() {
        const url = document.getElementById('apiUrl').value;
        const method = document.getElementById('method').value;
        const requestBody = document.getElementById('requestBody').value;
        
        // Collect headers
        const headers = {};
        document.querySelectorAll('.header-row').forEach(row => {
            const key = row.querySelector('.header-key').value.trim();
            const value = row.querySelector('.header-value').value.trim();
            if (key) {
                headers[key] = value;
            }
        });
        
        // Prepare UI for request
        loadingIndicator.classList.remove('d-none');
        resultSection.classList.add('d-none');
        errorMessage.classList.add('d-none');
        
        const startTime = performance.now();
        
        try {
            // Create fetch request options
            const options = {
                method: method,
                headers: headers
            };
            
            // Add body for POST, PUT, PATCH methods
            if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody.trim()) {
                try {
                    options.body = requestBody;
                } catch (e) {
                    throw new Error('Geçersiz JSON formatı: ' + e.message);
                }
            }
            
            // Make the API request
            const response = await fetch(url, options);
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Collect response headers
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            
            // Check content type and parse response
            let responseData;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }
            
            // Display result and save request
            displayResult(response.status, duration, contentType, responseHeaders, responseData);
            saveRequest(url, method, headers, requestBody);
            
        } catch (error) {
            showError(error.message);
        } finally {
            loadingIndicator.classList.add('d-none');
        }
    }
    
    // Display API response result
    function displayResult(statusCode, duration, contentType, headers, body) {
        // Set status card appearance based on status code
        const statusCard = document.getElementById('statusCard');
        const statusIcon = statusCard.querySelector('.status-icon i');
        
        statusCard.className = 'status-card';
        
        if (statusCode >= 200 && statusCode < 300) {
            statusCard.classList.add('status-success');
            statusIcon.className = 'bi bi-check-circle';
        } else if (statusCode >= 300 && statusCode < 400) {
            statusCard.classList.add('status-warning');
            statusIcon.className = 'bi bi-arrow-repeat';
        } else if (statusCode >= 400) {
            statusCard.classList.add('status-error');
            statusIcon.className = 'bi bi-exclamation-circle';
        } else {
            statusCard.classList.add('status-info');
            statusIcon.className = 'bi bi-info-circle';
        }
        
        // Update result fields
        document.getElementById('statusCode').textContent = statusCode;
        document.getElementById('responseTime').textContent = `${duration.toFixed(2)} ms`;
        document.getElementById('contentType').textContent = contentType || 'Belirtilmemiş';
        
        // Format and display response headers
        document.getElementById('responseHeaders').textContent = JSON.stringify(headers, null, 2);
        
        // Format and display response body
        if (typeof body === 'object') {
            document.getElementById('responseBody').textContent = JSON.stringify(body, null, 2);
        } else {
            document.getElementById('responseBody').textContent = body;
        }
        
        // Reset copy buttons
        document.querySelectorAll('.btn-copy').forEach(btn => {
            btn.innerHTML = '<i class="bi bi-clipboard"></i>';
        });
        
        // Show result section
        resultSection.classList.remove('d-none');
    }
    
    // Show error message
    function showError(message) {
        document.getElementById('errorText').textContent = message;
        errorMessage.classList.remove('d-none');
    }
    
    // Save API request to localStorage
    function saveRequest(url, method, headers, body) {
        let savedRequests = JSON.parse(localStorage.getItem('apiTesterRequests') || '[]');
        
        // Check if request already exists
        const existingIndex = savedRequests.findIndex(req => req.url === url && req.method === method);
        
        const request = {
            id: existingIndex >= 0 ? savedRequests[existingIndex].id : Date.now(),
            url,
            method,
            headers,
            body,
            timestamp: new Date().toISOString()
        };
        
        if (existingIndex >= 0) {
            savedRequests[existingIndex] = request;
        } else {
            // Keep max 20 requests
            if (savedRequests.length >= 20) {
                savedRequests.pop();
            }
            savedRequests.unshift(request);
        }
        
        localStorage.setItem('apiTesterRequests', JSON.stringify(savedRequests));
        loadSavedRequests();
    }
    
    // Load saved requests from localStorage
    function loadSavedRequests() {
        const savedRequests = JSON.parse(localStorage.getItem('apiTesterRequests') || '[]');
        savedRequestsContainer.innerHTML = '';
        
        if (savedRequests.length === 0) {
            noSavedRequestsMessage.classList.remove('d-none');
        } else {
            noSavedRequestsMessage.classList.add('d-none');
            
            savedRequests.forEach(request => {
                // Create method badge class
                let methodClass = 'method-get';
                switch (request.method) {
                    case 'POST': methodClass = 'method-post'; break;
                    case 'PUT': methodClass = 'method-put'; break;
                    case 'DELETE': methodClass = 'method-delete'; break;
                    default: methodClass = 'method-get';
                }
                
                const requestItem = document.createElement('div');
                requestItem.className = 'saved-request-item';
                requestItem.innerHTML = `
                    <span class="saved-request-method ${methodClass}">${request.method}</span>
                    <div class="saved-request-url">${truncateText(request.url, 40)}</div>
                    <div class="saved-request-time">
                        <i class="bi bi-clock"></i> ${formatDate(request.timestamp)}
                    </div>
                    <div class="saved-request-actions">
                        <button class="btn btn-sm btn-outline-danger delete-request" title="Sil">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `;
                
                // Add click handler to load the request
                requestItem.addEventListener('click', function(e) {
                    if (!e.target.closest('.delete-request')) {
                        loadSavedRequest(request);
                    }
                });
                
                // Add delete button handler
                requestItem.querySelector('.delete-request').addEventListener('click', function(e) {
                    e.stopPropagation();
                    deleteSavedRequest(request.id);
                });
                
                savedRequestsContainer.appendChild(requestItem);
            });
        }
    }
    
    // Load saved request into the form
    function loadSavedRequest(request) {
        document.getElementById('apiUrl').value = request.url;
        document.getElementById('method').value = request.method;
        document.getElementById('requestBody').value = request.body || '';
        
        // Clear and recreate headers
        headersContainer.innerHTML = '';
        
        if (request.headers && Object.keys(request.headers).length > 0) {
            Object.keys(request.headers).forEach(key => {
                addHeaderRow(key, request.headers[key]);
            });
        } else {
            addHeaderRow();
        }
        
        // Scroll to form
        document.getElementById('apiForm').scrollIntoView({ behavior: 'smooth' });
    }
    
    // Delete saved request
    function deleteSavedRequest(id) {
        let savedRequests = JSON.parse(localStorage.getItem('apiTesterRequests') || '[]');
        savedRequests = savedRequests.filter(req => req.id !== id);
        localStorage.setItem('apiTesterRequests', JSON.stringify(savedRequests));
        loadSavedRequests();
    }
    
    // Helper: Truncate text with ellipsis
    function truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    // Helper: Format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }
    
    // Add initial header row
    if (headersContainer.children.length === 0) {
        addHeaderRow();
    }
});