"use client";
import { useState, useEffect, useRef } from "react";

export default function HotelTimelineVIP() {
  // --- STATELER ---
  const [activeTab, setActiveTab] = useState("timeline"); 

  const [reservations, setReservations] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("doorsofcappadocia_rez");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });

  const [transactions, setTransactions] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("doorsofcappadocia_kasa");
      if (saved) return JSON.parse(saved);
    }
    return []; 
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRez, setSelectedRez] = useState(null);
  const [formData, setFormData] = useState({
    roomNo: "", checkIn: "", checkOut: "", guestName: "", note: "", balance: 0, debts: [], payments: [], status: "waiting"
  });
  
  const [newDebtTitle, setNewDebtTitle] = useState("");
  const [newDebtAmount, setNewDebtAmount] = useState("");
  
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash"); 
  const [payNote, setPayNote] = useState("");

  const [kasaAmount, setKasaAmount] = useState("");
  const [kasaType, setKasaType] = useState("income");
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

  // --- EFFECTLER ---
  useEffect(() => {
    if (activeTab === "timeline" && scrollContainerRef.current) {
      setTimeout(() => handleJumpToDate(jumpDate), 100);
    }
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("doorsofcappadocia_rez", JSON.stringify(reservations));
    localStorage.setItem("doorsofcappadocia_kasa", JSON.stringify(transactions));
  }, [reservations, transactions]);

  const handleJumpToDate = (targetDate) => {
    setJumpDate(targetDate);
    if (scrollContainerRef.current) {
      const targetCell = document.getElementById("col-" + targetDate);
      if (targetCell) {
        scrollContainerRef.current.scrollTo({ left: targetCell.offsetLeft - 150, behavior: "smooth" });
      }
    }
  };

  // --- REZERVASYON İŞLEMLERİ ---
  const handleOpenNewModal = (roomNo, dateStr) => {
    const d = new Date(dateStr); d.setDate(d.getDate() + 1);
    const checkOutStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    setFormData({ roomNo, checkIn: dateStr, checkOut: checkOutStr, guestName: "", note: "", balance: 0, debts: [], payments: [], status: "waiting" });
    setSelectedRez(null); setIsModalOpen(true);
  };

  const handleEditRez = (rez) => {
    setTooltip({ visible: false, x: 0, y: 0, rez: null });
    setFormData({ ...rez, status: rez.status || "waiting", payments: rez.payments || [] });
    setSelectedRez(rez); setIsModalOpen(true);
  };

  const handleSaveRez = () => {
    if (!formData.guestName || !formData.checkOut) return alert("Lütfen isim ve çıkış tarihi girin.");
    if (selectedRez) {
      setReservations(reservations.map(r => r.id === selectedRez.id ? { ...formData, id: selectedRez.id } : r));
    } else {
      setReservations([...reservations, { ...formData, id: Date.now() }]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteRez = () => {
    if (confirm("Bu rezervasyonu silmek istediğinize emin misiniz?")) {
      setReservations(reservations.filter(r => r.id !== selectedRez.id));
      setIsModalOpen(false);
    }
  };

  // --- BORÇ VE TAHSİLAT (ÖDEME) İŞLEMLERİ ---
  const handleAddDebt = () => {
    if (!newDebtTitle || !newDebtAmount) return;
    setFormData({ ...formData, debts: [...formData.debts, { id: Date.now(), title: newDebtTitle, amount: parseFloat(newDebtAmount) }] });
    setNewDebtTitle(""); setNewDebtAmount("");
  };

  const handleDeleteDebt = (debtId) => {
    setFormData({ ...formData, debts: formData.debts.filter(d => d.id !== debtId) });
  };

  const handleReceivePayment = () => {
    if (!payAmount) return;
    const amountNum = parseFloat(payAmount);
    
    const newPayment = { id: Date.now(), amount: amountNum, method: payMethod, note: payNote, date: todayStr };
    setFormData({ ...formData, payments: [...(formData.payments || []), newPayment] });
    
    const newTransaction = {
      id: Date.now(), date: todayStr, type: 'income', amount: amountNum, method: payMethod,
      desc: `Tahsilat (Oda ${formData.roomNo} - ${formData.guestName}) ${payNote ? '- '+payNote : ''}`
    };
    setTransactions([...transactions, newTransaction]);
    
    setPayAmount(""); setPayNote("");
  };

  // --- KASA (MANUEL) İŞLEMLERİ ---
  const handleAddManualTransaction = () => {
    if(!kasaAmount || !kasaDesc) return alert("Tutar ve açıklama zorunludur.");
    const newTx = {
      id: Date.now(), date: todayStr, type: kasaType, amount: parseFloat(kasaAmount), method: kasaMethod, desc: kasaDesc
    };
    setTransactions([newTx, ...transactions]);
    setKasaAmount(""); setKasaDesc("");
  };

  const getCalc = (rez) => {
    const totalDebt = (parseFloat(rez.balance) || 0) + (rez.debts || []).reduce((a, b) => a + b.amount, 0);
    const totalPaid = (rez.payments || []).reduce((a, b) => a + b.amount, 0);
    return { totalDebt, totalPaid, remaining: totalDebt - totalPaid };
  };

  const kasaTotals = transactions.reduce((acc, tx) => {
    const multiplier = tx.type === 'income' ? 1 : -1;
    acc.total += (tx.amount * multiplier);
    if (tx.method === 'cash') acc.cash += (tx.amount * multiplier);
    if (tx.method === 'cc') acc.cc += (tx.amount * multiplier);
    return acc;
  }, { total: 0, cash: 0, cc: 0 });

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
        const { remaining } = getCalc(rez);

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
  const totalExpectedCollection = checkOutsToday.reduce((tot, r) => tot + getCalc(r).remaining, 0);

  return (
    <div className="flex h-screen w-screen bg-[#0B1120] text-slate-100 font-sans overflow-hidden">
      
      {/* SOL MENÜ (SIDEBAR) - LOGOLU */}
      <aside className="w-16 md:w-56 bg-slate-950 border-r border-amber-500/20 flex flex-col shadow-2xl z-40 transition-all">
        {/* LOGO BÖLÜMÜ */}
        <div className="h-20 flex items-center justify-center md:justify-start md:px-4 border-b border-slate-800 bg-slate-900/30">
          {/* Projedeki public klasöründeki logo.png dosyasını çeker */}
          <img src="/logo.png" alt="Doors of Cappadocia Logo" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          
          <div className="hidden md:flex flex-col ml-3">
             <span className="font-black text-amber-500 tracking-widest text-xs leading-tight">DOORS OF</span>
             <span className="font-bold text-slate-300 tracking-widest text-[10px] leading-tight">CAPPADOCIA</span>
          </div>
        </div>

        <nav className="flex-1 py-6 space-y-2 px-2 md:px-3">
          <button onClick={() => setActiveTab("timeline")} className={`w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 rounded-xl transition-all ${activeTab === 'timeline' ? 'bg-amber-500 text-slate-900 font-bold shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-amber-500'}`}>
            <span className="text-xl">📅</span>
            <span className="hidden md:block ml-3 text-sm">Takvim (PMS)</span>
          </button>
          <button onClick={() => setActiveTab("kasa")} className={`w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 rounded-xl transition-all ${activeTab === 'kasa' ? 'bg-emerald-500 text-slate-900 font-bold shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-emerald-500'}`}>
            <span className="text-xl">💰</span>
            <span className="hidden md:block ml-3 text-sm">Kasa & Muhasebe</span>
          </button>
        </nav>
      </aside>

      {/* ANA İÇERİK ALANI */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* HEADER */}
        <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-amber-500/20 px-4 flex justify-between items-center z-20 shrink-0">
          <h2 className="text-lg font-bold text-slate-200 hidden md:block">
            {activeTab === 'timeline' ? 'Oda ve Rezervasyon Yönetimi' : 'Otel Kasa ve Finans Yönetimi'}
          </h2>
          <h2 className="text-sm font-bold text-amber-500 block md:hidden">DOORS OF CAPPADOCIA</h2>
          
          {activeTab === 'timeline' && (
             <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/50 rounded-lg p-1.5 shadow-inner">
               <button onClick={() => handleJumpToDate(todayStr)} className="text-[10px] font-bold text-slate-300 hover:text-slate-950 hover:bg-amber-500 px-3 py-1 bg-slate-800 rounded transition-all tracking-wider">BUGÜN</button>
               <input type="date" value={jumpDate} onChange={(e) => handleJumpToDate(e.target.value)} className="bg-transparent text-amber-400 text-xs font-bold outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert" />
             </div>
          )}
        </header>

        {/* EKRAN 1: TAKVİM (GANTT) */}
        {activeTab === "timeline" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-[#0B1120] relative custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed select-none">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="sticky left-0 top-0 bg-slate-950 z-30 w-16 border-r border-b border-amber-500/20 text-center shadow-[4px_0_15px_-3px_rgba(0,0,0,0.5)]">
                      <span className="text-[10px] font-bold tracking-widest text-amber-500">ODA</span>
                    </th>
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

            {/* TAKVİM ALT PANELİ */}
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
                  <span>BUGÜN ÇIKIŞLAR & BAKİYELER</span><span className="bg-amber-500/20 px-2 py-0.5 rounded-full">{checkOutsToday.length} Oda</span>
                </h3>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 mb-6">
                  {checkOutsToday.length === 0 ? <p className="text-[10px] text-slate-500 italic">Çıkış yok.</p> : checkOutsToday.map(r => {
                    const { remaining } = getCalc(r);
                    return (
                      <div key={r.id} className="flex justify-between items-center text-[11px] bg-slate-800/50 p-1.5 rounded">
                        <span className="font-bold text-slate-200">Oda {r.roomNo} - <span className="font-normal">{r.guestName}</span></span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${r.status === 'checked_out' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{r.status === 'checked_out' ? 'Çıktı' : 'Otelde'}</span>
                          <span className={`font-bold ${remaining > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{remaining > 0 ? `${remaining} TL Borç` : 'Ödendi'}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 p-1.5 flex justify-between items-center px-4 rounded-b-lg">
                  <span className="text-[10px] text-slate-400 font-bold tracking-widest">TOPLAM BEKLENEN TAHSİLAT:</span>
                  <span className="text-sm font-black text-amber-400">{totalExpectedCollection.toLocaleString()} TL</span>
                </div>
              </div>
            </footer>
          </div>
        )}

        {/* EKRAN 2: KASA YÖNETİMİ */}
        {activeTab === "kasa" && (
          <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto bg-gradient-to-b from-slate-900 to-[#0B1120]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full"></div>
                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Toplam Kasa Bakiyesi</h3>
                <div className={`text-4xl font-black ${kasaTotals.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{kasaTotals.total.toLocaleString()} <span className="text-xl">TL</span></div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-lg">
                 <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Nakit Kasa</h3>
                 <div className="text-3xl font-bold text-amber-400">{kasaTotals.cash.toLocaleString()} <span className="text-lg">TL</span></div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-lg">
                 <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Kredi Kartı / POS</h3>
                 <div className="text-3xl font-bold text-sky-400">{kasaTotals.cc.toLocaleString()} <span className="text-lg">TL</span></div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-1/3 bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl h-fit">
                <h3 className="text-lg font-bold text-amber-500 mb-4 border-b border-slate-700 pb-2">Manuel Kasa İşlemi</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 uppercase">İşlem Türü</label>
                    <div className="flex gap-2">
                      <button onClick={() => setKasaType("income")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${kasaType==='income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>GELİR (+)</button>
                      <button onClick={() => setKasaType("expense")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${kasaType==='expense' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>GİDER (-)</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 uppercase">Ödeme Yöntemi</label>
                    <select value={kasaMethod} onChange={e=>setKasaMethod(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-amber-500">
                      <option value="cash">Nakit</option>
                      <option value="cc">Kredi Kartı</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 uppercase">Tutar (TL)</label>
                    <input type="number" value={kasaAmount} onChange={e=>setKasaAmount(e.target.value)} placeholder="Örn: 500" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 uppercase">Açıklama</label>
                    <input type="text" value={kasaDesc} onChange={e=>setKasaDesc(e.target.value)} placeholder="Örn: Market Su Alışverişi" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-amber-500" />
                  </div>
                  <button onClick={handleAddManualTransaction} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-3 rounded-lg shadow-lg transition-colors mt-2">KASAYA İŞLE</button>
                </div>
              </div>

              <div className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col">
                <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-700 pb-2">Kasa Hareketleri (Ledger)</h3>
                <div className="flex-1 overflow-auto max-h-[500px] pr-2 custom-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-400 bg-slate-900 sticky top-0 z-10">
                      <tr>
                        <th className="p-3 rounded-tl-lg">Tarih</th>
                        <th className="p-3">Açıklama</th>
                        <th className="p-3">Yöntem</th>
                        <th className="p-3 text-right rounded-tr-lg">Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 ? <tr><td colSpan="4" className="text-center p-4 text-slate-500 italic">Henüz işlem yok.</td></tr> :
                        transactions.map(tx => (
                          <tr key={tx.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="p-3 text-xs text-slate-400">{tx.date}</td>
                            <td className="p-3 font-medium text-slate-300">{tx.desc}</td>
                            <td className="p-3 text-xs"><span className={`px-2 py-1 rounded-md bg-slate-900 border ${tx.method === 'cash' ? 'border-amber-500/30 text-amber-400' : 'border-sky-500/30 text-sky-400'}`}>{tx.method === 'cash' ? 'Nakit' : 'K.Kartı'}</span></td>
                            <td className={`p-3 text-right font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()} TL
                            </td>
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

      </div>

      {/* REZERVASYON MODALI (TAHSİLAT EKLENTİLİ) */}
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
                  <h3 className="text-xs font-bold text-amber-500 border-b border-slate-800 pb-1 mb-3 uppercase tracking-wider">Borç / Ekstra Satış Ekle</h3>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Oda Konaklama Ücreti (TL)</label>
                    <input type="number" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-amber-500 mb-3" />
                  </div>
                  <div className="space-y-2 mb-2 max-h-20 overflow-y-auto pr-1">
                    {formData.debts.map(debt => (
                      <div key={debt.id} className="flex justify-between bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/50 text-xs">
                        <span className="text-slate-300">{debt.title}</span>
                        <div><span className="text-amber-400 font-bold mr-2">{debt.amount} TL</span><button onClick={()=>handleDeleteDebt(debt.id)} className="text-red-400 font-bold hover:bg-red-500/20 px-1 rounded">X</button></div>
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
                  return (
                    <div className="bg-slate-900 rounded-lg p-3 border border-slate-800 mb-4 space-y-2">
                      <div className="flex justify-between text-xs text-slate-400"><span>Toplam Borç:</span><span className="font-bold text-slate-200">{totalDebt.toLocaleString()} TL</span></div>
                      <div className="flex justify-between text-xs text-slate-400"><span>Alınan Ödeme:</span><span className="font-bold text-emerald-400">{totalPaid.toLocaleString()} TL</span></div>
                      <div className="border-t border-slate-700 pt-2 flex justify-between text-sm">
                        <span className="font-bold text-slate-300">Kalan Bakiye:</span>
                        <span className={`font-black ${remaining > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{remaining > 0 ? remaining.toLocaleString() : 0} TL</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex-1 overflow-y-auto space-y-1.5 mb-4 pr-1">
                  <h4 className="text-[10px] text-slate-500 font-bold uppercase">Geçmiş Tahsilatlar</h4>
                  {(formData.payments || []).length === 0 ? <p className="text-xs text-slate-600 italic">Henüz ödeme alınmadı.</p> : 
                    formData.payments.map(pay => (
                      <div key={pay.id} className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded text-xs flex justify-between items-center">
                        <div>
                          <span className="text-emerald-400 font-bold mr-2">+{pay.amount} TL</span>
                          <span className="text-slate-400 text-[10px]">{pay.method==='cash'?'Nakit':'POS'} {pay.note ? `(${pay.note})`:''}</span>
                        </div>
                      </div>
                    ))
                  }
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <h4 className="text-[10px] text-amber-500 font-bold uppercase mb-2">Kasaya Yeni Tahsilat Gir</h4>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder="Tutar (TL)" className="w-1/2 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-200 outline-none focus:border-amber-500" />
                      <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} className="w-1/2 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-200 outline-none focus:border-amber-500">
                        <option value="cash">Nakit</option><option value="cc">Kredi Kartı</option>
                      </select>
                    </div>
                    <input type="text" value={payNote} onChange={e=>setPayNote(e.target.value)} placeholder="Açıklama (Örn: Balon ödemesi)" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-200 outline-none focus:border-amber-500" />
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
      
      {/* TOOLTIP */}
      {tooltip.visible && tooltip.rez && (
        <div className="fixed z-[99999] pointer-events-none bg-slate-900/95 backdrop-blur-md border border-amber-500/50 rounded-xl p-3 shadow-2xl w-48" style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}>
          <div className="text-amber-400 font-bold text-sm border-b border-slate-700 pb-1">{tooltip.rez.guestName}</div>
          <div className="text-[10px] space-y-1 mt-2 text-slate-300">
            <p><span className="text-slate-500">Giriş:</span> {tooltip.rez.checkIn}</p>
            <p><span className="text-slate-500">Çıkış:</span> {tooltip.rez.checkOut}</p>
            <p className={`font-bold mt-1 pt-1 border-t border-slate-700 ${getCalc(tooltip.rez).remaining > 0 ? 'text-red-400' : 'text-emerald-400'}`}>Bakiye: {getCalc(tooltip.rez).remaining} TL</p>
          </div>
        </div>
      )}
    </div>
  );
}