'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// ============================================================================
// FIREBASE PROJESİ: doors-panel (OTOMATİK ENTEGRE EDİLDİ)
// Bu panel mevcut Firestore REST senkronizasyonunu kullanır.
// Telefon ve bilgisayar arasında hiçbir ek ayar gerektirmeden otomatik eşitler.
// ============================================================================
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBkAafEYmhC_UCIK6nK19zGn1pEy45mtVA',
  authDomain: 'doors-panel.firebaseapp.com',
  projectId: 'doors-panel',
  storageBucket: 'doors-panel.firebasestorage.app',
  messagingSenderId: '717146829376',
  appId: '1:717146829376:web:1b05588aa972d56e0865a5',
  measurementId: 'G-N98E7SFG26',
  databaseURL: '', // Realtime Database URL verilmedi; Firestore kullanılacak.
};

interface RoomHistoryItem {
  id: string;
  dateIso: string; // YYYY-MM-DD
  dateLabel: string; // e.g. 19 Ekim 2026
  time: string; // HH:mm
  device: string; // e.g. Telefon, Bilgisayar
  action: string; // e.g. Kollektör K4 kapatıldı
  summary: string; // e.g. 2/2 Ana Vana • 3/5 Kollektör (%60)
}

interface Room {
  id: number;
  mainValves: [boolean, boolean]; // [Ana Vana 1, Ana Vana 2]
  collectors: [boolean, boolean, boolean, boolean, boolean]; // [K1, K2, K3, K4, K5]
  occupied: boolean;
  note: string;
  updatedAt: string;
  history: RoomHistoryItem[];
}

interface LogEntry {
  id: string;
  dateIso: string;
  dateLabel: string;
  time: string;
  device: string;
  room: string | number;
  msg: string;
}

const STORAGE_KEY = 'otel_yerden_isitma_v2';
const LOG_STORAGE_KEY = 'otel_yerden_isitma_logs_v2';
const SYNC_CONFIG_KEY = 'otel_yerden_isitma_sync_v3_doors';
const BROADCAST_CHANNEL_NAME = 'otel_yerden_isitma_live_channel';

const COLLECTOR_LABELS: [string, string, string, string, string] = [
  'K1 (Yatak Odası)',
  'K2 (Cam Önü)',
  'K3 (Oturma Alanı)',
  'K4 (Koridor/Giriş)',
  'K5 (Banyo)',
];

const MONTHS_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

function getNowDateAndTime() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const dateIso = `${yyyy}-${mm}-${dd}`;
  const dateLabel = `${now.getDate()} ${MONTHS_TR[now.getMonth()]} ${yyyy}`;
  const time = `${hh}:${min}`;
  return { dateIso, dateLabel, time, fullLabel: `${dateLabel} ${time}` };
}

function getNowTimeStr(): string {
  return getNowDateAndTime().time;
}

function formatValvesSummary(
  mainValves: [boolean, boolean],
  collectors: [boolean, boolean, boolean, boolean, boolean]
) {
  const openMain = mainValves.filter(Boolean).length;
  const openCol = collectors.filter(Boolean).length;
  const pct = openMain === 2 ? openCol * 20 : openMain === 1 ? Math.round(openCol * 10) : 0;
  return `${openMain}/2 Ana Vana • ${openCol}/5 Kollektör (%${pct} Isı)`;
}

