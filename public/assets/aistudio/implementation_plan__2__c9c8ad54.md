# Market Watch Telemetry & qAMM Alert Engine

An institutional real-time surveillance and event-driven execution module that monitors simulated Azure Event Hub (`twe-telemetry-hub`) commodity telemetry streams, automatically flags `isWTISpecification(uint256)` deliverable crude matches and significant oracle price deltas, and enables one-click or autonomous `qAMM` delta-hedge routing and dark pool batch onboarding.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX decisions incorporate your confirmed selections and define how the Market Watch system integrates with the existing Bitmask Encoder and qAMM Dark Pool Terminal:

- **Confirmed Layout Architecture (Dual Surface)**: The Market Watch module will be accessible both as a **dedicated inline terminal section** (positioned prominently between the Hero KPI strip and the Bitmask Workbench) and as a **slide-out notification drawer** that can be opened from anywhere in the viewport to inspect incoming telemetry without losing scroll context.
- **Confirmed Response & Execution Mode (One-Click + Auto-Pilot)**: Each alert card provides direct, one-click execution actions (`Load Batch in Encoder`, `Commit to Dark Pool`, or `Execute qAMM Delta Hedge`), paired with an institutional **Auto-Pilot Toggle** that, when enabled, automatically commits verified WTI-grade batches and routes CME/ICE futures delta-hedges whenever an incoming price delta exceeds the configured threshold.
- **Confirmed Simulation & Stream Controls**: The control bar includes a **Configurable Price Delta Threshold slider** (e.g., `0.50%` to `5.00%` / `50 bps` to `500 bps`), **Stream Cadence / Speed controls** (`Paused`, `1x Normal`, `2x Accelerated`, `5x High-Frequency`), and manual event triggers to test WTI batch arrivals and volatility spikes on demand.

---

## 1. Overview & Core Concept

- **What It Does**: Continuously simulates and evaluates raw commodity telemetry payloads arriving through the Azure Event Hub ingestion pipeline (`ProcessCommodityTelemetry`), packing each event into its 256-bit `uint256` representation, testing the `isWTISpecification` on-chain compliance predicate, and comparing real-time Chainlink OCR 3.0 oracle prices against benchmark baselines to detect volatility spikes requiring `qAMM` auto-delta hedging.
- **Target Audience / Persona**: Institutional commodity desk traders, RWA liquidity managers, and compliance officers operating on the Token World Exchange ATS who require sub-second visibility into physical batch arrivals and automated futures hedging.
- **Key Value**: Bridges off-chain physical telemetry and on-chain execution—turning passive `uint256` bitmask encoding and `qAMM` hedging into a live, reactive workflow where anomalous market moves and NYMEX-deliverable WTI batches are immediately actionable.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Live Telemetry Surveillance & Stream Control**: Users observe incoming `twe-telemetry-hub` events arriving in real time within the inline Market Watch Command Panel (or via the slide-out drawer). Users can pause/resume the stream, adjust the ingestion cadence (`1x`, `2x`, `5x`), or tune the **qAMM Intervention Delta Threshold** (default `1.50%` / `150 bps`).
  2. **WTI-Grade Deliverable Match Flow**: When an ingested crude oil batch satisfies `isoCountryCode == 840 && commodityTypeId == 1 && apiGravityScaled ∈ [3700, 4200] && sulfurScaled <= 420`, a **WTI Deliverable Match** alert is raised showing its 64-character hex `uint256` slot, Houston/Cushing port code, and assay metrics. Clicking **Load & Commit Batch** loads the decoded `CommoditySpec` into the Bitmask Workbench and commits the lot to the SGX Dark Pool.
  3. **qAMM Price Delta Intervention Flow**: When an oracle telemetry update exhibits a price move exceeding the user's configured delta threshold (e.g., `+2.35%` on `TWE-CRUDE` or `TWE-XAU`), a **qAMM Delta Intervention Required** alert is raised calculating the exact CME/ICE futures lots needed to neutralize liquidity pool slippage. Clicking **Route CME/ICE Hedge** executes the hedge leg and logs the zero-slippage fill directly in the Dark Pool ledger.
  4. **Autonomous Auto-Pilot Mode**: Toggling **qAMM & WTI Auto-Pilot** to active causes incoming alerts that cross the configured threshold to automatically execute their hedge leg in the Dark Pool ledger and mark the alert as `Auto-Hedged via SGX Enclave`.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-density institutional financial terminal matching the existing dark slate (`#090d16` canvas, `bg-slate-900/60` structural surfaces, `1px` `border-slate-800` hairlines) and strict anti-slop discipline (zero pill enclosures, unboxed metadata separated by `·`, no thick left borders, no decorative pulsing dots on static headers).
  - *Color Palette & Semantic Signaling*:
    - Dominant Canvas: `#090d16` and `slate-950` data wells.
    - Primary Interactive Accent: Sky Cyan (`sky-400` / `#38BDF8`) for active controls, stream speed selectors, and `uint256` slot keys.
    - WTI Compliance Match State: Emerald (`emerald-400` / `#34D399`) paired with explicit `WTI DELIVERABLE MATCH` text labels.
    - High Price Delta / qAMM Intervention State: Amber (`amber-400` / `#FBBF24`) and Rose (`rose-400` / `#FB7185`) paired with explicit basis-point delta figures (`+245 bps`) and required CME/ICE contract counts.
  - *Typography & Hierarchy*: `Plus Jakarta Sans` for section headings and drawer titles, `Public Sans` for alert descriptions, and `IBM Plex Mono` with `tabular-nums` strictly enforced on all `uint256` hex strings, basis-point deltas, timestamps, API gravity, sulfur percentages, and CME/ICE lot counts.
  - *Component Styling & Layout*: Single-elevation flat panels with `1px solid` borders; a fixed-width (`420px`) slide-out drawer anchored to the right viewport edge with backdrop blur and keyboard `Escape` support; and a floating quick-access trigger button in the workspace so the Top Bar Contract remains strictly 3 zones.

