/**
 * Legal DD Assistant - JavaScript for handling document uploads, NLP-based analysis, and interactive chat
 */

// Global variables
let authToken = localStorage.getItem('auth_token');
let currentUser = null;
let dragCounter = 0;

// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const uploadBtn = document.getElementById('uploadDocumentBtn');
const analysisResults = document.getElementById('analysisResults');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatMessages = document.getElementById('chatMessages');
const dropZone = document.getElementById('dropZone');
const browseBtn = document.getElementById('browseBtn');
const documentFile = document.getElementById('documentFile');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const recentAnalyses = document.getElementById('recentAnalyses');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize the Legal DD Assistant
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    initializeEventListeners();
    loadRecentAnalyses();
});

// Check authentication and get current user
function initializeAuth() {
    // If no token, redirect to login page
    if (!authToken) {
        window.location.href = 'login.html';
        return;
    }
    
    // Get current user info
    fetch('/api/users/me', {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Authentication failed');
        }
        return response.json();
    })
    .then(data => {
        currentUser = data;
        // Update UI with user info
        const userDropdown = document.querySelector('.nav-link.dropdown-toggle');
        if (userDropdown) {
            userDropdown.innerHTML = `<i class="fas fa-user-circle"></i> ${data.firstName} ${data.lastName}`;
        }
    })
    .catch(error => {
        console.error('Error fetching user data:', error);
        // If authentication fails, redirect to login
        localStorage.removeItem('auth_token');
        window.location.href = 'login.html';
    });
}

// Initialize event listeners
function initializeEventListeners() {
    // Upload button
    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadDocument);
    }
    
    // Chat send button
    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', sendChatMessage);
    }
    
    // Chat input - press Enter to send
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
    
    // Browse button
    if (browseBtn) {
        browseBtn.addEventListener('click', () => {
            documentFile.click();
        });
    }
    
    // File input change
    if (documentFile) {
        documentFile.addEventListener('change', handleFileSelection);
    }
    
    // Drag and drop
    if (dropZone) {
        dropZone.addEventListener('dragenter', handleDragEnter);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('drop', handleDrop);
        
        // Click on drop zone
        dropZone.addEventListener('click', () => {
            documentFile.click();
        });
    }
    
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// Load recent analyses
function loadRecentAnalyses() {
    if (!authToken) return;
    
    fetch('/api/analysis/documents', {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.length === 0) {
            recentAnalyses.innerHTML = `
                <li class="list-group-item text-center text-muted py-4">
                    No recent analyses found
                </li>
            `;
            return;
        }
        
        recentAnalyses.innerHTML = '';
        
        // Show only the most recent 5 analyses
        const recentData = data.slice(0, 5);
        
        recentData.forEach(analysis => {
            const statusClass = getStatusClass(analysis.status);
            const statusIcon = getStatusIcon(analysis.status);
            
            const item = document.createElement('li');
            item.className = 'list-group-item';
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge ${statusClass} me-2">${statusIcon} ${analysis.status}</span>
                        ${analysis.document.name}
                    </div>
                    <small class="text-muted">${formatDate(analysis.updatedAt)}</small>
                </div>
            `;
            
            // Add click event to view analysis results
            item.addEventListener('click', () => {
                fetchAnalysisResults(analysis.documentId);
            });
            
            recentAnalyses.appendChild(item);
        });
    })
    .catch(error => {
        console.error('Error loading recent analyses:', error);
        recentAnalyses.innerHTML = `
            <li class="list-group-item text-center text-danger">
                Error loading analyses
            </li>
        `;
    });
}

// Handle file selection from input
function handleFileSelection(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Display file info
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.classList.remove('d-none');
    
    // Set the document name if empty
    const nameInput = document.getElementById('documentName');
    if (nameInput && nameInput.value === '') {
        nameInput.value = file.name.split('.')[0]; // Set name without extension
    }
}

// Handle drag enter
function handleDragEnter(e) {
    e.preventDefault();
    dragCounter++;
    dropZone.classList.add('dragover');
}

// Handle drag leave
function handleDragLeave(e) {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
        dropZone.classList.remove('dragover');
    }
}

// Handle drag over
function handleDragOver(e) {
    e.preventDefault();
}

// Handle drop
function handleDrop(e) {
    e.preventDefault();
    dragCounter = 0;
    dropZone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        documentFile.files = files;
        handleFileSelection({ target: { files: files } });
    }
}

// Upload document for analysis
function uploadDocument() {
    if (!authToken) {
        showToast('Please sign in to upload documents', 'warning');
        return;
    }
    
    // Check if a file is selected
    if (!documentFile.files || documentFile.files.length === 0) {
        showToast('Please select a file to upload', 'warning');
        return;
    }
    
    // Check if required fields are filled
    const documentName = document.getElementById('documentName').value.trim();
    const documentCategory = document.getElementById('documentCategory').value;
    
    if (!documentName) {
        showToast('Please enter a document name', 'warning');
        return;
    }
    
    if (!documentCategory) {
        showToast('Please select a document category', 'warning');
        return;
    }
    
    // Create form data
    const formData = new FormData(uploadForm);
    
    // Show loading state
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Uploading...';
    
    // Upload document
    fetch('/api/documents', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`
        },
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to upload document');
        }
        return response.json();
    })
    .then(data => {
        showToast('Document uploaded successfully', 'success');
        
        // Start analysis
        startAnalysis(data.id);
        
        // Reset form
        uploadForm.reset();
        fileInfo.classList.add('d-none');
        
        // Reset button
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i> Upload & Analyze';
    })
    .catch(error => {
        console.error('Error uploading document:', error);
        showToast('Error uploading document. Please try again.', 'error');
        
        // Reset button
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i> Upload & Analyze';
    });
}

