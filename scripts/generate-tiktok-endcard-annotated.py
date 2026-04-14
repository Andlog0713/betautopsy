"""
Generate a BetAutopsy TikTok static ad variant: Annotated Case File.

Run: python3 scripts/generate-tiktok-endcard-annotated.py
Output: public/brand/tiktok-endcard-annotated.png

Same core composition as scripts/generate-tiktok-endcard.py (the current
winning TikTok static), but with a red hand-drawn investigator-markup
layer: an imperfect Sharpie circle around the NET P&L number and a
curved arrow pointing down to LOSS CHASING. Designed as the "B" variant
for a 50/50 A/B test in TikTok Ads Manager against the base endcard.

CTA text also changes from "GET YOUR REPORT" to "SEE YOUR LEAKS" so the
click action completes the headline sentence ("FIND YOUR BETTING LEAKS"
-> "SEE YOUR LEAKS").

Stats are module-level constants so generating additional variants with
different grades / dollar amounts / top biases is a matter of changing
5 constants without touching layout code.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import math
import random

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "public" / "fonts"
OUT = ROOT / "public" / "brand" / "tiktok-endcard-annotated.png"

# ── Overridable stats (change these to render A/B variants without
# touching layout code) ──
GRADE = "C+"
EMOTION = "67"
NET_PNL = "-$2,847"
TOP_BIAS = "LOSS CHASING"
QUARTERLY_COST = "-$1,240 / QTR"
CASE_NUMBER = "CASE #BA-SAMPLE"
CTA_TEXT = "SEE YOUR LEAKS  \u2192"

# ── Canvas ──
W, H = 1080, 1920

# ── Safe zone (matches base endcard, respects TikTok UI overlay) ──
SAFE_L, SAFE_R = 60, 900
SAFE_T, SAFE_B = 280, 1440

# ── Brand palette (matches base endcard exactly) ──
BG = (10, 10, 18)
CARD = (22, 22, 34)
CARD_BORDER = (34, 34, 48)
SCALPEL = (0, 201, 167)
BLEED = (196, 70, 58)
CAUTION = (201, 160, 78)
FG_BRIGHT = (246, 240, 255)
FG_MUTED = (139, 149, 165)
FG_DIM = (90, 98, 112)
MARKER = (220, 38, 38)  # #DC2626 — hand-drawn annotation layer only


def f(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_DIR / name), size)


def bold(size: int):
    return f("IBMPlexMono-Bold.ttf", size)


def medium(size: int):
    return f("IBMPlexMono-Medium.ttf", size)


def light(size: int):
    return f("IBMPlexMono-Light.ttf", size)


def tw(draw: ImageDraw.ImageDraw, text: str, font) -> int:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def th(draw: ImageDraw.ImageDraw, text: str, font) -> int:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[3] - bbox[1]


def make_base() -> Image.Image:
    """Charcoal base + subtle grid paper + teal and bleed glows.
    Identical to the base endcard — keeps the winning palette."""
    img = Image.new("RGBA", (W, H), BG + (255,))

    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for x in range(0, W + 1, 48):
        gd.line([(x, 0), (x, H)], fill=(0, 201, 167, 14), width=1)
    for y in range(0, H + 1, 48):
        gd.line([(0, y), (W, y)], fill=(0, 201, 167, 14), width=1)
    img = Image.alpha_composite(img, grid)

    # Teal radial glow behind headline
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(
        [(W // 2 - 450, 250), (W // 2 + 450, 900)],
        fill=(0, 201, 167, 70),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(100))
    img = Image.alpha_composite(img, glow)

    # Faint bleed glow behind case card
    glow2 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow2)
    gd.ellipse(
        [(W // 2 - 500, 950), (W // 2 + 500, 1450)],
        fill=(196, 70, 58, 35),
    )
    glow2 = glow2.filter(ImageFilter.GaussianBlur(120))
    img = Image.alpha_composite(img, glow2)

    return img


def draw_severity_badge(
    d: ImageDraw.ImageDraw,
    right_x: int,
    center_y: int,
    text: str,
) -> None:
    font = bold(22)
    text_w = tw(d, text, font)
    pad_x, pad_y = 16, 10
    h = 40
    w = text_w + pad_x * 2
    x1 = right_x - w
    y1 = center_y - h // 2
    d.rounded_rectangle([(x1, y1), (x1 + w, y1 + h)], radius=4, fill=BLEED)
    d.text((x1 + pad_x, y1 + pad_y - 4), text, font=font, fill=(10, 10, 18))


def draw_cta_button(
    d: ImageDraw.ImageDraw,
    center_x: int,
    y: int,
    text: str,
    width: int = 680,
    height: int = 120,
) -> None:
    x1 = center_x - width // 2
    x2 = center_x + width // 2
    y1 = y
    y2 = y + height
    d.rounded_rectangle([(x1, y1), (x2, y2)], radius=height // 2, fill=SCALPEL)

    font = bold(48)
    text_w = tw(d, text, font)
    text_h = th(d, text, font)
    text_x = center_x - text_w // 2
    text_y = y1 + (height - text_h) // 2 - 6
    d.text((text_x, text_y), text, font=font, fill=(10, 10, 18))


def draw_annotation(img: Image.Image) -> Image.Image:
    """Hand-drawn-looking red marker annotation layer.

    Draws an imperfect ellipse around the NET P&L number and a curved
    arrow pointing down to TOP BIAS. Rendered on a separate RGBA layer
    then rotated slightly for a more organic feel before being alpha-
    composited back onto the main image.

    Deterministic perturbation via a fixed RNG seed (42) so the
    "imperfect" Sharpie strokes are reproducible across runs — we don't
    want the annotation to jitter between renders during A/B testing.
    """
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)

    STROKE = 7
    rng = random.Random(42)

    # ── Imperfect ellipse around the NET P&L number ──
    # Layout math: card starts at y=820. Vitals column at x=card_x+380=440.
    # v2_y = card_y + 230 = 1050 (NET P&L label). Value text drawn at
    # (440, 1080) in Plex Mono Bold 52. "-$2,847" spans ~200px wide, ~55px
    # tall, so the visual center of the value sits around (540, 1108).
    # Circle center pushed down to 1120 and ry tightened to 46 so the
    # circle's top edge sits BELOW the "NET P&L" label above it (label is
    # at y=1050, ~22px tall, so label bottom is ~1072; circle top at
    # 1120-46=1074 clears it).
    cx, cy = 540, 1120
    rx, ry = 140, 46

    # Generate points along the ellipse with slight perturbations.
    # Overshoot past 2*pi so the stroke "closes imperfectly" — one end
    # passes slightly past where it started, like a real Sharpie.
    circle_points = []
    n_pts = 96
    overshoot = 0.18  # extra fraction of 2*pi
    for i in range(n_pts + 1):
        # Start at the top of the ellipse and sweep clockwise.
        t = (i / n_pts) * (2 * math.pi * (1 + overshoot)) - math.pi / 2
        px = cx + rx * math.cos(t) + rng.uniform(-3, 3)
        py = cy + ry * math.sin(t) + rng.uniform(-3, 3)
        circle_points.append((px, py))

    ld.line(circle_points, fill=MARKER, width=STROKE, joint="curve")

    # ── Curved arrow from the circle down to LOSS CHASING ──
    # Arrow must stay ABOVE the LOSS CHASING text (top at y=1182) or it
    # crosses through the letters. Start from the circle's bottom-center
    # area, curve down-left, and land 6-8px above the text top pointing
    # at the "LO" in "LOSS".
    # Control point is slightly BELOW the start-to-end line so the curve
    # bows downward (investigator-drawn arrows arc, they don't go straight)
    # but stays above the text throughout the curve.
    start = (450, 1162)
    end = (185, 1176)
    ctrl = (320, 1180)

    arrow_points = []
    n_arrow = 44
    for i in range(n_arrow + 1):
        t = i / n_arrow
        # Quadratic Bezier
        px = (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * ctrl[0] + t ** 2 * end[0]
        py = (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * ctrl[1] + t ** 2 * end[1]
        px += rng.uniform(-1.5, 1.5)
        py += rng.uniform(-1.5, 1.5)
        arrow_points.append((px, py))

    ld.line(arrow_points, fill=MARKER, width=STROKE, joint="curve")

    # Arrowhead: tangent at t=1 on a quadratic Bezier is proportional to
    # (end - ctrl). Normalize and rotate +/- spread to get whiskers.
    tan_x = end[0] - ctrl[0]
    tan_y = end[1] - ctrl[1]
    tan_len = math.hypot(tan_x, tan_y)
    if tan_len > 0:
        ux, uy = tan_x / tan_len, tan_y / tan_len
    else:
        ux, uy = 1.0, 0.0

    head_len = 26
    spread = math.radians(30)
    cos_s, sin_s = math.cos(spread), math.sin(spread)
    # Left whisker (rotate unit tangent by +spread, extend backward from end)
    lwx = end[0] - head_len * (ux * cos_s - uy * sin_s)
    lwy = end[1] - head_len * (uy * cos_s + ux * sin_s)
    # Right whisker (rotate by -spread)
    rwx = end[0] - head_len * (ux * cos_s + uy * sin_s)
    rwy = end[1] - head_len * (uy * cos_s - ux * sin_s)

    ld.line([end, (lwx, lwy)], fill=MARKER, width=STROKE, joint="curve")
    ld.line([end, (rwx, rwy)], fill=MARKER, width=STROKE, joint="curve")

    # NOTE: originally this layer got a -2deg rotation for a more
    # hand-drawn feel, but rotating around the canvas center drifts
    # points far from center (the arrow end was shifting ~12px down,
    # pushing the tip into the LOSS CHASING text). The random
    # perturbations baked into the Bezier points already carry the
    # hand-drawn character on their own, so rotation is skipped for
    # layout stability.
    return Image.alpha_composite(img, layer)


def build():
    img = make_base()
    d = ImageDraw.Draw(img)

    # ── Top eyebrow ──
    ey = SAFE_T  # 280
    d.text((SAFE_L, ey), "CASE FILE // EXHIBIT A", font=medium(28), fill=FG_DIM)
    d.line([(SAFE_L, ey + 50), (SAFE_L + 260, ey + 50)], fill=SCALPEL, width=3)

    # ── Headline (3 lines) ──
    hy = 400
    line_h = 108
    d.text((SAFE_L, hy), "FIND YOUR", font=bold(92), fill=FG_BRIGHT)
    d.text((SAFE_L, hy + line_h), "BETTING", font=bold(92), fill=FG_BRIGHT)
    d.text((SAFE_L, hy + line_h * 2), "LEAKS.", font=bold(92), fill=SCALPEL)

    # ── Subtitle ──
    sub_y = 750
    d.text(
        (SAFE_L, sub_y),
        "47 SIGNALS  \u00b7  5 CHAPTERS  \u00b7  60 SECONDS",
        font=medium(32),
        fill=FG_MUTED,
    )

    # ── Mini sample case card ──
    card_x = SAFE_L
    card_y = 820
    card_w = SAFE_R - SAFE_L
    card_h = 410
    card_right = card_x + card_w
    card_bottom = card_y + card_h

    d.rounded_rectangle(
        [(card_x, card_y), (card_right, card_bottom)],
        radius=16,
        fill=CARD,
        outline=CARD_BORDER,
        width=2,
    )
    d.rectangle(
        [(card_x, card_y + 4), (card_x + 5, card_bottom - 4)],
        fill=BLEED,
    )

    hr_y = card_y + 42
    d.text((card_x + 40, hr_y - 4), CASE_NUMBER, font=medium(26), fill=FG_DIM)
    draw_severity_badge(d, card_right - 40, hr_y + 14, "HIGH SEVERITY")

    gx = card_x + 40
    gy = card_y + 118
    d.text((gx, gy), "OVERALL GRADE", font=medium(22), fill=FG_DIM)
    d.text((gx - 4, gy + 34), GRADE, font=bold(120), fill=CAUTION)

    vx = card_x + 380
    v1_y = card_y + 118
    d.text((vx, v1_y), "EMOTION", font=medium(22), fill=FG_DIM)
    d.text((vx, v1_y + 30), EMOTION, font=bold(52), fill=CAUTION)
    d.text((vx + 110, v1_y + 48), "/100", font=medium(26), fill=FG_MUTED)

    v2_y = card_y + 230
    d.text((vx, v2_y), "NET P&L", font=medium(22), fill=FG_DIM)
    d.text((vx, v2_y + 30), NET_PNL, font=bold(52), fill=BLEED)

    tb_y = card_bottom - 72
    d.line(
        [(card_x + 40, tb_y - 20), (card_right - 40, tb_y - 20)],
        fill=CARD_BORDER,
        width=2,
    )
    d.text((card_x + 40, tb_y - 4), "TOP BIAS", font=medium(22), fill=FG_DIM)
    d.text((card_x + 40, tb_y + 24), TOP_BIAS, font=bold(32), fill=BLEED)
    cost_w = tw(d, QUARTERLY_COST, bold(28))
    d.text((card_right - 40 - cost_w, tb_y + 28), QUARTERLY_COST, font=bold(28), fill=BLEED)

    # ── Red investigator annotation layer ──
    # Comes AFTER the card is drawn (overlays the number) and BEFORE the
    # CTA/disclaimer (the annotation layer doesn't intrude on them).
    img = draw_annotation(img)
    d = ImageDraw.Draw(img)

    # ── Disclaimer ──
    disc_y = 1220
    disc = "For entertainment only  \u00b7  18+  \u00b7  1-800-GAMBLER"
    disc_w = tw(d, disc, light(22))
    safe_cx = (SAFE_L + SAFE_R) // 2
    d.text((safe_cx - disc_w // 2, disc_y), disc, font=light(22), fill=FG_DIM)

    # ── CTA pill button ──
    draw_cta_button(
        d,
        center_x=safe_cx,
        y=1270,
        text=CTA_TEXT,
        width=720,
        height=120,
    )

    # ── URL reference under the button ──
    url_y = 1410
    url_text = "betautopsy.com/go"
    url_w = tw(d, url_text, bold(32))
    d.text((safe_cx - url_w // 2, url_y), url_text, font=bold(32), fill=SCALPEL)

    # ── Save ──
    final = img.convert("RGB")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    final.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({W}x{H})")


if __name__ == "__main__":
    build()
