// 選択肢の定義。文言の変更・項目の追加はこのファイルだけで行う。

const OPTIONS = {
  model: [
    'i – barrel Tiny R12',
    'i – barrel Small R15',
    'i – barrel Small-Long R18',
    'i – barrel Medium R245（軒あり）',
    'i – barrel Medium-Long R275（軒あり）',
    'i – barrel Large R35（軒あり・前室あり）',
    'i – barrel Large R38（軒あり・前室あり）',
    'i – barrel Large R40（軒あり・前室あり）',
  ],
  specChanges: [
    '前室（1,050mm延長）／二重扉',
    '軒延長（+400mm）・外椅子・外灯',
    '直径変更 1,800mm→2,050mm',
  ],
  roof: ['あり', 'なし'],
  paint: ['あり', 'なし'],
  coldBath: ['あり（チラーなし）', 'あり（チラーあり）', 'なし'],
  windows: [
    '大窓：背面 強化ガラス窓（1枚）',
    '縦長窓：強化ガラス窓（2枚） 前面',
    '縦長窓：強化ガラス窓（2枚） 背面',
    '横長窓：腰位置・側面 強化ガラス窓（2枚）',
    '半円パノラマ 強化ガラス窓（1枚）',
  ],
  assembly: [
    '現地 組立作業・屋根施工（平日）',
    '現地 組立作業・屋根施工（休日）',
    '工場 組立作業・屋根施工',
    'なし（セルフビルド）',
  ],
  heater: [
    'HARVIA WALL4.5（4.5kW）+遮熱板（小）',
    'HARVIA WALL6（6kW）+遮熱板（小）',
    'HARVIA WALL8（7.4kW）+遮熱板（小）',
    'HARVIA KIP6（5.5kW）+遮熱板（小）',
    'HARVIA KIP8（7.4kW）+遮熱板（小）',
    'HARVIA SPIRIT6（6kW）+遮熱板（小）',
    'HARVIA SPIRIT9（9kW）+遮熱板（小）',
    'ガスストーブ（7kW）+遮熱板（小）',
    '薪ストーブM3（16.5kW）+遮熱板（大）',
    'その他',
  ],
  electrical: ['Rink対応', 'なし（お客様対応）'],
  remoteIsland: ['あり', 'なし'],
  deliveryMethod: ['ユニック車', 'ユニック車 + 現地クレーン車手配'],
  products: [
    'スピーカー・アンプ',
    'ロウリュセット',
    'アンカー固定',
    '排水口設置',
    '入口扉 仕様変更（窓ガラス扉 → 木製扉への変更）',
    'LED照明',
  ],
};

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

const NO_DELIVERY = '配送なし';
const HEATER_OTHER = 'その他';

// 規格に標準で含まれる装備（規格選択時の補足表示用）
const MODEL_FEATURES = {
  'i – barrel Tiny R12': [],
  'i – barrel Small R15': [],
  'i – barrel Small-Long R18': [],
  'i – barrel Medium R245（軒あり）': ['軒'],
  'i – barrel Medium-Long R275（軒あり）': ['軒'],
  'i – barrel Large R35（軒あり・前室あり）': ['軒', '前室'],
  'i – barrel Large R38（軒あり・前室あり）': ['軒', '前室'],
  'i – barrel Large R40（軒あり・前室あり）': ['軒', '前室'],
};

const PRECHECKS = [
  {
    id: 'electrical',
    title: '電気工事について',
    text: '見積に記載がない場合、お客様手配にて一次側/二次側電気工事、照明電気配線(100V)の手配が必要となります。',
  },
  {
    id: 'secondary',
    title: '二次側電気工事について',
    text: '二次側電気工事前までに、一次側電気工事を完了させておく必要があります。',
  },
  {
    id: 'foundation',
    title: 'バレルサウナ設置基礎について',
    text: '設置日までに、水平の取れた基礎（コンクリート基礎など）を事前準備が必要です。',
  },
  {
    id: 'delivery',
    title: '配送について',
    text: 'ユニック車が入るスペースや上空の障害物（電線・木・壁など）の事前確認が必要です。',
  },
  {
    id: 'commercial',
    title: '商用利用時の手続きについて',
    text: '商用でサウナ設置される場合は、お客様にて消防と保健所等へ手続きが必要です。\n※(法人・個人を問わず)プライベート利用の場合は必要ありません。\n※手続きは、原則お客様(もしくは依頼業者)にて行なって頂く必要があります。',
  },
];

const CHECK_ANSWERS = ['はい', 'いいえ'];

// 仕様の入力項目（表示順）
const SPEC_FIELDS = [
  { key: 'model', label: 'バレルサウナ規格', type: 'single' },
  { key: 'specChanges', label: 'バレルサウナ 仕様変更オプション', type: 'multi' },
  { key: 'specNote', label: 'バレルサウナ規格 特記事項', type: 'textarea' },
  { key: 'roof', label: '屋根材（ルーフィング・アスファルトシングル）', type: 'single' },
  { key: 'paint', label: '塗装（2度塗）防腐防虫施工', type: 'single' },
  { key: 'coldBath', label: 'ひのき円形水風呂', type: 'single' },
  { key: 'windows', label: 'オプション窓ガラス', type: 'multi' },
  { key: 'assembly', label: '組立施工', type: 'single' },
  { key: 'heater', label: '熱源', type: 'single' },
  { key: 'heaterOther', label: '熱源（その他の内容）', type: 'text' },
  { key: 'electrical', label: '2次側電気工事', type: 'single' },
  { key: 'destination', label: '配送先', type: 'prefecture' },
  { key: 'remoteIsland', label: '離島の有無', type: 'single' },
  { key: 'deliveryMethod', label: '配送方法', type: 'single' },
  { key: 'products', label: 'オプション製品', type: 'multi' },
];
