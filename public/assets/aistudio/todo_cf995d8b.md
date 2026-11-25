# AURELIUM ORACLE — Project TODO

## Phase 1: Project Setup & Authentication
- [x] Database schema: users, watchlist, analyses, mql5_codes, trade_setups tables
- [x] tRPC procedures for auth, watchlist CRUD, analyses storage, code history
- [x] Environment variables and secrets configuration
- [x] Manus OAuth integration verification

## Phase 2: Dashboard Layout & UI Foundation
- [x] Dark gold and black color palette in Tailwind/CSS variables
- [x] Dashboard layout with header, sidebar, main content area
- [x] Animated ticker tape component with US stock symbols
- [x] Header with AURELIUM ORACLE branding and live status indicator
- [x] Navigation and user profile menu

## Phase 3: AI Chat Analysis Feature
- [x] AI chat interface component with message history
- [x] Stock ticker input and analysis request handling
- [x] LLM integration for technical analysis responses
- [x] Markdown rendering for analysis output
- [x] Loading states and error handling

## Phase 4: MQL5 Code Generator
- [x] MQL5 code generator form (symbol, strategy type, risk %, SL, TP)
- [x] LLM-powered MQL5 code generation
- [x] Code display with copy-to-clipboard functionality
- [x] Code validation and formatting

## Phase 5: Watchlist Manager
- [x] Add/remove ticker functionality
- [x] Watchlist display with price, change %, trend indicators
- [x] Sector tags for each ticker
- [x] Mock price data generation (or API integration)
- [x] Watchlist persistence to database

## Phase 6: Sector Rotation Intelligence
- [x] Sector rotation panel UI
- [x] LLM-generated sector commentary
- [x] Hot/cold sector indicators
- [x] Rotation opportunity insights

## Phase 7: Trade Setup Cards
- [x] Trade setup card component with all 5 data points
- [x] Entry price, stop loss, take profit fields
- [x] Risk/reward ratio calculation
- [x] Confidence score display
- [x] AI-generated trade ideas

## Phase 8: Saved Analyses & History
- [x] Database storage for past analyses
- [x] Database storage for generated MQL5 codes
- [x] History view/list component
- [x] View, copy, delete functionality
- [x] User-specific data isolation

## Phase 9: Styling & Polish
- [x] Dark gold/black cyberpunk-luxury aesthetic throughout
- [x] Animations and micro-interactions
- [x] Responsive design
- [x] Typography and visual hierarchy
- [x] Brand consistency

## Phase 10: Testing & Deployment
- [x] Vitest unit tests for core features
- [x] Integration testing
- [x] Performance optimization
- [x] Final QA and bug fixes
- [x] Checkpoint and deployment ready


## Phase 11: ULTIMATE PORTFOLIO GENERATOR (Maximum Power Edition)

### Multi-Strategy Diversification Engine
- [ ] Design portfolio strategy blending algorithm
- [ ] Implement momentum strategy calculation
- [ ] Implement mean-reversion strategy calculation
- [ ] Implement sector rotation strategy calculation
- [ ] Implement volatility strategy calculation
- [ ] Create strategy weighting and combination logic
- [ ] Add strategy performance tracking

### Market Regime Detection
- [ ] Implement market regime classification (bull/bear/sideways)
- [ ] Create regime detection algorithm using technical indicators
- [ ] Build automatic allocation adjustment based on regime
- [ ] Add regime change alerts and notifications
- [ ] Create regime history tracking

### Correlation-Based Hedging
- [ ] Calculate asset correlation matrix
- [ ] Identify uncorrelated asset pairs
- [ ] Implement hedging position sizing
- [ ] Create hedge recommendation engine
- [ ] Add hedge effectiveness tracking

### Dynamic Rebalancing Engine
- [ ] Implement volatility-based rebalancing triggers
- [ ] Create performance-based rebalancing logic
- [ ] Build rebalancing recommendation system
- [ ] Add rebalancing history and audit trail
- [ ] Implement automated rebalancing execution

### Risk Parity Allocation
- [ ] Calculate risk contribution per position
- [ ] Implement equal risk allocation algorithm
- [ ] Create risk parity portfolio builder
- [ ] Add risk contribution visualization
- [ ] Build risk parity optimization solver

### Advanced Backtesting with Monte Carlo
- [ ] Design backtesting engine architecture
- [ ] Implement historical data simulation
- [ ] Create Monte Carlo simulation engine
- [ ] Calculate confidence intervals and distributions
- [ ] Build performance metrics (Sharpe, Sortino, Calmar)
- [ ] Create drawdown analysis and recovery time
- [ ] Add worst-case scenario analysis

### Sector Rotation Optimizer
- [ ] Implement sector momentum calculation
- [ ] Create relative strength analysis
- [ ] Build sector rotation recommendation engine
- [ ] Add sector allocation optimization
- [ ] Create sector performance tracking
- [ ] Implement rotation timing signals

### Portfolio Generator UI
- [ ] Create portfolio configuration interface
- [ ] Build strategy selection and weighting UI
- [ ] Implement portfolio generation form
- [ ] Create backtesting results dashboard
- [ ] Build rebalancing recommendations panel
- [ ] Add portfolio performance visualization
- [ ] Implement portfolio export functionality

### Testing & Optimization
- [ ] Write Vitest tests for all algorithms
- [ ] Implement performance benchmarks
- [ ] Add edge case testing
- [ ] Optimize calculation speed
- [ ] Create integration tests
- [ ] Performance profiling and optimization
