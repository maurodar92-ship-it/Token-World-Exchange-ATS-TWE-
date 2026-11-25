from fastapi import FastAPI, HTTPException
from .config import settings
from .models import OrderIn, Order, Eligibility
from .engine import MatchingEngine
import uuid
app = FastAPI(title="Token World Sandbox API", version="0.1.0", description="Compliance-first demonstration API. Not authorized for live securities trading.")
engine = MatchingEngine(); eligibility: dict[str, Eligibility] = {}
@app.get("/")
def root(): return {"status":"sandbox-online","project":"Token World","live_trading_enabled":settings.enable_live_trading,"warning":"Sandbox only; no regulatory authorization is implied."}
@app.get("/api/v1/health")
def health(): return {"ok":True,"environment":settings.environment}
@app.post("/api/v1/eligibility")
def set_eligibility(item: Eligibility): eligibility[item.account_id] = item; return item
@app.get("/api/v1/eligibility/{account_id}")
def get_eligibility(account_id: str):
    item=eligibility.get(account_id)
    if not item: raise HTTPException(404,"Eligibility record not found")
    return item
@app.post("/api/v1/orders", response_model=Order)
def submit_order(item: OrderIn):
    if settings.enable_live_trading: raise HTTPException(503,"Live trading is disabled in this reference build.")
    e=eligibility.get(item.account_id)
    if not e or e.kyc_status != "VERIFIED": raise HTTPException(403,"Account is not verified for sandbox trading.")
    order=Order(order_id=str(uuid.uuid4()), **item.model_dump()); engine.add(order); return order
@app.get("/api/v1/orderbook/{symbol}")
def orderbook(symbol: str): return {"symbol":symbol,"bids":[o.model_dump() for o in engine.bids[symbol] if o.status=="OPEN"],"asks":[o.model_dump() for o in engine.asks[symbol] if o.status=="OPEN"]}
@app.get("/api/v1/trades/{symbol}")
def trades(symbol: str): return [t.model_dump() for t in engine.trades if t.symbol==symbol]
