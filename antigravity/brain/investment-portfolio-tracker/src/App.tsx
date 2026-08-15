import { useState, useEffect } from 'react';
import { Plus, BarChart3, ListFilter, Cpu, Settings, Sparkles, MessageSquare } from 'lucide-react';
import { financeApi } from './services/financeApi';
import type { Asset } from './services/financeApi';
import { aiService } from './services/aiService';
import type { Holding, PortfolioAnalysis } from './services/aiService';
import { Dashboard } from './components/Dashboard';
import { HoldingsList } from './components/HoldingsList';
import { AiAdvisor } from './components/AiAdvisor';
import { AiChat } from './components/AiChat';
import { ApiSettings } from './components/ApiSettings';
import { TransactionModal } from './components/TransactionModal';
import './App.css';

// Default initial holdings for demonstration and beautiful out-of-the-box UI
const DEFAULT_HOLDINGS: Holding[] = [
  { id: '1', symbol: 'CPALL', quantity: 300, avgCost: 55.20, purchaseDate: '2026-01-15', holdingType: 'reference' },
  { id: '2', symbol: 'SCBGP', quantity: 2500, avgCost: 9.85, purchaseDate: '2026-02-10', holdingType: 'reference' },
  { id: '3', symbol: 'AAPL', quantity: 15, avgCost: 175.50, purchaseDate: '2026-03-01', holdingType: 'reference' },
  { id: '4', symbol: 'B-INNOTECH', quantity: 800, avgCost: 22.10, purchaseDate: '2026-04-05', holdingType: 'reference' }
];

