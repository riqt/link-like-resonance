/**
 * データローダー - JSONデータの読み込みとキャッシュ管理
 */
class DataLoader {
    constructor() {
        this.songs = null;
        this.similarities = null;
        this.metadata = null;
        this.loadPromise = null;
    }

    /**
     * すべてのデータを非同期で読み込み
     */
    async loadAllData() {
        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.loadPromise = this._loadDataInternal();
        return this.loadPromise;
    }

    /**
     * 内部的なデータ読み込み処理
     */
    async _loadDataInternal() {
        try {
            console.log('🔄 データ読み込み開始...');
            
            // 並行してすべてのデータを読み込み
            const [songsResponse, similaritiesResponse, metadataResponse] = await Promise.all([
                fetch('data/songs.json'),
                fetch('data/similarities.json'),
                fetch('data/metadata.json')
            ]);

            // レスポンス確認
            if (!songsResponse.ok) {
                throw new Error(`楽曲データの読み込みに失敗: ${songsResponse.status}`);
            }
            if (!similaritiesResponse.ok) {
                throw new Error(`類似度データの読み込みに失敗: ${similaritiesResponse.status}`);
            }
            if (!metadataResponse.ok) {
                throw new Error(`メタデータの読み込みに失敗: ${metadataResponse.status}`);
            }

            // JSONパース
            const [songsData, similaritiesData, metadataData] = await Promise.all([
                songsResponse.json(),
                similaritiesResponse.json(),
                metadataResponse.json()
            ]);

            // データ格納
            this.songs = songsData.songs || [];
            this.similarities = similaritiesData || {};
            this.metadata = metadataData || {};

            console.log(`✅ データ読み込み完了: ${this.songs.length}楽曲`);
            console.log(`📊 類似度データ: ${Object.keys(this.similarities).length}楽曲`);
            
            return {
                songs: this.songs,
                similarities: this.similarities,
                metadata: this.metadata
            };

        } catch (error) {
            console.error('❌ データ読み込みエラー:', error);
            throw error;
        }
    }

    /**
     * 楽曲データを取得
     */
    getSongs() {
        return this.songs || [];
    }

    /**
     * 楽曲IDで楽曲を検索
     */
    getSongById(id) {
        return this.songs?.find(song => song.id === parseInt(id));
    }

    /**
     * 楽曲の類似楽曲リストを取得
     */
    getSimilarSongs(songId) {
        const similarityData = this.similarities?.[songId.toString()];
        if (!similarityData) {
            return [];
        }

        // 類似楽曲の詳細情報を付加
        return similarityData.map(sim => {
            const song = this.getSongById(sim.song_id);
            return {
                ...sim,
                song: song
            };
        }).filter(sim => sim.song); // 楽曲データが見つからない場合は除外
    }

    /**
     * ジャンル一覧を取得
     */
    getGenres() {
        if (!this.songs) return [];
        
        const genres = [...new Set(this.songs.map(song => song.genre).filter(Boolean))];
        return genres.sort();
    }

    /**
     * アーティスト一覧を取得
     */
    getArtists() {
        if (!this.songs) return [];
        
        const artistCounts = {};
        
        this.songs.forEach(song => {
            // アーティストグループのマッピングを適用
            const mappedArtist = window.AppConfig.getMappedArtistGroup(song.artist_group);
            
            if (!artistCounts[mappedArtist]) {
                artistCounts[mappedArtist] = [];
            }
            artistCounts[mappedArtist].push(song);
        });
        
        // 設定ファイルの順序でアーティストをソート
        const sortedArtists = window.AppConfig.sortByOrder(artistCounts, window.AppConfig.artistOrder);
        return sortedArtists.map(([artist, songs]) => artist);
    }

    /**
     * メンバー一覧を取得
     */
    getMembers() {
        if (!this.songs) return [];
        
        const memberCounts = {};
        
        this.songs.forEach(song => {
            if (song.members && Array.isArray(song.members)) {
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
        return sortedMembers.map(([member, songs]) => member);
    }

    /**
     * メタデータを取得
     */
    getMetadata() {
        return this.metadata || {};
    }

    /**
     * 統計情報を取得
     */
    getStats() {
        const stats = {
            totalSongs: this.songs?.length || 0,
            totalGenres: this.getGenres().length,
            totalArtists: this.getArtists().length,
            totalSimilarities: Object.keys(this.similarities || {}).length
        };

        return stats;
    }

    /**
     * 楽曲を検索（タイトルによる部分一致）
     */
    searchSongs(query, genreFilter = '', artistFilter = '', memberFilter = '') {
        if (!this.songs) return [];

        const normalizedQuery = query.toLowerCase().trim();
        
        return this.songs.filter(song => {
            // タイトル検索
            const titleMatch = !normalizedQuery || 
                song.title.toLowerCase().includes(normalizedQuery);
            
            // ジャンルフィルタ
            const genreMatch = !genreFilter || song.genre === genreFilter;
            
            // アーティストフィルタ（マッピングを適用）
            const mappedArtist = window.AppConfig.getMappedArtistGroup(song.artist_group);
            const artistMatch = !artistFilter || mappedArtist === artistFilter;
            
            // メンバーフィルタ（members配列に含まれるかチェック）
            const memberMatch = !memberFilter || 
                (song.members && song.members.includes(memberFilter));
            
            return titleMatch && genreMatch && artistMatch && memberMatch;
        });
    }

    /**
     * データがロード済みかチェック
     */
    isDataLoaded() {
        return this.songs !== null && this.similarities !== null && this.metadata !== null;
    }
}

// グローバルインスタンス
window.dataLoader = new DataLoader();