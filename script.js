// script.js - Main JavaScript File

class GameTracker {
    constructor() {
        // 🚨 Substitua '953085b5c1e24df39d0b1670cfa1e2ed' pela sua chave da RAWG API
        this.apiKey = '953085b5c1e24df39d0b1670cfa1e2ed'; 
        this.baseUrl = 'https://api.rawg.io/api';
        this.library = this.loadLibrary();
        this.currentPage = 'dashboard'; // Página inicial
        this.currentSearchResults = []; // Para armazenar resultados da busca temporariamente
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadFeaturedGames();
        this.updateUI();
        this.initAnimations();
        this.showPage(this.currentPage); // Garante que a página inicial esteja visível
    }
    
    setupEventListeners() {
        // Funcionalidade de busca
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchGames(e.target.value);
            }, 500); // Debounce de 500ms
        });
        
        // Botões de filtro da biblioteca
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.filterLibrary(filter);
                this.updateFilterButtons(e.target);
            });
        });
        
        // Esconder resultados da busca ao clicar fora
        document.addEventListener('click', (e) => {
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer && !searchContainer.contains(e.target)) {
                this.hideSearchResults();
            }
        });

        // Fechar modal ao clicar fora ou na tecla ESC
        document.getElementById('gameModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) { // Clicou no backdrop do modal
                this.closeModal();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !document.getElementById('gameModal').classList.contains('hidden')) {
                this.closeModal();
            }
        });
    }
    
    async searchGames(query) {
        if (!query || query.length < 3) {
            this.hideSearchResults();
            return;
        }
        
        this.showSearchLoading();
        
        try {
            const response = await fetch(`${this.baseUrl}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&page_size=10`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            this.displaySearchResults(data.results);
        } catch (error) {
            console.error('Erro ao buscar jogos:', error);
            this.hideSearchResults();
            this.showNotification('Erro ao buscar jogos. Tente novamente mais tarde.', 'error');
        } finally {
            this.hideSearchLoading();
        }
    }
    
    displaySearchResults(games) {
        const resultsContainer = document.getElementById('searchResults');
        
        if (!games || games.length === 0) {
            this.hideSearchResults();
            return;
        }
        
        this.currentSearchResults = games; // Armazena os resultados para uso posterior
        
        resultsContainer.innerHTML = games.map(game => `
            <div class="p-4 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0" onclick="gameTracker.selectGameById('${game.id}')">
                <div class="flex items-center">
                    <img src="${game.background_image || 'https://via.placeholder.com/60x80'}" alt="${game.name}" class="w-12 h-16 object-cover rounded mr-4">
                    <div>
                        <div class="font-semibold">${game.name}</div>
                        <div class="text-sm text-gray-400">${game.released ? new Date(game.released).getFullYear() : 'N/A'}</div>
                        <div class="text-xs text-gray-500">Avaliação: ${game.rating || 'N/A'}/5</div>
                    </div>
                </div>
            </div>
        `).join('');
        
        resultsContainer.classList.remove('hidden');
    }
    
    hideSearchResults() {
        document.getElementById('searchResults').classList.add('hidden');
    }
    
    showSearchLoading() {
        document.getElementById('searchLoading').classList.remove('hidden');
        document.getElementById('searchIcon').classList.add('hidden');
    }
    
    hideSearchLoading() {
        document.getElementById('searchLoading').classList.add('hidden');
        document.getElementById('searchIcon').classList.remove('hidden');
    }
    
    async selectGameById(gameId) {
        this.hideSearchResults();
        document.getElementById('searchInput').value = ''; // Limpa a busca

        const gameFromSearch = this.currentSearchResults.find(g => g.id.toString() === gameId.toString());
        
        if (gameFromSearch) {
            // Se já temos o jogo da busca, use-o como base e então busque os detalhes completos
            this.showGameModal(gameFromSearch, true); // Mostra o modal com loading
            const detailedGame = await this.fetchGameDetails(gameId);
            if (detailedGame) {
                this.showGameModal(detailedGame); // Atualiza o modal com os detalhes completos
            } else {
                this.showNotification('Não foi possível carregar os detalhes do jogo.', 'error');
                this.closeModal();
            }
        } else {
            // Se por algum motivo não encontrou nos resultados atuais, busca direto
            this.showNotification('Carregando detalhes do jogo...', 'info');
            const detailedGame = await this.fetchGameDetails(gameId);
            if (detailedGame) {
                this.showGameModal(detailedGame);
            } else {
                this.showNotification('Não foi possível encontrar o jogo.', 'error');
            }
        }
    }

    async fetchGameDetails(gameId) {
        try {
            const response = await fetch(`${this.baseUrl}/games/${gameId}?key=${this.apiKey}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao buscar detalhes do jogo:', error);
            return null;
        }
    }
    
    showGameModal(game, isLoading = false) {
        const modal = document.getElementById('gameModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        
        modalTitle.textContent = game.name;

        if (isLoading) {
             modalContent.innerHTML = `
                <div class="animate-pulse flex flex-col items-center justify-center p-8">
                    <i class="fas fa-spinner fa-spin text-neon text-6xl mb-4"></i>
                    <p class="text-xl text-gray-400">Carregando detalhes...</p>
                </div>
            `;
        } else {
            modalContent.innerHTML = `
                <div class="mb-4">
                    <img src="${game.background_image || 'https://via.placeholder.com/800x400?text=Sem+Imagem'}" alt="${game.name}" class="w-full h-64 object-cover rounded-lg">
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <h4 class="font-semibold mb-2 text-gray-300">Informações</h4>
                        <p class="text-sm text-gray-400 mb-1">Lançamento: ${game.released ? new Date(game.released).toLocaleDateString('pt-BR') : 'N/A'}</p>
                        <p class="text-sm text-gray-400 mb-1">Avaliação: ${game.rating || 'N/A'}/5</p>
                        <p class="text-sm text-gray-400">Plataformas: ${game.platforms ? game.platforms.map(p => p.platform.name).join(', ') : 'N/A'}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold mb-2 text-gray-300">Gêneros</h4>
                        <div class="flex flex-wrap gap-2">
                            ${game.genres ? game.genres.map(genre => `
                                <span class="px-2 py-1 bg-gray-600 rounded text-xs">${genre.name}</span>
                            `).join('') : 'N/A'}
                        </div>
                    </div>
                </div>
                
                <div class="mb-4">
                    <h4 class="font-semibold mb-2 text-gray-300">Descrição</h4>
                    <p class="text-sm text-gray-400 max-h-48 overflow-y-auto custom-scrollbar">${game.description_raw || 'Descrição não disponível.'}</p>
                </div>
                
                <div class="flex flex-wrap gap-4 mt-6">
                    <button onclick="gameTracker.addToLibrary('${game.id}', '${game.name.replace(/'/g, "\\'")}', '${game.background_image || ''}', 'playing', ${JSON.stringify(game.genres || []).replace(/"/g, '&quot;')})" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center">
                        <i class="fas fa-play-circle mr-2"></i>Jogando
                    </button>
                    <button onclick="gameTracker.addToLibrary('${game.id}', '${game.name.replace(/'/g, "\\'")}', '${game.background_image || ''}', 'completed', ${JSON.stringify(game.genres || []).replace(/"/g, '&quot;')})" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center">
                        <i class="fas fa-check-circle mr-2"></i>Completo
                    </button>
                    <button onclick="gameTracker.addToLibrary('${game.id}', '${game.name.replace(/'/g, "\\'")}', '${game.background_image || ''}', 'wishlist', ${JSON.stringify(game.genres || []).replace(/"/g, '&quot;')})" class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors flex items-center">
                        <i class="fas fa-heart mr-2"></i>Quero Jogar
                    </button>
                    <button onclick="gameTracker.addToLibrary('${game.id}', '${game.name.replace(/'/g, "\\'")}', '${game.background_image || ''}', 'abandoned', ${JSON.stringify(game.genres || []).replace(/"/g, '&quot;')})" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center">
                        <i class="fas fa-times-circle mr-2"></i>Abandonado
                    </button>
                </div>
            `;
        }
        
        modal.classList.remove('hidden');
    }
    
    addToLibrary(gameId, gameName, gameImage, status, genres) {
        const game = {
            id: gameId,
            name: gameName,
            image: gameImage,
            status: status,
            addedDate: new Date().toISOString(),
            genres: genres.map(g => g.name) // Salva apenas o nome do gênero
        };
        
        const existingIndex = this.library.findIndex(g => g.id === gameId);
        
        if (existingIndex !== -1) {
            this.library[existingIndex].status = status;
        } else {
            this.library.push(game);
        }
        
        this.saveLibrary();
        this.updateUI();
        this.closeModal();
        
        this.showNotification(`${gameName} adicionado/atualizado na biblioteca!`, 'success');
    }
    
    removeFromLibrary(gameId) {
        const gameName = this.library.find(g => g.id === gameId)?.name || 'Jogo';
        this.library = this.library.filter(game => game.id !== gameId);
        this.saveLibrary();
        this.updateUI();
        this.showNotification(`${gameName} removido da biblioteca!`, 'success');
    }
    
    updateGameStatus(gameId, newStatus) {
        const game = this.library.find(g => g.id === gameId);
        if (game) {
            game.status = newStatus;
            this.saveLibrary();
            this.updateUI();
            this.showNotification(`Status de ${game.name} atualizado para "${this.getStatusText(newStatus)}"!`, 'success');
        }
    }
    
    async loadFeaturedGames() {
        try {
            const response = await fetch(`${this.baseUrl}/games?key=${this.apiKey}&page_size=8&ordering=-rating&dates=2023-01-01,2024-12-31`); // Jogos recentes e bem avaliados
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            this.displayFeaturedGames(data.results);
        } catch (error) {
            console.error('Erro ao carregar jogos em destaque:', error);
            document.getElementById('featuredGames').innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p>Não foi possível carregar jogos em destaque. Tente recarregar a página.</p>
                </div>
            `;
            this.showNotification('Erro ao carregar jogos em destaque.', 'error');
        }
    }
    
    displayFeaturedGames(games) {
        const container = document.getElementById('featuredGames');
        container.innerHTML = games.map(game => `
            <div class="game-card p-4 cursor-pointer" onclick="gameTracker.selectGameById('${game.id}')">
                <div class="aspect-w-16 aspect-h-9 mb-4">
                    <img src="${game.background_image || 'https://via.placeholder.com/300x200?text=Sem+Imagem'}" alt="${game.name}" class="w-full h-48 object-cover rounded-lg">
                </div>
                <h3 class="font-bold text-lg mb-2 truncate">${game.name}</h3>
                <div class="flex justify-between items-center text-sm text-gray-400 mb-2">
                    <span>${game.released ? new Date(game.released).getFullYear() : 'N/A'}</span>
                    <span class="flex items-center">
                        <i class="fas fa-star text-yellow-400 mr-1"></i>
                        ${game.rating || 'N/A'}
                    </span>
                </div>
                <div class="flex flex-wrap gap-1 mb-3">
                    ${game.genres ? game.genres.slice(0, 2).map(genre => `
                        <span class="px-2 py-1 bg-gray-600 rounded text-xs">${genre.name}</span>
                    `).join('') : ''}
                </div>
                <button class="w-full px-4 py-2 bg-neon text-gray-900 rounded-lg font-semibold hover:bg-opacity-80 transition-colors">
                    Ver Detalhes
                </button>
            </div>
        `).join('');
        this.initAnimations(); // Re-aplicar animações para novos cards
    }
    
    filterLibrary(filter) {
        const container = document.getElementById('libraryGrid');
        let filteredGames = filter === 'all' ? this.library : this.library.filter(game => game.status === filter);
        
        if (filteredGames.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500">
                    <i class="fas fa-gamepad text-6xl text-gray-600 mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2">Nenhum jogo encontrado nesta categoria</h3>
                    <p class="text-gray-400">Adicione jogos à sua biblioteca ou mude o filtro!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredGames.map(game => `
            <div class="game-card p-4">
                <div class="aspect-w-16 aspect-h-9 mb-4 relative">
                    <img src="${game.image || 'https://via.placeholder.com/300x200?text=Sem+Imagem'}" alt="${game.name}" class="w-full h-48 object-cover rounded-lg">
                    <div class="absolute top-2 right-2">
                        <span class="status-badge status-${game.status}">${this.getStatusText(game.status)}</span>
                    </div>
                </div>
                <h3 class="font-bold text-lg mb-2 truncate">${game.name}</h3>
                <div class="text-sm text-gray-400 mb-3">
                    Adicionado em ${new Date(game.addedDate).toLocaleDateString('pt-BR')}
                </div>
                
                <div class="flex flex-wrap gap-1 mb-3">
                    ${game.genres ? game.genres.slice(0, 2).map(genre => `
                        <span class="px-2 py-1 bg-gray-600 rounded text-xs">${genre.name}</span>
                    `).join('') : ''}
                </div>

                <div class="flex gap-2 mt-auto">
                    <select onchange="gameTracker.updateGameStatus('${game.id}', this.value)" class="flex-1 px-3 py-2 bg-gray-700 rounded text-sm text-white border border-gray-600 focus:border-neon focus:outline-none">
                        <option value="playing" ${game.status === 'playing' ? 'selected' : ''}>Jogando</option>
                        <option value="completed" ${game.status === 'completed' ? 'selected' : ''}>Completo</option>
                        <option value="abandoned" ${game.status === 'abandoned' ? 'selected' : ''}>Abandonado</option>
                        <option value="wishlist" ${game.status === 'wishlist' ? 'selected' : ''}>Quero Jogar</option>
                    </select>
                    <button onclick="gameTracker.removeFromLibrary('${game.id}')" class="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors flex items-center justify-center">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        this.initAnimations(); // Re-aplicar animações para novos cards
    }
    
    updateFilterButtons(activeButton) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active', 'border-neon', 'bg-gray-700');
            btn.classList.add('border-gray-600', 'hover:border-neon');
        });
        
        activeButton.classList.add('active', 'border-neon', 'bg-gray-700');
        activeButton.classList.remove('border-gray-600', 'hover:border-neon');
    }
    
    getStatusText(status) {
        const statusMap = {
            'playing': 'Jogando',
            'completed': 'Completo',
            'abandoned': 'Abandonado',
            'wishlist': 'Quero Jogar'
        };
        return statusMap[status] || status;
    }
    
    updateUI() {
        // Atualiza contadores na sidebar
        document.getElementById('gameCount').textContent = this.library.length;
        
        // Atualiza contadores do dashboard
        document.getElementById('totalGamesDashboard').textContent = this.library.length;
        document.getElementById('playingCountDashboard').textContent = this.library.filter(g => g.status === 'playing').length;
        document.getElementById('completedCountDashboard').textContent = this.library.filter(g => g.status === 'completed').length;

        // Atualiza contadores dos filtros da biblioteca
        const counts = {
            all: this.library.length,
            playing: this.library.filter(g => g.status === 'playing').length,
            completed: this.library.filter(g => g.status === 'completed').length,
            abandoned: this.library.filter(g => g.status === 'abandoned').length,
            wishlist: this.library.filter(g => g.status === 'wishlist').length
        };
        
        Object.keys(counts).forEach(key => {
            const element = document.getElementById(`count-${key}`);
            if (element) element.textContent = counts[key];
        });
        
        // Atualiza página de estatísticas se estiver ativa
        if (this.currentPage === 'stats') {
            this.updateStats();
        }

        // Atualiza biblioteca se estiver na página da biblioteca
        if (this.currentPage === 'library') {
            const activeFilterButton = document.querySelector('.filter-btn.active');
            const activeFilter = activeFilterButton ? activeFilterButton.dataset.filter : 'all';
            this.filterLibrary(activeFilter);
        }
    }
    
    updateStats() {
        document.getElementById('totalGames').textContent = this.library.length;
        document.getElementById('playingCount').textContent = this.library.filter(g => g.status === 'playing').length;
        document.getElementById('completedCount').textContent = this.library.filter(g => g.status === 'completed').length;
        document.getElementById('wishlistCount').textContent = this.library.filter(g => g.status === 'wishlist').length;
        
        // Cria gráficos se estiver na página de estatísticas
        this.createCharts();
    }
    
    createCharts() {
        const statusCtx = document.getElementById('statusChart');
        if (statusCtx) {
            const statusData = {
                playing: this.library.filter(g => g.status === 'playing').length,
                completed: this.library.filter(g => g.status === 'completed').length,
                abandoned: this.library.filter(g => g.status === 'abandoned').length,
                wishlist: this.library.filter(g => g.status === 'wishlist').length
            };
            
            this.drawBarChart(statusCtx, statusData, ['Jogando', 'Completos', 'Abandonados', 'Quero Jogar']);
        }
    }
    
    drawBarChart(canvas, data, labels) {
        const ctx = canvas.getContext('2d');
        // Clear previous chart
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const values = Object.values(data);
        const total = values.reduce((sum, val) => sum + val, 0);

        // Se não houver dados, exibe uma mensagem
        if (total === 0) {
            ctx.fillStyle = '#6b7280'; // gray-500
            ctx.font = '16px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('Nenhum dado para exibir no gráfico.', canvas.width / 2, canvas.height / 2);
            return;
        }

        const maxValue = Math.max(...values);
        const barWidth = canvas.width / (values.length * 1.5); // Ajusta a largura da barra
        const barSpacing = barWidth / 2;
        const startX = barSpacing / 2; // Início do primeiro gráfico

        values.forEach((value, index) => {
            const barHeight = (value / maxValue) * (canvas.height - 60); // Ajusta a altura para labels
            const x = startX + index * (barWidth + barSpacing);
            const y = canvas.height - barHeight - 40; // Ajusta posição Y para labels
            
            // Draw bar
            ctx.fillStyle = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'][index]; // Cores para os status
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Draw label
            ctx.fillStyle = '#9ca3af'; // gray-400
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(labels[index], x + barWidth / 2, canvas.height - 15);
            
            // Draw value (count)
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Inter Semibold';
            ctx.fillText(value.toString(), x + barWidth / 2, y - 10);
        });
    }
    
    showPage(pageId) {
        // Esconde todas as páginas
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });
        
        // Mostra a página selecionada
        const targetPage = document.getElementById(`${pageId}Page`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        }
        
        // Atualiza a navegação
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            item.classList.remove('text-neon', 'font-semibold', 'bg-gray-700');
            item.classList.add('text-gray-400');
        });
        
        const activeNavItem = document.querySelector(`.nav-item[onclick*="showPage('${pageId}')"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active', 'text-neon', 'font-semibold', 'bg-gray-700');
            activeNavItem.classList.remove('text-gray-400');
        }
        
        this.currentPage = pageId;
        
        // Atualiza o conteúdo específico da página
        if (pageId === 'library') {
            const activeFilterButton = document.querySelector('.filter-btn.active');
            const activeFilter = activeFilterButton ? activeFilterButton.dataset.filter : 'all';
            this.filterLibrary(activeFilter);
        } else if (pageId === 'stats') {
            this.updateStats();
        } else if (pageId === 'dashboard') {
            this.loadFeaturedGames(); // Recarrega os jogos em destaque no dashboard
            this.updateUI(); // Atualiza os contadores do dashboard
        }
    }
    
    closeModal() {
        document.getElementById('gameModal').classList.add('hidden');
    }
    
    showNotification(message, type = 'info') {
        const notificationContainer = document.getElementById('notificationContainer') || (() => {
            const div = document.createElement('div');
            div.id = 'notificationContainer';
            div.className = 'fixed top-4 right-4 z-[100] space-y-3';
            document.body.appendChild(div);
            return div;
        })();

        const notification = document.createElement('div');
        notification.className = `px-6 py-4 rounded-lg shadow-lg transform translate-x-full transition-all duration-300 ease-out opacity-0 ${
            type === 'success' ? 'bg-green-600' : 
            type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        } text-white`;
        notification.textContent = message;
        
        notificationContainer.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 50); // Pequeno atraso para garantir que a transição ocorra

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300); // Espera a transição de saída para remover
        }, 3000);
    }
    
    initAnimations() {
        // Animação para cards de jogos (dashboard e biblioteca)
        anime({
            targets: '#featuredGames .game-card, #libraryGrid .game-card',
            opacity: [0, 1],
            translateY: [20, 0],
            delay: anime.stagger(100),
            duration: 600,
            easing: 'easeOutQuad'
        });
        
        // Animação da sidebar
        anime({
            targets: '.sidebar',
            translateX: [-100, 0],
            opacity: [0, 1],
            duration: 800,
            easing: 'easeOutQuad'
        });
    }
    
    loadLibrary() {
        const saved = localStorage.getItem('gameTrackerLibrary');
        return saved ? JSON.parse(saved) : [];
    }
    
    saveLibrary() {
        localStorage.setItem('gameTrackerLibrary', JSON.stringify(this.library));
    }
}

// Funções globais para manipuladores de eventos embutidos no HTML (onclick)
function showPage(pageId) {
    gameTracker.showPage(pageId);
}

function closeModal() {
    gameTracker.closeModal();
}

// Inicializa a aplicação
const gameTracker = new GameTracker();