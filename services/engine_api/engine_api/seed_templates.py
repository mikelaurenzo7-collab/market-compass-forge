"""Seed scenario templates for engine."""
from engine_api.models import ScenarioTemplateModel


def ensure_templates(db):
    templates = [
        ("Rates Up 200bps", "rates-up-200bps", {"rates_delta_bps": 200, "gdp_delta": -0.01}),
        ("Recession", "recession", {"gdp_delta": -0.03, "multiple_compression": -0.2}),
        ("Liquidity Crunch", "liquidity-crunch", {"exit_delay_years": 2, "multiple_compression": -0.15}),
    ]
    for name, slug, params in templates:
        if not db.query(ScenarioTemplateModel).filter(ScenarioTemplateModel.slug == slug).first():
            t = ScenarioTemplateModel(name=name, slug=slug, params=params)
            db.add(t)
    db.commit()
