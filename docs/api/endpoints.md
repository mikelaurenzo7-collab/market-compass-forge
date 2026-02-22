# Endpoints and Query Parameters

All endpoints are invoked as `GET /functions/v1/api-access?action=<action>`.

## Core dataset actions

| Action | Description | Query params |
| --- | --- | --- |
| `companies` | Company directory | `search`, `sector`, `stage`, `market_type` |
| `market-data` | Public market metrics | `ticker`, `company_id`, `min_market_cap`, `max_market_cap` |
| `screening` | Combined company + latest financial/public metrics | `sector`, `market_type`, `stage`, `min_revenue`, `max_revenue`, `min_arr` |
| `financials` | Financial time series | `company_id` |
| `funding` | Funding rounds | `company_id` |
| `investors` | Investor database | `search`, `type` |
| `news` | News and sentiment | `company_id`, `sentiment` |

## Product expansion actions

| Action | Description | Query params |
| --- | --- | --- |
| `distressed` | Distressed asset listings | `sector`, `distress_type`, `asset_type`, `status`, `min_discount` |
| `deals` | M&A and transactions | `deal_type`, `industry`, `status`, `min_value` |
| `funds` | Fund performance data | `strategy`, `min_irr`, `vintage_year` |
| `global-opportunities` | Cross-border opportunities | `region`, `country`, `opportunity_type`, `sector`, `min_value` |
| `real-estate` | Private CRE listings | `property_type`, `state`, `city`, `listing_type` |
| `signals` | Intelligence signals | `category`, `sentiment` |
| `precedent-transactions` | Historical transactions and multiples | `sector`, `deal_type` |

## Example calls

```bash
curl -sS \
  -H "Authorization: Bearer lpi_YOUR_KEY" \
  "$SUPABASE_URL/functions/v1/api-access?action=companies&sector=AI/ML&limit=25"
```

```bash
curl -sS \
  -H "Authorization: Bearer lpi_YOUR_KEY" \
  "$SUPABASE_URL/functions/v1/api-access?action=distressed&asset_type=real_estate&min_discount=25"
```
