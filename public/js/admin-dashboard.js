/**
 * Admin Dashboard JavaScript
 * Handles functionality for the administration dashboard
 */

// Global variables
let authToken = localStorage.getItem('auth_token');
let currentUser = null;
let currentSection = 'overview';

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
  initializeAuth();
  initializeEventListeners();
  loadDashboardData();
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
    
    // Check if user is admin
    if (data.role !== 'admin') {
      // If not admin, redirect to regular dashboard
      showToast('Access denied. Admin privileges required.', 'error');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 2000);
      return;
    }
    
    // Update UI with admin info
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
  // Sidebar navigation links
  const navLinks = document.querySelectorAll('.sidebar .nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = e.currentTarget.dataset.section;
      showSection(section);
    });
  });
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
  
  // Add User modal
  const addUserBtn = document.getElementById('addUserBtn');
  if (addUserBtn) {
    addUserBtn.addEventListener('click', showAddUserModal);
  }
  
  // Save User button
  const saveUserBtn = document.getElementById('saveUserBtn');
  if (saveUserBtn) {
    saveUserBtn.addEventListener('click', saveUser);
  }
  
  // User search and filters
  const userSearchBtn = document.getElementById('userSearchBtn');
  if (userSearchBtn) {
    userSearchBtn.addEventListener('click', () => {
      const searchTerm = document.getElementById('userSearchInput').value;
      searchUsers(searchTerm);
    });
  }
  
  const userSearchInput = document.getElementById('userSearchInput');
  if (userSearchInput) {
    userSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const searchTerm = userSearchInput.value;
        searchUsers(searchTerm);
      }
    });
  }
  
  const userRoleFilter = document.getElementById('userRoleFilter');
  if (userRoleFilter) {
    userRoleFilter.addEventListener('change', filterUsers);
  }
  
  const userStatusFilter = document.getElementById('userStatusFilter');
  if (userStatusFilter) {
    userStatusFilter.addEventListener('change', filterUsers);
  }
}

// Show a specific section
function showSection(section) {
  // Hide all sections
  const sections = document.querySelectorAll('.content-area section');
  sections.forEach(section => {
    section.style.display = 'none';
  });
  
  // Show the selected section
  const selectedSection = document.getElementById(`${section}-section`);
  if (selectedSection) {
    selectedSection.style.display = 'block';
  }
  
  // Update nav links
  const navLinks = document.querySelectorAll('.sidebar .nav-link');
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.dataset.section === section) {
      link.classList.add('active');
    }
  });
  
  // Update current section
  currentSection = section;
  
  // Load section-specific data
  loadSectionData(section);
}

// Load dashboard data
function loadDashboardData() {
  // Load overview data
  loadOverviewData();
  
  // Load activity data
  loadRecentActivity();
  
  // Load system status
  loadSystemStatus();
}

// Load overview data
function loadOverviewData() {
  // Fetch dashboard statistics
  fetch('/api/admin/stats', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard statistics');
    }
    return response.json();
  })
  .then(data => {
    // Update dashboard counters
    document.getElementById('activeUsersCount').textContent = data.users?.active || 0;
    document.getElementById('documentsCount').textContent = data.documents?.total || 0;
    document.getElementById('signaturesCount').textContent = data.signatures?.completed || 0;
    document.getElementById('analysisCount').textContent = data.analysis?.total || 0;
  })
  .catch(error => {
    console.error('Error loading statistics:', error);
    // Use fallback static data in case of error
    updateStatisticsWithFallbackData();
  });
}

// Update statistics with fallback data
function updateStatisticsWithFallbackData() {
  document.getElementById('activeUsersCount').textContent = '24';
  document.getElementById('documentsCount').textContent = '157';
  document.getElementById('signaturesCount').textContent = '89';
  document.getElementById('analysisCount').textContent = '42';
}

