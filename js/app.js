/**
 * Happy Travel - 幸運の旅先選出アプリ
 */

// ======================
// グローバル変数
// ======================
let prefectures = [];
let cities = [];
let selectedPrefecture = null;
let selectedCity = null;
let departurePref = null;
let departureCity = null;

let appSettings = {
    nights: 1        // 宿泊数
};

let currentQuestion = 0;
const totalQuestions = 2;

// 全交通手段（自動計算用）
const ALL_TRANSPORT = ['train', 'airplane', 'car', 'bus'];

let mainMap = null;
let resultMap = null;

// ======================
// 効果音
// ======================
const sounds = {
    button: new Audio('se/決定ボタンを押す7.mp3'),
    roulette: new Audio('se/電子ルーレット.mp3'),
    rouletteBlink: new Audio('se/電子ルーレットの出目が点滅.mp3')
};

// 音量設定
sounds.button.volume = 0.3;

// モバイル音声プリロード（初回タップで全音声を解放）
let audioUnlocked = false;
function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    Object.values(sounds).forEach(audio => {
        audio.load();
        const p = audio.play();
        if (p) p.then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
    });
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('click', unlockAudio);
}
document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('click', unlockAudio, { once: true });

// 音声再生ヘルパー関数
function playSound(soundName) {
    try {
        if (sounds[soundName]) {
            sounds[soundName].currentTime = 0;
            sounds[soundName].play().catch(e => console.log('音声再生エラー:', e));
        }
    } catch (e) {
        console.log('音声再生エラー:', e);
    }
}

// 音声停止ヘルパー関数
function stopSound(soundName) {
    try {
        if (sounds[soundName]) {
            sounds[soundName].pause();
            sounds[soundName].currentTime = 0;
        }
    } catch (e) {
        console.log('音声停止エラー:', e);
    }
}

// ======================
// 初期化
// ======================
document.addEventListener('DOMContentLoaded', () => {
    console.log('アプリケーション初期化中...');

    // データ読み込み（同期的に実行）
    loadData();

    // UI初期化
    initializeUI();

    // イベントリスナー設定
    setupEventListeners();

    console.log('初期化完了');
});

// ======================
// データ読み込み
// ======================
function loadData() {
    // データはdata/prefectures.jsとdata/cities.jsから読み込まれます
    // グローバル変数 PREFECTURES_DATA と CITIES_DATA を使用
    prefectures = PREFECTURES_DATA;
    cities = CITIES_DATA;
    console.log(`データ読み込み完了: 都道府県${prefectures.length}件、市区町村${cities.length}件`);
}

// ======================
// UI初期化
// ======================
function initializeUI() {
    // 都道府県セレクトボックスの初期化
    const prefSelect = document.getElementById('departure-pref');
    prefectures.forEach(pref => {
        const option = document.createElement('option');
        option.value = pref.id;
        option.textContent = pref.name;
        prefSelect.appendChild(option);
    });

    // ダークモード初期化
    initTheme();
}

// ======================
// テーマ（ダークモード）
// ======================
function initTheme() {
    const saved = localStorage.getItem('happy-travel-theme');
    if (saved === 'dark') {
        document.body.classList.add('dark');
        document.body.classList.remove('light');
    } else if (saved === 'light') {
        document.body.classList.add('light');
        document.body.classList.remove('dark');
    }
    // saved === null: OS preference via CSS media query
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark');
    if (isDark) {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
        localStorage.setItem('happy-travel-theme', 'light');
    } else {
        document.body.classList.add('dark');
        document.body.classList.remove('light');
        localStorage.setItem('happy-travel-theme', 'dark');
    }
}

