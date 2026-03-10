# BeastBots Architecture (v1)

## Vision
BeastBots is a premium autonomous operator platform with four lanes:
- Trading Operators (flagship)
- Store Operators (second flagship)
- Social Operators
- Custom Workforce Pods

## Runtime model
- Cloudflare Workers + Durable Objects
- One durable object per tenant+operator runtime
- Trading loops target 1-second cadence where exchange limits permit
- Non-trading loops run scheduled cadences based on policy

## Safety model
1. Policy checks
2. Approval queue for high-risk actions
3. Budget caps
4. Circuit breakers + kill switches
5. Immutable audit trail

## Learning model
- Tenant memory isolated by default
- Opt-in aggregate improvements only
- No silent cross-tenant raw data sharing