// Load recent activity
function loadRecentActivity() {
  // Fetch recent activity
  fetch('/api/admin/activity', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch activity data');
    }
    return response.json();
  })
  .then(data => {
    const activityTable = document.getElementById('activityTable');
    
    if (!data.length) {
      activityTable.innerHTML = `
        <tr>
          <td class="text-center" colspan="4">No recent activity found</td>
        </tr>
      `;
      return;
    }
    
    activityTable.innerHTML = '';
    
    // Add each activity to the table
    data.forEach(activity => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>
          <div class="d-flex align-items-center">
            <div class="user-avatar">${getInitials(activity.user?.firstName, activity.user?.lastName)}</div>
            <div>
              <div>${activity.user?.firstName} ${activity.user?.lastName}</div>
              <small class="text-muted">${activity.user?.email}</small>
            </div>
          </div>
        </td>
        <td>${activity.action}</td>
        <td>${activity.resource || 'N/A'}</td>
        <td>${formatDate(activity.timestamp)}</td>
      `;
      
      activityTable.appendChild(row);
    });
  })
  .catch(error => {
    console.error('Error loading activity data:', error);
    
    // Show fallback data
    const activityTable = document.getElementById('activityTable');
    activityTable.innerHTML = `
      <tr>
        <td class="text-center" colspan="4">Failed to load activity data. Please try again.</td>
      </tr>
    `;
  });
}

// Load system status
function loadSystemStatus() {
  // Fetch system status
  fetch('/api/admin/system', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch system status');
    }
    return response.json();
  })
  .then(data => {
    // Update system status
    document.getElementById('cpuUsage').textContent = `${data.cpu || 35}%`;
    document.getElementById('memoryUsage').textContent = `${data.memory || 62}%`;
    document.getElementById('diskUsage').textContent = `${data.disk || 28}%`;
    document.getElementById('apiResponseTime').textContent = `${data.apiResponseTime || 215}ms avg`;
    document.getElementById('requestsPerMinute').textContent = `${data.requestsPerMinute || 42} req/min`;
    document.getElementById('apiSuccessRate').textContent = `${data.apiSuccessRate || 99.8}%`;
    
    // Update progress bars
    document.querySelector('.progress-bar[role="progressbar"]').style.width = `${data.cpu || 35}%`;
    document.querySelectorAll('.progress-bar[role="progressbar"]')[1].style.width = `${data.memory || 62}%`;
    document.querySelectorAll('.progress-bar[role="progressbar"]')[2].style.width = `${data.disk || 28}%`;
    document.querySelectorAll('.progress-bar[role="progressbar"]')[3].style.width = `${data.apiSuccessRate || 80}%`;
    document.querySelectorAll('.progress-bar[role="progressbar"]')[4].style.width = `${data.requestsPerMinute / 2 || 45}%`;
    document.querySelectorAll('.progress-bar[role="progressbar"]')[5].style.width = `${data.apiSuccessRate || 99.8}%`;
  })
  .catch(error => {
    console.error('Error loading system status:', error);
    // Use fallback data (already set in HTML)
  });
}

// Load section specific data
function loadSectionData(section) {
  switch (section) {
    case 'users':
      loadUsers();
      break;
    case 'documents':
      loadDocuments();
      break;
    case 'signatures':
      loadSignatures();
      break;
    case 'analysis':
      loadAnalysis();
      break;
    case 'logs':
      loadLogs();
      break;
    case 'performance':
      loadPerformance();
      break;
    case 'system':
      loadSystemSettings();
      break;
    default:
      // Overview data is loaded by default
      break;
  }
}

// Load users
function loadUsers() {
  // Fetch users
  fetch('/api/admin/users', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return response.json();
  })
  .then(data => {
    const usersTable = document.getElementById('usersTable');
    
    if (!data.length) {
      usersTable.innerHTML = `
        <tr>
          <td class="text-center" colspan="6">No users found</td>
        </tr>
      `;
      return;
    }
    
    usersTable.innerHTML = '';
    
    // Add each user to the table
    data.forEach(user => {
      const row = document.createElement('tr');
      
      // Get status indicator class
      let statusClass = '';
      switch (user.status) {
        case 'active':
          statusClass = 'status-active';
          break;
        case 'inactive':
          statusClass = 'status-inactive';
          break;
        case 'pending':
          statusClass = 'status-pending';
          break;
        default:
          statusClass = '';
      }
      
      row.innerHTML = `
        <td>
          <div class="d-flex align-items-center">
            <div class="user-avatar">${getInitials(user.firstName, user.lastName)}</div>
            <div>${user.firstName} ${user.lastName}</div>
          </div>
        </td>
        <td>${user.email}</td>
        <td>${formatRole(user.role)}</td>
        <td>
          <span class="status-indicator ${statusClass}"></span>
          ${user.status.charAt(0).toUpperCase() + user.status.slice(1)}
        </td>
        <td>${user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-primary edit-user-btn" data-user-id="${user.id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger delete-user-btn" data-user-id="${user.id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      
      usersTable.appendChild(row);
    });
    
    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.dataset.userId;
        editUser(userId);
      });
    });
    
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.dataset.userId;
        deleteUser(userId);
      });
    });
  })
  .catch(error => {
    console.error('Error loading users:', error);
    
    // Show fallback data
    const usersTable = document.getElementById('usersTable');
    usersTable.innerHTML = `
      <tr>
        <td class="text-center" colspan="6">Failed to load user data. Please try again.</td>
      </tr>
    `;
  });
}

// Show Add User Modal
function showAddUserModal() {
  // Clear the form
  document.getElementById('addUserForm').reset();
  
  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
  modal.show();
}

