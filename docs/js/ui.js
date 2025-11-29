/**
 * UI管理 - 画面表示とユーザーインタラクション
 */
class UIManager {
    constructor() {
        this.currentView = 'songs'; // 'songs' | 'similar'
        this.currentSelectedSong = null;
        this.artistColors = this.initializeArtistColors();
        this.similarSongsDisplayed = 12; // デフォルト表示数
        this.allSimilarSongs = []; // 全類似楽曲データ
        this.currentSortOrder = 'desc'; // 現在のソート順
        this.currentDisplayCount = '12'; // 現在の表示数
    }

    /**
     * UI初期化
     */
    initialize() {
        this.setupEventListeners();
        this.showSongsView();
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        const backBtn = document.getElementById('backBtn');
        const showMoreBtn = document.getElementById('showMoreBtn');
        const sortOrder = document.getElementById('sortOrder');
        const displayCount = document.getElementById('displayCount');
        
        backBtn.addEventListener('click', () => {
            this.handleBackNavigation();
        });

        showMoreBtn.addEventListener('click', () => {
            this.showMoreSimilarSongs();
        });

        sortOrder.addEventListener('change', (e) => {
            this.currentSortOrder = e.target.value;
            this.updateSimilarDisplay();
        });

        displayCount.addEventListener('change', (e) => {
            this.currentDisplayCount = e.target.value;
            this.updateSimilarDisplay();
        });

        // モバイル対応: パネルの外側クリックで閉じる
        this.setupMobileInteractions();
    }

    /**
     * モバイル向けのインタラクション設定
     */
    setupMobileInteractions() {
        // アーティスト・メンバーパネルの外側クリックで閉じる（モバイル用）
        document.addEventListener('click', (e) => {
            const artistPanel = document.getElementById('artistSelectionPanel');
            const memberPanel = document.getElementById('memberSelectionPanel');
            const artistBtn = document.getElementById('artistSelectionBtn');
            const memberBtn = document.getElementById('memberSelectionBtn');
            
            // アーティストパネルの外側クリック
            if (artistPanel && artistPanel.style.display === 'block') {
                if (!artistPanel.contains(e.target) && e.target !== artistBtn) {
                    artistPanel.style.display = 'none';
                }
            }
            
            // メンバーパネルの外側クリック
            if (memberPanel && memberPanel.style.display === 'block') {
                if (!memberPanel.contains(e.target) && e.target !== memberBtn) {
                    memberPanel.style.display = 'none';
                }
            }
        });

        // タッチスクロール改善（iOS Safari対策）
        document.body.addEventListener('touchstart', () => {}, { passive: true });
        document.body.addEventListener('touchmove', () => {}, { passive: true });
    }

    /**
     * 戻るナビゲーション処理
     */
    handleBackNavigation() {
        // 可視化から類似楽曲に来た場合は可視化に戻る
        if (sessionStorage.getItem('visualizationToSimilar') === 'true') {
            const selectedSongs = JSON.parse(sessionStorage.getItem('selectedSongsForVisualization') || '[]');
            if (selectedSongs.length > 0) {
                sessionStorage.removeItem('visualizationToSimilar');
                sessionStorage.removeItem('selectedSongsForVisualization');
                this.showVisualizationView(selectedSongs);
                return;
            }
        }
        
        // 通常の楽曲一覧に戻る
        this.showSongsView();
    }

    /**
     * 楽曲一覧ビューを表示
     */
    showSongsView() {
        const searchSection = document.querySelector('.search-section');
        const songsSection = document.querySelector('.songs-section');
        const similarSection = document.getElementById('similarSection');
        const visualizationSection = document.getElementById('visualizationSection');

        searchSection.style.display = 'block';
        songsSection.style.display = 'block';
        similarSection.style.display = 'none';
        visualizationSection.style.display = 'none';
        
        this.currentView = 'songs';
        this.currentSelectedSong = null;
        
        // sessionStorageをクリア
        sessionStorage.removeItem('visualizationToSimilar');
        sessionStorage.removeItem('selectedSongsForVisualization');

        // 可視化のクリーンアップ
        if (window.visualizationManager) {
            window.visualizationManager.cleanup();
        }

        // 初期表示または検索結果の再表示
        if (window.searchManager) {
            window.searchManager.performSearch();
        }
    }

