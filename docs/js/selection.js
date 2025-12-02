/**
 * 楽曲選択管理 - チェックボックスによる複数選択
 */
class SelectionManager {
    constructor() {
        this.selectedSongs = new Set();
    }

    /**
     * 選択機能の初期化
     */
    initialize() {
        this.setupEventListeners();
        this.setupArtistSelection();
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        const selectAllBtn = document.getElementById('selectAllBtn');
        const clearSelectionBtn = document.getElementById('clearSelectionBtn');
        const visualizeBtn = document.getElementById('visualizeBtn');

        selectAllBtn.addEventListener('click', () => {
            this.selectAll();
        });

        clearSelectionBtn.addEventListener('click', () => {
            this.clearSelection();
        });

        visualizeBtn.addEventListener('click', () => {
            this.startVisualization();
        });

        // アーティスト選択パネル関連
        const artistSelectionBtn = document.getElementById('artistSelectionBtn');
        const closeArtistPanelBtn = document.getElementById('closeArtistPanelBtn');
        const clearAllArtistsBtn = document.getElementById('clearAllArtistsBtn');

        artistSelectionBtn.addEventListener('click', () => {
            this.toggleArtistPanel();
        });

        closeArtistPanelBtn.addEventListener('click', () => {
            this.hideArtistPanel();
        });

        clearAllArtistsBtn.addEventListener('click', () => {
            this.clearAllArtists();
        });

        // メンバー選択パネル関連
        const memberSelectionBtn = document.getElementById('memberSelectionBtn');
        const closeMemberPanelBtn = document.getElementById('closeMemberPanelBtn');
        const clearAllMembersBtn = document.getElementById('clearAllMembersBtn');

        memberSelectionBtn.addEventListener('click', () => {
            this.toggleMemberPanel();
        });

        closeMemberPanelBtn.addEventListener('click', () => {
            this.hideMemberPanel();
        });

        clearAllMembersBtn.addEventListener('click', () => {
            this.clearAllMembers();
        });

        // パネル外クリックで閉じる
        document.addEventListener('click', (e) => {
            const artistPanel = document.getElementById('artistSelectionPanel');
            const artistBtn = document.getElementById('artistSelectionBtn');
            const memberPanel = document.getElementById('memberSelectionPanel');
            const memberBtn = document.getElementById('memberSelectionBtn');
            
            if (!artistPanel.contains(e.target) && !artistBtn.contains(e.target)) {
                this.hideArtistPanel();
            }
            if (!memberPanel.contains(e.target) && !memberBtn.contains(e.target)) {
                this.hideMemberPanel();
            }
        });
    }

    /**
     * 楽曲カードにチェックボックスを追加
     */
    addCheckboxToCard(card, songId) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'song-card-checkbox';
        checkbox.dataset.songId = songId;
        checkbox.checked = this.selectedSongs.has(songId);

