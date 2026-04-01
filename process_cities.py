#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Geoloniaの住所データから市区町村データを抽出してJSONを生成
"""

import csv
import json
from collections import defaultdict

# ========================================
# 市区町村名の修正マップ
# ========================================
CITY_NAME_CORRECTIONS = {
    # 浜松市の行政区再編（2024年1月1日施行）
    # 7区 → 3区に再編
    '浜松市中区': '浜松市中央区',
    '浜松市東区': '浜松市中央区',
    '浜松市西区': '浜松市中央区',
    '浜松市南区': '浜松市中央区',
    '浜松市北区': '浜松市浜名区',
    '浜松市浜北区': '浜松市浜名区',
    # 天竜区は変更なし
}

def correct_city_name(pref_name, city_name):
    """
    都道府県名と市区町村名から正しい市区町村名を返す
    """
    # 浜松市の区は特別処理
    if pref_name == '静岡県' and city_name.startswith('浜松市'):
        if city_name in CITY_NAME_CORRECTIONS:
            return CITY_NAME_CORRECTIONS[city_name]

    return city_name

def get_environment_type(city_name):
    """
    市区町村名から環境タイプを判定
    - urban: 都市部（市、政令指定都市の区）
    - nature: 大自然（町、村）
    - any: その他
    """
    # 政令指定都市の区（例：横浜市中区）
    if '市' in city_name and '区' in city_name:
        return 'urban'
    # 市（例：札幌市、松本市）
    elif city_name.endswith('市'):
        return 'urban'
    # 町（例：軽井沢町）
    elif city_name.endswith('町'):
        return 'nature'
    # 村（例：白川村）
    elif city_name.endswith('村'):
        return 'nature'
    # その他
    else:
        return 'any'

# 既存の都道府県データを読み込んで都道府県コードとprefIdのマッピングを作成
with open('data/prefectures.json', 'r', encoding='utf-8') as f:
    prefectures = json.load(f)

# 都道府県名からprefIdへのマッピング
pref_name_to_id = {pref['name']: pref['id'] for pref in prefectures}

# 市区町村ごとにデータを集約
cities_dict = defaultdict(lambda: {
    'coords': [],
    'pref_code': None,
    'pref_name': None,
    'city_code': None,
    'city_name': None
})

print("CSVファイルを読み込み中...")
with open('latest.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        pref_code = row['都道府県コード']
        pref_name = row['都道府県名']
        city_code = row['市区町村コード']
        city_name = row['市区町村名']

        # 市区町村名を修正
        city_name = correct_city_name(pref_name, city_name)

        # 緯度経度が空の場合はスキップ
        if not row['緯度'] or not row['経度']:
            continue

        try:
            lat = float(row['緯度'])
            lng = float(row['経度'])
        except ValueError:
            continue

        # 修正後の市区町村名をキーとして集約（同じ名前にマージされる）
        key = f"{pref_code}_{city_name}"
        cities_dict[key]['pref_code'] = pref_code
        cities_dict[key]['pref_name'] = pref_name
        cities_dict[key]['city_code'] = city_code
        cities_dict[key]['city_name'] = city_name
        cities_dict[key]['coords'].append((lat, lng))

print(f"総市区町村数: {len(cities_dict)}")

# 各市区町村の代表座標を計算（平均値）
cities_list = []
city_id = 1

for city_code, city_data in sorted(cities_dict.items()):
    # 緯度経度の平均を計算
    avg_lat = sum(coord[0] for coord in city_data['coords']) / len(city_data['coords'])
    avg_lng = sum(coord[1] for coord in city_data['coords']) / len(city_data['coords'])

    # 都道府県IDを取得
    pref_name = city_data['pref_name']
    pref_id = pref_name_to_id.get(pref_name)

    if pref_id is None:
        print(f"警告: {pref_name} が見つかりません")
        continue

    # 都市度を判定
    environment_type = get_environment_type(city_data['city_name'])

    city_entry = {
        "id": city_id,
        "prefId": pref_id,
        "name": city_data['city_name'],
        "lat": round(avg_lat, 6),
        "lng": round(avg_lng, 6),
        "environment": environment_type,
        "description": ""
    }

    cities_list.append(city_entry)
    city_id += 1

print(f"生成された市区町村データ: {len(cities_list)}件")

# JSONファイルに保存
with open('data/cities.json', 'w', encoding='utf-8') as f:
    json.dump(cities_list, f, ensure_ascii=False, indent=2)

print("data/cities.json を生成しました")

# 都道府県ごとの件数を表示
from collections import Counter
pref_counts = Counter(city['prefId'] for city in cities_list)
print("\n都道府県ごとの市区町村数:")
for pref in sorted(prefectures, key=lambda x: x['id']):
    count = pref_counts.get(pref['id'], 0)
    print(f"  {pref['name']}: {count}件")

print(f"\n合計: {len(cities_list)}件の市区町村データを生成しました")

# 浜松市の区を確認
print("\n【浜松市の行政区】")
hamamatsu_cities = [city for city in cities_list if '浜松市' in city['name']]
if hamamatsu_cities:
    for city in sorted(hamamatsu_cities, key=lambda x: x['name']):
        print(f"  - {city['name']}")
else:
    print("  浜松市の区が見つかりませんでした")

print("\n✅ 市区町村名の修正を適用しました")
print("   - 浜松市: 7区 → 3区（中央区、浜名区、天竜区）")
