/**
 * アプリケーション設定 - アーティストとメンバーの表示順序
 */
window.AppConfig = {
    /**
     * アーティスト表示順序
     */
    artistOrder: [
        '蓮ノ空女学院スクールアイドルクラブ',
        'スリーズブーケ',
        'DOLLCHESTRA',
        'みらくらぱーく!',
        'Edel Note',
        'スリーズブーケ＆DOLLCHESTRA＆みらくらぱーく！',
        'シャッフルユニット',
        'ソロ・その他'
    ],

    /**
     * メンバー表示順序
     */
    memberOrder: [
        '日野下花帆', '乙宗梢', '村野さやか', '夕霧綴理', 
        '大沢瑠璃乃', '藤島慈', '百生吟子', '徒町小鈴', 
        '安養寺姫芽', 'セラス 柳田 リリエンフェルト', '桂城泉'
    ],

    /**
     * アーティスト別の色設定
     */
    artistColors: {
        'Edel Note': '#d4d4d4',
        '蓮ノ空女学院スクールアイドルクラブ': '#ffc0cb',
        'スリーズブーケ': '#e95464',
        'みらくらぱーく!': '#ffff00',
        'DOLLCHESTRA': '#0000ff',
        'スリーズブーケ＆DOLLCHESTRA＆みらくらぱーく！': '#ff8c00',
        'かほめぐ♡じぇらーと': '#ff69b4',
        '蓮ノ休日': '#98fb98',
        'るりのとゆかいなつづりたち': '#dda0dd',
        'Ruri&To': '#ff1a94',
        'PRINCEε>ε>': '#9d8de2',
        'ソロ・その他': '#808080',
        '藤島慈(CV.月音こな)': '#C8C2C6',
        '夕霧綴理(CV.佐々木琴子)': '#BA2636',
        '乙宗梢(CV.花宮初奈)': '#68BE8D'
    },

    /**
     * アーティストグループのマッピング
     * 指定されたアーティストを統合グループにマッピング
     */
    artistGroupMapping: {
        'かほめぐ♡じぇらーと': 'シャッフルユニット',
        '蓮ノ休日': 'シャッフルユニット',
        'るりのとゆかいなつづりたち': 'シャッフルユニット',
        'Ruri&To': 'シャッフルユニット',
        'PRINCEε>ε>': 'シャッフルユニット'
    },

    /**
     * 指定順序でソートするヘルパー関数
     * @param {Object} countMap - {name: items} 形式のオブジェクト
     * @param {Array} order - 優先順序の配列
     * @returns {Array} - [[name, items], ...] 形式のソート済み配列
     */
    sortByOrder: function(countMap, order) {
        const sorted = [];
        
        // 指定順序のアイテムを追加
        order.forEach(item => {
            if (countMap[item]) {
                sorted.push([item, countMap[item]]);
            }
        });
        
        // 指定順序にないアイテムを最後に追加
        Object.entries(countMap).forEach(([item, data]) => {
            if (!order.includes(item)) {
                sorted.push([item, data]);
            }
        });
        
        return sorted;
    },

    /**
     * アーティストグループのマッピングを適用
     * @param {string} artistGroup - 元のアーティストグループ名
     * @returns {string} - マッピング後のアーティストグループ名
     */
    getMappedArtistGroup: function(artistGroup) {
        const trimmedGroup = artistGroup?.trim() || 'ソロ・その他';
        return this.artistGroupMapping[trimmedGroup] || trimmedGroup;
    }
};