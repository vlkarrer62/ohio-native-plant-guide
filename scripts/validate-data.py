#!/usr/bin/env python3
"""Validate JSON data files against HTML profiles and assets."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
PLANTS_DIR = ROOT / "plants"
HABITATS_DIR = ROOT / "habitats"
WILDLIFE_DIR = ROOT / "wildlife"
IMAGES_DIR = ROOT / "images"


def load_json(path: Path) -> list | dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def plant_html_slugs() -> set[str]:
    return {
        path.stem
        for path in PLANTS_DIR.glob("*.html")
        if path.name != "index.html"
    }


def habitat_slugs(habitats: list) -> set[str]:
    slugs = set()
    for habitat in habitats:
        if habitat.get("slug"):
            slugs.add(habitat["slug"])
        elif habitat.get("url"):
            slugs.add(habitat["url"].replace(".html", ""))
    return slugs


def wildlife_slugs(wildlife: list) -> set[str]:
    slugs = set()
    for entry in wildlife:
        if entry.get("slug"):
            slugs.add(entry["slug"])
        elif entry.get("url"):
            slugs.add(entry["url"].replace(".html", ""))
    return slugs


def resolve_image(path: str) -> Path:
    normalized = path.replace("\\", "/")
    if normalized.startswith("../"):
        return ROOT / normalized[3:]
    if normalized.startswith("images/"):
        return ROOT / normalized
    return IMAGES_DIR / Path(normalized).name


MOISTURE_FROM_TEXT = (
    ("Wet", re.compile(r"\bwet\b", re.I)),
    ("Moist", re.compile(r"\bmoist\b", re.I)),
    ("Medium", re.compile(r"\bmedium\b", re.I)),
    ("Dry", re.compile(r"\bdry\b", re.I)),
)

HEIGHT_PATTERN = re.compile(r"\b(feet|inches)\b", re.I)


def moisture_tags_from_text(text: str) -> set[str]:
    return {label for label, pattern in MOISTURE_FROM_TEXT if pattern.search(text)}


def validate_plant_schema(plant: dict) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    slug = plant.get("slug", "(unknown)")

    if plant.get("native") is not True:
        errors.append(f"{slug}: native must be true for directory entries")

    height = plant.get("height", "")
    if HEIGHT_PATTERN.search(height):
        errors.append(f"{slug}: height should use ft/in, not feet/inches ({height!r})")

    garden = plant.get("garden")
    if garden is not None and not isinstance(garden, list):
        errors.append(f"{slug}: garden must be an array when present")

    moisture = plant.get("moisture", "")
    moisture_tags = set(plant.get("moistureTags", []))
    expected_moisture = moisture_tags_from_text(moisture)
    missing_moisture = expected_moisture - moisture_tags
    if missing_moisture:
        errors.append(
            f"{slug}: moistureTags missing {sorted(missing_moisture)} for text {moisture!r}"
        )

    season = plant.get("season", "")
    bloom_tags = set(plant.get("bloomSeasonTags", []))
    if re.search(r"\bwinter\b", season, re.I) and "Winter" not in bloom_tags:
        errors.append(f"{slug}: bloomSeasonTags must include Winter for season {season!r}")

    return errors, warnings


def validate_plants(plants: list, html_slugs: set[str], habitat_set: set[str], wildlife_set: set[str]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    slugs: set[str] = set()
    all_plant_slugs = {plant.get("slug") for plant in plants if plant.get("slug")}

    for plant in plants:
        slug = plant.get("slug", "")
        url = plant.get("url", "")

        schema_errors, schema_warnings = validate_plant_schema(plant)
        errors.extend(schema_errors)
        warnings.extend(schema_warnings)

        if not slug:
            errors.append(f"Plant missing slug: {plant.get('commonName', '(unknown)')}")
            continue

        if slug in slugs:
            errors.append(f"Duplicate plant slug: {slug}")
        slugs.add(slug)

        expected = url.replace(".html", "") if url else ""
        if expected and slug != expected:
            errors.append(f"{slug}: slug does not match url ({url})")

        if slug not in html_slugs:
            errors.append(f"{slug}: no matching plants/{slug}.html")

        for related in plant.get("relatedPlantSlugs", []):
            if related not in all_plant_slugs:
                errors.append(f"{slug}: relatedPlantSlugs references unknown plant '{related}'")

        for related in plant.get("relatedHabitatSlugs", []):
            if related not in habitat_set:
                warnings.append(f"{slug}: relatedHabitatSlugs references unbuilt habitat '{related}'")

        for related in plant.get("relatedWildlifeSlugs", []):
            if related not in wildlife_set:
                errors.append(f"{slug}: relatedWildlifeSlugs references unknown wildlife '{related}'")

        garden = plant.get("garden")
        if not garden:
            continue

        for photo in garden:
            src = photo.get("src")
            if not src:
                continue
            image_path = resolve_image(src)
            if not image_path.is_file():
                errors.append(f"{slug}: missing garden image {src}")

    json_slugs = {plant["slug"] for plant in plants if plant.get("slug")}
    optional_html = {"catmint"}
    for html_slug in sorted(html_slugs - json_slugs - optional_html):
        errors.append(f"HTML profile missing from plants.json: {html_slug}")
    for html_slug in sorted((html_slugs - json_slugs) & optional_html):
        warnings.append(f"Optional HTML profile not listed in plants.json: {html_slug}")

    return errors, warnings


def validate_related_lists(label: str, entries: list, plant_slugs: set[str], habitat_set: set[str], wildlife_set: set[str]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    for entry in entries:
        slug = entry.get("slug") or entry.get("url", "").replace(".html", "")
        name = entry.get("commonName") or entry.get("name") or slug

        for related in entry.get("relatedPlantSlugs", []):
            if related not in plant_slugs:
                errors.append(f"{label} '{name}': relatedPlantSlugs references unknown plant '{related}'")

        for related in entry.get("relatedHabitatSlugs", []):
            if related not in habitat_set:
                warnings.append(f"{label} '{name}': relatedHabitatSlugs references unbuilt habitat '{related}'")

        for related in entry.get("relatedWildlifeSlugs", []):
            if related not in wildlife_set:
                errors.append(f"{label} '{name}': relatedWildlifeSlugs references unknown wildlife '{related}'")

    return errors, warnings


def main() -> int:
    plants = load_json(DATA / "plants.json")
    habitats = load_json(DATA / "habitats.json")
    wildlife = load_json(DATA / "wildlife.json")

    html_slugs = plant_html_slugs()
    habitat_set = habitat_slugs(habitats)
    wildlife_set = wildlife_slugs(wildlife)
    plant_slug_set = {plant["slug"] for plant in plants if plant.get("slug")}

    errors: list[str] = []
    warnings: list[str] = []

    plant_errors, plant_warnings = validate_plants(plants, html_slugs, habitat_set, wildlife_set)
    errors.extend(plant_errors)
    warnings.extend(plant_warnings)

    for label, entries in (("Habitat", habitats), ("Wildlife", wildlife)):
        entry_errors, entry_warnings = validate_related_lists(label, entries, plant_slug_set, habitat_set, wildlife_set)
        errors.extend(entry_errors)
        warnings.extend(entry_warnings)

    if warnings:
        print(f"{len(warnings)} warning(s) (planned content):\n")
        for warning in warnings:
            print(f"  - {warning}")
        print()

    if errors:
        print(f"Found {len(errors)} error(s):\n")
        for error in errors:
            print(f"  - {error}")
        return 1

    print("Data validation passed.")
    print(f"  Plants:   {len(plants)} entries, {len(html_slugs)} HTML profiles")
    print(f"  Habitats: {len(habitats)} defined ({len(habitat_set)} slugs)")
    print(f"  Wildlife: {len(wildlife)} entries")
    if warnings:
        print(f"  Warnings: {len(warnings)} (unbuilt habitat references)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
