import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchMarketData, type MarketData } from "@/lib/marketData";

interface MarketDataContextValue {
  data: MarketData | null;
  loading: boolean;
}

const MarketDataContext = createContext<MarketDataContextValue>({ data: null, loading: true });

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketData()
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <MarketDataContext.Provider value={{ data, loading }}>
      {children}
    </MarketDataContext.Provider>
  );
}

export function useMarketData() {
  return useContext(MarketDataContext);
}
