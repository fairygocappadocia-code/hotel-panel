'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface Room {
  id: number;
  mainValves: [boolean, boolean]; // [Ana Vana 1, Ana Vana 2]
  collectors: [boolean, boolean, boolean, boolean, boolean]; // [K1, K2, K3, K4, K5]
  occupied: boolean;
  note: string;
  updatedAt: string;
}

interface LogEntry {
  time: string;
  room: string | number;
  msg: string;
}

const STORAGE_KEY = 'otel_yerden_isitma_v1';
const LOG_STORAGE_KEY = 'otel_yerden_isitma_logs_v1';

const COLLECTOR_LABELS: [string, string, string, string, string] = [
  'K1 (Yatak Odası)',
  'K2 (Cam Önü)',
  'K3 (Oturma Alanı)',
  'K4 (Koridor/Giriş)',
  'K5 (Banyo)',
];

function getNowTimeStr(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function createDefaultRooms(): Room[] {
  const rooms: Room[] = [];
  for (let num = 101; num <= 120; num++) {
    let mainValves: [boolean, boolean] = [true, true];
    let collectors: [boolean, boolean, boolean, boolean, boolean] = [true, true, true, true, true];
    let occupied = true;
    let note = '';

    if (num === 101) {
      mainValves = [true, true];
      collectors = [true, true, true, false, false];
      occupied = true;
      note = 'Müşteri oda çok sıcak dediği için 2 kollektör kapatıldı, ana vanalar açık.';
    } else if (num === 102) {
      mainValves = [false, false];
      collectors = [true, true, true, true, true];
      occupied = false;
      note = 'Oda boş olduğu için ana vanalar kapatıldı (kollektör mandalları açık konumda).';
    } else if (num === 105 || num === 108 || num === 114) {
      mainValves = [true, true];
      collectors = [true, true, false, true, false];
      occupied = true;
      note = 'Ilık mod: Cam önü ve banyo açık, 2 hat kısıldı.';
    } else if (num === 110 || num === 115 || num === 119) {
      mainValves = [false, false];
      collectors = [false, false, false, false, false];
      occupied = false;
      note = 'Oda boş - Ana vanalar ve kollektörler kapalı.';
    } else if (num === 112) {
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
      mainValves,
      collectors,
      occupied,
      note,
      updatedAt: 'Bugün 11:30',
    });
  }
  return rooms;
}

function getRoomMetrics(room: Room) {
  const openMainCount = room.mainValves.filter(Boolean).length;
  const openCollectorCount = room.collectors.filter(Boolean).length;
  const bothMainOpen = openMainCount === 2;
  const allMainClosed = openMainCount === 0;
  const oneMainClosed = openMainCount === 1;

  let effectivePct = 0;
  if (bothMainOpen) {
    effectivePct = openCollectorCount * 20;
  } else if (oneMainClosed) {
    effectivePct = Math.round(openCollectorCount * 10);
  } else {
    effectivePct = 0;
  }

  let statusLabel = 'Kısmi Isıtma';
  let statusColor: 'orange' | 'amber' | 'rose' = 'amber';

  if (allMainClosed) {
    statusLabel = 'Ana Vana Kapalı (Isı Yok)';
    statusColor = 'rose';
  } else if (oneMainClosed) {
    statusLabel = 'Tek Ana Vana Kapalı!';
    statusColor = 'rose';
  } else if (bothMainOpen && openCollectorCount === 5) {
    statusLabel = 'Tam Açık (5/5)';
    statusColor = 'orange';
  } else if (bothMainOpen && openCollectorCount === 0) {
    statusLabel = 'Ana Vana Açık / 5 Kollektör Kapalı';
    statusColor = 'rose';
  } else {
    statusLabel = `Kısık (${openCollectorCount}/5 Kollektör)`;
    statusColor = 'amber';
  }

  const hasWarning =
    oneMainClosed ||
    (allMainClosed && openCollectorCount > 0) ||
    (bothMainOpen && openCollectorCount === 0);

  return {
    openMainCount,
    openCollectorCount,
    bothMainOpen,
    allMainClosed,
    oneMainClosed,
    effectivePct,
    statusLabel,
    statusColor,
    hasWarning,
  };
}

