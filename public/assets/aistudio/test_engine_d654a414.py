from app.engine import MatchingEngine
from app.models import Order
def test_match():
    e=MatchingEngine(); e.add(Order(order_id="b1",symbol="DEMO",side="BUY",price=10,quantity=5,account_id="A")); e.add(Order(order_id="a1",symbol="DEMO",side="SELL",price=9,quantity=3,account_id="B"))
    assert len(e.trades)==1 and e.trades[0].quantity==3 and e.trades[0].price==9
