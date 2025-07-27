// CatPass Extension Popup Script
class CatPassExtension {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.currentUser = null;
        this.isUnlocked = false;
        this.selectedProject = null;
        this.selectedGroup = null;
        this.currentSecrets = [];
        this.currentSecretData = {};
        
        this.init();
    }

    async init() {
        console.log('Initializing CatPass Extension');
        this.setupEventListeners();
        await this.checkAuthStatus();
        
        // Set up periodic auth check (every 5 seconds)
        setInterval(() => {
            this.checkAuthStatus();
        }, 60000);
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Auth buttons
        document.getElementById('openWebApp')?.addEventListener('click', () => {
            this.openWebApp();
        });

        document.getElementById('refreshAuth')?.addEventListener('click', () => {
            this.checkAuthStatus();
        });

        document.getElementById('unlockBtn')?.addEventListener('click', () => {
            this.unlockVault();
        });

        // Refresh buttons
        document.getElementById('refreshProjects')?.addEventListener('click', () => {
            this.loadProjects();
        });

        document.getElementById('refreshGroups')?.addEventListener('click', () => {
            this.loadGroups();
        });

        // Back buttons
        document.getElementById('backToProjects')?.addEventListener('click', () => {
            this.showProjectsList();
        });

        document.getElementById('backToGroups')?.addEventListener('click', () => {
            this.showGroupsList();
        });

        // Search
        document.getElementById('projectSecretSearch')?.addEventListener('input', (e) => {
            this.filterSecrets(e.target.value, 'project');
        });

        document.getElementById('groupSecretSearch')?.addEventListener('input', (e) => {
            this.filterSecrets(e.target.value, 'group');
        });

        // Modal controls
        document.getElementById('closeModal')?.addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('togglePassword')?.addEventListener('click', () => {
            this.togglePasswordVisibility();
        });

        // Copy buttons
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.copyToClipboard(e.target.dataset.field);
            });
        });

        // Modal background click
        document.getElementById('secretModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'secretModal') {
                this.closeModal();
            }
        });

        // Master password enter key
        document.getElementById('masterPassword')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.unlockVault();
            }
        });
    }

    async checkAuthStatus() {
        try {
            this.updateStatus('connecting', 'Checking auth...');
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            // Try to get auth status from web app
            const response = await this.makeRequest('/api/auth/status', {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.authenticated) {
                this.currentUser = response.user;
                if (response.isUnlocked) {
                    this.isUnlocked = true;
                    this.showMainContent();
                    // Load initial data after showing content
                    this.switchTab('projects'); // This will load projects
                } else {
                    this.showUnlockForm();
                }
                this.updateStatus('success', `Logged in as ${response.user.email}`);
            } else {
                this.showLoginForm();
                this.updateStatus('error', 'Not logged in');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            
            if (error.name === 'AbortError') {
                this.updateStatus('error', 'Connection timeout');
            } else {
                this.updateStatus('error', 'Connection failed');
            }
            
            // For demo purposes, show login form after timeout
            this.showLoginForm();
        }
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        // Merge options
        const finalOptions = { ...defaultOptions, ...options };
        if (options.headers) {
            finalOptions.headers = { ...defaultOptions.headers, ...options.headers };
        }

        const response = await fetch(url, finalOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    updateStatus(type, text) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        indicator.className = `status-indicator ${type}`;
        statusText.textContent = text;
    }

    showLoginForm() {
        this.hideAllViews();
        document.getElementById('loginForm').style.display = 'block';
    }

    showUnlockForm() {
        this.hideAllViews();
        document.getElementById('unlockForm').style.display = 'block';
        // Focus password input
        setTimeout(() => {
            document.getElementById('masterPassword')?.focus();
        }, 100);
    }

    showMainContent() {
        this.hideAllViews();
        document.getElementById('mainContent').style.display = 'flex';
    }

    hideAllViews() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('unlockForm').style.display = 'none';
        document.getElementById('mainContent').style.display = 'none';
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');

        // Reset selections and show main lists
        this.selectedProject = null;
        this.selectedGroup = null;
        
        if (tabName === 'projects') {
            this.showProjectsList();
            this.loadProjects();
        } else if (tabName === 'groups') {
            this.showGroupsList();
            this.loadGroups();
        }
    }

    openWebApp() {
        chrome.runtime.sendMessage({ action: 'openWebApp' });
        window.close();
    }

    showProjectsList() {
        document.getElementById('projectsList').style.display = 'flex';
        document.getElementById('projectSecrets').style.display = 'none';
    }

    showProjectSecrets(projectName) {
        document.getElementById('projectsList').style.display = 'none';
        document.getElementById('projectSecrets').style.display = 'flex';
        document.getElementById('projectSecretsTitle').textContent = `${projectName} Secrets`;
    }

    showGroupsList() {
        document.getElementById('groupsList').style.display = 'flex';
        document.getElementById('groupSecrets').style.display = 'none';
    }

    showGroupSecrets(groupName) {
        document.getElementById('groupsList').style.display = 'none';
        document.getElementById('groupSecrets').style.display = 'flex';
        document.getElementById('groupSecretsTitle').textContent = `${groupName} Secrets`;
    }

    async unlockVault() {
        const password = document.getElementById('masterPassword').value;
        if (!password) return;

        try {
            const response = await this.makeRequest('/api/vault/unlock', {
                method: 'POST',
                body: JSON.stringify({ password })
            });

            if (response.success) {
                this.isUnlocked = true;
                this.showMainContent();
                await this.loadInitialData();
                this.updateStatus('success', `Unlocked for ${this.currentUser.email}`);
            }
        } catch (error) {
            console.error('Unlock failed:', error);
            this.showToast('Invalid master password');
        }
    }



    async loadProjects() {
        try {
            const container = document.getElementById('projectsList');
            container.innerHTML = '<div class="loading">Loading projects...</div>';

            const response = await this.makeRequest('/api/projects');
            const projects = response.projects || [];

            if (projects.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h4>No Projects</h4>
                        <p>Create a project in the web app to get started.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = projects.map(project => `
                <div class="list-item project-item" data-project-id="${project.id}" data-project-name="${project.name}">
                    <h4>${this.escapeHtml(project.name)}</h4>
                    <p>${this.escapeHtml(project.description || 'No description')}</p>
                    <div class="meta">
                        <span class="badge user">${project.memberIds?.length || 0} members</span>
                        <span>${new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join('');
            
            // Add click event listeners to project items
            container.querySelectorAll('.project-item').forEach(item => {
                item.addEventListener('click', () => {
                    const projectId = item.dataset.projectId;
                    const projectName = item.dataset.projectName;
                    this.selectProject(projectId, projectName);
                });
            });
        } catch (error) {
            console.error('Failed to load projects:', error);
            document.getElementById('projectsList').innerHTML = 
                '<div class="empty-state"><h4>Error</h4><p>Failed to load projects</p></div>';
        }
    }

    async loadGroups() {
        try {
            const container = document.getElementById('groupsList');
            container.innerHTML = '<div class="loading">Loading groups...</div>';

            const response = await this.makeRequest('/api/groups');
            const groups = response.groups || [];

            if (groups.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h4>No Groups</h4>
                        <p>Create or join a group in the web app.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = groups.map(group => `
                <div class="list-item group-item" data-group-id="${group.id}" data-group-name="${group.name}">
                    <h4>${this.escapeHtml(group.name)}</h4>
                    <p>${this.escapeHtml(group.description || 'No description')}</p>
                    <div class="meta">
                        <span class="badge group">${group.memberIds?.length || 0} members</span>
                        <span>${new Date(group.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join('');
            
            // Add click event listeners to group items
            container.querySelectorAll('.group-item').forEach(item => {
                item.addEventListener('click', () => {
                    const groupId = item.dataset.groupId;
                    const groupName = item.dataset.groupName;
                    this.selectGroup(groupId, groupName);
                });
            });
        } catch (error) {
            console.error('Failed to load groups:', error);
            document.getElementById('groupsList').innerHTML = 
                '<div class="empty-state"><h4>Error</h4><p>Failed to load groups</p></div>';
        }
    }

    selectProject(projectId, projectName) {
        console.log('Project selected:', projectId, projectName);
        this.selectedProject = projectId;
        this.selectedGroup = null;
        
        // Show project secrets view
        this.showProjectSecrets(projectName);
        
        // Load secrets for this project
        this.loadSecretsForProject(projectId);
    }

    selectGroup(groupId, groupName) {
        console.log('Group selected:', groupId, groupName);
        this.selectedGroup = groupId;
        this.selectedProject = null;
        
        // Show group secrets view
        this.showGroupSecrets(groupName);
        
        // Load secrets for this group
        this.loadSecretsForGroup(groupId);
    }

    async loadSecretsForProject(projectId) {
        try {
            const container = document.getElementById('projectSecretsList');
            container.innerHTML = '<div class="loading">Loading secrets...</div>';

            const response = await this.makeRequest(`/api/secrets?projectId=${projectId}`);
            this.currentSecrets = response.secrets || [];

            if (this.currentSecrets.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h4>No Secrets</h4>
                        <p>No secrets found in this project.</p>
                    </div>
                `;
                return;
            }

            this.renderSecretsInContainer(this.currentSecrets, 'projectSecretsList');
        } catch (error) {
            console.error('Failed to load project secrets:', error);
            document.getElementById('projectSecretsList').innerHTML = 
                '<div class="empty-state"><h4>Error</h4><p>Failed to load secrets</p></div>';
        }
    }

    async loadSecretsForGroup(groupId) {
        try {
            const container = document.getElementById('groupSecretsList');
            container.innerHTML = '<div class="loading">Loading secrets...</div>';

            const response = await this.makeRequest(`/api/secrets?groupId=${groupId}`);
            this.currentSecrets = response.secrets || [];

            if (this.currentSecrets.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h4>No Secrets</h4>
                        <p>No secrets found in this group.</p>
                    </div>
                `;
                return;
            }

            this.renderSecretsInContainer(this.currentSecrets, 'groupSecretsList');
        } catch (error) {
            console.error('Failed to load group secrets:', error);
            document.getElementById('groupSecretsList').innerHTML = 
                '<div class="empty-state"><h4>Error</h4><p>Failed to load secrets</p></div>';
        }
    }

    renderSecretsInContainer(secrets, containerId) {
        const container = document.getElementById(containerId);
        
        container.innerHTML = secrets.map(secret => `
            <div class="list-item secret-item" data-secret-id="${secret.id}">
                <div class="secret-info">
                    <h4>
                        ${this.escapeHtml(secret.name)}
                        <span class="username-preview">${this.escapeHtml(secret.username || '')}</span>
                    </h4>
                    <p>${this.escapeHtml(secret.url || 'No URL')}</p>
                    <div class="meta">
                        <span class="badge ${secret.owner?.type || 'user'}">${secret.owner?.type || 'user'}</span>
                        <span>${new Date(secret.lastModified).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="secret-actions">
                    <button class="action-btn copy-password-btn" data-secret-id="${secret.id}" title="Copy Password">
                        🔑
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add click event listeners to secret items
        container.querySelectorAll('.secret-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't open modal if copy button was clicked
                if (e.target.classList.contains('copy-password-btn')) return;
                
                const secretId = item.dataset.secretId;
                this.openSecretModal(secretId);
            });
        });
        
        // Add click event listeners to copy buttons
        container.querySelectorAll('.copy-password-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const secretId = btn.dataset.secretId;
                this.quickCopyPassword(secretId);
            });
        });
    }

    filterSecrets(searchTerm, context) {
        if (!searchTerm) {
            const containerId = context === 'project' ? 'projectSecretsList' : 'groupSecretsList';
            this.renderSecretsInContainer(this.currentSecrets, containerId);
            return;
        }

        const filtered = this.currentSecrets.filter(secret =>
            secret.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (secret.username && secret.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (secret.url && secret.url.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        const containerId = context === 'project' ? 'projectSecretsList' : 'groupSecretsList';
        this.renderSecretsInContainer(filtered, containerId);
    }

    async openSecretModal(secretId) {
        try {
            // Get decrypted secret data
            const response = await this.makeRequest(`/api/secrets/${secretId}`);
            const secretData = response.secret;

            if (!secretData) {
                this.showToast('Failed to load secret details');
                return;
            }

            this.currentSecretData = secretData;

            // Populate modal
            document.getElementById('secretTitle').textContent = secretData.name;
            document.getElementById('secretName').textContent = secretData.name;
            document.getElementById('secretUsername').textContent = secretData.username || '-';
            document.getElementById('secretPassword').textContent = secretData.password || '-';
            
            const urlElement = document.getElementById('secretUrl');
            if (secretData.url) {
                urlElement.textContent = secretData.url;
                urlElement.href = secretData.url;
                urlElement.style.display = 'inline';
            } else {
                urlElement.textContent = '-';
                urlElement.removeAttribute('href');
            }

            const notesField = document.getElementById('notesField');
            const notesContent = document.getElementById('secretNotes');
            if (secretData.notes) {
                notesContent.textContent = secretData.notes;
                notesField.style.display = 'block';
            } else {
                notesField.style.display = 'none';
            }

            // Show modal
            document.getElementById('secretModal').style.display = 'flex';
        } catch (error) {
            console.error('Failed to load secret details:', error);
            this.showToast('Failed to load secret details');
        }
    }

    closeModal() {
        document.getElementById('secretModal').style.display = 'none';
        // Reset password visibility
        const passwordField = document.getElementById('secretPassword');
        passwordField.classList.add('password-hidden');
        passwordField.textContent = '••••••••';
    }

    togglePasswordVisibility() {
        const passwordField = document.getElementById('secretPassword');
        const isHidden = passwordField.classList.contains('password-hidden');
        
        if (isHidden) {
            passwordField.classList.remove('password-hidden');
            passwordField.textContent = this.currentSecretData.password || '-';
        } else {
            passwordField.classList.add('password-hidden');
            passwordField.textContent = '••••••••';
        }
    }

    async quickCopyPassword(secretId) {
        try {
            const response = await this.makeRequest(`/api/secrets/${secretId}`);
            const secretData = response.secret;
            
            if (secretData.password) {
                await this.copyToClipboardText(secretData.password);
                this.showToast('Password copied to clipboard');
            }
        } catch (error) {
            console.error('Failed to copy password:', error);
            this.showToast('Failed to copy password');
        }
    }

    copyToClipboard(field) {
        const secretData = this.currentSecretData;
        if (!secretData) return;

        let text = '';
        switch (field) {
            case 'username':
                text = secretData.username || '';
                break;
            case 'password':
                text = secretData.password || '';
                break;
            case 'url':
                text = secretData.url || '';
                break;
        }

        if (text) {
            this.copyToClipboardText(text);
            this.showToast(`${field.charAt(0).toUpperCase() + field.slice(1)} copied to clipboard`);
        }
    }

    async copyToClipboardText(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            console.error('Clipboard API failed:', error);
            // Fallback method
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize extension when DOM is loaded
let extension;
document.addEventListener('DOMContentLoaded', () => {
    extension = new CatPassExtension();
});

// Make extension globally available for onclick handlers
window.extension = extension;