// ======================
// イベントリスナー設定
// ======================
function setupEventListeners() {
    // テーマ切替
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // イントロ画面
    document.getElementById('start-questions-btn').addEventListener('click', startQuestions);

    // Q1: 出発地選択
    document.getElementById('departure-pref').addEventListener('change', function() {
        const prefId = parseInt(this.value);
        if (prefId) {
            playSound('button');
            departurePref = prefectures.find(p => p.id === prefId);

            // 市区町村セレクトボックスを表示・更新
            const citySelectWrapper = document.getElementById('city-select-wrapper');
            const citySelect = document.getElementById('departure-city');

            citySelect.innerHTML = '<option value="">市区町村を選択</option>';
            const departureCities = cities.filter(c => c.prefId === departurePref.id);
            departureCities.forEach(city => {
                const option = document.createElement('option');
                option.value = city.id;
                option.textContent = city.name;
                citySelect.appendChild(option);
            });

            citySelectWrapper.classList.remove('hidden');
            document.getElementById('q1-next').classList.add('hidden');
        } else {
            document.getElementById('city-select-wrapper').classList.add('hidden');
            document.getElementById('q1-next').classList.add('hidden');
        }
    });

    // Q1: 市区町村選択
    document.getElementById('departure-city').addEventListener('change', function() {
        const cityId = parseInt(this.value);
        if (cityId) {
            playSound('button');
            departureCity = cities.find(c => c.id === cityId);
            document.getElementById('q1-next').classList.remove('hidden');
        } else {
            document.getElementById('q1-next').classList.add('hidden');
        }
    });

    document.getElementById('q1-next').addEventListener('click', () => {
        playSound('button');
        console.log('出発地:', departurePref.name, departureCity.name);
        goToQuestion(2);
    });

    // Q2: 日数
    setupOptionButtons('.nights-options .option-btn', (value) => {
        playSound('button');
        appSettings.nights = parseInt(value);
        document.getElementById('q2-next').classList.remove('hidden');
    });

    document.getElementById('q2-next').addEventListener('click', () => {
        playSound('button');
        setTimeout(() => showDestinyScreen(), 300);
    });

    // 運命の質問画面
    document.getElementById('accept-destiny-btn').addEventListener('click', () => {
        playSound('button');
        setTimeout(() => startRoulette(), 300);
    });

    document.getElementById('reject-destiny-btn').addEventListener('click', () => {
        playSound('button');
        resetToIntro();
    });

    // 結果画面
    document.getElementById('reset-btn').addEventListener('click', () => {
        playSound('button');
        resetToIntro();
    });
    document.getElementById('share-btn').addEventListener('click', () => {
        playSound('button');
        shareResult();
    });

    // 途中スポットトグル
    document.getElementById('route-toggle').addEventListener('click', () => {
        playSound('button');
        const info = document.getElementById('route-info');
        const btn = document.getElementById('route-toggle');
        if (info.classList.contains('hidden')) {
            info.classList.remove('hidden');
            btn.textContent = '寄れるかもスポットを閉じる';
        } else {
            info.classList.add('hidden');
            btn.textContent = '寄れるかもスポットを見る';
        }
    });
}

// ======================
// 選択肢ボタンの設定
// ======================
function setupOptionButtons(selector, callback) {
    document.querySelectorAll(selector).forEach(btn => {
        btn.addEventListener('click', function() {
            this.parentElement.querySelectorAll('.option-btn').forEach(b => {
                b.classList.remove('selected');
            });
            this.classList.add('selected');
            callback(this.dataset.value);
        });
    });
}

// ======================
// 質問開始
// ======================
function startQuestions() {
    playSound('button');
    showScreen('question-screen');
    goToQuestion(1);
}

// ======================
// 質問移動
// ======================
function goToQuestion(questionNumber) {
    currentQuestion = questionNumber;

    // プログレスバー更新
    const progress = (questionNumber / totalQuestions) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `質問 ${questionNumber} / ${totalQuestions}`;

    // すべての質問を非表示
    document.querySelectorAll('.question').forEach(q => {
        q.classList.add('hidden');
    });

    // 指定の質問を表示
    const questionId = `q${questionNumber}`;
    const questionEl = document.getElementById(questionId);
    if (questionEl) {
        questionEl.classList.remove('hidden');
    }
}