function parseFirebaseInput(raw: string): { mode: 'rtdb' | 'firestore' | 'none'; endpoint: string; label: string } {
  const text = (raw || '').trim();
  const defaultKeyParam = DEFAULT_FIREBASE_CONFIG.apiKey
    ? `?key=${encodeURIComponent(DEFAULT_FIREBASE_CONFIG.apiKey)}`
    : '';

  if (!text || text === DEFAULT_FIREBASE_CONFIG.projectId) {
    if (DEFAULT_FIREBASE_CONFIG.databaseURL) {
      const clean = DEFAULT_FIREBASE_CONFIG.databaseURL.replace(/\/+$/, '');
      return {
        mode: 'rtdb',
        endpoint: clean.endsWith('.json') ? clean : `${clean}/otel_yerden_isitma_v2.json`,
        label: 'Firebase Realtime DB',
      };
    }
    if (DEFAULT_FIREBASE_CONFIG.projectId) {
      const pid = DEFAULT_FIREBASE_CONFIG.projectId.trim();
      return {
        mode: 'firestore',
        endpoint: `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/otel_takip/yerden_isitma_v2${defaultKeyParam}`,
        label: `Firebase (${pid})`,
      };
    }
    return { mode: 'none', endpoint: '', label: '' };
  }

  const dbUrlMatch = text.match(
    /https:\/\/[a-zA-Z0-9-]+(?:-[a-zA-Z0-9-]+)*\.(?:firebaseio\.com|firebasedatabase\.app)[^\s"']*/
  );
  if (dbUrlMatch) {
    const clean = dbUrlMatch[0].replace(/\/+$/, '');
    return {
      mode: 'rtdb',
      endpoint: clean.endsWith('.json') ? clean : `${clean}/otel_yerden_isitma_v2.json`,
      label: 'Firebase Realtime DB',
    };
  }

  const projectIdMatch = text.match(/projectId\s*:\s*["']([^"']+)["']/);
  const apiKeyMatch = text.match(/apiKey\s*:\s*["']([^"']+)["']/);
  if (projectIdMatch) {
    const pid = projectIdMatch[1].trim();
    const keyParam = apiKeyMatch
      ? `?key=${encodeURIComponent(apiKeyMatch[1].trim())}`
      : defaultKeyParam;
    return {
      mode: 'firestore',
      endpoint: `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/otel_takip/yerden_isitma_v2${keyParam}`,
      label: `Firebase (${pid})`,
    };
  }

  if (text.startsWith('http://') || text.startsWith('https://')) {
    const clean = text.replace(/\/+$/, '');
    if (clean.includes('firebaseio.com') || clean.includes('firebasedatabase.app')) {
      return {
        mode: 'rtdb',
        endpoint: clean.endsWith('.json') ? clean : `${clean}/otel_yerden_isitma_v2.json`,
        label: 'Firebase Realtime DB',
      };
    }
    if (clean.includes('firestore.googleapis.com')) {
      return { mode: 'firestore', endpoint: clean, label: 'Firebase Firestore' };
    }
    return { mode: 'rtdb', endpoint: clean, label: 'Bulut Servisi' };
  }

  const cleanPid = text.replace(/[^a-zA-Z0-9-_]/g, '');
  if (cleanPid.length >= 4) {
    return {
      mode: 'firestore',
      endpoint: `https://firestore.googleapis.com/v1/projects/${cleanPid}/databases/(default)/documents/otel_takip/yerden_isitma_v2${defaultKeyParam}`,
      label: `Firebase (${cleanPid})`,
    };
  }

  return { mode: 'none', endpoint: '', label: '' };
}

function createDefaultRooms(): Room[] {
  const { dateIso, dateLabel } = getNowDateAndTime();
  const rooms: Room[] = [];

  for (let num = 101; num <= 120; num++) {
    let mainValves: [boolean, boolean] = [true, true];
    let collectors: [boolean, boolean, boolean, boolean, boolean] = [true, true, true, true, true];
    let occupied = true;
    let note = '';
    const history: RoomHistoryItem[] = [];

    if (num === 101) {
      mainValves = [true, true];
      collectors = [true, true, true, false, false];
      occupied = true;
      note = 'Müşteri oda çok sıcak dediği için 2 kollektör kapatıldı, ana vanalar açık.';
      history.push(
        {
          id: '101-1',
          dateIso,
          dateLabel,
          time: '11:35',
          device: 'Telefon',
          action: 'Kollektör K4 ve K5 kapatıldı (Isı düşürüldü)',
          summary: '2/2 Ana Vana • 3/5 Kollektör (%60 Isı)',
        },
        {
          id: '101-0',
          dateIso: '2026-10-18',
          dateLabel: '18 Ekim 2026',
          time: '19:10',
          device: 'Resepsiyon PC',
          action: 'Müşteri girişi yapıldı, tüm vanalar ve 5 kollektör açıldı',
          summary: '2/2 Ana Vana • 5/5 Kollektör (%100 Isı)',
        }
      );
    } else if (num === 102) {
      mainValves = [false, false];
      collectors = [true, true, true, true, true];
      occupied = false;
      note = 'Oda boş olduğu için ana vanalar kapatıldı (kollektör mandalları açık konumda).';
      history.push({
        id: '102-1',
        dateIso,
        dateLabel,
        time: '11:20',
        device: 'Telefon',
        action: 'Ana Vana 1 ve Ana Vana 2 kapatıldı (Oda boş)',
        summary: '0/2 Ana Vana • 5/5 Kollektör (%0 Isı)',
      });
    } else if (num === 105 || num === 108 || num === 114) {
      mainValves = [true, true];
      collectors = [true, true, false, true, false];
      occupied = true;
      note = 'Ilık mod: Cam önü ve koridor açık, 2 hat kısıldı.';
      history.push({
        id: `${num}-1`,
        dateIso,
        dateLabel,
        time: '10:15',
        device: 'Teknik Servis',
        action: 'K3 ve K5 kollektörleri kapatıldı (Ilık mod)',
        summary: '2/2 Ana Vana • 3/5 Kollektör (%60 Isı)',
      });
    } else if (num === 110 || num === 115 || num === 119) {
      mainValves = [false, false];
      collectors = [false, false, false, false, false];
      occupied = false;
      note = 'Oda boş - Ana vanalar ve kollektörler kapalı.';
      history.push({
        id: `${num}-1`,
        dateIso: '2026-10-18',
        dateLabel: '18 Ekim 2026',
        time: '14:00',
        device: 'Resepsiyon PC',
        action: 'Oda çıkış yaptı, ana vanalar ve kollektörler kapatıldı',
        summary: '0/2 Ana Vana • 0/5 Kollektör (%0 Isı)',
      });
    } else if (num === 112) {
      mainValves = [true, false];
      collectors = [true, true, true, true, false];
      occupied = true;
      note = '2. Ana vana kapalı! Devirdaim zayıf olabilir, kontrol edilmeli.';
      history.push({
        id: '112-1',
        dateIso,
        dateLabel,
        time: '10:50',
        device: 'Telefon',
        action: 'Ana Vana 2 kapatıldı (Tek ana vana açık uyarısı)',
        summary: '1/2 Ana Vana • 4/5 Kollektör (%40 Isı)',
      });
    } else if (num === 117 || num === 120) {
      mainValves = [true, true];
      collectors = [true, true, true, true, false];
      occupied = false;
      note = 'Yarın giriş var, ön ısıtma (4/5 kollektör açık).';
      history.push({
        id: `${num}-1`,
        dateIso,
        dateLabel,
        time: '09:30',
        device: 'Telefon',
        action: 'Ön ısıtma için ana vanalar ve 4 kollektör açıldı',
        summary: '2/2 Ana Vana • 4/5 Kollektör (%80 Isı)',
      });
    } else {
      history.push({
        id: `${num}-init`,
        dateIso: '2026-10-18',
        dateLabel: '18 Ekim 2026',
        time: '12:00',
        device: 'Sistem',
        action: 'Tam ısıtma modunda aktif (2 Ana Vana + 5 Kollektör Açık)',
        summary: '2/2 Ana Vana • 5/5 Kollektör (%100 Isı)',
      });
    }

    rooms.push({
      id: num,
      mainValves,
      collectors,
      occupied,
      note,
      updatedAt: `${dateLabel} 11:30`,
      history,
    });
  }
  return rooms;
}

function createDefaultLogs(): LogEntry[] {
  const { dateIso, dateLabel } = getNowDateAndTime();
  return [
    {
      id: 'init-1',
      dateIso,
      dateLabel,
      time: '11:35',
      device: 'Telefon',
      room: 101,
      msg: 'Kollektör K4 ve K5 kapatıldı (Ana vanalar açık, 3/5 aktif)',
    },
    {
      id: 'init-2',
      dateIso,
      dateLabel,
      time: '11:20',
      device: 'Telefon',
      room: 102,
      msg: 'Ana Vana 1 ve 2 kapatıldı (Isı kesildi)',
    },
    {
      id: 'init-3',
      dateIso,
      dateLabel,
      time: '10:50',
      device: 'Telefon',
      room: 112,
      msg: 'Ana Vana 2 kapatıldı (Tek ana vana açık uyarısı)',
    },
    {
      id: 'init-4',
      dateIso: '2026-10-18',
      dateLabel: '18 Ekim 2026',
      time: '19:10',
      device: 'Resepsiyon PC',
      room: 101,
      msg: 'Müşteri girişi yapıldı, tüm vanalar ve 5 kollektör açıldı',
    },
  ];
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
  const [logs, setLogs] = useState<LogEntry[]>(() => createDefaultLogs());

  // Refs to prevent stale closures & avoid overwriting localStorage on mount
  const roomsRef = useRef<Room[]>(rooms);
  const logsRef = useRef<LogEntry[]>(logs);
  const isPushingRef = useRef<boolean>(false);
  const lastUpdatedTimestampRef = useRef<number>(0);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  // View & Filter states
  const [mainTab, setMainTab] = useState<'grid' | 'daily_history'>('grid');
  const [activeFilter, setActiveFilter] = useState<'all' | 'full' | 'partial' | 'main_closed' | 'mismatch'>('all');
  const [occupancyFilter, setOccupancyFilter] = useState<'all' | 'occupied' | 'empty'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('all');
  const [historyRoomFilter, setHistoryRoomFilter] = useState<string>('all');

  // Room detail modal states
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [modalTab, setModalTab] = useState<'controls' | 'history'>('controls');
  const [modalNote, setModalNote] = useState('');
  const [customHistoryEntry, setCustomHistoryEntry] = useState('');

  // Other modals & drawers
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  // Automatic Firebase Sync States (pre-configured with doors-panel)
  const [deviceName, setDeviceName] = useState<string>('Bilgisayar');
  const [cloudUrl, setCloudUrl] = useState<string>(DEFAULT_FIREBASE_CONFIG.projectId);
  const [quickConnectInput, setQuickConnectInput] = useState<string>(DEFAULT_FIREBASE_CONFIG.projectId);
  const [syncStatus, setSyncStatus] = useState<'local' | 'synced' | 'syncing' | 'error'>('synced');
  const [syncErrorMsg, setSyncErrorMsg] = useState<string>('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('--:--');

  const showToast = useCallback((msg: string) => {
    setToastText(msg);
    setTimeout(() => {
      setToastText((prev) => (prev === msg ? null : prev));
    }, 2600);
  }, []);

  const resolvedFirebase = useMemo(() => parseFirebaseInput(cloudUrl), [cloudUrl]);

  // Save to localStorage & broadcast to all other open tabs on the same computer
  const persistLocalAndBroadcast = useCallback((nextRooms: Room[], nextLogs: LogEntry[], ts: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRooms));
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(nextLogs));
      localStorage.setItem('otel_yerden_isitma_ts_v2', String(ts));
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'STATE_UPDATE',
          updatedAtTs: ts,
          rooms: nextRooms,
          logs: nextLogs,
        });
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Automatic background push to Firebase (doors-panel Firestore)
  const pushToCloud = useCallback(
    async (nextRooms: Room[], nextLogs: LogEntry[], customInput?: string) => {
      const target = customInput !== undefined ? parseFirebaseInput(customInput) : resolvedFirebase;
      if (target.mode === 'none' || !target.endpoint) return;

      isPushingRef.current = true;
      setSyncStatus('syncing');
      setSyncErrorMsg('');
      const nowTs = Date.now();
      lastUpdatedTimestampRef.current = nowTs;

      const payloadObj = {
        updatedAtTs: nowTs,
        updatedBy: deviceName,
        rooms: nextRooms,
        logs: nextLogs,
      };

      try {
        let res: Response;
        if (target.mode === 'firestore') {
          res = await fetch(target.endpoint, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                payload: { stringValue: JSON.stringify(payloadObj) },
                updatedAtTs: { integerValue: String(nowTs) },
              },
            }),
          });
        } else {
          res = await fetch(target.endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadObj),
          });
        }

        if (res.ok) {
          setSyncStatus('synced');
          setLastSyncedAt(getNowTimeStr());
        } else {
          setSyncStatus('error');
          setSyncErrorMsg(`HTTP ${res.status}: Firestore izin/veritabanı kontrolü gerekli`);
        }
      } catch {
        setSyncStatus('error');
        setSyncErrorMsg('Bağlantı kurulamadı (İnternet veya güvenlik duvarı)');
      } finally {
        isPushingRef.current = false;
      }
    },
    [deviceName, resolvedFirebase]
  );

  // Automatic background pull from Firebase (doors-panel Firestore)
  const pullFromCloud = useCallback(
    async (silent = true, customInput?: string) => {
      if (isPushingRef.current) return;
      const target = customInput !== undefined ? parseFirebaseInput(customInput) : resolvedFirebase;
      if (target.mode === 'none' || !target.endpoint) return;

      if (!silent) setSyncStatus('syncing');
      try {
        const res = await fetch(target.endpoint, { cache: 'no-store' });
        if (res.status === 404 && target.mode === 'firestore') {
          await pushToCloud(roomsRef.current, logsRef.current, customInput);
          return;
        }
        if (!res.ok) {
          setSyncStatus('error');
          setSyncErrorMsg(`HTTP ${res.status}: Firestore veritabanı erişim uyarısı`);
          return;
        }
        const raw = await res.json();
        let data = raw;

        if (target.mode === 'firestore') {
          const strVal = raw?.fields?.payload?.stringValue;
          if (strVal) {
            data = JSON.parse(strVal);
          } else {
            await pushToCloud(roomsRef.current, logsRef.current, customInput);
            return;
          }
        }

        if (data && Array.isArray(data.rooms)) {
          const remoteTs = Number(data.updatedAtTs || 0);
          if (remoteTs > lastUpdatedTimestampRef.current) {
            lastUpdatedTimestampRef.current = remoteTs;
            setRooms(data.rooms);
            const nextLogs = Array.isArray(data.logs) ? data.logs : logsRef.current;
            setLogs(nextLogs);
            persistLocalAndBroadcast(data.rooms, nextLogs, remoteTs);
          }
          setSyncStatus('synced');
          setSyncErrorMsg('');
          setLastSyncedAt(getNowTimeStr());
          if (!silent) showToast('Tüm cihazlarla eşitlendi');
        } else if (data === null) {
          await pushToCloud(roomsRef.current, logsRef.current, customInput);
        }
      } catch {
        setSyncStatus('error');
        setSyncErrorMsg('Firebase sunucusuna ulaşılamadı');
      }
    },
    [persistLocalAndBroadcast, pushToCloud, resolvedFirebase, showToast]
  );

  // Initial load from localStorage + BroadcastChannel setup for instant same-computer tab sync
  useEffect(() => {
    try {
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
      setDeviceName(isMobile ? 'Telefon' : 'Bilgisayar');

      const savedTs = Number(localStorage.getItem('otel_yerden_isitma_ts_v2') || '0');
      if (savedTs > 0) {
        lastUpdatedTimestampRef.current = savedTs;
      }

      const savedRooms = localStorage.getItem(STORAGE_KEY);
      if (savedRooms) {
        const parsed = JSON.parse(savedRooms);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((r: Room) => ({
            ...r,
            history: Array.isArray(r.history) ? r.history : [],
          }));
          setRooms(normalized);
          roomsRef.current = normalized;
        }
      }

      const savedLogs = localStorage.getItem(LOG_STORAGE_KEY);
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs);
        if (Array.isArray(parsedLogs)) {
          setLogs(parsedLogs);
          logsRef.current = parsedLogs;
        }
      }

      const savedSync = localStorage.getItem(SYNC_CONFIG_KEY);
      if (savedSync) {
        const cfg = JSON.parse(savedSync);
        if (cfg.deviceName) setDeviceName(cfg.deviceName);
        if (cfg.cloudUrl) {
          setCloudUrl(cfg.cloudUrl);
          setQuickConnectInput(cfg.cloudUrl);
        }
      }
    } catch {
      // Ignore storage errors
    }

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.onmessage = (ev) => {
          const msg = ev.data;
          if (msg && msg.type === 'STATE_UPDATE' && Array.isArray(msg.rooms)) {
            const incomingTs = Number(msg.updatedAtTs || Date.now());
            lastUpdatedTimestampRef.current = incomingTs;
            setRooms(msg.rooms);
            if (Array.isArray(msg.logs)) setLogs(msg.logs);
          }
          if (msg && msg.type === 'SYNC_CONFIG_UPDATE' && typeof msg.cloudUrl === 'string') {
            setCloudUrl(msg.cloudUrl);
            setQuickConnectInput(msg.cloudUrl);
          }
        };
        broadcastChannelRef.current = bc;
      } catch {
        // Ignore BroadcastChannel errors
      }
    }

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, []);

  // Save sync config when changed
  const handleSaveCloudConfig = (newUrl: string, newDevice?: string) => {
    const cleanUrl = newUrl.trim() || DEFAULT_FIREBASE_CONFIG.projectId;
    const nextDev = newDevice !== undefined ? newDevice : deviceName;
    setCloudUrl(cleanUrl);
    setQuickConnectInput(cleanUrl);
    try {
      localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify({ deviceName: nextDev, cloudUrl: cleanUrl }));
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({ type: 'SYNC_CONFIG_UPDATE', cloudUrl: cleanUrl });
      }
    } catch {
      // Ignore
    }
    pullFromCloud(false, cleanUrl);
  };

  // Listen to storage events across tabs + poll Firebase doors-panel every 2 seconds
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      try {
        if (e.key === STORAGE_KEY && e.newValue) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setRooms(parsed);
        }
        if (e.key === LOG_STORAGE_KEY && e.newValue) {
          const parsedLogs = JSON.parse(e.newValue);
          if (Array.isArray(parsedLogs)) setLogs(parsedLogs);
        }
      } catch {
        // Ignore
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const handleFocus = () => {
      try {
        const savedRooms = localStorage.getItem(STORAGE_KEY);
        if (savedRooms) {
          const parsed = JSON.parse(savedRooms);
          if (Array.isArray(parsed) && parsed.length > 0) setRooms(parsed);
        }
        const savedLogs = localStorage.getItem(LOG_STORAGE_KEY);
        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);
          if (Array.isArray(parsedLogs)) setLogs(parsedLogs);
        }
      } catch {
        // Ignore
      }
      if (resolvedFirebase.mode !== 'none') {
        pullFromCloud(true);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (resolvedFirebase.mode !== 'none') {
      pullFromCloud(true);
      intervalId = setInterval(() => {
        pullFromCloud(true);
      }, 2000);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (intervalId) clearInterval(intervalId);
    };
  }, [resolvedFirebase, pullFromCloud]);

  // Central state commit: updates React state, writes localStorage, broadcasts to other tabs, and pushes to Firebase
  const applyRoomChange = (
    roomId: number,
    updater: (room: Room) => {
      mainValves?: [boolean, boolean];
      collectors?: [boolean, boolean, boolean, boolean, boolean];
      occupied?: boolean;
      note?: string;
      actionText: string;
    }
  ) => {
    const { dateIso, dateLabel, time, fullLabel } = getNowDateAndTime();
    const nowTs = Date.now();
    lastUpdatedTimestampRef.current = nowTs;
    let generatedActionText = '';

    const nextRooms = roomsRef.current.map((r) => {
      if (r.id !== roomId) return r;
      const changes = updater(r);
      const nextMain = changes.mainValves ?? r.mainValves;
      const nextCols = changes.collectors ?? r.collectors;
      const nextOcc = changes.occupied ?? r.occupied;
      const nextNote = changes.note ?? r.note;
      generatedActionText = changes.actionText;

      const historyEntry: RoomHistoryItem = {
        id: `${roomId}-${nowTs}-${Math.random().toString(36).slice(2, 6)}`,
        dateIso,
        dateLabel,
        time,
        device: deviceName,
        action: changes.actionText,
        summary: formatValvesSummary(nextMain, nextCols),
      };

      return {
        ...r,
        mainValves: nextMain,
        collectors: nextCols,
        occupied: nextOcc,
        note: nextNote,
        updatedAt: fullLabel,
        history: [historyEntry, ...(r.history || []).slice(0, 99)],
      };
    });

    const newLog: LogEntry = {
      id: `log-${nowTs}-${Math.random().toString(36).slice(2, 6)}`,
      dateIso,
      dateLabel,
      time,
      device: deviceName,
      room: roomId,
      msg: generatedActionText,
    };
    const nextLogs = [newLog, ...logsRef.current.slice(0, 299)];

    roomsRef.current = nextRooms;
    logsRef.current = nextLogs;
    setRooms(nextRooms);
    setLogs(nextLogs);

    persistLocalAndBroadcast(nextRooms, nextLogs, nowTs);
    showToast(`Oda ${roomId}: ${generatedActionText}`);

    if (resolvedFirebase.mode !== 'none') {
      pushToCloud(nextRooms, nextLogs);
    }
  };

  // Toggle a main valve (0 or 1)
  const handleToggleMainValve = (roomId: number, valveIndex: 0 | 1) => {
    applyRoomChange(roomId, (r) => {
      const updatedValves: [boolean, boolean] = [...r.mainValves] as [boolean, boolean];
      updatedValves[valveIndex] = !updatedValves[valveIndex];
      const isOpen = updatedValves[valveIndex];
      return {
        mainValves: updatedValves,
        actionText: `Ana Vana ${valveIndex + 1} ${isOpen ? 'AÇILDI' : 'KAPATILDI'}`,
      };
    });
  };

  // Toggle a collector (0..4)
  const handleToggleCollector = (roomId: number, colIndex: 0 | 1 | 2 | 3 | 4) => {
    applyRoomChange(roomId, (r) => {
      const updatedCols: [boolean, boolean, boolean, boolean, boolean] = [...r.collectors] as [
        boolean,
        boolean,
        boolean,
        boolean,
        boolean
      ];
      updatedCols[colIndex] = !updatedCols[colIndex];
      const isOpen = updatedCols[colIndex];
      const activeCount = updatedCols.filter(Boolean).length;
      return {
        collectors: updatedCols,
        actionText: `${COLLECTOR_LABELS[colIndex]} ${isOpen ? 'AÇILDI' : 'KAPATILDI'} (${activeCount}/5 kollektör aktif)`,
      };
    });
  };

  // Toggle Occupancy
  const handleToggleOccupancy = (roomId: number) => {
    applyRoomChange(roomId, (r) => {
      const nextOcc = !r.occupied;
      return {
        occupied: nextOcc,
        actionText: `Oda durumu ${nextOcc ? 'DOLU (Müşteri Var)' : 'BOŞ'} olarak değiştirildi`,
      };
    });
  };

  // Quick Room Presets
  const handleQuickPreset = (roomId: number, preset: 'full' | 'eco' | 'close_main') => {
    applyRoomChange(roomId, () => {
      if (preset === 'full') {
        return {
          mainValves: [true, true],
          collectors: [true, true, true, true, true],
          actionText: 'Tam ısıtmaya alındı (2 Ana Vana + 5/5 Kollektör Açık)',
        };
      }
      if (preset === 'eco') {
        return {
          mainValves: [true, true],
          collectors: [true, true, true, false, false],
          actionText: 'Isı düşürüldü: Ana vanalar açık, 2 kollektör kapatıldı (3/5 aktif)',
        };
      }
      return {
        mainValves: [false, false],
        actionText: 'Her iki Ana Vana kapatıldı (Odaya sıcak su girişi kesildi)',
      };
    });
  };

  // Add manual daily record inside a room
  const handleAddCustomRoomLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoomId === null || !customHistoryEntry.trim()) return;
    const text = customHistoryEntry.trim();
    applyRoomChange(selectedRoomId, () => ({
      note: text,
      actionText: `Not / Kontrol Kaydı: ${text}`,
    }));
    setModalNote(text);
    setCustomHistoryEntry('');
  };

  // Bulk Actions
  const handleBulkAction = (type: 'all_full' | 'empty_eco' | 'empty_main_off' | 'all_main_off') => {
    const { dateIso, dateLabel, time, fullLabel } = getNowDateAndTime();
    const nowTs = Date.now();
    lastUpdatedTimestampRef.current = nowTs;
    let affected = 0;
    let actionLabel = '';

    if (type === 'all_full') actionLabel = 'Toplu İşlem: Tam ısıtmaya (2V + 5K) alındı';
    if (type === 'empty_eco') actionLabel = 'Toplu İşlem (Boş Oda): 2 kollektör kapatıldı (3/5 aktif)';
    if (type === 'empty_main_off') actionLabel = 'Toplu İşlem (Boş Oda): Ana vanalar kapatıldı';
    if (type === 'all_main_off') actionLabel = 'Toplu İşlem: Ana vanalar kapatıldı';

    const nextRooms = roomsRef.current.map((r) => {
      let shouldUpdate = false;
      let nextMain: [boolean, boolean] = r.mainValves;
      let nextCols: [boolean, boolean, boolean, boolean, boolean] = r.collectors;

      if (type === 'all_full') {
        shouldUpdate = true;
        nextMain = [true, true];
        nextCols = [true, true, true, true, true];
      } else if (type === 'empty_eco' && !r.occupied) {
        shouldUpdate = true;
        nextMain = [true, true];
        nextCols = [true, true, true, false, false];
      } else if (type === 'empty_main_off' && !r.occupied) {
        shouldUpdate = true;
        nextMain = [false, false];
      } else if (type === 'all_main_off') {
        shouldUpdate = true;
        nextMain = [false, false];
      }

      if (!shouldUpdate) return r;
      affected++;

      const entry: RoomHistoryItem = {
        id: `${r.id}-${nowTs}-${Math.random().toString(36).slice(2, 5)}`,
        dateIso,
        dateLabel,
        time,
        device: deviceName,
        action: actionLabel,
        summary: formatValvesSummary(nextMain, nextCols),
      };

      return {
        ...r,
        mainValves: nextMain,
        collectors: nextCols,
        updatedAt: fullLabel,
        history: [entry, ...(r.history || []).slice(0, 99)],
      };
    });

    const bulkLog: LogEntry = {
      id: `bulk-${nowTs}`,
      dateIso,
      dateLabel,
      time,
      device: deviceName,
      room: type.startsWith('empty') ? 'Boş Odalar' : '101-120',
      msg: `${actionLabel} (${affected} oda güncellendi)`,
    };

    const nextLogs = [bulkLog, ...logsRef.current.slice(0, 299)];
    roomsRef.current = nextRooms;
    logsRef.current = nextLogs;
    setRooms(nextRooms);
    setLogs(nextLogs);

    persistLocalAndBroadcast(nextRooms, nextLogs, nowTs);
    setIsBulkOpen(false);
    showToast(`${affected} oda için toplu işlem kaydedildi`);

    if (resolvedFirebase.mode !== 'none') {
      pushToCloud(nextRooms, nextLogs);
    }
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
      'Son Guncelleme',
      'Son Islem',
      'Not',
    ];
    const rows = rooms.map((r) => {
      const m = getRoomMetrics(r);
      const lastAction =
        r.history && r.history[0]
          ? `${r.history[0].dateLabel} ${r.history[0].time} - ${r.history[0].action}`
          : '';
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
        `"${r.updatedAt || ''}"`,
        `"${lastAction.replace(/"/g, '""')}"`,
        `"${(r.note || '').replace(/"/g, '""')}"`,
      ].join(',');
    });
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'otel_yerden_isitma_gunluk_rapor_101_120.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV durum ve tarihçe raporu indirildi');
  };

  // Export / Import JSON Backup
  const handleExportJsonBackup = () => {
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), rooms, logs }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'otel_isitma_yedek.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Tam sistem yedeği indirildi');
  };

  const handleImportJsonBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && Array.isArray(parsed.rooms)) {
          const nowTs = Date.now();
          const nextLogs = Array.isArray(parsed.logs) ? parsed.logs : logsRef.current;
          roomsRef.current = parsed.rooms;
          logsRef.current = nextLogs;
          setRooms(parsed.rooms);
          setLogs(nextLogs);
          persistLocalAndBroadcast(parsed.rooms, nextLogs, nowTs);
          if (resolvedFirebase.mode !== 'none') {
            pushToCloud(parsed.rooms, nextLogs);
          }
          showToast('Yedek dosyası başarıyla yüklendi');
          setIsSyncModalOpen(false);
        }
      } catch {
        showToast('Yedek dosyası okunamadı');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    const { dateIso, dateLabel, time } = getNowDateAndTime();
    const nowTs = Date.now();
    const defaultRooms = createDefaultRooms();
    const resetLogs: LogEntry[] = [
      {
        id: `reset-${nowTs}`,
        dateIso,
        dateLabel,
        time,
        device: deviceName,
        room: 'Sistem',
        msg: 'Varsayılan oda ayarlarına sıfırlandı',
      },
    ];
    roomsRef.current = defaultRooms;
    logsRef.current = resetLogs;
    setRooms(defaultRooms);
    setLogs(resetLogs);
    persistLocalAndBroadcast(defaultRooms, resetLogs, nowTs);
    if (resolvedFirebase.mode !== 'none') {
      pushToCloud(defaultRooms, resetLogs);
    }
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

  // Flatten all per-room histories grouped by day for the "Gün Gün Oda Kayıtları" view
  const allRoomHistoryDates = useMemo(() => {
    const dateSet = new Set<string>();
    rooms.forEach((r) => {
      (r.history || []).forEach((h) => {
        if (h.dateIso) dateSet.add(h.dateIso);
      });
    });
    return Array.from(dateSet).sort((a, b) => b.localeCompare(a));
  }, [rooms]);

  const groupedDailyRoomHistory = useMemo(() => {
    const allItems: (RoomHistoryItem & { roomId: number })[] = [];
    rooms.forEach((r) => {
      if (historyRoomFilter !== 'all' && String(r.id) !== historyRoomFilter) return;
      (r.history || []).forEach((h) => {
        if (historyDateFilter !== 'all' && h.dateIso !== historyDateFilter) return;
        allItems.push({ ...h, roomId: r.id });
      });
    });

    const groups: Record<
      string,
      { dateIso: string; dateLabel: string; items: (RoomHistoryItem & { roomId: number })[] }
    > = {};
    allItems.forEach((item) => {
      if (!groups[item.dateIso]) {
        groups[item.dateIso] = {
          dateIso: item.dateIso,
          dateLabel: item.dateLabel,
          items: [],
        };
      }
      groups[item.dateIso].items.push(item);
    });

    return Object.values(groups).sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  }, [rooms, historyDateFilter, historyRoomFilter]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  // Group selected room's history by date
  const selectedRoomHistoryByDay = useMemo(() => {
    if (!selectedRoom) return [];
    const groups: Record<string, { dateIso: string; dateLabel: string; items: RoomHistoryItem[] }> = {};
    (selectedRoom.history || []).forEach((h) => {
      const key = h.dateIso || 'belirsiz';
      if (!groups[key]) {
        groups[key] = { dateIso: key, dateLabel: h.dateLabel || key, items: [] };
      }
      groups[key].items.push(h);
    });
    return Object.values(groups).sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  }, [selectedRoom]);

  const openRoomDetail = (room: Room, defaultTab: 'controls' | 'history' = 'controls') => {
    setSelectedRoomId(room.id);
    setModalTab(defaultTab);
    setModalNote(room.note || '');
  };

  const handleSaveModalNote = () => {
    if (selectedRoomId !== null) {
      const room = rooms.find((r) => r.id === selectedRoomId);
      if (room && room.note !== modalNote.trim()) {
        applyRoomChange(selectedRoomId, () => ({
          note: modalNote.trim(),
          actionText: `Oda notu güncellendi: "${modalNote.trim() || 'Not silindi'}"`,
        }));
      } else {
        showToast(`Oda ${selectedRoomId} kaydedildi`);
      }
    }
    setSelectedRoomId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Header (Light & Clean) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
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
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900">
                    Otel Yerden Isıtma Takip Paneli
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                    101 – 120 (20 Oda)
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Firebase (<strong className="text-slate-700">doors-panel</strong>) canlı senkronizasyon • Oda içi gün gün kayıtlı
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Automatic Live Sync Status Badge */}
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                syncStatus === 'synced'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : syncStatus === 'error'
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-500'
                    : syncStatus === 'syncing'
                    ? 'bg-amber-500 animate-ping'
                    : syncStatus === 'error'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
              />
              <span>
                {syncStatus === 'synced'
                  ? `Canlı Bağlı: doors-panel (${lastSyncedAt})`
                  : syncStatus === 'syncing'
                  ? 'Eşitleniyor...'
                  : syncStatus === 'error'
                  ? 'Bağlantı Uyarısı (Detay)'
                  : 'Telefon ↔ PC Bağlı (doors-panel)'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsBulkOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm transition"
            >
              <span>Toplu İşlem</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm transition"
            >
              <span>Hareket Kayıtları</span>
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-orange-100 text-orange-700 font-bold">
                {logs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm transition"
            >
              <span>Rapor İndir (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition"
            >
              Sıfırla
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 sm:px-6 space-y-5">
        {syncStatus === 'error' && syncErrorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center justify-between gap-2 text-xs text-rose-800 shadow-sm">
            <span>
              <strong>Firebase (doors-panel) Uyarısı:</strong> {syncErrorMsg}. Lütfen Firebase Console &gt; Firestore Database bölümünde veritabanının oluşturulduğundan ve Rules (Kurallar) kısmının açık olduğundan emin olun.
            </span>
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold shrink-0 transition"
            >
              Kontrol Et
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Toplam Oda</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">101-120</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
              <span className="text-xs font-semibold text-emerald-600">
                {stats.occupiedCount} Dolu • {stats.emptyCount} Boş
              </span>
            </div>
          </div>

          <div className="bg-white border border-orange-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-orange-700">
              <span>Tam Isıtan Odalar</span>
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-orange-600">{stats.fullCount}</span>
              <span className="text-xs text-slate-500">2 Vana + 5/5 Kollektör</span>
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-700">
              <span>Kısmi / Kısık Isıtma</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-600">{stats.partialCount}</span>
              <span className="text-xs text-slate-500">Kollektör/Vana Kısık</span>
            </div>
          </div>

          <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-700">
              <span>Ana Vanası Kapalı</span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-rose-600">{stats.closedCount}</span>
              <span className="text-xs text-slate-500">Isı Akışı Kesik (%0)</span>
            </div>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-white border border-sky-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-sky-700">
              <span>Aktif Kollektör Oranı</span>
              <span className="text-xs font-bold text-sky-600">%{stats.roundedFlow}</span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xl font-bold text-slate-900">{stats.roundedFlow} / 100</span>
                <span className="text-[11px] text-slate-500">Su Geçen Hat</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-orange-500 transition-all duration-300"
                  style={{ width: `${stats.roundedFlow}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Main View Switcher: Oda Paneli vs Gün Gün Oda Tarihçesi */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMainTab('grid')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                mainTab === 'grid'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Oda Vana &amp; Kollektör Paneli (101–120)
            </button>
            <button
              type="button"
              onClick={() => setMainTab('daily_history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                mainTab === 'daily_history'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Gün Gün Oda Değişiklik Kayıtları</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  mainTab === 'daily_history' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                Tarihçe
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 px-2">
            <span>
              Aktif Cihaz: <strong className="text-slate-800">{deviceName}</strong> • Proje:{' '}
              <strong className="text-emerald-600">doors-panel</strong>
            </span>
          </div>
        </div>

        {mainTab === 'grid' ? (
          <>
            {/* Filter & Search Toolbar */}
            <section className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                    className={`px-3 py-1.5 rounded-xl text-xs transition ${
                      activeFilter === tab.id
                        ? 'bg-slate-900 text-white font-semibold shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium'
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
                  className="flex-1 sm:w-56 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
                <select
                  value={occupancyFilter}
                  onChange={(e) => setOccupancyFilter(e.target.value as 'all' | 'occupied' | 'empty')}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                >
                  <option value="all">Tüm Doluluk Durumları</option>
                  <option value="occupied">Sadece Dolu Odalar</option>
                  <option value="empty">Sadece Boş Odalar</option>
                </select>
              </div>
            </section>

            {/* Rooms Grid (Light Cards) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredRooms.map((room) => {
                const m = getRoomMetrics(room);
                const latestHistory = room.history && room.history.length > 0 ? room.history[0] : null;

                let borderClass = 'border-slate-200 hover:border-slate-300';
                let badgeClass = 'bg-slate-100 text-slate-700';
                if (m.statusColor === 'orange') {
                  borderClass = 'border-orange-200 hover:border-orange-400';
                  badgeClass = 'bg-orange-50 text-orange-700 border border-orange-200';
                } else if (m.statusColor === 'amber') {
                  borderClass = 'border-amber-300 hover:border-amber-400';
                  badgeClass = 'bg-amber-50 text-amber-800 border border-amber-200';
                } else if (m.statusColor === 'rose') {
                  borderClass = 'border-rose-200 hover:border-rose-400';
                  badgeClass = 'bg-rose-50 text-rose-700 border border-rose-200';
                }

                return (
                  <div
                    key={room.id}
                    className={`bg-white border-2 ${borderClass} rounded-2xl p-4 flex flex-col justify-between transition shadow-sm hover:shadow-md`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-extrabold text-slate-900 tracking-tight">Oda {room.id}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleOccupancy(room.id)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                              room.occupied
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {room.occupied ? 'DOLU' : 'BOŞ'}
                          </button>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>
                          {m.statusLabel}
                        </span>
                      </div>

                      {/* Warnings */}
                      {m.allMainClosed && m.openCollectorCount > 0 && (
                        <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-medium flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          <span>Ana vanalar kapalı! ({m.openCollectorCount} kollektör açık ama su geçmiyor)</span>
                        </div>
                      )}
                      {m.oneMainClosed && (
                        <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-medium flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          <span>Ana vanalardan biri kapalı! Devirdaim için 2 ana vana da açık olmalı.</span>
                        </div>
                      )}
                      {m.bothMainOpen && m.openCollectorCount === 0 && (
                        <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <span>Ana vanalar açık ama 5 kollektörün tamamı kapalı!</span>
                        </div>
                      )}

                      {/* 2 Main Valves */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <span className="font-medium">Ana Vanalar ({m.openMainCount}/2 Açık)</span>
                          <span className="font-bold text-slate-800">Isı Gücü: %{m.effectivePct}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {([0, 1] as const).map((vIdx) => {
                            const isOpen = room.mainValves[vIdx];
                            return (
                              <button
                                key={vIdx}
                                type="button"
                                onClick={() => handleToggleMainValve(room.id, vIdx)}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                                  isOpen
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                                    : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  <span>Ana Vana {vIdx + 1}</span>
                                </span>
                                <span className="text-[10px] font-extrabold uppercase">
                                  {isOpen ? 'AÇIK' : 'KAPALI'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 5 Collectors */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <span className="font-medium">Kollektör Hatları ({m.openCollectorCount}/5 Açık)</span>
                          <span className="text-[10px] text-slate-400">Tıkla Aç/Kapat</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {([0, 1, 2, 3, 4] as const).map((cIdx) => {
                            const cOpen = room.collectors[cIdx];
                            const flowing = cOpen && m.bothMainOpen;
                            const restrictedFlow = cOpen && m.oneMainClosed;

                            let cStyle =
                              'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-700';
                            if (flowing) {
                              cStyle =
                                'bg-orange-500 text-white border-orange-500 font-bold shadow-sm shadow-orange-500/25 hover:bg-orange-600';
                            } else if (restrictedFlow) {
                              cStyle =
                                'bg-amber-100 text-amber-900 border-amber-300 font-semibold hover:bg-amber-200';
                            } else if (cOpen && m.allMainClosed) {
                              cStyle =
                                'bg-amber-50 text-amber-800 border-amber-300 border-dashed hover:bg-amber-100';
                            }

                            return (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={() => handleToggleCollector(room.id, cIdx)}
                                title={`${COLLECTOR_LABELS[cIdx]}: ${cOpen ? 'AÇIK' : 'KAPALI'}`}
                                className={`flex flex-col items-center justify-center py-1.5 rounded-xl border text-xs transition ${cStyle}`}
                              >
                                <span className="text-[11px] leading-none font-bold">K{cIdx + 1}</span>
                                <span className="text-[9px] mt-0.5 opacity-90">{cOpen ? 'Açık' : 'Kapalı'}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Room Note */}
                      {room.note && (
                        <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-slate-700 line-clamp-2">
                          <span className="text-orange-600 font-bold">Not:</span> {room.note}
                        </div>
                      )}

                      {/* Latest Per-Room History Preview */}
                      {latestHistory && (
                        <button
                          type="button"
                          onClick={() => openRoomDetail(room, 'history')}
                          className="mt-2 w-full text-left px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition group"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-bold text-sky-700 group-hover:underline">
                              Son Kayıt ({latestHistory.dateLabel} {latestHistory.time})
                            </span>
                            <span className="font-semibold text-slate-600">{(room.history || []).length} kayıt →</span>
                          </div>
                          <div className="text-[11px] text-slate-700 truncate mt-0.5 font-medium">
                            {latestHistory.action}
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Quick Footer Actions */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickPreset(room.id, 'full')}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-700 transition"
                        >
                          Tam Aç
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickPreset(room.id, 'eco')}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 transition"
                        >
                          3/5 Kıs
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickPreset(room.id, 'close_main')}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 transition"
                        >
                          Ana Vana Kapat
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => openRoomDetail(room, 'history')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-orange-600 hover:bg-orange-50 transition"
                      >
                        Detay / Not ({(room.history || []).length})
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>

            {filteredRooms.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 shadow-sm">
                <p className="text-sm text-slate-600 font-medium">Seçilen filtreye uygun oda bulunamadı.</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter('all');
                    setOccupancyFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition"
                >
                  Filtreleri Temizle
                </button>
              </div>
            )}
          </>
        ) : (
          /* GÜN GÜN ODA DEĞİŞİKLİK KAYITLARI (DAILY ROOM HISTORY VIEW - LIGHT THEME) */
          <section className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Oda İçi Gün Gün Değişiklik Kayıtları (101–120)</h2>
                <p className="text-xs text-slate-500">
                  Hangi gün, hangi odada, saat kaçta hangi vana veya kollektör değiştirildi detaylı listesi
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                >
                  <option value="all">Tüm Günler</option>
                  {allRoomHistoryDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select
                  value={historyRoomFilter}
                  onChange={(e) => setHistoryRoomFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                >
                  <option value="all">Tüm Odalar (101-120)</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      Oda {r.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {groupedDailyRoomHistory.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500 shadow-sm">
                Seçilen kriterlere uygun günlük oda kaydı bulunamadı.
              </div>
            ) : (
              groupedDailyRoomHistory.map((group) => (
                <div
                  key={group.dateIso}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      <h3 className="text-sm font-bold text-slate-900">{group.dateLabel}</h3>
                      <span className="text-xs text-slate-500">({group.dateIso})</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                      {group.items.length} İşlem
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              const r = rooms.find((rm) => rm.id === item.roomId);
                              if (r) openRoomDetail(r, 'history');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs shrink-0 transition"
                          >
                            Oda {item.roomId}
                          </button>
                          <div>
                            <div className="text-xs font-semibold text-slate-900">{item.action}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Durum Özeti: <span className="text-slate-700 font-medium">{item.summary}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:shrink-0 text-[11px] text-slate-500">
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                            {item.device}
                          </span>
                          <span className="font-mono text-slate-700 font-bold">{item.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        )}
      </main>

      {/* Room Detail & Per-Room Daily History Modal (Light Theme) */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Oda {selectedRoom.id} — Vana Kontrolü &amp; Gün Gün Kayıtlar
                </h2>
                <p className="text-xs text-slate-500">Son değişiklik: {selectedRoom.updatedAt}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomId(null)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              >
                Kapat ✕
              </button>
            </div>

            {/* Modal Internal Tabs */}
            <div className="px-5 pt-2 bg-white border-b border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalTab('controls')}
                className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition ${
                  modalTab === 'controls'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Vana &amp; Kollektör Ayarları
              </button>
              <button
                type="button"
                onClick={() => setModalTab('history')}
                className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  modalTab === 'history'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Oda İçi Gün Gün Geçmiş</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-orange-100 text-orange-700">
                  {(selectedRoom.history || []).length}
                </span>
              </button>
            </div>

            {modalTab === 'controls' ? (
              <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">Oda Durumu:</span>
                    <button
                      type="button"
                      onClick={() => handleToggleOccupancy(selectedRoom.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                        selectedRoom.occupied
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                    >
                      {selectedRoom.occupied ? 'Müşteri Var (DOLU)' : 'Oda Boş (BOŞ)'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(selectedRoom.id, 'full')}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition"
                    >
                      Tam Aç (2V + 5K)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(selectedRoom.id, 'eco')}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition"
                    >
                      Kısık Mod (3/5 K)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(selectedRoom.id, 'close_main')}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                    >
                      Ana Vanayı Kapat
                    </button>
                  </div>
                </div>

                {/* 2 Main Valves */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Ana Vanalar (2 Adet - Oda Ana Giriş &amp; Dönüş)
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
                              ? 'border-emerald-300 bg-emerald-50'
                              : 'border-rose-200 bg-rose-50'
                          }`}
                        >
                          <div>
                            <div className={`text-xs font-bold ${isOpen ? 'text-emerald-800' : 'text-rose-800'}`}>
                              {label}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {isOpen ? 'Su geçişi aktif' : 'Vana kapalı'}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isOpen ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
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
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Kollektör Hatları (5 Adet)
                    </label>
                    <span className="text-xs font-bold text-orange-600">
                      {selectedRoom.collectors.filter(Boolean).length} / 5 Kollektör Açık
                    </span>
                  </div>
                  <div className="space-y-2">
                    {([0, 1, 2, 3, 4] as const).map((cIdx) => {
                      const cOpen = selectedRoom.collectors[cIdx];
                      return (
                        <div
                          key={cIdx}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                                cOpen ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              K{cIdx + 1}
                            </span>
                            <div>
                              <div className="text-xs font-semibold text-slate-800">{COLLECTOR_LABELS[cIdx]}</div>
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
                                ? 'bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Oda Güncel Notu
                  </label>
                  <textarea
                    rows={2}
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    placeholder="Örn: Müşteri çok sıcak dediği için 2 kollektör kapatıldı..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>
            ) : (
              /* PER-ROOM DAY-BY-DAY HISTORY TAB */
              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                <form onSubmit={handleAddCustomRoomLog} className="flex gap-2">
                  <input
                    type="text"
                    value={customHistoryEntry}
                    onChange={(e) => setCustomHistoryEntry(e.target.value)}
                    placeholder="Bu oda için yeni günlük kontrol/bakım notu ekle..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shrink-0 transition"
                  >
                    Kayda Ekle
                  </button>
                </form>

                {selectedRoomHistoryByDay.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Bu oda için henüz kayıt bulunmuyor.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedRoomHistoryByDay.map((dayGroup) => (
                      <div
                        key={dayGroup.dateIso}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                      >
                        <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-bold text-orange-600">{dayGroup.dateLabel}</span>
                          <span className="text-[11px] font-medium text-slate-500">
                            {dayGroup.items.length} değişiklik
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {dayGroup.items.map((h) => (
                            <div key={h.id} className="p-3 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-sky-700">{h.device}</span>
                                <span className="font-mono font-semibold text-slate-500">{h.time}</span>
                              </div>
                              <div className="text-xs text-slate-900 font-semibold">{h.action}</div>
                              <div className="text-[11px] text-slate-500">{h.summary}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                Her vana/kollektör değişimi otomatik olarak gün ve saatiyle kaydedilir.
              </span>
              <button
                type="button"
                onClick={handleSaveModalNote}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition"
              >
                Notu Kaydet & Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Firebase Status & Device Modal (Light Theme) */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Firebase (doors-panel) &amp; Cihaz Ayarları
                </h2>
                <p className="text-xs text-slate-500">
                  Projeniz (`doors-panel`) doğrudan koda entegre edildi ve aktif
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              >
                Kapat ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">
                    Firebase Projesi Bağlı: doors-panel
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                    Firestore REST Aktif
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                  Gönderdiğiniz <code className="font-mono font-bold">doors-panel</code> API anahtarı ve proje bilgileri doğrudan koda gömüldü. Telefonda veya bilgisayarda vanaya tıkladığınız anda otomatik olarak tüm cihazlarda güncellenir.
                </p>
              </div>

              {/* Device Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Bu Cihazın Adı (Oda Geçmişinde Kim Değiştirdi Görünmesi İçin)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Telefon', 'Bilgisayar', 'Resepsiyon', 'Teknik Servis'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDeviceName(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                        deviceName === preset
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="Örn: Telefon"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Manual Backup Export/Import */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportJsonBackup}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition"
                  >
                    Yedek İndir (.json)
                  </button>
                  <label className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 cursor-pointer transition">
                    <span>Yedek Yükle (.json)</span>
                    <input type="file" accept=".json" onChange={handleImportJsonBackup} className="hidden" />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                >
                  Varsayılana Sıfırla
                </button>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  handleSaveCloudConfig(quickConnectInput, deviceName);
                  setIsSyncModalOpen(false);
                  showToast('Ayarlar kaydedildi');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Operations Modal (Light Theme) */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Toplu Vana &amp; Kollektör İşlemleri</h2>
              <button
                type="button"
                onClick={() => setIsBulkOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              >
                Kapat ✕
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600">
                Hazır senaryolarla tüm odaları (101–120) veya sadece boş odaları tek tıkla ayarlayabilirsiniz:
              </p>
              <button
                type="button"
                onClick={() => handleBulkAction('all_full')}
                className="w-full text-left p-3.5 rounded-xl bg-orange-50/70 hover:bg-orange-100/80 border border-orange-200 flex items-center justify-between transition"
              >
                <div>
                  <div className="text-xs font-bold text-orange-800">Tüm Odaları Tam Isıtmaya Al (101-120)</div>
                  <div className="text-[11px] text-slate-600">2 Ana Vana Açık + 5/5 Kollektör Açık (%100)</div>
                </div>
                <span className="text-xs font-bold text-orange-600">Uygula →</span>
              </button>

              <button
                type="button"
                onClick={() => handleBulkAction('empty_eco')}
                className="w-full text-left p-3.5 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200 flex items-center justify-between transition"
              >
                <div>
                  <div className="text-xs font-bold text-amber-900">Boş Odalarda 2 Kollektörü Kapat (Tasarruf)</div>
                  <div className="text-[11px] text-slate-600">Boş odalarda Ana Vanalar Açık, 3/5 Kollektör Açık (%60)</div>
                </div>
                <span className="text-xs font-bold text-amber-700">Uygula →</span>
              </button>

              <button
                type="button"
                onClick={() => handleBulkAction('empty_main_off')}
                className="w-full text-left p-3.5 rounded-xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200 flex items-center justify-between transition"
              >
                <div>
                  <div className="text-xs font-bold text-rose-800">Boş Odaların Ana Vanalarını Kapat</div>
                  <div className="text-[11px] text-slate-600">Boş odalarda 2 Ana Vana Kapatılır (%0 Isı)</div>
                </div>
                <span className="text-xs font-bold text-rose-600">Uygula →</span>
              </button>

              <button
                type="button"
                onClick={() => handleBulkAction('all_main_off')}
                className="w-full text-left p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between transition"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800">Tüm Otelin Ana Vanalarını Kapat</div>
                  <div className="text-[11px] text-slate-500">101-120 tüm ana vanaları kapatır</div>
                </div>
                <span className="text-xs font-bold text-slate-600">Uygula →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Drawer (Light Theme) */}
      {isLogOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border-l border-slate-200 w-full max-w-md h-full flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Genel Hareket Kayıtları</h2>
                <p className="text-xs text-slate-500">Tarih, saat ve cihaz bilgisiyle tüm işlemler</p>
              </div>
              <button
                type="button"
                onClick={() => setIsLogOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              >
                Kapat ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">Henüz kayıtlı işlem bulunmuyor.</p>
              ) : (
                logs.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-bold text-[10px]">
                        Oda {item.room}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {item.dateLabel} • <strong className="text-slate-800">{item.time}</strong> ({item.device})
                      </span>
                    </div>
                    <div className="text-slate-800 font-medium">{item.msg}</div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const nowTs = Date.now();
                  logsRef.current = [];
                  setLogs([]);
                  persistLocalAndBroadcast(roomsRef.current, [], nowTs);
                  showToast('Genel hareket kayıtları temizlendi');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                Kayıtları Temizle
              </button>
              <span className="text-[11px] text-slate-500">Oda içi günlük kayıtlar korunur</span>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastText && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
          <span>{toastText}</span>
        </div>
      )}
    </div>
  );
}
