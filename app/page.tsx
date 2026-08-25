// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";

// --- SENİN FIREBASE ŞİFRELERİN ---
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
    const savedLogin = localStorage.getItem("doors_logged_in");
    if (savedLogin === "true") setIsLoggedIn(true);
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
    setUsernameInput("");
    setPasswordInput("");
  };

  const [activeTab, setActiveTab] = useState("timeline"); 
  const [reservations, setReservations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRez, setSelectedRez] = useState(null);
  const [formData, setFormData] = useState({
    roomNo: "", checkIn: "", checkOut: "", guestName: "", note: "", balance: 0, currency: "TL", debts: [], payments: [], status: "waiting"
  });
  
  const [newDebtTitle, setNewDebtTitle] = useState("");
  const [newDebtAmount, setNewDebtAmount] = useState("");
  const [newDebtCurrency, setNewDebtCurrency] = useState("TL");
  
  const [payAmount, setPayAmount] = useState("");
  const [payCurrency, setPayCurrency] = useState("TL");
  const [payMethod, setPayMethod] = useState("cash"); 
  const [payNote, setPayNote] = useState("");

  // Manuel Kasa
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

  const days = Array.from({ length: 425 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 60 + i); 
    const dateStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    const dayNum = d.getDate();
    const dayName = d.toLocaleDateString("tr-TR", { weekday: "short" });
    return { dateStr, dayNum, dayName };
  });

  useEffect(() => {
    if (!isLoggedIn) return;
    const unsubRez = onSnapshot(collection(db, "reservations"), (snapshot) => {
      const rezData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setReservations(rezData);
    });
    const unsubKasa = onSnapshot(collection(db, "transactions"), (snapshot) => {
      const kasaData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setTransactions(kasaData.sort((a,b) => b.id - a.id));
    });

    return () => { unsubRez(); unsubKasa(); };
  }, [isLoggedIn]);

  useEffect(() => {
    if (activeTab === "timeline" && scrollContainerRef.current) {
      setTimeout(() => handleJumpToDate(jumpDate), 100);
    }
  }, [activeTab, isLoggedIn]);

  const handleJumpToDate = (targetDate) => {
    setJumpDate(targetDate);
    if (scrollContainerRef.current) {
      const targetCell = document.getElementById("col-" + targetDate);
      if (targetCell) {
        scrollContainerRef.current.scrollTo({ left: targetCell.offsetLeft - 150, behavior: "smooth" });
      }
    }
  };

  const handleOpenNewModal = (roomNo, dateStr) => {
    const d = new Date(dateStr); d.setDate(d.getDate() + 1);
    const checkOutStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    setFormData({ roomNo, checkIn: dateStr, checkOut: checkOutStr, guestName: "", note: "", balance: 0, currency: "TL", debts: [], payments: [], status: "waiting" });
    setSelectedRez(null); setIsModalOpen(true);
  };

  const handleEditRez = (rez) => {
    setTooltip({ visible: false, x: 0, y: 0, rez: null });
    setFormData({ ...rez, currency: rez.currency || "TL", status: rez.status || "waiting", payments: rez.payments || [] });
    setSelectedRez(rez); setIsModalOpen(true);
  };

  const handleSaveRez = async () => {
    if (!formData.guestName || !formData.checkOut) return alert("Lütfen isim ve çıkış tarihi girin.");
    const rezId = selectedRez ? selectedRez.id : Date.now().toString();
    const payload = { ...formData, id: rezId };
    await setDoc(doc(db, "reservations", rezId), payload);
    setIsModalOpen(false);
  };

  const handleDeleteRez = async () => {
    if (confirm("Bu rezervasyonu silmek istediğinize emin misiniz?")) {
      await deleteDoc(doc(db, "reservations", selectedRez.id.toString()));
      setIsModalOpen(false);
    }
  };

  const handleAddDebt = () => {
    if (!newDebtTitle || !newDebtAmount) return;
    setFormData({ ...formData, debts: [...formData.debts, { id: Date.now().toString(), title: newDebtTitle, amount: parseFloat(newDebtAmount), currency: newDebtCurrency }] });
    setNewDebtTitle(""); setNewDebtAmount("");
  };

  const handleDeleteDebt = (debtId) => {
    setFormData({ ...formData, debts: formData.debts.filter(d => d.id !== debtId) });
  };

  const handleReceivePayment = async () => {
    if (!payAmount) return;
    const amountNum = parseFloat(payAmount);
    const payId = Date.now().toString();
    
    const newPayment = { id: payId, amount: amountNum, currency: payCurrency, method: payMethod, note: payNote, date: todayStr };
    const updatedRez = { ...formData, payments: [...(formData.payments || []), newPayment] };
    
    setFormData(updatedRez);
    await setDoc(doc(db, "reservations", updatedRez.id.toString()), updatedRez);
    
    const newTxId = (Date.now() + 1).toString();
    const newTransaction = {
      id: newTxId, date: todayStr, type: 'income', category: 'Konaklama Tahsilatı', amount: amountNum, currency: payCurrency, method: payMethod,
      desc: `Tahsilat (Oda ${formData.roomNo} - ${formData.guestName}) ${payNote ? '- '+payNote : ''}`
    };
    await setDoc(doc(db, "transactions", newTxId), newTransaction);
    
    setPayAmount(""); setPayNote("");
  };

  const handleAddManualTransaction = async () => {
    if(!kasaAmount || !kasaDesc) return alert("Tutar ve açıklama zorunludur.");
    const newTxId = Date.now().toString();
    const newTx = {
      id: newTxId, date: todayStr, type: kasaType, category: kasaCategory, amount: parseFloat(kasaAmount), currency: kasaCurrency, method: kasaMethod, desc: kasaDesc
    };
    await setDoc(doc(db, "transactions", newTxId), newTx);
    setKasaAmount(""); setKasaDesc("");
  };

  // Para birimi bazlı hesaplama
  const getCalc = (rez) => {
    // Para birimine göre gruplayabiliriz ya da genel toplam
    const totalDebt = (parseFloat(rez.balance) || 0) + (rez.debts || []).reduce((a, b) => a + b.amount, 0);
    const totalPaid = (rez.payments || []).reduce((a, b) => a + b.amount, 0);
    return { totalDebt, totalPaid, remaining: totalDebt - totalPaid, currency: rez.currency || 'TL' };
  };

  // Kasa bakiye özetleri (TL, USD, EUR ayrı ayrı)
  const kasaBalances = transactions.reduce((acc, tx) => {
    const cur = tx.currency || 'TL';
    if (!acc[cur]) acc[cur] = { total: 0, cash: 0, cc: 0 };
    const multiplier = tx.type === 'income' ? 1 : -1;
    acc[cur].total += (tx.amount * multiplier);
    if (tx.method === 'cash') acc[cur].cash += (tx.amount * multiplier);
    if (tx.method === 'cc') acc[cur].cc += (tx.amount * multiplier);
    return acc;
  }, { 
    TL: { total: 0, cash: 0, cc: 0 }, 
    USD: { total: 0, cash: 0, cc: 0 }, 
    EUR: { total: 0, cash: 0, cc: 0 } 
  });

  const getStatusColor = (status) => {
    if (status === 'checked_in') return "from-emerald-500 to-emerald-600 text-slate-950";
    if (status === 'checked_out') return "from-rose-600 to-rose-700 text-white";
    return "from-amber-400 to-amber-500 text-slate-950";
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
        const { remaining, currency } = getCalc(rez);

        cells.push(
          <td key={day} colSpan={span} className="border-r border-b border-slate-700/50 p-[2px] min-w-[45px] relative h-8">
            <div 
              onMouseEnter={(e) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, rez })}
              onMouseMove={(e) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, rez })}
              onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, rez: null })}
              onClick={() => handleEditRez(rez)}
              className={`bg-gradient-to-r ${getStatusColor(rez.status)} text-[11px] font-extrabold px-2 h-full w-full rounded shadow-[0_0_10px_rgba(0,0,0,0.3)] flex items-center cursor-pointer overflow-hidden z-10 hover:brightness-110`}
            >
              <span className="truncate w-full drop-shadow-sm">{rez.guestName}</span>
              {remaining > 0 && <span className="absolute right-1 top-1 w-2 h-2 rounded-full bg-red-600 animate-pulse border border-slate-900"></span>}
            </div>
          </td>
        );
        i += span; 
      } else {
        cells.push(
          <td key={day} onClick={() => handleOpenNewModal(roomNo, day)} className={`border-r border-b border-slate-700/50 h-8 min-w-[45px] cursor-pointer hover:bg-slate-700/30 transition-colors ${day === todayStr ? 'bg-amber-500/5' : ''}`}></td>
        );
        i++;
      }
    }
    return cells;
  };

  const checkInsToday = reservations.filter(r => r.checkIn === todayStr);
  const checkOutsToday = reservations.filter(r => r.checkOut === todayStr);

  // Günlük İşlem Filtresi (Bugünkü Kasa Hareketleri)
  const todayTransactions = transactions.filter(tx => tx.date === todayStr);

  if (!isLoggedIn) {
    return (
      <div className="flex h-screen w-screen bg-[#0B1120] items-center justify-center p-4 font-sans text-slate-100">
        <div className="bg-slate-950 border border-amber-500/30 w-full max-w-md p-8 rounded-2xl shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mb-4 text-3xl shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            🏨
          </div>
          <h1 className="text-xl font-black text-amber-500 tracking-wider mb-1">DOORS OF CAPPADOCIA</h1>
          <p className="text-xs text-slate-400 mb-6 tracking-wide">Yönetim Paneli Güvenli Giriş</p>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Kullanıcı Adı</label>
              <input type="text" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} placeholder="Kullanıcı adınızı girin" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Şifre</label>
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Şifrenizi girin" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 outline-none focus:border-amber-500" />
            </div>
            {loginError && <p className="text-red-400 text-xs text-center font-bold">{loginError}</p>}
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all uppercase tracking-wider text-xs mt-2">GİRİŞ YAP</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#0B1120] text-slate-100 font-sans overflow-hidden">
      
      {/* SOL MENÜ */}
      <aside className="w-16 md:w-56 bg-slate-950 border-r border-amber-500/20 flex flex-col shadow-2xl z-40 transition-all">
        <div className="h-20 flex items-center justify-center md:justify-start md:px-4 border-b border-slate-800 bg-slate-900/30">
          <span className="text-2xl">🏨</span>
          <div className="hidden md:flex flex-col ml-3">
             <span className="font-black text-amber-500 tracking-widest text-xs leading-tight">DOORS OF</span>
             <span className="font-bold text-slate-300 tracking-widest text-[10px] leading-tight">CAPPADOCIA</span>
          </div>
        </div>

        <nav className="flex-1 py-6 space-y-2 px-2 md:px-3">
          <button onClick={() => setActiveTab("timeline")} className={`w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 rounded-xl transition-all ${activeTab === 'timeline' ? 'bg-amber-500 text-slate-900 font-bold shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-amber-500'}`}>
            <span className="text-xl">📅</span><span className="hidden md:block ml-3 text-sm">Takvim (PMS)</span>
          </button>
          <button onClick={() => setActiveTab("kasa")} className={`w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 rounded-xl transition-all ${activeTab === 'kasa' ? 'bg-emerald-500 text-slate-900 font-bold shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-emerald-500'}`}>
            <span className="text-xl">💰</span><span className="hidden md:block ml-3 text-sm">Kasa & Cariler</span>
          </button>
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex items-center justify-center md:justify-start px-2 md:px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all">
            <span className="text-lg">🚪</span><span className="hidden md:block ml-3 text-xs font-bold">Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* ANA İÇERİK ALANI */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-amber-500/20 px-4 flex justify-between items-center z-20 shrink-0">
          <h2 className="text-lg font-bold text-slate-200 hidden md:block">
            {activeTab === 'timeline' ? 'Oda ve Rezervasyon Yönetimi' : 'Detaylı Kasa, Cariler ve Turlar'}
          </h2>
          <h2 className="text-sm font-bold text-amber-500 block md:hidden">DOORS OF CAPPADOCIA</h2>
          {activeTab === 'timeline' && (
             <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/50 rounded-lg p-1.5 shadow-inner">
               <button onClick={() => handleJumpToDate(todayStr)} className="text-[10px] font-bold text-slate-300 hover:text-slate-950 hover:bg-amber-500 px-3 py-1 bg-slate-800 rounded transition-all tracking-wider">BUGÜN</button>
               <input type="date" value={jumpDate} onChange={(e) => handleJumpToDate(e.target.value)} className="bg-transparent text-amber-400 text-xs font-bold outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert" />
             </div>
          )}
        </header>

        {activeTab === "timeline" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-[#0B1120] relative custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed select-none">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="sticky left-0 top-0 bg-slate-950 z-30 w-16 border-r border-b border-amber-500/20 text-center shadow-[4px_0_15px_-3px_rgba(0,0,0,0.5)]"><span className="text-[10px] font-bold tracking-widest text-amber-500">ODA</span></th>
                    {days.map(dayObj => (
                      <th key={dayObj.dateStr} id={"col-" + dayObj.dateStr} className={`w-[45px] sticky top-0 bg-slate-900/95 z-20 border-r border-b border-slate-700/50 text-center py-1 ${dayObj.dateStr === todayStr ? 'bg-amber-500/10 border-b-amber-500' : ''}`}>
                        <div className={`text-[12px] font-bold ${dayObj.dateStr === todayStr ? 'text-amber-500' : 'text-slate-200'}`}>{dayObj.dayNum}</div>
                        <div className="text-[9px] font-medium uppercase">{dayObj.dayName}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(room => (
                    <tr key={room} className="hover:bg-slate-800/30 group/row">
                      <td className="sticky left-0 bg-slate-900 group-hover/row:bg-slate-800 z-20 border-r border-b border-slate-700/50 text-center text-slate-300 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.5)] h-8 font-bold text-xs">{room}</td>
                      {renderRowCells(room)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="shrink-0 h-36 bg-slate-950 border-t border-amber-500/20 p-3 flex gap-4 shadow-[0_-10px_20px_rgba(0,0,0,0.3)] z-20">
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col">
                <h3 className="text-xs font-bold text-emerald-400 border-b border-slate-800 pb-2 mb-2 flex justify-between items-center">
                  <span>BUGÜN GİRİŞLER</span><span className="bg-emerald-500/20 px-2 py-0.5 rounded-full">{checkInsToday.length} Oda</span>
                </h3>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {checkInsToday.length === 0 ? <p className="text-[10px] text-slate-500 italic">Giriş yok.</p> : checkInsToday.map(r => (
                    <div key={r.id} className="flex justify-between items-center text-[11px] bg-slate-800/50 p-1.5 rounded text-slate-200 font-bold">
                      <span>Oda {r.roomNo} - <span className="font-normal">{r.guestName}</span></span>
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase ${r.status === 'checked_in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{r.status === 'checked_in' ? 'Girdi' : 'Bekliyor'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col relative">
                <h3 className="text-xs font-bold text-amber-500 border-b border-slate-800 pb-2 mb-2 flex justify-between items-center">
                  <span>BUGÜN ÇIKIŞLAR</span><span className="bg-amber-500/20 px-2 py-0.5 rounded-full">{checkOutsToday.length} Oda</span>
                </h3>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 mb-2">
                  {checkOutsToday.length === 0 ? <p className="text-[10px] text-slate-500 italic">Çıkış yok.</p> : checkOutsToday.map(r => {
                    const { remaining, currency } = getCalc(r);
                    return (
                      <div key={r.id} className="flex justify-between items-center text-[11px] bg-slate-800/50 p-1.5 rounded">
                        <span className="font-bold text-slate-200">Oda {r.roomNo} - <span className="font-normal">{r.guestName}</span></span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${r.status === 'checked_out' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{r.status === 'checked_out' ? 'Çıktı' : 'Otelde'}</span>
                          <span className={`font-bold ${remaining > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{remaining > 0 ? `${remaining} ${currency} Borç` : 'Ödendi'}</span>
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
          <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto bg-gradient-to-b from-slate-900 to-[#0B1120]">
            
            {/* ÇOKLU PARA BİRİMİ KASA KARTLARI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* TL KASA */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full"></div>
                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Türk Lirası (₺) Kasa</h3>
                <div className={`text-4xl font-black ${kasaBalances.TL.total >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {kasaBalances.TL.total.toLocaleString()} <span className="text-xl">TL</span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/60 flex justify-between text-xs text-slate-400">
                  <span>Nakit: <strong className="text-slate-200">{kasaBalances.TL.cash.toLocaleString()} TL</strong></span>
                  <span>POS: <strong className="text-slate-200">{kasaBalances.TL.cc.toLocaleString()} TL</strong></span>
                </div>
              </div>

              {/* USD KASA */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full"></div>
                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Amerikan Doları ($) Kasa</h3>
                <div className={`text-4xl font-black ${kasaBalances.USD.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {kasaBalances.USD.total.toLocaleString()} <span className="text-xl">USD</span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/60 flex justify-between text-xs text-slate-400">
                  <span>Nakit: <strong className="text-slate-200">{kasaBalances.USD.cash.toLocaleString()} USD</strong></span>
                  <span>POS: <strong className="text-slate-200">{kasaBalances.USD.cc.toLocaleString()} USD</strong></span>
                </div>
              </div>

              {/* EUR KASA */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-bl-full"></div>
                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Euro (€) Kasa</h3>
                <div className={`text-4xl font-black ${kasaBalances.EUR.total >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
                  {kasaBalances.EUR.total.toLocaleString()} <span className="text-xl">EUR</span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/60 flex justify-between text-xs text-slate-400">
                  <span>Nakit: <strong className="text-slate-200">{kasaBalances.EUR.cash.toLocaleString()} EUR</strong></span>
                  <span>POS: <strong className="text-slate-200">{kasaBalances.EUR.cc.toLocaleString()} EUR</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 mb-8">
              {/* MANUEL İŞLEM / CARİ & TUR GİRİŞİ */}
              <div className="w-full lg:w-1/3 bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl h-fit">
                <h3 className="text-lg font-bold text-amber-500 mb-4 border-b border-slate-700 pb-2">Hızlı Kasa / Tur / Cari Girişi</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 uppercase">İşlem Türü</label>
                    <div className="flex gap-2">
                      <button onClick={() => setKasaType("income")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${kasaType==='income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>GELİR (+)</button>
                      <button onClick={() => setKasaType("expense")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${kasaType==='expense' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>GİDER (-)</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 uppercase">Bölüm / Kategori</label>
                    <select value={kasaCategory} onChange={e=>setKasaCategory(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-amber-500 font-bold">
                      <option value="Konaklama">🏨 Konaklama Geliri</option>
                      <option value="Balon Turu">🎈 Balon Turu</option>
                      <option value="ATV Turu"> Quad / ATV Turu</option>
                      <option value="At Turu">🐎 At Turu</option>
                      <option value="Transfer">🚐 Havalimanı Transfer</option>
                      <option value="Yiyecek & İçecek">☕ Bar / F&B</option>
                      <option value="Genel Gider">🧾 Otel Genel Gideri</option>
                      <option value="Diğer">📌 Diğer</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 uppercase">Tutar</label>
                      <input type="number" value={kasaAmount} onChange={e=>setKasaAmount(e.target.value)} placeholder="Örn: 1000" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 uppercase">Birim</label>
                      <select value={kasaCurrency} onChange={e=>setKasaCurrency(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-amber-400 font-bold outline-none focus:border-amber-500">
                        <option value="TL">TL (₺)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 uppercase">Ödeme Yöntemi</label>
                    <select value={kasaMethod} onChange={e=>setKasaMethod(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-amber-500">
                      <option value="cash">Nakit</option>
                      <option value="cc">Kredi Kartı / POS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 uppercase">Açıklama / Detay</label>
                    <input type="text" value={kasaDesc} onChange={e=>setKasaDesc(e.target.value)} placeholder="Örn: Misafir tur ödemesi" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-amber-500" />
                  </div>

                  <button onClick={handleAddManualTransaction} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-3 rounded-lg shadow-lg transition-colors mt-2">KASAYA / CARİYE İŞLE</button>
                </div>
              </div>

              {/* GENEL KASA HAREKETLERİ */}
              <div className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col">
                <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-700 pb-2">Tüm Kasa Hareketleri (Ledger)</h3>
                <div className="flex-1 overflow-auto max-h-[450px] pr-2 custom-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-400 bg-slate-900 sticky top-0 z-10">
                      <tr><th className="p-3 rounded-tl-lg">Tarih</th><th className="p-3">Kategori</th><th className="p-3">Açıklama</th><th className="p-3">Ödeme</th><th className="p-3 text-right rounded-tr-lg">Tutar</th></tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-slate-500 italic">Henüz işlem yok.</td></tr> :
                        transactions.map(tx => (
                          <tr key={tx.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="p-3 text-xs text-slate-400">{tx.date}</td>
                            <td className="p-3 text-xs font-bold text-amber-400">{tx.category || 'Genel'}</td>
                            <td className="p-3 font-medium text-slate-300 text-xs">{tx.desc}</td>
                            <td className="p-3 text-xs"><span className={`px-2 py-0.5 rounded-md bg-slate-900 border ${tx.method === 'cash' ? 'border-amber-500/30 text-amber-400' : 'border-sky-500/30 text-sky-400'}`}>{tx.method === 'cash' ? 'Nakit' : 'POS'}</span></td>
                            <td className={`p-3 text-right font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()} {tx.currency || 'TL'}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* GÜNLÜK İŞLEMLER AYRI BÖLÜM */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl">
              <h3 className="text-lg font-bold text-emerald-400 mb-4 border-b border-slate-700 pb-2 flex justify-between items-center">
                <span>📅 GÜNÜN İŞLEMLERİ (Bugün: {todayStr})</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full">{todayTransactions.length} İşlem Yapıldı</span>
              </h3>
              <div className="overflow-auto max-h-60 custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 bg-slate-900">
                    <tr><th className="p-2">Kategori</th><th className="p-2">Açıklama</th><th className="p-2">Yöntem</th><th className="p-2 text-right">Tutar</th></tr>
                  </thead>
                  <tbody>
                    {todayTransactions.length === 0 ? <tr><td colSpan="4" className="text-center p-3 text-slate-500 italic">Bugün henüz kasaya işlem girilmedi.</td></tr> :
                      todayTransactions.map(tx => (
                        <tr key={tx.id} className="border-b border-slate-700/50">
                          <td className="p-2 font-bold text-amber-400">{tx.category || 'Genel'}</td>
                          <td className="p-2 text-slate-300">{tx.desc}</td>
                          <td className="p-2">{tx.method === 'cash' ? 'Nakit' : 'POS'}</td>
                          <td className={`p-2 text-right font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()} {tx.currency || 'TL'}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* REZERVASYON MODALI (Para birimi ve detay eklenmiş) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-slate-900 border border-amber-500/30 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-black text-amber-500 tracking-wide">ODA #{formData.roomNo} <span className="text-slate-500 font-normal">| {formData.guestName || 'Yeni Kayıt'}</span></h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-amber-500 transition-colors text-xl font-bold">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <h3 className="text-xs font-bold text-emerald-500 border-b border-slate-800 pb-1 uppercase tracking-wider">Konaklama Detayları</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Misafir Adı</label>
                    <input type="text" value={formData.guestName} onChange={e => setFormData({...formData, guestName: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 text-amber-500 font-bold">Durum</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-amber-500 font-bold">
                      <option value="waiting">🟡 Bekliyor</option>
                      <option value="checked_in">🟢 Otelde</option>
                      <option value="checked_out">🔴 Çıkış Yaptı</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Giriş</label>
                    <input type="date" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Çıkış</label>
                    <input type="date" value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Özel Not</label>
                  <input type="text" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-amber-500" />
                </div>

                <div className="pt-2">
                  <h3 className="text-xs font-bold text-amber-500 border-b border-slate-800 pb-1 mb-3 uppercase tracking-wider">Oda Ücreti ve Ekstralar</h3>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-400 mb-1">Oda Konaklama Ücreti</label>
                      <input type="number" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Birim</label>
                      <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-sm text-amber-400 font-bold outline-none">
                        <option value="TL">TL</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 mb-2 max-h-20 overflow-y-auto pr-1">
                    {formData.debts.map(debt => (
                      <div key={debt.id} className="flex justify-between bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/50 text-xs">
                        <span className="text-slate-300">{debt.title}</span>
                        <div><span className="text-amber-400 font-bold mr-2">{debt.amount} {debt.currency || formData.currency}</span><button onClick={()=>handleDeleteDebt(debt.id)} className="text-red-400 font-bold hover:bg-red-500/20 px-1 rounded">X</button></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 bg-slate-950/50 p-1.5 rounded-lg border border-slate-800">
                    <input type="text" value={newDebtTitle} onChange={e=>setNewDebtTitle(e.target.value)} placeholder="Balon, Transfer vb." className="flex-1 bg-transparent p-1 text-xs text-white outline-none" />
                    <input type="number" value={newDebtAmount} onChange={e=>setNewDebtAmount(e.target.value)} placeholder="Tutar" className="w-16 bg-slate-900 border-l border-slate-800 p-1 text-xs text-white text-center outline-none" />
                    <button onClick={handleAddDebt} className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-2 py-1 rounded text-xs font-bold">Ekle</button>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-5/12 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col">
                <h3 className="text-xs font-bold text-sky-400 border-b border-slate-800 pb-1 uppercase tracking-wider mb-3">Hesap & Tahsilat</h3>
                {(() => {
                  const { totalDebt, totalPaid, remaining } = getCalc(formData);
                  const cur = formData.currency || 'TL';
                  return (
                    <div className="bg-slate-900 rounded-lg p-3 border border-slate-800 mb-4 space-y-2">
                      <div className="flex justify-between text-xs text-slate-400"><span>Toplam Borç:</span><span className="font-bold text-slate-200">{totalDebt.toLocaleString()} {cur}</span></div>
                      <div className="flex justify-between text-xs text-slate-400"><span>Alınan Ödeme:</span><span className="font-bold text-emerald-400">{totalPaid.toLocaleString()} {cur}</span></div>
                      <div className="border-t border-slate-700 pt-2 flex justify-between text-sm">
                        <span className="font-bold text-slate-300">Kalan Bakiye:</span>
                        <span className={`font-black ${remaining > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{remaining > 0 ? `${remaining.toLocaleString()} ${cur}` : `0 ${cur}`}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex-1 overflow-y-auto space-y-1.5 mb-4 pr-1">
                  <h4 className="text-[10px] text-slate-500 font-bold uppercase">Geçmiş Tahsilatlar</h4>
                  {(formData.payments || []).length === 0 ? <p className="text-xs text-slate-600 italic">Henüz ödeme alınmadı.</p> : 
                    formData.payments.map(pay => (
                      <div key={pay.id} className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded text-xs flex justify-between items-center">
                        <div><span className="text-emerald-400 font-bold mr-2">+{pay.amount} {pay.currency || formData.currency}</span><span className="text-slate-400 text-[10px]">{pay.method==='cash'?'Nakit':'POS'} {pay.note ? `(${pay.note})`:''}</span></div>
                      </div>
                    ))
                  }
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <h4 className="text-[10px] text-amber-500 font-bold uppercase mb-2">Kasaya Yeni Tahsilat Gir</h4>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder="Tutar" className="w-1/2 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-200 outline-none focus:border-amber-500" />
                      <select value={payCurrency} onChange={e=>setPayCurrency(e.target.value)} className="w-1/4 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-amber-400 font-bold outline-none">
                        <option value="TL">TL</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                      <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} className="w-1/4 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-200 outline-none">
                        <option value="cash">Nakit</option>
                        <option value="cc">POS</option>
                      </select>
                    </div>
                    <input type="text" value={payNote} onChange={e=>setPayNote(e.target.value)} placeholder="Açıklama" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-200 outline-none focus:border-amber-500" />
                    <button onClick={handleReceivePayment} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded shadow-lg transition-colors text-xs uppercase tracking-wider">Tahsilat Al & Kasaya İşle</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-between items-center shrink-0">
              {selectedRez ? <button onClick={handleDeleteRez} className="text-red-500/80 hover:text-red-400 text-xs font-bold px-3 py-2 rounded uppercase">Sil</button> : <div></div>}
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-800">İPTAL</button>
                <button onClick={handleSaveRez} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-2 rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.3)] uppercase text-xs tracking-wider">KAYDET</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {tooltip.visible && tooltip.rez && (
        <div className="fixed z-[99999] pointer-events-none bg-slate-900/95 backdrop-blur-md border border-amber-500/50 rounded-xl p-3 shadow-2xl w-48" style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}>
          <div className="text-amber-400 font-bold text-sm border-b border-slate-700 pb-1">{tooltip.rez.guestName}</div>
          <div className="text-[10px] space-y-1 mt-2 text-slate-300">
            <p><span className="text-slate-500">Giriş:</span> {tooltip.rez.checkIn}</p>
            <p><span className="text-slate-500">Çıkış:</span> {tooltip.rez.checkOut}</p>
            <p className={`font-bold mt-1 pt-1 border-t border-slate-700 ${getCalc(tooltip.rez).remaining > 0 ? 'text-red-400' : 'text-emerald-400'}`}>Bakiye: {getCalc(tooltip.rez).remaining} {getCalc(tooltip.rez).currency}</p>
          </div>
        </div>
      )}
    </div>
  );
}
