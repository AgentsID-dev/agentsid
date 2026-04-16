"""AgentsID Grade badge — embeddable SVG for MCP tool READMEs.

Route: GET /badge/{slug}.svg[?size=sm|md|lg][&theme=dark|light]

The SVG is served with a 1 hour cache and permissive CORS so it renders
in GitHub README camo-proxied img tags.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from fastapi import APIRouter
from fastapi.responses import Response

router = APIRouter(tags=["badge"])


# Grade color tokens — must match web/src/components/shared/grade.tsx
GRADE_COLORS: dict[str, str] = {
    "A": "#10b981",
    "B": "#22c55e",
    "C": "#eab308",
    "D": "#f97316",
    "F": "#ef4444",
}

GRADE_NAMES: dict[str, str] = {
    "A": "Trusted",
    "B": "Sound",
    "C": "Monitor",
    "D": "Risky",
    "F": "Hostile",
}

# When the grade is C (yellow), black text has better contrast than white
GRADE_FG: dict[str, str] = {
    "A": "#ffffff",
    "B": "#ffffff",
    "C": "#1a1a00",
    "D": "#ffffff",
    "F": "#ffffff",
}


@dataclass(frozen=True)
class BadgeSize:
    height: int
    font_size: int
    tag_px_per_char: float
    grade_px_per_char: float
    pad_x: int
    dot_r: int


_SIZE_PRESETS: dict[str, BadgeSize] = {
    "sm": BadgeSize(height=20, font_size=11, tag_px_per_char=6.5, grade_px_per_char=6.8, pad_x=8, dot_r=2),
    "md": BadgeSize(height=28, font_size=13, tag_px_per_char=7.6, grade_px_per_char=7.9, pad_x=10, dot_r=3),
    "lg": BadgeSize(height=36, font_size=16, tag_px_per_char=9.4, grade_px_per_char=9.8, pad_x=14, dot_r=4),
}


@dataclass(frozen=True)
class BadgeTheme:
    tag_bg: str
    tag_fg: str


_THEMES: dict[str, BadgeTheme] = {
    "dark":  BadgeTheme(tag_bg="#09090b", tag_fg="#fafafa"),
    "light": BadgeTheme(tag_bg="#fafafa", tag_fg="#09090b"),
}


def _render_svg(
    grade_letter: str,
    grade_name: str,
    size: BadgeSize,
    theme: BadgeTheme,
    show_name: bool = True,
) -> str:
    """Render a two-segment badge SVG: [• AgentsID][ GRADE · NAME ]"""

    tag_text = "AgentsID"
    # Left (tag) width: padding + dot + gap + text + padding
    dot_gap = 6
    tag_text_w = size.tag_px_per_char * len(tag_text)
    tag_w = int(size.pad_x + size.dot_r * 2 + dot_gap + tag_text_w + size.pad_x)

    # Right (grade) width: padding + text + padding.
    # `&#183;` is the XML numeric entity for MIDDLE DOT — encoding-safe when the
    # SVG is embedded in README renders that may not declare UTF-8 charset.
    if show_name:
        grade_text_display = f"{grade_letter} &#183; {grade_name}"
        grade_text_len = len(grade_letter) + 3 + len(grade_name)  # "X · Name"
    else:
        grade_text_display = grade_letter
        grade_text_len = len(grade_letter)
    grade_text_w = size.grade_px_per_char * grade_text_len
    grade_w = int(size.pad_x + grade_text_w + size.pad_x)

    total_w = tag_w + grade_w
    h = size.height

    grade_color = GRADE_COLORS.get(grade_letter, "#6b7280")
    grade_fg = GRADE_FG.get(grade_letter, "#ffffff")

    # Accessible alt text — screen readers + GitHub preview
    alt = f"AgentsID Grade {grade_letter} — {grade_name}"

    # Font stack: DejaVu Sans first (ubiquitous in shields.io-like camo rendering),
    # then Inter (our brand), then system-ui.
    font_family = "DejaVu Sans,Verdana,Geneva,sans-serif"

    dot_cx = size.pad_x + size.dot_r
    dot_cy = h // 2
    tag_text_x = dot_cx + size.dot_r + dot_gap
    grade_text_x = tag_w + size.pad_x

    # Vertically center text: most fonts sit baseline at 0.72 of height
    text_y = int(h * 0.68) + 1

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_w}" height="{h}" '
        f'viewBox="0 0 {total_w} {h}" role="img" aria-label="{alt}">'
        f'<title>{alt}</title>'
        # Rounded corners via clip
        f'<rect rx="3" width="{total_w}" height="{h}" fill="{theme.tag_bg}"/>'
        f'<rect x="{tag_w}" width="{grade_w}" height="{h}" fill="{grade_color}"/>'
        # Re-draw left side with its bg (clipped area is covered)
        f'<rect rx="3" width="{tag_w}" height="{h}" fill="{theme.tag_bg}"/>'
        # Amber live dot
        f'<circle cx="{dot_cx}" cy="{dot_cy}" r="{size.dot_r}" fill="#f59e0b"/>'
        f'<g font-family="{font_family}" font-size="{size.font_size}" '
        f'text-rendering="geometricPrecision" font-weight="600">'
        f'<text x="{tag_text_x}" y="{text_y}" fill="{theme.tag_fg}">{tag_text}</text>'
        f'<text x="{grade_text_x}" y="{text_y}" fill="{grade_fg}" font-weight="800">{grade_text_display}</text>'
        f'</g>'
        f'</svg>'
    )
    return svg


def _not_found_svg(size: BadgeSize, theme: BadgeTheme) -> str:
    """Badge for slugs we don't have an entry for."""
    return _render_svg(
        grade_letter="?",
        grade_name="not scanned",
        size=size,
        theme=theme,
        show_name=True,
    ).replace('fill="#6b7280"', 'fill="#71717a"')