// Save User
function saveUser() {
  // Get form data
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const role = document.getElementById('role').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  // Validate form
  if (!firstName || !lastName || !email || !role || !password) {
    showToast('Please fill in all required fields', 'warning');
    return;
  }
  
  if (password !== confirmPassword) {
    showToast('Passwords do not match', 'warning');
    return;
  }
  
  // Create user data
  const userData = {
    firstName,
    lastName,
    email,
    role,
    password,
    status: 'active' // Default status
  };
  
  // Send request to create user
  fetch('/api/admin/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to create user');
    }
    return response.json();
  })
  .then(data => {
    // Show success message
    showToast('User created successfully', 'success');
    
    // Close the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
    modal.hide();
    
    // Reload users
    loadUsers();
  })
  .catch(error => {
    console.error('Error creating user:', error);
    showToast('Error creating user. Please try again.', 'error');
  });
}

// Edit User
function editUser(userId) {
  // Implementation will be added later
  showToast('Edit user functionality coming soon', 'info');
}

// Delete User
function deleteUser(userId) {
  // Confirm deletion
  if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
    return;
  }
  
  // Send request to delete user
  fetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to delete user');
    }
    return response.json();
  })
  .then(data => {
    // Show success message
    showToast('User deleted successfully', 'success');
    
    // Reload users
    loadUsers();
  })
  .catch(error => {
    console.error('Error deleting user:', error);
    showToast('Error deleting user. Please try again.', 'error');
  });
}

// Search Users
function searchUsers(searchTerm) {
  if (!searchTerm) {
    loadUsers();
    return;
  }
  
  // Filter users by search term
  // This would typically call the API, but we'll simulate it for now
  showToast('User search functionality will be fully implemented soon', 'info');
}

// Filter Users
function filterUsers() {
  const role = document.getElementById('userRoleFilter').value;
  const status = document.getElementById('userStatusFilter').value;
  
  // Filter users by role and status
  // This would typically call the API, but we'll simulate it for now
  showToast('User filtering functionality will be fully implemented soon', 'info');
}

// Load documents (placeholder)
function loadDocuments() {
  document.getElementById('documents-section').innerHTML = `
    <h2 class="mb-4">Document Management</h2>
    <div class="alert alert-info">
      <i class="fas fa-info-circle me-2"></i>
      Document management functionality will be added in the next update.
    </div>
  `;
}

// Load signatures (placeholder)
function loadSignatures() {
  document.getElementById('signatures-section').innerHTML = `
    <h2 class="mb-4">E-Signature Management</h2>
    <div class="alert alert-info">
      <i class="fas fa-info-circle me-2"></i>
      E-Signature management functionality will be added in the next update.
    </div>
  `;
}

// Load analysis (placeholder)
function loadAnalysis() {
  document.getElementById('analysis-section').innerHTML = `
    <h2 class="mb-4">Analysis Reports</h2>
    <div class="alert alert-info">
      <i class="fas fa-info-circle me-2"></i>
      Analysis reports functionality will be added in the next update.
    </div>
  `;
}

// Load logs (placeholder)
function loadLogs() {
  document.getElementById('logs-section').innerHTML = `
    <h2 class="mb-4">Activity Logs</h2>
    <div class="alert alert-info">
      <i class="fas fa-info-circle me-2"></i>
      Activity logs functionality will be added in the next update.
    </div>
  `;
}

// Load performance (placeholder)
function loadPerformance() {
  document.getElementById('performance-section').innerHTML = `
    <h2 class="mb-4">Performance Monitoring</h2>
    <div class="alert alert-info">
      <i class="fas fa-info-circle me-2"></i>
      Performance monitoring functionality will be added in the next update.
    </div>
  `;
}

// Load system settings (placeholder)
function loadSystemSettings() {
  document.getElementById('system-section').innerHTML = `
    <h2 class="mb-4">System Settings</h2>
    <div class="alert alert-info">
      <i class="fas fa-info-circle me-2"></i>
      System settings functionality will be added in the next update.
    </div>
  `;
}

// Logout the user
function logout() {
  // Clear local storage
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  
  // Redirect to login page
  window.location.href = 'login.html';
}

// Utility: Format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  
  // Otherwise, show full date
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Utility: Get initials from name
function getInitials(firstName, lastName) {
  if (!firstName && !lastName) return 'U';
  
  let initials = '';
  
  if (firstName) {
    initials += firstName.charAt(0).toUpperCase();
  }
  
  if (lastName) {
    initials += lastName.charAt(0).toUpperCase();
  }
  
  return initials;
}

// Utility: Format role name
function formatRole(role) {
  if (!role) return 'N/A';
  
  // Replace underscores with spaces and capitalize each word
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
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