// Start NLP-based analysis
function startAnalysis(documentId) {
    if (!authToken) return;
    
    // Show loading state in analysis results
    analysisResults.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <h5>Analysis in Progress</h5>
            <p class="text-muted">This may take a few moments, depending on the document size and complexity.</p>
        </div>
    `;
    
    // Start analysis
    fetch(`/api/analysis/documents/${documentId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to start analysis');
        }
        return response.json();
    })
    .then(data => {
        showToast('Document analysis started', 'success');
        
        // If analysis is already completed
        if (data.status === 'completed') {
            displayAnalysisResults(data);
        } else {
            // Poll for results
            pollAnalysisResults(documentId);
        }
        
        // Refresh recent analyses list
        loadRecentAnalyses();
    })
    .catch(error => {
        console.error('Error starting analysis:', error);
        showToast('Error starting document analysis', 'error');
        
        analysisResults.innerHTML = `
            <div class="alert alert-danger text-center">
                <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                <h5>Analysis Error</h5>
                <p>There was an error starting the document analysis. Please try again.</p>
            </div>
        `;
    });
}

// Poll for analysis results
function pollAnalysisResults(documentId) {
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts * 5 seconds = 2.5 minutes max
    
    const interval = setInterval(() => {
        attempts++;
        
        if (attempts > maxAttempts) {
            clearInterval(interval);
            showToast('Analysis is taking longer than expected. You will be notified when it completes.', 'warning');
            
            analysisResults.innerHTML = `
                <div class="alert alert-warning text-center">
                    <i class="fas fa-clock fa-3x mb-3"></i>
                    <h5>Analysis Taking Longer Than Expected</h5>
                    <p>The analysis is still in progress. You will be notified when it completes.</p>
                </div>
            `;
            
            return;
        }
        
        fetch(`/api/analysis/documents/${documentId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })
        .then(response => response.json())
        .then(data => {
            // Update loading message with progress
            const progress = Math.min(100, Math.round((attempts / maxAttempts) * 100));
            analysisResults.innerHTML = `
                <div class="text-center py-5">
                    <div class="progress mb-3" style="height: 10px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: ${progress}%"></div>
                    </div>
                    <h5>Analysis in Progress (${data.status})</h5>
                    <p class="text-muted">This may take a few moments, depending on the document size and complexity.</p>
                </div>
            `;
            
            if (data.status === 'completed') {
                clearInterval(interval);
                displayAnalysisResults(data);
                showToast('Document analysis completed', 'success');
                
                // Refresh recent analyses list
                loadRecentAnalyses();
            } else if (data.status === 'failed') {
                clearInterval(interval);
                showToast('Document analysis failed', 'error');
                
                analysisResults.innerHTML = `
                    <div class="alert alert-danger text-center">
                        <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                        <h5>Analysis Failed</h5>
                        <p>${data.errorMessage || 'An error occurred during analysis.'}</p>
                    </div>
                `;
                
                // Refresh recent analyses list
                loadRecentAnalyses();
            }
        })
        .catch(error => {
            console.error('Error fetching analysis results:', error);
            // Don't clear the interval, just log the error and continue polling
        });
    }, 5000); // Poll every 5 seconds
}

// Fetch analysis results for a specific document
function fetchAnalysisResults(documentId) {
    if (!authToken) return;
    
    // Show loading state
    analysisResults.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <h5>Loading Analysis Results</h5>
        </div>
    `;
    
    fetch(`/api/analysis/documents/${documentId}`, {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch analysis results');
        }
        return response.json();
    })
    .then(data => {
        displayAnalysisResults(data);
    })
    .catch(error => {
        console.error('Error fetching analysis results:', error);
        showToast('Error loading analysis results', 'error');
        
        analysisResults.innerHTML = `
            <div class="alert alert-danger text-center">
                <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                <h5>Error Loading Results</h5>
                <p>There was an error loading the analysis results. Please try again.</p>
            </div>
        `;
    });
}

// Display analysis results
function displayAnalysisResults(data) {
    if (!data) {
        analysisResults.innerHTML = `
            <div class="alert alert-warning text-center">
                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                <h5>No Analysis Data</h5>
                <p>No analysis data is available for this document.</p>
            </div>
        `;
        return;
    }
    
    // Display document info
    let html = `
        <div class="analysis-result-section">
            <h5>Analysis Results for ${data.document ? data.document.name : 'Document'}</h5>
            <div class="mb-4">
                <span class="badge bg-primary me-2">
                    <i class="fas fa-calendar-alt me-1"></i> ${formatDate(data.createdAt)}
                </span>
                <span class="badge bg-secondary me-2">
                    <i class="fas fa-clock me-1"></i> ${data.processingTime ? Math.round(data.processingTime / 1000) + 's' : 'N/A'}
                </span>
                <span class="badge bg-info">
                    <i class="fas fa-code-branch me-1"></i> v${data.analysisVersion || '1.0'}
                </span>
            </div>
    `;
    
    // Summary
    if (data.summary) {
        html += `
            <div class="mb-4">
                <h6>Summary</h6>
                <div class="p-3 bg-light rounded">
                    ${data.summary}
                </div>
            </div>
        `;
    }
    
    // Entities
    if (data.entities && Object.keys(data.entities).length > 0) {
        html += `<div class="mb-4"><h6>Entities</h6><div class="row">`;
        
        // Group entities by type
        for (const [type, entities] of Object.entries(data.entities)) {
            html += `
                <div class="col-md-6 mb-3">
                    <div class="card h-100">
                        <div class="card-header py-2">${formatEntityType(type)}</div>
                        <div class="card-body">
            `;
            
            if (Array.isArray(entities)) {
                entities.forEach(entity => {
                    html += `<span class="entity-tag">${entity}</span>`;
                });
            } else {
                html += `<p class="card-text">No ${type} entities found.</p>`;
            }
            
            html += `</div></div></div>`;
        }
        
        html += `</div></div>`;
    }
    
    // Clauses
    if (data.clauses && Object.keys(data.clauses).length > 0) {
        html += `<div class="mb-4"><h6>Key Clauses</h6><div class="accordion" id="clausesAccordion">`;
        
        Object.entries(data.clauses).forEach(([type, clause], index) => {
            html += `
                <div class="accordion-item">
                    <h2 class="accordion-header" id="heading${index}">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                            ${formatClauseType(type)}
                        </button>
                    </h2>
                    <div id="collapse${index}" class="accordion-collapse collapse" data-bs-parent="#clausesAccordion">
                        <div class="accordion-body">
                            <p>${clause.text || 'No text available'}</p>
                            ${clause.page ? `<small class="text-muted">Page ${clause.page}</small>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `</div></div>`;
    }
    
    // Risks
    if (data.risks && data.risks.length > 0) {
        html += `<div class="mb-4"><h6>Identified Risks</h6>`;
        
        data.risks.forEach(risk => {
            const riskClass = risk.severity === 'high' ? 'high' : '';
            
            html += `
                <div class="risk-item ${riskClass}">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-1">${risk.title}</h6>
                        <span class="badge bg-${risk.severity === 'high' ? 'danger' : 'warning'}">${risk.severity}</span>
                    </div>
                    <p class="mb-1">${risk.description}</p>
                    ${risk.recommendation ? `<small class="text-muted"><strong>Recommendation:</strong> ${risk.recommendation}</small>` : ''}
                </div>
            `;
        });
        
        html += `</div>`;
    }
    
    html += `</div>`;
    
    // Set the HTML
    analysisResults.innerHTML = html;
}

// Send chat message
function sendChatMessage() {
    if (!authToken) {
        showToast('Please sign in to use the chat', 'warning');
        return;
    }
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    appendUserMessage(message);
    
    // Clear input
    chatInput.value = '';
    
    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'bot-message typing-indicator';
    typingIndicator.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
    chatMessages.appendChild(typingIndicator);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Send message to server
    fetch('/api/chat/message', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        return response.json();
    })
    .then(data => {
        // Remove typing indicator
        const indicators = document.querySelectorAll('.typing-indicator');
        indicators.forEach(indicator => indicator.remove());
        
        // Add bot message
        appendBotMessage(data.reply);
    })
    .catch(error => {
        console.error('Error sending chat message:', error);
        
        // Remove typing indicator
        const indicators = document.querySelectorAll('.typing-indicator');
        indicators.forEach(indicator => indicator.remove());
        
        // Add error message
        appendErrorMessage('Sorry, I encountered an error processing your request. Please try again.');
    });
}

// Append user message to chat
function appendUserMessage(message) {
    const messageElem = document.createElement('div');
    messageElem.className = 'user-message';
    messageElem.textContent = message;
    chatMessages.appendChild(messageElem);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Append bot message to chat
function appendBotMessage(message) {
    const messageElem = document.createElement('div');
    messageElem.className = 'bot-message';
    messageElem.innerHTML = message;
    chatMessages.appendChild(messageElem);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Append error message to chat
function appendErrorMessage(message) {
    const messageElem = document.createElement('div');
    messageElem.className = 'bot-message error';
    messageElem.textContent = message;
    chatMessages.appendChild(messageElem);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Logout the user
function logout() {
    // Clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = 'login.html';
}

// Utility: Format entity type
function formatEntityType(type) {
    return type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

// Utility: Format clause type
function formatClauseType(type) {
    return type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

// Utility: Get status class
function getStatusClass(status) {
    switch (status) {
        case 'pending':
            return 'bg-secondary';
        case 'processing':
            return 'bg-primary';
        case 'completed':
            return 'bg-success';
        case 'failed':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

// Utility: Get status icon
function getStatusIcon(status) {
    switch (status) {
        case 'pending':
            return '<i class="fas fa-clock"></i>';
        case 'processing':
            return '<i class="fas fa-spinner fa-spin"></i>';
        case 'completed':
            return '<i class="fas fa-check"></i>';
        case 'failed':
            return '<i class="fas fa-times"></i>';
        default:
            return '<i class="fas fa-question"></i>';
    }
}

// Utility: Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) {
        return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + ' KB';
    } else if (bytes < 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    } else {
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }
}

// Utility: Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // If less than a day, show relative time
    if (diff < 24 * 60 * 60 * 1000) {
        // If less than an hour
        if (diff < 60 * 60 * 1000) {
            const minutes = Math.floor(diff / (60 * 1000));
            return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
        }
        
        // If less than a day
        const hours = Math.floor(diff / (60 * 60 * 1000));
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
    
    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    // Otherwise, show full date
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Utility: Show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast show`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    // Set toast color based on type
    let bgColor = 'bg-info';
    let icon = 'fa-info-circle';
    
    if (type === 'success') {
        bgColor = 'bg-success';
        icon = 'fa-check-circle';
    } else if (type === 'warning') {
        bgColor = 'bg-warning';
        icon = 'fa-exclamation-circle';
    } else if (type === 'error') {
        bgColor = 'bg-danger';
        icon = 'fa-times-circle';
    }
    
    // Set toast content
    toast.innerHTML = `
        <div class="toast-header ${bgColor} text-white">
            <i class="fas ${icon} me-2"></i>
            <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Add close handler
    const closeBtn = toast.querySelector('.btn-close');
    closeBtn.addEventListener('click', () => {
        toast.remove();
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
} 