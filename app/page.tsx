            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Toplu Vana &amp; Kollektör İşlemleri</h2>
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
                <h2 className="text-base font-bold text-white">Genel Hareket Kayıtları</h2>
                <p className="text-xs text-slate-400">Tarih, saat ve cihaz bilgisiyle tüm işlemler</p>
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
                        {item.dateLabel} • <strong className="text-slate-200">{item.time}</strong> ({item.device})
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
                  showToast('Genel hareket kayıtları temizlendi');
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium"
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
        <div className="fixed bottom-4 right-4 z-50 bg-slate-800 border border-amber-500/40 text-slate-100 px-3.5 py-2 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span>{toastText}</span>
        </div>
