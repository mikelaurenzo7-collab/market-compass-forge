"""CSV portfolio ingestion with validation and data quality report."""
import csv
import io
from typing import Any

EXPECTED_COLUMNS = [
    "company_name", "sector", "region", "entry_valuation", "current_valuation",
    "leverage", "revenue_growth", "debt", "equity", "exit_year_estimate",
    "cost_basis", "current_value", "expected_exit_years",
]
REQUIRED = ["company_name"]
NUMERIC = ["entry_valuation", "current_valuation", "leverage", "revenue_growth", "debt", "equity", "exit_year_estimate", "cost_basis", "current_value", "expected_exit_years"]


def parse_csv(content: str | bytes) -> tuple[list[dict], dict]:
    """Parse CSV and return (rows, quality_report)."""
    if isinstance(content, bytes):
        content = content.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(content))
    rows = []
    missing = []
    outliers = []
    invalid_sectors = []
    seen_sectors = set()

    for i, row in enumerate(reader):
        row_clean = {k.strip().lower().replace(" ", "_"): v for k, v in row.items() if k}
        if not any(row_clean.get(c) for c in REQUIRED):
            continue
        for c in REQUIRED:
            if not row_clean.get(c):
                missing.append({"row": i + 2, "field": c})
        for c in NUMERIC:
            val = row_clean.get(c)
            if val is not None and str(val).strip():
                try:
                    v = float(str(val).replace(",", ""))
                    if c in ("leverage", "revenue_growth") and (v < -1 or v > 2):
                        outliers.append({"row": i + 2, "field": c, "value": v})
                except ValueError:
                    missing.append({"row": i + 2, "field": c})
        sec = row_clean.get("sector", "").strip()
        if sec:
            seen_sectors.add(sec)

        mapped = {
            "company_name": row_clean.get("company_name", "").strip(),
            "sector": row_clean.get("sector", "default"),
            "cost_basis": _float(row_clean.get("cost_basis") or row_clean.get("entry_valuation")),
            "current_value": _float(row_clean.get("current_value") or row_clean.get("current_valuation")),
            "expected_exit_years": _float(row_clean.get("exit_year_estimate")) or 5,
            "revenue_growth": _float(row_clean.get("revenue_growth")) or 0.1,
            "leverage": _float(row_clean.get("leverage")) or 0,
        }
        rows.append(mapped)

    quality_report = {
        "total_rows": len(rows),
        "missing_fields": missing[:20],
        "outliers": outliers[:20],
        "sectors_found": list(seen_sectors),
    }
    return rows, quality_report


def _float(v: Any) -> float | None:
    if v is None or str(v).strip() == "":
        return None
    try:
        return float(str(v).replace(",", ""))
    except ValueError:
        return None
