// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBkAafEYmhC_UCIK6nK19zGn1pEy45mtVA",
  authDomain: "doors-panel.firebaseapp.com",
  projectId: "doors-panel",
  storageBucket: "doors-panel.firebasestorage.app",
  messagingSenderId: "717146829376",
  appId: "1:717146829376:web:1b05588aa972d56e0865a5",
  measurementId: "G-N98E7SFG26"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default function HotelTimelineVIP() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (localStorage.getItem("doors_logged_in") === "true") setIsLoggedIn(true);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (usernameInput === "doorsofcappadocia" && passwordInput === "Doors6162") {
      setIsLoggedIn(true);
      localStorage.setItem("doors_logged_in", "true");
      setLoginError("");
    } else {
      setLoginError("Kullanıcı adı veya şifre hatalı!");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("doors_logged_in");
  };

  const [activeTab, setActiveTab] = useState("timeline"); 
  const [reservations, setReservations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [caris, setCaris] = useState([]);
  const [housekeeping, setHousekeeping] = useState([]);

  // Modaller
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRez, setSelectedRez] = useState(null);
  const [formData, setFormData] = useState({
    roomNo: "", checkIn: "", checkOut: "", guestName: "", phone: "", note: "", balance: 0, currency: "TL", debts: [], payments: [], status: "waiting"
  });

  // Tur & Transfer
  const [tourType, setTourType] = useState("Balon Turu");
  const [tourCategory, setTourCategory] = useState("Regular"); 
  const [transferDest, setTransferDest] = useState("Kayseri (ASR)");
  const [tourPrice, setTourPrice] = useState("");
  const [tourCurrency, setTourCurrency] = useState("TL");
  const [tourNote, setTourNote] = useState("");

  // CARİ YÖNETİM STATE'LERİ (LİSTE & DETAY İÇİN)
  const [selectedCariId, setSelectedCariId] = useState(null); // Detay sayfası için
  const [newCariName, setNewCariName] = useState("");
  const [newCariPhone, setNewCariPhone] = useState("");
  const [newCariType, setNewCariType] = useState("Acente / Şahıs"); 

  const [cariTxAmount, setCariTxAmount] = useState("");
  const [cariTxCurrency, setCariTxCurrency] = useState("TL");
  const [cariTxType, setCariTxType] = useState("borc"); 
  const [cariTxCategory, setCariTxCategory] = useState("Balon Turu");
  const [cariTxDesc, setCariTxDesc] = useState("");
  const [cariTxPushKasa, setCariTxPushKasa] = useState(false); // Kasaya yansıtılsın mı?
  const [cariTxKasaMethod, setCariTxKasaMethod] = useState("cash");

  // Kasa İşlemleri
  const [kasaAmount, setKasaAmount] = useState("");
  const [kasaCurrency, setKasaCurrency] = useState("TL");
  const [kasaType, setKasaType] = useState("income");
  const [kasaCategory, setKasaCategory] = useState("Konaklama");
  const [kasaMethod, setKasaMethod] = useState("cash");
  const [kasaDesc, setKasaDesc] = useState("");

  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, rez: null });
  const scrollContainerRef = useRef(null);
  const rooms = Array.from({ length: 20 }, (_, i) => 101 + i);

  const todayStr = [new Date().getFullYear(), String(new Date().getMonth() + 1).padStart(2, '0'), String(new Date().getDate()).padStart(2, '0')].join('-');
  const [jumpDate, setJumpDate] = useState(todayStr);

  const tomorrowObj = new Date(); tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = [tomorrowObj.getFullYear(), String(tomorrowObj.getMonth() + 1).padStart(2, '0'), String(tomorrowObj.getDate()).padStart(2, '0')].join('-');

  const yesterdayObj = new Date(); yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = [yesterdayObj.getFullYear(), String(yesterdayObj.getMonth() + 1).padStart(2, '0'), String(yesterdayObj.getDate()).padStart(2, '0')].join('-');

  const [reportFilterDate, setReportFilterDate] = useState(todayStr);
  const [hkFilterDate, setHkFilterDate] = useState(todayStr);

  const days = Array.from({ length: 425 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 60 + i); 
    const dateStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    const dayNum = d.getDate();
    const dayName = d.toLocaleDateString("tr-TR", { weekday: "short" });
    return { dateStr, dayNum, dayName };
  });

  useEffect(() => {
    if (!isLoggedIn) return;
    const unsubRez = onSnapshot(collection(db, "reservations"), (snapshot) => {
      setReservations(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
    const unsubKasa = onSnapshot(collection(db, "transactions"), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a,b) => b.id - a.id));
    });
    const unsubCari = onSnapshot(collection(db, "caris"), (snapshot) => {
      setCaris(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
    const unsubHK = onSnapshot(collection(db, "housekeeping"), (snapshot) => {
      setHousekeeping(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
    return () => { unsubRez(); unsubKasa(); unsubCari(); unsubHK(); };
  }, [isLoggedIn]);

  const handleJumpToDate = (targetDate) => {
    setJumpDate(targetDate);
    if (scrollContainerRef.current) {
      const targetCell = document.getElementById("col-" + targetDate);
      if (targetCell) scrollContainerRef.current.scrollTo({ left: targetCell.offsetLeft - 150, behavior: "smooth" });
    }
  };

  const handleOpenNewModal = (roomNo, dateStr) => {
    const d = new Date(dateStr); d.setDate(d.getDate() + 1);
    const checkOutStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    setFormData({ roomNo, checkIn: dateStr, checkOut: checkOutStr, guestName: "", phone: "", note: "", balance: 0, currency: "TL", debts: [], payments: [], status: "waiting" });
    setSelectedRez(null); setIsModalOpen(true);
  };

  const handleEditRez = (rez) => {
    setTooltip({ visible: false, x: 0, y: 0, rez: null });
    setFormData({ ...rez, currency: rez.currency || "TL", status: rez.status || "waiting", payments: rez.payments || [], debts: rez.debts || [] });
    setSelectedRez(rez); setIsModalOpen(true);
  };

  const handleSaveRez = async () => {
    if (!formData.guestName || !formData.checkOut) return alert("Lütfen misafir adı ve çıkış tarihi girin.");
    const rezId = selectedRez ? selectedRez.id : Date.now().toString();
    await setDoc(doc(db, "reservations", rezId), { ...formData, id: rezId });
    setIsModalOpen(false);
  };

  const handleDeleteRez = async () => {
    if (confirm("Bu rezervasyonu silmek istediğinize emin misiniz?")) {
      await deleteDoc(doc(db, "reservations", selectedRez.id.toString()));
      setIsModalOpen(false);
    }
  };

  const handleAddTourToRez = () => {
    if (!tourPrice) return alert("Lütfen tur/transfer ücreti girin.");
    let title = tourType === "Transfer" ? `Transfer (${transferDest}) - Private/Reg` : `${tourType} (${tourCategory}) ${tourNote ? '- '+tourNote : ''}`;
    setFormData({ ...formData, debts: [...formData.debts, { id: Date.now().toString(), title, amount: parseFloat(tourPrice), currency: tourCurrency }] });
    setTourPrice(""); setTourNote("");
  };

  const handleDeleteDebt = (debtId) => setFormData({ ...formData, debts: formData.debts.filter(d => d.id !== debtId) });

  const handleReceivePayment = async () => {
    if (!payAmount) return;
    const amountNum = parseFloat(payAmount);
    const payId = Date.now().toString();
    const updatedRez = { ...formData, payments: [...(formData.payments || []), { id: payId, amount: amountNum, currency: payCurrency, method: payMethod, note: payNote, date: todayStr }] };
    setFormData(updatedRez);
    await setDoc(doc(db, "reservations", updatedRez.id.toString()), updatedRez);
    await setDoc(doc(db, "transactions", (Date.now() + 1).toString()), { id: (Date.now() + 1).toString(), date: todayStr, type: 'income', category: 'Konaklama Tahsilatı', amount: amountNum, currency: payCurrency, method: payMethod, desc: `Tahsilat (Oda ${formData.roomNo} - ${formData.guestName}) ${payNote ? '- '+payNote : ''}` });
    setPayAmount(""); setPayNote("");
  };

  // --- YENİ CARİ LİSTE VE DETAY İŞLEMLERİ ---
  const handleAddCari = async () => {
    if (!newCariName) return alert("Cari adı zorunludur.");
    const cariId = Date.now().toString();
    await setDoc(doc(db, "caris", cariId), { id: cariId, name: newCariName, phone: newCariPhone, type: newCariType, transactions: [] });
    setNewCariName(""); setNewCariPhone("");
  };

  const handleCariTransaction = async (cari) => {
    if (!cariTxAmount || !cariTxDesc) return alert("Tutar ve açıklama zorunludur.");
    const amt = parseFloat(cariTxAmount);
    const txObj = { 
      id: Date.now().toString(), date: todayStr, type: cariTxType, amount: amt, currency: cariTxCurrency, category: cariTxCategory, desc: cariTxDesc 
    };
    
    // Cari Veritabanını Güncelle
    const updatedCari = { ...cari, transactions: [...(cari.transactions || []), txObj] };
    await setDoc(doc(db, "caris", cari.id), updatedCari);

    // KASAYA YANSITMA İŞLEMİ
    if (cariTxPushKasa) {
      // Borçlandırılıyorsa biz ödeme yapıyoruz demektir (Gider). Ödeme (tahsilat) alıyorsak kasaya Gelir girer.
      const txType = cariTxType === 'odeme' ? 'income' : 'expense';
      const kasaDescStr = `Cari İşlem: ${cari.name} / ${cariTxDesc}`;
      await setDoc(doc(db, "transactions", (Date.now() + 1).toString()), {
        id: (Date.now() + 1).toString(), date: todayStr, type: txType, category: cariTxCategory, amount: amt, currency: cariTxCurrency, method: cariTxKasaMethod, desc: kasaDescStr
      });
    }

    setCariTxAmount(""); setCariTxDesc("");
  };

  const handleDeleteCari = async (cariId) => {
    if (confirm("Bu cariyi silmek istediğinize emin misiniz? Tüm geçmişi silinecek!")) {
      await deleteDoc(doc(db, "caris", cariId));
      setSelectedCariId(null);
    }
  };

  // Dinamik Cari Bakiye Hesaplayıcı
  const getCariBalances = (transactions = []) => {
    return transactions.reduce((acc, tx) => {
      const cur = tx.currency || 'TL';
      if (!acc[cur]) acc[cur] = 0;
      // Borç (Bize borçlanıyor, bakiyesi artar), Ödeme (Bize öder veya borcunu kapatır, bakiyesi düşer)
      const mult = tx.type === 'borc' ? 1 : -1;
      acc[cur] += tx.amount * mult;
      return acc;
    }, { TL: 0, USD: 0, EUR: 0 });
  };

  const handleAddManualTransaction = async () => {
    if(!kasaAmount || !kasaDesc) return alert("Tutar ve açıklama zorunludur.");
    const newTx = { id: Date.now().toString(), date: todayStr, type: kasaType, category: kasaCategory, amount: parseFloat(kasaAmount), currency: kasaCurrency, method: kasaMethod, desc: kasaDesc };
    await setDoc(doc(db, "transactions", newTx.id), newTx);
    setKasaAmount(""); setKasaDesc("");
  };

  const handleUpdateHK = async (roomNo, status, note = "") => {
    const hkId = `${hkFilterDate}_${roomNo}`;
    await setDoc(doc(db, "housekeeping", hkId), { roomNo, date: hkFilterDate, status, note, updatedAt: new Date().toISOString() });
  };

  const getCalc = (rez) => {
    const totalDebt = (parseFloat(rez.balance) || 0) + (rez.debts || []).reduce((a, b) => a + b.amount, 0);
    const totalPaid = (rez.payments || []).reduce((a, b) => a + b.amount, 0);
    return { totalDebt, totalPaid, remaining: totalDebt - totalPaid, currency: rez.currency || 'TL' };
  };

  const kasaBalances = transactions.reduce((acc, tx) => {
    const cur = tx.currency || 'TL';
    if (!acc[cur]) acc[cur] = { total: 0, cash: 0, cc: 0 };
    const multiplier = tx.type === 'income' ? 1 : -1;
    acc[cur].total += (tx.amount * multiplier);
    if (tx.method === 'cash') acc[cur].cash += (tx.amount * multiplier);
    if (tx.method === 'cc') acc[cur].cc += (tx.amount * multiplier);
    return acc;
  }, { TL: { total: 0, cash: 0, cc: 0 }, USD: { total: 0, cash: 0, cc: 0 }, EUR: { total: 0, cash: 0, cc: 0 } });

  const getStatusColor = (status) => {
    if (status === 'checked_in') return "from-emerald-400 to-teal-600 text-slate-950 shadow-emerald-500/30";
    if (status === 'checked_out') return "from-rose-500 to-pink-600 text-white shadow-rose-500/30";
    return "from-amber-400 to-orange-500 text-slate-950 shadow-amber-500/30";
  };

  const renderRowCells = (roomNo) => {
    let cells = [];
    let i = 0;
    while (i < days.length) {
      const day = days[i].dateStr;
      const rez = reservations.find(r => r.roomNo === roomNo && day >= r.checkIn && day < r.checkOut);

      if (rez) {
        let span = 0;
        while (i + span < days.length && days[i + span].dateStr < rez.checkOut) span++;
        const { remaining } = getCalc(rez);

        cells.push(
          <td key={day} colSpan={span} className="border-r border-b border-slate-700/40 p-[2px] min-w-[48px] relative h-9">
            <div 
              onMouseEnter={(e) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, rez })}
              onMouseMove={(e) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, rez })}
              onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, rez: null })}
              onClick={() => handleEditRez(rez)}
              className={`bg-gradient-to-r ${getStatusColor(rez.status)} text-[11px] font-black px-2.5 h-full w-full rounded-lg shadow-md flex items-center cursor-pointer overflow-hidden z-10 transition-transform hover:scale-[1.02]`}
            >
              <span className="truncate w-full drop-shadow-sm tracking-wide">{rez.guestName}</span>
              {remaining > 0 && <span className="absolute right-1.5 top-1.5 w-2 h-2 rounded-full bg-rose-600 animate-ping border border-white"></span>}
            </div>
          </td>
        );
        i += span; 
      } else {
        cells.push(
          <td key={day} onClick={() => handleOpenNewModal(roomNo, day)} className={`border-r border-b border-slate-700/40 h-9 min-w-[48px] cursor-pointer hover:bg-amber-500/10 transition-colors ${day === todayStr ? 'bg-amber-500/5' : ''}`}></td>
        );
        i++;
      }
    }
    return cells;
  };

  const checkInsToday = reservations.filter(r => r.checkIn === todayStr);
  const checkOutsToday = reservations.filter(r => r.checkOut === todayStr);
  const filteredTransactions = transactions.filter(tx => tx.date === reportFilterDate);

  if (!isLoggedIn) {
    return (
      <div className="flex h-screen w-screen bg-[#070B14] items-center justify-center p-4 font-sans text-slate-100">
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 w-full max-w-md p-8 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col items-center">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center mb-5 text-4xl shadow-xl shadow-amber-500/30 animate-pulse">🏨</div>
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 tracking-wider mb-1">DOORS OF CAPPADOCIA</h1>
          <p className="text-xs text-slate-400 mb-8 tracking-widest uppercase font-semibold">VIP Yönetim Paneli</p>
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div>
              <label className="block text-[10px] text-amber-500 uppercase font-bold mb-1.5 tracking-wider">Kullanıcı Adı</label>
              <input type="text" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} placeholder="Kullanıcı adınız" className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-sm text-slate-200 outline-none focus:border-amber-500 transition-all shadow-inner" />
            </div>
            <div>
              <label className="block text-[10px] text-amber-500 uppercase font-bold mb-1.5 tracking-wider">Şifre</label>
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Şifreniz" className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-sm text-slate-200 outline-none focus:border-amber-500 transition-all shadow-inner" />
            </div>
            {loginError && <p className="text-rose-400 text-xs text-center font-bold bg-rose-500/10 py-2 rounded-xl border border-rose-500/20">{loginError}</p>}
            <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-4 rounded-2xl shadow-lg shadow-amber-500/30 transition-all uppercase tracking-wider text-xs mt-3">GİRİŞ YAP</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#070B14] text-slate-100 font-sans overflow-hidden">
      
      {/* SOL MENÜ */}
      <aside className="w-20 md:w-64 bg-slate-950 border-r border-amber-500/20 flex flex-col shadow-2xl z-40 transition-all">
        <div className="h-24 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-800/80 bg-gradient-to-r from-amber-500/5 to-transparent">
          <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">🏨</span>
          <div className="hidden md:flex flex-col ml-3">
             <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 tracking-wider text-xs leading-tight">DOORS OF</span>
             <span className="font-bold text-slate-300 tracking-widest text-[10px] leading-tight">CAPPADOCIA</span>
          </div>
        </div>

        <nav className="flex-1 py-6 space-y-3 px-3">
          <button onClick={() => {setActiveTab("timeline"); setSelectedCariId(null);}} className={`w-full flex items-center justify-center md:justify-start px-3 py-3.5 rounded-2xl transition-all ${activeTab === 'timeline' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 scale-105' : 'text-slate-400 hover:bg-slate-900 hover:text-amber-400'}`}>
            <span className="text-xl">📅</span><span className="hidden md:block ml-3 text-sm">Takvim (PMS)</span>
          </button>
          <button onClick={() => {setActiveTab("kasa"); setSelectedCariId(null);}} className={`w-full flex items-center justify-center md:justify-start px-3 py-3.5 rounded-2xl transition-all ${activeTab === 'kasa' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20 scale-105' : 'text-slate-400 hover:bg-slate-900 hover:text-emerald-400'}`}>
            <span className="text-xl">💰</span><span className="hidden md:block ml-3 text-sm">Kasa & Raporlar</span>
          </button>
          <button onClick={() => setActiveTab("caris")} className={`w-full flex items-center justify-center md:justify-start px-3 py-3.5 rounded-2xl transition-all ${activeTab === 'caris' ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-slate-950 font-black shadow-lg shadow-sky-500/20 scale-105' : 'text-slate-400 hover:bg-slate-900 hover:text-sky-400'}`}>
            <span className="text-xl">👥</span><span className="hidden md:block ml-3 text-sm">Cari Hesaplar</span>
          </button>
          <button onClick={() => {setActiveTab("hk"); setSelectedCariId(null);}} className={`w-full flex items-center justify-center md:justify-start px-3 py-3.5 rounded-2xl transition-all ${activeTab === 'hk' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-slate-950 font-black shadow-lg shadow-purple-500/20 scale-105' : 'text-slate-400 hover:bg-slate-900 hover:text-purple-400'}`}>
            <span className="text-xl">🧹</span><span className="hidden md:block ml-3 text-sm">Temizlik (HK) Logları</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-900">
          <button onClick={handleLogout} className="w-full flex items-center justify-center md:justify-start px-3 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-bold text-xs">
            <span className="text-lg">🚪</span><span className="hidden md:block ml-3">Güvenli Çıkış</span>
          </button>
        </div>
      </aside>

      {/* ANA İÇERİK */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-slate-900/60 backdrop-blur-xl border-b border-amber-500/20 px-6 flex justify-between items-center z-20 shrink-0">
          <h2 className="text-base font-black text-slate-200 hidden md:block tracking-wide">
            {activeTab === 'timeline' && 'Oda & Rezervasyon Akışı'}
            {activeTab === 'kasa' && 'Kasa Durumu & Günlük Finans Raporları'}
            {activeTab === 'caris' && (selectedCariId ? 'Cari Hesap Detayı' : 'Özel Cari & Tedarikçi Rehberi')}
            {activeTab === 'hk' && 'Günlük Oda Temizlik ve Bakım Logları'}
          </h2>
          <h2 className="text-xs font-black text-amber-400 block md:hidden">DOORS OF CAPPADOCIA</h2>
          
          {activeTab === 'timeline' && (
             <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-1.5 shadow-inner">
               <button onClick={() => handleJumpToDate(todayStr)} className="text-[10px] font-black text-slate-300 hover:text-slate-950 hover:bg-amber-400 px-3 py-1.5 bg-slate-900 rounded-xl transition-all tracking-wider">BUGÜN</button>
               <input type="date" value={jumpDate} onChange={(e) => handleJumpToDate(e.target.value)} className="bg-transparent text-amber-400 text-xs font-bold outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert" />
             </div>
          )}
        </header>

        {activeTab === "timeline" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-[#070B14] relative custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed select-none">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="sticky left-0 top-0 bg-slate-950 z-30 w-16 border-r border-b border-amber-500/30 text-center shadow-[4px_0_15px_-3px_rgba(0,0,0,0.8)]"><span className="text-[10px] font-black tracking-widest text-amber-400">ODA</span></th>
                    {days.map(dayObj => (
                      <th key={dayObj.dateStr} id={"col-" + dayObj.dateStr} className={`w-[48px] sticky top-0 bg-slate-950/95 z-20 border-r border-b border-slate-800 text-center py-2 ${dayObj.dateStr === todayStr ? 'bg-amber-500/10 border-b-amber-400' : ''}`}>
                        <div className={`text-xs font-black ${dayObj.dateStr === todayStr ? 'text-amber-400' : 'text-slate-200'}`}>{dayObj.dayNum}</div>
                        <div className="text-[9px] font-semibold uppercase text-slate-500">{dayObj.dayName}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(room => {
                    const roomTodayHk = housekeeping.find(h => h.roomNo === room && h.date === todayStr);
                    const status = roomTodayHk ? roomTodayHk.status : 'Kirli';
                    let dotColor = "bg-rose-500";
                    if (status === 'Temiz') dotColor = "bg-emerald-500";
                    if (status === 'Bakım') dotColor = "bg-sky-500";
                    if (status === 'Arızalı') dotColor = "bg-red-600 animate-pulse";

                    return (
                      <tr key={room} className="hover:bg-slate-900/40 group/row">
                        <td className="sticky left-0 bg-slate-950 group-hover/row:bg-slate-900 z-20 border-r border-b border-slate-800 text-center text-slate-300 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.8)] h-9 font-black text-xs">
                          <div className="flex items-center justify-center gap-1.5">
                            <span>{room}</span>
                            <span className={`w-2 h-2 rounded-full ${dotColor}`} title={status}></span>
                          </div>
                        </td>
                        {renderRowCells(room)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <footer className="shrink-0 h-32 bg-slate-950 border-t border-amber-500/20 p-4 flex gap-4 shadow-2xl z-20">
              <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col">
                <h3 className="text-xs font-bold text-emerald-400 border-b border-slate-800 pb-2 mb-2 flex justify-between items-center">
                  <span>BUGÜN GİRİŞLER (ÇE-İN)</span><span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-black">{checkInsToday.length} Oda</span>
                </h3>
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {checkInsToday.length === 0 ? <p className="text-[11px] text-slate-500 italic">Giriş yok.</p> : checkInsToday.map(r => (
                    <div key={r.id} className="flex justify-between items-center text-xs bg-slate-800/60 p-2 rounded-xl text-slate-200 font-bold">
                      <span>Oda {r.roomNo} - <span className="font-normal text-slate-300">{r.guestName}</span></span>
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${r.status === 'checked_in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{r.status === 'checked_in' ? 'Otelde' : 'Bekliyor'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col">
                <h3 className="text-xs font-bold text-rose-400 border-b border-slate-800 pb-2 mb-2 flex justify-between items-center">
                  <span>BUGÜN ÇIKIŞLAR (ÇE-OUT)</span><span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-black">{checkOutsToday.length} Oda</span>
                </h3>
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {checkOutsToday.length === 0 ? <p className="text-[11px] text-slate-500 italic">Çıkış yok.</p> : checkOutsToday.map(r => {
                    const { remaining, currency } = getCalc(r);
                    return (
                      <div key={r.id} className="flex justify-between items-center text-xs bg-slate-800/60 p-2 rounded-xl">
                        <span className="font-bold text-slate-200">Oda {r.roomNo} - <span className="font-normal text-slate-300">{r.guestName}</span></span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${remaining > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{remaining > 0 ? `${remaining} ${currency} Borç` : 'Ödendi'}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </footer>
          </div>
        )}

        {activeTab === "kasa" && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-gradient-to-b from-[#070B14] to-slate-950">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-bl-full"></div>
                <h3 className="text-slate-400 text-xs font-black uppercase tracking-wider mb-2">Türk Lirası Kasa</h3>
                <div className={`text-4xl font-black ${kasaBalances.TL.total >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {kasaBalances.TL.total.toLocaleString()} <span className="text-xl">TL</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-bl-full"></div>
                <h3 className="text-slate-400 text-xs font-black uppercase tracking-wider mb-2">Amerikan Doları Kasa</h3>
                <div className={`text-4xl font-black ${kasaBalances.USD.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {kasaBalances.USD.total.toLocaleString()} <span className="text-xl">USD</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-sky-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-sky-500/10 rounded-bl-full"></div>
                <h3 className="text-slate-400 text-xs font-black uppercase tracking-wider mb-2">Euro Kasa</h3>
                <div className={`text-4xl font-black ${kasaBalances.EUR.total >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
                  {kasaBalances.EUR.total.toLocaleString()} <span className="text-xl">EUR</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 mb-4 gap-4">
                <h3 className="text-lg font-black text-amber-400">📊 GÜNLÜK FİNANS RAPORU</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setReportFilterDate(yesterdayStr)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all">Dün</button>
                  <button onClick={() => setReportFilterDate(todayStr)} className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-black transition-all">Bugün</button>
                  <button onClick={() => setReportFilterDate(tomorrowStr)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all">Yarın</button>
                  <input type="date" value={reportFilterDate} onChange={e => setReportFilterDate(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-amber-400 font-bold outline-none" />
                </div>
              </div>
              <div className="overflow-auto max-h-72 custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 bg-slate-950">
                    <tr><th className="p-3 rounded-l-xl">Kategori</th><th className="p-3">Açıklama</th><th className="p-3">Yöntem</th><th className="p-3 text-right rounded-r-xl">Tutar</th></tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? <tr><td colSpan="4" className="text-center p-6 text-slate-500 italic">Kayıtlı işlem bulunmuyor.</td></tr> :
                      filteredTransactions.map(tx => (
                        <tr key={tx.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                          <td className="p-3 font-bold text-amber-400">{tx.category || 'Genel'}</td>
                          <td className="p-3 text-slate-300 font-medium">{tx.desc}</td>
                          <td className="p-3"><span className="px-2 py-1 bg-slate-950 rounded-lg text-[10px]">{tx.method === 'cash' ? 'Nakit' : 'POS'}</span></td>
                          <td className={`p-3 text-right font-black ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()} {tx.currency || 'TL'}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl h-fit">
                <h3 className="text-base font-black text-amber-400 mb-4 border-b border-slate-800 pb-2">Hızlı Kasa / Gider İşlemi</h3>
                <div className="space-y-4 max-w-3xl">
                  <div className="flex gap-2">
                    <button onClick={() => setKasaType("income")} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${kasaType==='income' ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-slate-950 text-slate-400'}`}>GELİR (+)</button>
                    <button onClick={() => setKasaType("expense")} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${kasaType==='expense' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-950 text-slate-400'}`}>GİDER (-)</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <select value={kasaCategory} onChange={e=>setKasaCategory(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none font-bold">
                      <option value="Konaklama">🏨 Konaklama</option><option value="Balon Turu">🎈 Balon Turu</option><option value="ATV Turu"> ATV Turu</option><option value="At Turu">🐎 At Turu</option><option value="Deve Turu">🐪 Deve Turu</option><option value="Türk Gecesi">💃 Türk Gecesi</option><option value="Transfer">🚐 Havalimanı Transfer</option><option value="Market / Mutfak Gideri">🛒 Market & Mutfak</option><option value="Genel Gider">🧾 Diğer Gider</option>
                    </select>
                    <input type="number" value={kasaAmount} onChange={e=>setKasaAmount(e.target.value)} placeholder="Tutar" className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none" />
                    <select value={kasaCurrency} onChange={e=>setKasaCurrency(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-amber-400 font-bold outline-none">
                      <option value="TL">TL</option><option value="USD">USD</option><option value="EUR">EUR</option>
                    </select>
                    <select value={kasaMethod} onChange={e=>setKasaMethod(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none">
                      <option value="cash">Nakit Kasa</option><option value="cc">Kredi Kartı / POS</option>
                    </select>
                  </div>
                  <input type="text" value={kasaDesc} onChange={e=>setKasaDesc(e.target.value)} placeholder="Açıklama (Örn: Mutfak sebze alışverişi)" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none" />
                  <button onClick={handleAddManualTransaction} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-xl shadow-lg transition-all text-xs tracking-wider uppercase">KASAYA İŞLE</button>
                </div>
            </div>
          </div>
        )}

        {/* 3. SEKME: CARİ HESAPLAR (YENİ MASTER-DETAIL GÖRÜNÜM) */}
        {activeTab === "caris" && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-gradient-to-b from-[#070B14] to-slate-950">
            
            {/* EĞER BİR CARİ SEÇİLDİYSE DETAY EKRANINI GÖSTER */}
            {selectedCariId ? (
              <div className="animate-in fade-in zoom-in duration-300">
                {(() => {
                  const currentCari = caris.find(c => c.id === selectedCariId);
                  if (!currentCari) return null;
                  const cBals = getCariBalances(currentCari.transactions);
                  
                  return (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col max-h-[85vh]">
                      
                      {/* ÜST BİLGİ & GERİ DÖN BUTONU */}
                      <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-6">
                        <div>
                          <button onClick={() => setSelectedCariId(null)} className="text-amber-500 hover:text-amber-400 font-black text-xs mb-3 flex items-center gap-1 transition-all">
                            <span>←</span> LİSTEYE GERİ DÖN
                          </button>
                          <h3 className="text-3xl font-black text-slate-100">{currentCari.name}</h3>
                          <p className="text-sm text-slate-400 font-bold mt-1">{currentCari.type} <span className="mx-2">|</span> 📞 {currentCari.phone || 'Belirtilmemiş'}</p>
                        </div>
                        <div className="flex gap-4">
                          <div className="bg-slate-950 border border-amber-500/20 p-3 rounded-2xl text-center min-w-[100px]">
                            <span className="block text-[10px] text-amber-500 uppercase font-black mb-1">TL Bakiye</span>
                            <span className={`text-xl font-black ${cBals.TL >= 0 ? 'text-slate-200' : 'text-rose-400'}`}>{cBals.TL.toLocaleString()}</span>
                          </div>
                          <div className="bg-slate-950 border border-emerald-500/20 p-3 rounded-2xl text-center min-w-[100px]">
                            <span className="block text-[10px] text-emerald-500 uppercase font-black mb-1">USD Bakiye</span>
                            <span className={`text-xl font-black ${cBals.USD >= 0 ? 'text-slate-200' : 'text-rose-400'}`}>{cBals.USD.toLocaleString()}</span>
                          </div>
                          <div className="bg-slate-950 border border-sky-500/20 p-3 rounded-2xl text-center min-w-[100px]">
                            <span className="block text-[10px] text-sky-500 uppercase font-black mb-1">EUR Bakiye</span>
                            <span className={`text-xl font-black ${cBals.EUR >= 0 ? 'text-slate-200' : 'text-rose-400'}`}>{cBals.EUR.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* İŞLEM EKLEME FORMU & GEÇMİŞ İŞLEMLER */}
                      <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">
                        
                        {/* SOL: YENİ İŞLEM EKLE */}
                        <div className="w-full lg:w-1/3 space-y-4 bg-slate-950/50 p-5 rounded-2xl border border-slate-800 h-fit">
                          <h4 className="text-sm font-black text-sky-400 border-b border-slate-800 pb-2 mb-3">Yeni Cari Hareket İşle</h4>
                          
                          <div className="flex gap-2">
                            <button onClick={() => setCariTxType("borc")} className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all ${cariTxType==='borc' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>BORÇ YAZ (+)</button>
                            <button onClick={() => setCariTxType("odeme")} className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all ${cariTxType==='odeme' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>TAHSİLAT / ÖDEME (-)</button>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1 font-bold">Kategori (Balon, ATV vb.)</label>
                            <select value={cariTxCategory} onChange={e=>setCariTxCategory(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-bold outline-none">
                              <option value="Balon Turu">🎈 Balon Turu</option><option value="ATV Turu"> ATV Turu</option><option value="At Turu">🐎 At Turu</option><option value="Deve Turu">🐪 Deve Turu</option><option value="Türk Gecesi">💃 Türk Gecesi</option><option value="Transfer">🚐 Havalimanı Transfer</option><option value="Market / Mutfak Gideri">🛒 Market & Mutfak</option><option value="Otel Konaklama">🏨 Otel Konaklama</option><option value="Genel">🧾 Genel İşlem</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" value={cariTxAmount} onChange={e=>setCariTxAmount(e.target.value)} placeholder="Tutar" className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none" />
                            <select value={cariTxCurrency} onChange={e=>setCariTxCurrency(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-400 font-bold outline-none">
                              <option value="TL">TL</option><option value="USD">USD</option><option value="EUR">EUR</option>
                            </select>
                          </div>

                          <input type="text" value={cariTxDesc} onChange={e=>setCariTxDesc(e.target.value)} placeholder="İşlem Açıklaması" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none" />
                          
                          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={cariTxPushKasa} onChange={e=>setCariTxPushKasa(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                              <span className="text-xs font-bold text-slate-300">Bu işlemi Ana Kasaya da yansıt</span>
                            </label>
                            {cariTxPushKasa && (
                              <select value={cariTxKasaMethod} onChange={e=>setCariTxKasaMethod(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 outline-none">
                                <option value="cash">Nakit Kasasına İşle</option>
                                <option value="cc">Kredi Kartı / POS'a İşle</option>
                              </select>
                            )}
                          </div>

                          <button onClick={() => handleCariTransaction(currentCari)} className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black py-3 rounded-xl shadow-lg transition-all text-xs tracking-wider uppercase">İŞLEMİ KAYDET</button>
                        </div>

                        {/* SAĞ: GEÇMİŞ İŞLEMLER TABLOSU */}
                        <div className="w-full lg:w-2/3 flex flex-col h-[400px]">
                          <h4 className="text-sm font-black text-slate-300 border-b border-slate-800 pb-2 mb-3">Hesap Ekstresi & Geçmiş İşlemler</h4>
                          <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left text-xs">
                              <thead className="text-slate-400 bg-slate-950 sticky top-0">
                                <tr><th className="p-3 rounded-l-xl">Tarih</th><th className="p-3">Kategori</th><th className="p-3">Açıklama</th><th className="p-3 text-right rounded-r-xl">Tutar</th></tr>
                              </thead>
                              <tbody>
                                {(currentCari.transactions || []).length === 0 ? <tr><td colSpan="4" className="text-center p-6 text-slate-500 italic">Bu cariye ait henüz işlem bulunmuyor.</td></tr> :
                                  currentCari.transactions.map(tx => (
                                    <tr key={tx.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                                      <td className="p-3 text-slate-400 font-medium">{tx.date}</td>
                                      <td className="p-3 font-bold text-sky-400">{tx.category || 'Genel'}</td>
                                      <td className="p-3 text-slate-200">{tx.desc}</td>
                                      <td className={`p-3 text-right font-black ${tx.type === 'borc' ? 'text-amber-400' : 'text-emerald-400'}`}>{tx.type === 'borc' ? '+' : '-'}{tx.amount.toLocaleString()} {tx.currency || 'TL'}</td>
                                    </tr>
                                  ))
                                }
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-slate-800 text-right">
                        <button onClick={() => handleDeleteCari(currentCari.id)} className="text-rose-400 hover:bg-rose-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">Bu Cariyi Tamamen Sil</button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              // CARİ LİSTESİ GÖRÜNÜMÜ
              <div className="animate-in fade-in duration-300">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="text-lg font-black text-sky-400 mb-1">Cari Hesaplar & Rehber</h3>
                    <p className="text-xs text-slate-400">Yeni bir cari oluşturun veya işlem yapmak için listeden birine tıklayın.</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <input type="text" value={newCariName} onChange={e=>setNewCariName(e.target.value)} placeholder="Cari Adı (Örn: Yavuz Bey)" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-sky-500" />
                    <select value={newCariType} onChange={e=>setNewCariType(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-bold outline-none">
                      <option value="Acente / Şahıs">Acente / Şahıs</option><option value="Tedarikçi">Tedarikçi</option><option value="Market / Mutfak">Market / Gider</option>
                    </select>
                    <button onClick={handleAddCari} className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-lg transition-all text-xs uppercase">Ekle</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {caris.length === 0 ? <p className="text-slate-500 italic text-sm col-span-full text-center py-10">Henüz kayıtlı cari hesap yok.</p> :
                    caris.map(cari => {
                      const cBals = getCariBalances(cari.transactions);
                      return (
                        <div key={cari.id} onClick={() => setSelectedCariId(cari.id)} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl hover:border-sky-500/40 hover:shadow-sky-500/10 cursor-pointer transition-all transform hover:-translate-y-1">
                          <h4 className="text-base font-black text-slate-100 mb-1 truncate">{cari.name}</h4>
                          <span className="inline-block px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-[9px] text-slate-400 font-bold uppercase mb-4">{cari.type}</span>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between items-center text-xs border-b border-slate-800/60 pb-1">
                              <span className="text-slate-500">TL Bakiye:</span>
                              <span className={`font-black ${cBals.TL >= 0 ? 'text-slate-300' : 'text-rose-400'}`}>{cBals.TL.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs border-b border-slate-800/60 pb-1">
                              <span className="text-slate-500">USD Bakiye:</span>
                              <span className={`font-black ${cBals.USD >= 0 ? 'text-slate-300' : 'text-rose-400'}`}>{cBals.USD.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">EUR Bakiye:</span>
                              <span className={`font-black ${cBals.EUR >= 0 ? 'text-slate-300' : 'text-rose-400'}`}>{cBals.EUR.toLocaleString()}</span>
                            </div>
                          </div>
                          
                          <div className="w-full text-center bg-sky-500/10 text-sky-400 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-sky-500/20">
                            Hesap Ekstresi
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. SEKME: GÜNLÜK HOUSEKEEPING */}
        {activeTab === "hk" && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-gradient-to-b from-[#070B14] to-slate-950">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-800 pb-4 gap-4">
              <h3 className="text-lg font-black text-purple-400 flex items-center gap-2">
                <span>🧹 ODA TEMİZLİK & GÜNLÜK LOG SİSTEMİ</span>
              </h3>
              <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 font-bold px-2">Günlük Rapor:</span>
                <button onClick={() => setHkFilterDate(yesterdayStr)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all">Dün</button>
                <button onClick={() => setHkFilterDate(todayStr)} className="px-3 py-1.5 bg-purple-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-purple-500/30">Bugün</button>
                <button onClick={() => setHkFilterDate(tomorrowStr)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all">Yarın</button>
                <input type="date" value={hkFilterDate} onChange={e => setHkFilterDate(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-purple-400 font-bold outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {rooms.map(room => {
                const roomHk = housekeeping.find(h => h.roomNo === room && h.date === hkFilterDate) || { status: 'Kirli', note: '' };
                const st = roomHk.status;

                let badgeColor = "bg-rose-500/20 text-rose-400 border-rose-500/30";
                if (st === 'Temiz') badgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
                if (st === 'Bakım') badgeColor = "bg-sky-500/20 text-sky-400 border-sky-500/30";
                if (st === 'Arızalı') badgeColor = "bg-red-600/30 text-red-400 border-red-500/50 animate-pulse";

                return (
                  <div key={room} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between hover:border-purple-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4 border-b border-slate-800/60 pb-3">
                      <div>
                        <h4 className="text-2xl font-black text-slate-100 mb-1">Oda {room}</h4>
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase border ${badgeColor}`}>
                          {st === 'Temiz' && '✨ Temiz (Girildi)'}
                          {st === 'Kirli' && '🔴 Kirli (Girilmedi)'}
                          {st === 'Bakım' && '🛠️ Bakım Yapıldı'}
                          {st === 'Arızalı' && '🚫 Arızalı (Kapalı)'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button onClick={() => handleUpdateHK(room, 'Temiz', roomHk.note)} className={`py-2 rounded-xl text-[10px] font-black transition-all ${st === 'Temiz' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'}`}>TEMİZLE</button>
                      <button onClick={() => handleUpdateHK(room, 'Kirli', roomHk.note)} className={`py-2 rounded-xl text-[10px] font-black transition-all ${st === 'Kirli' ? 'bg-rose-500 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'}`}>KİRLİ / GİRİLMEDİ</button>
                      <button onClick={() => handleUpdateHK(room, 'Bakım', roomHk.note)} className={`py-2 rounded-xl text-[10px] font-black transition-all ${st === 'Bakım' ? 'bg-sky-500 text-slate-900' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'}`}>BAKIM YAPILDI</button>
                      <button onClick={() => handleUpdateHK(room, 'Arızalı', roomHk.note)} className={`py-2 rounded-xl text-[10px] font-black transition-all ${st === 'Arızalı' ? 'bg-red-600 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'}`}>ARIZALI / KAPALI</button>
                    </div>

                    <div className="mt-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex items-center">
                      <span className="text-xs px-2 text-slate-500">📝</span>
                      <input 
                        type="text" 
                        defaultValue={roomHk.note} 
                        onBlur={(e) => {
                          if(e.target.value !== roomHk.note) handleUpdateHK(room, st, e.target.value);
                        }}
                        placeholder="HK Notu (Havlu değişti vb.)" 
                        className="w-full bg-transparent text-xs text-slate-300 outline-none" 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* REZERVASYON MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center p-4 z-50">
          <div className="bg-slate-900 border border-amber-500/40 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-slate-950 p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-black text-amber-400 tracking-wide">ODA #{formData.roomNo} <span className="text-slate-400 font-normal">| {formData.guestName || 'Yeni Rezervasyon'}</span></h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-amber-400 transition-colors text-xl font-bold">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col md:flex-row gap-6 custom-scrollbar">
              <div className="flex-1 space-y-4">
                <h3 className="text-xs font-black text-emerald-400 border-b border-slate-800 pb-1 uppercase tracking-wider">Konaklama Bilgileri</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-bold">Misafir Adı</label>
                    <input type="text" value={formData.guestName} onChange={e => setFormData({...formData, guestName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-amber-400 mb-1 font-black">Durum</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 outline-none focus:border-amber-400 font-bold">
                      <option value="waiting">🟡 Bekliyor</option>
                      <option value="checked_in">🟢 Otelde (In-House)</option>
                      <option value="checked_out">🔴 Çıkış Yaptı</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-bold">Giriş Tarihi</label>
                    <input type="date" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-bold">Çıkış Tarihi</label>
                    <input type="date" value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-bold">Telefon / İletişim</label>
                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="0532..." className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-bold">Özel Not</label>
                    <input type="text" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="Örn: Balayı çifti" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 outline-none" />
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-xs font-black text-amber-400 border-b border-slate-800 pb-1 mb-3 uppercase tracking-wider">🎈 Tur & Transfer Ekle</h3>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <select value={tourType} onChange={e=>setTourType(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-bold">
                      <option value="Balon Turu">Balon Turu</option><option value="ATV Turu">ATV Quad Turu</option><option value="At Turu">At Turu</option><option value="Deve Turu">Deve Turu</option><option value="Türk Gecesi">Türk Gecesi</option><option value="Transfer">Havalimanı Transfer</option>
                    </select>
                    {tourType === 'Transfer' ? (
                      <select value={transferDest} onChange={e=>setTransferDest(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-400 font-bold">
                        <option value="Kayseri (ASR)">Kayseri (ASR)</option><option value="Nevşehir (NAV)">Nevşehir (NAV)</option>
                      </select>
                    ) : (
                      <select value={tourCategory} onChange={e=>setTourCategory(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-400 font-bold">
                        <option value="Regular">Regular Grup Tur</option><option value="Private">Özel Private Tur</option>
                      </select>
                    )}
                  </div>

                  <div className="flex gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <input type="number" value={tourPrice} onChange={e=>setTourPrice(e.target.value)} placeholder="Tutar" className="w-24 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 text-center outline-none" />
                    <select value={tourCurrency} onChange={e=>setTourCurrency(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-amber-400 font-bold">
                      <option value="TL">TL</option><option value="USD">USD</option><option value="EUR">EUR</option>
                    </select>
                    <button onClick={handleAddTourToRez} className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 rounded-lg text-xs tracking-wider">EKSTRA TUR EKLE</button>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-400 mb-1 font-bold">Oda Konaklama Ücreti</label>
                      <input type="number" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-200 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-bold">Birim</label>
                      <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-amber-400 font-black outline-none">
                        <option value="TL">TL</option><option value="USD">USD</option><option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-5/12 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col">
                <h3 className="text-xs font-black text-sky-400 border-b border-slate-800 pb-1 uppercase tracking-wider mb-3">Hesap Özeti & Tahsilat</h3>
                {(() => {
                  const { totalDebt, totalPaid, remaining } = getCalc(formData);
                  const cur = formData.currency || 'TL';
                  return (
                    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 mb-4 space-y-2">
                      <div className="flex justify-between text-xs text-slate-400"><span>Toplam Borç (Oda+Turlar):</span><span className="font-bold text-slate-200">{totalDebt.toLocaleString()} {cur}</span></div>
                      <div className="flex justify-between text-xs text-slate-400"><span>Alınan Ödemeler:</span><span className="font-bold text-emerald-400">{totalPaid.toLocaleString()} {cur}</span></div>
                      <div className="border-t border-slate-800 pt-2 flex justify-between text-sm">
                        <span className="font-black text-slate-200">Kalan Bakiye:</span>
                        <span className={`font-black ${remaining > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{remaining > 0 ? `${remaining.toLocaleString()} ${cur}` : `0 ${cur}`}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex-1 overflow-y-auto space-y-1.5 mb-4 pr-1 max-h-32">
                  <h4 className="text-[10px] text-slate-500 font-bold uppercase">Ekstra Eklenenler & Turlar</h4>
                  {formData.debts.map(d => (
                    <div key={d.id} className="flex justify-between bg-slate-900 p-2 rounded-xl text-xs border border-slate-800">
                      <span className="text-slate-300 font-medium">{d.title}</span>
                      <div><span className="text-amber-400 font-bold mr-2">{d.amount} {d.currency}</span><button onClick={()=>handleDeleteDebt(d.id)} className="text-rose-400 font-bold px-1">X</button></div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <h4 className="text-[10px] text-amber-400 font-black uppercase mb-2">Kasaya Tahsilat Al</h4>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder="Tutar" className="w-1/2 bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none" />
                      <select value={payCurrency} onChange={e=>setPayCurrency(e.target.value)} className="w-1/4 bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-amber-400 font-bold outline-none">
                        <option value="TL">TL</option><option value="USD">USD</option><option value="EUR">EUR</option>
                      </select>
                      <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} className="w-1/4 bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none">
                        <option value="cash">Nakit</option><option value="cc">POS</option>
                      </select>
                    </div>
                    <input type="text" value={payNote} onChange={e=>setPayNote(e.target.value)} placeholder="Açıklama (Örn: Peşinat)" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none" />
                    <button onClick={handleReceivePayment} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl shadow-lg transition-all text-xs uppercase tracking-wider">TAHSİLAT AL & KASAYA İŞLE</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-between items-center shrink-0">
              {selectedRez ? <button onClick={handleDeleteRez} className="text-rose-400 hover:text-rose-300 text-xs font-bold px-4 py-2 rounded-xl uppercase bg-rose-500/10">Rezervasyonu Sil</button> : <div></div>}
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800">İPTAL</button>
                <button onClick={handleSaveRez} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black px-7 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 uppercase text-xs tracking-wider">KAYDET</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {tooltip.visible && tooltip.rez && (
        <div className="fixed z-[99999] pointer-events-none bg-slate-950/95 backdrop-blur-md border border-amber-500/50 rounded-2xl p-3 shadow-2xl w-52" style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}>
          <div className="text-amber-400 font-black text-sm border-b border-slate-800 pb-1">{tooltip.rez.guestName}</div>
          <div className="text-[10px] space-y-1 mt-2 text-slate-300">
            <p><span className="text-slate-500">Giriş:</span> {tooltip.rez.checkIn}</p>
            <p><span className="text-slate-500">Çıkış:</span> {tooltip.rez.checkOut}</p>
            <p className={`font-black mt-1 pt-1 border-t border-slate-800 ${getCalc(tooltip.rez).remaining > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>Bakiye: {getCalc(tooltip.rez).remaining} {getCalc(tooltip.rez).currency}</p>
          </div>
        </div>
      )}
    </div>
  );
}
