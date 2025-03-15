/**
 * Project Zero - Common Application JavaScript
 * Provides common utility functions and initialization
 */

// Toast notification system
function showToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${getIconForType(type)}"></i>
        </div>
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Add visible class (for animation)
    setTimeout(() => {
        toast.classList.add('visible');
    }, 10);
    
    // Auto remove after duration
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => {
            toast.remove();
        }, 300); // Allow time for fade out animation
    }, duration);
}

// Get icon for toast type
function getIconForType(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Get meta value
function getMeta(name) {
    const meta = document.querySelector(`meta[name="${name}"]`);
    return meta ? meta.content : null;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
}

// Error handler
function handleError(error, context = '') {
    console.error(context, error);
    showToast(context ? `${context}: ${error.message || error}` : (error.message || error), 'error');
}

// Add event listeners once DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize any global features, tooltips, etc.
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltips].map(tooltip => new bootstrap.Tooltip(tooltip));
    }
    
    // Log current page for debugging
    const currentPath = window.location.pathname;
    console.log(`Initialized app.js on ${currentPath}`);
});

/**
 * Project Zero - Main Application Script
 * This script handles initialization for all major functions of the application
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');
    
    // Initialize UI components based on current page
    const currentPath = window.location.pathname;
    
    // Initialize toast notifications
    initToasts();
    
    if (currentPath.includes('legal-dd')) {
        // Document Analysis page functionality
        console.log('Initializing document upload');
        initDocumentUpload();
    } else if (currentPath.includes('e-sign')) {
        // E-Signature page functionality
        console.log('Initializing e-signature');
        initESignature();
    }
    
    // Initialize the user guide page enhancements
    if (currentPath.includes('user-guide')) {
        initUserGuide();
    }
});

/**
 * Initialize toast notification system
 */
function initToasts() {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Expose global showToast function
    window.showToast = function(message, type = 'info') {
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
        toast.id = toastId;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        const toastBody = document.createElement('div');
        toastBody.className = 'd-flex';
        
        let icon = '';
        switch (type) {
            case 'success': icon = '<i class="fas fa-check-circle me-2"></i>'; break;
            case 'danger': 
            case 'error': icon = '<i class="fas fa-exclamation-circle me-2"></i>'; break;
            case 'warning': icon = '<i class="fas fa-exclamation-triangle me-2"></i>'; break;
            default: icon = '<i class="fas fa-info-circle me-2"></i>';
        }
        
        toastBody.innerHTML = `
            <div class="toast-body">
                ${icon}${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        `;
        toast.appendChild(toastBody);
        
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 5000
        });
        
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    };
}

/**
 * Initialize document upload functionality
 */
function initDocumentUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const progressBar = document.getElementById('progressBar');
    const progressContainer = document.getElementById('uploadProgress');
    const uploadStatus = document.getElementById('uploadStatus');
    
    if (!dropZone || !fileInput) {
        console.warn('Document upload elements not found');
        return;
    }
    
    console.log('Setting up document upload handlers');
    
    // Setup drag and drop handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle file drop
    dropZone.addEventListener('drop', e => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
    
    // Handle file selection
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFileUpload(fileInput.files[0]);
        }
    });
    
    // Helpers
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        dropZone.classList.add('drag-active');
    }
    
    function unhighlight() {
        dropZone.classList.remove('drag-active');
    }
    
    function handleFileUpload(file) {
        console.log('Handling file upload:', file.name);
        
        // Check file size
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            showToast('File too large. Maximum size is 10MB', 'warning');
            return;
        }
        
        // Check file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
        
        // Check by MIME type if available
        let validFile = allowedTypes.includes(file.type);
        
        // Also check by extension as fallback
        if (!validFile) {
            const fileName = file.name.toLowerCase();
            validFile = allowedExtensions.some(ext => fileName.endsWith(ext));
        }
        
        if (!validFile) {
            showToast('Invalid file type. Allowed types: PDF, DOC, DOCX, TXT', 'warning');
            return;
        }
        
        // Update UI
        dropZone.classList.add('has-file');
        const fileInfo = dropZone.querySelector('.file-info');
        if (fileInfo) {
            fileInfo.innerHTML = `
                <i class="fas fa-file-alt"></i>
                <span>${file.name} (${formatFileSize(file.size)})</span>
            `;
        }
        
        // Upload the file
        const formData = new FormData();
        formData.append('document', file);
        
        // Show progress
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
        if (progressBar) {
            progressBar.style.width = '0%';
        }
        if (uploadStatus) {
            uploadStatus.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading...';
            uploadStatus.className = 'upload-status';
        }
        
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', e => {
            if (e.lengthComputable && progressBar) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percent + '%';
                progressBar.setAttribute('aria-valuenow', percent);
                if (uploadStatus) {
                    uploadStatus.textContent = `Uploading: ${percent}%`;
                }
            }
        });
        
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                if (uploadStatus) {
                    uploadStatus.innerHTML = '<i class="fas fa-check-circle me-2"></i>Upload complete!';
                    uploadStatus.classList.add('success');
                }
                
                try {
                    const response = JSON.parse(xhr.responseText);
                    console.log('Upload successful:', response);
                    showToast('Document uploaded successfully!', 'success');
                    
                    // Redirect to appropriate page based on current page
                    setTimeout(() => {
                        if (window.location.pathname.includes('legal-dd')) {
                            window.location.href = `/legal-dd/analysis?id=${response.documentId}`;
                        } else if (window.location.pathname.includes('e-sign')) {
                            window.location.href = `/e-sign/document/${response.documentId}`;
                        }
                    }, 1000);
                } catch (error) {
                    console.error('Error parsing response:', error);
                    showToast('Upload successful but could not process response', 'warning');
                }
            } else {
                if (uploadStatus) {
                    uploadStatus.innerHTML = '<i class="fas fa-exclamation-circle me-2"></i>Upload failed';
                    uploadStatus.classList.add('error');
                }
                
                let errorMessage = 'Upload failed';
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMessage = response.error || errorMessage;
                } catch (e) {
                    // If can't parse, use status text
                    errorMessage = xhr.statusText || errorMessage;
                }
                
                showToast(errorMessage, 'error');
            }
        });
        
        xhr.addEventListener('error', () => {
            if (uploadStatus) {
                uploadStatus.innerHTML = '<i class="fas fa-exclamation-circle me-2"></i>Network error';
                uploadStatus.classList.add('error');
            }
            showToast('Network error occurred during upload', 'error');
        });
        
        xhr.open('POST', '/api/documents/upload');
        xhr.send(formData);
    }
}

/**
 * Initialize e-signature functionality
 */
