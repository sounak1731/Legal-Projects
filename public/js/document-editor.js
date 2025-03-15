/**
 * Document Editor - Main JavaScript for the document editor functionality
 * Handles document viewing, annotation, and e-signing capabilities
 */

// Global variables
let currentDocument = null;
let currentPage = 1;
let totalPages = 0;
let scale = 1.0;
let pdfDocument = null;
let documentPageCanvases = [];
let selectedTool = 'pan';
let authToken = null;
let currentUser = null;
let signaturePosition = { page: 1, x: 0, y: 0 };

// DOM Elements
const documentTitle = document.getElementById('documentTitle');
const documentMeta = document.getElementById('documentMeta');
const documentsList = document.getElementById('documentsList');
const documentPages = document.getElementById('documentPages');
const pageInfo = document.getElementById('pageInfo');
const zoomInfo = document.getElementById('zoomInfo');
const signaturePanel = document.getElementById('signaturePanel');
const backdrop = document.getElementById('backdrop');
const signatureCanvas = document.getElementById('signatureCanvas');
const signatureTextPreview = document.getElementById('signatureTextPreview');
const signatureText = document.getElementById('signatureText');
const signatureFile = document.getElementById('signatureFile');
const signaturePreview = document.getElementById('signaturePreview');

// Button Elements
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const signBtn = document.getElementById('signBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');
const printBtn = document.getElementById('printBtn');
const deleteBtn = document.getElementById('deleteBtn');
const uploadNewBtn = document.getElementById('uploadNewBtn');
const toolButtons = document.querySelectorAll('.tool-btn');
const clearSignatureBtn = document.getElementById('clearSignatureBtn');
const saveDrawnSignatureBtn = document.getElementById('saveDrawnSignatureBtn');
const saveTypedSignatureBtn = document.getElementById('saveTypedSignatureBtn');
const saveUploadedSignatureBtn = document.getElementById('saveUploadedSignatureBtn');
const closeSignaturePanel = document.getElementById('closeSignaturePanel');
const logoutBtn = document.getElementById('logoutBtn');
const uploadDocumentBtn = document.getElementById('uploadDocumentBtn');

// Initialize the document editor
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    initializeDocumentList();
    initializeEventListeners();
    initializeSignatureCanvas();
});

// Check authentication and get current user
function initializeAuth() {
    authToken = localStorage.getItem('auth_token');
    
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

// Load the list of documents
function initializeDocumentList() {
    if (!authToken) return;
    
    fetch('/api/documents', {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        // Clear the loading indicator
        documentsList.innerHTML = '';
        
        if (data.length === 0) {
            documentsList.innerHTML = `
                <div class="list-group-item">
                    <p class="text-muted mb-0">No documents found</p>
                    <small class="text-muted">Upload a new document to get started</small>
                </div>
            `;
            return;
        }
        
        // Add each document to the list
        data.forEach(doc => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action';
            item.dataset.documentId = doc.id;
            
            // Determine icon based on mime type
            let icon = 'fa-file';
            if (doc.mimeType.includes('pdf')) {
                icon = 'fa-file-pdf';
            } else if (doc.mimeType.includes('word') || doc.mimeType.includes('document')) {
                icon = 'fa-file-word';
            } else if (doc.mimeType.includes('text')) {
                icon = 'fa-file-lines';
            }
            
            item.innerHTML = `
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <div>
                        <i class="far ${icon} me-2"></i>
                        <span>${doc.name}</span>
                    </div>
                    <small class="text-muted">${formatDate(doc.updatedAt)}</small>
                </div>
                <small class="text-muted d-block mt-1">
                    ${doc.category.replace('_', ' ')} · ${formatFileSize(doc.size)}
                </small>
            `;
            
            // Add click event to load the document
            item.addEventListener('click', (e) => {
                e.preventDefault();
                loadDocument(doc.id);
                
                // Update active state
                document.querySelectorAll('#documentsList a').forEach(el => {
                    el.classList.remove('active');
                });
                item.classList.add('active');
            });
            
            documentsList.appendChild(item);
        });
        
        // If there are documents, load the first one
        if (data.length > 0) {
            const firstDoc = documentsList.querySelector('a');
            if (firstDoc) {
                firstDoc.click();
            }
        }
    })
    .catch(error => {
        console.error('Error loading documents:', error);
        showToast('Error loading documents. Please try again.', 'error');
        documentsList.innerHTML = `
            <div class="list-group-item">
                <p class="text-danger mb-0">Error loading documents</p>
                <small class="text-muted">Please refresh to try again</small>
            </div>
        `;
    });
}

