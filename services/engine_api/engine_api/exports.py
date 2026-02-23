"""PDF and CSV export generation."""
import csv
import io
import hashlib
import os
from pathlib import Path
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak


EXPORTS_DIR = Path(os.environ.get("EXPORTS_DIR", "/tmp/grapevine_exports"))
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)


def _report_data_to_dict(rd) -> dict:
    return {
        "portfolio_summary": rd.portfolio_summary,
        "scenario_summary": rd.scenario_summary,
        "irr_quantiles": rd.irr_quantiles,
        "moic_quantiles": rd.moic_quantiles,
        "var_95": rd.var_95,
        "cvar_95": rd.cvar_95,
        "downside_prob": rd.downside_prob,
        "mean_irr": rd.mean_irr,
        "n_trials": rd.n_trials,
        "runtime_ms": rd.runtime_ms,
    }


def generate_csv(report_data) -> str:
    """Generate CSV content from ReportData."""
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Section", "Key", "Value"])
    for k, v in report_data.portfolio_summary.items():
        w.writerow(["Portfolio", k, v])
    for k, v in report_data.scenario_summary.items():
        w.writerow(["Scenario", k, str(v)])
    w.writerow(["Metrics", "VaR 95%", report_data.var_95])
    w.writerow(["Metrics", "CVaR 95%", report_data.cvar_95])
    w.writerow(["Metrics", "Downside Prob", report_data.downside_prob])
    w.writerow(["Metrics", "Mean IRR", report_data.mean_irr])
    w.writerow(["Metrics", "N Trials", report_data.n_trials])
    for k, v in report_data.irr_quantiles.items():
        w.writerow(["IRR Quantiles", k, v])
    for k, v in report_data.moic_quantiles.items():
        w.writerow(["MOIC Quantiles", k, v])
    return buf.getvalue()


def generate_pdf(report_data) -> bytes:
    """Generate PDF from ReportData."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, rightMargin=inch, leftMargin=inch, topMargin=inch, bottomMargin=inch)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("Simulation Report", styles["Title"]))
    story.append(Paragraph(f"Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]))
    story.append(Spacer(1, 0.3 * inch))

    story.append(Paragraph("Portfolio Summary", styles["Heading2"]))
    ps = report_data.portfolio_summary
    story.append(Paragraph(f"Total Cost: {ps.get('total_cost', 0):,.2f} | Total Value: {ps.get('total_value', 0):,.2f} | Positions: {ps.get('position_count', 0)}", styles["Normal"]))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("Key Metrics", styles["Heading2"]))
    data = [
        ["VaR 95%", f"{report_data.var_95 * 100:.1f}%"],
        ["CVaR 95%", f"{report_data.cvar_95 * 100:.1f}%"],
        ["Downside Prob", f"{report_data.downside_prob * 100:.1f}%"],
        ["Mean IRR", f"{report_data.mean_irr * 100:.1f}%"],
        ["N Trials", str(report_data.n_trials)],
    ]
    t = Table(data)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.grey), ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke), ("ALIGN", (0, 0), (-1, -1), "LEFT"), ("FONTSIZE", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, 0), 12), ("BACKGROUND", (0, 1), (-1, -1), colors.beige), ("GRID", (0, 0), (-1, -1), 0.5, colors.black)]))
    story.append(t)
    story.append(Spacer(1, 0.3 * inch))

    story.append(Paragraph("IRR Quantiles", styles["Heading2"]))
    iq = list(report_data.irr_quantiles.items())[:7]
    t2 = Table([["Quantile", "IRR"]] + [[k, f"{v * 100:.1f}%"] for k, v in iq])
    t2.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.grey), ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke), ("ALIGN", (0, 0), (-1, -1), "LEFT"), ("GRID", (0, 0), (-1, -1), 0.5, colors.black)]))
    story.append(t2)
    story.append(Spacer(1, 0.3 * inch))

    if report_data.timeseries_percentiles:
        story.append(Paragraph("Timeline (Portfolio Value)", styles["Heading2"]))
        ts = report_data.timeseries_percentiles.get("portfolio_value", [])[:12]
        if ts:
            rows = [["Month", "p5", "p50", "p95"]]
            for s in ts:
                rows.append([str(s.get("month", "")), f"{s.get('p5', 0):.0f}", f"{s.get('p50', 0):.0f}", f"{s.get('p95', 0):.0f}"])
            t3 = Table(rows)
            t3.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.grey), ("GRID", (0, 0), (-1, -1), 0.5, colors.black)]))
            story.append(t3)

    if report_data.contagion_top_impacts:
        story.append(Spacer(1, 0.3 * inch))
        story.append(Paragraph("Contagion Top Impacts", styles["Heading2"]))
        rows = [["Node", "Risk"]] + [[str(x.get("node_id", "")), f"{x.get('risk', 0):.2f}"] for x in report_data.contagion_top_impacts[:10]]
        t4 = Table(rows)
        t4.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.grey), ("GRID", (0, 0), (-1, -1), 0.5, colors.black)]))
        story.append(t4)

    doc.build(story)
    return buf.getvalue()


def save_export(export_type: str, content: str | bytes, simulation_id: str) -> str:
    """Save export to disk, return file path."""
    ext = "csv" if export_type == "csv" else "pdf"
    h = hashlib.sha256(f"{simulation_id}{datetime.utcnow().isoformat()}".encode()).hexdigest()[:12]
    path = EXPORTS_DIR / f"sim_{simulation_id}_{h}.{ext}"
    if isinstance(content, str):
        path.write_text(content)
    else:
        path.write_bytes(content)
    return str(path)
