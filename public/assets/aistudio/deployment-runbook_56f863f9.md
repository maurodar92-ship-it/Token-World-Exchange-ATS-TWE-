# Deployment Runbook

## Sandbox
Copy `.env.example` to `.env`, keep `ENABLE_LIVE_TRADING=false`, run Docker Compose, execute tests, and test eligibility/orders/orderbook/trades.

## Production (not enabled)
Production requires HA database, encrypted backups, private networking, secrets manager/HSM, WAF/DDoS controls, observability/SIEM, signed CI/CD, vulnerability management, formal change approval, DR, and regulated settlement/custody integrations.

## Blockchain
Before deployment select chain/finality, fees, contract version, upgrade policy, identity/compliance provider, custody, transfer-agent workflow, and legal treatment. Never describe a contract address as approval, registration, listing, or license.