export default function App() {
  const [rooms, setRooms] = useState<Room[]>(() => createDefaultRooms());
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: '11:35', room: 101, msg: 'Kollektör 4 ve 5 kapatıldı (Ana vanalar açık, 3/5 aktif)' },
    { time: '11:20', room: 102, msg: 'Ana Vana 1 ve 2 kapatıldı (Isı kesildi)' },
    { time: '10:50', room: 112, msg: 'Ana Vana 2 kapatıldı (Tek ana vana açık uyarısı)' },
  ]);

  const [activeFilter, setActiveFilter] = useState<'all' | 'full' | 'partial' | 'main_closed' | 'mismatch'>('all');
  const [occupancyFilter, setOccupancyFilter] = useState<'all' | 'occupied' | 'empty'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [modalNote, setModalNote] = useState('');
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  // Load saved data from localStorage on client mount
  useEffect(() => {
    try {
      const savedRooms = localStorage.getItem(STORAGE_KEY);
      if (savedRooms) {
        setRooms(JSON.parse(savedRooms));
      }
      const savedLogs = localStorage.getItem(LOG_STORAGE_KEY);
      if (savedLogs) {
        setLogs(JSON.parse(savedLogs));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Persist changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    } catch {
      // Ignore storage errors
    }
  }, [rooms, logs]);

  const showToast = (msg: string) => {
    setToastText(msg);
    setTimeout(() => {
      setToastText((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const addLog = (room: string | number, msg: string) => {
    const entry: LogEntry = { time: getNowTimeStr(), room, msg };
    setLogs((prev) => [entry, ...prev.slice(0, 99)]);
  };

  // Toggle a main valve (0 or 1)
  const handleToggleMainValve = (roomId: number, valveIndex: 0 | 1) => {
    const nowStr = getNowTimeStr();
    let newState = false;
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const updatedValves: [boolean, boolean] = [...r.mainValves] as [boolean, boolean];
        updatedValves[valveIndex] = !updatedValves[valveIndex];
        newState = updatedValves[valveIndex];
        return { ...r, mainValves: updatedValves, updatedAt: nowStr };
      })
    );
    addLog(roomId, `Ana Vana ${valveIndex + 1} ${newState ? 'AÇILDI' : 'KAPATILDI'}`);
    showToast(`Oda ${roomId}: Ana Vana ${valveIndex + 1} ${newState ? 'açıldı' : 'kapatıldı'}`);
  };

  // Toggle a collector (0..4)
  const handleToggleCollector = (roomId: number, colIndex: 0 | 1 | 2 | 3 | 4) => {
    const nowStr = getNowTimeStr();
    let newState = false;
    let activeCount = 0;
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const updatedCols: [boolean, boolean, boolean, boolean, boolean] = [...r.collectors] as [
          boolean,
          boolean,
          boolean,
          boolean,
          boolean
        ];
        updatedCols[colIndex] = !updatedCols[colIndex];
        newState = updatedCols[colIndex];
        activeCount = updatedCols.filter(Boolean).length;
        return { ...r, collectors: updatedCols, updatedAt: nowStr };
      })
    );
    addLog(roomId, `Kollektör K${colIndex + 1} ${newState ? 'açıldı' : 'kapatıldı'} (${activeCount}/5 aktif)`);
    showToast(`Oda ${roomId}: Kollektör K${colIndex + 1} ${newState ? 'açıldı' : 'kapatıldı'}`);
  };

  // Toggle Occupancy
  const handleToggleOccupancy = (roomId: number) => {
    const nowStr = getNowTimeStr();
    let newOcc = false;
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        newOcc = !r.occupied;
        return { ...r, occupied: newOcc, updatedAt: nowStr };
      })
    );
    addLog(roomId, `Doluluk durumu ${newOcc ? 'DOLU' : 'BOŞ'} olarak işaretlendi`);
  };

  // Quick Room Presets
  const handleQuickPreset = (roomId: number, preset: 'full' | 'eco' | 'close_main') => {
    const nowStr = getNowTimeStr();
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        if (preset === 'full') {
          return {
            ...r,
            mainValves: [true, true],
            collectors: [true, true, true, true, true],
            updatedAt: nowStr,
          };
        }
        if (preset === 'eco') {
          return {
            ...r,
            mainValves: [true, true],
            collectors: [true, true, true, false, false],
            updatedAt: nowStr,
          };
        }
        return {
          ...r,
          mainValves: [false, false],
          updatedAt: nowStr,
        };
      })
    );

    if (preset === 'full') {
      addLog(roomId, 'Tam ısıtmaya alındı (2 Ana Vana + 5/5 Kollektör Açık)');
      showToast(`Oda ${roomId} tam ısıtmaya alındı (%100)`);
    } else if (preset === 'eco') {
      addLog(roomId, 'Isı düşürüldü: Ana vanalar açık, 2 kollektör kapatıldı (3/5 aktif)');
      showToast(`Oda ${roomId}: 2 kollektör kapatıldı (3/5 aktif)`);
    } else {
      addLog(roomId, 'Her iki Ana Vana kapatıldı (Isı kesildi)');
      showToast(`Oda ${roomId}: Ana vanalar kapatıldı`);
    }
  };

  // Bulk Actions
  const handleBulkAction = (type: 'all_full' | 'empty_eco' | 'empty_main_off' | 'all_main_off') => {
    const nowStr = getNowTimeStr();
    let affected = 0;

    setRooms((prev) =>
      prev.map((r) => {
        if (type === 'all_full') {
          affected++;
          return { ...r, mainValves: [true, true], collectors: [true, true, true, true, true], updatedAt: nowStr };
        }
        if (type === 'empty_eco' && !r.occupied) {
          affected++;
          return { ...r, mainValves: [true, true], collectors: [true, true, true, false, false], updatedAt: nowStr };
        }
        if (type === 'empty_main_off' && !r.occupied) {
          affected++;
          return { ...r, mainValves: [false, false], updatedAt: nowStr };
        }
        if (type === 'all_main_off') {
          affected++;
          return { ...r, mainValves: [false, false], updatedAt: nowStr };
        }
        return r;
      })
    );

    if (type === 'all_full') {
      addLog('101-120', 'Toplu İşlem: Tüm odalar tam ısıtmaya (2V + 5K) alındı');
      showToast('Tüm odalar (101-120) tam ısıtmaya alındı');
    } else if (type === 'empty_eco') {
      addLog('Boş Odalar', `Toplu İşlem: ${affected} boş odada 2 kollektör kapatıldı (3/5 aktif)`);
      showToast(`${affected} boş odada 2 kollektör kapatıldı`);
    } else if (type === 'empty_main_off') {
      addLog('Boş Odalar', `Toplu İşlem: ${affected} boş odanın ana vanaları kapatıldı`);
      showToast(`${affected} boş odanın ana vanası kapatıldı`);
    } else if (type === 'all_main_off') {
      addLog('101-120', 'Toplu İşlem: Tüm otelin ana vanaları kapatıldı');
      showToast('Tüm odaların ana vanaları kapatıldı');
    }
    setIsBulkOpen(false);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Oda No',
      'Doluluk',
      'Ana Vana 1',
      'Ana Vana 2',
      'K1',
      'K2',
      'K3',
      'K4',
      'K5',
      'Aktif Isitma (%)',
      'Not',
    ];
    const rows = rooms.map((r) => {
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
        `%${m.effectivePct}`,
        `"${(r.note || '').replace(/"/g, '""')}"`,
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
  };

  const handleResetDemo = () => {
    setRooms(createDefaultRooms());
    setLogs([{ time: getNowTimeStr(), room: 'Sistem', msg: 'Varsayılan oda ayarlarına sıfırlandı' }]);
    showToast('Panel varsayılan verilere sıfırlandı');
  };

  // Summary Stats
  const stats = useMemo(() => {
    let fullCount = 0;
    let partialCount = 0;
    let closedCount = 0;
    let occupiedCount = 0;
    let activeCollectorsFlowing = 0;

    rooms.forEach((r) => {
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

    return {
      total: rooms.length,
      occupiedCount,
      emptyCount: rooms.length - occupiedCount,
      fullCount,
      partialCount,
      closedCount,
      roundedFlow: Math.round(activeCollectorsFlowing),
    };
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
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
  }, [rooms, activeFilter, occupancyFilter, searchQuery]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  const openRoomDetail = (room: Room) => {
    setSelectedRoomId(room.id);
    setModalNote(room.note || '');
  };

  const handleSaveModalNote = () => {
    if (selectedRoomId !== null) {
      const nowStr = getNowTimeStr();
      setRooms((prev) =>
        prev.map((r) => (r.id === selectedRoomId ? { ...r, note: modalNote.trim(), updatedAt: nowStr } : r))
      );
      addLog(selectedRoomId, 'Oda notu güncellendi');
      showToast(`Oda ${selectedRoomId} kaydedildi`);
    }
    setSelectedRoomId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Otel Yerden Isıtma Takip Paneli
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  101 – 120 (20 Oda)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Oda bazlı 2 Ana Vana ve 5 Kollektör (Hat) anlık durum ve vardiya kontrol sistemi
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <span>Toplu İşlem</span>
            </button>
            <button
              type="button"
              onClick={() => setIsLogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <span>Hareket Kayıtları</span>
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-300 font-semibold">
                {logs.length}
              </span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <span>Rapor İndir (CSV)</span>
            </button>
            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800/60 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/50 transition"
            >
              Sıfırla
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 sm:px-6 space-y-5">
        {/* KPI Summary Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Toplam Oda</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">101-120</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">{stats.total}</span>
              <span className="text-xs text-emerald-400">
                {stats.occupiedCount} Dolu • {stats.emptyCount} Boş
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-orange-500/20 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-orange-300/90">
              <span>Tam Isıtan Odalar</span>
              <span className="w-2 h-2 rounded-full bg-orange-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-orange-400">{stats.fullCount}</span>
              <span className="text-xs text-slate-400">2 Vana + 5/5 Kollektör</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-amber-300/90">
              <span>Kısmi / Kısık Isıtma</span>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-400">{stats.partialCount}</span>
              <span className="text-xs text-slate-400">Kollektör/Vana Kısık</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-500/20 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-rose-300/90">
              <span>Ana Vanası Kapalı</span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-rose-400">{stats.closedCount}</span>
              <span className="text-xs text-slate-400">Isı Akışı Kesik (%0)</span>
            </div>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-slate-900 border border-sky-500/20 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-sky-300/90">
              <span>Aktif Kollektör Oranı</span>
              <span className="text-xs font-semibold text-sky-400">%{stats.roundedFlow}</span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xl font-bold text-white">{stats.roundedFlow} / 100</span>
                <span className="text-[11px] text-slate-400">Su Geçen Hat</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-orange-500 transition-all duration-300"
                  style={{ width: `${stats.roundedFlow}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Filter & Search Toolbar */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: 'Tümü (20)' },
                { id: 'full', label: 'Tam Açık (5/5)' },
                { id: 'partial', label: 'Kollektörü Kısık Olanlar' },
                { id: 'main_closed', label: 'Ana Vanası Kapalı' },
                { id: 'mismatch', label: 'Dikkat / Uyarı' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs transition ${
                  activeFilter === tab.id
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Oda no (örn: 101) veya not ara..."
              className="flex-1 sm:w-56 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <select
              value={occupancyFilter}
              onChange={(e) => setOccupancyFilter(e.target.value as 'all' | 'occupied' | 'empty')}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Tüm Doluluk Durumları</option>
              <option value="occupied">Sadece Dolu Odalar</option>
              <option value="empty">Sadece Boş Odalar</option>
            </select>
          </div>
        </section>

        {/* Rooms Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
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

            return (
              <div
                key={room.id}
                className={`bg-slate-900 border ${borderClass} rounded-2xl p-4 flex flex-col justify-between transition shadow-sm`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white tracking-tight">Oda {room.id}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleOccupancy(room.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                          room.occupied
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {room.occupied ? 'DOLU' : 'BOŞ'}
                      </button>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeClass}`}>
                      {m.statusLabel}
                    </span>
                  </div>

                  {/* Warnings */}
                  {m.allMainClosed && m.openCollectorCount > 0 && (
                    <div className="mt-2 px-2.5 py-1 rounded-lg bg-rose-950/70 border border-rose-800/60 text-[11px] text-rose-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                      <span>Ana vanalar kapalı! ({m.openCollectorCount} kollektör açık ama su geçmiyor)</span>
                    </div>
                  )}
                  {m.oneMainClosed && (
                    <div className="mt-2 px-2.5 py-1 rounded-lg bg-rose-950/70 border border-rose-800/60 text-[11px] text-rose-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                      <span>Ana vanalardan biri kapalı! Devirdaim için 2 ana vana da açık olmalı.</span>
                    </div>
                  )}
                  {m.bothMainOpen && m.openCollectorCount === 0 && (
                    <div className="mt-2 px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-800/60 text-[11px] text-amber-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>Ana vanalar açık ama 5 kollektörün tamamı kapalı!</span>
                    </div>
                  )}

                  {/* 2 Main Valves */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>Ana Vanalar ({m.openMainCount}/2 Açık)</span>
                      <span className="font-medium text-slate-300">Isı Gücü: %{m.effectivePct}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([0, 1] as const).map((vIdx) => {
                        const isOpen = room.mainValves[vIdx];
                        return (
                          <button
                            key={vIdx}
                            type="button"
                            onClick={() => handleToggleMainValve(room.id, vIdx)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                              isOpen
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                                : 'bg-rose-950/50 border-rose-800/50 text-rose-400 hover:bg-rose-900/40'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                              <span>Ana Vana {vIdx + 1}</span>
                            </span>
                            <span className="text-[10px] font-bold uppercase">{isOpen ? 'AÇIK' : 'KAPALI'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5 Collectors */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>Kollektör Hatları ({m.openCollectorCount}/5 Açık)</span>
                      <span className="text-[10px] text-slate-500">Tıkla Aç/Kapat</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {([0, 1, 2, 3, 4] as const).map((cIdx) => {
                        const cOpen = room.collectors[cIdx];
                        const flowing = cOpen && m.bothMainOpen;
                        const restrictedFlow = cOpen && m.oneMainClosed;

                        let cStyle =
                          'bg-slate-950 text-slate-500 border-slate-800 hover:bg-slate-800 hover:text-slate-300';
                        if (flowing) {
                          cStyle =
                            'bg-orange-500 text-slate-950 border-orange-400 font-bold shadow-sm shadow-orange-500/20 hover:bg-orange-400';
                        } else if (restrictedFlow) {
                          cStyle =
                            'bg-amber-500/30 text-amber-200 border-amber-500/50 font-semibold hover:bg-amber-500/40';
                        } else if (cOpen && m.allMainClosed) {
                          cStyle =
                            'bg-slate-800 text-amber-300/80 border-amber-500/40 border-dashed hover:bg-slate-700';
                        }

                        return (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => handleToggleCollector(room.id, cIdx)}
                            title={`${COLLECTOR_LABELS[cIdx]}: ${cOpen ? 'AÇIK' : 'KAPALI'}`}
                            className={`flex flex-col items-center justify-center py-1.5 rounded-lg border text-xs transition ${cStyle}`}
                          >
                            <span className="text-[11px] leading-none">K{cIdx + 1}</span>
                            <span className="text-[9px] mt-0.5 opacity-85">{cOpen ? 'Açık' : 'Kapalı'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {room.note && (
                    <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800/80 text-[11px] text-slate-300 line-clamp-2">
                      <span className="text-amber-400 font-medium">Not:</span> {room.note}
                    </div>
                  )}
                </div>

                {/* Quick Footer Actions */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(room.id, 'full')}
                      className="px-2 py-1 rounded text-[10px] font-medium bg-slate-800 hover:bg-orange-500/20 text-slate-300 hover:text-orange-300 transition"
                    >
                      Tam Aç
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(room.id, 'eco')}
                      className="px-2 py-1 rounded text-[10px] font-medium bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 transition"
                    >
                      3/5 Kıs
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(room.id, 'close_main')}
                      className="px-2 py-1 rounded text-[10px] font-medium bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition"
                    >
                      Ana Vana Kapat
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => openRoomDetail(room)}
                    className="px-2 py-1 rounded text-[10px] font-semibold text-amber-400 hover:bg-amber-500/10 transition"
                  >
                    Detay / Not
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {filteredRooms.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center space-y-3">
            <p className="text-sm text-slate-300 font-medium">Seçilen filtreye uygun oda bulunamadı.</p>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setOccupancyFilter('all');
                setSearchQuery('');
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}
      </main>

      {/* Room Detail Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  Oda {selectedRoom.id} — Vana & Kollektör Yönetimi
                </h2>
                <p className="text-xs text-slate-400">Son güncelleme: {selectedRoom.updatedAt}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomId(null)}
                className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Kapat ✕
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Oda Durumu:</span>
                  <button
                    type="button"
                    onClick={() => handleToggleOccupancy(selectedRoom.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
                      selectedRoom.occupied
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {selectedRoom.occupied ? 'Müşteri Var (DOLU)' : 'Oda Boş (BOŞ)'}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(selectedRoom.id, 'full')}
                    className="px-2.5 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/30 transition"
                  >
                    Tam Aç (2V + 5K)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(selectedRoom.id, 'eco')}
                    className="px-2.5 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition"
                  >
                    Kısık Mod (3/5 K)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(selectedRoom.id, 'close_main')}
                    className="px-2.5 py-1 rounded text-xs font-medium bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition"
                  >
                    Ana Vanayı Kapat
                  </button>
                </div>
              </div>

              {/* 2 Main Valves */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Ana Vanalar (2 Adet - Oda Ana Giriş & Dönüş)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['Ana Vana 1 (Sıcak Giriş)', 'Ana Vana 2 (Dönüş Hattı)'] as const).map((label, idx) => {
                    const vIdx = idx as 0 | 1;
                    const isOpen = selectedRoom.mainValves[vIdx];
                    return (
                      <button
                        key={vIdx}
                        type="button"
                        onClick={() => handleToggleMainValve(selectedRoom.id, vIdx)}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                          isOpen
                            ? 'border-emerald-500/40 bg-emerald-500/15'
                            : 'border-rose-500/40 bg-rose-950/40'
                        }`}
                      >
                        <div>
                          <div className={`text-xs font-bold ${isOpen ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {label}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {isOpen ? 'Su geçişi aktif' : 'Vana kapalı'}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isOpen ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                          }`}
                        >
                          {isOpen ? 'AÇIK' : 'KAPALI'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5 Collectors */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Kollektör Hatları (5 Adet)
                  </label>
                  <span className="text-xs font-medium text-amber-400">
                    {selectedRoom.collectors.filter(Boolean).length} / 5 Kollektör Açık
                  </span>
                </div>
                <div className="space-y-2">
                  {([0, 1, 2, 3, 4] as const).map((cIdx) => {
                    const cOpen = selectedRoom.collectors[cIdx];
                    return (
                      <div
                        key={cIdx}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                              cOpen ? 'bg-orange-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            K{cIdx + 1}
                          </span>
                          <div>
                            <div className="text-xs font-medium text-slate-200">{COLLECTOR_LABELS[cIdx]}</div>
                            <div className="text-[10px] text-slate-500">
                              {cOpen ? 'Mandal Açık (%20 Kapasite)' : 'Mandal Kapalı'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleCollector(selectedRoom.id, cIdx)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                            cOpen
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {cOpen ? 'Açık (Kapat)' : 'Kapalı (Aç)'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Teknik Servis / Resepsiyon Notu
                </label>
                <textarea
                  rows={2}
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="Örn: Müşteri çok sıcak dediği için 2 kollektör kapatıldı..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveModalNote}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition"
              >
                Notu Kaydet & Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Operations Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Toplu Vana & Kollektör İşlemleri</h2>
              <button
                type="button"
                onClick={() => setIsBulkOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Kapat ✕
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-400">
                Hazır senaryolarla tüm odaları (101–120) veya sadece boş odaları tek tıkla ayarlayabilirsiniz:
              </p>
              <button
                type="button"
                onClick={() => handleBulkAction('all_full')}
                className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between transition"
              >
                <div>
                  <div className="text-xs font-semibold text-orange-400">Tüm Odaları Tam Isıtmaya Al (101-120)</div>
                  <div className="text-[11px] text-slate-400">2 Ana Vana Açık + 5/5 Kollektör Açık (%100)</div>
                </div>
                <span className="text-xs font-bold text-orange-400">Uygula →</span>
              </button>

              <button
                type="button"
                onClick={() => handleBulkAction('empty_eco')}
                className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between transition"
              >
                <div>
                  <div className="text-xs font-semibold text-amber-400">Boş Odalarda 2 Kollektörü Kapat (Tasarruf)</div>
                  <div className="text-[11px] text-slate-400">Boş odalarda Ana Vanalar Açık, 3/5 Kollektör Açık (%60)</div>
                </div>
                <span className="text-xs font-bold text-amber-400">Uygula →</span>
              </button>

              <button
                type="button"
                onClick={() => handleBulkAction('empty_main_off')}
                className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between transition"
              >
                <div>
                  <div className="text-xs font-semibold text-rose-400">Boş Odaların Ana Vanalarını Kapat</div>
                  <div className="text-[11px] text-slate-400">Boş odalarda 2 Ana Vana Kapatılır (%0 Isı)</div>
                </div>
                <span className="text-xs font-bold text-rose-400">Uygula →</span>
              </button>

              <button
                type="button"
                onClick={() => handleBulkAction('all_main_off')}
                className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between transition"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-300">Tüm Otelin Ana Vanalarını Kapat</div>
                  <div className="text-[11px] text-slate-400">101-120 tüm ana vanaları kapatır</div>
                </div>
                <span className="text-xs font-bold text-slate-400">Uygula →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Drawer */}
      {isLogOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Vana & Kollektör Hareket Kayıtları</h2>
                <p className="text-xs text-slate-400">Hangi odada hangi vana/kollektör açıldı veya kapatıldı</p>
              </div>
              <button
                type="button"
                onClick={() => setIsLogOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Kapat ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">Henüz kayıtlı işlem bulunmuyor.</p>
              ) : (
                logs.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start justify-between gap-2"
                  >
                    <div>
                      <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold text-[10px] mr-1.5">
                        Oda {item.room}
                      </span>
                      <span className="text-slate-200">{item.msg}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">{item.time}</span>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setLogs([]);
                  showToast('Hareket kayıtları temizlendi');
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium"
              >
                Kayıtları Temizle
              </button>
              <span className="text-[11px] text-slate-500">Tarayıcı hafızasına otomatik kaydedilir</span>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastText && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-800 border border-amber-500/40 text-slate-100 px-3.5 py-2 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span>{toastText}</span>
        </div>
      )}
    </div>
  );
}
