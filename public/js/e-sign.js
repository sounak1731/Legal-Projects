/**
 * Project Zero - E-Signature Platform JavaScript
 * High-performance implementation with robust error handling
 */

// Use strict mode for better error catching and performance
'use strict';

// Cache DOM elements to improve performance
const DOM = {};
let documents = [];
let currentDocumentId = null;
let sortOrder = 'date-desc';
let signaturePad = null;
let selectedSignatureType = 'draw';
let signatureData = null;

// API endpoint configuration
const API = {
    DOCUMENTS: '/api/documents',
    SIGNATURES: '/api/signatures',
    UPLOAD: '/api/documents/upload'  // Use the correct upload endpoint
};

// Use a debounce function to limit rapid function calls
const debounce = (fn, delay = 300) => {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
};

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements for better performance
    cacheElements();
    
    // Initialize UI components
    initializeUI();
    
    // Load documents
    loadDocuments().catch(handleError);
    
    // Set up sort listeners
    setupSortListeners();
    
    // Initialize signature tools
    initializeSignatureTools();
});

/**
 * Cache DOM elements for better performance
 */
function cacheElements() {
    // Main containers
    DOM.uploadSection = document.getElementById('upload-section');
    DOM.signingSection = document.getElementById('signing-section');
    DOM.toolsPanel = document.getElementById('tools-panel');
    DOM.signaturePanel = document.getElementById('signature-panel');
    
    // File upload elements
    DOM.uploadZone = document.getElementById('upload-zone');
    DOM.fileInput = document.getElementById('file-input');
    DOM.browseBtn = document.getElementById('browse-btn');
    DOM.documentList = document.getElementById('document-list');
    
    // Document signing elements
    DOM.currentDocumentName = document.getElementById('current-document-name');
    DOM.pdfContainer = document.getElementById('pdf-container');
    DOM.backToDocuments = document.getElementById('back-to-documents');
    
    // Signature elements
    DOM.signaturePad = document.getElementById('signature-pad');
    DOM.clearSignatureBtn = document.getElementById('clear-signature-btn');
    DOM.typedSignature = document.getElementById('typed-signature');
    DOM.typedSignaturePreview = document.getElementById('typed-signature-preview');
    DOM.signatureUpload = document.getElementById('signature-upload');
    DOM.uploadedSignaturePreview = document.getElementById('uploaded-signature-preview');
    DOM.saveSignatureBtn = document.getElementById('save-signature-btn');
    DOM.backToToolsBtn = document.getElementById('back-to-tools');
    DOM.signatureStyleBtns = document.querySelectorAll('.signature-style-btn');
    
    // Signing actions
    DOM.addSignatureBtn = document.getElementById('add-signature-btn');
    DOM.addInitialsBtn = document.getElementById('add-initials-btn');
    DOM.addTextBtn = document.getElementById('add-text-btn');
    DOM.addDateBtn = document.getElementById('add-date-btn');
    DOM.saveProgressBtn = document.getElementById('save-progress-btn');
    DOM.completeSigningBtn = document.getElementById('complete-signing-btn');
    
    // Participants
    DOM.participantsList = document.getElementById('participants-list');
    DOM.addSignerBtn = document.getElementById('add-signer-btn');
    DOM.confirmAddSignerBtn = document.getElementById('confirm-add-signer-btn');
    DOM.signerName = document.getElementById('signer-name');
    DOM.signerEmail = document.getElementById('signer-email');
    DOM.signingOrder = document.getElementById('signing-order');
    DOM.signerMessage = document.getElementById('signer-message');
    
    // Modals
    DOM.addSignerModal = document.getElementById('addSignerModal');
    DOM.completeSigningModal = document.getElementById('completeSigningModal');
    DOM.confirmSigningCheckbox = document.getElementById('confirm-signing');
    DOM.finalizeSigningBtn = document.getElementById('finalize-signing-btn');
    
    // Utility
    DOM.loadingOverlay = document.getElementById('loading-overlay');
    DOM.loadingMessage = document.getElementById('loading-message');
}

/**
 * Initialize the UI components
 */