def _lookup_grade(slug: str) -> str | None:
    """Resolve a slug to a grade letter using the scanner registry index."""
    # Lazy import to avoid circular dep with app.py
    from src.app import _get_registry_index

    import re

    if not re.match(r'^[\w\-@.]+$', slug):
        return None

    index = _get_registry_index()
    slug_clean = slug.replace("@", "").replace("/", "-").lstrip("-")

    entry = index.get(slug) or index.get(slug_clean)
    if not entry:
        return None

    grade = entry.get("grade")
    if grade not in GRADE_COLORS:
        return None
    return grade


@router.get("/badge/{slug}.svg")
async def badge_svg(
    slug: str,
    size: Literal["sm", "md", "lg"] = "md",
    theme: Literal["dark", "light"] = "dark",
    style: Literal["flat"] = "flat",
) -> Response:
    """Serve an embeddable AgentsID Grade badge for `slug`.

    Example:
      https://agentsid.dev/badge/notion-mcp.svg
      https://agentsid.dev/badge/notion-mcp.svg?size=lg&theme=light
    """
    _ = style  # currently only 'flat' is supported; param reserved for future styles

    size_preset = _SIZE_PRESETS[size]
    theme_preset = _THEMES[theme]

    grade = _lookup_grade(slug)
    if grade is None:
        svg = _not_found_svg(size_preset, theme_preset)
        cache_seconds = 300  # shorter cache on misses so new scans propagate quickly
    else:
        svg = _render_svg(
            grade_letter=grade,
            grade_name=GRADE_NAMES[grade],
            size=size_preset,
            theme=theme_preset,
        )
        cache_seconds = 3600  # 1 hour

    return Response(
        content=svg,
        media_type="image/svg+xml; charset=utf-8",
        headers={
            "Cache-Control": f"public, max-age={cache_seconds}, s-maxage={cache_seconds}",
            # GitHub's camo proxy needs permissive CORS to render SVGs in READMEs
            "Access-Control-Allow-Origin": "*",
            # Tell downstream proxies to vary on size/theme so the camo caches work
            "Vary": "Accept",
        },
    )
