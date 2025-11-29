/**
 * メインアプリケーション - 初期化とコントローラー
 */
class App {
    constructor() {
        this.initialized = false;
    }

    /**
     * アプリケーションの初期化
     */
    async initialize() {
        try {
            console.log('🚀 アプリケーション初期化開始...');
            
            // ローディング表示
            window.ui.showLoading();
            
            // データ読み込み
            await window.dataLoader.loadAllData();
            
            // UI初期化
            window.ui.initialize();
            
            // 検索機能初期化
            window.searchManager.initialize();
            
            // 選択機能初期化
            window.selectionManager.initialize();
            
            // 可視化機能初期化
            window.visualizationManager.initialize();
            
            // 初期表示
            this.performInitialDisplay();
            
            // 統計情報表示
            window.ui.displayStats();
            
            console.log('✅ アプリケーション初期化完了');
            this.initialized = true;
            
        } catch (error) {
            console.error('❌ アプリケーション初期化エラー:', error);
            window.ui.showError(`データの読み込みに失敗しました: ${error.message}`);
        }
    }

    /**
     * 初期表示の実行
     */
    performInitialDisplay() {
        // すべての楽曲を表示
        const allSongs = window.dataLoader.getSongs();
        window.ui.displaySongs(allSongs);
        
        console.log(`📋 初期表示: ${allSongs.length}楽曲`);
    }

    /**
     * URL パラメータの処理
     * 将来の拡張用（例: ?song=123 で特定楽曲を表示）
     */
    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const songId = urlParams.get('song');
        
        if (songId) {
            const song = window.dataLoader.getSongById(parseInt(songId));
            if (song) {
                // 特定楽曲を表示
                window.ui.showSimilarView(song);
                return true;
            }
        }
        
        return false;
    }

    /**
     * ブラウザの戻る/進むボタン対応
     */
    setupHistoryManagement() {
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.view === 'similar' && event.state.songId) {
                const song = window.dataLoader.getSongById(event.state.songId);
                if (song) {
                    window.ui.showSimilarView(song);
                    return;
                }
            }
            
            // デフォルトは楽曲一覧表示
            window.ui.showSongsView();
        });
    }

    /**
     * URLを更新（履歴管理）
     */
    updateUrl(view, songId = null) {
        if (view === 'similar' && songId) {
            const url = new URL(window.location);
            url.searchParams.set('song', songId);
            
            history.pushState(
                { view: 'similar', songId: songId },
                '',
                url.toString()
            );
        } else {
            const url = new URL(window.location);
            url.searchParams.delete('song');
            
            history.pushState(
                { view: 'songs' },
                '',
                url.toString()
            );
        }
    }

    /**
     * エラーハンドリング
     */
    setupErrorHandling() {
        // グローバルエラーハンドラー
        window.addEventListener('error', (event) => {
            console.error('グローバルエラー:', event.error);
            window.ui.showError('予期しないエラーが発生しました');
        });

        // Promise rejection ハンドラー
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未処理のPromise rejection:', event.reason);
            window.ui.showError('データ処理でエラーが発生しました');
        });
    }

    /**
     * パフォーマンス監視
     */
    setupPerformanceMonitoring() {
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.timing;
                    const loadTime = perfData.loadEventEnd - perfData.navigationStart;
                    console.log(`📊 ページロード時間: ${loadTime}ms`);
                }, 0);
            });
        }
    }

    /**
     * サービスワーカーの登録（PWA対応）
     */
    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                // 今後のPWA対応時に実装
                console.log('💾 Service Worker対応準備完了');
            } catch (error) {
                console.warn('Service Worker登録失敗:', error);
            }
        }
    }

    /**
     * デバッグ情報の出力
     */
    logDebugInfo() {
        if (this.initialized) {
            const stats = window.dataLoader.getStats();
            const metadata = window.dataLoader.getMetadata();
            
            console.group('🐛 デバッグ情報');
            console.log('楽曲統計:', stats);
            console.log('メタデータ:', metadata);
            console.log('現在のビュー:', window.ui.currentView);
            console.log('選択された楽曲:', window.ui.currentSelectedSong);
            console.groupEnd();
        }
    }
}

// アプリケーションインスタンスの作成
window.app = new App();

// DOMContentLoaded イベントでアプリケーション開始
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM読み込み完了');
    
    // エラーハンドリング設定
    window.app.setupErrorHandling();
    
    // パフォーマンス監視設定
    window.app.setupPerformanceMonitoring();
    
    // アプリケーション初期化
    await window.app.initialize();
    
    // 履歴管理設定
    window.app.setupHistoryManagement();
    
    // URLパラメータ処理
    window.app.handleUrlParams();
    
    // Service Worker設定
    await window.app.setupServiceWorker();
});

// デバッグ用のグローバル関数
window.debug = () => {
    window.app.logDebugInfo();
};

// リサイズイベントの処理
window.addEventListener('resize', () => {
    // 必要に応じてレスポンシブ対応
});

// ページ離脱時の処理
window.addEventListener('beforeunload', (event) => {
    // 必要に応じて状態の保存
});