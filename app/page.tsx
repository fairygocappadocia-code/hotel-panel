'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// Firebase projesi: doors-panel
// Bu panel mevcut Firestore REST senkronizasyonunu kullanÄ±r.
// Firebase Console > Firestore Database bÃ¶lÃ¼mÃ¼nde veritabanÄ± oluÅŸturulmalÄ±dÄ±r.
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBkAafEYmhC_UCIK6nK19zGn1pEy45mtVA',
  authDomain: 'doors-panel.firebaseapp.com',
  projectId: 'doors-panel',
  storageBucket: 'doors-panel.firebasestorage.app',
  messagingSenderId: '717146829376',
  appId: '1:717146829376:web:1b05588aa972d56e0865a5',
  measurementId: 'G-N98E7SFG26',
  databaseURL: '', // Realtime Database URL verilmedi; Firestore kullanÄ±lacak.
};

interface RoomHistoryItem {
  id: string;
  dateIso: string; // YYYY-MM-DD
  dateLabel: string; // e.g. 19 Ekim 2026
  time: string; // HH:mm
  device: string; // e.g. Telefon, Resepsiyon PC
  action: string; // e.g. KollektÃ¶r K4 kapatÄ±ldÄ±
  summary: string; // e.g. 2/2 Ana Vana â€¢ 3/5 KollektÃ¶r (%60)
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
const SYNC_CONFIG_KEY = 'otel_yerden_isitma_sync_v2';

const COLLECTOR_LABELS: [string, string, string, string, string] = [
  'K1 (Yatak OdasÄ±)',
  'K2 (Cam Ã–nÃ¼)',
  'K3 (Oturma AlanÄ±)',
  'K4 (Koridor/GiriÅŸ)',
  'K5 (Banyo)',
];

const MONTHS_TR = [
  'Ocak',
  'Åubat',
  'Mart',
  'Nisan',
  'MayÄ±s',
  'Haziran',
  'Temmuz',
  'AÄŸustos',
  'EylÃ¼l',
  'Ekim',
  'KasÄ±m',
  'AralÄ±k',
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

function formatValvesSummary(mainValves: [boolean, boolean], collectors: [boolean, boolean, boolean, boolean, boolean]) {
  const openMain = mainValves.filter(Boolean).length;
  const openCol = collectors.filter(Boolean).length;
  const pct = openMain === 2 ? openCol * 20 : openMain === 1 ? Math.round(openCol * 10) : 0;
  return `${openMain}/2 Ana Vana â€¢ ${openCol}/5 KollektÃ¶r (%${pct} IsÄ±)`;
}

// Parse pasted firebaseConfig snippet, projectId, or databaseURL automatically
function parseFirebaseInput(raw: string): { mode: 'rtdb' | 'firestore' | 'none'; endpoint: string; label: string } {
  const text = (raw || '').trim();
  if (!text) {
    if (DEFAULT_FIREBASE_CONFIG.databaseURL) {
      const clean = DEFAULT_FIREBASE_CONFIG.databaseURL.replace(/\/+$/, '');
      return {
        mode: 'rtdb',
        endpoint: clean.endsWith('.json') ? clean : `${clean}/otel_yerden_isitma_v2.json`,
        label: 'Firebase Realtime DB (.env)',
      };
    }
    if (DEFAULT_FIREBASE_CONFIG.projectId) {
      const pid = DEFAULT_FIREBASE_CONFIG.projectId.trim();
      const keyParam = DEFAULT_FIREBASE_CONFIG.apiKey ? `?key=${encodeURIComponent(DEFAULT_FIREBASE_CONFIG.apiKey)}` : '';
      return {
        mode: 'firestore',
        endpoint: `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/otel_takip/yerden_isitma_v2${keyParam}`,
        label: `Firebase Firestore (${pid})`,
      };
    }
    return { mode: 'none', endpoint: '', label: '' };
  }

  // Check if user pasted a full firebaseConfig object
  const dbUrlMatch = text.match(/https:\/\/[a-zA-Z0-9-]+(?:-[a-zA-Z0-9-]+)*\.(?:firebaseio\.com|firebasedatabase\.app)[^\s"']*/);
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
    const keyParam = apiKeyMatch ? `?key=${encodeURIComponent(apiKeyMatch[1].trim())}` : '';
    return {
      mode: 'firestore',
      endpoint: `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/otel_takip/yerden_isitma_v2${keyParam}`,
      label: `Firebase Firestore (${pid})`,
    };
  }

  // If it's a direct http(s) URL
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

  // Otherwise treat plain string as Firebase projectId (e.g. "otel-takip-12345")
  const cleanPid = text.replace(/[^a-zA-Z0-9-_]/g, '');
  if (cleanPid.length >= 4) {
    return {
      mode: 'firestore',
      endpoint: `https://firestore.googleapis.com/v1/projects/${cleanPid}/databases/(default)/documents/otel_takip/yerden_isitma_v2`,
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
      note = 'MÃ¼ÅŸteri oda Ã§ok sÄ±cak dediÄŸi iÃ§in 2 kollektÃ¶r kapatÄ±ldÄ±, ana vanalar aÃ§Ä±k.';
      history.push(
        {
          id: '101-1',
          dateIso,
          dateLabel,
          time: '11:35',
          device: 'Telefon',
          action: 'KollektÃ¶r K4 ve K5 kapatÄ±ldÄ± (IsÄ± dÃ¼ÅŸÃ¼rÃ¼ldÃ¼)',
          summary: '2/2 Ana Vana â€¢ 3/5 KollektÃ¶r (%60 IsÄ±)',
        },
        {
          id: '101-0',
          dateIso: '2026-10-18',
          dateLabel: '18 Ekim 2026',
          time: '19:10',
          device: 'Resepsiyon PC',
          action: 'MÃ¼ÅŸteri giriÅŸi yapÄ±ldÄ±, tÃ¼m vanalar ve 5 kollektÃ¶r aÃ§Ä±ldÄ±',
          summary: '2/2 Ana Vana â€¢ 5/5 KollektÃ¶r (%100 IsÄ±)',
        }
      );
    } else if (num === 102) {
      mainValves = [false, false];
      collectors = [true, true, true, true, true];
      occupied = false;
      note = 'Oda boÅŸ olduÄŸu iÃ§in ana vanalar kapatÄ±ldÄ± (kollektÃ¶r mandallarÄ± aÃ§Ä±k konumda).';
      history.push({
        id: '102-1',
        dateIso,
        dateLabel,
        time: '11:20',
        device: 'Telefon',
        action: 'Ana Vana 1 ve Ana Vana 2 kapatÄ±ldÄ± (Oda boÅŸ)',
        summary: '0/2 Ana Vana â€¢ 5/5 KollektÃ¶r (%0 IsÄ±)',
      });
    } else if (num === 105 || num === 108 || num === 114) {
      mainValves = [true, true];
      collectors = [true, true, false, true, false];
      occupied = true;
      note = 'IlÄ±k mod: Cam Ã¶nÃ¼ ve koridor aÃ§Ä±k, 2 hat kÄ±sÄ±ldÄ±.';
      history.push({
        id: `${num}-1`,
        dateIso,
        dateLabel,
        time: '10:15',
        device: 'Teknik Servis',
        action: 'K3 ve K5 kollektÃ¶rleri kapatÄ±ldÄ± (IlÄ±k mod)',
        summary: '2/2 Ana Vana â€¢ 3/5 KollektÃ¶r (%60 IsÄ±)',
      });
    } else if (num === 110 || num === 115 || num === 119) {
      mainValves = [false, false];
      collectors = [false, false, false, false, false];
      occupied = false;
      note = 'Oda boÅŸ - Ana vanalar ve kollektÃ¶rler kapalÄ±.';
      history.push({
        id: `${num}-1`,
        dateIso: '2026-10-18',
        dateLabel: '18 Ekim 2026',
        time: '14:00',
        device: 'Resepsiyon PC',
        action: 'Oda Ã§Ä±kÄ±ÅŸ yaptÄ±, ana vanalar ve kollektÃ¶rler kapatÄ±ldÄ±',
        summary: '0/2 Ana Vana â€¢ 0/5 KollektÃ¶r (%0 IsÄ±)',
      });
    } else if (num === 112) {
      mainValves = [true, false];
      collectors = [true, true, true, true, false];
      occupied = true;
      note = '2. Ana vana kapalÄ±! Devirdaim zayÄ±f olabilir, kontrol edilmeli.';
      history.push({
        id: '112-1',
        dateIso,
        dateLabel,
        time: '10:50',
        device: 'Telefon',
        action: 'Ana Vana 2 kapatÄ±ldÄ± (Tek ana vana aÃ§Ä±k uyarÄ±sÄ±)',
        summary: '1/2 Ana Vana â€¢ 4/5 KollektÃ¶r (%40 IsÄ±)',
      });
    } else if (num === 117 || num === 120) {
      mainValves = [true, true];
      collectors = [true, true, true, true, false];
      occupied = false;
      note = 'YarÄ±n giriÅŸ var, Ã¶n Ä±sÄ±tma (4/5 kollektÃ¶r aÃ§Ä±k).';
      history.push({
        id: `${num}-1`,
        dateIso,
        dateLabel,
        time: '09:30',
        device: 'Telefon',
        action: 'Ã–n Ä±sÄ±tma iÃ§in ana vanalar ve 4 kollektÃ¶r aÃ§Ä±ldÄ±',
        summary: '2/2 Ana Vana â€¢ 4/5 KollektÃ¶r (%80 IsÄ±)',
      });
    } else {
      history.push({
        id: `${num}-init`,
        dateIso: '2026-10-18',
        dateLabel: '18 Ekim 2026',
        time: '12:00',
        device: 'Sistem',
        action: 'Tam Ä±sÄ±tma modunda aktif (2 Ana Vana + 5 KollektÃ¶r AÃ§Ä±k)',
        summary: '2/2 Ana Vana â€¢ 5/5 KollektÃ¶r (%100 IsÄ±)',
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

  let statusLabel = 'KÄ±smi IsÄ±tma';
  let statusColor: 'orange' | 'amber' | 'rose' = 'amber';

  if (allMainClosed) {
    statusLabel = 'Ana Vana KapalÄ± (IsÄ± Yok)';
    statusColor = 'rose';
  } else if (oneMainClosed) {
    statusLabel = 'Tek Ana Vana KapalÄ±!';
    statusColor = 'rose';
  } else if (bothMainOpen && openCollectorCount === 5) {
    statusLabel = 'Tam AÃ§Ä±k (5/5)';
    statusColor = 'orange';
  } else if (bothMainOpen && openCollectorCount === 0) {
    statusLabel = 'Ana Vana AÃ§Ä±k / 5 KollektÃ¶r KapalÄ±';
    statusColor = 'rose';
  } else {
    statusLabel = `KÄ±sÄ±k (${openCollectorCount}/5 KollektÃ¶r)`;
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
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const { dateIso, dateLabel } = getNowDateAndTime();
    return [
      {
        id: 'init-1',
        dateIso,
        dateLabel,
        time: '11:35',
        device: 'Telefon',
        room: 101,
        msg: 'KollektÃ¶r K4 ve K5 kapatÄ±ldÄ± (Ana vanalar aÃ§Ä±k, 3/5 aktif)',
      },
      {
        id: 'init-2',
        dateIso,
        dateLabel,
        time: '11:20',
        device: 'Telefon',
        room: 102,
        msg: 'Ana Vana 1 ve 2 kapatÄ±ldÄ± (IsÄ± kesildi)',
      },
      {
        id: 'init-3',
        dateIso,
        dateLabel,
        time: '10:50',
        device: 'Telefon',
        room: 112,
        msg: 'Ana Vana 2 kapatÄ±ldÄ± (Tek ana vana aÃ§Ä±k uyarÄ±sÄ±)',
      },
      {
        id: 'init-4',
        dateIso: '2026-10-18',
        dateLabel: '18 Ekim 2026',
        time: '19:10',
        device: 'Resepsiyon PC',
        room: 101,
        msg: 'MÃ¼ÅŸteri giriÅŸi yapÄ±ldÄ±, tÃ¼m vanalar ve 5 kollektÃ¶r aÃ§Ä±ldÄ±',
      },
    ];
  });

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

  // Automatic Firebase Sync States
  const [deviceName, setDeviceName] = useState<string>('Mobil / PC');
  const [cloudUrl, setCloudUrl] = useState<string>(
    DEFAULT_FIREBASE_CONFIG.databaseURL || DEFAULT_FIREBASE_CONFIG.projectId || ''
  );
  const [syncStatus, setSyncStatus] = useState<'local' | 'synced' | 'syncing' | 'error'>('local');
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('--:--');
  const lastUpdatedTimestampRef = useRef<number>(0);
  const isInitialMountRef = useRef<boolean>(true);

  const showToast = useCallback((msg: string) => {
    setToastText(msg);
    setTimeout(() => {
      setToastText((prev) => (prev === msg ? null : prev));
    }, 2600);
  }, []);

  const resolvedFirebase = useMemo(() => parseFirebaseInput(cloudUrl), [cloudUrl]);

  // Automatic background push to Firebase (supports both Firestore & Realtime DB)
  const pushToCloud = useCallback(
    async (nextRooms: Room[], nextLogs: LogEntry[], customInput?: string) => {
      const target = customInput !== undefined ? parseFirebaseInput(customInput) : resolvedFirebase;
      if (target.mode === 'none' || !target.endpoint) return;

      setSyncStatus('syncing');
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
        }
      } catch {
        setSyncStatus('error');
      }
    },
    [deviceName, resolvedFirebase]
  );

  // Automatic background pull from Firebase (every 2.5s + on window focus)
  const pullFromCloud = useCallback(
    async (silent = true, customInput?: string) => {
      const target = customInput !== undefined ? parseFirebaseInput(customInput) : resolvedFirebase;
      if (target.mode === 'none' || !target.endpoint) return;

      if (!silent) setSyncStatus('syncing');
      try {
        const res = await fetch(target.endpoint, { cache: 'no-store' });
        if (res.status === 404 && target.mode === 'firestore') {
          // Document doesn't exist in Firestore yet -> auto-create it immediately!
          await pushToCloud(rooms, logs, customInput);
          return;
        }
        if (!res.ok) {
          setSyncStatus('error');
          return;
        }
        const raw = await res.json();
        let data = raw;

        if (target.mode === 'firestore') {
          const strVal = raw?.fields?.payload?.stringValue;
          if (strVal) {
            data = JSON.parse(strVal);
          } else {
            await pushToCloud(rooms, logs, customInput);
            return;
          }
        }

        if (data && Array.isArray(data.rooms)) {
          const remoteTs = Number(data.updatedAtTs || 0);
          if (remoteTs > lastUpdatedTimestampRef.current) {
            lastUpdatedTimestampRef.current = remoteTs;
            setRooms(data.rooms);
            if (Array.isArray(data.logs)) {
              setLogs(data.logs);
            }
          }
          setSyncStatus('synced');
          setLastSyncedAt(getNowTimeStr());
          if (!silent) showToast('CanlÄ± Firebase verisi gÃ¼ncellendi');
        } else if (data === null) {
          await pushToCloud(rooms, logs, customInput);
        }
      } catch {
        setSyncStatus('error');
      }
    },
    [logs, pushToCloud, resolvedFirebase, rooms, showToast]
  );

  // Detect device type automatically (Telefon vs Bilgisayar) and load saved state
  useEffect(() => {
    try {
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
      setDeviceName(isMobile ? 'Telefon' : 'Bilgisayar');

      const savedRooms = localStorage.getItem(STORAGE_KEY);
      if (savedRooms) {
        const parsed = JSON.parse(savedRooms);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRooms(
            parsed.map((r: Room) => ({
              ...r,
              history: Array.isArray(r.history) ? r.history : [],
            }))
          );
        }
      }
      const savedLogs = localStorage.getItem(LOG_STORAGE_KEY);
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs);
        if (Array.isArray(parsedLogs)) {
          setLogs(parsedLogs);
        }
      }
      const savedSync = localStorage.getItem(SYNC_CONFIG_KEY);
      if (savedSync) {
        const cfg = JSON.parse(savedSync);
        if (cfg.deviceName) setDeviceName(cfg.deviceName);
        if (cfg.cloudUrl && !DEFAULT_FIREBASE_CONFIG.databaseURL && !DEFAULT_FIREBASE_CONFIG.projectId) {
          setCloudUrl(cfg.cloudUrl);
        }
      }
    } catch {
      // Ignore storage errors
    }
    isInitialMountRef.current = false;
  }, []);

  // Save state to localStorage automatically
  useEffect(() => {
    if (isInitialMountRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    } catch {
      // Ignore storage errors
    }
  }, [rooms, logs]);

  // Save sync config
  useEffect(() => {
    if (isInitialMountRef.current) return;
    try {
      localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify({ deviceName, cloudUrl }));
    } catch {
      // Ignore
    }
  }, [deviceName, cloudUrl]);