    /**
     * 類似楽曲ビューを表示
     */
    showSimilarView(song) {
        const searchSection = document.querySelector('.search-section');
        const songsSection = document.querySelector('.songs-section');
        const similarSection = document.getElementById('similarSection');
        const visualizationSection = document.getElementById('visualizationSection');

        searchSection.style.display = 'none';
        songsSection.style.display = 'none';
        similarSection.style.display = 'block';
        visualizationSection.style.display = 'none';
        
        this.currentView = 'similar';
        this.currentSelectedSong = song;

        this.displaySelectedSong(song);
        this.displaySimilarSongs(song.id);
        this.updateBackButton();
    }

    /**
     * 可視化ビューを表示
     */
    async showVisualizationView(selectedSongs) {
        const searchSection = document.querySelector('.search-section');
        const songsSection = document.querySelector('.songs-section');
        const similarSection = document.getElementById('similarSection');
        const visualizationSection = document.getElementById('visualizationSection');

        searchSection.style.display = 'none';
        songsSection.style.display = 'none';
        similarSection.style.display = 'none';
        visualizationSection.style.display = 'block';
        
        this.currentView = 'visualization';
        
        // 可視化実行
        if (window.visualizationManager) {
            await window.visualizationManager.visualize(selectedSongs);
        }
    }

    /**
     * 楽曲一覧の表示
     */
    displaySongs(songs) {
        const songsGrid = document.getElementById('songsGrid');
        const loading = document.getElementById('loading');
        const noResults = document.getElementById('noResults');

        // ローディング非表示
        loading.style.display = 'none';

        if (!songs || songs.length === 0) {
            songsGrid.innerHTML = '';
            noResults.style.display = 'block';
            return;
        }

        noResults.style.display = 'none';
        songsGrid.innerHTML = '';

        songs.forEach(song => {
            const songCard = this.createSongCard(song);
            songsGrid.appendChild(songCard);
        });
    }

    /**
     * 楽曲カードの作成
     */
    createSongCard(song) {
        const card = document.createElement('div');
        card.className = 'song-card';
        card.dataset.songId = song.id;

        // アーティスト情報の整理 - artist_groupのみ使用、存在しない場合は「ソロ・その他」
        const artistInfo = song.artist_group && song.artist_group.trim() 
            ? song.artist_group.trim() 
            : 'ソロ・その他';

        // アーティスト別の色を取得
        const artistColor = this.getArtistColor(song.artist_group || song.artists);

        card.innerHTML = `
            <div class="artist-color-bar" style="background-color: ${artistColor}"></div>
            <div class="song-title">${this.escapeHtml(song.title)}</div>
            <div class="song-meta">
                ${artistInfo ? `<span><strong>アーティスト:</strong> ${this.escapeHtml(artistInfo)}</span>` : ''}
            </div>
        `;

        // カードにアーティスト色を設定
        card.style.setProperty('--artist-color', artistColor);

        // チェックボックス追加（選択機能用）
        if (window.selectionManager) {
            window.selectionManager.addCheckboxToCard(card, song.id);
        }

        // クリックイベント（類似楽曲表示）
        card.addEventListener('click', (e) => {
            // チェックボックスクリックの場合は無視
            if (e.target.type === 'checkbox') {
                return;
            }
            this.handleSongClick(song);
        });

        return card;
    }

    /**
     * 楽曲クリック時の処理
     */
    handleSongClick(song) {
        console.log(`🎵 楽曲選択: ${song.title} (ID: ${song.id})`);
        this.showSimilarView(song);
    }

    /**
     * 選択された楽曲の表示
     */
    displaySelectedSong(song) {
        const selectedSongEl = document.getElementById('selectedSong');
        
        // アーティスト情報の整理 - artist_groupのみ使用、存在しない場合は「ソロ・その他」
        const artistInfo = song.artist_group && song.artist_group.trim() 
            ? song.artist_group.trim() 
            : 'ソロ・その他';

        selectedSongEl.innerHTML = `
            <div class="song-title">${this.escapeHtml(song.title)}</div>
            <div class="song-meta">
                ${artistInfo ? `<span><strong>アーティスト:</strong> ${this.escapeHtml(artistInfo)}</span>` : ''}
            </div>
        `;
    }

