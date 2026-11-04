window.MD = (function () {
  'use strict';

  const ALL = ['desktop', 'laptop', 'mini', 'mobile'];
  const PC = ['desktop', 'laptop', 'mini'];
  const LAP = ['laptop', 'mini'];
  const DESK = ['desktop'];
  const MOB = ['mobile'];

  const types = [
    { id: 'desktop', name: '桌上型電腦', icon: 'bi-pc-display', desc: '直立機殼、自己組裝的電腦' },
    { id: 'laptop', name: '筆記型電腦', icon: 'bi-laptop', desc: '筆電、輕薄筆電、電競筆電' },
    { id: 'mini', name: '迷你主機', icon: 'bi-pc', desc: 'Mac mini、NUC 等小型主機' },
    { id: 'mobile', name: '手機／平板', icon: 'bi-phone', desc: 'iPhone、Android、iPad' }
  ];

  const brands = {
    'Intel': { icon: 'bi-cpu', desc: 'Core、Core Ultra、Pentium、Celeron' },
    'AMD': { icon: 'bi-cpu', desc: 'Ryzen、Threadripper' },
    'Apple': { icon: 'bi-apple', desc: 'M 系列、A 系列晶片' },
    'Qualcomm': { icon: 'bi-cpu', desc: 'Snapdragon' },
    'MediaTek': { icon: 'bi-cpu', desc: 'Dimensity、Helio' },
    'Google': { icon: 'bi-google', desc: 'Pixel 手機的 Tensor' },
    'Samsung': { icon: 'bi-cpu', desc: 'Galaxy 的 Exynos' },
    '其他': { icon: 'bi-question-circle', desc: '不確定或其他品牌' },
    '內建顯示': { icon: 'bi-cpu', desc: '沒有另外裝顯示卡，用處理器內建的' },
    '筆電獨立顯示': { icon: 'bi-laptop', desc: '筆電裡的 NVIDIA／AMD 顯示晶片' },
    'NVIDIA': { icon: 'bi-gpu-card', desc: 'GeForce RTX、GTX' },
    'AMD Radeon': { icon: 'bi-gpu-card', desc: 'Radeon RX' },
    'Intel Arc': { icon: 'bi-gpu-card', desc: 'Arc A／B 系列' }
  };

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
    desktop: { idle: 0.77, load: 0.85 },
    laptop: { idle: 0.8, load: 0.88 },
    mini: { idle: 0.8, load: 0.87 },
    mobile: { idle: 0.75, load: 0.85 }
  };

  function o(id, brand, name, desc, idle, max, rank, ts, group) {
    return { id: id, brand: brand, group: group || '', name: name, desc: desc, idle: idle, max: max, rank: rank, types: ts };
  }

  const cpuOptions = [
    o('dcpu-pg', 'Intel', 'Pentium／Celeron', 'G6900、G7400 等入門款', 4, 46, 1, DESK),
    o('dcpu-i3', 'Intel', 'Core i3', 'i3-12100、13100、14100', 6, 65, 2, DESK),
    o('dcpu-i5', 'Intel', 'Core i5（型號沒有 K）', 'i5-12400、13400、14400', 8, 120, 3, DESK),
    o('dcpu-i5k', 'Intel', 'Core i5 K 版／Core Ultra 5', 'i5-13600K、14600K、Ultra 5 245K', 10, 181, 4, DESK),
    o('dcpu-i7', 'Intel', 'Core i7／Core Ultra 7', 'i7-12700、13700K、14700K、Ultra 7 265K', 12, 253, 4, DESK),
    o('dcpu-i9', 'Intel', 'Core i9／Core Ultra 9', 'i9-12900K、13900K、14900K、Ultra 9 285K', 14, 253, 5, DESK),
    o('dcpu-xeon', 'Intel', 'Xeon W 工作站', 'Xeon W-2400、W-3400', 60, 350, 5, DESK),
    o('dcpu-r3', 'AMD', 'Ryzen 3', '3200G、4100、8300G', 6, 65, 2, DESK),
    o('dcpu-r5', 'AMD', 'Ryzen 5', '5600、7600、8600G、9600X', 9, 88, 3, DESK),
    o('dcpu-r7', 'AMD', 'Ryzen 7', '5700X、7700X、9700X', 15, 142, 4, DESK),
    o('dcpu-r7x', 'AMD', 'Ryzen 7 X3D', '5800X3D、7800X3D、9800X3D', 18, 162, 4, DESK),
    o('dcpu-r9', 'AMD', 'Ryzen 9', '5950X、7950X、9950X', 25, 230, 5, DESK),
    o('dcpu-tr', 'AMD', 'Threadripper', '7960X、7980X', 60, 350, 5, DESK),
    o('lcpu-in', 'Intel', 'N 系列／Celeron', 'N100、N150、N200、Celeron', 1, 15, 2, LAP),
    o('lcpu-iu', 'Intel', 'Core U／Core Ultra U、V', 'i5-1235U、Ultra 5 125U、Ultra 7 258V', 1.5, 28, 3, LAP),
    o('lcpu-ih', 'Intel', 'Core H／Core Ultra H', 'i7-13700H、Ultra 7 155H、Ultra 9 285H', 3, 65, 4, LAP),
    o('lcpu-ihx', 'Intel', 'Core HX 電競款', 'i9-14900HX、Ultra 9 275HX', 5, 140, 5, LAP),
    o('lcpu-au', 'AMD', 'Ryzen U 系列', '5500U、7530U、7640U、8640U', 1.5, 28, 3, LAP),
    o('lcpu-ah', 'AMD', 'Ryzen HS／H 系列', '6800H、7840HS、8845HS', 3, 65, 4, LAP),
    o('lcpu-ai200', 'AMD', 'Ryzen AI 200 系列', 'Ryzen AI 5 230、AI 7 250、AI 7 260', 2.5, 54, 4, LAP),
    o('lcpu-ai300', 'AMD', 'Ryzen AI 300 系列', 'Ryzen AI 5 340、AI 7 350、AI 9 365、AI 9 HX 370／375', 2, 54, 4, LAP),
    o('lcpu-aimax', 'AMD', 'Ryzen AI Max 系列', 'Ryzen AI Max 385、AI Max 390、AI Max+ 395（含強力內建顯示）', 6, 120, 5, LAP),
    o('lcpu-ahx', 'AMD', 'Ryzen HX 電競款', '7945HX、9955HX', 5, 140, 5, LAP),
    o('lcpu-snap', 'Qualcomm', 'Snapdragon X', 'X Elite、X Plus（含內建顯示）', 1, 30, 4, LAP),
    o('apple-m', 'Apple', 'Apple M', 'M1、M2、M3、M4（含內建顯示）', 1.5, 25, 4, PC),
    o('apple-pro', 'Apple', 'Apple M Pro', 'M1 Pro～M4 Pro（含內建顯示）', 3, 60, 4, PC),
    o('apple-max', 'Apple', 'Apple M Max', 'M1 Max～M4 Max（含內建顯示）', 5, 100, 5, PC),
    o('apple-ultra', 'Apple', 'Apple M Ultra', 'M1 Ultra～M3 Ultra（含內建顯示）', 10, 215, 5, ['desktop', 'mini']),
    o('soc-apple-a', 'Apple', 'Apple A 系列', 'iPhone、iPad 標準版／mini', 0.3, 9, 4, MOB),
    o('soc-apple-m', 'Apple', 'Apple M 系列', 'iPad Air、iPad Pro', 0.5, 20, 5, MOB),
    o('soc-sd4', 'Qualcomm', 'Snapdragon 4 系列', '入門手機', 0.3, 4, 2, MOB),
    o('soc-sd7', 'Qualcomm', 'Snapdragon 6／7 系列', '中階手機', 0.35, 7, 3, MOB),
    o('soc-sd8', 'Qualcomm', 'Snapdragon 8 系列', '旗艦手機', 0.4, 12, 5, MOB),
    o('soc-helio', 'MediaTek', 'Helio 系列', '入門手機', 0.3, 4, 2, MOB),
    o('soc-dim7', 'MediaTek', 'Dimensity 6000～8000', '中階手機', 0.35, 7, 3, MOB),
    o('soc-dim9', 'MediaTek', 'Dimensity 9000 系列', '旗艦手機', 0.4, 12, 5, MOB),
    o('soc-tensor', 'Google', 'Google Tensor', 'Pixel 6 以後', 0.4, 11, 4, MOB),
    o('soc-exynos', 'Samsung', 'Exynos', 'Galaxy 部分機型', 0.4, 11, 4, MOB),
    o('soc-other', '其他', '不確定是哪一款', '以中階晶片估算', 0.35, 7, 2, MOB)
  ];

  const gpuRows = [
    ['NVIDIA', 'RTX 50 系列', [
      ['rtx 5090', 'GeForce RTX 5090', 30, 575, 5],
      ['rtx 5080', 'GeForce RTX 5080', 20, 360, 5],
      ['rtx 5070 ti', 'GeForce RTX 5070 Ti', 18, 300, 5],
      ['rtx 5070', 'GeForce RTX 5070', 15, 250, 4],
      ['rtx 5060 ti', 'GeForce RTX 5060 Ti', 12, 180, 4],
      ['rtx 5060', 'GeForce RTX 5060', 10, 145, 4]
    ]],
    ['NVIDIA', 'RTX 40 系列', [
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
    ['NVIDIA', 'RTX 30 系列', [
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
    ['NVIDIA', 'RTX 20／GTX 16 系列', [
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
    ['NVIDIA', 'GTX 10 系列', [
      ['gtx 1080 ti', 'GeForce GTX 1080 Ti', 12, 250, 3],
      ['gtx 1080', 'GeForce GTX 1080', 10, 180, 3],
      ['gtx 1070 ti', 'GeForce GTX 1070 Ti', 10, 180, 3],
      ['gtx 1070', 'GeForce GTX 1070', 9, 150, 3],
      ['gtx 1060', 'GeForce GTX 1060', 8, 120, 2],
      ['gtx 1050 ti', 'GeForce GTX 1050 Ti', 6, 75, 2],
      ['gtx 1050', 'GeForce GTX 1050', 6, 75, 2],
      ['gt 1030', 'GeForce GT 1030', 4, 30, 2]
    ]],
    ['AMD Radeon', 'RX 9000 系列', [
      ['rx 9070 xt', 'Radeon RX 9070 XT', 15, 304, 5],
      ['rx 9070', 'Radeon RX 9070', 13, 220, 4],
      ['rx 9060 xt', 'Radeon RX 9060 XT', 10, 160, 4]
    ]],
    ['AMD Radeon', 'RX 7000 系列', [
      ['rx 7900 xtx', 'Radeon RX 7900 XTX', 20, 355, 5],
      ['rx 7900 xt', 'Radeon RX 7900 XT', 18, 315, 5],
      ['rx 7900 gre', 'Radeon RX 7900 GRE', 16, 260, 4],
      ['rx 7800 xt', 'Radeon RX 7800 XT', 14, 263, 4],
      ['rx 7700 xt', 'Radeon RX 7700 XT', 12, 245, 4],
      ['rx 7600 xt', 'Radeon RX 7600 XT', 9, 190, 3],
      ['rx 7600', 'Radeon RX 7600', 8, 165, 3]
    ]],
    ['AMD Radeon', 'RX 6000 系列', [
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
      ['rx 6400', 'Radeon RX 6400', 5, 53, 2]
    ]],
    ['AMD Radeon', 'RX 5000 與更早', [
      ['rx 5700 xt', 'Radeon RX 5700 XT', 9, 225, 3],
      ['rx 5700', 'Radeon RX 5700', 8, 180, 3],
      ['rx 5600 xt', 'Radeon RX 5600 XT', 8, 150, 3],
      ['rx 5500 xt', 'Radeon RX 5500 XT', 6, 130, 2],
      ['vega 64', 'Radeon RX Vega 64', 15, 295, 3],
      ['vega 56', 'Radeon RX Vega 56', 13, 210, 3],
      ['rx 590', 'Radeon RX 590', 10, 225, 2],
      ['rx 580', 'Radeon RX 580', 9, 185, 2],
      ['rx 570', 'Radeon RX 570', 8, 150, 2],
      ['rx 560', 'Radeon RX 560', 6, 80, 2]
    ]],
    ['Intel Arc', 'Arc 系列', [
      ['arc b580', 'Arc B580', 12, 190, 3],
      ['arc b570', 'Arc B570', 11, 150, 3],
      ['arc a770', 'Arc A770', 30, 225, 3],
      ['arc a750', 'Arc A750', 30, 225, 3],
      ['arc a580', 'Arc A580', 25, 185, 3],
      ['arc a380', 'Arc A380', 15, 75, 2]
    ]]
  ];

  const gpuOptions = [
    o('igpu-intel', '內建顯示', 'Intel 內建顯示', 'UHD、Iris Xe、Arc 內顯', 0.5, 8, 2, PC),
    o('igpu-amd', '內建顯示', 'AMD 內建顯示', 'Radeon Graphics、680M、780M、880M、890M、8060S', 0.5, 10, 2, PC),
    o('igpu-apple', '內建顯示', 'Apple 晶片內建', '功耗已算在 Apple 晶片裡', 0, 0, 3, PC),
    o('igpu-soc', '內建顯示', 'Snapdragon 內建', '功耗已算在處理器裡', 0, 0, 2, PC),
    o('lgpu-low', '筆電獨立顯示', '入門款', 'RTX 2050、3050、4050、5050、GTX 1650', 3, 75, 3, LAP),
    o('lgpu-mid', '筆電獨立顯示', '中階款', 'RTX 3060、4060、4070、5060、5070', 4, 115, 4, LAP),
    o('lgpu-high', '筆電獨立顯示', '高階款', 'RTX 3080、4080、4090、5080、5090', 6, 175, 5, LAP),
    o('lgpu-amd', '筆電獨立顯示', 'AMD 筆電獨顯', 'Radeon RX 6000M、7000M、7000S', 4, 100, 4, LAP)
  ];

  gpuRows.forEach(function (row) {
    row[2].forEach(function (g) {
      const x = o('gpu-' + g[0].replace(/\s+/g, '-'), row[0], g[1], '整張顯示卡功耗約 ' + g[3] + ' W', g[2], g[3], g[4], ['desktop', 'mini'], row[1]);
      x.key = g[0];
      gpuOptions.push(x);
    });
  });

  const slots = [
    {
      id: 'cpu', name: '處理器', names: { mobile: '處理器晶片' }, icon: 'bi-cpu', types: ALL, kind: 'option', search: true,
      qs: ['處理器是哪個品牌？', '是哪一款處理器？'],
      help: {
        desktop: 'Windows：按「開始」→「設定」→「系統」→「關於」，看「處理器」那一行。Mac：左上角蘋果選單 →「關於這台 Mac」。',
        laptop: 'Windows：按「開始」→「設定」→「系統」→「關於」，看「處理器」那一行。Mac：左上角蘋果選單 →「關於這台 Mac」。',
        mini: 'Windows：按「開始」→「設定」→「系統」→「關於」，看「處理器」那一行。Mac：左上角蘋果選單 →「關於這台 Mac」。',
        mobile: 'Android：設定 →「關於手機」或「手機資訊」。iPhone／iPad：可以用型號查詢，例如 iPhone 15 是 A16。'
      },
      ph: '搜尋型號，例如 13700、Ryzen 7、N100、M3',
      options: cpuOptions
    },
    {
      id: 'gpu', name: '顯示卡', icon: 'bi-gpu-card', types: PC, kind: 'option', search: true,
      qs: ['顯示卡是哪一種？', '是哪個系列？', '是哪一張顯示卡？'],
      help: 'Windows：按 Ctrl＋Shift＋Esc 開啟工作管理員 →「效能」→ 最下面的「GPU」，右上角就是顯示卡型號。有兩個 GPU 時，選型號比較大的那一張。',
      ph: '搜尋型號，例如 4070、7800 XT、Arc',
      options: gpuOptions
    },
    {
      id: 'ram', name: '記憶體', icon: 'bi-memory', types: PC, kind: 'counter',
      qs: ['裝了幾條記憶體？'],
      help: 'Windows：工作管理員 →「效能」→「記憶體」，右下角「已使用的插槽」例如 2／4 就是 2 條，「外型規格」會寫 DIMM 或 SODIMM。筆電或 Mac 的記憶體多半焊在主機板上，請用「板載記憶體」依容量填份數（16 GB 填 2）。',
      items: [
        { id: 'ddr4', name: 'DDR4 記憶體條', short: 'DDR4', idle: 1, max: 3, limit: 8 },
        { id: 'ddr5', name: 'DDR5 記憶體條', short: 'DDR5', idle: 1.2, max: 4.5, limit: 8 },
        { id: 'onboard', name: '板載記憶體（每 8 GB 算一份）', short: '板載 8GB', idle: 0.3, max: 1.2, limit: 16 }
      ]
    },
    {
      id: 'storage', name: '儲存裝置', icon: 'bi-device-ssd', types: PC, kind: 'counter',
      qs: ['裝了哪些硬碟？'],
      help: '工作管理員 →「效能」裡每一個「磁碟」就是一顆，名稱下方會寫 SSD (NVMe)、SSD 或 HDD。',
      items: [
        { id: 'nvme', name: 'M.2 NVMe SSD', short: 'NVMe', idle: 0.8, max: 7, limit: 8 },
        { id: 'sata', name: '2.5 吋 SATA SSD', short: 'SATA SSD', idle: 0.5, max: 3.5, limit: 8 },
        { id: 'hdd', name: '3.5 吋 傳統硬碟', short: '3.5" HDD', idle: 5, max: 10, limit: 12 },
        { id: 'hdd25', name: '2.5 吋 傳統硬碟', short: '2.5" HDD', idle: 1, max: 2.5, limit: 8 }
      ]
    },
    {
      id: 'board', name: '主機板', icon: 'bi-motherboard', types: DESK, kind: 'option',
      qs: ['主機板是哪種尺寸？'],
      help: '不確定的話看機殼大小：鞋盒大小的小機殼多半是 Mini-ITX，一般直立機殼多半是 ATX 或 Micro-ATX。',
      options: [
        o('brd-itx', '', 'Mini-ITX', '小機殼、只有一個顯示卡插槽', 10, 20, 2, DESK),
        o('brd-matx', '', 'Micro-ATX', 'B 系列晶片組常見規格', 14, 28, 3, DESK),
        o('brd-atx', '', 'ATX', '一般中塔機殼', 18, 35, 3, DESK),
        o('brd-high', '', '高階 ATX／E-ATX', 'Z、X 晶片組，多個 M.2、10G 網路', 25, 50, 4, DESK)
      ]
    },
    {
      id: 'cooling', name: '散熱與燈效', icon: 'bi-fan', types: DESK, kind: 'counter',
      qs: ['有幾個風扇和燈效？'],
      help: '數一數機殼裡會轉的風扇，包含處理器散熱器上的風扇；用水冷的話加一個水冷泵。',
      items: [
        { id: 'fan', name: '風扇（處理器＋機殼）', short: '風扇', idle: 0.5, max: 2.5, limit: 16 },
        { id: 'pump', name: '水冷泵', short: '水冷泵', idle: 2, max: 6, limit: 2 },
        { id: 'rgb', name: 'RGB 燈條／燈效元件', short: 'RGB', idle: 1, max: 5, limit: 12 }
      ]
    },
    {
      id: 'psu', name: '電源供應器', icon: 'bi-plug', types: DESK, kind: 'option', role: 'eff',
      qs: ['電源供應器是哪種認證？'],
      help: '電源供應器側面的貼紙會印 80 PLUS 標章。看不到可以略過，會以銅牌的效率估算。',
      options: [
        { id: 'psu-none', name: '無認證', desc: '沒有 80 PLUS 標章', eff: 0.78, rank: 1, types: DESK },
        { id: 'psu-white', name: '80 PLUS 白牌', desc: '基本認證', eff: 0.82, rank: 2, types: DESK },
        { id: 'psu-bronze', name: '80 PLUS 銅牌', desc: '最常見', eff: 0.85, rank: 3, types: DESK },
        { id: 'psu-gold', name: '80 PLUS 金牌', desc: '中高階常見', eff: 0.89, rank: 4, types: DESK },
        { id: 'psu-plat', name: '80 PLUS 白金牌', desc: '高效率', eff: 0.91, rank: 5, types: DESK },
        { id: 'psu-ti', name: '80 PLUS 鈦金牌', desc: '頂級效率', eff: 0.93, rank: 5, types: DESK }
      ]
    },
    {
      id: 'peripheral', name: '周邊裝置', icon: 'bi-keyboard', types: PC, kind: 'option',
      qs: ['接了哪些周邊裝置？'],
      help: '透過 USB 接在電腦上、由電腦供電的裝置，例如鍵盤、滑鼠、耳機、外接硬碟。',
      options: [
        o('per-none', '', '沒有外接裝置', '只用內建鍵盤與觸控板', 0, 0, 1, PC),
        o('per-basic', '', '鍵盤＋滑鼠', '一般有線或無線接收器', 0.5, 2, 2, PC),
        o('per-game', '', '電競周邊', '燈效鍵鼠、USB 耳機、搖桿', 2, 7, 3, PC),
        o('per-many', '', '大量外接裝置', '攝影機、外接硬碟、喇叭、幫手機充電', 4, 25, 4, PC)
      ]
    },
    {
      id: 'charge', name: '電池充電', icon: 'bi-battery-charging', types: ['laptop', 'mobile'], kind: 'option',
      qs: ['使用時會同時充電嗎？'],
      help: '邊用邊充電時，充電器要同時供應機器和電池，最大電量會增加。想知道充電器要多大，建議選會充電的選項。',
      options: [
        o('chg-none', '', '不會', '電池已充滿或不充電', 0, 0, 1, ['laptop']),
        o('chg-normal', '', '邊用邊充電', '一般充電速度', 0, 30, 3, ['laptop']),
        o('chg-fast', '', '快速充電', '支援快充的筆電', 0, 60, 4, ['laptop']),
        o('mchg-none', '', '不會', '電池已充滿或不充電', 0, 0, 1, MOB),
        o('mchg-normal', '', '一般充電', '5～10 W 充電器', 0, 10, 2, MOB),
        o('mchg-fast', '', '快速充電', '20～25 W 充電器', 0, 25, 3, MOB),
        o('mchg-super', '', '超級快充', '45 W 以上充電器', 0, 60, 5, MOB)
      ]
    }
  ];

  const slotById = {};
  slots.forEach(function (s) { slotById[s.id] = s; });
  const typeById = {};
  types.forEach(function (t) { typeById[t.id] = t; });

  return {
    types: types,
    typeById: typeById,
    brands: brands,
    base: base,
    baseName: baseName,
    adapter: adapter,
    slots: slots,
    slotById: slotById
  };
})();
