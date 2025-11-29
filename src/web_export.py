#!/usr/bin/env python3
import csv
import json
import os
import numpy as np
from typing import List, Dict
from similarity_search import SongSimilaritySearch

class WebExporter:
    """GitHub Pages用のデータエクスポートクラス"""
    
    def __init__(self, output_dir: str = 'docs/data'):
        """
        初期化
        
        Args:
            output_dir: 出力ディレクトリ
        """
        self.output_dir = output_dir
        self.songs_csv_path = 'db/songs.csv'
        self.search_system = None
        
        # メンバー一覧の定義
        self.members = [
            '日野下花帆', '乙宗梢', '村野さやか', '夕霧綴理', 
            '大沢瑠璃乃', '藤島慈', '百生吟子', '徒町小鈴', 
            '安養寺姫芽', 'セラス 柳田 リリエンフェルト', '桂城泉'
        ]
        
    def export_all(self):
        """すべてのデータをエクスポート"""
        print("🚀 GitHub Pages用データエクスポート開始")
        
        # 出力ディレクトリ作成
        os.makedirs(self.output_dir, exist_ok=True)
        
        # 類似度検索システム初期化
        self.search_system = SongSimilaritySearch()
        
        # 各データをエクスポート
        self.export_songs()
        self.export_similarities()
        self.export_embeddings_for_visualization()
        self.export_metadata()
        
        print("✅ エクスポート完了")
    
    def parse_members_from_artists(self, artists_field: str) -> List[str]:
        """
        artistsフィールドからメンバー名を抽出
        
        Args:
            artists_field: アーティストフィールド（/区切り）
            
        Returns:
            抽出されたメンバー名のリスト
        """
        if not artists_field:
            return []
        
        members_found = []
        
        # /で分割してそれぞれのアーティスト名をチェック
        artist_parts = artists_field.split('/')
        
        for part in artist_parts:
            part = part.strip()
            # 各メンバー名が含まれているかチェック
            for member in self.members:
                if member in part:
                    members_found.append(member)
                    break  # 同じpartから複数のメンバーを抽出しない
        
        return list(set(members_found))  # 重複を除去
    
    def export_songs(self):
        """楽曲データをJSON形式でエクスポート（lyricフィールド除外）"""
        print("📝 楽曲データをエクスポート中...")
        
        songs_data = []
        
        try:
            with open(self.songs_csv_path, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    # メンバー情報を抽出
                    members = self.parse_members_from_artists(row['artists'])
                    
                    # lyricフィールドを除外、membersフィールドを追加
                    song_data = {
                        'id': int(row['id']),
                        'title': row['title'],
                        'genre': row['genre'],
                        'artist_group': row['artist_group'],
                        'artists': row['artists'],
                        'members': members
                    }
                    songs_data.append(song_data)
            
            # JSON出力
            output_path = os.path.join(self.output_dir, 'songs.json')
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump({'songs': songs_data}, f, ensure_ascii=False, indent=2)
            
            print(f"✅ 楽曲データエクスポート完了: {len(songs_data)}件 → {output_path}")
            
        except Exception as e:
            print(f"❌ 楽曲データエクスポートエラー: {e}")
    
    def export_similarities(self, top_k: int = 10):
        """事前計算された類似度データをエクスポート"""
        print("🔍 類似度データをエクスポート中...")
        
        if not self.search_system:
            print("❌ 類似度検索システムが初期化されていません")
            return
        
        similarities_data = {}
        songs = self.search_system.songs
        
        try:
            for i, song in enumerate(songs):
                song_id = int(song['id'])
                print(f"進捗: {i+1}/{len(songs)} - ID {song_id}: {song['title']}")
                
                # 類似楽曲を検索
                similar_songs, base_song = self.search_system.search_by_song_id(
                    song_id, top_k=top_k, exclude_self=True
                )
                
                if similar_songs:
                    similarities_data[str(song_id)] = [
                        {
                            'song_id': int(result['id']),
                            'similarity': round(result['similarity_score'], 4),
                            'rank': result['rank']
                        }
                        for result in similar_songs
                    ]
            
            # JSON出力
            output_path = os.path.join(self.output_dir, 'similarities.json')
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(similarities_data, f, ensure_ascii=False, indent=2)
            
            print(f"✅ 類似度データエクスポート完了: {len(similarities_data)}楽曲 → {output_path}")
            
        except Exception as e:
            print(f"❌ 類似度データエクスポートエラー: {e}")
    
    def export_metadata(self):
        """システムメタデータをエクスポート"""
        print("📊 メタデータをエクスポート中...")
        
        try:
            if self.search_system:
                system_info = self.search_system.get_system_info()
            else:
                system_info = {}
            
            # 楽曲数カウント
            songs_count = 0
            if os.path.exists(self.songs_csv_path):
                with open(self.songs_csv_path, 'r', encoding='utf-8') as csvfile:
                    reader = csv.DictReader(csvfile)
                    songs_count = sum(1 for _ in reader)
            
            metadata = {
                'export_info': {
                    'version': '1.0',
                    'description': 'ベクトル検索システム - Web版',
                    'copyright_notice': '歌詞データは著作権保護のため除外されています'
                },
                'system_info': system_info,
                'statistics': {
                    'total_songs': songs_count,
                    'data_files': {
                        'songs': os.path.exists(os.path.join(self.output_dir, 'songs.json')),
                        'similarities': os.path.exists(os.path.join(self.output_dir, 'similarities.json'))
                    }
                }
            }
            
            # JSON出力
            output_path = os.path.join(self.output_dir, 'metadata.json')
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            print(f"✅ メタデータエクスポート完了 → {output_path}")
            
        except Exception as e:
            print(f"❌ メタデータエクスポートエラー: {e}")
    
    def export_embeddings_for_visualization(self):
        """可視化用のembeddingデータをエクスポート"""
        print("🎨 可視化用embeddingデータをエクスポート中...")
        
        try:
            if not self.search_system or self.search_system.embeddings is None:
                print("❌ embeddingデータが利用できません")
                return
            
            # 楽曲IDとembeddingのマッピングを作成
            embedding_data = {}
            songs = self.search_system.songs
            embeddings = self.search_system.embeddings
            metadata = self.search_system.metadata
            
            for song in songs:
                song_id = str(song['id'])
                if song_id in metadata:
                    embedding_index = metadata[song_id]['embedding_index']
                    if embedding_index < len(embeddings):
                        # embeddingを配列として格納（JSON形式）
                        # メンバー情報も含める
                        members = self.parse_members_from_artists(song['artists'])
                        embedding_data[song_id] = {
                            'embedding': embeddings[embedding_index].tolist(),
                            'title': song['title'],
                            'genre': song['genre'],
                            'artist_group': song['artist_group'],
                            'artists': song['artists'],
                            'members': members
                        }
            
            # JSON出力
            output_path = os.path.join(self.output_dir, 'embeddings.json')
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(embedding_data, f, ensure_ascii=False)
            
            print(f"✅ 可視化用embeddingデータエクスポート完了: {len(embedding_data)}楽曲 → {output_path}")
            
        except Exception as e:
            print(f"❌ 可視化用embeddingデータエクスポートエラー: {e}")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='GitHub Pages用データエクスポート')
    parser.add_argument('--output-dir', '-o', default='docs/data', 
                       help='出力ディレクトリ (デフォルト: docs/data)')
    parser.add_argument('--top-k', '-k', type=int, default=10,
                       help='各楽曲の類似楽曲数 (デフォルト: 10)')
    
    args = parser.parse_args()
    
    exporter = WebExporter(args.output_dir)
    exporter.export_all()

if __name__ == '__main__':
    main()