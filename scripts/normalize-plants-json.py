#!/usr/bin/env python3
"""Normalize plants.json field formats in place."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLANTS_PATH = ROOT / "data" / "plants.json"

MOISTURE_FROM_TEXT = (
    ("Wet", re.compile(r"\bwet\b", re.I)),
    ("Moist", re.compile(r"\bmoist\b", re.I)),
    ("Medium", re.compile(r"\bmedium\b", re.I)),
    ("Dry", re.compile(r"\bdry\b", re.I)),
)


def normalize_height(value: str) -> str:
    text = value.strip()
    text = re.sub(r"(\d)\s*feet\b", r"\1 ft", text, flags=re.I)
    text = re.sub(r"\bfeet\b", "ft", text, flags=re.I)
    text = re.sub(r"(\d)\s*inches\b", r"\1 in", text, flags=re.I)
    text = re.sub(r"\binches\b", "in", text, flags=re.I)
    text = re.sub(r"\b(to\s+\d+)\)(?! ft)", r"\1 ft)", text, flags=re.I)
    return text


def moisture_tags_from_text(text: str) -> list[str]:
    tags: list[str] = []
    for label, pattern in MOISTURE_FROM_TEXT:
        if pattern.search(text):
            tags.append(label)
    return tags


def merge_moisture_tags(existing: list[str], text: str) -> list[str]:
    order = ["Dry", "Medium", "Moist", "Wet"]
    merged = set(existing) | set(moisture_tags_from_text(text))
    return [tag for tag in order if tag in merged]


def normalize_garden(garden: object) -> list[dict] | None:
    if garden is None:
        return None
    if isinstance(garden, dict):
        return [garden]
    if isinstance(garden, list):
        return garden
    raise TypeError(f"Unsupported garden type: {type(garden)!r}")


def normalize_plant(plant: dict) -> dict:
    plant = dict(plant)
    plant["native"] = True
    plant["height"] = normalize_height(plant.get("height", ""))

    if "moisture" in plant:
        plant["moistureTags"] = merge_moisture_tags(
            plant.get("moistureTags", []),
            plant["moisture"],
        )

    if "garden" in plant:
        plant["garden"] = normalize_garden(plant["garden"])

    # Witch hazel blooms into winter — ensure filter tag matches season label.
    if plant.get("slug") == "witch-hazel":
        tags = list(plant.get("bloomSeasonTags", []))
        if "Winter" not in tags:
            tags.append("Winter")
        plant["bloomSeasonTags"] = tags

    return plant


def main() -> int:
    plants = json.loads(PLANTS_PATH.read_text(encoding="utf-8"))
    normalized = [normalize_plant(plant) for plant in plants]
    PLANTS_PATH.write_text(
        json.dumps(normalized, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Normalized {len(normalized)} plant entries in {PLANTS_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
