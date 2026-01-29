import React, { useState, useEffect } from 'react';
import { TrendingUp, PieChart, Plus, ArrowRightLeft, X, Send, Loader2, Users, User, Edit3, Trash2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { MOCK_MEMBERS } from '../constants';

const ExpenseView: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'JPY' | 'HKD'>('JPY');
  const [payer, setPayer] = useState(MOCK_MEMBERS[0].name);
  const [splitCount, setSplitCount] = useState('1');

  const tripId = 'hokkaido-2024';
  const JPY_TO_HKD = 0.0518;

  const calculateTotalHKD = () => {
    return expenses.reduce((sum, item) => {
      const val = Number(item.amount) || 0;
      return sum + (item.currency === 'HKD' ? val : val * JPY_TO_HKD);
    }, 0);
  };

  const totalHKD = Math.round(calculateTotalHKD());

  const fetchExpenses = async () => {
    if (!supabase || !isSupabaseConfigured) {
      setExpenses([
        { id: 'demo-1', title: '示例：札幌拉麵', amount: 1200, currency: 'JPY', payer: '狸克', date: '5/12', category: '食', splitCount: 4 },
        { id: 'demo-2', title: '示例：機場快線', amount: 150, currency: 'HKD', payer: '西施惠', date: '5/12', category: '運', splitCount: 1 }
      ]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
    if (!error) setExpenses(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
    if (supabase && isSupabaseConfigured) {
      const channel = supabase.channel('expenses-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchExpenses()).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, []);

  const openEdit = (ex: any) => {
    setEditingId(ex.id);
    setTitle(ex.title || '');
    setAmount(ex.amount != null ? ex.amount.toString() : '');
    setCurrency(ex.currency || 'JPY');
    setPayer(ex.payer || MOCK_MEMBERS[0].name);
    setSplitCount(ex.splitCount != null ? ex.splitCount.toString() : '1');
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setAmount('');
    setCurrency('JPY');
    setPayer(MOCK_MEMBERS[0].name);
    setSplitCount('1');
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!title || !amount) return;

    const payload = { 
      title, 
      amount: Number(amount), 
      currency, 
      payer, 
      trip_id: tripId, 
      category: '食',
      splitCount: Number(splitCount) || 1
    };

    if (!supabase || !isSupabaseConfigured) {
      if (editingId) {
        setExpenses(expenses.map(ex => ex.id === editingId ? { ...ex, ...payload } : ex));
      } else {
        setExpenses([{ id: Date.now().toString(), ...payload, date: '今天' }, ...expenses]);
      }
      resetForm();
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expenses').insert([payload]);
        if (error) throw error;
      }
      fetchExpenses();
      resetForm();
    } catch (err: any) {
      alert(`儲存失敗：${err.message}`);
    }
  };

  const handleDelete = async (id: string | null) => {
    if (!id) return;
    if (!confirm('確定要刪除這筆快樂消費嗎？此動作無法復原喔！')) return;

    if (!supabase || !isSupabaseConfigured) {
      // Demo 模式
      setExpenses(expenses.filter(ex => ex.id !== id));
      resetForm();
      return;
    }

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      
      // 刪除成功後更新 UI
      fetchExpenses();
      resetForm();
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(`刪除失敗：${err.message || '請檢查資料庫權限設定'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* 總支出儀表板 */}
      <div className="bg-journey-darkGreen rounded-5xl p-7 text-white shadow-soft relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">旅行快樂總支出</p>
          <h2 className="text-4xl font-black mt-1 tracking-tight">HK$ {totalHKD.toLocaleString()}</h2>
          <div className="grid grid-cols-2 gap-4 mt-6">
             <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md border border-white/20 shadow-inner">
                <p className="text-[9px] font-black text-white/60">目前匯率</p>
                <p className="text-xl font-bold">1 JPY = {JPY_TO_HKD} HKD</p>
             </div>
             <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md border border-white/20 shadow-inner">
                <p className="text-[9px] font-black text-white/60">總筆數</p>
                <p className="text-xl font-bold">{expenses.length} 筆</p>
             </div>
          </div>
        </div>
      </div>

      {/* 新增快樂消費按鈕 */}
      <button onClick={() => setShowForm(true)} className="w-full bg-white rounded-4xl p-5 shadow-soft flex items-center justify-between active:scale-95 transition-all border border-journey-sand/20">
         <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-journey-darkGreen/10 flex items-center justify-center text-journey-darkGreen">
             <Plus size={24} strokeWidth={3} />
           </div>
           <span className="font-black text-journey-brown">新增一筆快樂消費...</span>
         </div>
         <div className="bg-journey-cream px-3 py-1 rounded-full text-[10px] text-journey-brown/40 font-black">
            Happy Trip!
         </div>
      </button>

      {/* 支出列表 */}
      {loading ? ( 
        <div className="flex justify-center py-20 opacity-30"><Loader2 className="animate-spin" /></div> 
      ) : (
        <div className="space-y-4">
          <h4 className="text-xs font-black text-journey-brown/40 uppercase tracking-widest px-2">消費清單</h4>
          {expenses.map((ex) => {
            const splitVal = Number(ex.splitCount) || 1;
            const amountVal = Number(ex.amount) || 0;
            const isJPY = ex.currency === 'JPY';
            const convertedHKD = isJPY ? Math.round(amountVal * JPY_TO_HKD) : amountVal;
            
            return (
              <div 
                key={ex.id} 
                onClick={() => openEdit(ex)}
                className="bg-white rounded-4xl p-5 flex items-center justify-between shadow-soft animate-in fade-in slide-in-from-bottom-2 active:scale-[0.98] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-journey-cream flex items-center justify-center text-journey-brown/20 italic font-black text-xs group-hover:bg-journey-darkGreen/10 group-hover:text-journey-darkGreen transition-colors">
                    {ex.payer ? ex.payer.charAt(0) : '?'}
                  </div>
                  <div>
                    <h5 className="font-black text-journey-brown text-sm">{ex.title}</h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[9px] text-journey-brown/40 font-bold uppercase">{ex.payer} 支付</p>
                      <span className="w-1 h-1 bg-journey-sand rounded-full"></span>
                      <p className="text-[9px] text-journey-darkGreen font-bold">{splitVal} 人分攤</p>
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="font-black text-journey-brown text-base">
                      {isJPY ? '¥' : 'HK$'} {amountVal.toLocaleString()}
                    </p>
                    {isJPY && (
                      <p className="text-[10px] text-journey-brown/30 font-bold">
                        約 HK$ {convertedHKD}
                      </p>
                    )}
                  </div>
                  <div className="text-journey-brown/10 group-hover:text-journey-darkGreen transition-colors">
                    <Edit3 size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 新增/編輯消費彈窗 */}
      {showForm && (
        <div className="fixed inset-0 z-[110] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-t-[3.5rem] sm:rounded-[3.5rem] p-8 shadow-2xl space-y-6 animate-in slide-in-from-bottom-10 duration-500 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-journey-brown">{editingId ? '修改快樂消費' : '紀錄快樂消費'}</h3>
              <div className="flex gap-2">
                {editingId && (
                  <button 
                    onClick={() => handleDelete(editingId)} 
                    className="p-3 bg-journey-red/10 rounded-full text-journey-red hover:bg-journey-red hover:text-white transition-colors"
                    title="刪除紀錄"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button onClick={resetForm} className="p-3 bg-journey-cream rounded-full text-journey-brown/30"><X size={20} /></button>
              </div>
            </div>
            
            <div className="space-y-5">
              {/* 品項 */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-3">消費品項</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="買了什麼開心的東西？" 
                  className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-bold focus:outline-none ring-journey-darkGreen focus:ring-4 transition-all" 
                />
              </div>

              {/* 金額與幣別 */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-3 pr-2">
                   <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest">金額</label>
                   <div className="flex bg-journey-cream p-1 rounded-xl gap-1">
                      <button 
                        onClick={() => setCurrency('JPY')} 
                        className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${currency === 'JPY' ? 'bg-journey-darkGreen text-white shadow-sm' : 'text-journey-brown/30'}`}
                      >JPY</button>
                      <button 
                        onClick={() => setCurrency('HKD')} 
                        className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${currency === 'HKD' ? 'bg-journey-darkGreen text-white shadow-sm' : 'text-journey-brown/30'}`}
                      >HKD</button>
                   </div>
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    inputMode="decimal"
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    placeholder="0" 
                    className="w-full bg-journey-cream rounded-3xl p-5 pr-16 text-journey-brown font-black text-3xl focus:outline-none ring-journey-darkGreen focus:ring-4 transition-all" 
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-journey-brown/20 font-black text-xl">
                    {currency === 'JPY' ? '¥' : '$'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-3">付款人</label>
                  <select 
                    value={payer}
                    onChange={(e) => setPayer(e.target.value)}
                    className="w-full bg-journey-cream rounded-2xl p-4 text-xs font-black text-journey-brown appearance-none focus:outline-none ring-journey-darkGreen focus:ring-2 transition-all"
                  >
                    {MOCK_MEMBERS.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-3">分攤人數</label>
                  <input 
                    type="number" 
                    inputMode="numeric"
                    min="1"
                    value={splitCount} 
                    onChange={(e) => setSplitCount(e.target.value)} 
                    className="w-full bg-journey-cream rounded-2xl p-4 text-xs font-black text-journey-brown focus:outline-none ring-journey-darkGreen focus:ring-2 transition-all" 
                  />
                </div>
              </div>

              {/* 預覽 */}
              {amount && (
                <div className="bg-journey-darkGreen/5 rounded-2xl p-4 border border-dashed border-journey-darkGreen/20 space-y-1 animate-in zoom-in-95">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-journey-darkGreen/60 uppercase">總額 (HKD)</span>
                    <span className="font-black text-journey-darkGreen">
                      $ {Math.round(currency === 'JPY' ? Number(amount) * JPY_TO_HKD : Number(amount)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-journey-darkGreen/60 uppercase">人均 (HKD)</span>
                    <span className="font-black text-journey-darkGreen">
                      $ {Math.round((currency === 'JPY' ? Number(amount) * JPY_TO_HKD : Number(amount)) / (Number(splitCount) || 1)).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleSave} 
              disabled={!title || !amount}
              className="w-full bg-journey-darkGreen text-white font-black py-5 rounded-[2.5rem] shadow-lg active:scale-95 transition-all transform border-b-4 border-black/10 disabled:opacity-30 flex items-center justify-center gap-2"
            >
              <Send size={18} /> {editingId ? '儲存修改內容' : '紀錄這筆快樂'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseView;