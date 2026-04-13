"""
Generate a BetAutopsy TikTok end card (1080x1920 PNG).

Run: python3 scripts/generate-tiktok-endcard.py
Output: public/brand/tiktok-endcard.png

TikTok safe zones (important — the UI still overlays the video even on
the end frame):
  - Top ~280px: username + caption overlay
  - Right ~180px: like/comment/share/avatar action column
  - Bottom ~480px: caption, handle, music ticker, progress bar

Conservative usable area: x=60..900, y=280..1440.

Design: forensic case-file aesthetic matching /go and /sample. Charcoal
base with subtle grid paper + teal radial glow, 3-line headline, mini
sample case card (grade + vitals + top bias), and a big teal pill CTA
button. No URL text (the button carries the CTA; the real URL lives in
the TikTok bio). Uses IBM Plex Mono throughout.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "public" / "fonts"
OUT = ROOT / "public" / "brand" / "tiktok-endcard.png"

# ── Canvas ──
W, H = 1080, 1920

# ── Safe zone (conservative, content lives inside this rect) ──
SAFE_L, SAFE_R = 60, 900
SAFE_T, SAFE_B = 280, 1440

# ── Brand palette ──
BG = (10, 10, 18)
CARD = (22, 22, 34)
CARD_BORDER = (34, 34, 48)
SCALPEL = (0, 201, 167)
BLEED = (196, 70, 58)
CAUTION = (201, 160, 78)
FG_BRIGHT = (246, 240, 255)
FG_MUTED = (139, 149, 165)
FG_DIM = (90, 98, 112)


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
    """Charcoal base + subtle grid paper + soft teal + bleed glows."""
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
    """Draw a HIGH SEVERITY style badge anchored at right_x, vertically
    centered at center_y."""
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
    """Big teal pill button with centered dark text."""
    x1 = center_x - width // 2
    x2 = center_x + width // 2
    y1 = y
    y2 = y + height
    d.rounded_rectangle([(x1, y1), (x2, y2)], radius=height // 2, fill=SCALPEL)

    font = bold(48)
    text_w = tw(d, text, font)
    # Pillow's mono baseline sits a bit high — nudge down 4px for visual center
    text_h = th(d, text, font)
    text_x = center_x - text_w // 2
    text_y = y1 + (height - text_h) // 2 - 6
    d.text((text_x, text_y), text, font=font, fill=(10, 10, 18))


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

    # ── Subtitle (1 line, tight) ──
    sub_y = 750
    d.text(
        (SAFE_L, sub_y),
        "47 SIGNALS  ·  5 CHAPTERS  ·  60 SECONDS",
        font=medium(32),
        fill=FG_MUTED,
    )

    # ── Mini sample case card ──
    card_x = SAFE_L                  # 60
    card_y = 820
    card_w = SAFE_R - SAFE_L          # 840
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
    # Left accent bar — bleed red
    d.rectangle(
        [(card_x, card_y + 4), (card_x + 5, card_bottom - 4)],
        fill=BLEED,
    )

    # Header row: case number + severity badge
    hr_y = card_y + 42
    d.text((card_x + 40, hr_y - 4), "CASE #BA-SAMPLE", font=medium(26), fill=FG_DIM)
    draw_severity_badge(d, card_right - 40, hr_y + 14, "HIGH SEVERITY")

    # Grade block (left half of card)
    gx = card_x + 40
    gy = card_y + 118
    d.text((gx, gy), "OVERALL GRADE", font=medium(22), fill=FG_DIM)
    d.text((gx - 4, gy + 34), "C+", font=bold(120), fill=CAUTION)

    # Vitals column (right half) — EMOTION stacked above NET P&L
    vx = card_x + 380
    v1_y = card_y + 118
    d.text((vx, v1_y), "EMOTION", font=medium(22), fill=FG_DIM)
    d.text((vx, v1_y + 30), "67", font=bold(52), fill=CAUTION)
    d.text((vx + 110, v1_y + 48), "/100", font=medium(26), fill=FG_MUTED)

    v2_y = card_y + 230
    d.text((vx, v2_y), "NET P&L", font=medium(22), fill=FG_DIM)
    d.text((vx, v2_y + 30), "-$2,847", font=bold(52), fill=BLEED)

    # Divider + TOP BIAS row (bottom of card)
    tb_y = card_bottom - 72
    d.line(
        [(card_x + 40, tb_y - 20), (card_right - 40, tb_y - 20)],
        fill=CARD_BORDER,
        width=2,
    )
    d.text((card_x + 40, tb_y - 4), "TOP BIAS", font=medium(22), fill=FG_DIM)
    d.text((card_x + 40, tb_y + 24), "LOSS CHASING", font=bold(32), fill=BLEED)
    cost_text = "-$1,240 / QTR"
    cost_w = tw(d, cost_text, bold(28))
    d.text((card_right - 40 - cost_w, tb_y + 28), cost_text, font=bold(28), fill=BLEED)

    # ── Disclaimer (small, sits above the button) ──
    disc_y = 1260
    disc = "For entertainment only  ·  18+  ·  1-800-GAMBLER"
    disc_w = tw(d, disc, light(22))
    safe_cx = (SAFE_L + SAFE_R) // 2
    d.text((safe_cx - disc_w // 2, disc_y), disc, font=light(22), fill=FG_DIM)

    # ── CTA pill button ──
    draw_cta_button(
        d,
        center_x=safe_cx,
        y=1300,
        text="GET YOUR REPORT  →",
        width=700,
        height=120,
    )

    # ── Save ──
    final = img.convert("RGB")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    final.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({W}x{H})")


if __name__ == "__main__":
    build()