function initESignature() {
    console.log('Initializing e-signature functionality');
    
    // DOM Elements
    const signatureCanvas = document.getElementById('signatureCanvas');
    const clearBtn = document.getElementById('clearBtn');
    const saveBtn = document.getElementById('saveBtn');
    const signatureStatus = document.getElementById('signatureStatus');
    const typedSignature = document.getElementById('typed-signature');
    const typedSignaturePreview = document.getElementById('typed-signature-preview');
    const signatureUpload = document.getElementById('signature-upload');
    const uploadedSignaturePreview = document.getElementById('uploaded-signature-preview');
    
    // Check if we're on the signature page
    if (!signatureCanvas) {
        console.warn('Signature canvas element not found');
        return;
    }
    
    console.log('Setting up signature pad');
    
    // Initialize signature pad
    let signaturePad = new SignaturePad(signatureCanvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 128)'
    });
    
    // Adjust canvas size
    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        signatureCanvas.width = signatureCanvas.offsetWidth * ratio;
        signatureCanvas.height = signatureCanvas.offsetHeight * ratio;
        signatureCanvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear(); // otherwise isEmpty() might return incorrect value
    }
    
    // Call once to initialize
    resizeCanvas();
    
    // Handle window resize
    window.addEventListener('resize', resizeCanvas);
    
    // Handle clear button
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            let activeTab = document.querySelector('.signature-type-tabs button.active');
            let activeTarget = activeTab ? activeTab.dataset.target : 'draw-signature-container';
            
            if (activeTarget === 'draw-signature-container') {
                signaturePad.clear();
            } else if (activeTarget === 'typed-signature-container' && typedSignaturePreview) {
                if (typedSignature) typedSignature.value = '';
                typedSignaturePreview.innerHTML = '';
            } else if (activeTarget === 'upload-signature-container' && uploadedSignaturePreview) {
                if (signatureUpload) signatureUpload.value = '';
                uploadedSignaturePreview.style.display = 'none';
            }
            
            if (signatureStatus) {
                signatureStatus.innerHTML = '';
                signatureStatus.classList.remove('saved');
            }
            
            showToast('Signature cleared', 'info');
        });
    }
    
    // Handle save button
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            let activeTab = document.querySelector('.signature-type-tabs button.active');
            let activeTarget = activeTab ? activeTab.dataset.target : 'draw-signature-container';
            let signatureData = null;
            
            // Get signature data based on active method
            if (activeTarget === 'draw-signature-container') {
                if (signaturePad && !signaturePad.isEmpty()) {
                    signatureData = signaturePad.toDataURL();
                } else {
                    showToast('Please draw your signature', 'warning');
                    return;
                }
            } else if (activeTarget === 'typed-signature-container') {
                if (typedSignaturePreview && typedSignaturePreview.innerHTML) {
                    // Create an off-screen canvas to convert HTML to image
                    const canvas = document.createElement('canvas');
                    canvas.width = 400;
                    canvas.height = 150;
                    const ctx = canvas.getContext('2d');
                    
                    // Draw white background
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Use html2canvas or similar library in production
                    // For now, just use the typed text
                    if (typedSignature && typedSignature.value) {
                        signatureData = canvas.toDataURL();
                    } else {
                        showToast('Please type your signature', 'warning');
                        return;
                    }
                } else {
                    showToast('Please type your signature', 'warning');
                    return;
                }
            } else if (activeTarget === 'upload-signature-container') {
                if (uploadedSignaturePreview && uploadedSignaturePreview.src && uploadedSignaturePreview.style.display !== 'none') {
                    signatureData = uploadedSignaturePreview.src;
                } else {
                    showToast('Please upload a signature image', 'warning');
                    return;
                }
            }
            
            if (!signatureData) {
                showToast('No signature data available', 'warning');
                return;
            }
            
            // For demo purposes, just show success message
            // In production, you would send this to your server
            console.log('Signature data ready:', signatureData.substring(0, 50) + '...');
            
            if (signatureStatus) {
                signatureStatus.innerHTML = '<i class="fas fa-check-circle me-2"></i>Signature saved successfully';
                signatureStatus.classList.add('saved');
            }
            
            showToast('Signature saved successfully', 'success');
        });
    }
    
    // Handle typed signature
    if (typedSignature && typedSignaturePreview) {
        typedSignature.addEventListener('input', () => {
            updateTypedSignature();
        });
        
        // Signature style buttons
        const styleButtons = document.querySelectorAll('.signature-style-btn');
        styleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                styleButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateTypedSignature();
            });
        });
        
        function updateTypedSignature() {
            const name = typedSignature.value.trim();
            if (!name) {
                typedSignaturePreview.innerHTML = '';
                return;
            }
            
            const activeStyle = document.querySelector('.signature-style-btn.active');
            const style = activeStyle ? activeStyle.dataset.style : 'default';
            
            let html = '';
            switch (style) {
                case 'style1':
                    html = `<span style="font-family: 'Pacifico', cursive; font-size: 2rem; color: #1e40af;">${name}</span>`;
                    break;
                case 'style2':
                    html = `<span style="font-family: 'Montserrat', sans-serif; font-size: 1.8rem; font-weight: 700; letter-spacing: 1px; color: #1e3a8a;">${name}</span>`;
                    break;
                case 'style3':
                    html = `<span style="font-family: 'Times New Roman', serif; font-size: 1.8rem; font-style: italic; color: #1e3a8a;">${name}</span>`;
                    break;
                default:
                    html = `<span style="font-family: 'Arial', sans-serif; font-size: 1.5rem; color: #1e3a8a;">${name}</span>`;
            }
            
            typedSignaturePreview.innerHTML = html;
        }
    }
    
    // Handle signature upload
    if (signatureUpload && uploadedSignaturePreview) {
        signatureUpload.addEventListener('change', () => {
            const file = signatureUpload.files[0];
            if (!file) return;
            
            // Check file type
            if (!file.type.startsWith('image/')) {
                showToast('Please upload an image file', 'warning');
                return;
            }
            
            // Check file size
            if (file.size > 2 * 1024 * 1024) {
                showToast('Image file is too large (max 2MB)', 'warning');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                uploadedSignaturePreview.src = e.target.result;
                uploadedSignaturePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        });
    }
    
    // Handle signature type tabs
    const typeTabs = document.querySelectorAll('.signature-type-tabs button');
    const typeContainers = document.querySelectorAll('.signature-type-container');
    
    typeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            typeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding container
            const target = tab.dataset.target;
            typeContainers.forEach(container => {
                container.style.display = container.id === target ? 'block' : 'none';
            });
            
            // Reset status
            if (signatureStatus) {
                signatureStatus.innerHTML = '';
                signatureStatus.classList.remove('saved');
            }
        });
    });
}

/**
 * Initialize user guide enhancements
 */
function initUserGuide() {
    // Add smooth scrolling to section links
    const sectionLinks = document.querySelectorAll('a[href^="#"]');
    
    sectionLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });
            }
        });
    });
} 