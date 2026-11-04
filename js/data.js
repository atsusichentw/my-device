window.MD = (function () {
  'use strict';

  const ALL = ['desktop', 'laptop', 'mini', 'mobile'];
  const PC = ['desktop', 'laptop', 'mini'];

  const types = [
    { id: 'desktop', name: '桌上型電腦', icon: 'bi-pc-display' },
    { id: 'laptop', name: '筆記型電腦', icon: 'bi-laptop' },
    { id: 'mini', name: '迷你主機', icon: 'bi-pc' },
    { id: 'mobile', name: '手機／平板', icon: 'bi-phone' }
  ];

  const base = {
    desktop: { idle: 0, max: 0 },
    laptop: { idle: 2, max: 6 },
    mini: { idle: 3, max: 8 },
    mobile: { idle: 0.3, max: 1.5 }
  };

  const baseName = {
    laptop: '主機板與其他（網路、風扇、晶片組）',
    mini: '主機板與其他（網路、風扇、晶片組）',
    mobile: '其他元件（通訊、感測器）'
  };

  const adapter = {
    laptop: { idle: 0.8, load: 0.88, name: '變壓器' },
    mini: { idle: 0.8, load: 0.87, name: '變壓器' },
    mobile: { idle: 0.75, load: 0.85, name: '充電器' }
  };

  const cpuOptions = [
    { id: 'dcpu-entry', group: '桌上型處理器', name: '入門 4 核心', desc: 'Core i3-12100／13100、Ryzen 3、Pentium', idle: 6, max: 65, rank: 2, types: ['desktop'] },
    { id: 'dcpu-main', group: '桌上型處理器', name: '主流 6 核心', desc: 'Core i5-12400／14400、Ryzen 5 5600／7600', idle: 9, max: 88, rank: 3, types: ['desktop'] },
    { id: 'dcpu-main-k', group: '桌上型處理器', name: '主流超頻', desc: 'Core i5-13600K／14600K、Core Ultra 5 245K', idle: 10, max: 181, rank: 4, types: ['desktop'] },
    { id: 'dcpu-r7', group: '桌上型處理器', name: '高階 8 核心', desc: 'Ryzen 7 7700X／7800X3D／9800X3D', idle: 18, max: 142, rank: 4, types: ['desktop'] },
    { id: 'dcpu-i7', group: '桌上型處理器', name: '高階多核心', desc: 'Core i7-13700K／14700K、Core Ultra 7 265K', idle: 12, max: 253, rank: 4, types: ['desktop'] },
    { id: 'dcpu-r9', group: '桌上型處理器', name: '旗艦 16 核心', desc: 'Ryzen 9 7950X／9950X／9950X3D', idle: 25, max: 230, rank: 5, types: ['desktop'] },
    { id: 'dcpu-i9', group: '桌上型處理器', name: '旗艦 24 核心', desc: 'Core i9-13900K／14900K、Core Ultra 9 285K', idle: 14, max: 253, rank: 5, types: ['desktop'] },
    { id: 'dcpu-ws', group: '桌上型處理器', name: '工作站等級', desc: 'Threadripper、Xeon W', idle: 60, max: 350, rank: 5, types: ['desktop'] },
    { id: 'lcpu-n', group: '行動處理器', name: '入門低功耗', desc: 'Intel N100／N150、Celeron、Pentium Silver', idle: 1, max: 15, rank: 2, types: ['laptop', 'mini'] },
    { id: 'lcpu-u', group: '行動處理器', name: '輕薄省電 U／V 系列', desc: 'Core i5-1235U、Core Ultra 5 226V、Ryzen 5 7530U', idle: 1.5, max: 28, rank: 3, types: ['laptop', 'mini'] },
    { id: 'lcpu-h', group: '行動處理器', name: '效能 H 系列', desc: 'Core i7-13700H、Core Ultra 7 155H、Ryzen 7 8845HS', idle: 3, max: 65, rank: 4, types: ['laptop', 'mini'] },
    { id: 'lcpu-hx', group: '行動處理器', name: '電競 HX 系列', desc: 'Core i9-14900HX、Core Ultra 9 275HX、Ryzen 9 7945HX', idle: 5, max: 140, rank: 5, types: ['laptop', 'mini'] },
    { id: 'lcpu-snap', group: '行動處理器', name: 'Snapdragon X 系列', desc: 'Snapdragon X Elite／X Plus（含內建顯示）', idle: 1, max: 30, rank: 4, types: ['laptop', 'mini'] },
    { id: 'apple-m', group: 'Apple 晶片', name: 'Apple M 系列', desc: 'M1／M2／M3／M4（含內建顯示）', idle: 1.5, max: 25, rank: 4, types: PC },
    { id: 'apple-pro', group: 'Apple 晶片', name: 'Apple M Pro', desc: 'M1 Pro～M4 Pro（含內建顯示）', idle: 3, max: 60, rank: 4, types: PC },
    { id: 'apple-max', group: 'Apple 晶片', name: 'Apple M Max', desc: 'M1 Max～M4 Max（含內建顯示）', idle: 5, max: 100, rank: 5, types: PC },
    { id: 'apple-ultra', group: 'Apple 晶片', name: 'Apple M Ultra', desc: 'M1 Ultra～M3 Ultra（含內建顯示）', idle: 10, max: 215, rank: 5, types: ['desktop', 'mini'] },
    { id: 'soc-entry', group: '手機／平板晶片', name: '入門晶片', desc: 'Snapdragon 4 系列、Helio、Unisoc', idle: 0.3, max: 4, rank: 2, types: ['mobile'] },
    { id: 'soc-mid', group: '手機／平板晶片', name: '中階晶片', desc: 'Snapdragon 6／7 系列、Dimensity 7000、Exynos 1000 系列', idle: 0.35, max: 7, rank: 3, types: ['mobile'] },
    { id: 'soc-flag', group: '手機／平板晶片', name: '旗艦晶片', desc: 'Snapdragon 8 系列、Dimensity 9000、Tensor', idle: 0.4, max: 12, rank: 5, types: ['mobile'] },
    { id: 'soc-apple-a', group: '手機／平板晶片', name: 'Apple A 系列', desc: 'iPhone、iPad 標準版／mini', idle: 0.3, max: 9, rank: 4, types: ['mobile'] },
    { id: 'soc-apple-m', group: '手機／平板晶片', name: 'Apple M 系列（iPad）', desc: 'iPad Air／iPad Pro', idle: 0.5, max: 20, rank: 5, types: ['mobile'] }
  ];

  const gpuRows = [
    ['NVIDIA RTX 50 系列', [
      ['rtx 5090', 'GeForce RTX 5090', 30, 575, 5],
      ['rtx 5080', 'GeForce RTX 5080', 20, 360, 5],
      ['rtx 5070 ti', 'GeForce RTX 5070 Ti', 18, 300, 5],
      ['rtx 5070', 'GeForce RTX 5070', 15, 250, 4],
      ['rtx 5060 ti', 'GeForce RTX 5060 Ti', 12, 180, 4],
      ['rtx 5060', 'GeForce RTX 5060', 10, 145, 4]
    ]],
    ['NVIDIA RTX 40 系列', [
      ['rtx 4090', 'GeForce RTX 4090', 22, 450, 5],
      ['rtx 4080 super', 'GeForce RTX 4080 SUPER', 16, 320, 5],
      ['rtx 4080', 'GeForce RTX 4080', 16, 320, 5],
      ['rtx 4070 ti super', 'GeForce RTX 4070 Ti SUPER', 14, 285, 4],
      ['rtx 4070 ti', 'GeForce RTX 4070 Ti', 14, 285, 4],
      ['rtx 4070 super', 'GeForce RTX 4070 SUPER', 12, 220, 4],
      ['rtx 4070', 'GeForce RTX 4070', 11, 200, 4],
      ['rtx 4060 ti', 'GeForce RTX 4060 Ti', 9, 165, 4],
      ['rtx 4060', 'GeForce RTX 4060', 8, 115, 3]
    ]],
    ['NVIDIA RTX 30 系列', [
      ['rtx 3090 ti', 'GeForce RTX 3090 Ti', 30, 450, 5],
      ['rtx 3090', 'GeForce RTX 3090', 25, 350, 5],
      ['rtx 3080 ti', 'GeForce RTX 3080 Ti', 22, 350, 4],
      ['rtx 3080', 'GeForce RTX 3080', 20, 320, 4],
      ['rtx 3070 ti', 'GeForce RTX 3070 Ti', 15, 290, 4],
      ['rtx 3070', 'GeForce RTX 3070', 13, 220, 4],
      ['rtx 3060 ti', 'GeForce RTX 3060 Ti', 12, 200, 3],
      ['rtx 3060', 'GeForce RTX 3060', 11, 170, 3],
      ['rtx 3050', 'GeForce RTX 3050', 9, 130, 3]
    ]],
    ['NVIDIA RTX 20／GTX 16 系列', [
      ['rtx 2080 ti', 'GeForce RTX 2080 Ti', 18, 250, 4],
      ['rtx 2080 super', 'GeForce RTX 2080 SUPER', 15, 250, 4],
      ['rtx 2080', 'GeForce RTX 2080', 15, 215, 4],
      ['rtx 2070 super', 'GeForce RTX 2070 SUPER', 12, 215, 3],
      ['rtx 2070', 'GeForce RTX 2070', 12, 175, 3],
      ['rtx 2060 super', 'GeForce RTX 2060 SUPER', 10, 175, 3],
      ['rtx 2060', 'GeForce RTX 2060', 10, 160, 3],
      ['gtx 1660 super', 'GeForce GTX 1660 SUPER', 9, 125, 3],
      ['gtx 1660 ti', 'GeForce GTX 1660 Ti', 9, 120, 3],
      ['gtx 1660', 'GeForce GTX 1660', 9, 120, 3],
      ['gtx 1650 super', 'GeForce GTX 1650 SUPER', 8, 100, 2],
      ['gtx 1650', 'GeForce GTX 1650', 7, 75, 2]
    ]],
    ['NVIDIA GTX 10 系列', [
      ['gtx 1080 ti', 'GeForce GTX 1080 Ti', 12, 250, 3],
      ['gtx 1080', 'GeForce GTX 1080', 10, 180, 3],
      ['gtx 1070 ti', 'GeForce GTX 1070 Ti', 10, 180, 3],
      ['gtx 1070', 'GeForce GTX 1070', 9, 150, 3],
      ['gtx 1060', 'GeForce GTX 1060', 8, 120, 2],
      ['gtx 1050 ti', 'GeForce GTX 1050 Ti', 6, 75, 2],
      ['gtx 1050', 'GeForce GTX 1050', 6, 75, 2],
      ['gt 1030', 'GeForce GT 1030', 4, 30, 2]
    ]],
    ['AMD Radeon RX 9000／7000 系列', [
      ['rx 9070 xt', 'Radeon RX 9070 XT', 15, 304, 5],
      ['rx 9070', 'Radeon RX 9070', 13, 220, 4],
      ['rx 9060 xt', 'Radeon RX 9060 XT', 10, 160, 4],
      ['rx 7900 xtx', 'Radeon RX 7900 XTX', 20, 355, 5],
      ['rx 7900 xt', 'Radeon RX 7900 XT', 18, 315, 5],
      ['rx 7900 gre', 'Radeon RX 7900 GRE', 16, 260, 4],
      ['rx 7800 xt', 'Radeon RX 7800 XT', 14, 263, 4],
      ['rx 7700 xt', 'Radeon RX 7700 XT', 12, 245, 4],
      ['rx 7600 xt', 'Radeon RX 7600 XT', 9, 190, 3],
      ['rx 7600', 'Radeon RX 7600', 8, 165, 3]
    ]],
    ['AMD Radeon RX 6000／5000 系列', [
      ['rx 6950 xt', 'Radeon RX 6950 XT', 18, 335, 4],
      ['rx 6900 xt', 'Radeon RX 6900 XT', 16, 300, 4],
      ['rx 6800 xt', 'Radeon RX 6800 XT', 15, 300, 4],
      ['rx 6800', 'Radeon RX 6800', 13, 250, 4],
      ['rx 6750 xt', 'Radeon RX 6750 XT', 12, 250, 3],
      ['rx 6700 xt', 'Radeon RX 6700 XT', 11, 230, 3],
      ['rx 6650 xt', 'Radeon RX 6650 XT', 9, 180, 3],
      ['rx 6600 xt', 'Radeon RX 6600 XT', 8, 160, 3],
      ['rx 6600', 'Radeon RX 6600', 7, 132, 3],
      ['rx 6500 xt', 'Radeon RX 6500 XT', 6, 107, 2],
      ['rx 6400', 'Radeon RX 6400', 5, 53, 2],
      ['rx 5700 xt', 'Radeon RX 5700 XT', 9, 225, 3],
      ['rx 5700', 'Radeon RX 5700', 8, 180, 3],
      ['rx 5600 xt', 'Radeon RX 5600 XT', 8, 150, 3],
      ['rx 5500 xt', 'Radeon RX 5500 XT', 6, 130, 2]
    ]],
    ['AMD Radeon 早期系列', [
      ['vega 64', 'Radeon RX Vega 64', 15, 295, 3],
      ['vega 56', 'Radeon RX Vega 56', 13, 210, 3],
      ['rx 590', 'Radeon RX 590', 10, 225, 2],
      ['rx 580', 'Radeon RX 580', 9, 185, 2],
      ['rx 570', 'Radeon RX 570', 8, 150, 2],
      ['rx 560', 'Radeon RX 560', 6, 80, 2]
    ]],
    ['Intel Arc 系列', [
      ['arc b580', 'Arc B580', 12, 190, 3],
      ['arc b570', 'Arc B570', 11, 150, 3],
      ['arc a770', 'Arc A770', 30, 225, 3],
      ['arc a750', 'Arc A750', 30, 225, 3],
      ['arc a580', 'Arc A580', 25, 185, 3],
      ['arc a380', 'Arc A380', 15, 75, 2]
    ]]
  ];

  const gpuOptions = [
    { id: 'igpu-intel', group: '內建顯示晶片', name: 'Intel 內建顯示', desc: 'UHD／Iris Xe／Arc 內顯（與處理器共用功耗）', idle: 0.5, max: 8, rank: 2, types: PC },
    { id: 'igpu-amd', group: '內建顯示晶片', name: 'AMD 內建顯示', desc: 'Radeon Graphics／680M／780M（與處理器共用功耗）', idle: 0.5, max: 10, rank: 2, types: PC },
    { id: 'igpu-apple', group: '內建顯示晶片', name: 'Apple 晶片內建 GPU', desc: '功耗已算在 Apple 晶片裡', idle: 0, max: 0, rank: 3, types: PC },
    { id: 'igpu-soc', group: '內建顯示晶片', name: 'Arm 晶片內建 GPU', desc: 'Adreno／Mali（功耗已算在處理器裡）', idle: 0, max: 0, rank: 2, types: PC },
    { id: 'lgpu-low', group: '筆電獨立顯示', name: '筆電獨顯 入門', desc: 'RTX 2050／3050／4050／5050、GTX 1650', idle: 3, max: 75, rank: 3, types: ['laptop', 'mini'] },
    { id: 'lgpu-mid', group: '筆電獨立顯示', name: '筆電獨顯 中階', desc: 'RTX 3060／4060／4070／5060／5070', idle: 4, max: 115, rank: 4, types: ['laptop', 'mini'] },
    { id: 'lgpu-high', group: '筆電獨立顯示', name: '筆電獨顯 高階', desc: 'RTX 3080／4080／4090／5080／5090', idle: 6, max: 175, rank: 5, types: ['laptop', 'mini'] },
    { id: 'lgpu-amd', group: '筆電獨立顯示', name: '筆電 AMD 獨顯', desc: 'Radeon RX 6000M／7000M／7000S', idle: 4, max: 100, rank: 4, types: ['laptop', 'mini'] }
  ];

  gpuRows.forEach(function (row) {
    row[1].forEach(function (g) {
      gpuOptions.push({
        id: 'gpu-' + g[0].replace(/\s+/g, '-'),
        key: g[0],
        group: row[0],
        name: g[1],
        desc: '整張顯示卡功耗約 ' + g[3] + ' W',
        idle: g[2],
        max: g[3],
        rank: g[4],
        types: ['desktop', 'mini']
      });
    });
  });

  const gpuMatchers = gpuOptions
    .filter(function (o) { return o.key; })
    .map(function (o) { return { id: o.id, len: o.key.length, re: new RegExp('\\b' + o.key.split(' ').join('\\s*') + '\\b') }; })
    .sort(function (a, b) { return b.len - a.len; });

  const slots = [
    {
      id: 'cpu', name: '處理器', names: { mobile: '處理器晶片' }, icon: 'bi-cpu', types: ALL, kind: 'option',
      tip: '瀏覽器只能讀到執行緒數量，讀不到型號，請挑最接近的一項。',
      options: cpuOptions,
      def: { desktop: 'dcpu-main', laptop: 'lcpu-u', mini: 'lcpu-n', mobile: 'soc-mid' }
    },
    {
      id: 'gpu', name: '顯示卡', icon: 'bi-gpu-card', types: PC, kind: 'option', search: true,
      tip: '可以輸入型號搜尋，例如 4070、7800。',
      options: gpuOptions,
      def: { desktop: 'gpu-rtx-4060', laptop: 'igpu-intel', mini: 'igpu-intel' }
    },
    {
      id: 'ram', name: '記憶體', icon: 'bi-memory', types: PC, kind: 'counter',
      tip: '瀏覽器只能回報大約容量（最多回報 8 GB），請填入實際的記憶體條數。',
      items: [
        { id: 'ddr4', name: 'DDR4 記憶體條', short: 'DDR4', idle: 1, max: 3, limit: 8 },
        { id: 'ddr5', name: 'DDR5 記憶體條', short: 'DDR5', idle: 1.2, max: 4.5, limit: 8 },
        { id: 'onboard', name: '板載記憶體（每 8 GB 算一份）', short: '板載 8GB', idle: 0.3, max: 1.2, limit: 16 }
      ],
      def: { desktop: { ddr4: 2 }, laptop: { onboard: 2 }, mini: { ddr4: 2 } }
    },
    {
      id: 'storage', name: '儲存裝置', icon: 'bi-device-ssd', types: PC, kind: 'counter',
      tip: '瀏覽器讀不到硬碟種類與數量，請依實際安裝的數量填寫。',
      items: [
        { id: 'nvme', name: 'M.2 NVMe SSD', short: 'NVMe', idle: 0.8, max: 7, limit: 8 },
        { id: 'sata', name: '2.5 吋 SATA SSD', short: 'SATA SSD', idle: 0.5, max: 3.5, limit: 8 },
        { id: 'hdd', name: '3.5 吋 傳統硬碟', short: '3.5" HDD', idle: 5, max: 10, limit: 12 },
        { id: 'hdd25', name: '2.5 吋 傳統硬碟', short: '2.5" HDD', idle: 1, max: 2.5, limit: 8 }
      ],
      def: { desktop: { nvme: 1, hdd: 1 }, laptop: { nvme: 1 }, mini: { nvme: 1 } }
    },
    {
      id: 'board', name: '主機板', icon: 'bi-motherboard', types: ['desktop'], kind: 'option',
      tip: '瀏覽器讀不到主機板，可依機殼大小或晶片組選擇。',
      options: [
        { id: 'brd-itx', name: 'Mini-ITX 小型主機板', desc: '小機殼、單一顯示卡', idle: 10, max: 20, rank: 2, types: ['desktop'] },
        { id: 'brd-matx', name: 'Micro-ATX 主機板', desc: 'B 系列晶片組常見規格', idle: 14, max: 28, rank: 3, types: ['desktop'] },
        { id: 'brd-atx', name: 'ATX 主機板', desc: '一般中塔機殼', idle: 18, max: 35, rank: 3, types: ['desktop'] },
        { id: 'brd-high', name: '高階 ATX／E-ATX', desc: 'Z／X 晶片組、多 M.2、10G 網路', idle: 25, max: 50, rank: 4, types: ['desktop'] }
      ],
      def: { desktop: 'brd-matx' }
    },
    {
      id: 'cooling', name: '散熱與燈效', icon: 'bi-fan', types: ['desktop'], kind: 'counter',
      tip: '包含處理器風扇、機殼風扇、水冷泵與 RGB 燈效。',
      items: [
        { id: 'fan', name: '風扇（處理器＋機殼）', short: '風扇', idle: 0.5, max: 2.5, limit: 16 },
        { id: 'pump', name: '水冷泵', short: '水冷泵', idle: 2, max: 6, limit: 2 },
        { id: 'rgb', name: 'RGB 燈條／燈效元件', short: 'RGB', idle: 1, max: 5, limit: 12 }
      ],
      def: { desktop: { fan: 3 } }
    },
    {
      id: 'psu', name: '電源供應器', icon: 'bi-plug', types: ['desktop'], kind: 'option', role: 'eff',
      tip: '電源供應器的轉換效率越高，從插座多吃的電越少；認證貼紙通常在電源側面。',
      options: [
        { id: 'psu-none', name: '無認證', desc: '沒有 80 PLUS 標章', eff: 0.78, rank: 1, types: ['desktop'] },
        { id: 'psu-white', name: '80 PLUS 白牌', desc: '基本認證', eff: 0.82, rank: 2, types: ['desktop'] },
        { id: 'psu-bronze', name: '80 PLUS 銅牌', desc: '最常見', eff: 0.85, rank: 3, types: ['desktop'] },
        { id: 'psu-gold', name: '80 PLUS 金牌', desc: '中高階常見', eff: 0.89, rank: 4, types: ['desktop'] },
        { id: 'psu-plat', name: '80 PLUS 白金牌', desc: '高效率', eff: 0.91, rank: 5, types: ['desktop'] },
        { id: 'psu-ti', name: '80 PLUS 鈦金牌', desc: '頂級效率', eff: 0.93, rank: 5, types: ['desktop'] }
      ],
      def: { desktop: 'psu-bronze' }
    },
    {
      id: 'monitor', name: '外接螢幕', icon: 'bi-display', types: ['desktop', 'mini'], kind: 'option', role: 'wall',
      tip: '螢幕插在自己的插座上，不算在主機電源裡；瀏覽器讀不到螢幕尺寸，只能從解析度推測。',
      options: [
        { id: 'mon-none', name: '不計算螢幕', desc: '只算主機', idle: 0, max: 0, rank: 1, types: ['desktop', 'mini'] },
        { id: 'mon-24', name: '24 吋 FHD × 1', desc: '1920×1080', idle: 12, max: 25, rank: 2, types: ['desktop', 'mini'] },
        { id: 'mon-27', name: '27 吋 2K × 1', desc: '2560×1440', idle: 15, max: 35, rank: 3, types: ['desktop', 'mini'] },
        { id: 'mon-27-4k', name: '27 吋 4K × 1', desc: '3840×2160', idle: 20, max: 45, rank: 4, types: ['desktop', 'mini'] },
        { id: 'mon-32-4k', name: '32 吋 4K × 1', desc: '3840×2160', idle: 25, max: 60, rank: 4, types: ['desktop', 'mini'] },
        { id: 'mon-34uw', name: '34 吋 帶魚螢幕 × 1', desc: '3440×1440', idle: 25, max: 55, rank: 4, types: ['desktop', 'mini'] },
        { id: 'mon-2x24', name: '24 吋 FHD × 2', desc: '雙螢幕', idle: 24, max: 50, rank: 3, types: ['desktop', 'mini'] },
        { id: 'mon-2x27', name: '27 吋 2K × 2', desc: '雙螢幕', idle: 30, max: 70, rank: 4, types: ['desktop', 'mini'] },
        { id: 'mon-3x27', name: '27 吋 × 3', desc: '三螢幕', idle: 45, max: 105, rank: 5, types: ['desktop', 'mini'] }
      ],
      def: { desktop: 'mon-24', mini: 'mon-24' }
    },
    {
      id: 'panel', name: '內建螢幕', icon: 'bi-aspect-ratio', types: ['laptop', 'mobile'], kind: 'option',
      tip: '瀏覽器讀不到螢幕實際尺寸，只能從解析度推測。',
      options: [
        { id: 'pnl-13', name: '13～14 吋', desc: '輕薄筆電', idle: 1.2, max: 5, rank: 2, types: ['laptop'] },
        { id: 'pnl-15', name: '15～16 吋', desc: '一般筆電', idle: 1.8, max: 7, rank: 3, types: ['laptop'] },
        { id: 'pnl-16g', name: '16 吋 高更新率／OLED', desc: '120Hz 以上或 OLED', idle: 2.5, max: 10, rank: 4, types: ['laptop'] },
        { id: 'pnl-18', name: '17～18 吋 電競螢幕', desc: '大尺寸高更新率', idle: 3.5, max: 13, rank: 5, types: ['laptop'] },
        { id: 'pnl-phone', name: '手機 6 吋級', desc: '一般尺寸手機', idle: 0.3, max: 1.8, rank: 2, types: ['mobile'] },
        { id: 'pnl-phone-l', name: '大螢幕手機 6.7 吋級', desc: 'Plus／Pro Max／Ultra', idle: 0.4, max: 2.5, rank: 3, types: ['mobile'] },
        { id: 'pnl-tab', name: '平板 11 吋級', desc: '一般平板', idle: 0.8, max: 4, rank: 3, types: ['mobile'] },
        { id: 'pnl-tab-l', name: '平板 13 吋級', desc: '大尺寸平板', idle: 1.2, max: 6, rank: 4, types: ['mobile'] }
      ],
      def: { laptop: 'pnl-15', mobile: 'pnl-phone-l' }
    },
    {
      id: 'peripheral', name: '周邊裝置', icon: 'bi-keyboard', types: PC, kind: 'option',
      tip: '透過 USB 取電的裝置，例如鍵盤、滑鼠、耳機、外接硬碟。',
      options: [
        { id: 'per-none', name: '沒有外接裝置', desc: '只用內建鍵盤與觸控板', idle: 0, max: 0, rank: 1, types: PC },
        { id: 'per-basic', name: '鍵盤＋滑鼠', desc: '一般有線或無線接收器', idle: 0.5, max: 2, rank: 2, types: PC },
        { id: 'per-game', name: '電競周邊', desc: '燈效鍵鼠、USB 耳機、搖桿', idle: 2, max: 7, rank: 3, types: PC },
        { id: 'per-many', name: '大量外接裝置', desc: '攝影機、外接硬碟、喇叭、幫手機充電', idle: 4, max: 25, rank: 4, types: PC }
      ],
      def: { desktop: 'per-basic', laptop: 'per-none', mini: 'per-basic' }
    },
    {
      id: 'charge', name: '電池充電', icon: 'bi-battery-charging', types: ['laptop', 'mobile'], kind: 'option',
      tip: '邊用邊充電時，充電器要同時供應機器與電池，最大電量會增加。',
      options: [
        { id: 'chg-none', name: '不計入充電', desc: '電池已充滿或不充電', idle: 0, max: 0, rank: 1, types: ['laptop'] },
        { id: 'chg-normal', name: '邊用邊充電', desc: '一般充電速度', idle: 0, max: 30, rank: 3, types: ['laptop'] },
        { id: 'chg-fast', name: '快速充電', desc: '支援快充的筆電', idle: 0, max: 60, rank: 4, types: ['laptop'] },
        { id: 'mchg-none', name: '不計入充電', desc: '電池已充滿或不充電', idle: 0, max: 0, rank: 1, types: ['mobile'] },
        { id: 'mchg-normal', name: '一般充電', desc: '5～10 W 充電器', idle: 0, max: 10, rank: 2, types: ['mobile'] },
        { id: 'mchg-fast', name: '快速充電', desc: '20～25 W 充電器', idle: 0, max: 25, rank: 3, types: ['mobile'] },
        { id: 'mchg-super', name: '超級快充', desc: '45 W 以上充電器', idle: 0, max: 60, rank: 5, types: ['mobile'] }
      ],
      def: { laptop: 'chg-normal', mobile: 'mchg-fast' }
    }
  ];

  const slotById = {};
  slots.forEach(function (s) { slotById[s.id] = s; });
  const typeById = {};
  types.forEach(function (t) { typeById[t.id] = t; });

  return {
    types: types,
    typeById: typeById,
    base: base,
    baseName: baseName,
    adapter: adapter,
    slots: slots,
    slotById: slotById,
    gpuMatchers: gpuMatchers
  };
})();
