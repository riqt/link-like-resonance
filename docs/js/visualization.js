/**
 * 可視化管理 - Embedding可視化とPCA/t-SNE計算
 */

// Chart.js datalabelsプラグインを登録（読み込み済みかチェック）
if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
    console.log('✅ Chart.js datalabelsプラグインを登録しました');
} else {
    console.warn('⚠️ ChartDataLabelsプラグインが見つかりません。代替手段を使用します');
}

class VisualizationManager {
    constructor() {
        this.chart = null;
        this.currentData = null;
        this.currentMethod = 'tsne';
        this.showLabels = false; // デフォルトオフ
        this.colorByGenre = true; // 常時オン（変更不可）
        this.genreColors = this.generateGenreColors();
    }

    /**
     * 可視化機能の初期化
     */
    initialize() {
        this.setupEventListeners();
        
        // datalabelsプラグインが利用可能かチェック
        if (typeof ChartDataLabels !== 'undefined') {
            console.log('✅ Chart.js datalabelsプラグインが読み込まれました');
        } else {
            console.error('❌ Chart.js datalabelsプラグインが読み込まれていません');
        }
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        const showLabelsCheck = document.getElementById('showLabelsCheck');
        const colorByGenreCheck = document.getElementById('colorByGenreCheck');
        const updateBtn = document.getElementById('updateVisualizationBtn');
        const backBtn = document.getElementById('backToSongsBtn');

        // 楽曲名表示はデフォルトオフ
        showLabelsCheck.checked = false;
        showLabelsCheck.addEventListener('change', (e) => {
            this.showLabels = e.target.checked;
            this.updateVisualization();
        });

        // ジャンル別色分けは常時オン（変更不可）
        colorByGenreCheck.checked = true;
        colorByGenreCheck.disabled = true;

        updateBtn.addEventListener('click', () => {
            this.updateVisualization();
        });

        backBtn.addEventListener('click', () => {
            window.ui.showSongsView();
        });

        // ウィンドウリサイズ時の調整
        window.addEventListener('resize', () => {
            if (this.chart && this.chart.options) {
                const isMobile = window.innerWidth <= 768;
                
                // 凡例位置調整
                this.chart.options.plugins.legend.position = isMobile ? 'bottom' : 'right';
                this.chart.options.plugins.legend.maxWidth = isMobile ? undefined : 200;
                this.chart.options.plugins.legend.maxHeight = isMobile ? 150 : undefined;
                
                // アスペクト比とパディング調整
                this.chart.options.aspectRatio = this.getResponsiveAspectRatio();
                this.chart.options.layout.padding = this.getResponsivePadding();
                
                // データラベルフォントサイズ調整
                this.chart.options.plugins.datalabels.font.size = this.getResponsiveFontSize();
                
                // ポイントサイズ調整
                this.chart.options.elements.point.radius = this.getResponsivePointRadius();
                this.chart.options.elements.point.hoverRadius = this.getResponsivePointRadius() + 4;
                
                this.chart.update();
            }
        });
    }

    /**
     * 可視化の実行
     */
    async visualize(selectedSongs) {
        console.log(`🎨 可視化開始: ${selectedSongs.length}楽曲`);
        
        try {
            // 最小楽曲数チェック
            if (selectedSongs.length < 3) {
                throw new Error('可視化には最低3曲の選択が必要です');
            }

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

            if (selectedEmbeddings.length < 3) {
                throw new Error(`有効なembeddingデータが${selectedEmbeddings.length}件のみです。可視化には最低3件必要です`);
            }

            this.currentData = selectedEmbeddings;

            // WebGLの状態をチェック・初期化
            await this.initializeTensorFlow();

            // 可視化実行
            await this.performDimensionReduction();
            this.updateVisualizationInfo();

        } catch (error) {
            console.error('❌ 可視化エラー:', error);
            this.showError(`可視化に失敗しました: ${error.message}`);
        }
    }

