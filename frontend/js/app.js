// Application principale - Telegram Intelligence Scraper
class TelegramIntelligenceApp {
    constructor() {
        this.apiBaseUrl = '/api';
        this.currentResults = [];
        this.searchStartTime = 0;
        this.enabledAPIs = new Set(['google', 'yandex', 'bing', 'telegram', 'advanced']);
        this.isSearching = false;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initialisation Telegram Intelligence Scraper');
        
        // Vérification du statut des APIs
        await this.checkApiStatus();
        
        // Configuration des event listeners
        this.setupEventListeners();
        
        // Animation d'entrée
        this.animateOnLoad();
        
        // Initialisation des composants
        this.initializeProgressItems();
        
        console.log('✅ Application initialisée avec succès');
    }

    async checkApiStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/search/status`);
            const status = await response.json();
            
            this.updateApiIndicators(status.apis);
            
        } catch (error) {
            console.error('Erreur vérification statut APIs:', error);
            this.showError('Impossible de vérifier le statut des APIs');
        }
    }

    updateApiIndicators(apiStatus) {
        const indicators = document.querySelectorAll('.api-indicator');
        
        indicators.forEach(indicator => {
            const apiName = indicator.textContent.toLowerCase();
            let isActive = false;
            
            // Mapping des noms d'APIs
            if (apiName.includes('google') && apiStatus.google) isActive = true;
            if (apiName.includes('yandex') && apiStatus.yandex) isActive = true;
            if (apiName.includes('bing') && apiStatus.bing) isActive = true;
            if (apiName.includes('duckduckgo') && apiStatus.duckduckgo) isActive = true;
            if (apiName.includes('telegram') && apiStatus.telegram) isActive = true;
            
            indicator.className = `api-indicator ${isActive ? 'api-active' : 'api-inactive'}`;
            indicator.querySelector('span').textContent = isActive ? '🟢' : '🔴';
        });
    }

    setupEventListeners() {
        // Formulaire de recherche
        const searchForm = document.querySelector('.search-form');
        searchForm.addEventListener('submit', (e) => this.handleSearch(e));

        // Boutons de filtre et export
        document.getElementById('filterType')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('filterSource')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('filterMembers')?.addEventListener('input', () => this.applyFilters());
        document.getElementById('filterTitle')?.addEventListener('input', () => this.applyFilters());

        // Validation en temps réel du username
        const usernameInput = document.getElementById('username');
        usernameInput.addEventListener('input', (e) => this.validateUsername(e.target.value));

        // Gestion des toggles API
        document.querySelectorAll('.api-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => this.handleApiToggle(e));
        });

        // Raccourcis clavier
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    async handleSearch(e) {
        e.preventDefault();
        
        if (this.isSearching) {
            this.showError('Une recherche est déjà en cours...');
            return;
        }

        const username = document.getElementById('username').value.trim();
        if (!this.validateUsername(username)) {
            this.showError('Veuillez saisir un nom d\'utilisateur valide');
            return;
        }

        const options = this.collectSearchOptions();
        await this.performSearch(username, options);
    }

    validateUsername(username) {
        const input = document.getElementById('username');
        const cleanUsername = username.replace('@', '');
        
        // Validation du format username Telegram
        const isValid = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(cleanUsername);
        
        // Feedback visuel
        input.style.borderColor = isValid ? '#4caf50' : '#f44336';
        
        return isValid;
    }

    collectSearchOptions() {
        return {
            google: document.getElementById('searchGoogle')?.checked && this.enabledAPIs.has('google'),
            yandex: document.getElementById('searchYandex')?.checked && this.enabledAPIs.has('yandex'),
            bing: document.getElementById('searchBing')?.checked && this.enabledAPIs.has('bing'),
            duckduckgo: document.getElementById('searchDuckDuckGo')?.checked,
            telegramApi: document.getElementById('searchTelegramApi')?.checked && this.enabledAPIs.has('telegram'),
            directories: document.getElementById('searchDirectories')?.checked,
            social: this.collectSocialOptions(),
            deepCrawling: document.getElementById('deepCrawling')?.checked,
            aiAnalysis: document.getElementById('aiAnalysis')?.checked,
            sentimentAnalysis: document.getElementById('sentimentAnalysis')?.checked,
            languageDetection: document.getElementById('languageDetection')?.checked,
            geolocation: document.getElementById('geolocation')?.checked,
            maxResults: parseInt(document.getElementById('maxResults')?.value) || 100
        };
    }

    collectSocialOptions() {
        return document.getElementById('searchTwitter')?.checked ||
               document.getElementById('searchReddit')?.checked ||
               document.getElementById('searchDiscord')?.checked ||
               document.getElementById('searchFacebook')?.checked;
    }

    async performSearch(username, options) {
        this.isSearching = true;
        this.searchStartTime = Date.now();
        
        try {
            // UI Updates
            this.showProgress(true);
            this.hideError();
            this.hideResults();
            this.resetProgress();

            // Validation côté serveur
            const validation = await this.validateSearchOnServer(username, options);
            if (!validation.isValid) {
                throw new Error(`Paramètres invalides: ${validation.errors.join(', ')}`);
            }

            // Recherche principale
            const response = await fetch(`${this.apiBaseUrl}/search/telegram`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, options })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la recherche');
            }

            const data = await response.json();
            
            if (data.success) {
                this.currentResults = data.results;
                this.displayResults(data.results);
                this.updateStats(data.stats);
                
                if (data.errors && data.errors.length > 0) {
                    this.showWarnings(data.errors);
                }
                
                console.log(`✅ Recherche terminée: ${data.results.length} résultats en ${data.searchTime}ms`);
            } else {
                throw new Error(data.message || 'Erreur inconnue');
            }

        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
            this.showError(error.message);
        } finally {
            this.showProgress(false);
            this.isSearching = false;
        }
    }

    async validateSearchOnServer(username, options) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/search/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, options })
            });

            return await response.json();
        } catch (error) {
            console.error('Erreur validation:', error);
            return { isValid: true }; // Continuer même si la validation échoue
        }
    }

    displayResults(results) {
        const resultsSection = document.getElementById('resultsSection');
        const resultsGrid = document.getElementById('resultsGrid');
        const resultsCount = document.getElementById('resultsCount');

        // Mise à jour du compteur
        resultsCount.textContent = `${results.length} résultat${results.length > 1 ? 's' : ''}`;

        // Vidage et remplissage de la grille
        resultsGrid.innerHTML = '';

        if (results.length === 0) {
            resultsGrid.innerHTML = `
                <div class="no-results">
                    <h3>🔍 Aucun résultat trouvé</h3>
                    <p>Essayez avec d'autres paramètres de recherche ou vérifiez la configuration de vos APIs.</p>
                    <button onclick="app.showApiConfiguration()" class="search-btn">
                        ⚙️ Vérifier la configuration
                    </button>
                </div>
            `;
        } else {
            results.forEach((result, index) => {
                const card = this.createResultCard(result, index);
                resultsGrid.appendChild(card);
            });
        }

        // Affichage de la section résultats avec animation
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    createResultCard(result, index) {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.dataset.type = result.type;
        card.dataset.source = result.source?.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/gi, '');
        card.style.animationDelay = `${index * 0.1}s`;

        const typeLabels = {
            'group': 'Groupe',
            'channel': 'Canal',
            'user': 'Utilisateur',
            'privategroup': 'Groupe privé',
            'mention': 'Mention',
            'unknown': 'Inconnu'
        };

        const confidenceColor = this.getConfidenceColor(result.confidence);
        const typeClass = `type-${result.type?.replace(/[^a-z]/gi, '').toLowerCase()}`;
        const sourceClass = `source-${result.source?.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/gi, '')}`;

        card.innerHTML = `
            <div class="result-header">
                <div class="result-main-info">
                    <div class="result-title">${this.escapeHtml(result.title || 'Sans titre')}</div>
                    <a href="${result.url}" target="_blank" class="result-url" rel="noopener noreferrer">
                        ${this.escapeHtml(result.url)}
                    </a>
                </div>
                <div class="result-badges">
                    <span class="result-type ${typeClass}">${typeLabels[result.type] || 'Inconnu'}</span>
                    <span class="result-source ${sourceClass}">${this.escapeHtml(result.source)}</span>
                </div>
            </div>
            
            ${result.description ? `
                <div class="result-description">
                    ${this.escapeHtml(result.description)}
                </div>
            ` : ''}
            
            <div class="result-metrics">
                ${result.confidence ? `
                    <div class="metric-item">
                        <span class="metric-label">Confiance:</span>
                        <span class="metric-value" style="color: ${confidenceColor}; font-weight: 700;">
                            ${result.confidence}%
                        </span>
                    </div>
                ` : ''}
                
                ${result.sentiment ? `
                    <div class="metric-item">
                        <span class="metric-label">Sentiment:</span>
                        <span class="sentiment-${result.sentiment}">
                            ${this.getSentimentLabel(result.sentiment)}
                        </span>
                    </div>
                ` : ''}
            </div>

            <div class="result-meta">
                ${result.members ? `
                    <div class="meta-item">
                        <div class="meta-value">${result.members.toLocaleString()}</div>
                        <div class="meta-label">Membres</div>
                    </div>
                ` : ''}
                
                ${result.aiScore ? `
                    <div class="meta-item">
                        <div class="meta-value">${result.aiScore}</div>
                        <div class="meta-label">Score IA</div>
                    </div>
                ` : ''}
                
                ${result.timestamp ? `
                    <div class="meta-item">
                        <div class="meta-value">${new Date(result.timestamp).toLocaleDateString('fr-FR')}</div>
                        <div class="meta-label">Trouvé le</div>
                    </div>
                ` : ''}
                
                ${result.verified ? `
                    <div class="meta-item">
                        <div class="meta-value">✅</div>
                        <div class="meta-label">Vérifié</div>
                    </div>
                ` : ''}
            </div>

            <div class="result-actions">
                <button onclick="app.openResult('${result.url}')" class="action-btn primary">
                    🔗 Ouvrir
                </button>
                <button onclick="app.analyzeResult(${index})" class="action-btn secondary">
                    🔍 Analyser
                </button>
                <button onclick="app.shareResult(${index})" class="action-btn secondary">
                    📤 Partager
                </button>
            </div>
        `;

        return card;
    }

    getConfidenceColor(confidence) {
        if (confidence >= 80) return '#4caf50';
        if (confidence >= 60) return '#ff9800';
        return '#f44336';
    }

    getSentimentLabel(sentiment) {
        const labels = {
            'positive': '😊 Positif',
            'negative': '😞 Négatif',
            'neutral': '😐 Neutre'
        };
        return labels[sentiment] || sentiment;
    }

    updateStats(stats) {
        const searchTime = Math.round((Date.now() - this.searchStartTime) / 1000);
        
        document.getElementById('totalResults').textContent = stats.total || 0;
        document.getElementById('groupsFound').textContent = stats.groups || 0;
        document.getElementById('channelsFound').textContent = stats.channels || 0;
        document.getElementById('usersFound').textContent = stats.users || 0;
        document.getElementById('avgMembers').textContent = (stats.avgMembers || 0).toLocaleString();
        document.getElementById('searchTime').textContent = `${searchTime}s`;
    }

    // Méthodes utilitaires
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
        
        console.error('Erreur UI:', message);
    }

    showWarnings(errors) {
        const warningsHtml = errors.map(error => 
            `<li><strong>${error.service}:</strong> ${error.error}</li>`
        ).join('');
        
        const warningDiv = document.createElement('div');
        warningDiv.className = 'warning-message';
        warningDiv.innerHTML = `
            <h4>⚠️ Avertissements:</h4>
            <ul>${warningsHtml}</ul>
        `;
        
        document.querySelector('.container').insertBefore(warningDiv, document.getElementById('resultsSection'));
        
        setTimeout(() => {
            warningDiv.remove();
        }, 10000);
    }

    // Ajoutez cette méthode dans votre app.js (frontend)

    createResultCard(result, index) {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.dataset.type = result.type;
        card.dataset.source = result.source?.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/gi, '');
        card.style.animationDelay = `${index * 0.1}s`;

        const typeLabels = {
            'group': '👥 Groupe',
            'channel': '📢 Canal',
            'user': '👤 Utilisateur',
            'bot': '🤖 Bot',
            'privategroup': '🔒 Groupe privé',
            'mention': '💬 Mention'
        };

        const confidenceColor = this.getConfidenceColor(result.confidence);
        const typeClass = `type-${result.type?.replace(/[^a-z]/gi, '').toLowerCase()}`;
        const sourceClass = `source-${result.source?.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/gi, '')}`;

        // Vérifier si c'est un résultat Telegram avec source Reddit
        const hasRedditSource = result.metadata?.redditSource;
        const telegramUrl = result.metadata?.telegramUrl || result.url;

        card.innerHTML = `
            <div class="result-header">
                <div class="result-main-info">
                    <div class="result-title">${this.escapeHtml(result.title || 'Sans titre')}</div>
                    <a href="${telegramUrl}" target="_blank" class="result-url telegram-link" rel="noopener noreferrer">
                        ${this.escapeHtml(telegramUrl)}
                    </a>
                </div>
                <div class="result-badges">
                    <span class="result-type ${typeClass}">${typeLabels[result.type] || 'Inconnu'}</span>
                    <span class="result-source ${sourceClass}">${this.escapeHtml(result.source)}</span>
                </div>
            </div>
            
            ${result.description ? `
                <div class="result-description">
                    ${this.escapeHtml(result.description)}
                </div>
            ` : ''}
            
            <div class="result-metrics">
                ${result.confidence ? `
                    <div class="metric-item">
                        <span class="metric-label">Confiance:</span>
                        <span class="metric-value" style="color: ${confidenceColor}; font-weight: 700;">
                            ${result.confidence}%
                        </span>
                    </div>
                ` : ''}
                
                ${hasRedditSource ? `
                    <div class="metric-item">
                        <span class="metric-label">Trouvé sur:</span>
                        <span class="metric-value" style="color: #ff4500;">
                            ${result.metadata.redditSource.foundIn}
                        </span>
                    </div>
                ` : ''}
            </div>

            <div class="result-meta">
                ${result.metadata?.redditSource?.redditScore ? `
                    <div class="meta-item">
                        <div class="meta-value">${result.metadata.redditSource.redditScore}</div>
                        <div class="meta-label">Score Reddit</div>
                    </div>
                ` : ''}
                
                ${result.metadata?.groupType ? `
                    <div class="meta-item">
                        <div class="meta-value">${result.metadata.groupType === 'group' ? '👥' : '📢'}</div>
                        <div class="meta-label">${result.metadata.groupType === 'group' ? 'Groupe' : 'Canal'}</div>
                    </div>
                ` : ''}
                
                ${result.timestamp ? `
                    <div class="meta-item">
                        <div class="meta-value">${new Date(result.timestamp).toLocaleDateString('fr-FR')}</div>
                        <div class="meta-label">Trouvé le</div>
                    </div>
                ` : ''}
                
                ${result.verified ? `
                    <div class="meta-item">
                        <div class="meta-value">✅</div>
                        <div class="meta-label">Vérifié</div>
                    </div>
                ` : ''}
            </div>

            <div class="result-actions">
                <button onclick="app.openTelegram('${telegramUrl}')" class="action-btn primary">
                    📱 Ouvrir Telegram
                </button>
                
                ${hasRedditSource ? `
                    <button onclick="app.showRedditSource(${index})" class="action-btn secondary reddit-btn">
                        🔍 Comment trouvé ?
                    </button>
                ` : ''}
                
                <button onclick="app.copyTelegramLink('${telegramUrl}')" class="action-btn secondary">
                    📋 Copier lien
                </button>
            </div>
        `;

        return card;
    }

    // Nouvelles méthodes pour les actions
    openTelegram(url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    copyTelegramLink(url) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                this.showNotification('Lien Telegram copié !', 'success');
            });
        } else {
            // Fallback pour les navigateurs plus anciens
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Lien Telegram copié !', 'success');
        }
    }

    showRedditSource(index) {
        const result = this.currentResults[index];
        const redditSource = result.metadata?.redditSource;
        
        if (!redditSource) {
            this.showNotification('Aucune source Reddit disponible', 'warning');
            return;
        }

        // Créer une modal pour afficher les détails de la source Reddit
        const modal = document.createElement('div');
        modal.className = 'reddit-source-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>🔍 Comment ce lien a été trouvé</h3>
                        <button class="modal-close" onclick="this.closest('.reddit-source-modal').remove()">✕</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="source-info">
                            <div class="source-item">
                                <strong>📱 Lien Telegram trouvé:</strong>
                                <a href="${result.metadata.telegramUrl}" target="_blank" class="telegram-link">
                                    ${result.metadata.telegramUrl}
                                </a>
                            </div>
                            
                            <div class="source-item">
                                <strong>📍 Trouvé dans:</strong>
                                <span class="subreddit-badge">${redditSource.foundIn}</span>
                            </div>
                            
                            <div class="source-item">
                                <strong>📝 Post Reddit:</strong>
                                <a href="${redditSource.postUrl}" target="_blank" class="reddit-link">
                                    ${this.escapeHtml(redditSource.postTitle)}
                                </a>
                            </div>
                            
                            <div class="source-item">
                                <strong>⭐ Score Reddit:</strong>
                                <span class="reddit-score">${redditSource.redditScore || 0} points</span>
                            </div>
                            
                            <div class="source-item">
                                <strong>🎯 Confiance:</strong>
                                <span class="confidence-score" style="color: ${this.getConfidenceColor(result.confidence)}">
                                    ${result.confidence}%
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button onclick="window.open('${redditSource.postUrl}', '_blank')" class="btn btn-reddit">
                            🔗 Voir le post Reddit
                        </button>
                        <button onclick="this.closest('.reddit-source-modal').remove()" class="btn btn-secondary">
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">✕</button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-suppression après 3 secondes
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    hideError() {
        document.getElementById('errorMessage').style.display = 'none';
    }

    hideResults() {
        document.getElementById('resultsSection').style.display = 'none';
    }

    showProgress(show) {
        const progressSection = document.getElementById('progressSection');
        const searchBtn = document.getElementById('searchBtn');
        
        if (show) {
            progressSection.style.display = 'block';
            searchBtn.disabled = true;
            searchBtn.textContent = '⏳ Recherche en cours...';
        } else {
            setTimeout(() => {
                progressSection.style.display = 'none';
                searchBtn.disabled = false;
                searchBtn.textContent = '🚀 Lancer la recherche exhaustive';
            }, 1000);
        }
    }

    // Actions sur les résultats
    openResult(url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    analyzeResult(index) {
        const result = this.currentResults[index];
        // Ouvrir une modal d'analyse détaillée
        console.log('Analyse détaillée du résultat:', result);
        alert(`Analyse détaillée de: ${result.title}\n\nCette fonctionnalité sera bientôt disponible.`);
    }

    shareResult(index) {
        const result = this.currentResults[index];
        
        if (navigator.share) {
            navigator.share({
                title: result.title,
                text: result.description,
                url: result.url
            });
        } else {
            // Fallback: copier dans le presse-papier
            navigator.clipboard.writeText(`${result.title}\n${result.url}`);
            alert('Lien copié dans le presse-papier!');
        }
    }

    // Gestion des filtres et exports (à implémenter avec les autres fichiers)
    applyFilters() {
        // Sera implémenté dans filters.js
        console.log('Application des filtres...');
    }

    // Méthodes d'animation et d'interface
    animateOnLoad() {
        const elements = document.querySelectorAll('.main-panel, .header');
        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            setTimeout(() => {
                el.style.transition = 'all 0.6s ease';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }

    initializeProgressItems() {
        // Sera implémenté dans ui.js
        console.log('Initialisation des éléments de progression...');
    }

    resetProgress() {
        document.getElementById('progressFill').style.width = '0%';
    }

    handleApiToggle(event) {
        // Logique de toggle des APIs
        console.log('Toggle API:', event.target);
    }

    handleKeyboard(event) {
        // Raccourcis clavier
        if (event.ctrlKey && event.key === 'Enter') {
            document.querySelector('.search-btn').click();
        }
    }
}

// Initialisation de l'application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TelegramIntelligenceApp();
});
