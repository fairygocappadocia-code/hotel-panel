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
    roomNo: "", checkIn: "", checkOut: "", guestName: "", phone: "", note: "", balance: 0, currency: "EUR", debts: [], payments: [], status: "waiting"
  });

  const activities = [
    "Balon Turu", "ATV (Quad) Turu", "At Turu (Horse)", "Deve Turu (Camel)", "Türk Gecesi", 
    "Regular (Grup) Tur", "Özel (Private) Tur", "Transfer - Kayseri", "Transfer - Nevşehir", "Oda Konaklama", "Diğer"
  ];

  // Tur & Tahsilat State
  const [tourType, setTourType] = useState("Balon Turu");
  const [tourSelectedCari, setTourSelectedCari] = useState(""); 
  const [tourPrice, setTourPrice] = useState("");
  const [tourCurrency, setTourCurrency] = useState("EUR");
  const [tourNote, setTourNote] = useState("");

  const [payAmount, setPayAmount] = useState("");
  const [payCurrency, setPayCurrency] = useState("EUR");
  const [payMethod, setPayMethod] = useState("cash"); 
  const [payCategory, setPayCategory] = useState("Oda Konaklama"); 
  const [payNote, setPayNote] = useState("");
  
  // Cari ve Kasa
  const [selectedCariId, setSelectedCariId] = useState(null); 
  const [newCariName, setNewCariName] = useState("");
  const [newCariPhone, setNewCariPhone] = useState("");
  const [newCariType, setNewCariType] = useState("Acente / Şahıs"); 

  const [cariTxAmount, setCariTxAmount] = useState("");
  const [cariTxCurrency, setCariTxCurrency] = useState("TL");
  const [cariTxType, setCariTxType] = useState("arti"); 
  const [cariTxCategory, setCariTxCategory] = useState("Balon Turu");
  const [cariTxDesc, setCariTxDesc] = useState("");
  
  const [kasaAmount, setKasaAmount] = useState("");
  const [kasaCurrency, setKasaCurrency] = useState("TL");
  const [kasaType, setKasaType] = useState("expense");
  const [kasaCategory, setKasaCategory] = useState("Genel Gider");
  const [kasaSelectedCari, setKasaSelectedCari] = useState(""); 
  const [kasaMethod, setKasaMethod] = useState("cash");
  const [kasaDesc, setKasaDesc] = useState("");

  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, rez: null });
  const scrollContainerRef = useRef(null);
  const rooms = Array.from({ length: 20 }, (_, i) => 101 + i);

  const getTodayStr = () => {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  };
  
  const todayStr = getTodayStr();
  const [viewStartDate, setViewStartDate] = useState(todayStr);

  const shiftDate = (daysToAdd) => {
    const d = new Date(viewStartDate);
    d.setDate(d.getDate() + daysToAdd);
    setViewStartDate([d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'));
  };

  const visibleDays = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(viewStartDate);
    d.setDate(d.getDate() + i - 1); 
    const dateStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    const dayNum = d.getDate();
    const dayName = d.toLocaleDateString("tr-TR", { weekday: "short" });
    return { dateStr, dayNum, dayName };
  });

  const tomorrowObj = new Date(); tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = [tomorrowObj.getFullYear(), String(tomorrowObj.getMonth() + 1).padStart(2, '0'), String(tomorrowObj.getDate()).padStart(2, '0')].join('-');
  const yesterdayObj = new Date(); yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = [yesterdayObj.getFullYear(), String(yesterdayObj.getMonth() + 1).padStart(2, '0'), String(yesterdayObj.getDate()).padStart(2, '0')].join('-');

  const [reportFilterDate, setReportFilterDate] = useState(todayStr);
  const [hkFilterDate, setHkFilterDate] = useState(todayStr);

  useEffect(() => {
    if (!isLoggedIn) return;
    const unsubRez = onSnapshot(collection(db, "reservations"), (snapshot) => setReservations(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))));
    const unsubKasa = onSnapshot(collection(db, "transactions"), (snapshot) => setTransactions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a,b) => Number(b.id) - Number(a.id))));
    const unsubCari = onSnapshot(collection(db, "caris"), (snapshot) => setCaris(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))));
    const unsubHK = onSnapshot(collection(db, "housekeeping"), (snapshot) => setHousekeeping(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))));
    return () => { unsubRez(); unsubKasa(); unsubCari(); unsubHK(); };
  }, [isLoggedIn]);

  const handleOpenNewModal = (roomNo, dateStr) => {
    const d = new Date(dateStr); d.setDate(d.getDate() + 1);
    const checkOutStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    setFormData({ roomNo, checkIn: dateStr, checkOut: checkOutStr, guestName: "", phone: "", note: "", balance: 0, currency: "EUR", debts: [], payments: [], status: "waiting" });
    setSelectedRez(null); setIsModalOpen(true);
  };

  const handleEditRez = (rez) => {
    setTooltip({ visible: false, x: 0, y: 0, rez: null });
    setFormData({ ...rez, currency: rez.currency || "EUR", status: rez.status || "waiting", payments: rez.payments || [], debts: rez.debts || [] });
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
    if (!tourPrice) return alert("Lütfen ücret girin.");
    const cariObj = caris.find(c => c.id === tourSelectedCari);
    const cariNameStr = cariObj ? ` (${cariObj.name})` : "";
    const title = `${tourType}${cariNameStr} ${tourNote ? '- '+tourNote : ''}`;
    setFormData({ ...formData, debts: [...formData.debts, { id: Date.now().toString(), title, amount: parseFloat(tourPrice), currency: tourCurrency, cariId: tourSelectedCari }] });
    setTourPrice(""); setTourNote(""); setTourSelectedCari("");
  };

  const handleDeleteDebt = (debtId) => setFormData({ ...formData, debts: formData.debts.filter(d => d.id !== debtId) });

  const handleReceivePayment = async () => {
    if (!payAmount) return;
    const amountNum = parseFloat(payAmount);
    const payId = Date.now().toString();
    
    const updatedRez = { ...formData, payments: [...(formData.payments || []), { id: payId, category: payCategory, amount: amountNum, currency: payCurrency, method: payMethod, note: payNote, date: todayStr }] };
    setFormData(updatedRez);
    await setDoc(doc(db, "reservations", updatedRez.id.toString()), updatedRez);
    
    const txDesc = `Oda ${formData.roomNo} Tahsilatı: ${formData.guestName} ${payNote ? '('+payNote+')' : ''}`;
    await setDoc(doc(db, "transactions", (Date.now() + 1).toString()), { 
      id: (Date.now() + 1).toString(), date: todayStr, type: 'income', category: payCategory, amount: amountNum, currency: payCurrency, method: payMethod, desc: txDesc 
    });
    
    setPayAmount(""); setPayNote("");
  };

  const handleAddCari = async () => {
    if (!newCariName) return alert("Cari adı zorunludur.");
    const cariId = Date.now().toString();
    await setDoc(doc(db, "caris", cariId), { id: cariId, name: newCariName, phone: newCariPhone, type: newCariType, transactions: [] });
    setNewCariName(""); setNewCariPhone("");
  };

  const handleCariTransaction = async (cari) => {
    if (!cariTxAmount || !cariTxDesc) return alert("Tutar ve açıklama zorunludur.");
    const amt = parseFloat(cariTxAmount);
    const txObj = { id: Date.now().toString(), date: todayStr, type: cariTxType, amount: amt, currency: cariTxCurrency, category: cariTxCategory, desc: cariTxDesc };
    const updatedCari = { ...cari, transactions: [...(cari.transactions || []), txObj] };
    await setDoc(doc(db, "caris", cari.id), updatedCari);
    setCariTxAmount(""); setCariTxDesc("");
  };

  const handleDeleteCari = async (cariId) => {
    if (confirm("Bu cariyi silmek istediğinize emin misiniz?")) {
      await deleteDoc(doc(db, "caris", cariId));
      setSelectedCariId(null);
    }
  };

  // TAM ENTEGRE KASA -> CARİ İŞLEMİ (SİHİRLİ BAĞLANTI)
  const handleAddManualTransaction = async () => {
    if(!kasaAmount || !kasaDesc) return alert("Tutar ve açıklama zorunludur.");
    const amt = parseFloat(kasaAmount);
    const newTxId = Date.now().toString();
    let finalDesc = kasaDesc;
    const selectedCari = caris.find(c => c.id === kasaSelectedCari);
    
    if (selectedCari) finalDesc = `${selectedCari.name} - ${kasaDesc}`;

    // 1. Kasaya İşle
    const newTx = { id: newTxId, date: todayStr, type: kasaType, category: kasaCategory, amount: amt, currency: kasaCurrency, method: kasaMethod, desc: finalDesc };
    await setDoc(doc(db, "transactions", newTxId), newTx);

    // 2. Cariye İşle (Kasadan gider çıkıyorsa Cariye ödeme yapılmıştır = Cari bakiye düşer)
    if (selectedCari) {
      // Eğer Kasa Gider (expense) ise Cariye 'eksi' (ödeme yapıldı) yansır. Gelir ise 'arti' yansır.
      const cType = kasaType === 'expense' ? 'eksi' : 'arti'; 
      const cDesc = `Ana Kasadan Otomatik: ${kasaDesc}`;
      const txObjCari = { id: (Date.now() + 1).toString(), date: todayStr, type: cType, amount: amt, currency: kasaCurrency, category: kasaCategory, desc: cDesc };
      const updatedCari = { ...selectedCari, transactions: [...(selectedCari.transactions || []), txObjCari] };
      await setDoc(doc(db, "caris", selectedCari.id), updatedCari);
    }
    setKasaAmount(""); setKasaDesc(""); setKasaSelectedCari("");
  };

  const getCariBalances = (transactions = []) => {
    return transactions.reduce((acc, tx) => {
      const cur = tx.currency || 'TL';
      if (!acc[cur]) acc[cur] = 0;
      const mult = tx.type === 'arti' ? 1 : -1;
      acc[cur] += tx.amount * mult;
      return acc;
    }, { TL: 0, USD: 0, EUR: 0 });
  };

  const handleUpdateHK = async (roomNo, status, note = "") => {
    const hkId = `${hkFilterDate}_${roomNo}`;
    await setDoc(doc(db, "housekeeping", hkId), { roomNo, date: hkFilterDate, status, note, updatedAt: new Date().toISOString() });
  };

  const getCalc = (rez) => {
    const totalDebt = (parseFloat(rez.balance) || 0) + (rez.debts || []).reduce((a, b) => a + b.amount, 0);
    const totalPaid = (rez.payments || []).reduce((a, b) => a + b.amount, 0);
    return { totalDebt, totalPaid, remaining: totalDebt - totalPaid, currency: rez.currency || 'EUR' };
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
    if (status === 'checked_in') return "bg-emerald-500 text-white shadow-emerald-500/40 shadow-sm border border-emerald-600";
    if (status === 'checked_out') return "bg-rose-500 text-white shadow-rose-500/40 shadow-sm border border-rose-600";
    return "bg-indigo-500 text-white shadow-indigo-500/40 shadow-sm border border-indigo-600";
  };

  const renderRowCells = (roomNo) => {
    let cells = [];
    let i = 0;
    while (i < visibleDays.length) {
      const day = visibleDays[i].dateStr;
      const rez = reservations.find(r => r.roomNo === roomNo && day >= r.checkIn && day < r.checkOut);

      if (rez) {
        let span = 0;
        while (i + span < visibleDays.length && visibleDays[i + span].dateStr < rez.checkOut) { span++; }
        if (span === 0) span = 1; 

        cells.push(
          <td key={day} colSpan={span} className="border-r border-b border-slate-100 p-0.5 min-w-[50px] relative h-[36px]">
            <div 
              onMouseEnter={(e) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, rez })}
              onMouseMove={(e) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, rez })}
              onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, rez: null })}
              onClick={() => handleEditRez(rez)}
              className={`${getStatusColor(rez.status)} text-[11px] font-bold px-2 h-full w-full rounded-md flex items-center cursor-pointer overflow-hidden z-10 transition-all duration-200 hover:scale-[1.02] hover:brightness-110`}
            >
              <span className="truncate w-full tracking-wide drop-shadow-sm">{rez.guestName}</span>
              {getCalc(rez).remaining > 0 && <span className="absolute right-1 top-1 w-2 h-2 rounded-full bg-yellow-300 animate-pulse border border-white"></span>}
            </div>
          </td>
        );
        i += span; 
      } else {
        cells.push(
          <td key={day} onClick={() => handleOpenNewModal(roomNo, day)} className={`border-r border-b border-slate-100 h-[36px] min-w-[50px] cursor-pointer hover:bg-indigo-50 transition-colors ${day === todayStr ? 'bg-indigo-50/40' : 'bg-white'}`}></td>
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
      <div className="flex h-screen w-screen bg-slate-50 items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white border border-slate-200 w-full max-w-md p-10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.05)] flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl flex items-center justify-center mb-6 text-5xl shadow-lg shadow-indigo-500/30">🏨</div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Doors of Cappadocia</h1>
          <p className="text-sm text-slate-500 mb-8 font-medium">Premium Yönetim Paneli</p>
          <form onSubmit={handleLogin} className="w-full space-y-5">
            <div>
              <label className="block text-xs text-slate-500 font-bold mb-2 uppercase tracking-wide">Kullanıcı Adı</label>
              <input type="text" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} placeholder="Kullanıcı adınız" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-bold mb-2 uppercase tracking-wide">Şifre</label>
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Şifreniz" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" />
            </div>
            {loginError && <p className="text-rose-500 text-xs text-center font-bold bg-rose-50 py-2 rounded-lg">{loginError}</p>}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all text-sm mt-2 uppercase tracking-widest">Giriş Yap</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">
      
      {/* SOL MENÜ & DASHBOARD (BUTİKSOFT TARZI) */}
      <aside className="w-[280px] bg-white border-r border-slate-200 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.03)] z-40 transition-all shrink-0">
        <div className="h-20 flex items-center justify-center md:justify-start px-6 border-b border-slate-100 shrink-0">
          <span className="text-3xl drop-shadow-sm">🏨</span>
          <div className="flex flex-col ml-3">
             <span className="font-black text-indigo-700 tracking-tight text-sm leading-tight">DOORS OF</span>
             <span className="font-bold text-slate-500 tracking-widest text-[10px] leading-tight">CAPPADOCIA</span>
          </div>
        </div>

        <nav className="py-5 space-y-1 px-4 border-b border-slate-100 shrink-0">
          <button onClick={() => {setActiveTab("timeline"); setSelectedCariId(null);}} className={`w-full flex items-center justify-start px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === 'timeline' ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600 font-medium'}`}>
            <span className="text-xl">📅</span><span className="ml-3 text-sm">Takvim & PMS</span>
          </button>
          <button onClick={() => {setActiveTab("kasa"); setSelectedCariId(null);}} className={`w-full flex items-center justify-start px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === 'kasa' ? 'bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600 font-medium'}`}>
            <span className="text-xl">💰</span><span className="ml-3 text-sm">Finans & Kasa</span>
          </button>
          <button onClick={() => setActiveTab("caris")} className={`w-full flex items-center justify-start px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === 'caris' ? 'bg-sky-50 text-sky-700 font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-sky-600 font-medium'}`}>
            <span className="text-xl">👥</span><span className="ml-3 text-sm">Cari Rehberi</span>
          </button>
          <button onClick={() => {setActiveTab("hk"); setSelectedCariId(null);}} className={`w-full flex items-center justify-start px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === 'hk' ? 'bg-purple-50 text-purple-700 font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-purple-600 font-medium'}`}>
            <span className="text-xl">🧹</span><span className="ml-3 text-sm">Kat Hizmetleri (HK)</span>
          </button>
        </nav>

        {/* GÜNLÜK AKIŞ (SOL MENÜ ALTINDA - ÇOK ŞIK) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-50/50">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2 flex justify-between items-center">
            <span>Bugünün Akışı</span> <span className="bg-slate-200 text-slate-600 px-2 rounded-md">{todayStr}</span>
          </h4>
          
          <div className="bg-white border border-emerald-100 rounded-2xl p-3 shadow-sm mb-4 transition-transform hover:-translate-y-1">
            <h5 className="text-xs font-bold text-emerald-600 mb-2 flex justify-between items-center">
              <span>Giriş (Check-In)</span> <span className="bg-emerald-100 text-emerald-700 px-2 rounded-md">{checkInsToday.length}</span>
            </h5>
            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
              {checkInsToday.length === 0 ? <p className="text-[10px] text-slate-400 italic">Giriş yok.</p> : checkInsToday.map(r => (
                <div key={r.id} className="text-[11px] font-bold text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                  <span>{r.roomNo} - <span className="font-medium">{r.guestName.substring(0, 10)}</span></span>
                  <span className={`w-2 h-2 rounded-full ${r.status === 'checked_in' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-rose-100 rounded-2xl p-3 shadow-sm mb-4 transition-transform hover:-translate-y-1">
            <h5 className="text-xs font-bold text-rose-600 mb-2 flex justify-between items-center">
              <span>Çıkış (Check-Out)</span> <span className="bg-rose-100 text-rose-700 px-2 rounded-md">{checkOutsToday.length}</span>
            </h5>
            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
              {checkOutsToday.length === 0 ? <p className="text-[10px] text-slate-400 italic">Çıkış yok.</p> : checkOutsToday.map(r => {
                const { remaining, currency } = getCalc(r);
                return (
                  <div key={r.id} className="text-[11px] font-bold text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center flex-wrap gap-1">
                    <span>{r.roomNo} - <span className="font-medium">{r.guestName.substring(0, 10)}</span></span>
                    {remaining > 0 ? <span className="text-[9px] bg-rose-100 text-rose-600 px-1.5 rounded font-black">{remaining} {currency}</span> : <span className="text-[9px] bg-emerald-100 text-emerald-600 px-1.5 rounded font-black">Ödendi</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-white shrink-0">
          <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all font-bold text-xs uppercase tracking-wider">
            Güvenli Çıkış
          </button>
        </div>
      </aside>

      {/* ANA İÇERİK */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
        
        {/* ÜST HEADER */}
        <header className="h-20 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-8 flex justify-between items-center z-20 shrink-0">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            {activeTab === 'timeline' && 'Oda & Rezervasyon Akışı'}
            {activeTab === 'kasa' && 'Kasa Durumu & Genel Gelir/Gider'}
            {activeTab === 'caris' && (selectedCariId ? 'Cari Hesap Ekstresi' : 'Cari ve Acente Rehberi')}
            {activeTab === 'hk' && 'Günlük Kat Hizmetleri Logları'}
          </h2>
          
          {/* TAKVİM İÇİN İLERİ / GERİ KONTROLLERİ */}
          {activeTab === 'timeline' && (
             <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1.5 shadow-sm">
               <button onClick={() => shiftDate(-7)} className="px-4 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg font-black transition-all text-sm shadow-sm border border-transparent hover:border-slate-200">← 7 Gün</button>
               <button onClick={() => shiftDate(-1)} className="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg font-black transition-all text-sm shadow-sm border border-transparent hover:border-slate-200">←</button>
               <button onClick={() => setViewStartDate(todayStr)} className="text-xs font-black text-indigo-700 bg-white shadow-sm px-6 py-2 rounded-lg transition-all border border-slate-200 uppercase tracking-wider">Bugün</button>
               <button onClick={() => shiftDate(1)} className="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg font-black transition-all text-sm shadow-sm border border-transparent hover:border-slate-200">→</button>
               <button onClick={() => shiftDate(7)} className="px-4 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg font-black transition-all text-sm shadow-sm border border-transparent hover:border-slate-200">7 Gün →</button>
             </div>
          )}
        </header>

        {/* 1. SEKME: TAKVİM (FULL EKRAN 20 ODA SIĞACAK ŞEKİLDE) */}
        {activeTab === "timeline" && (
          <div className="flex-1 overflow-auto relative custom-scrollbar bg-slate-50/50 animate-in fade-in duration-500">
            <table className="w-full text-left border-collapse table-fixed select-none">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="sticky left-0 top-0 bg-white z-30 w-[70px] border-r border-b border-slate-200 text-center shadow-[2px_0_5px_rgba(0,0,0,0.03)]"><span className="text-[10px] font-black tracking-widest text-slate-400">ODA</span></th>
                  {visibleDays.map(dayObj => (
                    <th key={dayObj.dateStr} className={`w-[55px] sticky top-0 bg-white/95 backdrop-blur-md z-20 border-r border-b border-slate-200 text-center py-2 ${dayObj.dateStr === todayStr ? 'bg-indigo-50/80 border-b-2 border-b-indigo-500 shadow-inner' : ''}`}>
                      <div className={`text-sm font-black ${dayObj.dateStr === todayStr ? 'text-indigo-600' : 'text-slate-700'}`}>{dayObj.dayNum}</div>
                      <div className="text-[9px] font-bold uppercase text-slate-400">{dayObj.dayName}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {rooms.map(room => {
                  const roomTodayHk = housekeeping.find(h => h.roomNo === room && h.date === todayStr);
                  const status = roomTodayHk ? roomTodayHk.status : 'Kirli';
                  let dotColor = "bg-rose-400";
                  if (status === 'Temiz') dotColor = "bg-emerald-400";
                  if (status === 'Bakım') dotColor = "bg-sky-400";
                  if (status === 'Arızalı') dotColor = "bg-rose-600 animate-pulse";

                  return (
                    <tr key={room} className="hover:bg-slate-50 group/row transition-colors">
                      <td className="sticky left-0 bg-white group-hover/row:bg-slate-50 z-20 border-r border-b border-slate-200 text-center text-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.02)] h-[36px] font-black text-[11px]">
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
        )}

        {/* 2. SEKME: KASA VE GÜNLÜK RAPORLAR */}
        {activeTab === "kasa" && (
          <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-slate-50 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-7xl mx-auto w-full">
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-transform">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Türk Lirası Kasa</h3>
                <div className={`text-4xl font-black tracking-tight ${kasaBalances.TL.total >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>{kasaBalances.TL.total.toLocaleString()} <span className="text-xl text-slate-400 font-medium">TL</span></div>
              </div>
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-transform">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Dolar Kasa</h3>
                <div className={`text-4xl font-black tracking-tight ${kasaBalances.USD.total >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>{kasaBalances.USD.total.toLocaleString()} <span className="text-xl text-slate-400 font-medium">USD</span></div>
              </div>
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-transform">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Euro Kasa</h3>
                <div className={`text-4xl font-black tracking-tight ${kasaBalances.EUR.total >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>{kasaBalances.EUR.total.toLocaleString()} <span className="text-xl text-slate-400 font-medium">EUR</span></div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-lg shadow-slate-200/50 h-fit">
                <h3 className="text-sm font-black text-indigo-700 mb-5 uppercase tracking-wider">Hızlı Kasa / Gider İşlemi</h3>
                <div className="space-y-4">
                  <div className="flex gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                    <button onClick={() => setKasaType("income")} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${kasaType==='income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>GELİR (+)</button>
                    <button onClick={() => setKasaType("expense")} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${kasaType==='expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>GİDER (-)</button>
                  </div>
                  
                  <select value={kasaCategory} onChange={e=>setKasaCategory(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm text-slate-700 outline-none focus:border-indigo-500 font-medium transition-all shadow-sm">
                    {activities.map(a => <option key={a} value={a}>{a}</option>)}
                    <option value="Market / Mutfak Gideri">Market / Mutfak Gideri</option><option value="Genel Gider">Genel Gider / Diğer</option>
                  </select>

                  <div>
                    <label className="block text-[10px] text-indigo-500 font-bold mb-1 uppercase tracking-wider">Cari Seçimi (Opsiyonel)</label>
                    <select value={kasaSelectedCari} onChange={e=>setKasaSelectedCari(e.target.value)} className="w-full bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 text-sm text-indigo-700 font-bold outline-none focus:border-indigo-500 transition-all">
                      <option value="">-- Bağımsız İşlem (Cari Seçme) --</option>
                      {caris.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" value={kasaAmount} onChange={e=>setKasaAmount(e.target.value)} placeholder="Tutar" className="bg-white border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 outline-none focus:border-indigo-500 shadow-sm" />
                    <select value={kasaCurrency} onChange={e=>setKasaCurrency(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-3.5 text-sm text-slate-700 font-bold outline-none shadow-sm">
                      <option value="TL">TL</option><option value="USD">USD</option><option value="EUR">EUR</option>
                    </select>
                  </div>

                  <select value={kasaMethod} onChange={e=>setKasaMethod(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm text-slate-700 outline-none shadow-sm">
                    <option value="cash">Nakit Kasa</option><option value="cc">Kredi Kartı / POS</option>
                  </select>

                  <input type="text" value={kasaDesc} onChange={e=>setKasaDesc(e.target.value)} placeholder="Açıklama (Örn: Yakıt)" className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 outline-none focus:border-indigo-500 shadow-sm" />
                  
                  <button onClick={handleAddManualTransaction} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all text-sm uppercase tracking-widest mt-2">KASAYA İŞLE</button>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col h-[650px]">
                <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-100 pb-4 mb-4 gap-4 shrink-0">
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Günlük İşlem Raporu</h3>
                  <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    <button onClick={() => setReportFilterDate(yesterdayStr)} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-white hover:shadow-sm transition-all">Dün</button>
                    <button onClick={() => setReportFilterDate(todayStr)} className="px-4 py-2 rounded-lg text-xs font-bold bg-white text-indigo-600 shadow-sm transition-all">Bugün</button>
                    <button onClick={() => setReportFilterDate(tomorrowStr)} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-white hover:shadow-sm transition-all">Yarın</button>
                    <input type="date" value={reportFilterDate} onChange={e => setReportFilterDate(e.target.value)} className="bg-transparent px-2 py-1 text-xs text-slate-700 font-bold outline-none cursor-pointer" />
                  </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0 shadow-sm border-b border-slate-100">
                      <tr><th className="p-4 rounded-tl-xl font-bold">Kategori</th><th className="p-4 font-bold">Açıklama</th><th className="p-4 font-bold">Yöntem</th><th className="p-4 text-right rounded-tr-xl font-bold">Tutar</th></tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.length === 0 ? <tr><td colSpan="4" className="text-center p-8 text-slate-400 italic font-medium">Bu tarihte kayıtlı işlem bulunmuyor.</td></tr> :
                        filteredTransactions.map(tx => (
                          <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                            <td className="p-4 font-bold text-slate-700">{tx.category || 'Genel'}</td>
                            <td className="p-4 text-slate-600 font-medium">{tx.desc}</td>
                            <td className="p-4"><span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-500 uppercase">{tx.method === 'cash' ? 'Nakit' : 'POS'}</span></td>
                            <td className={`p-4 text-right font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>{tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()} {tx.currency || 'TL'}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. SEKME: CARİ HESAPLAR */}
        {activeTab === "caris" && (
          <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-slate-50 animate-in fade-in duration-500">
            {selectedCariId ? (
              <div className="max-w-7xl mx-auto w-full h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
                {(() => {
                  const currentCari = caris.find(c => c.id === selectedCariId);
                  if (!currentCari) return null;
                  const cBals = getCariBalances(currentCari.transactions);
                  return (
                    <div className="bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 p-8 flex flex-col flex-1 overflow-hidden">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-6 mb-6 shrink-0 gap-4">
                        <div>
                          <button onClick={() => setSelectedCariId(null)} className="text-slate-400 hover:text-indigo-600 font-bold text-xs mb-3 flex items-center gap-2 transition-colors">
                            <span className="text-lg">←</span> Listeye Dön
                          </button>
                          <h3 className="text-3xl font-black text-slate-800 tracking-tight">{currentCari.name}</h3>
                          <p className="text-sm text-slate-500 font-medium mt-2 bg-slate-50 inline-block px-3 py-1 rounded-lg border border-slate-100">{currentCari.type} • 📞 {currentCari.phone || 'Tel Yok'}</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-2xl text-center min-w-[110px]">
                            <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">TL Bakiye</span>
                            <span className={`text-xl font-black ${cBals.TL >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>{cBals.TL.toLocaleString()}</span>
                          </div>
                          <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-2xl text-center min-w-[110px]">
                            <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">USD Bakiye</span>
                            <span className={`text-xl font-black ${cBals.USD >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>{cBals.USD.toLocaleString()}</span>
                          </div>
                          <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-2xl text-center min-w-[110px]">
                            <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">EUR Bakiye</span>
                            <span className={`text-xl font-black ${cBals.EUR >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>{cBals.EUR.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">
                        <div className="w-full lg:w-1/3 space-y-5 bg-slate-50 p-6 rounded-3xl border border-slate-100 overflow-y-auto custom-scrollbar h-fit">
                          <h4 className="text-sm font-black text-indigo-700 uppercase tracking-wider mb-2">Cari Manuel İşlem Ekle</h4>
                          <div className="flex gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                            <button onClick={() => setCariTxType("arti")} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${cariTxType==='arti' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>HİZMET ALINDI (+)</button>
                            <button onClick={() => setCariTxType("eksi")} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${cariTxType==='eksi' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>ÖDEME YAPILDI (-)</button>
                          </div>
                          <select value={cariTxCategory} onChange={e=>setCariTxCategory(e.target.value)} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 text-sm text-slate-700 font-medium outline-none focus:border-indigo-500">
                            {activities.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                          <div className="grid grid-cols-2 gap-3">
                            <input type="number" value={cariTxAmount} onChange={e=>setCariTxAmount(e.target.value)} placeholder="Tutar" className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 text-sm text-slate-800 outline-none focus:border-indigo-500" />
                            <select value={cariTxCurrency} onChange={e=>setCariTxCurrency(e.target.value)} className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 text-sm text-slate-700 font-bold outline-none">
                              <option value="TL">TL</option><option value="USD">USD</option><option value="EUR">EUR</option>
                            </select>
                          </div>
                          <input type="text" value={cariTxDesc} onChange={e=>setCariTxDesc(e.target.value)} placeholder="İşlem Detayı" className="w-full bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 text-sm text-slate-800 outline-none focus:border-indigo-500" />
                          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" checked={cariTxPushKasa} onChange={e=>setCariTxPushKasa(e.target.checked)} className="w-5 h-5 accent-indigo-600 rounded" />
                              <span className="text-sm font-bold text-slate-700">Bu işlemi Ana Kasaya da yansıt</span>
                            </label>
                            {cariTxPushKasa && (
                              <select value={cariTxKasaMethod} onChange={e=>setCariTxKasaMethod(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 font-bold outline-none focus:border-indigo-500">
                                <option value="cash">Nakit Kasasına İşle</option><option value="cc">Kredi Kartı / POS'a İşle</option>
                              </select>
                            )}
                          </div>
                          <button onClick={() => handleCariTransaction(currentCari)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all text-sm uppercase">İşlemi Kaydet</button>
                        </div>

                        <div className="w-full lg:w-2/3 flex flex-col h-full overflow-hidden">
                          <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4 shrink-0">Cari Hesap Ekstresi</h4>
                          <div className="flex-1 overflow-auto custom-scrollbar bg-white rounded-3xl border border-slate-100 shadow-inner">
                            <table className="w-full text-left text-sm">
                              <thead className="text-slate-500 bg-slate-50 sticky top-0 shadow-sm">
                                <tr><th className="p-4 font-bold">Tarih</th><th className="p-4 font-bold">Kategori</th><th className="p-4 font-bold">Açıklama</th><th className="p-4 text-right font-bold">Tutar</th></tr>
                              </thead>
                              <tbody>
                                {(currentCari.transactions || []).length === 0 ? <tr><td colSpan="4" className="text-center p-8 text-slate-400 italic font-medium">Hareket bulunmuyor.</td></tr> :
                                  currentCari.transactions.map(tx => (
                                    <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                      <td className="p-4 text-slate-500 font-medium">{tx.date}</td>
                                      <td className="p-4 font-bold text-slate-700">{tx.category || 'Genel'}</td>
                                      <td className="p-4 text-slate-600 font-medium">{tx.desc}</td>
                                      <td className={`p-4 text-right font-black ${tx.type === 'arti' ? 'text-amber-500' : 'text-emerald-500'}`}>{tx.type === 'arti' ? '+ Borç Eklendi' : '- Ödeme Yapıldı'} <br/><span className="text-xs">{tx.amount.toLocaleString()} {tx.currency || 'TL'}</span></td>
                                    </tr>
                                  ))
                                }
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-100 text-right shrink-0">
                        <button onClick={() => handleDeleteCari(currentCari.id)} className="text-rose-500 hover:bg-rose-50 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">Cariyi Sil</button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="max-w-7xl mx-auto w-full animate-in fade-in duration-500">
                <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-xl shadow-slate-200/50 mb-8 flex flex-col lg:flex-row justify-between items-center gap-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight mb-1">Cari Rehberi</h3>
                    <p className="text-sm text-slate-500 font-medium">Yeni ekleyin veya işlem yapmak için seçin.</p>
                  </div>
                  <div className="flex gap-3 w-full lg:w-auto bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <input type="text" value={newCariName} onChange={e=>setNewCariName(e.target.value)} placeholder="Cari Adı (Örn: Yavuz Bey)" className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-indigo-500" />
                    <select value={newCariType} onChange={e=>setNewCariType(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-700 font-bold outline-none focus:border-indigo-500">
                      <option value="Acente / Şahıs">Acente / Şahıs</option><option value="Tedarikçi">Tedarikçi</option><option value="Market / Mutfak">Market / Gider</option>
                    </select>
                    <button onClick={handleAddCari} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-colors text-sm">Ekle</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {caris.length === 0 ? <p className="text-slate-400 italic text-sm col-span-full text-center py-10">Kayıtlı cari yok.</p> :
                    caris.map(cari => {
                      const cBals = getCariBalances(cari.transactions);
                      return (
                        <div key={cari.id} onClick={() => setSelectedCariId(cari.id)} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-lg shadow-slate-200/40 hover:border-indigo-300 hover:shadow-indigo-100 cursor-pointer transition-all transform hover:-translate-y-1 group">
                          <h4 className="text-lg font-black text-slate-800 mb-1 truncate">{cari.name}</h4>
                          <span className="inline-block px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-500 font-bold uppercase mb-5">{cari.type}</span>
                          <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                              <span className="text-slate-500 font-medium">TL Bakiye:</span>
                              <span className={`font-black ${cBals.TL >= 0 ? 'text-slate-700' : 'text-rose-500'}`}>{cBals.TL.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                              <span className="text-slate-500 font-medium">USD Bakiye:</span>
                              <span className={`font-black ${cBals.USD >= 0 ? 'text-slate-700' : 'text-rose-500'}`}>{cBals.USD.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500 font-medium">EUR Bakiye:</span>
                              <span className={`font-black ${cBals.EUR >= 0 ? 'text-slate-700' : 'text-rose-500'}`}>{cBals.EUR.toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="w-full text-center bg-indigo-50 text-indigo-600 py-3 rounded-xl text-xs font-bold uppercase tracking-wider group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            Detay & İşlem Ekle →
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

        {/* 4. SEKME: HOUSEKEEPING */}
        {activeTab === "hk" && (
          <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-slate-50 animate-in fade-in duration-500">
            <div className="max-w-7xl mx-auto w-full">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-200 pb-6 gap-4">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">🧹 Günlük Temizlik Logları</h3>
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                  <button onClick={() => setHkFilterDate(yesterdayStr)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">Dün</button>
                  <button onClick={() => setHkFilterDate(todayStr)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md transition-all">Bugün</button>
                  <button onClick={() => setHkFilterDate(tomorrowStr)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">Yarın</button>
                  <input type="date" value={hkFilterDate} onChange={e => setHkFilterDate(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold outline-none cursor-pointer" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {rooms.map(room => {
                  const roomHk = housekeeping.find(h => h.roomNo === room && h.date === hkFilterDate) || { status: 'Kirli', note: '' };
                  const st = roomHk.status;
                  let badgeColor = "bg-rose-50 text-rose-600 border-rose-200";
                  if (st === 'Temiz') badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  if (st === 'Bakım') badgeColor = "bg-sky-50 text-sky-700 border-sky-200";
                  if (st === 'Arızalı') badgeColor = "bg-rose-100 text-rose-700 border-rose-300 animate-pulse";

                  return (
                    <div key={room} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-lg shadow-slate-200/40 hover:-translate-y-1 transition-transform flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-5 border-b border-slate-50 pb-4">
                        <div>
                          <h4 className="text-2xl font-black text-slate-800 mb-2">Oda {room}</h4>
                          <span className={`inline-block px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border ${badgeColor}`}>
                            {st === 'Temiz' && '✨ Temiz (Girildi)'}
                            {st === 'Kirli' && '🔴 Kirli (Girilmedi)'}
                            {st === 'Bakım' && '🛠️ Bakım Yapıldı'}
                            {st === 'Arızalı' && '🚫 Arızalı (Kapalı)'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <button onClick={() => handleUpdateHK(room, 'Temiz', roomHk.note)} className={`py-2.5 rounded-xl text-[10px] font-bold transition-all ${st === 'Temiz' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>TEMİZLE</button>
                        <button onClick={() => handleUpdateHK(room, 'Kirli', roomHk.note)} className={`py-2.5 rounded-xl text-[10px] font-bold transition-all ${st === 'Kirli' ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>KİRLİ / GİRİLMEDİ</button>
                        <button onClick={() => handleUpdateHK(room, 'Bakım', roomHk.note)} className={`py-2.5 rounded-xl text-[10px] font-bold transition-all ${st === 'Bakım' ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>BAKIM YAPILDI</button>
                        <button onClick={() => handleUpdateHK(room, 'Arızalı', roomHk.note)} className={`py-2.5 rounded-xl text-[10px] font-bold transition-all ${st === 'Arızalı' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>ARIZALI / KAPALI</button>
                      </div>
                      <div className="mt-auto bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center focus-within:border-indigo-300 transition-colors">
                        <span className="text-xs px-2">📝</span>
                        <input type="text" defaultValue={roomHk.note} onBlur={(e) => { if(e.target.value !== roomHk.note) handleUpdateHK(room, st, e.target.value); }} placeholder="HK Notu Ekle..." className="w-full bg-transparent text-xs text-slate-700 font-medium outline-none" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* REZERVASYON MODALI (TAM ENTEGRE - BUTİKSOFT TARZI) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
            <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black text-indigo-700 tracking-tight">Oda #{formData.roomNo} <span className="text-slate-400 font-medium text-lg ml-2">| {formData.guestName || 'Yeni Kayıt'}</span></h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors text-2xl bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm border border-slate-100">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-white flex flex-col md:flex-row gap-8 custom-scrollbar">
              
              {/* SOL TARAF: REZERVASYON BİLGİLERİ */}
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2 mb-4 uppercase tracking-wider">Konaklama Bilgileri</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Misafir Adı</label>
                      <input type="text" value={formData.guestName} onChange={e => setFormData({...formData, guestName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 font-bold outline-none focus:border-indigo-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-indigo-600 font-bold mb-1.5 uppercase">Durum</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 text-sm text-indigo-700 font-bold outline-none focus:border-indigo-500 transition-all">
                        <option value="waiting">🟡 Bekleniyor</option>
                        <option value="checked_in">🟢 İçeride (In-House)</option>
                        <option value="checked_out">🔴 Çıkış Yaptı</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Giriş Tarihi</label>
                      <input type="date" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 font-medium outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Çıkış Tarihi</label>
                      <input type="date" value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 font-medium outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Telefon</label>
                      <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="05..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Özel Not</label>
                      <input type="text" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="Balayı vb." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-black text-indigo-700 border-b border-slate-200 pb-2 mb-4 uppercase tracking-wider">Aktivite / Tur Ekle</h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <select value={tourType} onChange={e=>setTourType(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 font-bold outline-none">
                      {activities.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select value={tourSelectedCari} onChange={e=>setTourSelectedCari(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-indigo-700 font-bold outline-none">
                      <option value="">-- Acente / Cari Seç --</option>
                      {caris.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input type="number" value={tourPrice} onChange={e=>setTourPrice(e.target.value)} placeholder="Tutar" className="w-24 bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-800 font-bold text-center outline-none" />
                    <select value={tourCurrency} onChange={e=>setTourCurrency(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 font-bold outline-none">
                      <option value="TL">TL</option><option value="USD">USD</option><option value="EUR">EUR</option>
                    </select>
                    <button onClick={handleAddTourToRez} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs uppercase shadow-md transition-all">SATIŞA EKLE</button>
                  </div>
                </div>

                <div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Oda Konaklama Ücreti</label>
                      <input type="number" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} className="w-full bg-white border border-slate-200 shadow-inner rounded-xl p-3.5 text-lg font-black text-slate-800 outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Ana Birim</label>
                      <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-white border border-slate-200 shadow-inner rounded-xl p-3.5 text-lg font-black text-indigo-600 outline-none focus:border-indigo-500">
                        <option value="TL">TL</option><option value="USD">USD</option><option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SAĞ TARAF: HESAP & TAHSİLAT & CARİ */}
              <div className="w-full md:w-5/12 bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col shadow-inner">
                <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2 uppercase tracking-wider mb-4">Hesap & Ödemeler</h3>
                
                {(() => {
                  const { totalDebt, totalPaid, remaining } = getCalc(formData);
                  const cur = formData.currency || 'EUR';
                  return (
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 mb-5 shadow-sm space-y-3">
                      <div className="flex justify-between text-sm text-slate-500 font-medium"><span>Toplam (Oda+Tur):</span><span className="font-bold text-slate-800">{totalDebt.toLocaleString()} {cur}</span></div>
                      <div className="flex justify-between text-sm text-slate-500 font-medium"><span>Alınan Ödemeler:</span><span className="font-bold text-emerald-600">{totalPaid.toLocaleString()} {cur}</span></div>
                      <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                        <span className="text-sm font-black text-slate-800 uppercase">Kalan Bakiye:</span>
                        <span className={`text-xl font-black ${remaining > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>{remaining > 0 ? `${remaining.toLocaleString()} ${cur}` : `0 ${cur}`}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex-1 overflow-y-auto space-y-2 mb-5 pr-2 max-h-32 custom-scrollbar">
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase mb-2">Satılan Ekstralar</h4>
                  {formData.debts.map(d => (
                    <div key={d.id} className="flex justify-between items-center bg-white p-3 rounded-xl text-xs border border-slate-100 shadow-sm">
                      <span className="text-slate-700 font-semibold">{d.title}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-800 font-black">{d.amount} {d.currency}</span>
                        <button onClick={()=>handleDeleteDebt(d.id)} className="text-rose-400 hover:text-rose-600 font-black px-1">✕</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-4 mt-auto">
                  <h4 className="text-xs font-black text-emerald-600 uppercase mb-3">Tahsilat Al & Kasa / Cariye İşle</h4>
                  <div className="space-y-3">
                    
                    <div className="grid grid-cols-2 gap-2">
                      <select value={payCategory} onChange={e=>setPayCategory(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 font-bold outline-none">
                        {activities.map(a => <option key={a} value={a}>{a} Tahsilatı</option>)}
                      </select>
                      
                      <select value={payCariId} onChange={e=>setPayCariId(e.target.value)} className="w-full bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[10px] font-black text-indigo-700 outline-none">
                        <option value="">-- Cariye İşleme --</option>
                        {caris.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    {payCariId && (
                       <div className="flex gap-2">
                         <button onClick={() => setPayCariTxType("arti")} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all border ${payCariTxType === 'arti' ? 'bg-indigo-100 text-indigo-700 border-indigo-300 shadow-inner' : 'bg-white text-slate-500 border-slate-200'}`}>Cariye Borç (+) Kaydet</button>
                         <button onClick={() => setPayCariTxType("eksi")} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all border ${payCariTxType === 'eksi' ? 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-inner' : 'bg-white text-slate-500 border-slate-200'}`}>Cariden Tahsil Edildi (-)</button>
                       </div>
                    )}

                    <div className="flex gap-2">
                      <input type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder="Tutar" className="w-1/2 bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-800 font-bold outline-none" />
                      <select value={payCurrency} onChange={e=>setPayCurrency(e.target.value)} className="w-1/4 bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 font-bold outline-none">
                        <option value="TL">TL</option><option value="USD">USD</option><option value="EUR">EUR</option>
                      </select>
                      <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} className="w-1/4 bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 font-medium outline-none">
                        <option value="cash">Nakit</option><option value="cc">POS</option>
                      </select>
                    </div>
                    <input type="text" value={payNote} onChange={e=>setPayNote(e.target.value)} placeholder="Açıklama (Örn: Balon Peşinatı)" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none" />
                    <button onClick={handleReceivePayment} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-md transition-colors text-xs uppercase tracking-widest">ÖDEMEYİ KAYDET</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-between items-center shrink-0">
              {selectedRez ? <button onClick={handleDeleteRez} className="text-rose-600 hover:bg-rose-100 text-xs font-bold px-5 py-3 rounded-xl uppercase transition-colors">Kaydı Sil</button> : <div></div>}
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors">İPTAL</button>
                <button onClick={handleSaveRez} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-10 py-3 rounded-xl shadow-lg shadow-indigo-200 uppercase text-xs tracking-widest transition-all">KAYDET</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {tooltip.visible && tooltip.rez && (
        <div className="fixed z-[99999] pointer-events-none bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-2xl w-56" style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}>
          <div className="text-slate-800 font-black text-sm border-b border-slate-100 pb-2 mb-2">{tooltip.rez.guestName}</div>
          <div className="text-[11px] space-y-1.5 text-slate-600 font-medium">
            <p>Giriş: <strong className="text-slate-800">{tooltip.rez.checkIn}</strong></p>
            <p>Çıkış: <strong className="text-slate-800">{tooltip.rez.checkOut}</strong></p>
            <div className="mt-2 pt-2 border-t border-slate-100">
              <span className={`font-black ${getCalc(tooltip.rez).remaining > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>Bakiye: {getCalc(tooltip.rez).remaining} {getCalc(tooltip.rez).currency}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
