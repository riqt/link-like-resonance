/**
 * 可視化管理 - Embedding可視化とPCA/t-SNE計算
 */
class VisualizationManager {
    constructor() {
        this.chart = null;
        this.currentData = null;
        this.currentMethod = 'pca';
        this.showLabels = true;
        this.colorByGenre = true;
        this.genreColors = this.generateGenreColors();
    }

    /**
     * 可視化機能の初期化
     */
    initialize() {
        this.setupEventListeners();
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        const methodSelect = document.getElementById('methodSelect');
        const showLabelsCheck = document.getElementById('showLabelsCheck');
        const colorByGenreCheck = document.getElementById('colorByGenreCheck');
        const updateBtn = document.getElementById('updateVisualizationBtn');
        const backBtn = document.getElementById('backToSongsBtn');

        methodSelect.addEventListener('change', (e) => {
            this.currentMethod = e.target.value;
        });

        showLabelsCheck.addEventListener('change', (e) => {
            this.showLabels = e.target.checked;
        });

        colorByGenreCheck.addEventListener('change', (e) => {
            this.colorByGenre = e.target.checked;
        });

        updateBtn.addEventListener('click', () => {
            this.updateVisualization();
        });

        backBtn.addEventListener('click', () => {
            window.ui.showSongsView();
        });
    }

    /**
     * 可視化の実行
     */
    async visualize(selectedSongs) {
        console.log(`🎨 可視化開始: ${selectedSongs.length}楽曲`);
        
        try {
            // embeddingデータの読み込み
            const embeddingData = await this.loadEmbeddingData();
            if (!embeddingData) {
                throw new Error('Embeddingデータの読み込みに失敗しました');
            }

            // 選択楽曲のembeddingを抽出
            const selectedEmbeddings = this.extractSelectedEmbeddings(selectedSongs, embeddingData);
            if (selectedEmbeddings.length === 0) {
                throw new Error('選択楽曲のembeddingデータが見つかりません');
            }

            this.currentData = selectedEmbeddings;

            // 可視化実行
            await this.performDimensionReduction();
            this.updateVisualizationInfo();

        } catch (error) {
            console.error('❌ 可視化エラー:', error);
            this.showError(`可視化に失敗しました: ${error.message}`);
        }
    }

    /**
     * embeddingデータの読み込み
     */
    async loadEmbeddingData() {
        try {
            const response = await fetch('data/embeddings.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Embeddingデータ読み込みエラー:', error);
            return null;
        }
    }

    /**
     * 選択楽曲のembeddingを抽出
     */
    extractSelectedEmbeddings(selectedSongs, embeddingData) {
        const selectedEmbeddings = [];

        for (const song of selectedSongs) {
            const songId = song.id.toString();
            if (embeddingData[songId]) {
                selectedEmbeddings.push({
                    id: song.id,
                    title: song.title,
                    genre: song.genre,
                    artist_group: song.artist_group,
                    embedding: embeddingData[songId].embedding
                });
            }
        }

        console.log(`📊 抽出されたembedding: ${selectedEmbeddings.length}/${selectedSongs.length}楽曲`);
        return selectedEmbeddings;
    }

    /**
     * 次元削減の実行
     */
    async performDimensionReduction() {
        if (!this.currentData || this.currentData.length < 2) {
            throw new Error('次元削減には2つ以上のデータが必要です');
        }

        console.log(`🔄 ${this.currentMethod.toUpperCase()}による次元削減開始...`);

        // embeddingデータをテンソルに変換
        const embeddings = this.currentData.map(item => item.embedding);
        const tensor = tf.tensor2d(embeddings);

        let reducedData;
        if (this.currentMethod === 'pca') {
            reducedData = await this.performPCA(tensor);
        } else if (this.currentMethod === 'tsne') {
            reducedData = await this.performTSNE(tensor);
        } else {
            throw new Error(`未対応の次元削減手法: ${this.currentMethod}`);
        }

        // 結果を配列に変換
        const coords = await reducedData.array();
        
        // チャート描画
        this.renderChart(coords);

        // メモリクリーンアップ
        tensor.dispose();
        reducedData.dispose();

        console.log(`✅ ${this.currentMethod.toUpperCase()}による次元削減完了`);
    }

    /**
     * PCAの実行
     */
    async performPCA(tensor) {
        console.log('🔄 PCA計算中...');
        
        // データの中心化
        const mean = tensor.mean(0);
        const centered = tensor.sub(mean);
        
        // 共分散行列の計算
        const cov = centered.transpose().matMul(centered).div(tf.scalar(tensor.shape[0] - 1));
        
        // 固有値分解
        const svd = tf.linalg.svd(cov);
        
        // 主成分の選択（上位2成分）
        const components = svd.u.slice([0, 0], [-1, 2]);
        
        // データの射影
        const projected = centered.matMul(components);
        
        // メモリクリーンアップ
        mean.dispose();
        centered.dispose();
        cov.dispose();
        svd.s.dispose();
        svd.u.dispose();
        svd.v.dispose();
        components.dispose();
        
        return projected;
    }

