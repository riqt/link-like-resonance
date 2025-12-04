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
        this.filteredSimilarSongs = []; // フィルタ後の類似楽曲データ
        this.currentSortOrder = 'desc'; // 現在のソート順
        this.currentDisplayCount = '12'; // 現在の表示数
        this.currentArtistFilter = ''; // 現在のアーティストフィルタ
        this.currentMemberFilter = ''; // 現在のメンバーフィルタ
        this.selectedSongsFilter = []; // 散布図から遷移時の選択楽曲リスト
        this.useSelectedSongsFilter = true; // 選択楽曲フィルタのオンオフ（デフォルト：オン）
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
        const backBtnTop = document.getElementById('backBtnTop');
        const showMoreBtn = document.getElementById('showMoreBtn');
        const sortTopBtn = document.getElementById('sortTopBtn');
        const sortBottomBtn = document.getElementById('sortBottomBtn');
        
        // 類似楽曲画面のプルダウンフィルタ
        const similarArtistFilter = document.getElementById('similarArtistFilter');
        const similarMemberFilter = document.getElementById('similarMemberFilter');
        const selectedSongsFilterBtn = document.getElementById('selectedSongsFilterBtn');
        
        backBtn.addEventListener('click', () => {
            this.handleBackNavigation();
        });

        backBtnTop.addEventListener('click', () => {
            this.handleBackNavigation();
        });

        showMoreBtn.addEventListener('click', () => {
            this.showMoreSimilarSongs();
        });

        sortTopBtn.addEventListener('click', () => {
            this.setSortOrder('desc');
        });

        sortBottomBtn.addEventListener('click', () => {
            this.setSortOrder('asc');
        });

        // 類似楽曲画面のプルダウンフィルタイベント
        similarArtistFilter?.addEventListener('change', (e) => {
            this.filterSimilarSongsByArtist(e.target.value);
        });

        similarMemberFilter?.addEventListener('change', (e) => {
            this.filterSimilarSongsByMember(e.target.value);
        });

        selectedSongsFilterBtn?.addEventListener('click', () => {
            this.toggleSelectedSongsFilter();
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
            
            // 類似楽曲画面はプルダウンフィルタなので不要
            
            // 楽曲一覧のアーティストパネルの外側クリック
            if (artistPanel && artistPanel.style.display === 'block') {
                if (!artistPanel.contains(e.target) && e.target !== artistBtn) {
                    artistPanel.style.display = 'none';
                }
            }
            
            // 楽曲一覧のメンバーパネルの外側クリック
            if (memberPanel && memberPanel.style.display === 'block') {
                if (!memberPanel.contains(e.target) && e.target !== memberBtn) {
                    memberPanel.style.display = 'none';
                }
            }
            
            // プルダウンフィルタなので外側クリック処理は不要
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
        
        // ページの一番上にスクロール
        window.scrollTo(0, 0);
        
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

        // ページの一番上にスクロール
        window.scrollTo(0, 0);

        // 散布図から遷移した場合の選択楽曲フィルタを設定
        if (sessionStorage.getItem('visualizationToSimilar') === 'true') {
            const selectedSongs = JSON.parse(sessionStorage.getItem('selectedSongsForVisualization') || '[]');
            this.selectedSongsFilter = selectedSongs.map(s => s.id);
            this.useSelectedSongsFilter = true; // デフォルトでオン
        } else {
            // 楽曲一覧から直接遷移した場合はフィルタをクリア
            this.selectedSongsFilter = [];
            this.useSelectedSongsFilter = false;
        }

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

        // ページの一番上にスクロール
        window.scrollTo(0, 0);

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

        // アーティスト情報の整理 - 表示用には元の名前またはmembersを使用
        const originalArtist = song.artist_group?.trim() || '';
        let artistInfo;
        if (originalArtist) {
            artistInfo = originalArtist;
        } else if (song.members && song.members.length > 0) {
            // memberOrderに従ってソート
            const sortedMembers = this.sortMembersByOrder(song.members);
            artistInfo = sortedMembers.join(', ');
        } else {
            artistInfo = 'ソロ・その他';
        }

        // アーティスト別の色を取得
        let artistColor;
        if (originalArtist) {
            // ユニット楽曲の場合は元のアーティスト名で色を決定
            artistColor = this.getArtistColor(originalArtist);
        } else if (song.members && song.members.length === 1) {
            // ソロ楽曲で1人の場合はそのメンバーの色を使用
            artistColor = this.getArtistColor(song.members[0]);
        } else {
            // その他の場合はデフォルト色
            artistColor = this.getArtistColor('ソロ・その他');
        }

        // Unit/Artist ラベルを決定
        const labelText = originalArtist ? 'Unit:' : 'Artist:';
        
        card.innerHTML = `
            <div class="artist-color-bar" style="background-color: ${artistColor}"></div>
            <div class="song-title">${this.escapeHtml(song.title)}</div>
            <div class="song-meta">
                ${artistInfo ? `<span><strong>${labelText}</strong> ${this.escapeHtml(artistInfo)}</span>` : ''}
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
        
        // アーティスト情報の整理 - ユニット名 + メンバーのフォーマット
        const originalArtist = song.artist_group?.trim() || '';
        let artistInfo;
        if (originalArtist) {
            // ユニット名がある場合、メンバーも追加
            if (song.members && song.members.length > 0) {
                // memberOrderに従ってソート
                const sortedMembers = this.sortMembersByOrder(song.members);
                artistInfo = `${originalArtist} [${sortedMembers.join(', ')}]`;
            } else {
                artistInfo = originalArtist;
            }
        } else if (song.members && song.members.length > 0) {
            // memberOrderに従ってソート
            const sortedMembers = this.sortMembersByOrder(song.members);
            artistInfo = sortedMembers.join(', ');
        } else {
            artistInfo = 'ソロ・その他';
        }

        // Unit/Artist ラベルを決定
        const labelText = originalArtist ? 'Unit:' : 'Artist:';

        selectedSongEl.innerHTML = `
            <div class="song-title">${this.escapeHtml(song.title)}</div>
            <div class="song-meta">
                ${artistInfo ? `<span><strong>${labelText}</strong> ${this.escapeHtml(artistInfo)}</span>` : ''}
                ${song.release ? `<br><span><strong>Release:</strong> ${this.escapeHtml(song.release)}</span>` : ''}
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
                    No Resonance Links found for this song
                </div>
            `;
            showMoreBtn.style.display = 'none';
            return;
        }

        // デフォルト設定をリセット  
        this.currentSortOrder = 'desc';
        this.currentDisplayCount = '12';
        this.currentArtistFilter = '';
        this.currentMemberFilter = '';
        this.updateSortButtons();
        
        this.updateSimilarDisplay();
        this.populateSimilarFilters();
        this.updateSelectedSongsFilterButton();
    }

    /**
     * 類似楽曲カードの作成
     */
    createSimilarSongCard(simData) {
        const { song, similarity, rank } = simData;
        
        const card = document.createElement('div');
        card.className = 'similar-song';
        card.dataset.songId = song.id;
        
        // フィルタ用のデータ属性を追加
        card.dataset.artistGroup = song.artist_group || '';
        card.dataset.members = song.members ? song.members.join(',') : '';

        // アーティスト情報の整理 - 表示用には元の名前またはmembersを使用
        const originalArtist = song.artist_group?.trim() || '';
        let artistInfo;
        if (originalArtist) {
            artistInfo = originalArtist;
        } else if (song.members && song.members.length > 0) {
            // memberOrderに従ってソート
            const sortedMembers = this.sortMembersByOrder(song.members);
            artistInfo = sortedMembers.join(', ');
        } else {
            artistInfo = 'ソロ・その他';
        }

        // アーティスト別の色を取得
        let artistColor;
        if (originalArtist) {
            // ユニット楽曲の場合は元のアーティスト名で色を決定
            artistColor = this.getArtistColor(originalArtist);
        } else if (song.members && song.members.length === 1) {
            // ソロ楽曲で1人の場合はそのメンバーの色を使用
            artistColor = this.getArtistColor(song.members[0]);
        } else {
            // その他の場合はデフォルト色
            artistColor = this.getArtistColor('ソロ・その他');
        }

        // Unit/Artist ラベルを決定
        const labelText = originalArtist ? 'Unit:' : 'Artist:';

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
                ${artistInfo ? `<span><strong>${labelText}</strong> ${this.escapeHtml(artistInfo)}</span>` : ''}
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

        const songsToShow = this.filteredSimilarSongs.slice(0, this.similarSongsDisplayed);
        
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
        
        if (this.similarSongsDisplayed < this.filteredSimilarSongs.length) {
            const remaining = this.filteredSimilarSongs.length - this.similarSongsDisplayed;
            const nextIncrement = Math.min(6, remaining);
            const incrementText = nextIncrement === 1 ? '1 song' : `${nextIncrement} songs`;
            const remainingText = remaining === 1 ? '1 song' : `${remaining} songs`;
            showMoreBtn.textContent = `Show More (+${incrementText}/${remainingText})`;
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

        // フィルタ処理
        let filteredSongs = [...this.allSimilarSongs];
        
        // 選択楽曲フィルタ（散布図から遷移時）
        if (this.useSelectedSongsFilter && this.selectedSongsFilter.length > 0) {
            filteredSongs = filteredSongs.filter(simData => {
                const song = simData.song;
                return this.selectedSongsFilter.includes(song.id);
            });
        }
        
        if (this.currentArtistFilter) {
            filteredSongs = filteredSongs.filter(simData => {
                const song = simData.song;
                const mappedArtist = window.AppConfig.getMappedArtistGroup(song.artist_group);
                return mappedArtist === this.currentArtistFilter;
            });
        }
        if (this.currentMemberFilter) {
            filteredSongs = filteredSongs.filter(simData => {
                const song = simData.song;
                return song?.members && song.members.includes(this.currentMemberFilter);
            });
        }

        // ソート処理
        if (this.currentSortOrder === 'asc') {
            filteredSongs.sort((a, b) => a.similarity - b.similarity);
        } else {
            filteredSongs.sort((a, b) => b.similarity - a.similarity);
        }

        // ランク再計算
        filteredSongs.forEach((song, index) => {
            song.rank = index + 1;
        });

        this.filteredSimilarSongs = filteredSongs;

        // 表示数決定
        if (this.currentDisplayCount === 'all') {
            this.similarSongsDisplayed = this.filteredSimilarSongs.length;
        } else {
            this.similarSongsDisplayed = Math.min(
                parseInt(this.currentDisplayCount),
                this.filteredSimilarSongs.length
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
        const backBtnTop = document.getElementById('backBtnTop');
        
        if (sessionStorage.getItem('visualizationToSimilar') === 'true') {
            if (backBtn) backBtn.textContent = '🌌 Return to Map';
            if (backBtnTop) backBtnTop.textContent = '🌌 Return to Map';
        } else {
            if (backBtn) backBtn.textContent = '📚 Return to Archive';
            if (backBtnTop) backBtnTop.textContent = '📚 Return to Archive';
        }
    }

    /**
     * さらに表示の処理
     */
    showMoreSimilarSongs() {
        const increment = 6;
        this.similarSongsDisplayed = Math.min(
            this.similarSongsDisplayed + increment, 
            this.filteredSimilarSongs.length
        );
        this.renderSimilarSongs();
        this.updateShowMoreButton();
    }

    /**
     * ソート順の設定
     */
    setSortOrder(order) {
        this.currentSortOrder = order;
        this.updateSortButtons();
        this.updateSimilarDisplay();
    }

    /**
     * ソートボタンの状態を更新
     */
    updateSortButtons() {
        const sortTopBtn = document.getElementById('sortTopBtn');
        const sortBottomBtn = document.getElementById('sortBottomBtn');
        
        if (sortTopBtn && sortBottomBtn) {
            if (this.currentSortOrder === 'desc') {
                sortTopBtn.classList.add('active');
                sortBottomBtn.classList.remove('active');
            } else {
                sortTopBtn.classList.remove('active');
                sortBottomBtn.classList.add('active');
            }
        }
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
            <div>Total Songs: ${stats.totalSongs}</div>
            ${metadata.export_info ? `<div>Version: ${metadata.export_info.version}</div>` : ''}
        `;
    }

    /**
     * アーティスト色の初期化
     */
    initializeArtistColors() {
        // 設定ファイルの色設定を使用
        return { ...window.AppConfig.artistColors };
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
     * メンバーをmemberOrderに従ってソート
     */
    sortMembersByOrder(members) {
        if (!members || !Array.isArray(members)) return [];
        
        const memberOrder = window.AppConfig.memberOrder;
        
        // memberOrderの順序でソート
        return [...members].sort((a, b) => {
            const indexA = memberOrder.indexOf(a);
            const indexB = memberOrder.indexOf(b);
            
            // 両方ともmemberOrderにある場合
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            // aのみmemberOrderにある場合
            if (indexA !== -1) {
                return -1;
            }
            // bのみmemberOrderにある場合
            if (indexB !== -1) {
                return 1;
            }
            // 両方ともmemberOrderにない場合は元の順序を保持
            return 0;
        });
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

    // === 類似楽曲画面のプルダウンフィルタ機能 ===

    /**
     * 類似楽曲のフィルタプルダウンを生成
     */
    populateSimilarFilters() {
        this.populateSimilarArtistFilter();
        this.populateSimilarMemberFilter();
    }

    /**
     * 類似楽曲のアーティストプルダウンを生成
     */
    populateSimilarArtistFilter() {
        const artistFilter = document.getElementById('similarArtistFilter');
        if (!artistFilter || !this.allSimilarSongs) return;

        // 表示中の類似楽曲からアーティストを抽出（マッピング適用）
        const artistCounts = {};
        this.allSimilarSongs.forEach(similarityItem => {
            const song = similarityItem.song;
            const mappedArtist = window.AppConfig.getMappedArtistGroup(song.artist_group);
            if (!artistCounts[mappedArtist]) {
                artistCounts[mappedArtist] = [];
            }
            artistCounts[mappedArtist].push(song);
        });

        // 設定ファイルの順序でアーティストをソート
        const sortedArtists = window.AppConfig.sortByOrder(artistCounts, window.AppConfig.artistOrder);

        // 既存のオプションをクリア（「All Units」以外）
        artistFilter.innerHTML = '<option value="">All Units</option>';

        sortedArtists.forEach(([artist, songs]) => {
            const option = document.createElement('option');
            option.value = artist;
            option.textContent = `${artist} (${songs.length}曲)`;
            artistFilter.appendChild(option);
        });
    }

    /**
     * 類似楽曲のメンバープルダウンを生成
     */
    populateSimilarMemberFilter() {
        const memberFilter = document.getElementById('similarMemberFilter');
        if (!memberFilter || !this.allSimilarSongs) return;

        // 表示中の類似楽曲からメンバーを抽出
        const memberCounts = {};
        this.allSimilarSongs.forEach(similarityItem => {
            const song = similarityItem.song;
            if (song?.members && Array.isArray(song.members)) {
                song.members.forEach(member => {
                    if (!memberCounts[member]) {
                        memberCounts[member] = [];
                    }
                    memberCounts[member].push(song);
                });
            }
        });

        // 設定ファイルの順序でメンバーをソート
        const sortedMembers = window.AppConfig.sortByOrder(memberCounts, window.AppConfig.memberOrder);

        // 既存のオプションをクリア（「All Members」以外）
        memberFilter.innerHTML = '<option value="">All Members</option>';

        sortedMembers.forEach(([member, songs]) => {
            const option = document.createElement('option');
            option.value = member;
            option.textContent = `${member} (${songs.length}曲)`;
            memberFilter.appendChild(option);
        });
    }

    /**
     * アーティストによる類似楽曲フィルタ（プルダウン版）
     */
    filterSimilarSongsByArtist(selectedArtist) {
        const memberFilter = document.getElementById('similarMemberFilter');
        
        // フィルタ状態を更新
        this.currentArtistFilter = selectedArtist;
        this.currentMemberFilter = '';
        this.similarSongsDisplayed = 12; // 表示数をリセット
        
        // メンバーフィルタをリセット
        if (memberFilter) {
            memberFilter.value = '';
        }
        
        // 表示を更新
        this.updateSimilarDisplay();
        
        console.log(selectedArtist ? `🎭 ${selectedArtist}でフィルタ` : '🎭 アーティストフィルタをクリア');
    }

    /**
     * メンバーによる類似楽曲フィルタ（プルダウン版）
     */
    filterSimilarSongsByMember(selectedMember) {
        const artistFilter = document.getElementById('similarArtistFilter');
        
        // フィルタ状態を更新
        this.currentMemberFilter = selectedMember;
        this.currentArtistFilter = '';
        this.similarSongsDisplayed = 12; // 表示数をリセット
        
        // アーティストフィルタをリセット
        if (artistFilter) {
            artistFilter.value = '';
        }
        
        // 表示を更新
        this.updateSimilarDisplay();
        
        console.log(selectedMember ? `👥 ${selectedMember}でフィルタ` : '👥 メンバーフィルタをクリア');
    }

    /**
     * 選択楽曲フィルタボタンの表示を更新
     */
    updateSelectedSongsFilterButton() {
        const filterBtn = document.getElementById('selectedSongsFilterBtn');
        const filterText = document.getElementById('selectedSongsFilterText');
        
        if (!filterBtn || !filterText) return;
        
        if (this.selectedSongsFilter.length > 0) {
            // 散布図から遷移した場合のみボタンを表示
            filterBtn.style.display = 'inline-block';
            
            // 状態に応じてテキストとCSSクラスを切り替え
            if (this.useSelectedSongsFilter) {
                filterText.textContent = '🎯 Clear Filter';
                filterBtn.classList.remove('inactive');
                filterBtn.classList.add('active');
            } else {
                filterText.textContent = '🎯 Apply Filter';
                filterBtn.classList.remove('active');
                filterBtn.classList.add('inactive');
            }
        } else {
            // 選択楽曲がない場合はボタンを非表示
            filterBtn.style.display = 'none';
        }
    }

    /**
     * 選択楽曲フィルタのオンオフ切り替え
     */
    toggleSelectedSongsFilter() {
        this.useSelectedSongsFilter = !this.useSelectedSongsFilter;
        this.similarSongsDisplayed = 12; // 表示数をリセット
        
        // アーティスト・メンバーフィルタをクリア
        this.currentArtistFilter = '';
        this.currentMemberFilter = '';
        
        const artistFilter = document.getElementById('similarArtistFilter');
        const memberFilter = document.getElementById('similarMemberFilter');
        if (artistFilter) artistFilter.value = '';
        if (memberFilter) memberFilter.value = '';
        
        this.updateSelectedSongsFilterButton();
        this.updateSimilarDisplay();
        
        const status = this.useSelectedSongsFilter ? 'オン' : 'オフ';
        console.log(`🎯 選択楽曲フィルタ: ${status}`);
    }

}

// グローバルインスタンス
window.ui = new UIManager();