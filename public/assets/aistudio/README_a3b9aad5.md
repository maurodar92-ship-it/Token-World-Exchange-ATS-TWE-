# TOKEN WORLD — Compliance-First Reference Implementation

This repository is a software and documentation reference implementation for a proposed tokenized-asset venue and private-market trading platform.

## Critical status
This package is NOT an SEC approval or registration, FINRA membership, broker-dealer, ATS authorization, national securities exchange, transfer agent, custodian, clearing agency, investment adviser, legal opinion, or permission to offer/sell securities.

The demo API and matching engine are sandbox/testing only. Do not connect them to customer funds, live securities, production wallets, or a real market without qualified legal/compliance review, regulated counterparties, security audits, controls testing, and required registrations/filings.

## Run the demo
Docker:
```bash
docker compose -f infra/docker-compose.yml up --build
```
Open http://localhost:8000/docs and http://localhost:5000.

Local Python:
```bash
cd backend
python -m venv .venv
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Then `cd frontend && python -m http.server 5000`.

## Production gate
Keep `ENABLE_LIVE_TRADING=false` until every gate in `docs/operations/go-live-gates.md` is independently approved.
