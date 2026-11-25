import { createHash, createHmac } from 'crypto';
import type {
  AssetKind,
  FoundryTokenArtifact,
  FoundryTokenDetail,
  WorldCommodity,
} from '../src/types/twe.ts';

export const GLOBAL_CURRENCY_CODES: Array<{
  code: string;
  name: string;
  usdRate: number;
  chain: string;
  chainId: number;
}> = [
  { code: 'USD', name: 'United States Dollar Clearing Token', usdRate: 1.0, chain: 'Base', chainId: 8453 },
  { code: 'EUR', name: 'Eurozone Euro Settlement Unit', usdRate: 1.084, chain: 'Ethereum', chainId: 1 },
  { code: 'GBP', name: 'British Pound Sterling Unit', usdRate: 1.274, chain: 'Ethereum', chainId: 1 },
  { code: 'CHF', name: 'Swiss Franc Helvetia Note', usdRate: 1.132, chain: 'Arbitrum', chainId: 42161 },
  { code: 'JPY', name: 'Japanese Yen Interbank Token', usdRate: 0.0067, chain: 'Base', chainId: 8453 },
  { code: 'SGD', name: 'Singapore Dollar MAS Clearing', usdRate: 0.746, chain: 'Solana', chainId: 101 },
  { code: 'AED', name: 'UAE Dirham Sovereign Unit', usdRate: 0.2723, chain: 'Polygon', chainId: 137 },
  { code: 'CAD', name: 'Canadian Dollar Clearing Token', usdRate: 0.728, chain: 'Base', chainId: 8453 },
  { code: 'AUD', name: 'Australian Dollar Pacific Token', usdRate: 0.654, chain: 'Arbitrum', chainId: 42161 },
  { code: 'CNY', name: 'Offshore Yuan Trade Settlement', usdRate: 0.138, chain: 'Polygon', chainId: 137 },
  { code: 'HKD', name: 'Hong Kong Dollar Liquidity Coin', usdRate: 0.128, chain: 'Ethereum', chainId: 1 },
  { code: 'SEK', name: 'Swedish Krona Nordic Token', usdRate: 0.095, chain: 'Arbitrum', chainId: 42161 },
  { code: 'NOK', name: 'Norwegian Krone Energy Unit', usdRate: 0.092, chain: 'Polygon', chainId: 137 },
  { code: 'NZD', name: 'New Zealand Dollar Unit', usdRate: 0.598, chain: 'Base', chainId: 8453 },
  { code: 'INR', name: 'Indian Rupee GIFT Settlement', usdRate: 0.0119, chain: 'Polygon', chainId: 137 },
  { code: 'BRL', name: 'Brazilian Real Drex Bridge', usdRate: 0.175, chain: 'Base', chainId: 8453 },
  { code: 'MXN', name: 'Mexican Peso Clearing Token', usdRate: 0.051, chain: 'Arbitrum', chainId: 42161 },
  { code: 'KRW', name: 'South Korean Won Token', usdRate: 0.00073, chain: 'Solana', chainId: 101 },
  { code: 'ZAR', name: 'South African Rand Bullion Bridge', usdRate: 0.055, chain: 'Polygon', chainId: 137 },
  { code: 'SAR', name: 'Saudi Riyal Energy Settlement', usdRate: 0.2666, chain: 'Ethereum', chainId: 1 },
  { code: 'PLN', name: 'Polish Zloty Settlement Unit', usdRate: 0.249, chain: 'Arbitrum', chainId: 42161 },
  { code: 'TRY', name: 'Turkish Lira Trade Token', usdRate: 0.029, chain: 'Polygon', chainId: 137 },
  { code: 'THB', name: 'Thai Baht Settlement Token', usdRate: 0.0294, chain: 'Solana', chainId: 101 },
  { code: 'IDR', name: 'Indonesian Rupiah Clearing Coin', usdRate: 0.000063, chain: 'Base', chainId: 8453 },
];

export function encodeCommodityUint256Hex(params: {
  originIso: number;
  typeId: number;
  apiOrPurityScaled: number;
  sulfurOrGradeScaled: number;
  portCode: number;
  certNum: bigint;
}): string {
  const country = BigInt(params.originIso) & 0xffffn;
  const type = BigInt(params.typeId) & 0xffffn;
  const api = BigInt(params.apiOrPurityScaled) & 0xffffn;
  const sulfur = BigInt(params.sulfurOrGradeScaled) & 0xffffn;
  const port = BigInt(params.portCode) & 0xffffn;
  const ts = BigInt(1794800000);
  let encoded = country;
  encoded |= type << 16n;
  encoded |= api << 32n;
  encoded |= sulfur << 48n;
  encoded |= port << 64n;
  encoded |= ts << 80n;
  encoded |= params.certNum << 112n;
  return '0x' + encoded.toString(16).padStart(64, '0');
}

const RAW_COMMODITY_CATALOG: Array<
  Omit<WorldCommodity, 'uint256BitmaskHex' | 'tokenized' | 'tokenSymbol' | 'contractAddress'> & {
    typeId: number;
  }
> = [
  // Energy (8)
  { code: 'CL1', name: 'WTI Crude Oil (West Texas Intermediate)', sector: 'Energy', exchange: 'NYMEX', unit: 'bbl', priceUsd: 78.42, change24hPct: 1.24, originIso: 840, originCountry: 'USA', portCode: 713, qualitySpec: '39.6° API · 0.24% Sulfur', apiOrPurityScaled: 3960, sulfurOrGradeScaled: 240, typeId: 1 },
  { code: 'BRN', name: 'Brent North Sea Crude Oil', sector: 'Energy', exchange: 'ICE', unit: 'bbl', priceUsd: 82.15, change24hPct: 0.92, originIso: 528, originCountry: 'Netherlands', portCode: 101, qualitySpec: '38.3° API · 0.37% Sulfur', apiOrPurityScaled: 3830, sulfurOrGradeScaled: 370, typeId: 1 },
  { code: 'NG', name: 'Henry Hub Natural Gas', sector: 'Energy', exchange: 'NYMEX', unit: 'MMBtu', priceUsd: 2.84, change24hPct: -1.45, originIso: 840, originCountry: 'USA', portCode: 337, qualitySpec: 'Pipeline Dry Gas 1030 BTU', apiOrPurityScaled: 1030, sulfurOrGradeScaled: 15, typeId: 2 },
  { code: 'LNG-JKM', name: 'JKM Asia Liquefied Natural Gas', sector: 'Energy', exchange: 'SGX', unit: 'MMBtu', priceUsd: 13.45, change24hPct: 2.1, originIso: 702, originCountry: 'Singapore', portCode: 702, qualitySpec: '-162°C Cryogenic Grade A', apiOrPurityScaled: 1120, sulfurOrGradeScaled: 10, typeId: 2 },
  { code: 'RBOB', name: 'RBOB Reformulated Gasoline', sector: 'Energy', exchange: 'NYMEX', unit: 'gal', priceUsd: 2.28, change24hPct: 0.65, originIso: 840, originCountry: 'USA', portCode: 713, qualitySpec: '87 Octane Summer Spec', apiOrPurityScaled: 6100, sulfurOrGradeScaled: 100, typeId: 1 },
  { code: 'HO', name: 'NY Harbor ULSD Heating Oil', sector: 'Energy', exchange: 'NYMEX', unit: 'gal', priceUsd: 2.46, change24hPct: 0.41, originIso: 840, originCountry: 'USA', portCode: 212, qualitySpec: '15 ppm Ultra-Low Sulfur', apiOrPurityScaled: 3500, sulfurOrGradeScaled: 15, typeId: 1 },
  { code: 'NCF', name: 'Newcastle Thermal Coal 6000 kcal', sector: 'Energy', exchange: 'ICE', unit: 'MT', priceUsd: 141.8, change24hPct: -0.78, originIso: 36, originCountry: 'Australia', portCode: 232, qualitySpec: '6000 kcal/kg GAR', apiOrPurityScaled: 6000, sulfurOrGradeScaled: 650, typeId: 1 },
  { code: 'UX-U3O8', name: 'Uranium Yellowcake (U3O8)', sector: 'Energy', exchange: 'COMEX', unit: 'lb', priceUsd: 81.25, change24hPct: 1.88, originIso: 124, originCountry: 'Canada', portCode: 306, qualitySpec: '99.2% Triuranium Octoxide', apiOrPurityScaled: 9920, sulfurOrGradeScaled: 5, typeId: 1 },

  // Precious Metals (5)
  { code: 'XAU', name: 'Allocated London Gold Bullion', sector: 'Precious Metals', exchange: 'COMEX', unit: 'oz', priceUsd: 2685.1, change24hPct: 0.74, originIso: 784, originCountry: 'UAE', portCode: 971, qualitySpec: '999.9 Fine LBMA Good Delivery', apiOrPurityScaled: 9999, sulfurOrGradeScaled: 1, typeId: 3 },
  { code: 'XAG', name: 'Allocated Silver Bullion Bar', sector: 'Precious Metals', exchange: 'COMEX', unit: 'oz', priceUsd: 31.45, change24hPct: 1.32, originIso: 826, originCountry: 'UK', portCode: 207, qualitySpec: '999.0 Fine 1000-oz Bar', apiOrPurityScaled: 9990, sulfurOrGradeScaled: 2, typeId: 3 },
  { code: 'XPT', name: 'Zurich Platinum Bullion Reserve', sector: 'Precious Metals', exchange: 'NYMEX', unit: 'oz', priceUsd: 1018.6, change24hPct: -0.54, originIso: 756, originCountry: 'Switzerland', portCode: 414, qualitySpec: '999.5 LPPM Platinum', apiOrPurityScaled: 9995, sulfurOrGradeScaled: 1, typeId: 3 },
  { code: 'XPD', name: 'Industrial Palladium Sponge & Plate', sector: 'Precious Metals', exchange: 'NYMEX', unit: 'oz', priceUsd: 974.3, change24hPct: -1.12, originIso: 710, originCountry: 'South Africa', portCode: 273, qualitySpec: '999.5 LPPM Palladium', apiOrPurityScaled: 9995, sulfurOrGradeScaled: 2, typeId: 3 },
  { code: 'XRH', name: 'Rhodium Catalytic Reserve', sector: 'Precious Metals', exchange: 'OTC-TWE', unit: 'oz', priceUsd: 4725.0, change24hPct: 0.45, originIso: 710, originCountry: 'South Africa', portCode: 271, qualitySpec: '999.0 Sponge Purity', apiOrPurityScaled: 9990, sulfurOrGradeScaled: 3, typeId: 3 },

  // Industrial Metals (10)
  { code: 'HG', name: 'Grade A Copper Cathode', sector: 'Industrial Metals', exchange: 'COMEX', unit: 'lb', priceUsd: 4.38, change24hPct: 1.05, originIso: 152, originCountry: 'Chile', portCode: 565, qualitySpec: '99.99% Electrolytic Cu', apiOrPurityScaled: 9999, sulfurOrGradeScaled: 10, typeId: 3 },
  { code: 'ALU', name: 'Primary High-Grade Aluminum', sector: 'Industrial Metals', exchange: 'LME', unit: 'MT', priceUsd: 2615.0, change24hPct: 0.61, originIso: 578, originCountry: 'Norway', portCode: 475, qualitySpec: 'P1020A 99.7% Min Al', apiOrPurityScaled: 9970, sulfurOrGradeScaled: 15, typeId: 3 },
  { code: 'LITH', name: 'Battery-Grade Lithium Carbonate', sector: 'Industrial Metals', exchange: 'CME', unit: 'kg', priceUsd: 14.92, change24hPct: -0.9, originIso: 152, originCountry: 'Chile', portCode: 562, qualitySpec: '99.5% Li2CO3 Min', apiOrPurityScaled: 9950, sulfurOrGradeScaled: 20, typeId: 3 },
  { code: 'NI', name: 'Class 1 Refined Nickel Briquette', sector: 'Industrial Metals', exchange: 'LME', unit: 'MT', priceUsd: 16240.0, change24hPct: -0.35, originIso: 360, originCountry: 'Indonesia', portCode: 622, qualitySpec: '99.8% Electrolytic Ni', apiOrPurityScaled: 9980, sulfurOrGradeScaled: 12, typeId: 3 },
  { code: 'COB', name: 'Refined Cobalt Cathode Ingot', sector: 'Industrial Metals', exchange: 'LME', unit: 'lb', priceUsd: 28.15, change24hPct: -0.62, originIso: 246, originCountry: 'Finland', portCode: 358, qualitySpec: '99.8% Min Co Metal', apiOrPurityScaled: 9980, sulfurOrGradeScaled: 14, typeId: 3 },
  { code: 'ZN', name: 'Special High Grade Zinc', sector: 'Industrial Metals', exchange: 'LME', unit: 'MT', priceUsd: 2985.0, change24hPct: 0.84, originIso: 124, originCountry: 'Canada', portCode: 604, qualitySpec: '99.995% SHG Zinc', apiOrPurityScaled: 9999, sulfurOrGradeScaled: 8, typeId: 3 },
  { code: 'PB', name: 'Refined Standard Lead Ingot', sector: 'Industrial Metals', exchange: 'LME', unit: 'MT', priceUsd: 2045.0, change24hPct: 0.22, originIso: 36, originCountry: 'Australia', portCode: 618, qualitySpec: '99.97% Refined Pb', apiOrPurityScaled: 9997, sulfurOrGradeScaled: 10, typeId: 3 },
  { code: 'SN', name: 'High-Purity Tin Ingot', sector: 'Industrial Metals', exchange: 'LME', unit: 'MT', priceUsd: 31420.0, change24hPct: 1.48, originIso: 360, originCountry: 'Indonesia', portCode: 627, qualitySpec: '99.9% Sn Grade', apiOrPurityScaled: 9990, sulfurOrGradeScaled: 10, typeId: 3 },
  { code: 'FEF', name: '62% Fe CFR China Iron Ore', sector: 'Industrial Metals', exchange: 'SGX', unit: 'MT', priceUsd: 104.6, change24hPct: -0.44, originIso: 36, originCountry: 'Australia', portCode: 619, qualitySpec: '62.0% Iron · Low Alumina', apiOrPurityScaled: 6200, sulfurOrGradeScaled: 40, typeId: 3 },
  { code: 'HRC', name: 'US Midwest Hot-Rolled Coil Steel', sector: 'Industrial Metals', exchange: 'CME', unit: 'ST', priceUsd: 742.0, change24hPct: 0.55, originIso: 840, originCountry: 'USA', portCode: 312, qualitySpec: 'ASTM A1011 Commercial', apiOrPurityScaled: 9850, sulfurOrGradeScaled: 25, typeId: 3 },

  // Grains & Oilseeds (10)
  { code: 'ZW', name: 'Chicago Soft Red Winter Wheat', sector: 'Grains & Oilseeds', exchange: 'CBOT', unit: 'bu', priceUsd: 5.84, change24hPct: 0.91, originIso: 840, originCountry: 'USA', portCode: 312, qualitySpec: 'No. 2 SRW · 13.5% Moisture', apiOrPurityScaled: 1350, sulfurOrGradeScaled: 20, typeId: 4 },
  { code: 'KE', name: 'Kansas City Hard Red Winter Wheat', sector: 'Grains & Oilseeds', exchange: 'CBOT', unit: 'bu', priceUsd: 6.18, change24hPct: 0.72, originIso: 840, originCountry: 'USA', portCode: 816, qualitySpec: 'No. 2 HRW · 11.5% Protein', apiOrPurityScaled: 1150, sulfurOrGradeScaled: 18, typeId: 4 },
  { code: 'ZC', name: 'No. 2 Yellow Corn Futures', sector: 'Grains & Oilseeds', exchange: 'CBOT', unit: 'bu', priceUsd: 4.32, change24hPct: -0.35, originIso: 840, originCountry: 'USA', portCode: 504, qualitySpec: '15.0% Max Moisture', apiOrPurityScaled: 1500, sulfurOrGradeScaled: 25, typeId: 4 },
  { code: 'ZS', name: 'No. 2 Yellow Soybeans', sector: 'Grains & Oilseeds', exchange: 'CBOT', unit: 'bu', priceUsd: 10.45, change24hPct: 1.15, originIso: 76, originCountry: 'Brazil', portCode: 551, qualitySpec: '36% Protein · 13% Moisture', apiOrPurityScaled: 3600, sulfurOrGradeScaled: 20, typeId: 4 },
  { code: 'ZL', name: 'Crude Degummed Soybean Oil', sector: 'Grains & Oilseeds', exchange: 'CBOT', unit: 'lb', priceUsd: 0.452, change24hPct: 0.88, originIso: 32, originCountry: 'Argentina', portCode: 543, qualitySpec: '0.75% Free Fatty Acid', apiOrPurityScaled: 9920, sulfurOrGradeScaled: 75, typeId: 4 },
  { code: 'ZM', name: 'High-Protein Soybean Meal', sector: 'Grains & Oilseeds', exchange: 'CBOT', unit: 'ST', priceUsd: 318.4, change24hPct: 0.4, originIso: 840, originCountry: 'USA', portCode: 504, qualitySpec: '47.5% Min Crude Protein', apiOrPurityScaled: 4750, sulfurOrGradeScaled: 30, typeId: 4 },
  { code: 'ZR', name: 'Rough Long-Grain Rice', sector: 'Grains & Oilseeds', exchange: 'CBOT', unit: 'cwt', priceUsd: 15.6, change24hPct: -0.25, originIso: 840, originCountry: 'USA', portCode: 501, qualitySpec: '55/70 Milling Yield', apiOrPurityScaled: 5570, sulfurOrGradeScaled: 15, typeId: 4 },
  { code: 'ZO', name: 'Milling Grade Oats', sector: 'Grains & Oilseeds', exchange: 'CBOT', unit: 'bu', priceUsd: 3.74, change24hPct: 0.18, originIso: 124, originCountry: 'Canada', portCode: 204, qualitySpec: '38 lb/bu Test Weight', apiOrPurityScaled: 3800, sulfurOrGradeScaled: 12, typeId: 4 },
  { code: 'RS', name: 'ICE Canola / Rapeseed', sector: 'Grains & Oilseeds', exchange: 'ICE', unit: 'MT', priceUsd: 642.5, change24hPct: 0.67, originIso: 124, originCountry: 'Canada', portCode: 306, qualitySpec: 'No. 1 Canada Canola', apiOrPurityScaled: 4200, sulfurOrGradeScaled: 20, typeId: 4 },
  { code: 'FCPO', name: 'Malaysian Crude Palm Oil', sector: 'Grains & Oilseeds', exchange: 'BMD', unit: 'MT', priceUsd: 984.0, change24hPct: 1.54, originIso: 458, originCountry: 'Malaysia', portCode: 603, qualitySpec: 'RSPO Segregated Grade', apiOrPurityScaled: 9500, sulfurOrGradeScaled: 50, typeId: 4 },

  // Softs & Timber (7)
  { code: 'KC', name: 'Washed Arabica Coffee C', sector: 'Softs & Timber', exchange: 'ICE', unit: 'lb', priceUsd: 2.68, change24hPct: 2.34, originIso: 170, originCountry: 'Colombia', portCode: 575, qualitySpec: 'Strictly High Grown Grade', apiOrPurityScaled: 8600, sulfurOrGradeScaled: 10, typeId: 4 },
  { code: 'CC', name: 'West African Fine Cocoa Beans', sector: 'Softs & Timber', exchange: 'ICE', unit: 'MT', priceUsd: 7840.0, change24hPct: 1.9, originIso: 288, originCountry: 'Ghana', portCode: 233, qualitySpec: 'Main Crop Fair Average', apiOrPurityScaled: 9400, sulfurOrGradeScaled: 15, typeId: 4 },
  { code: 'SB', name: 'World Raw Cane Sugar #11', sector: 'Softs & Timber', exchange: 'ICE', unit: 'lb', priceUsd: 0.214, change24hPct: -0.42, originIso: 76, originCountry: 'Brazil', portCode: 551, qualitySpec: '96.0° Polarization', apiOrPurityScaled: 9600, sulfurOrGradeScaled: 20, typeId: 4 },
  { code: 'CT', name: 'Upland Cotton No. 2', sector: 'Softs & Timber', exchange: 'ICE', unit: 'lb', priceUsd: 0.728, change24hPct: 0.31, originIso: 840, originCountry: 'USA', portCode: 806, qualitySpec: 'Strict Low Middling 1-1/16"', apiOrPurityScaled: 3100, sulfurOrGradeScaled: 10, typeId: 4 },
  { code: 'OJ', name: 'Frozen Concentrated Orange Juice', sector: 'Softs & Timber', exchange: 'ICE', unit: 'lb', priceUsd: 4.86, change24hPct: 1.12, originIso: 840, originCountry: 'USA', portCode: 407, qualitySpec: 'US Grade A 65° Brix', apiOrPurityScaled: 6500, sulfurOrGradeScaled: 5, typeId: 4 },
  { code: 'LBR', name: 'Physical Spruce-Pine-Fir Lumber', sector: 'Softs & Timber', exchange: 'CME', unit: 'mbf', priceUsd: 562.0, change24hPct: 0.95, originIso: 124, originCountry: 'Canada', portCode: 604, qualitySpec: '2x4 Random Length #2&Btr', apiOrPurityScaled: 2400, sulfurOrGradeScaled: 5, typeId: 4 },
  { code: 'TF', name: 'SGX TSR20 Natural Rubber', sector: 'Softs & Timber', exchange: 'SGX', unit: 'kg', priceUsd: 1.94, change24hPct: 0.52, originIso: 764, originCountry: 'Thailand', portCode: 667, qualitySpec: 'Technically Specified Rubber', apiOrPurityScaled: 9200, sulfurOrGradeScaled: 20, typeId: 4 },

  // Livestock & Environmental Carbon (6)
  { code: 'LE', name: 'Choice Live Beef Cattle', sector: 'Livestock & Carbon', exchange: 'CME', unit: 'lb', priceUsd: 1.88, change24hPct: 0.44, originIso: 840, originCountry: 'USA', portCode: 402, qualitySpec: '65% Choice / 35% Select', apiOrPurityScaled: 6500, sulfurOrGradeScaled: 10, typeId: 4 },
  { code: 'GF', name: 'Medium/Large Feeder Cattle', sector: 'Livestock & Carbon', exchange: 'CME', unit: 'lb', priceUsd: 2.54, change24hPct: 0.61, originIso: 840, originCountry: 'USA', portCode: 785, qualitySpec: '700–899 lb Steers', apiOrPurityScaled: 8000, sulfurOrGradeScaled: 10, typeId: 4 },
  { code: 'HE', name: 'USDA Lean Hogs Index', sector: 'Livestock & Carbon', exchange: 'CME', unit: 'lb', priceUsd: 0.84, change24hPct: -0.28, originIso: 840, originCountry: 'USA', portCode: 515, qualitySpec: '51–52% Lean Carcass', apiOrPurityScaled: 5150, sulfurOrGradeScaled: 10, typeId: 4 },
  { code: 'EUA', name: 'EU Emissions Allowance (Carbon)', sector: 'Livestock & Carbon', exchange: 'EEX', unit: 'tCO2e', priceUsd: 71.9, change24hPct: 1.65, originIso: 528, originCountry: 'Netherlands', portCode: 101, qualitySpec: 'Compliance Phase IV Registry', apiOrPurityScaled: 10000, sulfurOrGradeScaled: 0, typeId: 4 },
  { code: 'VCS-DAC', name: 'Verified Direct Air Carbon Ton', sector: 'Livestock & Carbon', exchange: 'TWE-ATS', unit: 'tCO2e', priceUsd: 94.1, change24hPct: 2.15, originIso: 352, originCountry: 'Iceland', portCode: 354, qualitySpec: 'Verra Mineralized 1000yr', apiOrPurityScaled: 10000, sulfurOrGradeScaled: 0, typeId: 4 },
  { code: 'KELP-CO2', name: 'Oceanic Blue Carbon Kelp Credit', sector: 'Livestock & Carbon', exchange: 'TWE-ATS', unit: 'tCO2e', priceUsd: 62.4, change24hPct: 1.82, originIso: 578, originCountry: 'Norway', portCode: 472, qualitySpec: 'Marine Reserve Audited', apiOrPurityScaled: 9850, sulfurOrGradeScaled: 0, typeId: 4 },
];