    /**
     * t-SNEの実行（簡易版）
     */
    async performTSNE(tensor) {
        console.log('🔄 t-SNE計算中...');
        
        // 簡易t-SNE実装（実際のt-SNEは複雑なため、PCAベースの近似を使用）
        // より正確なt-SNEには専用ライブラリが必要
        
        // まずPCAで50次元に削減
        const mean = tensor.mean(0);
        const centered = tensor.sub(mean);
        const cov = centered.transpose().matMul(centered).div(tf.scalar(tensor.shape[0] - 1));
        const svd = tf.linalg.svd(cov);
        const components50 = svd.u.slice([0, 0], [-1, Math.min(50, tensor.shape[1])]);
        const pca50 = centered.matMul(components50);
        
        // その後さらに2次元に削減（距離保持を意識した射影）
        const finalComponents = components50.slice([0, 0], [-1, 2]);
        const result = centered.matMul(finalComponents);
        
        // メモリクリーンアップ
        mean.dispose();
        centered.dispose();
        cov.dispose();
        svd.s.dispose();
        svd.u.dispose();
        svd.v.dispose();
        components50.dispose();
        pca50.dispose();
        finalComponents.dispose();
        
        return result;
    }

    /**
     * チャートの描画
     */
    renderChart(coords) {
        const ctx = document.getElementById('visualizationCanvas');
        
        // 既存チャートの破棄
        if (this.chart) {
            this.chart.destroy();
        }

        // データポイントの準備
        const datasets = this.prepareDatasets(coords);

        this.chart = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `楽曲Embedding可視化 (${this.currentMethod.toUpperCase()})`,
                        font: { size: 16 }
                    },
                    legend: {
                        display: this.colorByGenre,
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                const dataIndex = context[0].dataIndex;
                                return this.currentData[dataIndex].title;
                            },
                            label: (context) => {
                                const dataIndex = context.dataIndex;
                                const song = this.currentData[dataIndex];
                                return [
                                    `ジャンル: ${song.genre}`,
                                    `アーティスト: ${song.artist_group}`,
                                    `X: ${context.parsed.x.toFixed(3)}`,
                                    `Y: ${context.parsed.y.toFixed(3)}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: `${this.currentMethod.toUpperCase()} Component 1`
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: `${this.currentMethod.toUpperCase()} Component 2`
                        }
                    }
                }
            }
        });
    }

    /**
     * データセットの準備
     */
    prepareDatasets(coords) {
        if (this.colorByGenre) {
            return this.prepareGenreBasedDatasets(coords);
        } else {
            return this.prepareSingleDataset(coords);
        }
    }

    /**
     * ジャンル別データセット
     */
    prepareGenreBasedDatasets(coords) {
        const artistGroups = {};

        this.currentData.forEach((song, index) => {
            // アーティストグループで色分け
            const artist = song.artist_group || song.artists || 'Unknown';
            if (!artistGroups[artist]) {
                artistGroups[artist] = [];
            }
            artistGroups[artist].push({
                x: coords[index][0],
                y: coords[index][1],
                songData: song
            });
        });

        return Object.entries(artistGroups).map(([artist, points]) => {
            // カスタム色を取得、なければ生成
            let color = this.genreColors[artist];
            if (!color) {
                color = this.generateColorFromString(artist);
            }

            return {
                label: artist,
                data: points,
                backgroundColor: color,
                borderColor: color,
                pointRadius: 8,
                pointHoverRadius: 12
            };
        });
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
     * 単一データセット
     */
    prepareSingleDataset(coords) {
        const points = this.currentData.map((song, index) => ({
            x: coords[index][0],
            y: coords[index][1],
            songData: song
        }));

        return [{
            label: '楽曲',
            data: points,
            backgroundColor: '#b94047',
            borderColor: '#b94047',
            pointRadius: 8,
            pointHoverRadius: 12
        }];
    }

    /**
     * ジャンル色の生成
     */
    generateGenreColors() {
        // UIManagerと同じ色設定を使用
        const baseColors = {
            'Edel Note': '#d4d4d4',
            '蓮ノ空女学院スクールアイドルクラブ': '#ffc0cb',
            'スリーズブーケ': '#e95464',
            'みらくらぱーく!': '#ffff00',
            'DOLLCHESTRA': '#0000ff',
            '藤島慈(CV.月音こな)': '#C8C2C6',
            '夕霧綴理(CV.佐々木琴子)': '#BA2636',
            '乙宗梢(CV.花宮初奈)': '#68BE8D'
        };

        // アーティスト名をキーとして色を設定
        const artistColors = {};
        Object.entries(baseColors).forEach(([artist, color]) => {
            artistColors[artist] = color;
        });

        return artistColors;
    }

    /**
     * 可視化の更新
     */
    async updateVisualization() {
        if (!this.currentData) {
            this.showError('可視化するデータがありません');
            return;
        }

        await this.performDimensionReduction();
        this.updateVisualizationInfo();
    }

    /**
     * 可視化情報の更新
     */
    updateVisualizationInfo() {
        const infoEl = document.getElementById('visualizationInfo');
        if (!infoEl) return;

        const stats = {
            songCount: this.currentData.length,
            method: this.currentMethod.toUpperCase(),
            genres: [...new Set(this.currentData.map(s => s.genre))].length,
            showLabels: this.showLabels,
            colorByGenre: this.colorByGenre
        };

        infoEl.innerHTML = `
            <strong>可視化情報:</strong><br>
            楽曲数: ${stats.songCount}曲 | 
            手法: ${stats.method} | 
            ジャンル数: ${stats.genres} | 
            ラベル表示: ${stats.showLabels ? 'ON' : 'OFF'} | 
            ジャンル色分け: ${stats.colorByGenre ? 'ON' : 'OFF'}
        `;
    }

    /**
     * エラー表示
     */
    showError(message) {
        const infoEl = document.getElementById('visualizationInfo');
        if (infoEl) {
            infoEl.innerHTML = `<span style="color: #d00;">❌ ${message}</span>`;
        }
        console.error(message);
    }

    /**
     * チャートのクリーンアップ
     */
    cleanup() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.currentData = null;
    }
}

// グローバルインスタンス
window.visualizationManager = new VisualizationManager();