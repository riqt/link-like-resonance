/**
 * 可視化管理 - 類似度ベースForce-Directed Layout
 */

// Chart.js datalabelsプラグインを登録（読み込み済みかチェック）
if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
    console.log('✅ Chart.js datalabelsプラグインを登録しました');
} else {
    console.warn('⚠️ ChartDataLabelsプラグインが見つかりません。代替手段を使用します');
}

// Chart.js zoomプラグインを登録
if (typeof window.zoomPlugin !== 'undefined') {
    Chart.register(window.zoomPlugin);
    console.log('✅ Chart.js zoomプラグインを登録しました');
} else if (typeof ChartZoom !== 'undefined') {
    Chart.register(ChartZoom);
    console.log('✅ Chart.js zoomプラグインを登録しました');
} else {
    console.warn('⚠️ Chart.js zoomプラグインが見つかりません');
}

class VisualizationManager {
    constructor() {
        this.chart = null;
        this.currentData = null;
        this.currentMethod = 'force-directed';
        this.showLabels = true; // デフォルトオン
        this.showLegend = false; // デフォルトオフ
        this.colorByGenre = true; // 常時オン（変更不可）
        this.genreColors = this.generateGenreColors();
        this.cachedVisualization = null; // キャッシュされた可視化結果
        this.similaritiesData = null; // 類似度データのキャッシュ
        this.forceLayoutCache = new Map(); // Force-Directed Layoutのキャッシュ
        this.isPanning = false; // パン操作中フラグ
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
        
        // zoomプラグインが利用可能かチェック
        if (typeof ChartZoom !== 'undefined' || typeof window.zoomPlugin !== 'undefined') {
            console.log('✅ Chart.js zoomプラグインが利用可能です');
        } else {
            console.error('❌ Chart.js zoomプラグインが読み込まれていません');
        }
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        const showLabelsCheck = document.getElementById('showLabelsCheck');
        const showLegendCheck = document.getElementById('showLegendCheck');
        const resetZoomBtn = document.getElementById('resetZoomBtn');
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const panUpBtn = document.getElementById('panUpBtn');
        const panDownBtn = document.getElementById('panDownBtn');
        const panLeftBtn = document.getElementById('panLeftBtn');
        const panRightBtn = document.getElementById('panRightBtn');
        const backBtn = document.getElementById('backToSongsBtn');

        // 楽曲名表示はデフォルトオン
        showLabelsCheck.checked = true;
        showLabelsCheck.addEventListener('change', (e) => {
            this.showLabels = e.target.checked;
            if (this.chart) {
                this.chart.update();
            }
        });

        // 凡例表示はデフォルトオフ
        showLegendCheck.checked = false;
        showLegendCheck.addEventListener('change', (e) => {
            this.showLegend = e.target.checked;
            this.updateLegendDisplay();
        });

        resetZoomBtn.addEventListener('click', () => {
            this.resetZoom();
        });

        zoomInBtn.addEventListener('click', () => {
            this.zoomIn();
        });

        zoomOutBtn.addEventListener('click', () => {
            this.zoomOut();
        });

        panUpBtn.addEventListener('click', () => {
            this.panUp();
        });

        panDownBtn.addEventListener('click', () => {
            this.panDown();
        });

        panLeftBtn.addEventListener('click', () => {
            this.panLeft();
        });

        panRightBtn.addEventListener('click', () => {
            this.panRight();
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

            // 類似度データの読み込み
            if (!this.similaritiesData) {
                this.similaritiesData = await this.loadSimilaritiesData();
                if (!this.similaritiesData) {
                    throw new Error('類似度データの読み込みに失敗しました');
                }
            }

            this.currentData = selectedSongs;

            // キャッシュキーを生成
            const cacheKey = this.generateCacheKey(selectedSongs);
            
            // キャッシュから取得を試行
            if (this.forceLayoutCache.has(cacheKey)) {
                console.log('💾 キャッシュからレイアウトを取得');
                const cachedLayout = this.forceLayoutCache.get(cacheKey);
                this.renderVisualization(cachedLayout);
            } else {
                // Force-Directed Layoutで可視化実行
                console.log('🔄 Force-Directed Layoutを計算中...');
                const layout = await this.performForceDirectedLayout(selectedSongs);
                
                // キャッシュに保存
                this.forceLayoutCache.set(cacheKey, layout);
                this.renderVisualization(layout);
            }

            this.updateVisualizationInfo();

        } catch (error) {
            console.error('❌ 可視化エラー:', error);
            this.showError(`可視化に失敗しました: ${error.message}`);
        }
    }

    /**
     * 類似度データの読み込み
     */
    async loadSimilaritiesData() {
        try {
            const response = await fetch('data/similarities.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            console.log('✅ 類似度データを読み込みました');
            return await response.json();
        } catch (error) {
            console.error('類似度データ読み込みエラー:', error);
            return null;
        }
    }

    /**
     * キャッシュキーの生成
     */
    generateCacheKey(selectedSongs) {
        const sortedIds = selectedSongs.map(song => song.id).sort((a, b) => a - b);
        return `force_layout_${sortedIds.join('_')}`;
    }

    /**
     * 類似度の取得
     */
    getSimilarity(songId1, songId2) {
        if (songId1 === songId2) return 1.0;
        
        const id1 = String(songId1);
        const id2 = String(songId2);
        
        // similarities.jsonから類似度を検索
        if (this.similaritiesData[id1]) {
            const similarity = this.similaritiesData[id1].find(item => item.song_id === parseInt(id2));
            if (similarity) return similarity.similarity;
        }
        
        if (this.similaritiesData[id2]) {
            const similarity = this.similaritiesData[id2].find(item => item.song_id === parseInt(id1));
            if (similarity) return similarity.similarity;
        }
        
        return 0.1; // デフォルトの低い類似度
    }

    /**
     * 決定的シードによる疑似乱数生成器
     */
    seededRandom(seed) {
        let state = seed;
        return function() {
            state = (state * 9301 + 49297) % 233280;
            return state / 233280;
        };
    }

    /**
     * 決定的な初期配置の生成（ランダム分布）
     */
    generateDeterministicLayout(selectedSongs, width, height) {
        // 楽曲IDをソートして決定的なシードを作成
        const songIds = selectedSongs.map(s => s.id).sort((a, b) => a - b);
        const seed = songIds.reduce((acc, id) => acc + id, 0) % 1000000;
        const random = this.seededRandom(seed);
        
        // 画面全体にランダム配置（決定的）
        const margin = 100;
        
        return selectedSongs.map(() => {
            return {
                x: margin + random() * (width - margin * 2),
                y: margin + random() * (height - margin * 2),
                vx: 0,
                vy: 0
            };
        });
    }

    /**
     * Force-Directed Layoutの実行（改良版）
     */
    async performForceDirectedLayout(selectedSongs) {
        const width = 1200;
        const height = 1000;
        const iterations = 2000; // 元に戻す
        const initialTemp = 1.0; // 元に戻す
        const finalTemp = 0.01; // 元に戻す
        
        // 決定的初期配置
        const positions = this.generateDeterministicLayout(selectedSongs, width, height);
        
        // 類似度の正規化とスケーリング用の統計情報
        let minSim = 1.0, maxSim = 0.0;
        const similarities = new Map();
        const relativeSimilarities = new Map();
        
        // 全類似度を事前計算して統計取得
        for (let i = 0; i < selectedSongs.length; i++) {
            for (let j = i + 1; j < selectedSongs.length; j++) {
                const sim = this.getSimilarity(selectedSongs[i].id, selectedSongs[j].id);
                similarities.set(`${i}-${j}`, sim);
                minSim = Math.min(minSim, sim);
                maxSim = Math.max(maxSim, sim);
            }
        }
        
        // 各楽曲の相対的類似度を計算
        for (let i = 0; i < selectedSongs.length; i++) {
            const songSimilarities = [];
            for (let j = 0; j < selectedSongs.length; j++) {
                if (i !== j) {
                    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
                    songSimilarities.push(similarities.get(key));
                }
            }
            // ソートして相対ランクを計算
            songSimilarities.sort((a, b) => b - a);
            
            for (let j = 0; j < selectedSongs.length; j++) {
                if (i !== j) {
                    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
                    const absSim = similarities.get(key);
                    const rank = songSimilarities.indexOf(absSim);
                    const relativeScore = 1 - (rank / (songSimilarities.length - 1)); // 0-1のスコア
                    relativeSimilarities.set(`${i}-${j}`, relativeScore);
                }
            }
        }
        
        console.log(`📊 類似度範囲: ${minSim.toFixed(3)} - ${maxSim.toFixed(3)}`);
        
        // シミュレーション実行
        for (let iter = 0; iter < iterations; iter++) {
            // 元の3段階温度制御に戻す
            const progress = iter / iterations;
            let temperature;
            
            if (progress < 0.3) {
                // 初期段階: 高温で大きな移動
                temperature = initialTemp * (1 - progress / 0.3 * 0.5);
            } else if (progress < 0.7) {
                // 中間段階: 適度な冷却
                const localProgress = (progress - 0.3) / 0.4;
                temperature = initialTemp * 0.5 * (1 - localProgress * 0.8);
            } else {
                // 終盤: 緩やかな微調整
                const localProgress = (progress - 0.7) / 0.3;
                temperature = initialTemp * 0.1 * Math.exp(-localProgress * 3);
            }
            
            // 力をリセット
            positions.forEach(pos => {
                pos.vx = 0;
                pos.vy = 0;
            });
            
            // 全ペアについて力を計算（絶対+相対類似度最適化）
            for (let i = 0; i < selectedSongs.length; i++) {
                for (let j = i + 1; j < selectedSongs.length; j++) {
                    const absSimilarity = similarities.get(`${i}-${j}`);
                    const relSimilarityI = relativeSimilarities.get(`${i}-${j}`);
                    const relSimilarityJ = relativeSimilarities.get(`${j}-${i}`);
                    const avgRelSimilarity = (relSimilarityI + relSimilarityJ) / 2;
                    
                    // 絶対70% + 相対30%の重み付き類似度
                    const combinedSimilarity = absSimilarity * 0.7 + avgRelSimilarity * 0.3;
                    
                    const dx = positions[j].x - positions[i].x;
                    const dy = positions[j].y - positions[i].y;
                    const currentDistance = Math.sqrt(dx * dx + dy * dy) + 0.1;
                    
                    // 組み合わせ類似度を理想距離に非線形マッピング
                    const simPower = Math.pow(1 - combinedSimilarity, 2); // 2乗で差を拡大
                    const idealDistance = 3 + simPower * 507; // 3px～510px
                    
                    // 距離誤差を計算
                    const distanceError = currentDistance - idealDistance;
                    
                    // 適応的力の計算（組み合わせ類似度を使用）
                    let forceStrength;
                    
                    if (combinedSimilarity > 0.8) {
                        // 高類似度: 強力な引力
                        forceStrength = Math.abs(distanceError) * 0.08 * (1 + combinedSimilarity);
                    } else if (combinedSimilarity > 0.5) {
                        // 中類似度: 標準的な力
                        forceStrength = Math.abs(distanceError) * 0.05;
                    } else {
                        // 低類似度: 強力な反発
                        forceStrength = Math.abs(distanceError) * 0.06 * (2 - combinedSimilarity);
                    }
                    
                    // 距離が大きく離れている場合は力を増強
                    if (Math.abs(distanceError) > 100) {
                        forceStrength *= 1.5;
                    }
                    
                    const force = Math.sign(distanceError) * forceStrength;
                    
                    const fx = (dx / currentDistance) * force;
                    const fy = (dy / currentDistance) * force;
                    
                    // 力を適用（理想距離に向かって移動）
                    positions[i].vx += fx * temperature;
                    positions[i].vy += fy * temperature;
                    positions[j].vx -= fx * temperature;
                    positions[j].vy -= fy * temperature;
                    
                    // 重なり許容（最小限の重なり防止のみ）
                    if (currentDistance < 2) {
                        const antiOverlapForce = 5 / (currentDistance + 1);
                        const fx_overlap = (dx / currentDistance) * antiOverlapForce;
                        const fy_overlap = (dy / currentDistance) * antiOverlapForce;
                        
                        positions[i].vx -= fx_overlap * temperature * 0.3;
                        positions[i].vy -= fy_overlap * temperature * 0.3;
                        positions[j].vx += fx_overlap * temperature * 0.3;
                        positions[j].vy += fy_overlap * temperature * 0.3;
                    }
                }
            }
            
            // 位置更新と制約（元に戻す）
            positions.forEach(pos => {
                // 中心への軽い引力（外周への逃げを防ぐ）
                const centerX = width / 2;
                const centerY = height / 2;
                const centerDx = centerX - pos.x;
                const centerDy = centerY - pos.y;
                const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
                
                if (centerDistance > 200) {
                    const centerForce = (centerDistance - 200) * 0.001;
                    pos.vx += (centerDx / centerDistance) * centerForce * temperature;
                    pos.vy += (centerDy / centerDistance) * centerForce * temperature;
                }
                
                // 速度制限（暴走防止）
                const maxVelocity = 50 * temperature;
                const currentVel = Math.sqrt(pos.vx * pos.vx + pos.vy * pos.vy);
                if (currentVel > maxVelocity) {
                    pos.vx = (pos.vx / currentVel) * maxVelocity;
                    pos.vy = (pos.vy / currentVel) * maxVelocity;
                }
                
                pos.x += pos.vx * temperature;
                pos.y += pos.vy * temperature;
                
                // 適応的摩擦（温度に応じて調整）
                const friction = 0.7 + temperature * 0.2;
                pos.vx *= friction;
                pos.vy *= friction;
                
                // 境界内に制限
                pos.x = Math.max(50, Math.min(width - 50, pos.x));
                pos.y = Math.max(50, Math.min(height - 50, pos.y));
            });
            
            // プログレス表示と収束判定
            if (iter % 50 === 0) {
                // 類似度-距離の誤差を計算
                let totalError = 0;
                let totalVelocity = 0;
                let pairCount = 0;
                
                for (let i = 0; i < selectedSongs.length; i++) {
                    totalVelocity += Math.sqrt(positions[i].vx * positions[i].vx + positions[i].vy * positions[i].vy);
                    
                    for (let j = i + 1; j < selectedSongs.length; j++) {
                        const absSimilarity = similarities.get(`${i}-${j}`);
                        const relSimilarityI = relativeSimilarities.get(`${i}-${j}`);
                        const relSimilarityJ = relativeSimilarities.get(`${j}-${i}`);
                        const avgRelSimilarity = (relSimilarityI + relSimilarityJ) / 2;
                        const combinedSimilarity = absSimilarity * 0.7 + avgRelSimilarity * 0.3;
                        
                        const dx = positions[j].x - positions[i].x;
                        const dy = positions[j].y - positions[i].y;
                        const actualDistance = Math.sqrt(dx * dx + dy * dy);
                        const simPower = Math.pow(1 - combinedSimilarity, 2);
                        const idealDistance = 3 + simPower * 507;
                        
                        totalError += Math.abs(actualDistance - idealDistance);
                        pairCount++;
                    }
                }
                
                const avgError = totalError / pairCount;
                const avgVelocity = totalVelocity / selectedSongs.length;
                
                console.log(`🔄 Force-Directed Layout: ${Math.round((iter / iterations) * 100)}% (温度: ${temperature.toFixed(3)}, 誤差: ${avgError.toFixed(1)}px, 速度: ${avgVelocity.toFixed(2)})`);
                
                // 速度ベースの早期収束判定
                if (iter > 200 && avgVelocity < 0.01) {
                    console.log(`🎯 早期収束達成 (${iter}/${iterations}回)`);
                    break;
                }
                
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        console.log('✅ Force-Directed Layout完了');
        
        // 結果をChart.js形式に変換
        return positions.map((pos, index) => ({
            x: pos.x,
            y: pos.y,
            song: selectedSongs[index]
        }));
    }

    /**
     * 可視化結果の描画
     */
    renderVisualization(layoutData) {
        console.log(`🎨 可視化を描画中... ${layoutData.length}楽曲`);
        
        // プロットの範囲を計算
        const plotBounds = this.calculatePlotBounds(layoutData);
        
        // Chart.js用のデータセット作成
        const datasets = this.createDatasets(layoutData);
        
        // チャートの作成・更新
        this.renderChart(layoutData, plotBounds);
        
        this.cachedVisualization = {
            datasets: datasets,
            rawData: layoutData,
            plotBounds: plotBounds
        };
    }

    /**
     * プロットの境界を計算
     */
    calculatePlotBounds(layoutData) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        layoutData.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        });
        
        // 余白を追加（範囲の10%）
        const xMargin = (maxX - minX) * 0.1;
        const yMargin = (maxY - minY) * 0.1;
        
        return {
            minX: minX - xMargin,
            maxX: maxX + xMargin,
            minY: minY - yMargin,
            maxY: maxY + yMargin
        };
    }

    /**
     * レイアウトデータからChart.js用データセットを作成
     */
    createDatasets(layoutData) {
        const datasetMap = new Map();
        
        layoutData.forEach(item => {
            const genre = item.song.genre || 'その他';
            
            if (!datasetMap.has(genre)) {
                datasetMap.set(genre, []);
            }
            
            datasetMap.get(genre).push({
                x: item.x,
                y: item.y,
                title: item.song.title,
                artist: item.song.artist_group,
                genre: genre,
                songData: item.song
            });
        });
        
        // データセット配列を作成
        const datasets = [];
        const genres = Array.from(datasetMap.keys()).sort();
        
        genres.forEach(genre => {
            const points = datasetMap.get(genre);
            const color = this.genreColors[genre] || this.getRandomColor();
            
            datasets.push({
                label: genre,
                data: points,
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1,
                pointRadius: this.getResponsivePointRadius(),
                pointHoverRadius: this.getResponsivePointRadius() + 4,
                showLine: false
            });
        });
        
        return datasets;
    }

    /**
     * チャートの描画
     */
    renderChart(layoutData, plotBounds) {
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
        const datasets = this.prepareDatasets(layoutData);

        console.log(`🏷️ datalabels設定: display=${this.showLabels}, fontSize=${this.getResponsiveFontSize()}`);

        this.chart = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                onHover: (event, activeElements) => {
                    event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
                },
                onClick: (_, elements) => {
                    // パン操作中でない場合のみポイントクリックを処理
                    if (elements.length > 0 && !this.isPanning) {
                        // 小さな遅延でクリックとドラッグを区別
                        setTimeout(() => {
                            if (!this.isPanning) {
                                this.handlePointClick(elements[0]);
                            }
                        }, 10);
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
                        display: false
                    },
                    legend: {
                        display: this.showLegend,
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
                                const songTitle = dataset.data[dataIndex].songData.title;
                                return `View Links of "${songTitle}"`;
                            },
                            label: () => {
                                return ''; // 追加情報は表示しない
                            }
                        }
                    },
                    datalabels: this.getSafeDatalabelsConfig(),
                    zoom: {
                        limits: {
                            x: {min: -1000, max: 1000},
                            y: {min: -1000, max: 1000}
                        },
                        pan: {
                            enabled: true,
                            mode: 'xy',
                            modifierKey: null, // 修飾キー不要
                            onPanStart: () => {
                                this.isPanning = true;
                                return true;
                            },
                            onPanComplete: () => {
                                setTimeout(() => {
                                    this.isPanning = false;
                                }, 50);
                                return true;
                            }
                        },
                        zoom: {
                            wheel: {
                                enabled: true,
                                speed: 0.1
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'xy'
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: false
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        min: plotBounds.minX,
                        max: plotBounds.maxX
                    },
                    y: {
                        title: {
                            display: false
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        min: plotBounds.minY,
                        max: plotBounds.maxY
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
    prepareDatasets(layoutData) {
        // 常にジャンル別データセットを使用
        return this.prepareGenreBasedDatasets(layoutData);
    }

    /**
     * ジャンル別データセット
     */
    prepareGenreBasedDatasets(layoutData) {
        const artistGroups = {};

        layoutData.forEach((item) => {
            // 散布図では元のアーティスト名を使用（マッピングしない）
            let artist;
            const originalArtist = item.song.artist_group?.trim() || '';
            if (originalArtist) {
                artist = originalArtist;
            } else if (item.song.members && item.song.members.length === 1) {
                // ソロ楽曲で1人の場合はそのメンバー名を使用
                artist = item.song.members[0];
            } else {
                artist = 'ソロ・その他';
            }
            
            if (!artistGroups[artist]) {
                artistGroups[artist] = [];
            }
            artistGroups[artist].push({
                x: item.x,
                y: item.y,
                songData: item.song
            });
        });

        // 設定ファイルの順序でアーティストをソート
        const sortedArtists = window.AppConfig.sortByOrder(artistGroups, window.AppConfig.artistOrder);

        return sortedArtists.map(([artist, points]) => {
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
        // 設定ファイルの色設定を使用
        return { ...window.AppConfig.artistColors };
    }

    /**
     * 可視化情報の更新
     */
    updateVisualizationInfo() {
        const infoEl = document.getElementById('visualizationInfo');
        if (!infoEl) return;

        const stats = {
            songCount: this.currentData.length,
            method: 'Force-Directed Layout',
            genres: [...new Set(this.currentData.map(s => s.genre))].length,
            showLabels: this.showLabels
        };

        infoEl.innerHTML = `
            <strong>Information:</strong><br>
            Songs: ${stats.songCount}曲 | 
            Method: ${stats.method} | 
            Labels: ${stats.showLabels ? 'ON' : 'OFF'}
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
                        // contextから直接データを取得
                        const datasetIndex = context.datasetIndex;
                        const dataIndex = context.dataIndex;
                        const chart = context.chart;
                        
                        if (!chart || !chart.data || !chart.data.datasets) {
                            return '';
                        }
                        
                        const dataset = chart.data.datasets[datasetIndex];
                        if (!dataset || !dataset.data || !dataset.data[dataIndex]) {
                            return '';
                        }
                        
                        const point = dataset.data[dataIndex];
                        return point && point.songData ? point.songData.title : '';
                        
                    } catch (error) {
                        console.warn('⚠️ datalabels formatter エラー:', error);
                        return ''; // エラー時は空文字を返す
                    }
                },
                align: 'top',
                offset: 8,
                clip: true,
                backgroundColor: 'rgba(255, 255, 255, 0.8)', // 背景を少し透明な白に
                borderColor: '#ccc',
                borderWidth: 1,
                borderRadius: 4,
                padding: 2
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
     * 凡例表示の更新
     */
    updateLegendDisplay() {
        if (this.chart && this.chart.options) {
            this.chart.options.plugins.legend.display = this.showLegend;
            this.chart.update('none'); // アニメーションなしで即座に更新
        }
    }

    /**
     * ズームのリセット
     */
    resetZoom() {
        if (this.chart && this.chart.resetZoom) {
            this.chart.resetZoom();
            console.log('🔄 ズームをリセットしました');
        } else {
            console.warn('⚠️ ズームプラグインが利用できません');
        }
    }

    /**
     * ズームイン
     */
    zoomIn() {
        if (this.chart && this.chart.zoom) {
            this.chart.zoom(1.2);
            console.log('🔍 ズームインしました');
        } else {
            console.warn('⚠️ ズームプラグインが利用できません');
        }
    }

    /**
     * ズームアウト
     */
    zoomOut() {
        if (this.chart && this.chart.zoom) {
            this.chart.zoom(0.8);
            console.log('🔍 ズームアウトしました');
        } else {
            console.warn('⚠️ ズームプラグインが利用できません');
        }
    }

    /**
     * 上方向にパン
     */
    panUp() {
        if (this.chart && this.chart.pan) {
            this.chart.pan({x: 0, y: 50});
            console.log('⬆️ 上方向にパンしました');
        } else {
            console.warn('⚠️ パン機能が利用できません');
        }
    }

    /**
     * 下方向にパン
     */
    panDown() {
        if (this.chart && this.chart.pan) {
            this.chart.pan({x: 0, y: -50});
            console.log('⬇️ 下方向にパンしました');
        } else {
            console.warn('⚠️ パン機能が利用できません');
        }
    }

    /**
     * 左方向にパン
     */
    panLeft() {
        if (this.chart && this.chart.pan) {
            this.chart.pan({x: 50, y: 0});
            console.log('⬅️ 左方向にパンしました');
        } else {
            console.warn('⚠️ パン機能が利用できません');
        }
    }

    /**
     * 右方向にパン
     */
    panRight() {
        if (this.chart && this.chart.pan) {
            this.chart.pan({x: -50, y: 0});
            console.log('➡️ 右方向にパンしました');
        } else {
            console.warn('⚠️ パン機能が利用できません');
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
        this.cachedVisualization = null;
    }
}

// グローバルインスタンス
window.visualizationManager = new VisualizationManager();