"""
Generate a BetAutopsy TikTok end card (1080x1920 PNG).

Run: python3 scripts/generate-tiktok-endcard.py
Output: public/brand/tiktok-endcard.png

Design: forensic case-file aesthetic matching /go and /sample. Charcoal
background with a subtle grid-paper + teal radial glow, 3-line headline,
mini sample case card (grade + vitals + top bias), and betautopsy.com as
the primary CTA. Uses IBM Plex Mono throughout to lean into the brand's
"case file" vibe. No external runtime deps beyond Pillow.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "public" / "fonts"
OUT = ROOT / "public" / "brand" / "tiktok-endcard.png"

# ── Canvas ──
W, H = 1080, 1920

# ── Brand palette ──
BG = (10, 10, 18)         # base
CARD = (22, 22, 34)        # surface-1
CARD_BORDER = (34, 34, 48)
SCALPEL = (0, 201, 167)   # teal accent
BLEED = (196, 70, 58)     # red accent
CAUTION = (201, 160, 78)  # gold accent
FG_BRIGHT = (246, 240, 255)
FG_MUTED = (139, 149, 165)
FG_DIM = (90, 98, 112)


def load_font(filename: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_DIR / filename), size)


def bold(size: int) -> ImageFont.FreeTypeFont:
    return load_font("IBMPlexMono-Bold.ttf", size)


def semibold(size: int) -> ImageFont.FreeTypeFont:
    return load_font("IBMPlexMono-SemiBold.ttf", size)


def medium(size: int) -> ImageFont.FreeTypeFont:
    return load_font("IBMPlexMono-Medium.ttf", size)


def light(size: int) -> ImageFont.FreeTypeFont:
    return load_font("IBMPlexMono-Light.ttf", size)


def make_base() -> Image.Image:
    """Charcoal base + subtle grid paper + soft teal radial glow."""
    img = Image.new("RGBA", (W, H), BG + (255,))

    # Grid paper (48px on 48px) — teal at ~5% opacity
    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for x in range(0, W + 1, 48):
        gd.line([(x, 0), (x, H)], fill=(0, 201, 167, 14), width=1)
    for y in range(0, H + 1, 48):
        gd.line([(0, y), (W, y)], fill=(0, 201, 167, 14), width=1)
    img = Image.alpha_composite(img, grid)

    # Soft teal radial glow behind the headline (replicates the /go hero glow)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(
        [(W // 2 - 450, 250), (W // 2 + 450, 900)],
        fill=(0, 201, 167, 70),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(100))
    img = Image.alpha_composite(img, glow)

    # Faint bleed glow at bottom-left for visual balance with the case card
    glow2 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow2)
    gd.ellipse(
        [(W // 2 - 500, 1150), (W // 2 + 500, 1650)],
        fill=(196, 70, 58, 40),
    )
    glow2 = glow2.filter(ImageFilter.GaussianBlur(120))
    img = Image.alpha_composite(img, glow2)

    return img


def text_width(draw: ImageDraw.ImageDraw, text: str, font) -> int:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def draw_rounded_rect(
    draw: ImageDraw.ImageDraw,
    xy,
    radius: int,
    fill=None,
    outline=None,
    width: int = 1,
):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_severity_badge(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    text: str,
    bg_color,
):
    font = bold(22)
    tw = text_width(draw, text, font)
    pad_x, pad_y = 16, 10
    w = tw + pad_x * 2
    h = 40
    draw_rounded_rect(
        draw,
        [(x, y), (x + w, y + h)],
        radius=4,
        fill=bg_color,
    )
    # Text vertical offset: IBM Plex Mono sits a bit high in its bbox, nudge down
    draw.text((x + pad_x, y + pad_y - 4), text, font=font, fill=(10, 10, 18))
    return w, h


def build():
    img = make_base()
    d = ImageDraw.Draw(img)

    # ── Top eyebrow ──
    eyebrow_y = 200
    d.text((60, eyebrow_y), "CASE FILE // EXHIBIT A", font=medium(28), fill=FG_DIM)
    # Thin teal underline accent
    d.line([(60, eyebrow_y + 50), (320, eyebrow_y + 50)], fill=SCALPEL, width=3)

    # ── Headline (3 lines) ──
    headline_y = 420
    line_h = 110
    d.text((60, headline_y), "FIND YOUR", font=bold(92), fill=FG_BRIGHT)
    d.text((60, headline_y + line_h), "BETTING", font=bold(92), fill=FG_BRIGHT)
    d.text((60, headline_y + line_h * 2), "LEAKS.", font=bold(92), fill=SCALPEL)

    # ── Subtitle (3 stacked lines) ──
    sub_y = 790
    d.text((60, sub_y), "47 behavioral signals.", font=light(36), fill=FG_MUTED)
    d.text((60, sub_y + 50), "5-chapter forensic report.", font=light(36), fill=FG_MUTED)
    d.text((60, sub_y + 100), "60 seconds.", font=light(36), fill=FG_MUTED)

    # ── Mini sample case card ──
    card_x, card_y = 60, 1010
    card_w, card_h = 960, 440
    draw_rounded_rect(
        d,
        [(card_x, card_y), (card_x + card_w, card_y + card_h)],
        radius=16,
        fill=CARD,
        outline=CARD_BORDER,
        width=2,
    )
    # Left accent bar in bleed red (no full 4-sided border — matches brand)
    d.rectangle(
        [(card_x, card_y + 4), (card_x + 5, card_y + card_h - 4)],
        fill=BLEED,
    )

    # Card header row: case number + severity badge
    ch_y = card_y + 38
    d.text((card_x + 40, ch_y), "CASE #BA-SAMPLE", font=medium(26), fill=FG_DIM)
    badge_w, _ = draw_severity_badge(
        d,
        card_x + card_w - 40 - 200,  # placeholder offset, we'll recompute
        ch_y - 8,
        "HIGH SEVERITY",
        BLEED,
    )
    # Recompute badge position to right-align it exactly
    # Erase by re-drawing card bg under the misplaced badge — simpler: overpaint.
    # To avoid that, compute width first and draw once:
    # (Left in as documentation; second pass below overwrites with correct x.)

    # Redraw severity badge right-aligned now that we know its width
    # First, clear the placeholder area by re-drawing the card section under it
    # Draw a clean card bg rectangle over the old badge spot
    clear_x1 = card_x + card_w - 40 - 250
    clear_x2 = card_x + card_w - 20
    clear_y1 = ch_y - 12
    clear_y2 = ch_y + 40
    d.rectangle([(clear_x1, clear_y1), (clear_x2, clear_y2)], fill=CARD)
    badge_w, _ = draw_severity_badge(
        d,
        card_x + card_w - 40 - (badge_w),
        ch_y - 8,
        "HIGH SEVERITY",
        BLEED,
    )

    # Grade block (left half of card)
    g_x = card_x + 40
    g_y = card_y + 110
    d.text((g_x, g_y), "OVERALL GRADE", font=medium(22), fill=FG_DIM)
    d.text((g_x - 4, g_y + 38), "C+", font=bold(140), fill=CAUTION)

    # Vitals column (right half)
    v_x = card_x + 420
    v_y = card_y + 110
    d.text((v_x, v_y), "EMOTION", font=medium(22), fill=FG_DIM)
    d.text((v_x, v_y + 30), "67", font=bold(54), fill=CAUTION)
    d.text((v_x + 110, v_y + 50), "/100", font=medium(26), fill=FG_MUTED)

    v_y2 = v_y + 110
    d.text((v_x, v_y2), "NET P&L", font=medium(22), fill=FG_DIM)
    d.text((v_x, v_y2 + 30), "-$2,847", font=bold(54), fill=BLEED)

    # Divider + TOP BIAS row (bottom of card)
    tb_y = card_y + card_h - 80
    d.line(
        [(card_x + 40, tb_y - 20), (card_x + card_w - 40, tb_y - 20)],
        fill=CARD_BORDER,
        width=2,
    )
    d.text((card_x + 40, tb_y), "TOP BIAS", font=medium(22), fill=FG_DIM)
    d.text(
        (card_x + 40, tb_y + 28),
        "LOSS CHASING",
        font=bold(34),
        fill=BLEED,
    )
    # Cost label on the right
    cost_text = "-$1,240 / QTR"
    cost_w = text_width(d, cost_text, bold(28))
    d.text(
        (card_x + card_w - 40 - cost_w, tb_y + 32),
        cost_text,
        font=bold(28),
        fill=BLEED,
    )

    # ── Primary CTA: domain ──
    cta_y = 1550
    domain = "betautopsy.com"
    dom_w = text_width(d, domain, bold(78))
    d.text(((W - dom_w) // 2, cta_y), domain, font=bold(78), fill=SCALPEL)

    # Sub-CTA micro line
    sub_cta_y = cta_y + 100
    sub_text = "free report  ·  no credit card  ·  link in bio"
    sub_w = text_width(d, sub_text, medium(28))
    d.text(((W - sub_w) // 2, sub_cta_y), sub_text, font=medium(28), fill=FG_MUTED)

    # ── Bottom disclaimer (stays in the TikTok safe zone, well above bottom) ──
    disc_y = 1760
    disc = "For entertainment only  ·  18+  ·  1-800-GAMBLER"
    disc_w = text_width(d, disc, light(22))
    d.text(((W - disc_w) // 2, disc_y), disc, font=light(22), fill=FG_DIM)

    # Flatten to RGB and save
    final = img.convert("RGB")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    final.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({W}x{H})")


if __name__ == "__main__":
    build()