    /**
     * 類似楽曲の表示
     */
    displaySimilarSongs(songId) {
        const similarSongsEl = document.getElementById('similarSongs');
        const showMoreBtn = document.getElementById('showMoreBtn');
        this.allSimilarSongs = window.dataLoader.getSimilarSongs(songId);

        if (!this.allSimilarSongs || this.allSimilarSongs.length === 0) {
            similarSongsEl.innerHTML = `
                <div class="no-results">
                    この楽曲の類似楽曲が見つかりませんでした
                </div>
            `;
            showMoreBtn.style.display = 'none';
            return;
        }

        // デフォルト設定をリセット  
        this.currentSortOrder = 'desc';
        this.currentDisplayCount = '12';
        document.getElementById('sortOrder').value = 'desc';
        document.getElementById('displayCount').value = '12';
        
        this.updateSimilarDisplay();
    }

    /**
     * 類似楽曲カードの作成
     */
    createSimilarSongCard(simData) {
        const { song, similarity, rank } = simData;
        
        const card = document.createElement('div');
        card.className = 'similar-song';
        card.dataset.songId = song.id;

        // アーティスト情報の整理 - artist_groupのみ使用、存在しない場合は「ソロ・その他」
        const artistInfo = song.artist_group && song.artist_group.trim() 
            ? song.artist_group.trim() 
            : 'ソロ・その他';

        // アーティスト別の色を取得
        const artistColor = this.getArtistColor(song.artist_group || song.artists);

        // 類似度をパーセンテージに変換
        const similarityPercent = (similarity * 100).toFixed(1);

        card.innerHTML = `
            <div class="artist-color-bar" style="background-color: ${artistColor}"></div>
            <div>
                <span class="rank-badge">${rank}</span>
                <span class="similarity-score">${similarityPercent}%</span>
            </div>
            <div class="song-title">${this.escapeHtml(song.title)}</div>
            <div class="song-meta">
                ${artistInfo ? `<span><strong>アーティスト:</strong> ${this.escapeHtml(artistInfo)}</span>` : ''}
            </div>
        `;

        // カードにアーティスト色を設定
        card.style.setProperty('--artist-color', artistColor);

        // クリックイベント（類似楽曲をさらに検索）
        card.addEventListener('click', () => {
            this.handleSongClick(song);
        });

        return card;
    }

    /**
     * 類似楽曲の描画
     */
    renderSimilarSongs() {
        const similarSongsEl = document.getElementById('similarSongs');
        similarSongsEl.innerHTML = '';

        const songsToShow = this.allSimilarSongs.slice(0, this.similarSongsDisplayed);
        
        songsToShow.forEach(simData => {
            const similarCard = this.createSimilarSongCard(simData);
            similarSongsEl.appendChild(similarCard);
        });
    }

    /**
     * さらに表示ボタンの更新
     */
    updateShowMoreButton() {
        const showMoreBtn = document.getElementById('showMoreBtn');
        
        if (this.similarSongsDisplayed < this.allSimilarSongs.length) {
            const remaining = this.allSimilarSongs.length - this.similarSongsDisplayed;
            showMoreBtn.textContent = `さらに表示 (+${remaining}曲)`;
            showMoreBtn.style.display = 'block';
        } else {
            showMoreBtn.style.display = 'none';
        }
    }

    /**
     * 類似楽曲表示の更新
     */
    updateSimilarDisplay() {
        if (!this.allSimilarSongs || this.allSimilarSongs.length === 0) {
            return;
        }

        // ソート処理
        let sortedSongs = [...this.allSimilarSongs];
        if (this.currentSortOrder === 'asc') {
            sortedSongs.sort((a, b) => a.similarity - b.similarity);
        } else {
            sortedSongs.sort((a, b) => b.similarity - a.similarity);
        }

        // ランク再計算
        sortedSongs.forEach((song, index) => {
            song.rank = index + 1;
        });

        this.allSimilarSongs = sortedSongs;

        // 表示数決定
        if (this.currentDisplayCount === 'all') {
            this.similarSongsDisplayed = this.allSimilarSongs.length;
        } else {
            this.similarSongsDisplayed = Math.min(
                parseInt(this.currentDisplayCount),
                this.allSimilarSongs.length
            );
        }

        this.renderSimilarSongs();
        this.updateShowMoreButton();
    }

