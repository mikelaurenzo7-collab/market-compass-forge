"""Scenario and scenario template models. Pure data classes."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Scenario:
    """User-defined scenario with macro levers."""
    name: str
    params: dict[str, Any] = field(default_factory=dict)
    sector_overrides: dict[str, dict] = field(default_factory=dict)


@dataclass
class ScenarioTemplate:
    """Built-in scenario template."""
    id: str
    name: str
    slug: str
    description: str = ""
    params: dict[str, Any] = field(default_factory=dict)