export function createInitialWorldCommodities(): WorldCommodity[] {
  return RAW_COMMODITY_CATALOG.map((item, idx) => {
    const bitmask = encodeCommodityUint256Hex({
      originIso: item.originIso,
      typeId: item.typeId,
      apiOrPurityScaled: item.apiOrPurityScaled,
      sulfurOrGradeScaled: item.sulfurOrGradeScaled,
      portCode: item.portCode,
      certNum: BigInt(987654321000 + idx),
    });
    const tokenized = item.code === 'CL1' || item.code === 'BRN' || item.code === 'XAU' || item.code === 'XPT' || item.code === 'VCS-DAC';
    return {
      code: item.code,
      name: item.name,
      sector: item.sector,
      exchange: item.exchange,
      unit: item.unit,
      priceUsd: item.priceUsd,
      change24hPct: item.change24hPct,
      originIso: item.originIso,
      originCountry: item.originCountry,
      portCode: item.portCode,
      qualitySpec: item.qualitySpec,
      apiOrPurityScaled: item.apiOrPurityScaled,
      sulfurOrGradeScaled: item.sulfurOrGradeScaled,
      uint256BitmaskHex: bitmask,
      tokenized,
      tokenSymbol: `${item.code}-TWE`,
      contractAddress: tokenized
        ? '0x' + createHash('sha256').update(`commodity-${item.code}`).digest('hex').slice(0, 40)
        : undefined,
    };
  });
}