    /**
     * 戻るボタンの更新
     */
    updateBackButton() {
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            if (sessionStorage.getItem('visualizationToSimilar') === 'true') {
                backBtn.textContent = '🌌 可視化に戻る';
            } else {
                backBtn.textContent = '楽曲一覧に戻る';
            }
        }
    }

    /**
     * さらに表示の処理
     */
    showMoreSimilarSongs() {
        const increment = 6;
        this.similarSongsDisplayed = Math.min(
            this.similarSongsDisplayed + increment, 
            this.allSimilarSongs.length
        );
        this.renderSimilarSongs();
        this.updateShowMoreButton();
    }

    /**
     * ローディング状態の表示
     */
    showLoading() {
        const loading = document.getElementById('loading');
        const songsGrid = document.getElementById('songsGrid');
        const noResults = document.getElementById('noResults');

        loading.style.display = 'block';
        songsGrid.innerHTML = '';
        noResults.style.display = 'none';
    }

    /**
     * 統計情報の表示
     */
    displayStats() {
        const statsEl = document.getElementById('stats');
        const stats = window.dataLoader.getStats();
        const metadata = window.dataLoader.getMetadata();

        statsEl.innerHTML = `
            <div>総楽曲数: ${stats.totalSongs}</div>
            <div>ジャンル数: ${stats.totalGenres} | アーティスト数: ${stats.totalArtists}</div>
            ${metadata.export_info ? `<div>バージョン: ${metadata.export_info.version}</div>` : ''}
        `;
    }

    /**
     * アーティスト色の初期化
     */
    initializeArtistColors() {
        return {
            'Edel Note': '#d4d4d4',
            '蓮ノ空女学院スクールアイドルクラブ': '#ffc0cb',
            'スリーズブーケ': '#e95464',
            'みらくらぱーく!': '#ffff00',
            'DOLLCHESTRA': '#0000ff',
            '藤島慈(CV.月音こな)': '#C8C2C6',
            '夕霧綴理(CV.佐々木琴子)': '#BA2636',
            '乙宗梢(CV.花宮初奈)': '#68BE8D'
        };
    }

    /**
     * アーティストに対応する色を取得
     */
    getArtistColor(artist) {
        if (!artist) return '#cccccc';
        
        const normalizedArtist = artist.trim();
        
        // カスタム色が設定されているかチェック
        if (this.artistColors[normalizedArtist]) {
            return this.artistColors[normalizedArtist];
        }

        // カスタム色がない場合はハッシュベースで色生成
        return this.generateColorFromString(normalizedArtist);
    }

    /**
     * 文字列からハッシュベースで色を生成
     */
    generateColorFromString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        // HSLを使用して視認性の良い色を生成
        const hue = Math.abs(hash) % 360;
        const saturation = 60 + (Math.abs(hash) % 30); // 60-90%
        const lightness = 65 + (Math.abs(hash) % 20);  // 65-85%

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    /**
     * HTMLエスケープ
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * エラー表示
     */
    showError(message) {
        const songsGrid = document.getElementById('songsGrid');
        const loading = document.getElementById('loading');
        const noResults = document.getElementById('noResults');

        loading.style.display = 'none';
        noResults.style.display = 'none';

        songsGrid.innerHTML = `
            <div class="error-message" style="
                grid-column: 1 / -1;
                text-align: center;
                padding: 40px;
                background: rgba(255, 0, 0, 0.1);
                border-radius: 10px;
                color: #d00;
                font-size: 1.1rem;
            ">
                ❌ ${this.escapeHtml(message)}
            </div>
        `;
    }

    /**
     * 成功メッセージの表示
     */
    showSuccess(message) {
        // TODO: トースト通知やスナックバーの実装
        console.log(`✅ ${message}`);
    }
}

// グローバルインスタンス
window.ui = new UIManager();