        // チェックボックスのイベント
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation(); // カードクリックイベントの伝播を防ぐ
            this.toggleSongSelection(songId, e.target.checked);
        });

        card.appendChild(checkbox);
        return checkbox;
    }

    /**
     * 楽曲選択の切り替え
     */
    toggleSongSelection(songId, isSelected) {
        if (isSelected) {
            this.selectedSongs.add(songId);
        } else {
            this.selectedSongs.delete(songId);
        }

        // UI更新
        this.updateSelectionUI(songId, isSelected);
        this.updateSelectionCount();
        this.updateVisualizeButton();
        
        // パネルが開いている場合は状態を更新
        const artistPanel = document.getElementById('artistSelectionPanel');
        const memberPanel = document.getElementById('memberSelectionPanel');
        if (artistPanel && artistPanel.style.display !== 'none') {
            this.updateArtistCheckboxes();
        }
        if (memberPanel && memberPanel.style.display !== 'none') {
            this.updateMemberCheckboxes();
        }
    }

    /**
     * 全選択/全解除の切り替え
     */
    selectAll() {
        const checkboxes = document.querySelectorAll('.song-card-checkbox');
        const totalSongs = checkboxes.length;
        const selectedSongs = this.selectedSongs.size;
        
        // 全選択されている場合は全解除、そうでなければ全選択
        const shouldSelectAll = selectedSongs < totalSongs;
        
        checkboxes.forEach(checkbox => {
            const songId = parseInt(checkbox.dataset.songId);
            checkbox.checked = shouldSelectAll;
            
            if (shouldSelectAll) {
                this.selectedSongs.add(songId);
                this.updateSelectionUI(songId, true);
            } else {
                this.selectedSongs.delete(songId);
                this.updateSelectionUI(songId, false);
            }
        });

        this.updateSelectionCount();
        this.updateVisualizeButton();
        
        console.log(`🔄 ${shouldSelectAll ? 'Select All' : 'Clear Selection'}を実行 (${totalSongs}曲)`);
    }

    /**
     * 選択解除
     */
    clearSelection() {
        const checkboxes = document.querySelectorAll('.song-card-checkbox');
        checkboxes.forEach(checkbox => {
            const songId = parseInt(checkbox.dataset.songId);
            checkbox.checked = false;
            this.selectedSongs.delete(songId);
            this.updateSelectionUI(songId, false);
        });

        this.updateSelectionCount();
        this.updateVisualizeButton();
    }

    /**
     * 選択UIの更新
     */
    updateSelectionUI(songId, isSelected) {
        const card = document.querySelector(`.song-card[data-song-id="${songId}"]`);
        if (card) {
            if (isSelected) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        }
    }

    /**
     * 選択数の更新
     */
    updateSelectionCount() {
        const selectedCount = document.getElementById('selectedCount');
        const btnCount = document.querySelector('.btn-count');
        if (selectedCount && btnCount) {
            const count = this.selectedSongs.size;
            if (count === 0) {
                selectedCount.textContent = 'No';
                btnCount.innerHTML = '(<span id="selectedCount">No</span> songs)';
            } else if (count === 1) {
                selectedCount.textContent = '1';
                btnCount.innerHTML = '(<span id="selectedCount">1</span> song)';
            } else {
                selectedCount.textContent = count;
                btnCount.innerHTML = `(<span id="selectedCount">${count}</span> songs)`;
            }
        }
    }

    /**
     * 可視化ボタンの状態更新
     */
    updateVisualizeButton() {
        const visualizeBtn = document.getElementById('visualizeBtn');
        if (visualizeBtn) {
            visualizeBtn.disabled = this.selectedSongs.size < 3;
        }
    }

    /**
     * 可視化開始
     */
    async startVisualization() {
        if (this.selectedSongs.size < 3) {
            alert('可視化には3つ以上の楽曲を選択してください');
            return;
        }

        console.log(`🎨 可視化開始: ${this.selectedSongs.size}楽曲選択`);
        
        // 選択された楽曲のデータを取得
        const selectedSongData = this.getSelectedSongData();
        
        if (selectedSongData.length === 0) {
            alert('選択された楽曲のデータを取得できませんでした');
            return;
        }

        // 可視化画面に移動
        window.ui.showVisualizationView(selectedSongData);
    }

    /**
     * 選択された楽曲のデータを取得
     */
    getSelectedSongData() {
        const selectedData = [];
        
        for (const songId of this.selectedSongs) {
            const song = window.dataLoader.getSongById(songId);
            if (song) {
                selectedData.push(song);
            }
        }

        return selectedData;
    }

    /**
     * 選択状態をリセット
     */
    resetSelection() {
        this.selectedSongs.clear();
        this.updateSelectionCount();
        this.updateVisualizeButton();
        
        // チェックボックスのリセット
        const checkboxes = document.querySelectorAll('.song-card-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // カードのスタイルリセット
        const cards = document.querySelectorAll('.song-card.selected');
        cards.forEach(card => {
            card.classList.remove('selected');
        });
    }

    /**
     * 現在の選択状態を取得
     */
    getSelectedSongs() {
        return Array.from(this.selectedSongs);
    }

    /**
     * 選択数を取得
     */
    getSelectionCount() {
        return this.selectedSongs.size;
    }

    /**
     * 特定の楽曲が選択されているかチェック
     */
    isSongSelected(songId) {
        return this.selectedSongs.has(songId);
    }

    /**
     * プログラム的に楽曲を選択
     */
    selectSong(songId) {
        this.selectedSongs.add(songId);
        this.updateSelectionUI(songId, true);
        this.updateSelectionCount();
        this.updateVisualizeButton();

        // チェックボックスも更新
        const checkbox = document.querySelector(`.song-card-checkbox[data-song-id="${songId}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    }

    /**
     * プログラム的に楽曲の選択を解除
     */
    deselectSong(songId) {
        this.selectedSongs.delete(songId);
        this.updateSelectionUI(songId, false);
        this.updateSelectionCount();
        this.updateVisualizeButton();

        // チェックボックスも更新
        const checkbox = document.querySelector(`.song-card-checkbox[data-song-id="${songId}"]`);
        if (checkbox) {
            checkbox.checked = false;
        }
    }

    /**
     * アーティスト選択パネルのセットアップ
     */
    setupArtistSelection() {
        this.populateArtistCheckboxes();
        this.populateMemberCheckboxes();
    }

    /**
     * アーティストチェックボックスを生成
     */
    populateArtistCheckboxes() {
        const artistCheckboxes = document.getElementById('artistCheckboxes');
        if (!artistCheckboxes) return;

        // アーティスト別楽曲数を集計（フィルターと同じロジック）
        const artistSongCounts = {};
        const songs = window.dataLoader.getSongs();

        songs.forEach(song => {
            // アーティストグループのマッピングを適用
            const mappedArtist = window.AppConfig.getMappedArtistGroup(song.artist_group);
            if (!artistSongCounts[mappedArtist]) {
                artistSongCounts[mappedArtist] = [];
            }
            artistSongCounts[mappedArtist].push(song);
        });

        // 設定ファイルの順序でアーティストをソート
        const sortedArtists = window.AppConfig.sortByOrder(artistSongCounts, window.AppConfig.artistOrder);

        artistCheckboxes.innerHTML = '';

        sortedArtists.forEach(([artist, songs]) => {
            const item = document.createElement('div');
            item.className = 'artist-checkbox-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `artist-${artist.replace(/[^a-zA-Z0-9]/g, '')}`;
            checkbox.dataset.artist = artist;

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.innerHTML = `
                <span>${this.escapeHtml(artist)}</span>
                <span class="song-count">${songs.length}曲</span>
            `;

            // アーティスト選択のイベント
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleArtistSongs(artist, e.target.checked);
            });
            
            // チェックボックスのクリックイベントにも伝播防止を追加
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // 行全体をクリック可能にする（チェックボックスと完全に同じ挙動）
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // チェックボックス自体がクリックされた場合は何もしない
                if (e.target === checkbox) return;
                
                // その他の場所がクリックされた場合はチェックボックスのclickを実行
                // これにより、チェックボックス直接クリックと完全に同じ処理パスを通る
                checkbox.click();
            });

            item.appendChild(checkbox);
            item.appendChild(label);
            artistCheckboxes.appendChild(item);
        });
    }

    /**
     * アーティスト選択パネルの表示切り替え
     */
    toggleArtistPanel() {
        const panel = document.getElementById('artistSelectionPanel');
        const isVisible = panel.style.display !== 'none';
        
        if (isVisible) {
            this.hideArtistPanel();
        } else {
            this.showArtistPanel();
        }
    }

    /**
     * アーティスト選択パネルを表示
     */
    showArtistPanel() {
        const panel = document.getElementById('artistSelectionPanel');
        panel.style.display = 'block';
        
        // アーティストチェックボックスの状態を更新
        this.updateArtistCheckboxes();
    }

    /**
     * アーティスト選択パネルを非表示
     */
    hideArtistPanel() {
        const panel = document.getElementById('artistSelectionPanel');
        panel.style.display = 'none';
    }

    /**
     * 特定アーティストの楽曲を一括選択/解除
     */
    toggleArtistSongs(artist, isSelected) {
        const songs = window.dataLoader.getSongs();
        const artistSongs = songs.filter(song => {
            // マッピングを適用してフィルタリング
            const mappedArtist = window.AppConfig.getMappedArtistGroup(song.artist_group);
            return mappedArtist === artist;
        });

        artistSongs.forEach(song => {
            if (isSelected) {
                this.selectedSongs.add(song.id);
                this.updateSelectionUI(song.id, true);
            } else {
                this.selectedSongs.delete(song.id);
                this.updateSelectionUI(song.id, false);
            }
        });

        // 楽曲カードのチェックボックスも更新
        artistSongs.forEach(song => {
            const checkbox = document.querySelector(`.song-card-checkbox[data-song-id="${song.id}"]`);
            if (checkbox) {
                checkbox.checked = isSelected;
            }
        });

        this.updateSelectionCount();
        this.updateVisualizeButton();

        console.log(`🎭 ${artist}: ${artistSongs.length}曲を${isSelected ? '選択' : '解除'}`);
    }

    /**
     * 全アーティスト選択
     */
    selectAllArtists() {
        const checkboxes = document.querySelectorAll('#artistCheckboxes input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (!checkbox.checked) {
                checkbox.checked = true;
                this.toggleArtistSongs(checkbox.dataset.artist, true);
            }
        });
    }

    /**
     * 全アーティスト解除
     */
    clearAllArtists() {
        const checkboxes = document.querySelectorAll('#artistCheckboxes input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                checkbox.checked = false;
                this.toggleArtistSongs(checkbox.dataset.artist, false);
            }
        });
    }

    /**
     * アーティストチェックボックスの状態を更新
     */
    updateArtistCheckboxes() {
        const checkboxes = document.querySelectorAll('#artistCheckboxes input[type="checkbox"]');
        const songs = window.dataLoader.getSongs();

        checkboxes.forEach(checkbox => {
            const artist = checkbox.dataset.artist;
            const artistSongs = songs.filter(song => {
                // マッピングを適用してフィルタリング
                const mappedArtist = window.AppConfig.getMappedArtistGroup(song.artist_group);
                return mappedArtist === artist;
            });

            // そのアーティストの楽曲がすべて選択されているかチェック
            const allSelected = artistSongs.every(song => this.selectedSongs.has(song.id));
            const someSelected = artistSongs.some(song => this.selectedSongs.has(song.id));

            checkbox.checked = allSelected;
            checkbox.indeterminate = someSelected && !allSelected;
        });
    }

    /**
     * HTMLエスケープ
     */
    /**
     * メンバーチェックボックスを生成
     */
    populateMemberCheckboxes() {
        const memberCheckboxes = document.getElementById('memberCheckboxes');
        if (!memberCheckboxes) return;

        // メンバー別楽曲数を集計
        const memberSongCounts = {};
        const songs = window.dataLoader.getSongs();

        songs.forEach(song => {
            if (song.members && Array.isArray(song.members)) {
                song.members.forEach(member => {
                    if (!memberSongCounts[member]) {
                        memberSongCounts[member] = [];
                    }
                    memberSongCounts[member].push(song);
                });
            }
        });

        // 設定ファイルの順序でメンバーをソート
        const sortedMembers = window.AppConfig.sortByOrder(memberSongCounts, window.AppConfig.memberOrder);

        memberCheckboxes.innerHTML = '';

        sortedMembers.forEach(([member, songs]) => {
            const item = document.createElement('div');
            item.className = 'member-checkbox-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `member-${member.replace(/[^a-zA-Z0-9]/g, '')}`;
            checkbox.dataset.member = member;

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.innerHTML = `
                <span>${this.escapeHtml(member)}</span>
                <span class="song-count">${songs.length}曲</span>
            `;

            // メンバー選択のイベント
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleMemberSongs(member, e.target.checked);
            });
            
            // チェックボックスのクリックイベントにも伝播防止を追加
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // 行全体をクリック可能にする（チェックボックスと完全に同じ挙動）
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // チェックボックス自体がクリックされた場合は何もしない
                if (e.target === checkbox) return;
                
                // その他の場所がクリックされた場合はチェックボックスのclickを実行
                // これにより、チェックボックス直接クリックと完全に同じ処理パスを通る
                checkbox.click();
            });

            item.appendChild(checkbox);
            item.appendChild(label);
            memberCheckboxes.appendChild(item);
        });
    }

    /**
     * メンバー選択パネルの表示切り替え
     */
    toggleMemberPanel() {
        const panel = document.getElementById('memberSelectionPanel');
        const isVisible = panel.style.display !== 'none';
        
        if (isVisible) {
            this.hideMemberPanel();
        } else {
            this.showMemberPanel();
        }
    }

    /**
     * メンバー選択パネルを表示
     */
    showMemberPanel() {
        const panel = document.getElementById('memberSelectionPanel');
        panel.style.display = 'block';
        
        // メンバーチェックボックスの状態を更新
        this.updateMemberCheckboxes();
    }

    /**
     * メンバー選択パネルを非表示
     */
    hideMemberPanel() {
        const panel = document.getElementById('memberSelectionPanel');
        panel.style.display = 'none';
    }

    /**
     * 特定メンバーの楽曲を一括選択/解除
     */
    toggleMemberSongs(member, isSelected) {
        const songs = window.dataLoader.getSongs();
        const memberSongs = songs.filter(song => {
            return song.members && song.members.includes(member);
        });

        memberSongs.forEach(song => {
            if (isSelected) {
                this.selectedSongs.add(song.id);
                this.updateSelectionUI(song.id, true);
            } else {
                this.selectedSongs.delete(song.id);
                this.updateSelectionUI(song.id, false);
            }
        });

        // 楽曲カードのチェックボックスも更新
        memberSongs.forEach(song => {
            const checkbox = document.querySelector(`.song-card-checkbox[data-song-id="${song.id}"]`);
            if (checkbox) {
                checkbox.checked = isSelected;
            }
        });

        this.updateSelectionCount();
        this.updateVisualizeButton();

        console.log(`👥 ${member}: ${memberSongs.length}曲を${isSelected ? '選択' : '解除'}`);
    }

    /**
     * 全メンバー選択
     */
    selectAllMembers() {
        const checkboxes = document.querySelectorAll('#memberCheckboxes input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (!checkbox.checked) {
                checkbox.checked = true;
                this.toggleMemberSongs(checkbox.dataset.member, true);
            }
        });
    }

    /**
     * 全メンバー解除
     */
    clearAllMembers() {
        const checkboxes = document.querySelectorAll('#memberCheckboxes input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                checkbox.checked = false;
                this.toggleMemberSongs(checkbox.dataset.member, false);
            }
        });
    }

    /**
     * メンバーチェックボックスの状態を更新
     */
    updateMemberCheckboxes() {
        const checkboxes = document.querySelectorAll('#memberCheckboxes input[type="checkbox"]');
        const songs = window.dataLoader.getSongs();

        checkboxes.forEach(checkbox => {
            const member = checkbox.dataset.member;
            const memberSongs = songs.filter(song => {
                return song.members && song.members.includes(member);
            });

            // そのメンバーの楽曲がすべて選択されているかチェック
            const allSelected = memberSongs.every(song => this.selectedSongs.has(song.id));
            const someSelected = memberSongs.some(song => this.selectedSongs.has(song.id));

            checkbox.checked = allSelected;
            checkbox.indeterminate = someSelected && !allSelected;
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
}

// グローバルインスタンス
window.selectionManager = new SelectionManager();