<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Otel Yerden Isıtma & Kollektör Takip Paneli (101-120)</title>
  <script src="https://cdn.tailwindcss.com/3.4.17"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
    }
    .valve-pulse {
      animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse-ring {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.65; }
    }
    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: #1e293b;
    }
    ::-webkit-scrollbar-thumb {
      background: #475569;
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #64748b;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col selection:bg-amber-500 selection:text-slate-950">

  <!-- Top Header -->
  <header class="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 sm:px-6">
    <div class="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-lg sm:text-xl font-bold tracking-tight text-white">Otel Yerden Isıtma Takip Paneli</h1>
            <span class="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              101 – 120 (20 Oda)
            </span>
          </div>
          <p class="text-xs text-slate-400">Oda bazlı 2 Ana Vana ve 5 Kollektör (Hat) anlık durum ve vardiya kontrol sistemi</p>
        </div>
      </div>

      <!-- Top Action Buttons -->
      <div class="flex flex-wrap items-center gap-2">
        <button id="btnOpenBulkModal" type="button" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">
          <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Toplu İşlem
        </button>
        <button id="btnOpenLogDrawer" type="button" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">
          <svg class="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Hareket Kayıtları
          <span id="logCountBadge" class="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/20 text-sky-300 font-semibold">0</span>
        </button>
        <button id="btnExportCsv" type="button" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Rapor İndir (CSV)
        </button>
        <button id="btnResetDemo" type="button" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800/60 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/50 transition" title="Varsayılan verilere sıfırla">
          Sıfırla
        </button>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 py-5 sm:px-6 space-y-5">

    <!-- KPI Summary Cards -->
    <section class="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-slate-400">
          <span>Toplam Oda</span>
          <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">101-120</span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <span id="statTotalRooms" class="text-2xl font-bold text-white">20</span>
          <span id="statOccupiedRooms" class="text-xs text-emerald-400">14 Dolu • 6 Boş</span>
        </div>
      </div>

      <div class="bg-slate-900 border border-orange-500/20 rounded-xl p-3.5 flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-orange-300/90">
          <span>Tam Isıtan Odalar</span>
          <span class="w-2 h-2 rounded-full bg-orange-500"></span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <span id="statFullHeat" class="text-2xl font-bold text-orange-400">0</span>
          <span class="text-xs text-slate-400">2 Vana + 5/5 Kollektör</span>
        </div>
      </div>

      <div class="bg-slate-900 border border-amber-500/20 rounded-xl p-3.5 flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-amber-300/90">
          <span>Kısmi / Kısık Isıtma</span>
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <span id="statPartialHeat" class="text-2xl font-bold text-amber-400">0</span>
          <span class="text-xs text-slate-400">Kollektör/Vana Kısık</span>
        </div>
      </div>

      <div class="bg-slate-900 border border-rose-500/20 rounded-xl p-3.5 flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-rose-300/90">
          <span>Ana Vanası Kapalı</span>
          <span class="w-2 h-2 rounded-full bg-rose-500"></span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <span id="statClosedRooms" class="text-2xl font-bold text-rose-400">0</span>
          <span class="text-xs text-slate-400">Isı Akışı Kesik (%0)</span>
        </div>
      </div>

      <div class="col-span-2 lg:col-span-1 bg-slate-900 border border-sky-500/20 rounded-xl p-3.5 flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-sky-300/90">
          <span>Aktif Kollektör Oranı</span>
          <span id="statAvgPowerPct" class="text-xs font-semibold text-sky-400">%0</span>
        </div>
        <div class="mt-2">
          <div class="flex items-baseline justify-between mb-1">
            <span id="statActiveCollectors" class="text-xl font-bold text-white">0 / 100</span>
            <span class="text-[11px] text-slate-400">Su Geçen Hat</span>
          </div>
          <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div id="statCollectorBar" class="h-full bg-gradient-to-r from-sky-500 to-orange-500 transition-all duration-300" style="width: 0%"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Filter, Search & Legend Toolbar -->
    <section class="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <!-- Filter Tabs -->
      <div class="flex flex-wrap items-center gap-1.5" id="filterButtonsContainer">
        <button type="button" data-filter="all" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-medium transition bg-amber-500 text-slate-950 font-semibold">
          Tümü (20)
        </button>
        <button type="button" data-filter="full" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-medium transition bg-slate-800 text-slate-300 hover:bg-slate-700">
          Tam Açık (5/5)
        </button>
        <button type="button" data-filter="partial" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-medium transition bg-slate-800 text-slate-300 hover:bg-slate-700">
          Kollektörü Kısık Olanlar
        </button>
        <button type="button" data-filter="main_closed" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-medium transition bg-slate-800 text-slate-300 hover:bg-slate-700">
          Ana Vanası Kapalı
        </button>
        <button type="button" data-filter="mismatch" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-medium transition bg-slate-800 text-slate-300 hover:bg-slate-700" title="Ana vana kapalı olduğu halde kollektör mandalları açık unutulanlar veya tam tersi">
          Dikkat / Uyarı
        </button>
      </div>

      <!-- Search & View Controls -->
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative flex-1 sm:w-56">
          <svg class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input id="searchInput" type="text" placeholder="Oda no (örn: 101) veya not ara..." class="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500" />
        </div>

        <select id="occupancyFilter" class="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500">
          <option value="all">Tüm Doluluk Durumları</option>
          <option value="occupied">Sadece Dolu Odalar</option>
          <option value="empty">Sadece Boş Odalar</option>
        </select>
      </div>
    </section>

    <!-- Quick Interactive Guide Bar -->
    <div class="bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
      <div class="flex flex-wrap items-center gap-4">
        <span class="font-medium text-slate-300">Nasıl Çalışır?</span>
        <span class="inline-flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
          <strong>Ana Vana 1 & 2:</strong> Gidiş/Dönüş ana hatları. İkisinden biri kapanırsa odaya sıcak su girişi kesilir veya düşer.
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block"></span>
          <strong>K1 – K5 Kollektörler:</strong> Oda içi 5 ayrı yerden ısıtma döngüsü. Tıklayarak tek tek açıp kapatabilirsiniz.
        </span>
      </div>
      <span class="text-[11px] text-amber-400/90">İpucu: Kart üzerindeki Vana ve Kollektör kutularına doğrudan tıklayarak durumu değiştirebilirsiniz.</span>
    </div>

    <!-- Rooms Grid (101 - 120) -->
    <section id="roomsGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Rendered dynamically by JS -->
    </section>

    <!-- Empty State when Filtered -->
    <div id="emptyState" class="hidden bg-slate-900 border border-slate-800 rounded-xl p-10 text-center space-y-3">
      <p class="text-sm text-slate-300 font-medium">Seçilen filtreye uygun oda bulunamadı.</p>
      <button id="btnClearFilters" type="button" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition">
        Filtreleri Temizle
      </button>
    </div>

  </main>

  <!-- Room Detail & Note Modal -->
  <div id="roomDetailModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
      <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 id="modalRoomTitle" class="text-base font-bold text-white">Oda 101 Detaylı Vana & Kollektör Ayarı</h2>
          <p id="modalRoomSubtitle" class="text-xs text-slate-400">Son işlem: --</p>
        </div>
        <button id="btnCloseDetailModal" type="button" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
        <!-- Occupancy & Quick Preset -->
        <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400">Oda Durumu:</span>
            <button id="modalToggleOccupancy" type="button" class="px-2.5 py-1 rounded-md text-xs font-semibold transition"></button>
          </div>
          <div class="flex items-center gap-1.5">
            <button id="modalPresetFull" type="button" class="px-2.5 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/30 transition">
              Tam Aç (2V + 5K)
            </button>
            <button id="modalPresetEco" type="button" class="px-2.5 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition">
              Kısık Mod (3/5 K)
            </button>
            <button id="modalPresetOff" type="button" class="px-2.5 py-1 rounded text-xs font-medium bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition">
              Ana Vanayı Kapat
            </button>
          </div>
        </div>

        <!-- 2 Main Valves -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Ana Vanalar (2 Adet - Oda Ana Giriş & Dönüş)
          </label>
          <div id="modalMainValvesContainer" class="grid grid-cols-2 gap-3">
            <!-- Populated by JS -->
          </div>
          <p class="mt-1.5 text-[11px] text-slate-400">
            Not: Ana vanalardan biri veya ikisi kapatıldığında kollektörler açık kalsa dahi sıcak su devirdaimi kesilir.
          </p>
        </div>

        <!-- 5 Collectors -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Kollektör Hatları (5 Adet)
            </label>
            <span id="modalCollectorSummary" class="text-xs font-medium text-amber-400">5/5 Açık</span>
          </div>
          <div id="modalCollectorsContainer" class="space-y-2">
            <!-- Populated by JS -->
          </div>
        </div>

        <!-- Technician Note -->
        <div>
          <label for="modalRoomNote" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Teknik Servis / Resepsiyon Notu
          </label>
          <textarea id="modalRoomNote" rows="2" placeholder="Örn: Müşteri çok sıcak dediği için 2 kollektör kapatıldı..." class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"></textarea>
        </div>
      </div>

      <div class="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
        <button id="btnSaveRoomModal" type="button" class="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition">
          Notu Kaydet & Kapat
        </button>
      </div>
    </div>
  </div>

  <!-- Bulk Operations Modal -->
  <div id="bulkModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
      <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <h2 class="text-base font-bold text-white">Toplu Vana & Kollektör İşlemleri</h2>
        <button id="btnCloseBulkModal" type="button" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="p-5 space-y-3">
        <p class="text-xs text-slate-400">Aşağıdaki hazır senaryolarla tüm odaları (101–120) veya sadece boş odaları tek tıkla ayarlayabilirsiniz:</p>

        <button id="bulkAllFull" type="button" class="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between transition">
          <div>
            <div class="text-xs font-semibold text-orange-400">Tüm Odaları Tam Isıtmaya Al (101-120)</div>
            <div class="text-[11px] text-slate-400">2 Ana Vana Açık + 5/5 Kollektör Açık (%100)</div>
          </div>
          <span class="text-xs font-bold text-orange-400">Uygula →</span>
        </button>

        <button id="bulkEmptyEco" type="button" class="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between transition">
          <div>
            <div class="text-xs font-semibold text-amber-400">Boş Odalarda 2 Kollektörü Kapat (Tasarruf)</div>
            <div class="text-[11px] text-slate-400">Boş odalarda Ana Vanalar Açık, 3/5 Kollektör Açık (%60)</div>
          </div>
          <span class="text-xs font-bold text-amber-400">Uygula →</span>
        </button>

        <button id="bulkEmptyMainOff" type="button" class="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between transition">
          <div>
            <div class="text-xs font-semibold text-rose-400">Boş Odaların Ana Vanalarını Kapat</div>
            <div class="text-[11px] text-slate-400">Boş odalarda 2 Ana Vana Kapatılır (%0 Isı)</div>
          </div>
          <span class="text-xs font-bold text-rose-400">Uygula →</span>
        </button>

        <button id="bulkAllMainOff" type="button" class="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between transition">
          <div>
            <div class="text-xs font-semibold text-slate-300">Tüm Otelin Ana Vanalarını Kapat (Sezon Sonu/Bakım)</div>
            <div class="text-[11px] text-slate-400">101-120 tüm ana vanaları kapatır</div>
          </div>
          <span class="text-xs font-bold text-slate-400">Uygula →</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Activity Log Drawer -->
  <div id="logDrawer" class="fixed inset-0 z-50 hidden justify-end bg-slate-950/75 backdrop-blur-sm">
    <div class="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl">
      <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-white">Vana & Kollektör Hareket Kayıtları</h2>
          <p class="text-xs text-slate-400">Kim, hangi odada hangi vanayı/kollektörü açtı veya kapattı</p>
        </div>
        <button id="btnCloseLogDrawer" type="button" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div id="logListContainer" class="flex-1 overflow-y-auto p-4 space-y-2.5">
        <!-- Populated by JS -->
      </div>
      <div class="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
        <button id="btnClearLogs" type="button" class="text-xs text-rose-400 hover:text-rose-300 font-medium">
          Kayıtları Temizle
        </button>
        <span class="text-[11px] text-slate-500">Tarayıcı hafızasına otomatik kaydedilir</span>
      </div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toastContainer" class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"></div>

  <script>
    (function () {
      const STORAGE_KEY = 'otel_yerden_isitma_v1';
      const LOG_STORAGE_KEY = 'otel_yerden_isitma_logs_v1';

      const COLLECTOR_LABELS = [
        'K1 (Yatak Odası)',
        'K2 (Cam Önü)',
        'K3 (Oturma Alanı)',
        'K4 (Koridor/Giriş)',
        'K5 (Banyo)'
      ];

      // Create realistic initial state for rooms 101 to 120 matching user's exact scenario
      function createDefaultRooms() {
        const rooms = [];
        for (let num = 101; num <= 120; num++) {
          let mainValves = [true, true];
          let collectors = [true, true, true, true, true];
          let occupied = true;
          let note = '';

          if (num === 101) {
            // Exact scenario from user prompt: 2 main valves open, 2 collectors closed to reduce heat
            mainValves = [true, true];
            collectors = [true, true, true, false, false];
            occupied = true;
            note = 'Müşteri oda çok sıcak dediği için 2 kollektör kapatıldı, ana vanalar açık.';
          } else if (num === 102) {
            // Main valves closed, collectors still open physically
            mainValves = [false, false];
            collectors = [true, true, true, true, true];
            occupied = false;
            note = 'Oda boş olduğu için ana vanalar kapatıldı (kollektör mandalları açık konumda).';
          } else if (num === 105 || num === 108 || num === 114) {
            // Partial collectors open
            mainValves = [true, true];
            collectors = [true, true, false, true, false];
            occupied = true;
            note = 'Ilık mod: Cam önü ve banyo açık, 2 hat kısıldı.';
          } else if (num === 110 || num === 115 || num === 119) {
            // Main valves completely closed
            mainValves = [false, false];
            collectors = [false, false, false, false, false];
            occupied = false;
            note = 'Oda boş - Ana vanalar ve kollektörler kapalı.';
          } else if (num === 112) {
            // 1 Main valve closed (e.g. return valve throttled/closed)
            mainValves = [true, false];
            collectors = [true, true, true, true, false];
            occupied = true;
            note = '2. Ana vana kapalı! Devirdaim zayıf olabilir, kontrol edilmeli.';
          } else if (num === 117 || num === 120) {
            mainValves = [true, true];
            collectors = [true, true, true, true, false];
            occupied = false;
            note = 'Yarın giriş var, ön ısıtma (4/5 kollektör açık).';
          }

          rooms.push({
            id: num,
            mainValves: mainValves, // [Vana 1, Vana 2]
            collectors: collectors, // [K1, K2, K3, K4, K5]
            occupied: occupied,
            note: note,
            updatedAt: 'Bugün 11:30'
          });
        }
        return rooms;
      }

      let rooms = [];
      let logs = [];
      let activeFilter = 'all';
      let occupancyFilter = 'all';
      let searchQuery = '';
      let activeModalRoomId = null;

      function loadState() {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            rooms = JSON.parse(saved);
          } else {
            rooms = createDefaultRooms();
          }
          const savedLogs = localStorage.getItem(LOG_STORAGE_KEY);
          if (savedLogs) {
            logs = JSON.parse(savedLogs);
          } else {
            logs = [
              { time: '11:35', room: 101, msg: 'Kollektör 4 ve 5 kapatıldı (Ana vanalar açık, 3/5 aktif)' },
              { time: '11:20', room: 102, msg: 'Ana Vana 1 ve 2 kapatıldı (Isı kesildi)' },
              { time: '10:50', room: 112, msg: 'Ana Vana 2 kapatıldı (Tek ana vana açık uyarısı)' }
            ];
          }
        } catch (e) {
          rooms = createDefaultRooms();
          logs = [];
        }
      }

      function saveState() {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
          localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
        } catch (e) {
          // Ignore storage errors in sandboxed iframes
        }
      }

      function getNowTimeStr() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        return hh + ':' + mm;
      }

      function addLog(roomId, msg) {
        const time = getNowTimeStr();
        logs.unshift({ time: time, room: roomId, msg: msg });
        if (logs.length > 100) logs.pop();
        saveState();
        renderLogs();
      }

      function showToast(text) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'bg-slate-800 border border-amber-500/40 text-slate-100 px-3.5 py-2 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 transition-all duration-300';
        toast.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span><span>' + text + '</span>';
        container.appendChild(toast);
        setTimeout(function () {
          toast.style.opacity = '0';
          setTimeout(function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
          }, 300);
        }, 2400);
      }

      // Compute room heating metrics
      function getRoomMetrics(room) {
        const openMainCount = room.mainValves.filter(Boolean).length;
        const openCollectorCount = room.collectors.filter(Boolean).length;
        const bothMainOpen = openMainCount === 2;
        const allMainClosed = openMainCount === 0;
        const oneMainClosed = openMainCount === 1;

        // Effective heating power:
        // If both main valves open -> each collector is 20%
        // If only 1 main valve open -> restricted/blocked return or half flow (warn user)
        // If 0 main valves open -> 0% effective heating regardless of collector knobs
        let effectivePct = 0;
        if (bothMainOpen) {
          effectivePct = openCollectorCount * 20;
        } else if (oneMainClosed) {
          effectivePct = Math.round(openCollectorCount * 10);
        } else {
          effectivePct = 0;
        }

        // Status category
        let statusKey = 'partial';
        let statusLabel = 'Kısmi Isıtma';
        let statusColor = 'amber';

        if (!bothMainOpen && openMainCount === 0) {
          statusKey = 'main_closed';
          statusLabel = 'Ana Vana Kapalı (Isı Yok)';
          statusColor = 'rose';
        } else if (oneMainClosed) {
          statusKey = 'partial';
          statusLabel = 'Tek Ana Vana Kapalı!';
          statusColor = 'rose';
        } else if (bothMainOpen && openCollectorCount === 5) {
          statusKey = 'full';
          statusLabel = 'Tam Açık (5/5)';
          statusColor = 'orange';
        } else if (bothMainOpen && openCollectorCount === 0) {
          statusKey = 'main_closed';
          statusLabel = 'Ana Vana Açık / 5 Kollektör Kapalı';
          statusColor = 'rose';
        } else {
          statusKey = 'partial';
          statusLabel = 'Kısık (' + openCollectorCount + '/5 Kollektör)';
          statusColor = 'amber';
        }

        // Check if there is a physical mismatch worth noting (e.g., Main valves closed while collectors left open, or Main valves open while all 5 collectors closed, or 1 main valve closed)
        const hasWarning =
          oneMainClosed ||
          (allMainClosed && openCollectorCount > 0) ||
          (bothMainOpen && openCollectorCount === 0);

        return {
          openMainCount: openMainCount,
          openCollectorCount: openCollectorCount,
          bothMainOpen: bothMainOpen,
          allMainClosed: allMainClosed,
          oneMainClosed: oneMainClosed,
          effectivePct: effectivePct,
          statusKey: statusKey,
          statusLabel: statusLabel,
          statusColor: statusColor,
          hasWarning: hasWarning
        };
      }

      function updateStats() {
        let fullCount = 0;
        let partialCount = 0;
        let closedCount = 0;
        let occupiedCount = 0;
        let activeCollectorsFlowing = 0;

        rooms.forEach(function (r) {
          if (r.occupied) occupiedCount++;
          const m = getRoomMetrics(r);
          if (m.bothMainOpen && m.openCollectorCount === 5) {
            fullCount++;
          } else if (m.effectivePct === 0) {
            closedCount++;
          } else {
            partialCount++;
          }
          if (m.bothMainOpen) {
            activeCollectorsFlowing += m.openCollectorCount;
          } else if (m.oneMainClosed) {
            activeCollectorsFlowing += m.openCollectorCount * 0.5;
          }
        });

        const emptyCount = rooms.length - occupiedCount;
        document.getElementById('statTotalRooms').textContent = String(rooms.length);
        document.getElementById('statOccupiedRooms').textContent = occupiedCount + ' Dolu • ' + emptyCount + ' Boş';
        document.getElementById('statFullHeat').textContent = String(fullCount);
        document.getElementById('statPartialHeat').textContent = String(partialCount);
        document.getElementById('statClosedRooms').textContent = String(closedCount);

        const roundedFlow = Math.round(activeCollectorsFlowing);
        document.getElementById('statActiveCollectors').textContent = roundedFlow + ' / 100';
        document.getElementById('statAvgPowerPct').textContent = '%' + roundedFlow;
        document.getElementById('statCollectorBar').style.width = roundedFlow + '%';
      }

      function renderRooms() {
        updateStats();
        const grid = document.getElementById('roomsGrid');
        const emptyState = document.getElementById('emptyState');
        grid.innerHTML = '';

        const filtered = rooms.filter(function (room) {
          const m = getRoomMetrics(room);

          if (occupancyFilter === 'occupied' && !room.occupied) return false;
          if (occupancyFilter === 'empty' && room.occupied) return false;

          if (activeFilter === 'full' && !(m.bothMainOpen && m.openCollectorCount === 5)) return false;
          if (activeFilter === 'partial' && !(m.effectivePct > 0 && m.effectivePct < 100)) return false;
          if (activeFilter === 'main_closed' && m.effectivePct !== 0) return false;
          if (activeFilter === 'mismatch' && !m.hasWarning) return false;

          if (searchQuery.trim() !== '') {
            const q = searchQuery.trim().toLowerCase();
            const matchNum = String(room.id).includes(q);
            const matchNote = (room.note || '').toLowerCase().includes(q);
            if (!matchNum && !matchNote) return false;
          }
          return true;
        });

        if (filtered.length === 0) {
          emptyState.classList.remove('hidden');
        } else {
          emptyState.classList.add('hidden');
        }

        filtered.forEach(function (room) {
          const m = getRoomMetrics(room);

          let borderClass = 'border-slate-800 hover:border-slate-700';
          let badgeClass = 'bg-slate-800 text-slate-300';
          if (m.statusColor === 'orange') {
            borderClass = 'border-orange-500/30 hover:border-orange-500/60';
            badgeClass = 'bg-orange-500/15 text-orange-300 border border-orange-500/30';
          } else if (m.statusColor === 'amber') {
            borderClass = 'border-amber-500/30 hover:border-amber-500/60';
            badgeClass = 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
          } else if (m.statusColor === 'rose') {
            borderClass = 'border-rose-500/30 hover:border-rose-500/60';
            badgeClass = 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
          }

          const card = document.createElement('div');
          card.className = 'bg-slate-900 border ' + borderClass + ' rounded-2xl p-4 flex flex-col justify-between transition shadow-sm';

          // Top row: Room number + occupancy + status badge
          let warningBanner = '';
          if (m.allMainClosed && m.openCollectorCount > 0) {
            warningBanner = '<div class="mt-2 px-2.5 py-1 rounded-lg bg-rose-950/70 border border-rose-800/60 text-[11px] text-rose-300 flex items-center gap-1.5">' +
              '<span class="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>' +
              '<span>Ana vanalar kapalı! (' + m.openCollectorCount + ' kollektör mandalı açık ama su geçmiyor)</span>' +
              '</div>';
          } else if (m.oneMainClosed) {
            warningBanner = '<div class="mt-2 px-2.5 py-1 rounded-lg bg-rose-950/70 border border-rose-800/60 text-[11px] text-rose-300 flex items-center gap-1.5">' +
              '<span class="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>' +
              '<span>Ana vanalardan biri kapalı! Devirdaim için 2 ana vana da açık olmalı.</span>' +
              '</div>';
          } else if (m.bothMainOpen && m.openCollectorCount === 0) {
            warningBanner = '<div class="mt-2 px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-800/60 text-[11px] text-amber-300 flex items-center gap-1.5">' +
              '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>' +
              '<span>Ana vanalar açık ama 5 kollektörün tamamı kapalı!</span>' +
              '</div>';
          }

          // Main Valves Buttons HTML
          let mainValvesHtml = '';
          for (let vIdx = 0; vIdx < 2; vIdx++) {
            const isOpen = room.mainValves[vIdx];
            const btnStyle = isOpen
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
              : 'bg-rose-950/50 border-rose-800/50 text-rose-400 hover:bg-rose-900/40';
            const dotStyle = isOpen ? 'bg-emerald-400' : 'bg-rose-500';
            mainValvesHtml +=
              '<button type="button" data-action="toggle-main" data-room="' + room.id + '" data-index="' + vIdx + '" ' +
              'class="flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ' + btnStyle + '" ' +
              'title="Ana Vana ' + (vIdx + 1) + ' durumunu değiştirmek için tıklayın">' +
              '<span class="flex items-center gap-1.5">' +
              '<span class="w-2 h-2 rounded-full ' + dotStyle + '"></span>' +
              '<span>Ana Vana ' + (vIdx + 1) + '</span>' +
              '</span>' +
              '<span class="text-[10px] font-bold uppercase">' + (isOpen ? 'AÇIK' : 'KAPALI') + '</span>' +
              '</button>';
          }

          // 5 Collectors Buttons HTML
          let collectorsHtml = '';
          for (let cIdx = 0; cIdx < 5; cIdx++) {
            const cOpen = room.collectors[cIdx];
            const flowing = cOpen && m.bothMainOpen;
            const restrictedFlow = cOpen && m.oneMainClosed;

            let cStyle = '';
            if (flowing) {
              cStyle = 'bg-orange-500 text-slate-950 border-orange-400 font-bold shadow-sm shadow-orange-500/20 hover:bg-orange-400';
            } else if (restrictedFlow) {
              cStyle = 'bg-amber-500/30 text-amber-200 border-amber-500/50 font-semibold hover:bg-amber-500/40';
            } else if (cOpen && m.allMainClosed) {
              // Knob is open, but main valve is closed!
              cStyle = 'bg-slate-800 text-amber-300/80 border-amber-500/40 border-dashed hover:bg-slate-700';
            } else {
              cStyle = 'bg-slate-950 text-slate-500 border-slate-800 hover:bg-slate-800 hover:text-slate-300';
            }

            const statusSub = cOpen ? 'AÇIK' : 'KAPALI';
            collectorsHtml +=
              '<button type="button" data-action="toggle-collector" data-room="' + room.id + '" data-index="' + cIdx + '" ' +
              'class="flex flex-col items-center justify-center py-1.5 rounded-lg border text-xs transition ' + cStyle + '" ' +
              'title="' + COLLECTOR_LABELS[cIdx] + ': ' + statusSub + '">' +
              '<span class="text-[11px] leading-none">K' + (cIdx + 1) + '</span>' +
              '<span class="text-[9px] mt-0.5 opacity-85">' + (cOpen ? 'Açık' : 'Kapalı') + '</span>' +
              '</button>';
          }

          const occBadge = room.occupied
            ? '<button type="button" data-action="toggle-occupancy" data-room="' + room.id + '" class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition" title="Doluluk durumunu değiştir">DOLU</button>'
            : '<button type="button" data-action="toggle-occupancy" data-room="' + room.id + '" class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 transition" title="Doluluk durumunu değiştir">BOŞ</button>';

          card.innerHTML =
            '<div>' +
              '<div class="flex items-start justify-between gap-2">' +
                '<div class="flex items-center gap-2">' +
                  '<span class="text-lg font-bold text-white tracking-tight">Oda ' + room.id + '</span>' +
                  occBadge +
                '</div>' +
                '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ' + badgeClass + '">' +
                  m.statusLabel +
                '</span>' +
              '</div>' +

              warningBanner +

              '<!-- 2 Main Valves -->' +
              '<div class="mt-3">' +
                '<div class="flex items-center justify-between text-[11px] text-slate-400 mb-1">' +
                  '<span>Ana Vanalar (' + m.openMainCount + '/2 Açık)</span>' +
                  '<span class="font-medium text-slate-300">Isı Gücü: %' + m.effectivePct + '</span>' +
                '</div>' +
                '<div class="grid grid-cols-2 gap-1.5">' +
                  mainValvesHtml +
                '</div>' +
              '</div>' +

              '<!-- 5 Collectors -->' +
              '<div class="mt-3">' +
                '<div class="flex items-center justify-between text-[11px] text-slate-400 mb-1">' +
                  '<span>Kollektör Hatları (' + m.openCollectorCount + '/5 Açık)</span>' +
                  '<span class="text-[10px] text-slate-500">Tıkla Aç/Kapat</span>' +
                '</div>' +
                '<div class="grid grid-cols-5 gap-1.5">' +
                  collectorsHtml +
                '</div>' +
              '</div>' +

              (room.note
                ? '<div class="mt-2.5 px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800/80 text-[11px] text-slate-300 line-clamp-2" title="' + room.note.replace(/"/g, '&quot;') + '">' +
                  '<span class="text-amber-400 font-medium">Not:</span> ' + room.note +
                  '</div>'
                : '') +
            '</div>' +

            '<div class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-1">' +
              '<div class="flex items-center gap-1">' +
                '<button type="button" data-action="quick-full" data-room="' + room.id + '" class="px-2 py-1 rounded text-[10px] font-medium bg-slate-800 hover:bg-orange-500/20 text-slate-300 hover:text-orange-300 transition" title="2 Ana Vana ve 5 Kollektörü Aç">Tam Aç</button>' +
                '<button type="button" data-action="quick-eco" data-room="' + room.id + '" class="px-2 py-1 rounded text-[10px] font-medium bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 transition" title="Ana Vanaları Aç, 2 Kollektörü Kapat (3/5)">3/5 Kıs</button>' +
                '<button type="button" data-action="quick-close-main" data-room="' + room.id + '" class="px-2 py-1 rounded text-[10px] font-medium bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition" title="Ana Vanaları Kapat">Ana Vana Kapat</button>' +
              '</div>' +
              '<button type="button" data-action="open-detail" data-room="' + room.id + '" class="px-2 py-1 rounded text-[10px] font-semibold text-amber-400 hover:bg-amber-500/10 transition">' +
                'Detay / Not' +
              '</button>' +
            '</div>';

          grid.appendChild(card);
        });
      }

      function renderLogs() {
        const badge = document.getElementById('logCountBadge');
        badge.textContent = String(logs.length);
        const container = document.getElementById('logListContainer');
        container.innerHTML = '';

        if (logs.length === 0) {
          container.innerHTML = '<p class="text-xs text-slate-500 text-center py-8">Henüz kayıtlı işlem bulunmuyor.</p>';
          return;
        }

        logs.forEach(function (item) {
          const row = document.createElement('div');
          row.className = 'p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start justify-between gap-2';
          row.innerHTML =
            '<div>' +
              '<span class="inline-block px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold text-[10px] mr-1.5">Oda ' + item.room + '</span>' +
              '<span class="text-slate-200">' + item.msg + '</span>' +
            '</div>' +
            '<span class="text-[10px] text-slate-500 shrink-0">' + item.time + '</span>';
          container.appendChild(row);
        });
      }

      // Open Room Detail Modal
      function openRoomModal(roomId) {
        const room = rooms.find(function (r) { return r.id === Number(roomId); });
        if (!room) return;
        activeModalRoomId = room.id;

        document.getElementById('modalRoomTitle').textContent = 'Oda ' + room.id + ' — Vana & Kollektör Yönetimi';
        document.getElementById('modalRoomSubtitle').textContent = 'Son güncelleme: ' + (room.updatedAt || 'Bugün');
        document.getElementById('modalRoomNote').value = room.note || '';

        renderModalDynamicContent(room);

        const modal = document.getElementById('roomDetailModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }

      function renderModalDynamicContent(room) {
        const occBtn = document.getElementById('modalToggleOccupancy');
        if (room.occupied) {
          occBtn.className = 'px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
          occBtn.textContent = 'Müşteri Var (DOLU)';
        } else {
          occBtn.className = 'px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700';
          occBtn.textContent = 'Oda Boş (BOŞ)';
        }

        // Main valves in modal
        const mvContainer = document.getElementById('modalMainValvesContainer');
        mvContainer.innerHTML = '';
        const mvNames = ['Ana Vana 1 (Sıcak Giriş)', 'Ana Vana 2 (Dönüş Hattı)'];
        room.mainValves.forEach(function (isOpen, idx) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = isOpen
            ? 'p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-left flex items-center justify-between transition'
            : 'p-3 rounded-xl border border-rose-500/40 bg-rose-950/40 text-left flex items-center justify-between transition';
          btn.innerHTML =
            '<div>' +
              '<div class="text-xs font-bold ' + (isOpen ? 'text-emerald-300' : 'text-rose-300') + '">' + mvNames[idx] + '</div>' +
              '<div class="text-[11px] text-slate-400 mt-0.5">' + (isOpen ? 'Su geçişi aktif' : 'Vana kapalı') + '</div>' +
            '</div>' +
            '<span class="px-2 py-0.5 rounded text-[10px] font-bold ' + (isOpen ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white') + '">' +
              (isOpen ? 'AÇIK' : 'KAPALI') +
            '</span>';
          btn.addEventListener('click', function () {
            room.mainValves[idx] = !room.mainValves[idx];
            room.updatedAt = getNowTimeStr();
            addLog(room.id, 'Ana Vana ' + (idx + 1) + ' ' + (room.mainValves[idx] ? 'AÇILDI' : 'KAPATILDI'));
            renderModalDynamicContent(room);
            renderRooms();
          });
          mvContainer.appendChild(btn);
        });

        // Collectors in modal
        const colContainer = document.getElementById('modalCollectorsContainer');
        colContainer.innerHTML = '';
        const openCols = room.collectors.filter(Boolean).length;
        document.getElementById('modalCollectorSummary').textContent = openCols + ' / 5 Kollektör Açık';

        room.collectors.forEach(function (cOpen, idx) {
          const row = document.createElement('div');
          row.className = 'p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between';
          row.innerHTML =
            '<div class="flex items-center gap-2.5">' +
              '<span class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ' +
                (cOpen ? 'bg-orange-500 text-slate-950' : 'bg-slate-800 text-slate-500') + '">K' + (idx + 1) + '</span>' +
              '<div>' +
                '<div class="text-xs font-medium text-slate-200">' + COLLECTOR_LABELS[idx] + '</div>' +
                '<div class="text-[10px] text-slate-500">' + (cOpen ? 'Mandal Açık (%20 Kapasite)' : 'Mandal Kapalı') + '</div>' +
              '</div>' +
            '</div>' +
            '<button type="button" class="px-3 py-1 rounded-lg text-xs font-semibold transition ' +
              (cOpen ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700') + '">' +
              (cOpen ? 'Açık (Kapat)' : 'Kapalı (Aç)') +
            '</button>';
          row.querySelector('button').addEventListener('click', function () {
            room.collectors[idx] = !room.collectors[idx];
            room.updatedAt = getNowTimeStr();
            addLog(room.id, COLLECTOR_LABELS[idx] + ' ' + (room.collectors[idx] ? 'AÇILDI' : 'KAPATILDI'));
            renderModalDynamicContent(room);
            renderRooms();
          });
          colContainer.appendChild(row);
        });
      }

      function closeRoomModal() {
        const modal = document.getElementById('roomDetailModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        activeModalRoomId = null;
      }

      // Event Delegation for Room Cards
      document.getElementById('roomsGrid').addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const roomId = Number(btn.getAttribute('data-room'));
        const room = rooms.find(function (r) { return r.id === roomId; });
        if (!room) return;

        if (action === 'toggle-main') {
          const idx = Number(btn.getAttribute('data-index'));
          room.mainValves[idx] = !room.mainValves[idx];
          room.updatedAt = getNowTimeStr();
          addLog(room.id, 'Ana Vana ' + (idx + 1) + ' ' + (room.mainValves[idx] ? 'AÇILDI' : 'KAPATILDI'));
          showToast('Oda ' + room.id + ': Ana Vana ' + (idx + 1) + ' ' + (room.mainValves[idx] ? 'açıldı' : 'kapatıldı'));
          renderRooms();
        } else if (action === 'toggle-collector') {
          const idx = Number(btn.getAttribute('data-index'));
          room.collectors[idx] = !room.collectors[idx];
          room.updatedAt = getNowTimeStr();
          const openCount = room.collectors.filter(Boolean).length;
          addLog(room.id, 'Kollektör K' + (idx + 1) + ' ' + (room.collectors[idx] ? 'açıldı' : 'kapatıldı') + ' (' + openCount + '/5 aktif)');
          showToast('Oda ' + room.id + ': Kollektör K' + (idx + 1) + ' ' + (room.collectors[idx] ? 'açıldı' : 'kapatıldı'));
          renderRooms();
        } else if (action === 'toggle-occupancy') {
          room.occupied = !room.occupied;
          room.updatedAt = getNowTimeStr();
          addLog(room.id, 'Doluluk durumu ' + (room.occupied ? 'DOLU' : 'BOŞ') + ' olarak işaretlendi');
          renderRooms();
        } else if (action === 'quick-full') {
          room.mainValves = [true, true];
          room.collectors = [true, true, true, true, true];
          room.updatedAt = getNowTimeStr();
          addLog(room.id, 'Tam ısıtmaya alındı (2 Ana Vana + 5/5 Kollektör Açık)');
          showToast('Oda ' + room.id + ' tam ısıtmaya alındı (%100)');
          renderRooms();
        } else if (action === 'quick-eco') {
          room.mainValves = [true, true];
          room.collectors = [true, true, true, false, false];
          room.updatedAt = getNowTimeStr();
          addLog(room.id, 'Isı düşürüldü: Ana vanalar açık, 2 kollektör kapatıldı (3/5 aktif)');
          showToast('Oda ' + room.id + ': 2 kollektör kapatıldı (3/5 aktif)');
          renderRooms();
        } else if (action === 'quick-close-main') {
          room.mainValves = [false, false];
          room.updatedAt = getNowTimeStr();
          addLog(room.id, 'Her iki Ana Vana kapatıldı (Isı kesildi)');
          showToast('Oda ' + room.id + ': Ana vanalar kapatıldı');
          renderRooms();
        } else if (action === 'open-detail') {
          openRoomModal(room.id);
        }
      });

      // Filter buttons
      document.getElementById('filterButtonsContainer').addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-filter]');
        if (!btn) return;
        activeFilter = btn.getAttribute('data-filter');
        document.querySelectorAll('#filterButtonsContainer .filter-btn').forEach(function (b) {
          if (b.getAttribute('data-filter') === activeFilter) {
            b.className = 'filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition bg-amber-500 text-slate-950';
          } else {
            b.className = 'filter-btn px-3 py-1.5 rounded-lg text-xs font-medium transition bg-slate-800 text-slate-300 hover:bg-slate-700';
          }
        });
        renderRooms();
      });

      document.getElementById('searchInput').addEventListener('input', function (e) {
        searchQuery = e.target.value;
        renderRooms();
      });

      document.getElementById('occupancyFilter').addEventListener('change', function (e) {
        occupancyFilter = e.target.value;
        renderRooms();
      });

      document.getElementById('btnClearFilters').addEventListener('click', function () {
        activeFilter = 'all';
        occupancyFilter = 'all';
        searchQuery = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('occupancyFilter').value = 'all';
        document.querySelectorAll('#filterButtonsContainer .filter-btn').forEach(function (b) {
          if (b.getAttribute('data-filter') === 'all') {
            b.className = 'filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition bg-amber-500 text-slate-950';
          } else {
            b.className = 'filter-btn px-3 py-1.5 rounded-lg text-xs font-medium transition bg-slate-800 text-slate-300 hover:bg-slate-700';
          }
        });
        renderRooms();
      });

      // Modal events
      document.getElementById('btnCloseDetailModal').addEventListener('click', closeRoomModal);
      document.getElementById('btnSaveRoomModal').addEventListener('click', function () {
        if (activeModalRoomId !== null) {
          const room = rooms.find(function (r) { return r.id === activeModalRoomId; });
          if (room) {
            const newNote = document.getElementById('modalRoomNote').value.trim();
            if (room.note !== newNote) {
              room.note = newNote;
              room.updatedAt = getNowTimeStr();
              addLog(room.id, 'Oda notu güncellendi');
            }
            saveState();
            renderRooms();
            showToast('Oda ' + room.id + ' kaydedildi');
          }
        }
        closeRoomModal();
      });

      document.getElementById('modalToggleOccupancy').addEventListener('click', function () {
        if (activeModalRoomId === null) return;
        const room = rooms.find(function (r) { return r.id === activeModalRoomId; });
        if (!room) return;
        room.occupied = !room.occupied;
        room.updatedAt = getNowTimeStr();
        addLog(room.id, 'Doluluk durumu ' + (room.occupied ? 'DOLU' : 'BOŞ') + ' yapıldı');
        renderModalDynamicContent(room);
        renderRooms();
      });

      document.getElementById('modalPresetFull').addEventListener('click', function () {
        if (activeModalRoomId === null) return;
        const room = rooms.find(function (r) { return r.id === activeModalRoomId; });
        if (!room) return;
        room.mainValves = [true, true];
        room.collectors = [true, true, true, true, true];
        room.updatedAt = getNowTimeStr();
        addLog(room.id, 'Tam Açık moda alındı (2 Ana Vana + 5 Kollektör)');
        renderModalDynamicContent(room);
        renderRooms();
      });

      document.getElementById('modalPresetEco').addEventListener('click', function () {
        if (activeModalRoomId === null) return;
        const room = rooms.find(function (r) { return r.id === activeModalRoomId; });
        if (!room) return;
        room.mainValves = [true, true];
        room.collectors = [true, true, true, false, false];
        room.updatedAt = getNowTimeStr();
        addLog(room.id, 'Kısık moda alındı (Ana vanalar açık, 3/5 kollektör açık)');
        renderModalDynamicContent(room);
        renderRooms();
      });

      document.getElementById('modalPresetOff').addEventListener('click', function () {
        if (activeModalRoomId === null) return;
        const room = rooms.find(function (r) { return r.id === activeModalRoomId; });
        if (!room) return;
        room.mainValves = [false, false];
        room.updatedAt = getNowTimeStr();
        addLog(room.id, 'Ana Vanalar kapatıldı');
        renderModalDynamicContent(room);
        renderRooms();
      });

      // Bulk Modal Events
      const bulkModal = document.getElementById('bulkModal');
      document.getElementById('btnOpenBulkModal').addEventListener('click', function () {
        bulkModal.classList.remove('hidden');
        bulkModal.classList.add('flex');
      });
      document.getElementById('btnCloseBulkModal').addEventListener('click', function () {
        bulkModal.classList.add('hidden');
        bulkModal.classList.remove('flex');
      });

      document.getElementById('bulkAllFull').addEventListener('click', function () {
        rooms.forEach(function (r) {
          r.mainValves = [true, true];
          r.collectors = [true, true, true, true, true];
          r.updatedAt = getNowTimeStr();
        });
        addLog('101-120', 'Toplu İşlem: Tüm odalar tam ısıtmaya (2V + 5K) alındı');
        renderRooms();
        bulkModal.classList.add('hidden');
        bulkModal.classList.remove('flex');
        showToast('Tüm odalar (101-120) tam ısıtmaya alındı');
      });

      document.getElementById('bulkEmptyEco').addEventListener('click', function () {
        let count = 0;
        rooms.forEach(function (r) {
          if (!r.occupied) {
            r.mainValves = [true, true];
            r.collectors = [true, true, true, false, false];
            r.updatedAt = getNowTimeStr();
            count++;
          }
        });
        addLog('Boş Odalar', 'Toplu İşlem: ' + count + ' boş odada 2 kollektör kapatıldı (3/5 aktif)');
        renderRooms();
        bulkModal.classList.add('hidden');
        bulkModal.classList.remove('flex');
        showToast(count + ' boş odada 2 kollektör kapatıldı');
      });

      document.getElementById('bulkEmptyMainOff').addEventListener('click', function () {
        let count = 0;
        rooms.forEach(function (r) {
          if (!r.occupied) {
            r.mainValves = [false, false];
            r.updatedAt = getNowTimeStr();
            count++;
          }
        });
        addLog('Boş Odalar', 'Toplu İşlem: ' + count + ' boş odanın ana vanaları kapatıldı');
        renderRooms();
        bulkModal.classList.add('hidden');
        bulkModal.classList.remove('flex');
        showToast(count + ' boş odanın ana vanası kapatıldı');
      });

      document.getElementById('bulkAllMainOff').addEventListener('click', function () {
        rooms.forEach(function (r) {
          r.mainValves = [false, false];
          r.updatedAt = getNowTimeStr();
        });
        addLog('101-120', 'Toplu İşlem: Tüm otelin ana vanaları kapatıldı');
        renderRooms();
        bulkModal.classList.add('hidden');
        bulkModal.classList.remove('flex');
        showToast('Tüm odaların ana vanaları kapatıldı');
      });

      // Log Drawer Events
      const logDrawer = document.getElementById('logDrawer');
      document.getElementById('btnOpenLogDrawer').addEventListener('click', function () {
        logDrawer.classList.remove('hidden');
        logDrawer.classList.add('flex');
      });
      document.getElementById('btnCloseLogDrawer').addEventListener('click', function () {
        logDrawer.classList.add('hidden');
        logDrawer.classList.remove('flex');
      });
      document.getElementById('btnClearLogs').addEventListener('click', function () {
        logs = [];
        saveState();
        renderLogs();
        showToast('Hareket kayıtları temizlendi');
      });

      // Export CSV
      document.getElementById('btnExportCsv').addEventListener('click', function () {
        const headers = ['Oda No', 'Doluluk', 'Ana Vana 1', 'Ana Vana 2', 'K1', 'K2', 'K3', 'K4', 'K5', 'Aktif Isitma (%)', 'Not'];
        const rows = rooms.map(function (r) {
          const m = getRoomMetrics(r);
          return [
            r.id,
            r.occupied ? 'Dolu' : 'Bos',
            r.mainValves[0] ? 'Acik' : 'Kapali',
            r.mainValves[1] ? 'Acik' : 'Kapali',
            r.collectors[0] ? 'Acik' : 'Kapali',
            r.collectors[1] ? 'Acik' : 'Kapali',
            r.collectors[2] ? 'Acik' : 'Kapali',
            r.collectors[3] ? 'Acik' : 'Kapali',
            r.collectors[4] ? 'Acik' : 'Kapali',
            '%' + m.effectivePct,
            '"' + (r.note || '').replace(/"/g, '""') + '"'
          ].join(',');
        });
        const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'otel_yerden_isitma_durumu_101_120.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV durum raporu indirildi');
      });

      // Reset Demo
      document.getElementById('btnResetDemo').addEventListener('click', function () {
        rooms = createDefaultRooms();
        logs = [
          { time: getNowTimeStr(), room: 'Sistem', msg: 'Varsayılan oda ayarlarına sıfırlandı' }
        ];
        saveState();
        renderRooms();
        renderLogs();
        showToast('Panel varsayılan verilere sıfırlandı');
      });

      // Init
      loadState();
      renderRooms();
      renderLogs();
    })();
  </script>
</body>
</html>