  // Automatic real-time listener (every 2.5 seconds + instant on focus/visibility)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      try {
        if (e.key === STORAGE_KEY && e.newValue) {
          setRooms(JSON.parse(e.newValue));
        }
        if (e.key === LOG_STORAGE_KEY && e.newValue) {
          setLogs(JSON.parse(e.newValue));
        }
      } catch {
        // Ignore
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const handleFocus = () => {
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
      }, 2500);
    } else {
      setSyncStatus('local');
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (intervalId) clearInterval(intervalId);
    };
  }, [resolvedFirebase, pullFromCloud]);

  // Helper to update rooms, record per-room daily history AND global log, and AUTOMATICALLY sync to Firebase
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
    let generatedActionText = '';

    const nextRooms = rooms.map((r) => {
      if (r.id !== roomId) return r;
      const changes = updater(r);
      const nextMain = changes.mainValves ?? r.mainValves;
      const nextCols = changes.collectors ?? r.collectors;
      const nextOcc = changes.occupied ?? r.occupied;
      const nextNote = changes.note ?? r.note;
      generatedActionText = changes.actionText;

      const historyEntry: RoomHistoryItem = {
        id: `${roomId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dateIso,
      dateLabel,
      time,
      device: deviceName,
      room: roomId,
      msg: generatedActionText,
    };
    const nextLogs = [newLog, ...logs.slice(0, 299)];

    setRooms(nextRooms);
    setLogs(nextLogs);
    showToast(`Oda ${roomId}: ${generatedActionText}`);

    // Automatic instant push to Firebase on every valve/collector click
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
        actionText: `Ana Vana ${valveIndex + 1} ${isOpen ? 'AÃ‡ILDI' : 'KAPATILDI'}`,
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
        actionText: `${COLLECTOR_LABELS[colIndex]} ${isOpen ? 'AÃ‡ILDI' : 'KAPATILDI'} (${activeCount}/5 kollektÃ¶r aktif)`,
      };
    });
  };

  // Toggle Occupancy
  const handleToggleOccupancy = (roomId: number) => {
    applyRoomChange(roomId, (r) => {
      const nextOcc = !r.occupied;
      return {
        occupied: nextOcc,
        actionText: `Oda durumu ${nextOcc ? 'DOLU (MÃ¼ÅŸteri Var)' : 'BOÅ'} olarak deÄŸiÅŸtirildi`,
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
          actionText: 'Tam Ä±sÄ±tmaya alÄ±ndÄ± (2 Ana Vana + 5/5 KollektÃ¶r AÃ§Ä±k)',
        };
      }
      if (preset === 'eco') {
        return {
          mainValves: [true, true],
          collectors: [true, true, true, false, false],
          actionText: 'IsÄ± dÃ¼ÅŸÃ¼rÃ¼ldÃ¼: Ana vanalar aÃ§Ä±k, 2 kollektÃ¶r kapatÄ±ldÄ± (3/5 aktif)',
        };
      }
      return {
        mainValves: [false, false],
        actionText: 'Her iki Ana Vana kapatÄ±ldÄ± (Odaya sÄ±cak su giriÅŸi kesildi)',
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
      actionText: `Not / Kontrol KaydÄ±: ${text}`,
    }));
    setModalNote(text);
    setCustomHistoryEntry('');
  };

  // Bulk Actions
  const handleBulkAction = (type: 'all_full' | 'empty_eco' | 'empty_main_off' | 'all_main_off') => {
    const { dateIso, dateLabel, time, fullLabel } = getNowDateAndTime();
    let affected = 0;
    let actionLabel = '';

    if (type === 'all_full') actionLabel = 'Toplu Ä°ÅŸlem: Tam Ä±sÄ±tmaya (2V + 5K) alÄ±ndÄ±';
    if (type === 'empty_eco') actionLabel = 'Toplu Ä°ÅŸlem (BoÅŸ Oda): 2 kollektÃ¶r kapatÄ±ldÄ± (3/5 aktif)';
    if (type === 'empty_main_off') actionLabel = 'Toplu Ä°ÅŸlem (BoÅŸ Oda): Ana vanalar kapatÄ±ldÄ±';
    if (type === 'all_main_off') actionLabel = 'Toplu Ä°ÅŸlem: Ana vanalar kapatÄ±ldÄ±';

    const nextRooms = rooms.map((r) => {
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
        id: `${r.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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
      id: `bulk-${Date.now()}`,
      dateIso,
      dateLabel,
      time,
      device: deviceName,
      room: type.startsWith('empty') ? 'BoÅŸ Odalar' : '101-120',
      msg: `${actionLabel} (${affected} oda gÃ¼ncellendi)`,
    };

    const nextLogs = [bulkLog, ...logs.slice(0, 299)];
    setRooms(nextRooms);
    setLogs(nextLogs);
    setIsBulkOpen(false);
    showToast(`${affected} oda iÃ§in toplu iÅŸlem kaydedildi`);

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
    showToast('CSV durum ve tarihÃ§e raporu indirildi');
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
    showToast('Tam sistem yedeÄŸi indirildi');
  };

  const handleImportJsonBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && Array.isArray(parsed.rooms)) {
          setRooms(parsed.rooms);
          if (Array.isArray(parsed.logs)) setLogs(parsed.logs);
          if (resolvedFirebase.mode !== 'none') {
            pushToCloud(parsed.rooms, parsed.logs || []);
          }
          showToast('Yedek dosyasÄ± baÅŸarÄ±yla yÃ¼klendi');
          setIsSyncModalOpen(false);
        }
      } catch {
        showToast('Yedek dosyasÄ± okunamadÄ±');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    const { dateIso, dateLabel, time } = getNowDateAndTime();
    const defaultRooms = createDefaultRooms();
    const resetLogs: LogEntry[] = [
      {
        id: `reset-${Date.now()}`,
        dateIso,
        dateLabel,
        time,
        device: deviceName,
        room: 'Sistem',
        msg: 'VarsayÄ±lan oda ayarlarÄ±na sÄ±fÄ±rlandÄ±',
      },
    ];
    setRooms(defaultRooms);
    setLogs(resetLogs);
    if (resolvedFirebase.mode !== 'none') {
      pushToCloud(defaultRooms, resetLogs);
    }
    showToast('Panel varsayÄ±lan verilere sÄ±fÄ±rlandÄ±');
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

  // Flatten all per-room histories grouped by day for the "GÃ¼n GÃ¼n Oda KayÄ±tlarÄ±" view
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
          actionText: `Oda notu gÃ¼ncellendi: "${modalNote.trim() || 'Not silindi'}"`,
        }));
      } else {
        showToast(`Oda ${selectedRoomId} kaydedildi`);
      }
    }
    setSelectedRoomId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
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
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base sm:text-xl font-bold tracking-tight text-white">
                    Otel Yerden IsÄ±tma Takip Paneli
                  </h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    101 â€“ 120
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Oda iÃ§i gÃ¼n gÃ¼n tarihÃ§e kayÄ±tlÄ± â€¢ Otomatik Firebase senkronizasyonlu
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
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                  : syncStatus === 'error'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
                  : 'bg-sky-500/15 text-sky-300 border-sky-500/30 hover:bg-sky-500/25'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-400'
                    : syncStatus === 'syncing'
                    ? 'bg-amber-400 animate-ping'
                    : syncStatus === 'error'
                    ? 'bg-rose-500'
                    : 'bg-sky-400'
                }`}
              />
              <span>
                {syncStatus === 'synced'
                  ? `CanlÄ± BaÄŸlÄ± (${lastSyncedAt})`
                  : syncStatus === 'syncing'
                  ? 'Otomatik Kaydediliyor...'
                  : syncStatus === 'error'
                  ? 'Firebase AyarÄ±'
                  : 'Firebase Otomatik EÅŸitleme'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsBulkOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <span>Toplu Ä°ÅŸlem</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <span>Hareket KayÄ±tlarÄ±</span>
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-semibold">
                {logs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <span>Rapor Ä°ndir (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800/60 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/50 transition"
            >
              SÄ±fÄ±rla
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
                {stats.occupiedCount} Dolu â€¢ {stats.emptyCount} BoÅŸ
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-orange-500/20 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-orange-300/90">
              <span>Tam IsÄ±tan Odalar</span>
              <span className="w-2 h-2 rounded-full bg-orange-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-orange-400">{stats.fullCount}</span>
              <span className="text-xs text-slate-400">2 Vana + 5/5 KollektÃ¶r</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-amber-300/90">
              <span>KÄ±smi / KÄ±sÄ±k IsÄ±tma</span>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-400">{stats.partialCount}</span>
              <span className="text-xs text-slate-400">KollektÃ¶r/Vana KÄ±sÄ±k</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-500/20 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-rose-300/90">
              <span>Ana VanasÄ± KapalÄ±</span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-rose-400">{stats.closedCount}</span>
              <span className="text-xs text-slate-400">IsÄ± AkÄ±ÅŸÄ± Kesik (%0)</span>
            </div>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-slate-900 border border-sky-500/20 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-sky-300/90">
              <span>Aktif KollektÃ¶r OranÄ±</span>
              <span className="text-xs font-semibold text-sky-400">%{stats.roundedFlow}</span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xl font-bold text-white">{stats.roundedFlow} / 100</span>
                <span className="text-[11px] text-slate-400">Su GeÃ§en Hat</span>
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

        {/* Main View Switcher: Oda Paneli vs GÃ¼n GÃ¼n Oda TarihÃ§esi */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMainTab('grid')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                mainTab === 'grid'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Oda Vana &amp; KollektÃ¶r Paneli (101â€“120)
            </button>
            <button
              type="button"
              onClick={() => setMainTab('daily_history')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                mainTab === 'daily_history'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>GÃ¼n GÃ¼n Oda DeÄŸiÅŸiklik KayÄ±tlarÄ±</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/30 text-current">
                TarihÃ§e
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 px-2">
            <span>
              Cihaz: <strong className="text-amber-400">{deviceName}</strong>
              {resolvedFirebase.label ? ` â€¢ ${resolvedFirebase.label}` : ''}
            </span>
          </div>
        </div>

        {mainTab === 'grid' ? (
          <>
            {/* Filter & Search Toolbar */}
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: 'TÃ¼mÃ¼ (20)' },
                    { id: 'full', label: 'Tam AÃ§Ä±k (5/5)' },
                    { id: 'partial', label: 'KollektÃ¶rÃ¼ KÄ±sÄ±k Olanlar' },
                    { id: 'main_closed', label: 'Ana VanasÄ± KapalÄ±' },
                    { id: 'mismatch', label: 'Dikkat / UyarÄ±' },
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
                  placeholder="Oda no (Ã¶rn: 101) veya not ara..."
                  className="flex-1 sm:w-56 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <select
                  value={occupancyFilter}
                  onChange={(e) => setOccupancyFilter(e.target.value as 'all' | 'occupied' | 'empty')}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">TÃ¼m Doluluk DurumlarÄ±</option>
                  <option value="occupied">Sadece Dolu Odalar</option>
                  <option value="empty">Sadece BoÅŸ Odalar</option>
                </select>
              </div>
            </section>

            {/* Rooms Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredRooms.map((room) => {
                const m = getRoomMetrics(room);
                const latestHistory = room.history && room.history.length > 0 ? room.history[0] : null;

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
                            {room.occupied ? 'DOLU' : 'BOÅ'}
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
                          <span>Ana vanalar kapalÄ±! ({m.openCollectorCount} kollektÃ¶r aÃ§Ä±k ama su geÃ§miyor)</span>
                        </div>
                      )}
                      {m.oneMainClosed && (
                        <div className="mt-2 px-2.5 py-1 rounded-lg bg-rose-950/70 border border-rose-800/60 text-[11px] text-rose-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                          <span>Ana vanalardan biri kapalÄ±! Devirdaim iÃ§in 2 ana vana da aÃ§Ä±k olmalÄ±.</span>
                        </div>
                      )}
                      {m.bothMainOpen && m.openCollectorCount === 0 && (
                        <div className="mt-2 px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-800/60 text-[11px] text-amber-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span>Ana vanalar aÃ§Ä±k ama 5 kollektÃ¶rÃ¼n tamamÄ± kapalÄ±!</span>
                        </div>
                      )}

                      {/* 2 Main Valves */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span>Ana Vanalar ({m.openMainCount}/2 AÃ§Ä±k)</span>
                          <span className="font-medium text-slate-300">IsÄ± GÃ¼cÃ¼: %{m.effectivePct}</span>
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
                                <span className="text-[10px] font-bold uppercase">{isOpen ? 'AÃ‡IK' : 'KAPALI'}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 5 Collectors */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span>KollektÃ¶r HatlarÄ± ({m.openCollectorCount}/5 AÃ§Ä±k)</span>
                          <span className="text-[10px] text-slate-500">TÄ±kla AÃ§/Kapat</span>
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
                                title={`${COLLECTOR_LABELS[cIdx]}: ${cOpen ? 'AÃ‡IK' : 'KAPALI'}`}
                                className={`flex flex-col items-center justify-center py-1.5 rounded-lg border text-xs transition ${cStyle}`}
                              >
                                <span className="text-[11px] leading-none">K{cIdx + 1}</span>
                                <span className="text-[9px] mt-0.5 opacity-85">{cOpen ? 'AÃ§Ä±k' : 'KapalÄ±'}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Room Note */}
                      {room.note && (
                        <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800/80 text-[11px] text-slate-300 line-clamp-2">
                          <span className="text-amber-400 font-medium">Not:</span> {room.note}
                        </div>
                      )}

                      {/* Latest Per-Room History Preview */}
                      {latestHistory && (
                        <button
                          type="button"
                          onClick={() => openRoomDetail(room, 'history')}
                          className="mt-2 w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/90 transition group"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-semibold text-sky-400 group-hover:underline">
                              Son KayÄ±t ({latestHistory.dateLabel} {latestHistory.time})
                            </span>
                            <span>{(room.history || []).length} kayÄ±t â†’</span>
                          </div>
                          <div className="text-[11px] text-slate-300 truncate mt-0.5">
                            {latestHistory.action}
                          </div>
                        </button>
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
                          Tam AÃ§
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickPreset(room.id, 'eco')}
                          className="px-2 py-1 rounded text-[10px] font-medium bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 transition"
                        >
                          3/5 KÄ±s
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
                        onClick={() => openRoomDetail(room, 'history')}
                        className="px-2 py-1 rounded text-[10px] font-semibold text-amber-400 hover:bg-amber-500/10 transition"
                      >
                        Detay / Not ({(room.history || []).length})
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>

            {filteredRooms.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center space-y-3">
                <p className="text-sm text-slate-300 font-medium">SeÃ§ilen filtreye uygun oda bulunamadÄ±.</p>
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
          </>
        ) : (
          /* GÃœN GÃœN ODA DEÄÄ°ÅÄ°KLÄ°K KAYITLARI (DAILY ROOM HISTORY VIEW) */
          <section className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white">Oda Ä°Ã§i GÃ¼n GÃ¼n DeÄŸiÅŸiklik KayÄ±tlarÄ± (101â€“120)</h2>
                <p className="text-xs text-slate-400">
                  Hangi gÃ¼n, hangi odada, saat kaÃ§ta hangi vana veya kollektÃ¶r deÄŸiÅŸtirildi detaylÄ± listesi
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">TÃ¼m GÃ¼nler</option>
                  {allRoomHistoryDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select
                  value={historyRoomFilter}
                  onChange={(e) => setHistoryRoomFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">TÃ¼m Odalar (101-120)</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      Oda {r.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {groupedDailyRoomHistory.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
                SeÃ§ilen kriterlere uygun gÃ¼nlÃ¼k oda kaydÄ± bulunamadÄ±.
              </div>
            ) : (
              groupedDailyRoomHistory.map((group) => (
                <div key={group.dateIso} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <h3 className="text-sm font-bold text-white">{group.dateLabel}</h3>
                      <span className="text-xs text-slate-500">({group.dateIso})</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300">
                      {group.items.length} Ä°ÅŸlem
                    </span>
                  </div>
                  <div className="divide-y divide-slate-800/70">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-slate-800/30 transition"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              const r = rooms.find((rm) => rm.id === item.roomId);
                              if (r) openRoomDetail(r, 'history');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-xs shrink-0 transition"
                          >
                            Oda {item.roomId}
                          </button>
                          <div>
                            <div className="text-xs font-medium text-slate-100">{item.action}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Durum Ã–zeti: <span className="text-slate-300">{item.summary}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:shrink-0 text-[11px] text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-medium">
                            {item.device}
                          </span>
                          <span className="font-mono text-slate-300 font-semibold">{item.time}</span>
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

      {/* Room Detail & Per-Room Daily History Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  Oda {selectedRoom.id} â€” Vana KontrolÃ¼ &amp; GÃ¼n GÃ¼n KayÄ±tlar
                </h2>
                <p className="text-xs text-slate-400">Son deÄŸiÅŸiklik: {selectedRoom.updatedAt}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomId(null)}
                className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Kapat âœ•
              </button>
            </div>

            {/* Modal Internal Tabs */}
            <div className="px-5 pt-3 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalTab('controls')}
                className={`px-3.5 py-2 text-xs font-bold border-b-2 transition ${
                  modalTab === 'controls'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Vana &amp; KollektÃ¶r AyarlarÄ±
              </button>
              <button
                type="button"
                onClick={() => setModalTab('history')}
                className={`px-3.5 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  modalTab === 'history'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Oda Ä°Ã§i GÃ¼n GÃ¼n GeÃ§miÅŸ</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
                  {(selectedRoom.history || []).length}
                </span>
              </button>
            </div>

            {modalTab === 'controls' ? (
              <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
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
                      {selectedRoom.occupied ? 'MÃ¼ÅŸteri Var (DOLU)' : 'Oda BoÅŸ (BOÅ)'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(selectedRoom.id, 'full')}
                      className="px-2.5 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/30 transition"
                    >
                      Tam AÃ§ (2V + 5K)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(selectedRoom.id, 'eco')}
                      className="px-2.5 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition"
                    >
                      KÄ±sÄ±k Mod (3/5 K)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(selectedRoom.id, 'close_main')}
                      className="px-2.5 py-1 rounded text-xs font-medium bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition"
                    >
                      Ana VanayÄ± Kapat
                    </button>
                  </div>
                </div>

                {/* 2 Main Valves */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Ana Vanalar (2 Adet - Oda Ana GiriÅŸ &amp; DÃ¶nÃ¼ÅŸ)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Ana Vana 1 (SÄ±cak GiriÅŸ)', 'Ana Vana 2 (DÃ¶nÃ¼ÅŸ HattÄ±)'] as const).map((label, idx) => {
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
                              {isOpen ? 'Su geÃ§iÅŸi aktif' : 'Vana kapalÄ±'}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isOpen ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                            }`}
                          >
                            {isOpen ? 'AÃ‡IK' : 'KAPALI'}
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
                      KollektÃ¶r HatlarÄ± (5 Adet)
                    </label>
                    <span className="text-xs font-medium text-amber-400">
                      {selectedRoom.collectors.filter(Boolean).length} / 5 KollektÃ¶r AÃ§Ä±k
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
                                {cOpen ? 'Mandal AÃ§Ä±k (%20 Kapasite)' : 'Mandal KapalÄ±'}
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
                            {cOpen ? 'AÃ§Ä±k (Kapat)' : 'KapalÄ± (AÃ§)'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Oda GÃ¼ncel Notu
                  </label>
                  <textarea
                    rows={2}
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    placeholder="Ã–rn: MÃ¼ÅŸteri Ã§ok sÄ±cak dediÄŸi iÃ§in 2 kollektÃ¶r kapatÄ±ldÄ±..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
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
                    placeholder="Bu oda iÃ§in yeni gÃ¼nlÃ¼k kontrol/bakÄ±m notu ekle..."
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0 transition"
                  >
                    Kayda Ekle
                  </button>
                </form>

                {selectedRoomHistoryByDay.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Bu oda iÃ§in henÃ¼z kayÄ±t bulunmuyor.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedRoomHistoryByDay.map((dayGroup) => (
                      <div
                        key={dayGroup.dateIso}
                        className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60"
                      >
                        <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400">{dayGroup.dateLabel}</span>
                          <span className="text-[11px] text-slate-400">{dayGroup.items.length} deÄŸiÅŸiklik</span>
                        </div>
                        <div className="divide-y divide-slate-800/60">
                          {dayGroup.items.map((h) => (
                            <div key={h.id} className="p-3 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-sky-300">{h.device}</span>
                                <span className="font-mono text-slate-400">{h.time}</span>
                              </div>
                              <div className="text-xs text-slate-100 font-medium">{h.action}</div>
                              <div className="text-[11px] text-slate-400">{h.summary}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">
                Her vana/kollektÃ¶r deÄŸiÅŸimi otomatik olarak gÃ¼n ve saatiyle kaydedilir.
              </span>
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

      {/* Automatic Firebase Config Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Otomatik Firebase &amp; Cihaz AyarlarÄ±</h2>
                <p className="text-xs text-slate-400">
                  Vana deÄŸiÅŸtiÄŸinde tuÅŸa basmadan otomatik olarak tÃ¼m cihazlarda gÃ¼ncellenir
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Kapat âœ•
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Auto-detection status */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">Otomatik Senkronizasyon Modu Aktif</span>
                  <span className="text-[11px] text-slate-400">AnlÄ±k KayÄ±t</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Herhangi bir vanaya veya kollektÃ¶re dokunduÄŸunuz anda ekstra bir tuÅŸa basmanÄ±za gerek kalmadan <strong>otomatik olarak</strong> kaydedilir. Projenizde <code className="text-amber-300">.env</code> iÃ§inde Firebase tanÄ±mlÄ±ysa doÄŸrudan onu kullanÄ±r; tanÄ±mlÄ± deÄŸilse aÅŸaÄŸÄ±ya Firebase <strong>Project ID</strong> veya <strong>firebaseConfig</strong> kodunuzu bir kez yapÄ±ÅŸtÄ±rmanÄ±z yeterlidir:
                </p>
                <textarea
                  rows={3}
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                  placeholder='Firebase Project ID (Ã¶rn: otel-takip-123) veya firebaseConfig kodunuzu buraya yapÄ±ÅŸtÄ±rÄ±n...'
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Device Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Bu CihazÄ±n AdÄ± (Oda GeÃ§miÅŸinde Kim DeÄŸiÅŸtirdi GÃ¶rÃ¼nmesi Ä°Ã§in)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Telefon', 'Bilgisayar', 'Resepsiyon', 'Teknik Servis'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDeviceName(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                        deviceName === preset
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
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
                  placeholder="Ã–rn: Telefon"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Manual Backup Export/Import */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportJsonBackup}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition"
                  >
                    Yedek Ä°ndir (.json)
                  </button>
                  <label className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 cursor-pointer transition">
                    <span>Yedek YÃ¼kle (.json)</span>
                    <input type="file" accept=".json" onChange={handleImportJsonBackup} className="hidden" />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/50 transition"
                >
                  VarsayÄ±lana SÄ±fÄ±rla
                </button>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsSyncModalOpen(false);
                  if (resolvedFirebase.mode !== 'none') {
                    pushToCloud(rooms, logs);
                  }
                  showToast('Ayarlar kaydedildi, otomatik eÅŸitleme aktif');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition"
              >
                Tamam
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
              <h2 className="text-base font-bold text-white">Toplu Vana &amp; KollektÃ¶r Ä°ÅŸlemleri</h2>
              <button
                type="button"
                onClick={() => setIsBulkOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Kapat âœ•
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-400">
                HazÄ±r senaryolarla tÃ¼m odalarÄ± (101â€“120) veya sadece boÅŸ odalarÄ± tek tÄ±kla ayarlayabilirsiniz:
              </p>
              <button
                type="button"
                onClick={() => handleBulkAction('all_full')}
                className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between transition"
              >
                <div>
                  <div className="text-xs font-semibold text-orange-400">TÃ¼m OdalarÄ± Tam IsÄ±tmaya Al (101-120)</div>
                  <div className="text-[11px] text-slate-400">2 Ana Vana AÃ§Ä±k + 5/5 KollektÃ¶r AÃ§Ä±k (%100)</div>
                </div>
                <span className="text-xs font-bold text-orange-400">Uygula â†’</span>
              </button>

              <button
                type="button"
                onClick={() => handleBulkAction('empty_eco')}
                className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between transition"
              >
                <div>
                  <div className="text-xs font-semibold text-amber-400">BoÅŸ Odalarda 2 KollektÃ¶rÃ¼ Kapat (Tasarruf)</div>
                  <div className="text-[11px] text-slate-400">BoÅŸ odalarda Ana Vanalar AÃ§Ä±k, 3/5 KollektÃ¶r AÃ§Ä±k (%60)</div>
                </div>
                <span className="text-xs font-bold text-amber-400">Uygula â†’</span>
              </button>

              <button
                type="button"
                onClick={() => handleBulkAction('empty_main_off')}
                className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between transition"
              >
                <div>
                  <div className="text-xs font-semibold text-rose-400">BoÅŸ OdalarÄ±n Ana VanalarÄ±nÄ± Kapat</div>
                  <div className="text-[11px] text-slate-400">BoÅŸ odalarda 2 Ana Vana KapatÄ±lÄ±r (%0 IsÄ±)</div>
                </div>
                <span className="text-xs font-bold text-rose-400">Uygula â†’</span>
              </button>

              <button
                type="button"
                onClick={() => handleBulkAction('all_main_off')}
                className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between transition"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-300">TÃ¼m Otelin Ana VanalarÄ±nÄ± Kapat</div>
                  <div className="text-[11px] text-slate-400">101-120 tÃ¼m ana vanalarÄ± kapatÄ±r</div>
                </div>
                <span className="text-xs font-bold text-slate-400">Uygula â†’</span>
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
                <h2 className="text-base font-bold text-white">Genel Hareket KayÄ±tlarÄ±</h2>
                <p className="text-xs text-slate-400">Tarih, saat ve cihaz bilgisiyle tÃ¼m iÅŸlemler</p>
              </div>
              <button
                type="button"
                onClick={() => setIsLogOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Kapat âœ•
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">HenÃ¼z kayÄ±tlÄ± iÅŸlem bulunmuyor.</p>
              ) : (
                logs.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold text-[10px]">
                        Oda {item.room}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.dateLabel} â€¢ <strong className="text-slate-200">{item.time}</strong> ({item.device})
                      </span>
                    </div>
                    <div className="text-slate-200">{item.msg}</div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setLogs([]);
                  showToast('Genel hareket kayÄ±tlarÄ± temizlendi');
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium"
              >
                KayÄ±tlarÄ± Temizle
              </button>
              <span className="text-[11px] text-slate-500">Oda iÃ§i gÃ¼nlÃ¼k kayÄ±tlar korunur</span>
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
