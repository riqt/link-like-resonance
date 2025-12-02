/**
 * 検索機能 - 楽曲検索とフィルタリング
 */
class SearchManager {
    constructor() {
        this.currentQuery = '';
        this.currentGenreFilter = '';
        this.currentArtistFilter = '';
        this.currentMemberFilter = '';
        this.releaseSort = 'initial'; // 'initial' (古い順) or 'latest' (新しい順)
        this.searchResults = [];
        this.searchTimeout = null;
    }

    /**
     * 検索の初期化
     */
    initialize() {
        this.setupEventListeners();
        this.populateFilters();
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearBtn');
        const artistFilter = document.getElementById('artistFilter');
        const memberFilter = document.getElementById('memberFilter');
        const sortInitialBtn = document.getElementById('sortInitialBtn');
        const sortLatestBtn = document.getElementById('sortLatestBtn');

        // 検索入力のイベント
        searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        // クリアボタン
        clearBtn.addEventListener('click', () => {
            this.clearSearch();
        });

        // アーティストフィルタのイベント
        artistFilter.addEventListener('change', (e) => {
            this.currentArtistFilter = e.target.value;
            this.performSearch();
        });

        // メンバーフィルタのイベント
        memberFilter.addEventListener('change', (e) => {
            this.currentMemberFilter = e.target.value;
            this.performSearch();
        });

        // リリース順ソートボタンのイベント
        sortInitialBtn.addEventListener('click', () => {
            this.setReleaseSort('initial');
        });

        sortLatestBtn.addEventListener('click', () => {
            this.setReleaseSort('latest');
        });
    }

    /**
     * フィルタ選択肢を設定
     */
    populateFilters() {
        const artistFilter = document.getElementById('artistFilter');
        const memberFilter = document.getElementById('memberFilter');

        // アーティストフィルタ
        const artists = window.dataLoader.getArtists();
        artistFilter.innerHTML = '<option value="">All Units</option>';
        artists.forEach(artist => {
            const option = document.createElement('option');
            option.value = artist;
            option.textContent = artist;
            artistFilter.appendChild(option);
        });

        // メンバーフィルタ
        const members = window.dataLoader.getMembers();
        memberFilter.innerHTML = '<option value="">All Members</option>';
        members.forEach(member => {
            const option = document.createElement('option');
            option.value = member;
            option.textContent = member;
            memberFilter.appendChild(option);
        });
    }

    /**
     * 検索入力の処理（デバウンス付き）
     */
    handleSearchInput(query) {
        // クリアボタンの表示/非表示
        const clearBtn = document.getElementById('clearBtn');
        if (query.trim()) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
        }

        // デバウンス処理
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => {
            this.currentQuery = query.trim();
            this.performSearch();
        }, 300);
    }

    /**
     * 検索をクリア
     */
    clearSearch() {
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearBtn');
        
        searchInput.value = '';
        clearBtn.style.display = 'none';
        this.currentQuery = '';
        this.performSearch();
        searchInput.focus();
    }

    /**
     * 検索実行
     */
    performSearch() {
        console.log(`🔍 検索実行: "${this.currentQuery}" | アーティスト: "${this.currentArtistFilter}" | メンバー: "${this.currentMemberFilter}" | ソート: ${this.releaseSort}`);

        this.searchResults = window.dataLoader.searchSongs(
            this.currentQuery,
            this.currentGenreFilter,
            this.currentArtistFilter,
            this.currentMemberFilter
        );

        // リリース日でソート
        this.searchResults = this.sortByRelease(this.searchResults);

        console.log(`📋 検索結果: ${this.searchResults.length}件`);

        // UI更新
        window.ui.displaySongs(this.searchResults);
        this.updateSearchStats();
    }

    /**
     * 検索統計の更新
     */
    updateSearchStats() {
        const totalSongs = window.dataLoader.getSongs().length;
        const resultCount = this.searchResults.length;
        
        // 検索結果の統計をどこかに表示（必要に応じて）
        console.log(`検索統計: ${resultCount}/${totalSongs}件`);
    }

    /**
     * 現在の検索結果を取得
     */
    getCurrentResults() {
        return this.searchResults;
    }

    /**
     * 検索条件をリセット
     */
    resetFilters() {
        const searchInput = document.getElementById('searchInput');
        const artistFilter = document.getElementById('artistFilter');
        const memberFilter = document.getElementById('memberFilter');
        const clearBtn = document.getElementById('clearBtn');
        const sortInitialBtn = document.getElementById('sortInitialBtn');
        const sortLatestBtn = document.getElementById('sortLatestBtn');

        searchInput.value = '';
        artistFilter.value = '';
        memberFilter.value = '';
        clearBtn.style.display = 'none';

        // ソート設定もリセット
        this.releaseSort = 'initial';
        sortInitialBtn.classList.add('active');
        sortLatestBtn.classList.remove('active');

        this.currentQuery = '';
        this.currentGenreFilter = '';
        this.currentArtistFilter = '';
        this.currentMemberFilter = '';

        this.performSearch();
    }

    /**
     * 特定の楽曲を検索してハイライト
     */
    searchAndHighlightSong(songId) {
        const song = window.dataLoader.getSongById(songId);
        if (!song) return false;

        // 検索条件をリセット
        this.resetFilters();

        // 楽曲タイトルで検索
        const searchInput = document.getElementById('searchInput');
        searchInput.value = song.title;
        this.currentQuery = song.title;
        this.performSearch();

        return true;
    }

    /**
     * リリース順ソートの設定
     */
    setReleaseSort(sortType) {
        this.releaseSort = sortType;
        
        // ボタンのアクティブ状態を更新
        const sortInitialBtn = document.getElementById('sortInitialBtn');
        const sortLatestBtn = document.getElementById('sortLatestBtn');
        
        if (sortType === 'initial') {
            sortInitialBtn.classList.add('active');
            sortLatestBtn.classList.remove('active');
        } else {
            sortInitialBtn.classList.remove('active');
            sortLatestBtn.classList.add('active');
        }
        
        // 検索を再実行
        this.performSearch();
    }

    /**
     * リリース日でソート
     */
    sortByRelease(songs) {
        return songs.sort((a, b) => {
            const dateA = this.parseReleaseDate(a.release);
            const dateB = this.parseReleaseDate(b.release);
            
            if (this.releaseSort === 'initial') {
                // 古い順（昇順）
                return dateA - dateB;
            } else {
                // 新しい順（降順）
                return dateB - dateA;
            }
        });
    }

    /**
     * リリース日の文字列をDateオブジェクトに変換
     */
    parseReleaseDate(releaseString) {
        if (!releaseString) {
            // リリース日がない場合は最も古い日付として扱う
            return new Date('1900-01-01');
        }
        
        // "YYYY/MM/DD" または "YYYY-MM-DD" 形式に対応
        const cleaned = releaseString.replace(/[/-]/g, '-');
        const date = new Date(cleaned);
        
        // 無効な日付の場合は最も古い日付として扱う
        return isNaN(date.getTime()) ? new Date('1900-01-01') : date;
    }

    /**
     * 検索候補の表示（オートコンプリート）
     * 今後の拡張用
     */
    showSuggestions(_query) {
        // TODO: オートコンプリート機能の実装
        // 楽曲タイトルの前方一致や部分一致候補を表示
    }
}

// グローバルインスタンス
window.searchManager = new SearchManager();