- **Interactive Feedback & Motion**:
  - Smooth `150ms` `transform`/`opacity` slide transitions for the right-hand notification drawer.
  - Unread/unacknowledged alert counter and clear status transitions (`PENDING ACTION` → `HEDGED IN SGX ENCLAVE` or `LOADED IN ENCODER`) when an operator acts on an alert or when Auto-Pilot processes it.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Surface Architecture (Inline Terminal Section + Slide-Out Drawer)**
  - *Chosen Approach*: Provide a full-width inline **Market Watch Telemetry Center** section directly above the Bitmask Workbench while also providing a persistent **Slide-Out Market Watch Drawer** accessible from anywhere on the page.
  - *Why*: Traders analyzing the top of the terminal get immediate situational awareness from the inline command center, while operators scrolled down into the `qAMM` order book or `TWECommodityEncoder.sol` code inspector can open the slide-out drawer to act on live alerts without losing their scroll position.
  - *Alternatives Considered*: Placing a notification bell inside the top navigation bar was rejected to preserve the strict 3-zone Top Bar Contract; instead, the drawer toggle is integrated into the Hero/Market Watch workspace toolbar and a compact workspace dock button.

- **Decision 2: Deterministic Bitmask & Delta Evaluation Engine**
  - *Chosen Approach*: Every simulated Azure Event Hub message is constructed from realistic institutional commodity parameters and passed through the actual `encodeCommodityBitmask()`, `evaluateWTISpecification()`, and `qAMM` slippage/futures-lot calculators before generating an alert.
  - *Why*: Ensures 100% mathematical consistency across the entire application—clicking any alert in Market Watch loads a genuine, bit-accurate `uint256` value that decodes identically in the Bitmask Workbench and settles accurately in the Dark Pool ledger.
  - *Alternatives Considered*: Static pre-baked notification strings were rejected because they would not respond dynamically to changes in the user's Price Delta Threshold slider or decode into real `CommoditySpec` structs.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   Root Application State (TWE Smart ATS)                    │
│  • activeSpec (CommoditySpec)        • executions (DarkPoolExecution[])     │
│  • marketAlerts (MarketWatchAlert[]) • watchConfig (Threshold, Speed, Auto) │
└───────────────┬─────────────────────────────────────────┬───────────────────┘
                │                                         │
                ▼                                         ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────────┐
│   Azure Event Hub Stream Simulator    │ │   Market Watch Dual UI Surfaces   │
│  (twe-telemetry-hub Generator Hook)   │ │                                   │
│  •Configurable Interval (1x / 2x / 5x)│ │ ┌───────────────────────────────┐ │
│  •Packs uint256 via encodeCommodity() │ │ │ Inline Market Watch Section   │ │
│  •Runs evaluateWTISpecification()     │ │ │ • Stream & Threshold Controls │ │
│  •Computes Oracle Price Delta (bps)   │ │ │ • Auto-Pilot Toggle & KPIs    │ │
└───────────────┬───────────────────────┘ │ │ • Live Alert Feed & Filters   │ │
                │                         │ └──────────────┬────────────────┘ │
                │ Emits MarketWatchAlert  │                │ Shared State     │
                └────────────────────────►│ ┌──────────────▼────────────────┐ │
                                          │ │ Slide-Out Alert Drawer        │ │
                                          │ │ • Quick Filter (All/WTI/qAMM) │ │
                                          │ │ • One-Click Action Handlers   │ │
                                          │ └──────────────┬────────────────┘ │
                                          └────────────────┼──────────────────┘
                                                           │
                     ┌─────────────────────────────────────┴──────────────┐
                     ▼                                                    ▼