function initializeUI() {
    try {
        // Initialize file input
        if (DOM.browseBtn && DOM.fileInput) {
            DOM.browseBtn.addEventListener('click', () => DOM.fileInput.click());
            DOM.fileInput.addEventListener('change', handleFileSelection);
        }

        // Initialize drag and drop
        if (DOM.uploadZone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                DOM.uploadZone.addEventListener(eventName, preventDefaults);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                DOM.uploadZone.addEventListener(eventName, highlight);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                DOM.uploadZone.addEventListener(eventName, unhighlight);
            });

            DOM.uploadZone.addEventListener('drop', handleDrop);
        }
        
        // Handle back to documents button
        if (DOM.backToDocuments) {
            DOM.backToDocuments.addEventListener('click', showDocumentList);
        }
        
        // Handle back to tools button
        if (DOM.backToToolsBtn) {
            DOM.backToToolsBtn.addEventListener('click', showToolsPanel);
        }
        
        // Handle signing actions
        if (DOM.addSignatureBtn) {
            DOM.addSignatureBtn.addEventListener('click', () => showSignaturePad());
        }
        
        if (DOM.addInitialsBtn) {
            DOM.addInitialsBtn.addEventListener('click', () => showInitialsTool());
        }
        
        if (DOM.addTextBtn) {
            DOM.addTextBtn.addEventListener('click', () => showAddTextUI());
        }
        
        if (DOM.addDateBtn) {
            DOM.addDateBtn.addEventListener('click', () => showAddDateUI());
        }
        
        if (DOM.saveProgressBtn) {
            DOM.saveProgressBtn.addEventListener('click', saveSigningProgress);
        }
        
        if (DOM.completeSigningBtn) {
            DOM.completeSigningBtn.addEventListener('click', showCompleteSigningModal);
        }
        
        // Add signer
        if (DOM.addSignerBtn && DOM.addSignerModal) {
            DOM.addSignerBtn.addEventListener('click', () => {
                new bootstrap.Modal(DOM.addSignerModal).show();
            });
        }
        
        if (DOM.confirmAddSignerBtn) {
            DOM.confirmAddSignerBtn.addEventListener('click', addNewSigner);
        }
        
        // Complete signing
        if (DOM.finalizeSigningBtn) {
            DOM.finalizeSigningBtn.addEventListener('click', completeDocumentSigning);
        }
    } catch (error) {
        handleError(error, 'Failed to initialize UI');
    }
}

/**
 * Initialize signature tools
 */
function initializeSignatureTools() {
    try {
        // Initialize signature pad
        if (DOM.signaturePad) {
            signaturePad = new SignaturePad(DOM.signaturePad, {
                backgroundColor: 'rgb(255, 255, 255)',
                penColor: 'rgb(0, 0, 0)',
                minWidth: 1,
                maxWidth: 3,
                throttle: 16 // For smoother drawing
            });
            
            // Handle window resize to adapt signature pad
            window.addEventListener('resize', resizeSignaturePad);
            
            // Initial sizing
            resizeSignaturePad();
            
            // Clear signature button
            if (DOM.clearSignatureBtn) {
                DOM.clearSignatureBtn.addEventListener('click', () => {
                    signaturePad.clear();
                });
            }
        }
        
        // Handle typed signature
        if (DOM.typedSignature) {
            DOM.typedSignature.addEventListener('input', updateTypedSignature);
        }
        
        // Handle signature style buttons
        if (DOM.signatureStyleBtns && DOM.signatureStyleBtns.length > 0) {
            DOM.signatureStyleBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    // Remove active class from all buttons
                    DOM.signatureStyleBtns.forEach(b => b.classList.remove('active'));
                    
                    // Add active class to clicked button
                    e.currentTarget.classList.add('active');
                    
                    // Update signature style
                    updateTypedSignature();
                });
            });
        }
        
        // Handle signature upload
        if (DOM.signatureUpload) {
            DOM.signatureUpload.addEventListener('change', handleSignatureUpload);
        }
        
        // Handle save signature
        if (DOM.saveSignatureBtn) {
            DOM.saveSignatureBtn.addEventListener('click', applySignature);
        }
        
        // Set up signature tabs
        const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
        if (tabs && tabs.length > 0) {
            tabs.forEach(tab => {
                tab.addEventListener('shown.bs.tab', (e) => {
                    const target = e.target.getAttribute('id');
                    if (target === 'draw-tab') {
                        selectedSignatureType = 'draw';
                        resizeSignaturePad();
                    } else if (target === 'type-tab') {
                        selectedSignatureType = 'type';
                        updateTypedSignature();
                    } else if (target === 'upload-tab') {
                        selectedSignatureType = 'upload';
                    }
                });
            });
        }
    } catch (error) {
        handleError(error, 'Failed to initialize signature tools');
    }
}