// Load a document by ID
function loadDocument(documentId) {
    if (!authToken) return;
    
    // Show loading state
    documentTitle.textContent = 'Loading document...';
    documentMeta.textContent = '';
    documentPages.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">Loading document...</p>
        </div>
    `;
    
    // Reset page info
    currentPage = 1;
    totalPages = 0;
    pageInfo.textContent = 'Loading...';
    
    // Fetch the document details
    fetch(`/api/documents/${documentId}`, {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => response.json())
    .then(doc => {
        currentDocument = doc;
        
        // Update document info
        documentTitle.textContent = doc.name;
        documentMeta.textContent = `${doc.category.replace('_', ' ')} · ${formatFileSize(doc.size)} · Uploaded ${formatDate(doc.createdAt)}`;
        
        // Download the document file
        return fetch(`/api/documents/${documentId}/download`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
    })
    .then(response => response.blob())
    .then(blob => {
        // Create a URL for the blob
        const url = URL.createObjectURL(blob);
        
        // Load the PDF using PDF.js
        pdfjsLib.getDocument(url).promise.then(pdf => {
            pdfDocument = pdf;
            totalPages = pdf.numPages;
            
            // Update pagination info
            updatePageInfo();
            
            // Clear existing pages
            documentPages.innerHTML = '';
            documentPageCanvases = [];
            
            // Render the first page
            renderPage(currentPage);
        }).catch(error => {
            console.error('Error rendering PDF:', error);
            documentPages.innerHTML = `
                <div class="alert alert-danger m-3">
                    <h5>Error loading document</h5>
                    <p>This document could not be rendered. It may be corrupted or in an unsupported format.</p>
                </div>
            `;
        });
    })
    .catch(error => {
        console.error('Error loading document:', error);
        showToast('Error loading document. Please try again.', 'error');
        documentPages.innerHTML = `
            <div class="alert alert-danger m-3">
                <h5>Error loading document</h5>
                <p>There was an error loading this document. Please try again later.</p>
            </div>
        `;
    });
}

// Render a specific page of the PDF
function renderPage(pageNumber) {
    if (!pdfDocument) return;
    
    // Get the page
    pdfDocument.getPage(pageNumber).then(page => {
        // Create a container for the page
        const pageContainer = document.createElement('div');
        pageContainer.className = 'document-page';
        pageContainer.dataset.pageNumber = pageNumber;
        
        // Create a canvas for the page
        const canvas = document.createElement('canvas');
        canvas.className = 'document-canvas';
        pageContainer.appendChild(canvas);
        
        // Add the page to the document
        documentPages.appendChild(pageContainer);
        
        // Store the canvas for later use
        documentPageCanvases[pageNumber] = canvas;
        
        // Calculate viewport
        const viewport = page.getViewport({ scale: scale });
        
        // Set canvas dimensions
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render the page
        const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
        };
        
        page.render(renderContext);
        
        // Enable page navigation buttons
        updatePageInfo();
    });
}

// Update page navigation info
function updatePageInfo() {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    
    // Enable buttons if document is loaded
    signBtn.disabled = !pdfDocument;
    analyzeBtn.disabled = !pdfDocument;
    downloadBtn.disabled = !pdfDocument;
    shareBtn.disabled = !pdfDocument;
    printBtn.disabled = !pdfDocument;
    deleteBtn.disabled = !pdfDocument;
}

// Initialize drawing on the signature canvas
function initializeSignatureCanvas() {
    const ctx = signatureCanvas.getContext('2d');
    let isDrawing = false;
    
    // Set canvas size
    signatureCanvas.width = signatureCanvas.offsetWidth;
    signatureCanvas.height = signatureCanvas.offsetHeight;
    
    // Set up drawing style
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
    
    // Drawing event handlers
    signatureCanvas.addEventListener('mousedown', startDrawing);
    signatureCanvas.addEventListener('touchstart', startDrawing);
    
    signatureCanvas.addEventListener('mousemove', draw);
    signatureCanvas.addEventListener('touchmove', draw);
    
    signatureCanvas.addEventListener('mouseup', stopDrawing);
    signatureCanvas.addEventListener('touchend', stopDrawing);
    signatureCanvas.addEventListener('mouseout', stopDrawing);
    
    // Start drawing
    function startDrawing(e) {
        isDrawing = true;
        draw(e);
    }
    
    // Draw on the canvas
    function draw(e) {
        if (!isDrawing) return;
        
        // Prevent scrolling on touch devices
        e.preventDefault();
        
        // Get mouse/touch position
        const rect = signatureCanvas.getBoundingClientRect();
        let x, y;
        
        if (e.type.startsWith('mouse')) {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        } else {
            // Touch event
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        }
        
        // Draw
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }
    
    // Stop drawing
    function stopDrawing() {
        isDrawing = false;
        ctx.beginPath();
    }
    
    // Clear the canvas
    clearSignatureBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    });
}

// Initialize all event listeners
function initializeEventListeners() {
    // Page navigation
    prevPageBtn.addEventListener('click', previousPage);
    nextPageBtn.addEventListener('click', nextPage);
    
    // Zoom controls
    zoomInBtn.addEventListener('click', zoomIn);
    zoomOutBtn.addEventListener('click', zoomOut);
    
    // Document actions
    signBtn.addEventListener('click', openSignaturePanel);
    analyzeBtn.addEventListener('click', analyzeDocument);
    downloadBtn.addEventListener('click', downloadDocument);
    shareBtn.addEventListener('click', shareDocument);
    printBtn.addEventListener('click', printDocument);
    deleteBtn.addEventListener('click', confirmDeleteDocument);
    
    // Tool selection
    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all tools
            toolButtons.forEach(b => b.classList.remove('active'));
            
            // Add active class to selected tool
            btn.classList.add('active');
            
            // Set the selected tool
            selectedTool = btn.dataset.tool;
        });
    });
    
    // Signature panel
    closeSignaturePanel.addEventListener('click', closeSignaturePanelHandler);
    backdrop.addEventListener('click', closeSignaturePanelHandler);
    
    // Typed signature preview
    signatureText.addEventListener('input', updateTypedSignaturePreview);
    
    // Uploaded signature preview
    signatureFile.addEventListener('change', previewUploadedSignature);
    
    // Save signature buttons
    saveDrawnSignatureBtn.addEventListener('click', saveDrawnSignature);
    saveTypedSignatureBtn.addEventListener('click', saveTypedSignature);
    saveUploadedSignatureBtn.addEventListener('click', saveUploadedSignature);
    
    // Upload new document
    uploadNewBtn.addEventListener('click', openUploadModal);
    uploadDocumentBtn.addEventListener('click', uploadDocument);
    
    // Logout
    logoutBtn.addEventListener('click', logout);
}

// Navigation: Go to previous page
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
        updatePageInfo();
    }
}

// Navigation: Go to next page
function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        renderPage(currentPage);
        updatePageInfo();
    }
}

// Zoom: Increase scale
function zoomIn() {
    scale += 0.1;
    zoomInfo.textContent = `${Math.round(scale * 100)}%`;
    reRenderCurrentPage();
}

// Zoom: Decrease scale
function zoomOut() {
    if (scale > 0.2) {
        scale -= 0.1;
        zoomInfo.textContent = `${Math.round(scale * 100)}%`;
        reRenderCurrentPage();
    }
}

// Re-render the current page with updated scale
function reRenderCurrentPage() {
    const pageContainer = document.querySelector(`.document-page[data-page-number="${currentPage}"]`);
    if (pageContainer) {
        // Remove the page from the document
        pageContainer.remove();
        
        // Re-render the page
        renderPage(currentPage);
    }
}

// Open signature panel
function openSignaturePanel() {
    if (!currentDocument) {
        showToast('Please select a document to sign', 'warning');
        return;
    }
    
    // Show the signature panel
    signaturePanel.style.display = 'block';
    backdrop.style.display = 'block';
    
    // Set signature position to the center of the current page
    const canvas = documentPageCanvases[currentPage];
    if (canvas) {
        signaturePosition = {
            page: currentPage,
            x: canvas.width / 2 - 100,
            y: canvas.height / 2 - 50
        };
    }
}

// Close signature panel
function closeSignaturePanelHandler() {
    signaturePanel.style.display = 'none';
    backdrop.style.display = 'none';
}

// Update typed signature preview
function updateTypedSignaturePreview() {
    const text = signatureText.value.trim();
    signatureTextPreview.textContent = text || 'Your Name';
}

// Preview uploaded signature
function previewUploadedSignature(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Only accept images
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    // Create a preview
    const reader = new FileReader();
    reader.onload = (event) => {
        signaturePreview.src = event.target.result;
        signaturePreview.classList.remove('d-none');
    };
    reader.readAsDataURL(file);
}

// Save drawn signature
function saveDrawnSignature() {
    if (!currentDocument) return;
    
    // Get signature data from canvas
    const signatureData = signatureCanvas.toDataURL('image/png');
    
    // Save signature to the server
    saveSignature('drawn', signatureData);
}

// Save typed signature
function saveTypedSignature() {
    if (!currentDocument) return;
    
    const text = signatureText.value.trim();
    if (!text) {
        showToast('Please enter your name', 'warning');
        return;
    }
    
    // Save signature to the server
    saveSignature('typed', text);
}

// Save uploaded signature
function saveUploadedSignature() {
    if (!currentDocument) return;
    
    if (!signatureFile.files[0]) {
        showToast('Please select an image file', 'warning');
        return;
    }
    
    // Read the file as data URL
    const reader = new FileReader();
    reader.onload = (event) => {
        // Save signature to the server
        saveSignature('uploaded', event.target.result);
    };
    reader.readAsDataURL(signatureFile.files[0]);
}

// Save signature to the server
function saveSignature(type, data) {
    if (!authToken || !currentDocument) return;
    
    // Prepare the signature data
    const signatureData = {
        documentId: currentDocument.id,
        signatureType: type,
        signatureData: data,
        page: signaturePosition.page,
        positionX: signaturePosition.x,
        positionY: signaturePosition.y,
        width: 200,
        height: 100
    };
    
    // Send the signature to the server
    fetch('/api/esign/signatures', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(signatureData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save signature');
        }
        return response.json();
    })
    .then(data => {
        // Close the signature panel
        closeSignaturePanelHandler();
        
        // Show success message
        showToast('Signature applied successfully', 'success');
        
        // Update the document status
        if (currentDocument) {
            currentDocument.status = 'signed';
        }
        
        // Reload the document to show the signature
        loadDocument(currentDocument.id);
    })
    .catch(error => {
        console.error('Error saving signature:', error);
        showToast('Error applying signature. Please try again.', 'error');
    });
}

// Analyze the current document
function analyzeDocument() {
    if (!authToken || !currentDocument) {
        showToast('Please select a document to analyze', 'warning');
        return;
    }
    
    // Confirm analysis
    if (!confirm('Start document analysis? This may take a few moments.')) {
        return;
    }
    
    // Show loading state
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Analyzing...';
    
    // Send analysis request
    fetch(`/api/analysis/documents/${currentDocument.id}`, {
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
        // Show success message
        showToast('Document analysis started. You will be notified when it completes.', 'success');
        
        // Update button state
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-magnifying-glass-chart"></i> Analyzing...';
        
        // If analysis is completed immediately
        if (data.status === 'completed') {
            // Show success message
            showToast('Document analysis completed', 'success');
            
            // Reset button
            analyzeBtn.innerHTML = '<i class="fas fa-magnifying-glass-chart"></i> View Analysis';
            
            // Update document status
            if (currentDocument) {
                currentDocument.status = 'analyzed';
            }
        }
    })
    .catch(error => {
        console.error('Error analyzing document:', error);
        showToast('Error starting document analysis. Please try again.', 'error');
        
        // Reset button
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-magnifying-glass-chart"></i> Analyze';
    });
}

// Download the current document
function downloadDocument() {
    if (!authToken || !currentDocument) {
        showToast('Please select a document to download', 'warning');
        return;
    }
    
    // Create a link to download the document
    const downloadLink = document.createElement('a');
    downloadLink.href = `/api/documents/${currentDocument.id}/download?token=${authToken}`;
    downloadLink.download = currentDocument.name;
    downloadLink.target = '_blank';
    
    // Click the link to download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Share the current document
function shareDocument() {
    if (!currentDocument) {
        showToast('Please select a document to share', 'warning');
        return;
    }
    
    // Prompt for email
    const email = prompt('Enter the email address to share this document with:');
    if (!email) return;
    
    // Validate email
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'warning');
        return;
    }
    
    // Show loading state
    shareBtn.disabled = true;
    
    // Send share request
    fetch('/api/documents/share', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            documentId: currentDocument.id,
            email: email
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to share document');
        }
        return response.json();
    })
    .then(data => {
        // Show success message
        showToast(`Document shared with ${email}`, 'success');
        
        // Reset button
        shareBtn.disabled = false;
    })
    .catch(error => {
        console.error('Error sharing document:', error);
        showToast('Error sharing document. Please try again.', 'error');
        
        // Reset button
        shareBtn.disabled = false;
    });
}

// Print the current document
function printDocument() {
    if (!currentDocument) {
        showToast('Please select a document to print', 'warning');
        return;
    }
    
    // Open the document in a new tab for printing
    const printWindow = window.open(`/api/documents/${currentDocument.id}/download?token=${authToken}`, '_blank');
    if (printWindow) {
        printWindow.addEventListener('load', () => {
            printWindow.print();
        });
    } else {
        showToast('Please allow pop-ups to print the document', 'warning');
    }
}

// Confirm and delete the current document
function confirmDeleteDocument() {
    if (!currentDocument) {
        showToast('Please select a document to delete', 'warning');
        return;
    }
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${currentDocument.name}"? This action cannot be undone.`)) {
        return;
    }
    
    // Send delete request
    fetch(`/api/documents/${currentDocument.id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to delete document');
        }
        return response.json();
    })
    .then(data => {
        // Show success message
        showToast('Document deleted successfully', 'success');
        
        // Remove from document list
        const item = document.querySelector(`#documentsList a[data-document-id="${currentDocument.id}"]`);
        if (item) {
            item.remove();
        }
        
        // Clear document viewer
        documentTitle.textContent = 'No document selected';
        documentMeta.textContent = '';
        documentPages.innerHTML = '';
        
        // Reset variables
        currentDocument = null;
        pdfDocument = null;
        
        // Update page info
        updatePageInfo();
        
        // Reload document list
        initializeDocumentList();
    })
    .catch(error => {
        console.error('Error deleting document:', error);
        showToast('Error deleting document. Please try again.', 'error');
    });
}