┌─────────────────────────────────────────┐  ┌────────────────────────────────┐
│   Bitmask Workbench (TWECommodityEncoder)│  │   qAMM & Dark Pool Terminal    │
│  • Receives activeSpec from WTI Alert   │  │  • Appends CME/ICE Hedge Fill  │
│  • Unpacks 7 attributes & hex segments  │  │  • Updates Total Settled Vol   │
└─────────────────────────────────────────┘  └────────────────────────────────┘
```

- **Data Model & State**:
  - `MarketWatchAlert`:
    - `id`: Unique telemetry event identifier (e.g., `HUB-840-713-9042`)
    - `timestamp`: UTC arrival time string
    - `alertType`: `'WTI_MATCH' | 'QAMM_DELTA'`
    - `severity`: `'NOMINAL_MATCH' | 'HIGH_VOLATILITY' | 'CRITICAL_DELTA'`
    - `spec`: Full 7-field `CommoditySpec` (`isoCountryCode`, `commodityTypeId`, `apiGravityScaled`, `sulfurScaled`, `portCode`, `productionTimestamp`, `vaultCertificateId`)
    - `encodedUint256Decimal` & `encodedUint256Hex`: Packed 256-bit word
    - `isWTI`: Boolean result from `evaluateWTISpecification()`
    - `priceDeltaPercent` & `priceDeltaBps`: Signed oracle price divergence vs. baseline
    - `spotPriceUsd` & `recommendedHedgeLots`: Calculated CME/ICE futures contracts required for zero-slippage neutralization
    - `notionalExposureUsd`: Institutional pool exposure affected by the telemetry event
    - `status`: `'UNREAD' | 'INSPECTED' | 'EXECUTED_MANUAL' | 'EXECUTED_AUTOPILOT'`
  - `MarketWatchConfig`:
    - `streamSpeed`: `'PAUSED' | '1X' | '2X' | '5X'`
    - `deltaThresholdPercent`: Number (`0.5` to `5.0`, default `1.5`)
    - `autoPilotEnabled`: Boolean (default `false`)
    - `categoryFilter`: `'ALL' | 'WTI_MATCH' | 'QAMM_DELTA'`

- **Interactive Component & State Mapping**:
  - **Stream Speed & Pause Controls**: Mutates `watchConfig.streamSpeed`, dynamically adjusting the background telemetry timer (`4500ms` at `1X`, `2200ms` at `2X`, `900ms` at `5X`, or cleared when `PAUSED`).
  - **Price Delta Threshold Slider (`0.5%` – `5.0%`)**: Mutates `watchConfig.deltaThresholdPercent` in real time. Incoming oracle price movements with `|priceDeltaPercent| >= deltaThresholdPercent` trigger a `QAMM_DELTA` intervention alert and highlight existing alerts in the feed that exceed the active threshold.
  - **Manual Simulation Triggers (`Simulate WTI Batch Arrival` / `Inject Oracle Price Spike`)**: Immediately synthesizes a deterministic WTI crude batch or a high-volatility oracle delta event and prepends it to `marketAlerts`, allowing instant verification even when the stream is paused.
  - **One-Click Alert Actions**:
    - *Load in Bitmask Encoder*: Sets root `activeSpec` to `alert.spec`, updates `alert.status` to `'INSPECTED'`, and scrolls smoothly to `#bitmask-encoder`.
    - *Execute qAMM Intervention / Commit WTI Batch*: Creates a corresponding `DarkPoolExecution` record with `0 bps` qAMM slippage and the calculated CME/ICE futures hedge leg, prepends it to `executions`, and transitions `alert.status` to `'EXECUTED_MANUAL'`.
  - **Auto-Pilot Toggle**: When `autoPilotEnabled` is switched on, any newly ingested `WTI_MATCH` or `QAMM_DELTA` alert (whose delta meets `deltaThresholdPercent`) automatically dispatches its `DarkPoolExecution` hedge record into the Dark Pool ledger and marks the alert `EXECUTED_AUTOPILOT`.