/**
 * Setup sort listeners for document list
 */
function setupSortListeners() {
    const sortLinks = document.querySelectorAll('[data-sort]');
    sortLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            sortOrder = e.currentTarget.dataset.sort;
            displayDocuments(documents);
        });
    });
}

/**
 * Prevent default behaviors for drag and drop events
 */
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * Highlight drop zone when dragging over
 */
function highlight() {
    DOM.uploadZone.classList.add('border-primary');
    DOM.uploadZone.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
}

/**
 * Remove highlight when leaving drop zone
 */
function unhighlight() {
    DOM.uploadZone.classList.remove('border-primary');
    DOM.uploadZone.style.backgroundColor = '';
}

/**
 * Handle file selection from browse button
 */
async function handleFileSelection(e) {
    try {
        const files = e.target.files;
        if (files.length > 0) {
            await uploadFile(files[0]);
        }
    } catch (error) {
        handleError(error, 'File selection failed');
    } finally {
        // Reset the file input to allow selecting the same file again
        if (DOM.fileInput) DOM.fileInput.value = '';
    }
}

/**
 * Handle file drop event
 */
async function handleDrop(e) {
    try {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await uploadFile(files[0]);
        }
    } catch (error) {
        handleError(error, 'File drop failed');
    }
}

/**
 * Upload a file to the server
 */
async function uploadFile(file) {
    try {
        // Validate file size
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            throw new Error(`File too large. Maximum size: 10MB`);
        }
        
        // Validate file type
        const validTypes = ['.pdf', '.doc', '.docx'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!validTypes.includes(fileExtension)) {
            throw new Error('Unsupported file type. Please upload PDF, DOC, or DOCX files.');
        }
        
        showLoading('Uploading document...');
        
        const formData = new FormData();
        formData.append('document', file);
        
        const response = await fetch(API.UPLOAD, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Upload failed');
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Upload failed');
        }
        
        showNotification('Document uploaded successfully', 'success');
        await loadDocuments();
    } catch (error) {
        handleError(error, 'Upload failed');
    } finally {
        hideLoading();
    }
}

/**
 * Load documents from server
 */
async function loadDocuments() {
    try {
        showLoading('Loading documents...');
        
        const response = await fetch(API.DOCUMENTS);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch documents');
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to fetch documents');
        }
        
        documents = result.documents || [];
        displayDocuments(documents);
    } catch (error) {
        handleError(error, 'Failed to load documents');
    } finally {
        hideLoading();
    }
}

/**
 * Display documents in the UI
 */
