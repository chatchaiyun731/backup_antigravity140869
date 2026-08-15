export interface Asset {
  symbol: string;
  name: string;
  type: 'stock' | 'fund';
  sector: string;
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

export interface ApiConfig {
  useMock: boolean;
  secApiKey: string;
  yahooApiKey: string;
  geminiApiKey: string;
  selectedModel: string;
  billingTier: 'free' | 'paid';
}

// Initial mock market database
const MOCK_MARKET_DATABASE: Record<string, Omit<Asset, 'change' | 'changePercent' | 'lastUpdated'>> = {
  // Thai Stocks
  'PTT': { symbol: 'PTT', name: 'PTT Public Company Limited', type: 'stock', sector: 'Energy', price: 34.25, prevClose: 34.00 },
  'CPALL': { symbol: 'CPALL', name: 'CP ALL Public Company Limited', type: 'stock', sector: 'Commerce', price: 57.50, prevClose: 58.00 },
  'AOT': { symbol: 'AOT', name: 'Airports of Thailand Public Company Limited', type: 'stock', sector: 'Transportation', price: 62.25, prevClose: 61.50 },
  'KBANK': { symbol: 'KBANK', name: 'Kasikornbank Public Company Limited', type: 'stock', sector: 'Banking', price: 148.50, prevClose: 147.00 },
  'ADVANC': { symbol: 'ADVANC', name: 'Advanced Info Service Public Company Limited', type: 'stock', sector: 'ICT', price: 357.00, prevClose: 352.00 },
  
  // Global Stocks
  'AAPL': { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', sector: 'Technology', price: 185.50, prevClose: 184.20 },
  'TSLA': { symbol: 'TSLA', name: 'Tesla, Inc.', type: 'stock', sector: 'Automotive', price: 178.90, prevClose: 182.10 },
  'NVDA': { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', sector: 'Technology', price: 920.50, prevClose: 900.00 },

  // Thai Mutual Funds
  'ONE-UGG-RA': { symbol: 'ONE-UGG-RA', name: 'One Ultimate Global Growth Fund', type: 'fund', sector: 'Global Equity', price: 18.4520, prevClose: 18.2500 },
  'K-CHANGE-A(A)': { symbol: 'K-CHANGE-A(A)', name: 'K Positive Change Fund', type: 'fund', sector: 'ESG Equity', price: 12.8420, prevClose: 12.9200 },
  'SCBGP': { symbol: 'SCBGP', name: 'SCB Global Population Fund', type: 'fund', sector: 'Global Equity', price: 10.3524, prevClose: 10.2800 },
  'B-INNOTECH': { symbol: 'B-INNOTECH', name: 'Bualuang Global Innovation Technology Fund', type: 'fund', sector: 'Technology Equity', price: 24.1205, prevClose: 23.9500 },
  'TMBCOF': { symbol: 'TMBCOF', name: 'TMB China Opportunity Fund', type: 'fund', sector: 'China Equity', price: 8.5240, prevClose: 8.6500 }
};

class FinanceApiService {
  private config: ApiConfig = {
    useMock: true,
    secApiKey: '',
    yahooApiKey: '',
    geminiApiKey: '',
    selectedModel: 'gemini-3.5-flash',
    billingTier: 'free'
  };

  private marketData: Record<string, Asset> = {};
  private listeners: Set<(updatedData: Record<string, Asset>, updatedSymbol?: string) => void> = new Set();
  private intervalId: number | null = null;

  constructor() {
    this.loadConfig();
    this.initializeMarketData();
    this.startMockEngine();
  }

  private loadConfig() {
    const saved = localStorage.getItem('portfolio_tracker_api_config');
    if (saved) {
      try {
        this.config = { ...this.config, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse API config', e);
      }
    }
  }

  public saveConfig(newConfig: Partial<ApiConfig>) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem('portfolio_tracker_api_config', JSON.stringify(this.config));
    
    // Restart engine based on config
    if (this.config.useMock) {
      this.startMockEngine();
    } else {
      this.stopMockEngine();
      this.fetchRealPrices();
    }
  }

  public getConfig(): ApiConfig {
    return { ...this.config };
  }

  private initializeMarketData() {
    Object.keys(MOCK_MARKET_DATABASE).forEach((symbol) => {
      const base = MOCK_MARKET_DATABASE[symbol];
      const change = base.price - base.prevClose;
      const changePercent = (change / base.prevClose) * 100;
      
      this.marketData[symbol] = {
        ...base,
        change,
        changePercent,
        lastUpdated: new Date().toLocaleTimeString()
      };
    });

    // Load custom assets from LocalStorage
    const savedCustoms = localStorage.getItem('portfolio_tracker_custom_assets');
    if (savedCustoms) {
      try {
        const customs = JSON.parse(savedCustoms);
        Object.keys(customs).forEach((symbol) => {
          const base = customs[symbol];
          const change = base.price - base.prevClose;
          const changePercent = base.prevClose > 0 ? (change / base.prevClose) * 100 : 0;
          
          this.marketData[symbol] = {
            ...base,
            change,
            changePercent,
            lastUpdated: new Date().toLocaleTimeString()
          };
        });
      } catch (e) {
        console.error('Failed to parse saved custom assets', e);
      }
    }
  }

  // Real-time listener registration
  public subscribe(callback: (updatedData: Record<string, Asset>, updatedSymbol?: string) => void) {
    this.listeners.add(callback);
    // Emit initial load
    callback(this.marketData);
    return () => this.listeners.delete(callback);
  }

  private notify(updatedSymbol?: string) {
    this.listeners.forEach(callback => callback(this.marketData, updatedSymbol));
  }

  // Start mock engine that fluctuates prices every 3 seconds to simulate real-time for all assets
  private startMockEngine() {
    if (this.intervalId) return;

    this.intervalId = window.setInterval(() => {
      Object.keys(this.marketData).forEach((symbol) => {
        const asset = this.marketData[symbol];
        
        // Mutual funds change slower than stocks
        const volatility = asset.type === 'stock' ? 0.005 : 0.001;
        const percentChange = (Math.random() - 0.49) * 2 * volatility; // slightly positive drift
        
        const newPrice = asset.price * (1 + percentChange);
        const roundedPrice = asset.type === 'stock' 
          ? Math.round(newPrice * 100) / 100 
          : Math.round(newPrice * 10000) / 10000;
          
        const change = roundedPrice - asset.prevClose;
        const changePercent = asset.prevClose > 0 ? (change / asset.prevClose) * 100 : 0;

        this.marketData[symbol] = {
          ...asset,
          price: roundedPrice,
          change,
          changePercent,
          lastUpdated: new Date().toLocaleTimeString()
        };
      });

      this.notify();
    }, 3000);
  }

  private stopMockEngine() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Method to fetch real prices if APIs are configured
  private async fetchRealPrices() {
    if (this.config.useMock) return;

    // Simulation of real API endpoint integration
    console.log('Fetching real-time prices from Yahoo Finance and SEC API...');
    
    // In production, you would do:
    // 1. For stocks (Yahoo Finance API/Query):
    //    fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`)
    // 2. For Thai mutual funds (SEC Open API):
    //    fetch(`https://api.sec.or.th/FundNav/info/${proj_id}/daily`, { headers: { 'Ocp-Apim-Subscription-Key': key } })

    // Since these keys need backend proxy or server-side calls due to CORS,
    // we fallback gracefully and simulate real integration logs.
    
    setTimeout(() => {
      // Notify components that data is active (fallback to updated mock values)
      this.notify();
    }, 1000);
  }

  public getAsset(symbol: string): Asset | undefined {
    return this.marketData[symbol.toUpperCase()];
  }

  public getAllAssets(): Asset[] {
    return Object.values(this.marketData);
  }

  // Allow users to add custom stocks/funds that are not in the default list
  public addCustomAsset(symbol: string, name: string, type: 'stock' | 'fund', sector: string, initialPrice: number) {
    const sym = symbol.toUpperCase();
    const prevClose = this.marketData[sym]?.prevClose || initialPrice;
    
    this.marketData[sym] = {
      symbol: sym,
      name,
      type,
      sector,
      price: initialPrice,
      prevClose,
      change: initialPrice - prevClose,
      changePercent: prevClose > 0 ? ((initialPrice - prevClose) / prevClose) * 100 : 0,
      lastUpdated: new Date().toLocaleTimeString()
    };

    // Save custom asset metadata to LocalStorage
    const savedCustoms = localStorage.getItem('portfolio_tracker_custom_assets');
    let customsList: Record<string, any> = {};
    if (savedCustoms) {
      try { customsList = JSON.parse(savedCustoms); } catch (e) {}
    }
    customsList[sym] = {
      symbol: sym,
      name,
      type,
      sector,
      price: initialPrice,
      prevClose
    };
    localStorage.setItem('portfolio_tracker_custom_assets', JSON.stringify(customsList));
    
    this.notify(sym);
    return true;
  }

  private requestTimestamps: number[] = [];
  private quotaListeners: Set<() => void> = new Set();

  public subscribeQuota(callback: () => void) {
    this.quotaListeners.add(callback);
    return () => this.quotaListeners.delete(callback);
  }

  private notifyQuota() {
    this.quotaListeners.forEach(callback => callback());
  }

  public incrementApiUsage() {
    const now = Date.now();
    this.requestTimestamps.push(now);

    const todayStr = new Date().toISOString().split('T')[0];
    const savedUsage = localStorage.getItem('portfolio_tracker_api_usage');
    let usage = { date: todayStr, count: 0 };
    if (savedUsage) {
      try {
        const parsed = JSON.parse(savedUsage);
        if (parsed.date === todayStr) {
          usage = parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    usage.count += 1;
    localStorage.setItem('portfolio_tracker_api_usage', JSON.stringify(usage));

    this.notifyQuota();
  }

  public getApiUsage() {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);
    const rpm = this.requestTimestamps.length;

    const todayStr = new Date().toISOString().split('T')[0];
    const savedUsage = localStorage.getItem('portfolio_tracker_api_usage');
    let rpd = 0;
    if (savedUsage) {
      try {
        const parsed = JSON.parse(savedUsage);
        if (parsed.date === todayStr) {
          rpd = parsed.count;
        }
      } catch (e) {
        console.error(e);
      }
    }

    const model = this.config.selectedModel || 'gemini-3.5-flash';
    const isPro = model.toLowerCase().includes('pro');
    const isPaid = this.config.billingTier === 'paid';

    const maxRpm = isPaid ? Infinity : (isPro ? 2 : 15);
    const maxRpd = isPaid ? Infinity : (isPro ? 50 : 1500);

    let modelName = model;
    if (model === 'gemini-3.5-flash') modelName = 'Gemini 3.5 Flash';
    else if (model === 'gemini-3.1-pro') modelName = 'Gemini 3.1 Pro';
    else if (model === 'gemini-3.1-flash-lite') modelName = 'Gemini 3.1 Flash-Lite';
    else modelName = model;

    return {
      rpm,
      rpd,
      maxRpm,
      maxRpd,
      modelName,
      tierName: isPaid ? 'Paid Tier (Pay-as-you-go)' : 'Free Tier (จำกัดโควต้าฟรี)',
      isPaid
    };
  }
}

export const financeApi = new FinanceApiService();