function App() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [portfolioScope, setPortfolioScope] = useState<'all' | 'real'>('all');
  const [currentPrices, setCurrentPrices] = useState<Record<string, Asset>>({});
  const [updatedSymbol, setUpdatedSymbol] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'holdings' | 'ai' | 'chat' | 'settings'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);

  const activeHoldings = portfolioScope === 'real'
    ? holdings.filter(h => (h.holdingType || 'real') === 'real')
    : holdings;

  const [analysis, setAnalysis] = useState<PortfolioAnalysis>({
    totalValue: 0,
    totalCost: 0,
    totalGainLoss: 0,
    totalGainLossPercent: 0,
    riskScore: 50,
    riskLevel: 'ปานกลาง',
    diversificationScore: 0,
    sectorAllocations: [],
    assetAllocations: [],
    warnings: [],
    suggestions: []
  });

  const [realAnalysis, setRealAnalysis] = useState<PortfolioAnalysis>({
    totalValue: 0,
    totalCost: 0,
    totalGainLoss: 0,
    totalGainLossPercent: 0,
    riskScore: 50,
    riskLevel: 'ปานกลาง',
    diversificationScore: 0,
    sectorAllocations: [],
    assetAllocations: [],
    warnings: [],
    suggestions: []
  });

  // Load holdings from LocalStorage or use defaults
  useEffect(() => {
    const saved = localStorage.getItem('portfolio_tracker_holdings');
    if (saved) {
      try {
        setHoldings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved holdings', e);
        setHoldings(DEFAULT_HOLDINGS);
      }
    } else {
      setHoldings(DEFAULT_HOLDINGS);
      localStorage.setItem('portfolio_tracker_holdings', JSON.stringify(DEFAULT_HOLDINGS));
    }
  }, []);

  // Subscribe to finance API real-time price updates
  useEffect(() => {
    const unsubscribe = financeApi.subscribe((latestMarketData, updatedSym) => {
      setCurrentPrices({ ...latestMarketData });
      if (updatedSym) {
        setUpdatedSymbol(updatedSym);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Re-calculate analysis whenever holdings or currentPrices update
  useEffect(() => {
    const result = aiService.analyzePortfolio(activeHoldings, currentPrices);
    setAnalysis(result);

    const realHoldings = holdings.filter(h => (h.holdingType || 'real') === 'real');
    const rResult = aiService.analyzePortfolio(realHoldings, currentPrices);
    setRealAnalysis(rResult);
  }, [holdings, currentPrices, portfolioScope]);

  const saveHoldings = (newHoldings: Holding[]) => {
    setHoldings(newHoldings);
    localStorage.setItem('portfolio_tracker_holdings', JSON.stringify(newHoldings));
  };

  const handleSaveTransaction = (transaction: Holding) => {
    const index = holdings.findIndex(h => h.id === transaction.id);
    if (index > -1) {
      // Edit
      const updated = [...holdings];
      updated[index] = transaction;
      saveHoldings(updated);
    } else {
      // Add
      saveHoldings([...holdings, transaction]);
    }
    setEditingHolding(null);
  };

  const handleEditHolding = (holding: Holding) => {
    setEditingHolding(holding);
    setIsModalOpen(true);
  };

  const handleDeleteHolding = (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบรายการซื้อขายนี้ออกจากพอร์ตโฟลิโอ?')) {
      const filtered = holdings.filter(h => h.id !== id);
      saveHoldings(filtered);
    }
  };

  const handleAddPreset = (symbol: string) => {
    // Check if symbol exists, auto fill price, add default amount
    const asset = financeApi.getAsset(symbol);
    if (!asset) return;

    const newHolding: Holding = {
      id: Math.random().toString(36).substr(2, 9),
      symbol: asset.symbol,
      quantity: asset.type === 'stock' ? 50 : 1000,
      avgCost: asset.price,
      purchaseDate: new Date().toISOString().split('T')[0]
    };

    saveHoldings([...holdings, newHolding]);
    setActiveTab('holdings');
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header glass">
        <div className="header-title">
          <div style={{ background: 'var(--accent-primary-glow)', padding: '0.6rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={24} color="var(--accent-primary)" />
          </div>
          <div>
            <h1>SmartInvest AI</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              ระบบวิเคราะห์พอร์ต หุ้น & กองทุนรวม ด้วยปัญญาประดิษฐ์
            </p>
          </div>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ขอบเขตพอร์ต:</span>
            <select 
              value={portfolioScope} 
              onChange={(e) => setPortfolioScope(e.target.value as 'all' | 'real')}
              className="form-control"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', height: 'auto', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-primary)', width: 'auto' }}
            >
              <option value="all">สินทรัพย์ทั้งหมด (จริง + จำลอง)</option>
              <option value="real">เฉพาะที่ลงทุนจริงเท่านั้น</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', boxShadow: '0 0 6px var(--accent-green)' }} />
            <span>เรียลไทม์ (จำลอง)</span>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditingHolding(null); setIsModalOpen(true); }}>
            <Plus size={16} /> เพิ่มรายการซื้อขาย
          </button>
        </div>
      </header>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        <button 
          className={`tab-btn glass ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
        >
          <BarChart3 size={16} /> ภาพรวมพอร์ต (Dashboard)
        </button>
        <button 
          className={`tab-btn glass ${activeTab === 'holdings' ? 'active' : ''}`}
          onClick={() => setActiveTab('holdings')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
        >
          <ListFilter size={16} /> สินทรัพย์ในพอร์ต ({holdings.length})
        </button>
        <button 
          className={`tab-btn glass ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
        >
          <Cpu size={16} /> AI แนะนำ & ตรวจสุขภาพพอร์ต
        </button>
        <button 
          className={`tab-btn glass ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
        >
          <MessageSquare size={16} /> แชทโต้ตอบ AI (Real-time Chat)
        </button>
        <button 
          className={`tab-btn glass ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
        >
          <Settings size={16} /> ตั้งค่าการเชื่อมต่อ API
        </button>
      </div>

      {/* Content Area */}
      <main style={{ minHeight: '400px' }}>
        {activeTab === 'dashboard' && (
          <Dashboard 
            analysis={analysis} 
            holdings={holdings}
            currentPrices={currentPrices}
          />
        )}
        
        {activeTab === 'holdings' && (
          <HoldingsList 
            holdings={activeHoldings}
            currentPrices={currentPrices}
            updatedSymbol={updatedSymbol}
            onEdit={handleEditHolding}
            onDelete={handleDeleteHolding}
          />
        )}
        
        {activeTab === 'ai' && (
          <AiAdvisor 
            analysis={realAnalysis} 
            holdings={holdings.filter(h => (h.holdingType || 'real') === 'real')}
            onAddPreset={handleAddPreset}
          />
        )}
        
        {activeTab === 'chat' && (
          <AiChat 
            analysis={realAnalysis}
            holdings={holdings.filter(h => (h.holdingType || 'real') === 'real')}
            setActiveTab={setActiveTab}
          />
        )}
        
        {activeTab === 'settings' && (
          <ApiSettings />
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>SmartInvest AI Portfolio Tracker • ดีไซน์พรีเมียมด้วย Vanilla CSS & React</span>
        <span>ระบบวิเคราะห์ประเมินตามโมเดลบริหารสินทรัพย์ส่วนบุคคล</span>
      </footer>

      {/* Transaction Form Modal */}
      <TransactionModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingHolding(null); }}
        onSave={handleSaveTransaction}
        editingHolding={editingHolding}
      />
    </div>
  );
}

export default App;