// ======================
// 運命の質問画面を表示
// ======================
function showDestinyScreen() {
    showScreen('destiny-screen');
}

// ======================
// ルーレット開始
// ======================
async function startRoulette() {
    showScreen('roulette-screen');
    initializeMainMap();

    // フィルタリング
    const eligiblePrefectures = filterPrefectures();

    if (eligiblePrefectures.length === 0) {
        alert('条件に合う旅行先が見つかりませんでした。予算や日数を調整してください。');
        resetToIntro();
        return;
    }

    console.log(`条件に合う都道府県: ${eligiblePrefectures.length}件`);
    console.log('設定:', appSettings);

    // 都道府県ルーレット
    document.getElementById('roulette-title').textContent = '都道府県を選択中...';
    selectedPrefecture = await runPrefectureRoulette(eligiblePrefectures);

    await sleep(1000);

    // 市区町村ルーレット
    document.getElementById('roulette-title').textContent = '市区町村を選択中...';
    document.getElementById('prefecture-roulette').classList.add('hidden');
    document.getElementById('city-roulette').classList.remove('hidden');

    const eligibleCities = cities.filter(c => c.prefId === selectedPrefecture.id);

    selectedCity = await runCityRoulette(eligibleCities);

    await sleep(1000);
    showResult();
}

// ======================
// 地図初期化
// ======================
function initializeMainMap() {
    if (mainMap) {
        mainMap.remove();
    }

    mainMap = L.map('map').setView([36.5, 138], 5);

    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
        maxZoom: 18
    }).addTo(mainMap);

    if (departureCity) {
        L.marker([departureCity.lat, departureCity.lng])
            .addTo(mainMap)
            .bindPopup(`出発地: ${departureCity.name}`)
            .openPopup();
    }
}

// ======================
// 都道府県フィルタリング（距離ベース）
// ======================
// 日数ごとの最大距離（直線距離km）
const MAX_DISTANCE_BY_NIGHTS = {
    0: 200,   // 日帰り
    1: 500,   // 1泊2日
    2: 800,   // 2泊3日
    3: Infinity // 3泊以上: 制限なし
};

function filterPrefectures() {
    const maxDist = MAX_DISTANCE_BY_NIGHTS[appSettings.nights] || Infinity;

    return prefectures.filter(pref => {
        if (pref.id === departurePref.id) return false;

        const distance = calculateDistance(
            departureCity.lat, departureCity.lng,
            pref.lat, pref.lng
        );

        return distance <= maxDist;
    });
}

// ======================
// 都道府県ルーレット
// ======================
async function runPrefectureRoulette(eligiblePrefectures) {
    const rouletteItem = document.getElementById('roulette-item');
    const display = document.getElementById('prefecture-roulette');
    const iterations = 20;
    const baseDelay = 50;

    // Spinning animation
    display.classList.add('spinning');

    // ルーレット音を開始
    playSound('roulette');

    for (let i = 0; i < iterations; i++) {
        const randomPref = eligiblePrefectures[Math.floor(Math.random() * eligiblePrefectures.length)];
        rouletteItem.textContent = randomPref.name;
        rouletteItem.classList.add('highlight');

        if (mainMap) {
            mainMap.setView([randomPref.lat, randomPref.lng], 6);
        }

        const delay = baseDelay + (i * 15);
        await sleep(delay);
        rouletteItem.classList.remove('highlight');
    }

    const finalSelection = eligiblePrefectures[Math.floor(Math.random() * eligiblePrefectures.length)];

    // ルーレット音を停止
    stopSound('roulette');
    display.classList.remove('spinning');

    rouletteItem.textContent = finalSelection.name;
    rouletteItem.classList.add('highlight');

    if (mainMap) {
        mainMap.setView([finalSelection.lat, finalSelection.lng], 8);
    }

    return finalSelection;
}

// ======================
// 市区町村ルーレット
// ======================
async function runCityRoulette(eligibleCities) {
    const rouletteItem = document.getElementById('city-roulette-item');
    const display = document.getElementById('city-roulette');
    const iterations = 15;
    const baseDelay = 50;

    // Spinning animation
    display.classList.add('spinning');

    // ルーレット音を開始
    playSound('roulette');

    for (let i = 0; i < iterations; i++) {
        const randomCity = eligibleCities[Math.floor(Math.random() * eligibleCities.length)];
        rouletteItem.textContent = randomCity.name;
        rouletteItem.classList.add('highlight');

        if (mainMap) {
            mainMap.setView([randomCity.lat, randomCity.lng], 10);
        }

        const delay = baseDelay + (i * 15);
        await sleep(delay);
        rouletteItem.classList.remove('highlight');
    }

    // ルーレット音を停止
    stopSound('roulette');
    display.classList.remove('spinning');

    const finalSelection = eligibleCities[Math.floor(Math.random() * eligibleCities.length)];
    rouletteItem.textContent = finalSelection.name;
    rouletteItem.classList.add('highlight');

    if (mainMap) {
        mainMap.setView([finalSelection.lat, finalSelection.lng], 12);
    }

    return finalSelection;
}

// ======================
// 結果表示
// ======================
function showResult() {
    showScreen('result-screen');

    document.getElementById('result-prefecture').textContent = selectedPrefecture.name;
    document.getElementById('result-city').textContent = selectedCity.name;
    document.getElementById('result-description').textContent = selectedCity.description || '';
    document.getElementById('result-departure').textContent = `${departurePref.name} ${departureCity.name}`;

    const distance = calculateDistance(
        departureCity.lat, departureCity.lng,
        selectedCity.lat, selectedCity.lng
    );
    const time = estimateTravelTime(distance, ALL_TRANSPORT);

    document.getElementById('result-distance').textContent = `${Math.round(distance)}km`;
    document.getElementById('result-time').textContent = `約${time.toFixed(1)}時間`;

    // Google Mapsリンクを設定
    const googleMapsUrl = `https://www.google.com/maps?q=${selectedCity.lat},${selectedCity.lng}`;
    document.getElementById('google-maps-link').href = googleMapsUrl;

    // 観光情報を表示
    displayTourismInfo(selectedPrefecture.id);

    // 途中スポットを表示
    const routePrefs = findRoutePrefectures();
    displayRouteSpots(routePrefs);

    // アフィリエイトリンクを更新
    updateAffiliateLinks();

    initializeResultMap();
}

// ======================
// Google Maps URL生成
// ======================
function mapsSearchUrl(prefName, keyword) {
    return `https://www.google.com/maps/search/${encodeURIComponent(prefName + ' ' + keyword)}`;
}

function mapsRouteUrl(destName) {
    const origin = `${departureCity.lat},${departureCity.lng}`;
    return `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${encodeURIComponent(destName)}`;
}

// ======================
// 観光情報表示
// ======================
function displayTourismInfo(prefId) {
    const data = TOURISM_DATA[prefId];
    const container = document.getElementById('tourism-info');
    const prefName = selectedPrefecture.name;

    if (!data) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    const spotsEl = document.getElementById('tourism-spots');
    const foodsEl = document.getElementById('tourism-foods');
    const specialtiesEl = document.getElementById('tourism-specialties');

    spotsEl.innerHTML = data.spots.map(s =>
        `<li><a href="${mapsSearchUrl(prefName, s)}" target="_blank" rel="noopener noreferrer">${s}</a></li>`
    ).join('');
    foodsEl.innerHTML = data.foods.map(f =>
        `<li><a href="${mapsSearchUrl(prefName, f)}" target="_blank" rel="noopener noreferrer">${f}</a></li>`
    ).join('');
    specialtiesEl.innerHTML = data.specialties.map(s =>
        `<li><a href="${mapsSearchUrl(prefName, s)}" target="_blank" rel="noopener noreferrer">${s}</a></li>`
    ).join('');
}