    /**
     * TensorFlow.jsの初期化とWebGL状態確認
     */
    async initializeTensorFlow() {
        try {
            // メモリクリーンアップ
            if (tf.memory().numTensors > 100) {
                console.log('🧹 TensorFlow.js メモリクリーンアップ実行');
                tf.dispose();
            }

            // WebGL状態チェック
            await tf.ready();
            
            // バックエンドの確認
            const backend = tf.getBackend();
            console.log(`🔧 TensorFlow.js バックエンド: ${backend}`);
            
            if (backend !== 'webgl') {
                console.warn('⚠️ WebGLが利用できません。CPUバックエンドを使用します');
            }

        } catch (error) {
            console.warn('⚠️ TensorFlow.js初期化警告:', error);
            // WebGLで問題がある場合はCPUバックエンドに切り替え
            try {
                await tf.setBackend('cpu');
                await tf.ready();
                console.log('💾 CPUバックエンドに切り替えました');
            } catch (fallbackError) {
                throw new Error(`TensorFlow.jsの初期化に失敗: ${fallbackError.message}`);
            }
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
        if (!this.currentData || this.currentData.length < 3) {
            throw new Error('次元削減には3つ以上のデータが必要です');
        }

        console.log(`🔄 t-SNE風の次元削減開始... (${this.currentData.length}楽曲)`);

        let tensor = null;
        let reducedData = null;

        try {
            // embeddingデータの前処理とバリデーション
            const embeddings = this.validateAndPreprocessEmbeddings();
            
            // テンソル作成
            tensor = tf.tensor2d(embeddings);
            console.log(`📊 入力テンソル形状: [${tensor.shape.join(', ')}]`);

            // 次元削減実行
            reducedData = await this.performTSNE(tensor);
            
            if (!reducedData || reducedData.isDisposed) {
                throw new Error('次元削減処理が失敗しました');
            }

            console.log(`📊 出力テンソル形状: [${reducedData.shape.join(', ')}]`);

            // 結果を配列に変換
            const coords = await reducedData.array();
            
            if (!coords || coords.length === 0) {
                throw new Error('次元削減結果の取得に失敗しました');
            }

            // チャート描画
            this.renderChart(coords);

            console.log(`✅ t-SNE風次元削減完了`);

        } catch (error) {
            console.error('❌ 次元削減エラー:', error);
            throw new Error(`次元削減処理エラー: ${error.message}`);
        } finally {
            // メモリクリーンアップ
            if (tensor && !tensor.isDisposed) {
                tensor.dispose();
            }
            if (reducedData && !reducedData.isDisposed) {
                reducedData.dispose();
            }
        }
    }

    /**
     * embeddingデータの検証と前処理
     */
    validateAndPreprocessEmbeddings() {
        const embeddings = [];
        
        for (let i = 0; i < this.currentData.length; i++) {
            const item = this.currentData[i];
            const embedding = item.embedding;
            
            if (!embedding || !Array.isArray(embedding)) {
                throw new Error(`楽曲${i+1}のembeddingデータが無効です`);
            }
            
            if (embedding.length === 0) {
                throw new Error(`楽曲${i+1}のembeddingデータが空です`);
            }
            
            // NaN や Infinity をチェック
            const hasInvalidValues = embedding.some(val => 
                !Number.isFinite(val) || Number.isNaN(val)
            );
            
            if (hasInvalidValues) {
                console.warn(`⚠️ 楽曲${i+1}に無効な値が含まれています。正規化を試行します`);
                // 無効な値を0に置換
                const cleanedEmbedding = embedding.map(val => 
                    Number.isFinite(val) ? val : 0
                );
                embeddings.push(cleanedEmbedding);
            } else {
                embeddings.push(embedding);
            }
        }

        // 全ての embedding の次元数をチェック
        const firstDim = embeddings[0].length;
        const dimensionMismatch = embeddings.some(emb => emb.length !== firstDim);
        
        if (dimensionMismatch) {
            throw new Error('embedding の次元数が一致しません');
        }

        console.log(`✅ embedding検証完了: ${embeddings.length}楽曲, ${firstDim}次元`);
        return embeddings;
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
     * t-SNEの実行（簡易版・安全実装）
     */
    async performTSNE(tensor) {
        console.log('🔄 t-SNE風の次元削減計算中...');
        
        const disposables = []; // 後でまとめて dispose するため
        
        try {
            const [numSamples, numFeatures] = tensor.shape;
            console.log(`データ形状: ${numSamples} x ${numFeatures}`);
            
            if (numSamples < 3 || numFeatures < 2) {
                throw new Error(`入力データの形状が不正: [${numSamples}, ${numFeatures}]`);
            }
            
            // データの正規化（数値安定性を向上）
            const mean = tensor.mean(0);
            disposables.push(mean);
            
            const centered = tensor.sub(mean);
            disposables.push(centered);
            
            // ゼロ分散を避けるため小さな値を加算
            const variance = centered.square().mean(0);
            const std = tf.sqrt(variance.add(tf.scalar(1e-8)));
            disposables.push(variance, std);
            
            const normalized = centered.div(std);
            disposables.push(normalized);
            
            // ランダム射影の次元数を適切に設定
            const targetDim = Math.min(Math.max(10, Math.floor(numFeatures / 4)), 50);
            console.log(`中間次元: ${targetDim}`);
            
            // ランダム射影行列（より数値安定）
            const randomMatrix = tf.randomNormal([numFeatures, targetDim], 0, Math.sqrt(2/numFeatures));
            disposables.push(randomMatrix);
            
            // 初期次元削減
            const reduced = normalized.matMul(randomMatrix);
            disposables.push(reduced);
            
            // さらに2次元への射影
            const reducedMean = reduced.mean(0);
            const reducedCentered = reduced.sub(reducedMean);
            disposables.push(reducedMean, reducedCentered);
            
            // 共分散行列計算（数値安定性向上）
            const covFactor = Math.max(numSamples - 1, 1);
            const covariance = reducedCentered.transpose().matMul(reducedCentered).div(tf.scalar(covFactor));
            disposables.push(covariance);
            
            // 主要な2つの固有ベクトルを近似計算
            const components = await this.computeTopEigenvectors(covariance, targetDim, 2);
            disposables.push(components);
            
            // 最終的な2次元射影
            const result = reducedCentered.matMul(components);
            
            // 結果の妥当性チェック
            if (result.shape[0] !== numSamples || result.shape[1] !== 2) {
                throw new Error(`出力形状が不正: [${result.shape.join(', ')}]`);
            }
            
            return result;

        } catch (error) {
            console.error('❌ t-SNE計算エラー:', error);
            throw error;
        } finally {
            // メモリクリーンアップ
            disposables.forEach(tensor => {
                if (tensor && !tensor.isDisposed) {
                    tensor.dispose();
                }
            });
        }
    }

    /**
     * 主要固有ベクトルの近似計算（数値安定版）
     */
    async computeTopEigenvectors(covariance, inputDim, numVectors) {
        const vectors = [];
        
        for (let k = 0; k < numVectors; k++) {
            // ランダム初期ベクトル
            let v = tf.randomNormal([inputDim, 1], 0, 0.1);
            
            // 既存のベクトルと直交化
            for (const existingV of vectors) {
                const dot = existingV.transpose().matMul(v);
                v = v.sub(existingV.mul(dot));
            }
            
            // Power iteration（収束チェック付き）
            let prevNorm = 0;
            for (let i = 0; i < 20; i++) {
                v = covariance.matMul(v);
                
                // 既存のベクトルと再直交化
                for (const existingV of vectors) {
                    const dot = existingV.transpose().matMul(v);
                    v = v.sub(existingV.mul(dot));
                }
                
                // ノルム計算（null チェック付き）
                const normTensor = tf.norm(v);
                const normData = await normTensor.data();
                normTensor.dispose();
                
                if (!normData || normData.length === 0) {
                    console.warn(`固有ベクトル${k+1}のノルム計算に失敗しました`);
                    break;
                }
                
                const norm = normData[0];
                if (norm < 1e-10) {
                    console.warn(`固有ベクトル${k+1}の計算でゼロベクトルになりました`);
                    break;
                }
                
                // 正規化（メモリリーク対策）
                const normTensorForDiv = tf.norm(v);
                const oldV = v;
                v = v.div(normTensorForDiv);
                normTensorForDiv.dispose();
                // 古いテンソルの安全な破棄
                if (oldV && typeof oldV.dispose === 'function' && !oldV.isDisposed) {
                    oldV.dispose();
                }
                
                // 収束判定
                if (Math.abs(norm - prevNorm) < 1e-6) {
                    console.log(`固有ベクトル${k+1}が${i+1}回で収束`);
                    break;
                }
                prevNorm = norm;
            }
            
            vectors.push(v);
        }
        
        return tf.concat(vectors, 1);
    }

    /**
     * チャートの描画
     */
    renderChart(coords) {
        const ctx = document.getElementById('visualizationCanvas');
        
        // 既存チャートの確実な破棄
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        // Chart.jsのグローバルレジストリから古いインスタンスを削除
        if (Chart.getChart && Chart.getChart('visualizationCanvas')) {
            Chart.getChart('visualizationCanvas').destroy();
        }
        
        // Canvasのコンテキストをリセット
        if (ctx && ctx.getContext) {
            const context = ctx.getContext('2d');
            context.clearRect(0, 0, ctx.width, ctx.height);
        }

        // データポイントの準備
        const datasets = this.prepareDatasets(coords);

        console.log(`🏷️ datalabels設定: display=${this.showLabels}, fontSize=${this.getResponsiveFontSize()}`);

        this.chart = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                onClick: (_, elements) => {
                    if (elements.length > 0) {
                        this.handlePointClick(elements[0]);
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: this.getResponsiveAspectRatio(),
                layout: {
                    padding: this.getResponsivePadding()
                },
                plugins: {
                    title: {
                        display: true,
                        text: `🌌Lyric Constellation Map (t-SNE)`,
                        font: { size: 16 }
                    },
                    legend: {
                        display: true, // 常時表示
                        position: window.innerWidth <= 768 ? 'bottom' : 'right',
                        maxWidth: window.innerWidth <= 768 ? undefined : 200,
                        maxHeight: window.innerWidth <= 768 ? 150 : undefined
                    },
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                const datasetIndex = context[0].datasetIndex;
                                const dataIndex = context[0].dataIndex;
                                const dataset = this.chart.data.datasets[datasetIndex];
                                return dataset.data[dataIndex].songData.title;
                            },
                            label: () => {
                                return ''; // 追加情報は表示しない
                            }
                        }
                    },
                    datalabels: this.getSafeDatalabelsConfig()
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: `t-SNE Component 1`
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: `t-SNE Component 2`
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                elements: {
                    point: {
                        radius: this.getResponsivePointRadius(),
                        hoverRadius: this.getResponsivePointRadius() + 4
                    }
                }
            }
        });
    }

    /**
     * データセットの準備
     */
    prepareDatasets(coords) {
        // 常にジャンル別データセットを使用
        return this.prepareGenreBasedDatasets(coords);
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
                pointRadius: this.getResponsivePointRadius(),
                pointHoverRadius: this.getResponsivePointRadius() + 4
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
            pointRadius: this.getResponsivePointRadius(),
            pointHoverRadius: this.getResponsivePointRadius() + 4
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
            method: 't-SNE',
            genres: [...new Set(this.currentData.map(s => s.genre))].length,
            showLabels: this.showLabels
        };

        infoEl.innerHTML = `
            <strong>可視化情報:</strong><br>
            楽曲数: ${stats.songCount}曲 | 
            手法: ${stats.method} | 
            ジャンル数: ${stats.genres} | 
            ラベル表示: ${stats.showLabels ? 'ON' : 'OFF'}
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
     * プロットポイントクリック処理
     */
    handlePointClick(element) {
        // チャートの存在確認
        if (!this.chart || !this.chart.data || !this.chart.data.datasets) {
            console.warn('チャートデータが利用できません');
            return;
        }
        
        const datasetIndex = element.datasetIndex;
        const dataIndex = element.index;
        
        // 範囲チェック
        if (datasetIndex >= this.chart.data.datasets.length) {
            console.warn('無効なデータセットインデックス:', datasetIndex);
            return;
        }
        
        const dataset = this.chart.data.datasets[datasetIndex];
        if (!dataset.data || dataIndex >= dataset.data.length) {
            console.warn('無効なデータインデックス:', dataIndex);
            return;
        }
        
        const songData = dataset.data[dataIndex].songData;
        if (!songData) {
            console.warn('楽曲データが見つかりません');
            return;
        }
        
        console.log(`🎵 可視化からの楽曲選択: ${songData.title} (ID: ${songData.id})`);
        
        // embeddingを除外した楽曲データのみを保存（TensorFlow.jsオブジェクト除去）
        const cleanCurrentData = this.currentData.map(song => ({
            id: song.id,
            title: song.title,
            genre: song.genre,
            artist_group: song.artist_group
            // embedding プロパティは除外
        }));
        
        // 可視化から類似楽曲への遷移フラグを設定
        sessionStorage.setItem('visualizationToSimilar', 'true');
        sessionStorage.setItem('selectedSongsForVisualization', JSON.stringify(cleanCurrentData));
        
        // 類似楽曲ビューに遷移
        if (window.ui) {
            window.ui.showSimilarView(songData);
        }
    }

    /**
     * データラベル設定の取得
     */
    getDatalabelsConfig() {
        // プラグインが利用可能な場合
        if (typeof ChartDataLabels !== 'undefined') {
            return {
                display: this.showLabels,
                color: '#333',
                font: {
                    size: this.getResponsiveFontSize(),
                    weight: 'bold'
                },
                formatter: (_, context) => {
                    const datasetIndex = context.datasetIndex;
                    const dataIndex = context.dataIndex;
                    const dataset = this.chart.data.datasets[datasetIndex];
                    return dataset.data[dataIndex].songData.title;
                },
                align: 'top',
                offset: 8,
                clip: false
            };
        }
        
        // プラグインが利用できない場合は無効化
        console.warn('⚠️ datalabelsプラグインが利用できません');
        return {
            display: false
        };
    }

    /**
     * 安全なデータラベル設定の取得（エラー回避版）
     */
    getSafeDatalabelsConfig() {
        // プラグインが利用可能な場合
        if (typeof ChartDataLabels !== 'undefined') {
            return {
                display: this.showLabels,
                color: '#333',
                font: {
                    size: this.getResponsiveFontSize(),
                    weight: 'bold'
                },
                formatter: (_, context) => {
                    try {
                        // 安全なデータアクセス
                        const datasetIndex = context.datasetIndex;
                        const dataIndex = context.dataIndex;
                        
                        // チャートの存在確認
                        if (!this.chart || !this.chart.data || !this.chart.data.datasets) {
                            return '';
                        }
                        
                        const dataset = this.chart.data.datasets[datasetIndex];
                        if (!dataset || !dataset.data || !dataset.data[dataIndex]) {
                            return '';
                        }
                        
                        const songData = dataset.data[dataIndex].songData;
                        return songData ? songData.title : '';
                        
                    } catch (error) {
                        console.warn('⚠️ datalabels formatter エラー:', error);
                        return ''; // エラー時は空文字を返す
                    }
                },
                align: 'top',
                offset: 8,
                clip: false
            };
        }
        
        // プラグインが利用できない場合は無効化
        console.warn('⚠️ datalabelsプラグインが利用できません');
        return {
            display: false
        };
    }

    /**
     * レスポンシブアスペクト比の取得
     */
    getResponsiveAspectRatio() {
        const width = window.innerWidth;
        if (width <= 480) {
            return 0.8; // 縦長気味（狭いスマホ）
        } else if (width <= 768) {
            return 1.0; // 正方形に近い（タブレット・横向きスマホ）
        } else if (width <= 1024) {
            return 1.2; // やや横長（小さめPC）
        } else {
            return 1.5; // 横長（デスクトップ）
        }
    }

    /**
     * レスポンシブパディングの取得
     */
    getResponsivePadding() {
        const width = window.innerWidth;
        if (width <= 480) {
            return { top: 10, right: 10, bottom: 10, left: 10 };
        } else if (width <= 768) {
            return { top: 15, right: 15, bottom: 15, left: 15 };
        } else {
            return { top: 20, right: 20, bottom: 20, left: 20 };
        }
    }

    /**
     * レスポンシブフォントサイズの取得
     */
    getResponsiveFontSize() {
        const width = window.innerWidth;
        if (width <= 480) {
            return 8; // 小さいフォント（狭いスマホ）
        } else if (width <= 768) {
            return 9; // 中程度フォント（タブレット・横向きスマホ）
        } else {
            return 10; // 標準フォント（デスクトップ）
        }
    }

    /**
     * レスポンシブポイント半径の取得
     */
    getResponsivePointRadius() {
        const width = window.innerWidth;
        if (width <= 480) {
            return 4; // 小さめポイント（狭いスマホ）
        } else if (width <= 768) {
            return 5; // 中程度ポイント（タブレット・横向きスマホ）
        } else {
            return 6; // 標準ポイント（デスクトップ）
        }
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