// Open the upload modal
function openUploadModal() {
    // Clear form
    document.getElementById('uploadForm').reset();
    
    // Show modal
    const uploadModal = new bootstrap.Modal(document.getElementById('uploadModal'));
    uploadModal.show();
}

// Upload a new document
function uploadDocument() {
    // Get form data
    const name = document.getElementById('documentName').value.trim();
    const file = document.getElementById('documentFile').files[0];
    const category = document.getElementById('documentCategory').value;
    const description = document.getElementById('documentDescription').value.trim();
    const tags = document.getElementById('documentTags').value.trim();
    
    // Validate form
    if (!name || !file || !category) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('document', file);
    formData.append('name', name);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('tags', tags);
    
    // Show loading state
    uploadDocumentBtn.disabled = true;
    uploadDocumentBtn.textContent = 'Uploading...';
    
    // Send upload request
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
        // Show success message
        showToast('Document uploaded successfully', 'success');
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('uploadModal')).hide();
        
        // Reset button
        uploadDocumentBtn.disabled = false;
        uploadDocumentBtn.textContent = 'Upload';
        
        // Reload document list
        initializeDocumentList();
    })
    .catch(error => {
        console.error('Error uploading document:', error);
        showToast('Error uploading document. Please try again.', 'error');
        
        // Reset button
        uploadDocumentBtn.disabled = false;
        uploadDocumentBtn.textContent = 'Upload';
    });
}

// Logout the user
function logout() {
    // Clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = 'login.html';
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

// Utility: Validate email
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
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