// ======================
// 途中県の算出（BFS最短経路ベース）
// ======================
function findRoutePrefectures() {
    const startId = departurePref.id;
    const goalId = selectedPrefecture.id;

    // BFS to find shortest path through adjacency graph
    const path = bfsPath(startId, goalId);

    // No land route found (e.g. Okinawa) or adjacent (no intermediate prefectures)
    if (!path || path.length <= 2) return [];

    // Return intermediate prefectures (exclude start and goal)
    const intermediate = path.slice(1, -1);
    return intermediate.map(id => prefectures.find(p => p.id === id)).filter(Boolean);
}

// ======================
// 途中スポット表示
// ======================
function displayRouteSpots(routePrefectures) {
    const toggle = document.getElementById('route-toggle');
    const container = document.getElementById('route-info');
    const spotsContainer = document.getElementById('route-spots');
    const MAX_ROUTE_SPOTS = 3;

    if (routePrefectures.length === 0) {
        toggle.classList.add('hidden');
        container.classList.add('hidden');
        return;
    }

    // Show toggle button, keep content hidden
    toggle.classList.remove('hidden');
    container.classList.add('hidden');
    spotsContainer.innerHTML = '';

    const selected = sampleEvenly(routePrefectures, MAX_ROUTE_SPOTS);

    selected.forEach(pref => {
        const data = TOURISM_DATA[pref.id];
        if (!data) return;

        const topSpot = data.spots[0] || '';
        const topFood = data.foods[0] || '';

        const card = document.createElement('div');
        card.className = 'route-spot-card';

        card.innerHTML = `
            <h4 class="route-spot-pref">${pref.name}</h4>
            <p class="route-spot-detail"><a href="${mapsSearchUrl(pref.name, topSpot)}" target="_blank" rel="noopener noreferrer">${topSpot}</a></p>
            <p class="route-spot-detail"><a href="${mapsSearchUrl(pref.name, topFood)}" target="_blank" rel="noopener noreferrer">${topFood}</a></p>
            <a href="${mapsRouteUrl(pref.name)}" class="route-link" target="_blank" rel="noopener noreferrer">ルートを見る</a>
        `;

        spotsContainer.appendChild(card);
    });
}

// Pick up to n items evenly spaced from an array
function sampleEvenly(arr, n) {
    if (arr.length <= n) return arr;
    const result = [];
    for (let i = 0; i < n; i++) {
        const idx = Math.round(i * (arr.length - 1) / (n - 1));
        result.push(arr[idx]);
    }
    return result;
}

// BFS shortest path between two prefecture IDs
function bfsPath(startId, goalId) {
    if (startId === goalId) return [startId];
    const queue = [[startId]];
    const visited = new Set([startId]);

    while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];
        const neighbors = PREFECTURE_ADJACENCY[current] || [];

        for (const next of neighbors) {
            if (next === goalId) return [...path, next];
            if (!visited.has(next)) {
                visited.add(next);
                queue.push([...path, next]);
            }
        }
    }
    return null; // No route (e.g. Okinawa)
}

// ======================
// アフィリエイトリンク更新
// ======================
function updateAffiliateLinks() {
    const prefName = selectedPrefecture.name;
    const cityName = selectedCity.name;
    const searchQuery = `${prefName} ${cityName}`;

    // 楽天トラベル検索URL
    const rakutenUrl = `https://travel.rakuten.co.jp/HOTEL/SimpleSearch?f_teikei=&f_dai=&f_chu=&f_shou=&f_search_type=1&f_nen1=&f_tuki1=&f_hi1=&f_nen2=&f_tuki2=&f_hi2=&f_otona_su=2&f_s1=0&f_s2=0&f_y1=0&f_y2=0&f_y3=0&f_y4=0&f_camp_id=&f_flg=PLAN&f_keyword=${encodeURIComponent(searchQuery)}`;

    // じゃらん検索URL
    const jalanUrl = `https://www.jalan.net/uw/uwp1100/uww1101init.do?keyword=${encodeURIComponent(searchQuery)}&rootCd=04&stayYear=&stayMonth=&stayDay=&stayCount=1&dateUndecided=1&roomCount=1&adultNum=2&minPrice=0&maxPrice=999999`;

    // Booking.com検索URL
    const bookingUrl = `https://www.booking.com/searchresults.ja.html?ss=${encodeURIComponent(searchQuery)}`;

    // リンクを設定
    document.getElementById('rakuten-link').href = rakutenUrl;
    document.getElementById('jalan-link').href = jalanUrl;
    document.getElementById('booking-link').href = bookingUrl;
}