function displayDocuments(docs) {
    try {
        if (!DOM.documentList) return;
        
        // Sort documents based on current sort order
        const sortedDocs = sortDocuments(docs, sortOrder);
        
        if (sortedDocs.length === 0) {
            DOM.documentList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-signature"></i>
                    <h5>No documents yet</h5>
                    <p>Upload a document to begin signing</p>
                </div>
            `;
            return;
        }
        
        DOM.documentList.innerHTML = sortedDocs.map(doc => `
            <div class="document-item fade-in">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 class="mb-1">${escapeHtml(doc.name)}</h5>
                        <p class="text-muted mb-2 small">
                            ${formatFileSize(doc.file_size)} • 
                            ${formatDate(doc.upload_date)}
                        </p>
                    </div>
                    <span class="status-badge ${doc.status === 'signed' ? 'status-signed' : 'status-pending'}">
                        ${doc.status === 'signed' ? 'Signed' : 'Pending'}
                    </span>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="openDocument(${doc.id})">
                        <i class="fas fa-signature me-1"></i> Sign
                    </button>
                    <button class="btn btn-outline-primary" onclick="viewDocument(${doc.id})">
                        <i class="fas fa-eye me-1"></i> View
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteDocument(${doc.id})">
                        <i class="fas fa-trash me-1"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        handleError(error, 'Failed to display documents');
    }
}

/**
 * Sort documents based on sort order
 */
function sortDocuments(docs, order) {
    const clonedDocs = [...docs];
    
    switch (order) {
        case 'date-desc':
            return clonedDocs.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
        case 'date-asc':
            return clonedDocs.sort((a, b) => new Date(a.upload_date) - new Date(b.upload_date));
        case 'name-asc':
            return clonedDocs.sort((a, b) => a.name.localeCompare(b.name));
        case 'name-desc':
            return clonedDocs.sort((a, b) => b.name.localeCompare(a.name));
        default:
            return clonedDocs;
    }
}

/**
 * Open a document for signing
 */
function openDocument(documentId) {
    try {
        currentDocumentId = documentId;
        const document = documents.find(doc => doc.id === documentId);
        
        if (!document) {
            throw new Error('Document not found');
        }
        
        // Set document name
        if (DOM.currentDocumentName) {
            DOM.currentDocumentName.textContent = document.name;
        }
        
        // Show document preview (this would be replaced with a PDF viewer in a real implementation)
        if (DOM.pdfContainer) {
            // Simple placeholder for demo purposes
            DOM.pdfContainer.innerHTML = `
                <div class="position-relative" style="height: 400px; overflow: hidden;">
                    <div class="text-center" style="padding: 2rem; background-color: #f8f9fa; height: 100%;">
                        <i class="fas fa-file-pdf fa-3x mb-3 text-primary"></i>
                        <h5>Document Preview</h5>
                        <p>This is a placeholder for the document preview.</p>
                        <p><small>In a real implementation, the document would be rendered here with signature fields.</small></p>
                    </div>
                    <!-- Signature fields would be placed here in a real implementation -->
                    <div class="signature-field position-absolute" style="bottom: 100px; right: 100px; width: 200px; height: 80px;">
                        <i class="fas fa-signature"></i>
                        <p>Click to sign</p>
                    </div>
                </div>
            `;
        }
        
        // Show signing section
        showSigningSection();
    } catch (error) {
        handleError(error, 'Failed to open document');
    }
}

/**
 * View a document (read-only)
 */
function viewDocument(documentId) {
    try {
        window.open(`${API.DOCUMENTS}/${documentId}/view`, '_blank');
    } catch (error) {
        handleError(error, 'Failed to view document');
    }
}

/**
 * Delete a document
 */
async function deleteDocument(documentId) {
    try {
        if (!confirm('Are you sure you want to delete this document?')) {
            return;
        }
        
        showLoading('Deleting document...');
        
        const response = await fetch(`${API.DOCUMENTS}/${documentId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete document');
        }
        
        showNotification('Document deleted successfully', 'success');
        await loadDocuments();
    } catch (error) {
        handleError(error, 'Failed to delete document');
    } finally {
        hideLoading();
    }
}

/**
 * Show document list and hide signing section
 */
function showDocumentList() {
    try {
        if (DOM.uploadSection) DOM.uploadSection.style.display = 'block';
        if (DOM.signingSection) DOM.signingSection.style.display = 'none';
        currentDocumentId = null;
    } catch (error) {
        handleError(error, 'Failed to show document list');
    }
}

/**
 * Show signing section and hide document list
 */
function showSigningSection() {
    try {
        if (DOM.uploadSection) DOM.uploadSection.style.display = 'none';
        if (DOM.signingSection) DOM.signingSection.style.display = 'block';
    } catch (error) {
        handleError(error, 'Failed to show signing section');
    }
}

/**
 * Show signature pad
 */
function showSignaturePad() {
    try {
        if (DOM.toolsPanel) DOM.toolsPanel.style.display = 'none';
        if (DOM.signaturePanel) DOM.signaturePanel.style.display = 'block';
        
        // Reset to draw tab
        const drawTab = document.getElementById('draw-tab');
        if (drawTab) {
            const tabInstance = new bootstrap.Tab(drawTab);
            tabInstance.show();
            selectedSignatureType = 'draw';
        }
        
        // Clear existing signature
        if (signaturePad) {
            signaturePad.clear();
        }
        
        // Reset typed signature
        if (DOM.typedSignature) {
            DOM.typedSignature.value = '';
            updateTypedSignature();
        }
        
        // Reset uploaded signature
        if (DOM.signatureUpload) {
            DOM.signatureUpload.value = '';
            
            if (DOM.uploadedSignaturePreview) {
                DOM.uploadedSignaturePreview.classList.add('d-none');
                DOM.uploadedSignaturePreview.src = '';
            }
        }
    } catch (error) {
        handleError(error, 'Failed to show signature pad');
    }
}

/**
 * Show tools panel and hide signature panel
 */
function showToolsPanel() {
    try {
        if (DOM.toolsPanel) DOM.toolsPanel.style.display = 'block';
        if (DOM.signaturePanel) DOM.signaturePanel.style.display = 'none';
    } catch (error) {
        handleError(error, 'Failed to show tools panel');
    }
}

/**
 * Handle window resize for signature pad
 */
function resizeSignaturePad() {
    try {
        if (!signaturePad || !DOM.signaturePad) return;
        
        const canvas = DOM.signaturePad;
        const ratio =  Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear(); // Otherwise isEmpty() might return incorrect value
    } catch (error) {
        handleError(error, 'Failed to resize signature pad');
    }
}

/**
 * Update typed signature preview based on input and selected style
 */
function updateTypedSignature() {
    try {
        if (!DOM.typedSignature || !DOM.typedSignaturePreview) return;
        
        const name = DOM.typedSignature.value.trim();
        if (!name) {
            DOM.typedSignaturePreview.innerHTML = '';
            return;
        }
        
        // Find active style
        const activeStyleBtn = document.querySelector('.signature-style-btn.active');
        const style = activeStyleBtn ? activeStyleBtn.dataset.style : 'style1';
        
        // Generate styled signature
        let html = '';
        switch (style) {
            case 'style1':
                html = `<span style="font-family: 'Brush Script MT', cursive; font-size: 2rem; color: #1e3a8a;">${name}</span>`;
                break;
            case 'style2':
                html = `<span style="font-family: 'Courier New', monospace; font-size: 1.5rem; font-weight: bold; color: #1e3a8a;">${name}</span>`;
                break;
            case 'style3':
                html = `<span style="font-family: 'Times New Roman', serif; font-size: 1.8rem; font-style: italic; color: #1e3a8a;">${name}</span>`;
                break;
            default:
                html = `<span style="font-family: 'Arial', sans-serif; font-size: 1.5rem; color: #1e3a8a;">${name}</span>`;
        }
        
        DOM.typedSignaturePreview.innerHTML = html;
    } catch (error) {
        handleError(error, 'Failed to update typed signature');
    }
}

/**
 * Handle signature image upload
 */
function handleSignatureUpload(e) {
    try {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.match('image.*')) {
            showNotification('Please upload an image file (JPG, PNG, GIF)', 'warning');
            return;
        }
        
        // Read and display the file
        const reader = new FileReader();
        reader.onload = function(event) {
            if (DOM.uploadedSignaturePreview) {
                DOM.uploadedSignaturePreview.src = event.target.result;
                DOM.uploadedSignaturePreview.classList.remove('d-none');
            }
        };
        
        reader.readAsDataURL(file);
    } catch (error) {
        handleError(error, 'Failed to process signature image');
    }
}

/**
 * Apply signature to the document
 */
function applySignature() {
    try {
        // Get signature data based on selected type
        let signatureImage = '';
        
        switch (selectedSignatureType) {
            case 'draw':
                if (signaturePad && !signaturePad.isEmpty()) {
                    signatureImage = signaturePad.toDataURL();
                } else {
                    showNotification('Please draw your signature', 'warning');
                    return;
                }
                break;
                
            case 'type':
                if (DOM.typedSignaturePreview && DOM.typedSignaturePreview.innerHTML) {
                    const name = DOM.typedSignature.value.trim();
                    if (!name) {
                        showNotification('Please type your name', 'warning');
                        return;
                    }
                    
                    // Convert HTML to image (in a real implementation, this would be done server-side)
                    // For demo, just store the HTML
                    signatureImage = DOM.typedSignaturePreview.innerHTML;
                } else {
                    showNotification('Please type your name', 'warning');
                    return;
                }
                break;
                
            case 'upload':
                if (DOM.uploadedSignaturePreview && !DOM.uploadedSignaturePreview.classList.contains('d-none')) {
                    signatureImage = DOM.uploadedSignaturePreview.src;
                } else {
                    showNotification('Please upload a signature image', 'warning');
                    return;
                }
                break;
                
            default:
                showNotification('Please select a signature method', 'warning');
                return;
        }
        
        // Save signature data
        signatureData = signatureImage;
        
        // In a real application, you would position this signature on the document
        showNotification('Signature applied to document', 'success');
        
        // Show tools panel
        showToolsPanel();
    } catch (error) {
        handleError(error, 'Failed to apply signature');
    }
}

/**
 * Show initials tool
 */
function showInitialsTool() {
    showNotification('Initials tool coming soon', 'info');
}

/**
 * Show stamp tool
 */
function showStampTool() {
    showNotification('Digital stamps feature coming soon', 'info');
}

/**
 * Show text addition UI
 */
function showAddTextUI() {
    showNotification('Text addition feature coming soon', 'info');
}

/**
 * Show date addition UI
 */
function showAddDateUI() {
    showNotification('Date insertion feature coming soon', 'info');
}

/**
 * Save signing progress
 */
function saveSigningProgress() {
    try {
        showNotification('Progress saved successfully', 'success');
    } catch (error) {
        handleError(error, 'Failed to save progress');
    }
}

/**
 * Show complete signing modal
 */
function showCompleteSigningModal() {
    try {
        if (!signatureData) {
            showNotification('Please add your signature before completing', 'warning');
            return;
        }
        
        // Show modal
        if (DOM.completeSigningModal) {
            const modal = new bootstrap.Modal(DOM.completeSigningModal);
            modal.show();
        }
    } catch (error) {
        handleError(error, 'Failed to show completion modal');
    }
}

/**
 * Complete document signing
 */
function completeDocumentSigning() {
    try {
        showLoading('Completing signature process...');
        
        // In a real implementation, this would send the signature data to the server
        setTimeout(() => {
            hideLoading();
            showNotification('Document successfully signed!', 'success');
            
            // Close modal
            if (DOM.completeSigningModal) {
                const modal = bootstrap.Modal.getInstance(DOM.completeSigningModal);
                if (modal) modal.hide();
            }
            
            // Return to document list
            showDocumentList();
            
            // Reload documents
            loadDocuments().catch(handleError);
        }, 1500);
    } catch (error) {
        hideLoading();
        handleError(error, 'Failed to complete signing');
    }
}

/**
 * Add a new signer to the document
 */
function addNewSigner() {
    try {
        // Validate inputs
        if (!DOM.signerName || !DOM.signerEmail) return;
        
        const name = DOM.signerName.value.trim();
        const email = DOM.signerEmail.value.trim();
        
        if (!name) {
            showNotification('Please enter signer name', 'warning');
            return;
        }
        
        if (!email) {
            showNotification('Please enter signer email', 'warning');
            return;
        }
        
        if (!isValidEmail(email)) {
            showNotification('Please enter a valid email address', 'warning');
            return;
        }
        
        // Create signer (in a real implementation, this would be sent to the server)
        const order = DOM.signingOrder ? DOM.signingOrder.value : 'concurrent';
        const message = DOM.signerMessage ? DOM.signerMessage.value.trim() : '';
        
        // Add to participants list
        const initials = name.split(' ').map(word => word[0]).join('').toUpperCase();
        const html = `
            <div class="participant-item fade-in">
                <div class="participant-avatar">
                    <span>${initials}</span>
                </div>
                <div class="participant-info">
                    <div class="d-flex justify-content-between">
                        <div>
                            <span class="fw-medium">${escapeHtml(name)}</span>
                            <div class="text-muted small">${escapeHtml(email)}</div>
                        </div>
                        <span class="participant-status text-warning">Pending</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add to DOM before the Add Signer button
        if (DOM.participantsList && DOM.addSignerBtn) {
            DOM.addSignerBtn.insertAdjacentHTML('beforebegin', html);
        }
        
        // Close modal
        if (DOM.addSignerModal) {
            const modal = bootstrap.Modal.getInstance(DOM.addSignerModal);
            if (modal) modal.hide();
        }
        
        // Reset form
        if (DOM.signerName) DOM.signerName.value = '';
        if (DOM.signerEmail) DOM.signerEmail.value = '';
        if (DOM.signerMessage) DOM.signerMessage.value = '';
        
        showNotification('Signer added successfully', 'success');
    } catch (error) {
        handleError(error, 'Failed to add signer');
    }
}

/**
 * Show loading overlay with message
 */
function showLoading(message) {
    if (window.showLoading) {
        window.showLoading(message);
    } else if (DOM.loadingMessage && DOM.loadingOverlay) {
        DOM.loadingMessage.textContent = message || 'Processing...';
        DOM.loadingOverlay.style.display = 'flex';
    }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    if (window.hideLoading) {
        window.hideLoading();
    } else if (DOM.loadingOverlay) {
        DOM.loadingOverlay.style.display = 'none';
    }
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    toast.style.zIndex = '1050';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(toast);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

/**
 * Handle errors centrally
 */
function handleError(error, defaultMessage = 'An error occurred') {
    console.error(error);
    const message = error.message || defaultMessage;
    showNotification(message, 'danger');
    hideLoading();
}

/**
 * Helper: Format file size in KB/MB
 */
function formatFileSize(bytes) {
    if (!bytes) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Helper: Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Helper: Validate email format
 */
function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

/**
 * Helper: Escape HTML to prevent XSS
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
} 