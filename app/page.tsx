'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// Firebase projesi: doors-panel
// Bu panel mevcut Firestore REST senkronizasyonunu kullanır.
// Firebase Console > Firestore Database bölümünde veritabanı oluşturulmalıdır.
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
  device: string; // e.g. Telefon, Resepsiyon PC
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
const SYNC_CONFIG_KEY = 'otel_yerden_isitma_sync_v2';

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

function formatValvesSummary(mainValves: [boolean, boolean], collectors: [boolean, boolean, boolean, boolean, boolean]) {
  const openMain = mainValves.filter(Boolean).length;
  const openCol = collectors.filter(Boolean).length;
  const pct = openMain === 2 ? openCol * 20 : openMain === 1 ? Math.round(openCol * 10) : 0;