// ======================
// 結果地図初期化
// ======================
function initializeResultMap() {
    if (resultMap) {
        resultMap.remove();
    }

    resultMap = L.map('result-map').setView([selectedCity.lat, selectedCity.lng], 10);

    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
        maxZoom: 18
    }).addTo(resultMap);

    L.marker([selectedCity.lat, selectedCity.lng])
        .addTo(resultMap)
        .bindPopup(`${selectedPrefecture.name} ${selectedCity.name}`)
        .openPopup();

    L.marker([departureCity.lat, departureCity.lng])
        .addTo(resultMap)
        .bindPopup(`出発地: ${departureCity.name}`);

    const route = L.polyline([
        [departureCity.lat, departureCity.lng],
        [selectedCity.lat, selectedCity.lng]
    ], {
        color: '#000000',
        weight: 2,
        opacity: 0.6
    }).addTo(resultMap);

    resultMap.fitBounds(route.getBounds(), { padding: [50, 50] });
}

// ======================
// 最初に戻る
// ======================
function resetToIntro() {
    showScreen('intro-screen');
    currentQuestion = 0;

    // リセット
    if (mainMap) {
        mainMap.remove();
        mainMap = null;
    }
    if (resultMap) {
        resultMap.remove();
        resultMap = null;
    }

    document.getElementById('departure-pref').value = '';
    document.getElementById('city-select-wrapper').classList.add('hidden');
    document.getElementById('progress-fill').style.width = '0%';
    document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('q1-next').classList.add('hidden');
    document.getElementById('q2-next').classList.add('hidden');
    document.getElementById('route-toggle').classList.add('hidden');
    document.getElementById('route-toggle').textContent = '寄れるかもスポットを見る';
    document.getElementById('route-info').classList.add('hidden');

    appSettings.nights = 1;
}

// ======================
// 結果シェア
// ======================
function shareResult() {
    const shareText = `Happy Travelで${selectedPrefecture.name}${selectedCity.name}に決定！\n出発地: ${departurePref.name}${departureCity.name}\n\n#HappyTravel`;

    if (navigator.share) {
        navigator.share({
            title: 'Happy Travel',
            text: shareText,
            url: window.location.href
        }).catch(err => console.log('シェアキャンセル', err));
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            alert('結果をクリップボードにコピーしました！');
        }).catch(err => {
            console.error('コピー失敗', err);
            alert(shareText);
        });
    }
}

// ======================
// ユーティリティ関数
// ======================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees) {
    return degrees * Math.PI / 180;
}

function estimateTravelTime(distance, transportMethods) {
    // 直線距離を実際の道路距離に補正（約1.3倍）
    const DISTANCE_FACTOR = 1.3;
    const actualDistance = distance * DISTANCE_FACTOR;

    let minTime = Infinity;

    transportMethods.forEach(method => {
        let time = 0;
        switch (method) {
            case 'train':
                // 新幹線想定、乗り換え時間込み
                time = (actualDistance / 100) + 0.5;
                break;
            case 'airplane':
                // 空港アクセス・搭乗手続き込み
                time = (actualDistance / 500) + 3;
                break;
            case 'car':
                // 高速道路想定
                time = actualDistance / 70;
                break;
            case 'bus':
                // 一般道+高速
                time = actualDistance / 55;
                break;
        }
        if (time < minTime) minTime = time;
    });

    return minTime;
}