const CHAIN_LIST: Array<{ name: string; chainId: number }> = [
  { name: 'Ethereum', chainId: 1 },
  { name: 'Base', chainId: 8453 },
  { name: 'Arbitrum', chainId: 42161 },
  { name: 'Polygon', chainId: 137 },
  { name: 'Solana', chainId: 101 },
];

export function generateEnterpriseFoundryBatch(params: {
  seed: string;
  count: number;
  preset: 'custom' | 'currencies' | 'commodities';
  standard: 'ERC-3643' | 'ERC-20' | 'ERC-1400';
  commodities: WorldCommodity[];
}): FoundryTokenArtifact[] {
  const seed = (params.seed || 'TWE-SOVEREIGN-10K').trim();
  const count = Math.min(10000, Math.max(1, Math.floor(params.count || 100)));
  const batchId = `batch-${createHash('sha256').update(`${seed}-${Date.now()}`).digest('hex').slice(0, 10)}`;

  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const prefixes = ['TWE', 'AUR', 'PLT', 'CMX', 'VLT', 'MRD', 'CHM', 'OBX', 'KNT', 'SVX'];
  const roots = ['Sovereign', 'Platinum', 'Graphite', 'Reserve', 'Treasury', 'Clearing', 'Bullion', 'Settlement', 'Charter', 'Custody'];
  const kinds: AssetKind[] = ['Tokens', 'Commodities', 'Currencies', 'NFTs'];
  const nowIso = new Date().toISOString();

  const list: FoundryTokenArtifact[] = new Array(count);

  for (let i = 0; i < count; i++) {
    hash = Math.imul(hash ^ (i + 1), 16777619);
    const u = hash >>> 0;

    let ticker: string;
    let name: string;
    let kind: AssetKind;
    let chainObj = CHAIN_LIST[(u >>> 10) % CHAIN_LIST.length];
    let price = Number((((u % 45000) + 125) / 100).toFixed(2));

    if (params.preset === 'currencies') {
      const cur = GLOBAL_CURRENCY_CODES[i % GLOBAL_CURRENCY_CODES.length];
      const series = Math.floor(i / GLOBAL_CURRENCY_CODES.length) + 1;
      ticker = series === 1 ? `${cur.code}-TWE` : `${cur.code}-${String(series).padStart(3, '0')}`;
      name = series === 1 ? cur.name : `${cur.name} · Tranche #${series}`;
      kind = 'Currencies';
      chainObj = { name: cur.chain, chainId: cur.chainId };
      price = cur.usdRate;
    } else if (params.preset === 'commodities' && params.commodities.length > 0) {
      const com = params.commodities[i % params.commodities.length];
      const series = Math.floor(i / params.commodities.length) + 1;
      ticker = series === 1 ? com.tokenSymbol : `${com.code}-T${series}`;
      name = series === 1 ? `${com.name} Reserve Token` : `${com.name} · Series #${series}`;
      kind = 'Commodities';
      price = com.priceUsd;
    } else {
      const prefix = prefixes[u % prefixes.length];
      const root = roots[(u >>> 4) % roots.length];
      kind = kinds[(u >>> 8) % kinds.length];
      ticker = `${prefix}-${String(i + 1).padStart(4, '0')}`;
      name = `${root} Instrument #${String(i + 1).padStart(4, '0')}`;
    }

    // Fast deterministic hex derivation per token index (keeps 10,000 batch generation <50ms)
    const hexA = (((u >>> 0) ^ 0x9e3779b9) >>> 0).toString(16).padStart(8, '0');
    const hexB = (Math.imul(u ^ (i + 17), 0x85ebca6b) >>> 0).toString(16).padStart(8, '0');
    const hexC = (Math.imul(u ^ (i + 97), 0xc2b2ae35) >>> 0).toString(16).padStart(8, '0');
    const hexD = (Math.imul(u + 1337, 0x27d4eb2f) >>> 0).toString(16).padStart(8, '0');
    const hexE = (Math.imul(u ^ 0x517cc1b7, i + 7) >>> 0).toString(16).padStart(8, '0');

    const contractAddress = `0x${hexA}${hexB}${hexC}${hexD}${hexE}`;
    const deployTxHash = `0x${hexB}${hexC}${hexD}${hexE}${hexA}${hexC}${hexB}${hexD}`;
    const signerAddress = `0x${hexD}${hexA}${hexE}${hexB}${hexC}`;
    const tickerHex = Buffer.from(ticker.slice(0, 12)).toString('hex').padEnd(24, '0');
    const bytecodeHex = `0x608060405234801561001057600080fd5b5060405161084a38038061084a83398101604081905261003191${tickerHex}${hexA}${hexB}6001600160a01b0316${hexC}`;
    const trillionScale = (((u % 900) + 100) * 1e12).toLocaleString('en-US');

    list[i] = {
      id: `fnd-${batchId}-${i + 1}`,
      batchId,
      batchIndex: i + 1,
      seed,
      ticker,
      name,
      kind,
      standard: params.standard,
      chain: chainObj.name,
      chainId: chainObj.chainId,
      simulatedSupply: trillionScale,
      initialPriceUsd: price,
      contractAddress,
      deployTxHash,
      bytecodeHex,
      bytecodeSizeBytes: 2122 + (i % 180),
      hsmKeyId: `arn:aws:cloudhsm:us-east-1:twe-ats:key/${hexA}-${hexB.slice(0, 4)}-${hexC.slice(0, 4)}`,
      hsmKeyFingerprint: `SHA256:${hexE}${hexD}`,
      signerAddress,
      kmsEnvelopeHash: `0x${hexC}${hexE}${hexA}${hexD}`,
      deployed: false,
      nftTokenId: `#${String(i + 1).padStart(5, '0')}`,
      nftCidV1: `bafybei${hexA}${hexB}${hexC}${hexD}${hexE}`.slice(0, 46),
      nftSha256: `${hexD}${hexE}${hexA}${hexB}${hexC}${hexD}${hexA}${hexE}`.slice(0, 64),
      createdAt: nowIso,
    };
  }

  return list;
}

export function buildFoundryTokenDetail(token: FoundryTokenArtifact): FoundryTokenDetail {
  const safeContractName = token.ticker.replace(/[^A-Za-z0-9]/g, '') || 'TWEInstrument';
  const digestKey = createHmac('sha256', 'TWE-CLOUDHSM-ENVELOPE-KEY-SPEC')
    .update(`${token.id}:${token.contractAddress}:${token.seed}`)
    .digest('hex');

  const soliditySource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface IIdentityRegistry {
    function isVerified(address _userAddress) external view returns (bool);
}

/**
 * @title ${token.name} (${token.ticker})
 * @notice TWE ATS® Institutional ${token.standard} Contract · Sovereign Vault Bound
 * @dev Contract ID: ${token.contractAddress} | Chain EIP-155:${token.chainId}
 */
contract TWE_${safeContractName} is ERC20, ERC20Permit, AccessControl, Pausable {
    bytes32 public constant COMPLIANCE_AGENT_ROLE = keccak256("COMPLIANCE_AGENT_ROLE");
    bytes32 public constant HSM_MINTER_ROLE = keccak256("HSM_MINTER_ROLE");
    bytes32 public constant SOVEREIGN_VAULT_UUID = 0xaf230af8bf634308968a9962ed14e56500000000000000000000000000000000;

    IIdentityRegistry public identityRegistry;
    uint256 public rule144LockupUntil;

    constructor(address admin, address _identityRegistry)
        ERC20("${token.name}", "${token.ticker}")
        ERC20Permit("${token.name}")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_AGENT_ROLE, admin);
        _grantRole(HSM_MINTER_ROLE, ${token.signerAddress});
        identityRegistry = IIdentityRegistry(_identityRegistry);
        rule144LockupUntil = block.timestamp + 180 days;
        _mint(admin, 1_000_000_000 * 10 ** decimals());
    }

    function pause() external onlyRole(COMPLIANCE_AGENT_ROLE) { _pause(); }
    function unpause() external onlyRole(COMPLIANCE_AGENT_ROLE) { _unpause(); }

    function mintWithAttestation(address to, uint256 amount) external onlyRole(HSM_MINTER_ROLE) {
        require(identityRegistry.isVerified(to), "TWE: ONCHAINID KYC required");
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        if (from != address(0) && to != address(0)) {
            require(identityRegistry.isVerified(from) && identityRegistry.isVerified(to), "ERC3643: Transfer restricted");
        }
        super._update(from, to, value);
    }
}`;

  const abiJson = JSON.stringify(
    [
      { type: 'constructor', inputs: [{ name: 'admin', type: 'address' }, { name: '_identityRegistry', type: 'address' }] },
      { type: 'function', name: 'name', stateMutability: 'view', outputs: [{ type: 'string' }] },
      { type: 'function', name: 'symbol', stateMutability: 'view', outputs: [{ type: 'string' }] },
      { type: 'function', name: 'totalSupply', stateMutability: 'view', outputs: [{ type: 'uint256' }] },
      { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
      { type: 'function', name: 'mintWithAttestation', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }] },
      { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ type: 'bool' }] },
    ],
    null,
    2
  );

  // Bespoke Graphite + Champagne-Gold + Platinum SVG emblem per token
  const hueRotation = (token.batchIndex * 29) % 360;
  const nftSvgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg-${token.batchIndex}" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#1A1F29"/>
      <stop offset="100%" stop-color="#090B0F"/>
    </radialGradient>
    <linearGradient id="gold-${token.batchIndex}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F6E6C2"/>
      <stop offset="50%" stop-color="#D4B475"/>
      <stop offset="100%" stop-color="#8A692C"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="32" fill="url(#bg-${token.batchIndex})"/>
  <rect x="20" y="20" width="472" height="472" rx="24" fill="none" stroke="url(#gold-${token.batchIndex})" stroke-width="2" opacity="0.65"/>
  <circle cx="256" cy="224" r="118" fill="none" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.45"/>
  <circle cx="256" cy="224" r="92" fill="none" stroke="url(#gold-${token.batchIndex})" stroke-width="3"/>
  <polygon points="256,120 342,224 256,328 170,224" fill="none" stroke="url(#gold-${token.batchIndex})" stroke-width="2.5" transform="rotate(${hueRotation % 45} 256 224)"/>
  <text x="256" y="218" text-anchor="middle" fill="#F1F3F6" font-family="monospace" font-size="28" font-weight="700">${token.ticker}</text>
  <text x="256" y="248" text-anchor="middle" fill="#D4B475" font-family="monospace" font-size="13">${token.standard} · ${token.chain.toUpperCase()}</text>
  <text x="256" y="408" text-anchor="middle" fill="#CBD5E1" font-family="monospace" font-size="14" font-weight="600">TWE SOVEREIGN NFT ${token.nftTokenId}</text>
  <text x="256" y="434" text-anchor="middle" fill="#7C8596" font-family="monospace" font-size="11">${token.contractAddress.slice(0, 22)}…</text>
</svg>`;

  const realSvgSha = createHash('sha256').update(nftSvgMarkup).digest('hex');
  const nftMetadataJson = JSON.stringify(
    {
      name: `${token.name} ${token.nftTokenId}`,
      description: `OpenZeppelin ${token.standard} Sovereign Certificate NFT bound to Token Contract ${token.contractAddress} on ${token.chain}.`,
      image: `ipfs://${token.nftCidV1}`,
      external_url: `https://twe-ats.internal/asset/${token.ticker}`,
      sha256_integrity: realSvgSha,
      contract_address: token.contractAddress,
      attributes: [
        { trait_type: 'Ticker', value: token.ticker },
        { trait_type: 'Standard', value: token.standard },
        { trait_type: 'Classification', value: token.kind },
        { trait_type: 'Network', value: `${token.chain} (eip155:${token.chainId})` },
        { trait_type: 'HSM Key Custody', value: token.hsmKeyId },
        { trait_type: 'Sovereign Vault', value: 'af230af8-bf63-4308-968a-9962ed14e565' },
      ],
    },
    null,
    2
  );

  return {
    ...token,
    nftSha256: realSvgSha,
    soliditySource,
    abiJson,
    ephemeralPrivateKeyHex: `0x${digestKey}`,
    nftSvgMarkup,
    nftMetadataJson,
  };
}
