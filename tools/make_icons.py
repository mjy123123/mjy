"""生成 my-apps 全部图标（三个设计方向可选）。

用法（在 my-apps 目录下）：

    python tools/make_icons.py --preview       # 生成三方向对比图，不动正式图标
    python tools/make_icons.py --style a       # 应用到正式图标（并重新生成对比图）
    python tools/make_icons.py --style b
    python tools/make_icons.py --style c

三个方向：
    a  深色渐变 + 白色符号（有顶光、有投影，最接近"正经 App"的质感）
    b  纯色扁平 + 白色符号（无渐变无阴影，干净现代）
    c  浅底 + 彩色符号（通透克制，接近 iOS 设置类 App 的浅色系）

每个图标生成 4 张：-180（iOS 主屏）/ -192 / -512 / -maskable-512（安卓自适应）。
"""
import os
import sys
import argparse
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ICON_DIR = os.path.join(ROOT, "icons")

S = 1024                     # 超采样画布，最后再缩到目标尺寸
DEFAULT_STYLE = "a"

# 每个工具的配色：key -> (渐变顶, 渐变底, 扁平主色, 浅底符号色)
PALETTE = {
    "home":    ((61, 130, 246), (24, 58, 160), (58, 110, 240), (37, 99, 235)),
    "answer":  ((150, 105, 250), (86, 26, 196), (140, 92, 246), (124, 58, 237)),
    "fortune": ((252, 196, 60), (232, 82, 16), (245, 158, 11), (232, 88, 12)),
    "jobs":    ((52, 214, 194), (10, 140, 130), (20, 184, 166), (13, 148, 136)),
    "learn":   ((244, 114, 182), (190, 24, 93), (236, 72, 153), (219, 39, 119)),
}

KEYS = ["home", "answer", "fortune", "jobs", "learn"]
LABELS = {"home": "工具箱", "answer": "答案之书", "fortune": "每日运势",
          "jobs": "岗位匹配", "learn": "每日一课"}

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\msyh.ttc",
    "/System/Library/Fonts/PingFang.ttc",
]


def font(px):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, px)
            except OSError:
                continue
    return None


# ---------------------------------------------------------------- 背景

def bg_gradient(top, bottom):
    """竖向渐变，带一点缓动，比线性好看。"""
    img = Image.new("RGB", (S, S))
    d = ImageDraw.Draw(img)
    for y in range(S):
        t = (y / (S - 1)) ** 0.86
        d.line([(0, y), (S, y)],
               fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return img


def bg_flat(color):
    return Image.new("RGB", (S, S), color)


def add_top_light(img, strength=0.17):
    """顶部一片柔光，制造"有光源"的立体感。"""
    layer = Image.new("L", (S, S), 0)
    ImageDraw.Draw(layer).ellipse(
        [-S * 0.42, -S * 1.10, S * 1.42, S * 0.46], fill=int(255 * strength))
    layer = layer.filter(ImageFilter.GaussianBlur(S * 0.055))
    img.paste(Image.new("RGB", (S, S), (255, 255, 255)), (0, 0), layer)
    return img


# ---------------------------------------------------------------- 符号

def sym_grid(d):
    """工具箱：bento 三格（左一长条 + 右两个），比 2x2 均分更像"设计过的"。"""
    pad = S * 0.245
    gap = S * 0.052
    total = S - pad * 2
    h = total
    left_w = total * 0.42
    right_w = total - left_w - gap
    r = left_w * 0.30
    d.rounded_rectangle([pad, pad, pad + left_w, pad + h], radius=r, fill=255)
    top_h = (h - gap) * 0.42
    x2 = pad + left_w + gap
    d.rounded_rectangle([x2, pad, S - pad, pad + top_h], radius=r, fill=255)
    d.rounded_rectangle([x2, pad + top_h + gap, S - pad, pad + h], radius=r, fill=255)


def sym_book(d):
    """答案之书：摊开的书，两页 + 书脊留缝，页面上镂空出文字行。"""
    cx = S * 0.5
    left, right = S * 0.175, S * 0.825
    top, bot = S * 0.295, S * 0.735
    tilt = S * 0.048
    gap = S * 0.024

    d.polygon([(left, top + tilt), (cx - gap, top), (cx - gap, bot), (left, bot - tilt)],
              fill=255)
    d.polygon([(right, top + tilt), (cx + gap, top), (cx + gap, bot), (right, bot - tilt)],
              fill=255)

    # 页面上的"文字行"用镂空做，透出底色
    lh, lw = S * 0.034, S * 0.075
    ys = [S * 0.400, S * 0.487, S * 0.574]
    for y in ys:
        d.rounded_rectangle([left + lw, y, cx - gap - lw, y + lh],
                            radius=lh / 2, fill=0)
        d.rounded_rectangle([cx + gap + lw, y, right - lw, y + lh],
                            radius=lh / 2, fill=0)


def sym_moon(d):
    """每日运势：月牙 + 一颗四角星。"""
    R = S * 0.262
    cx, cy = S * 0.455, S * 0.545
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=255)
    # 从右上挖掉一块，剩下的就是月牙
    cr = R * 1.04
    ox, oy = R * 0.56, -R * 0.50
    d.ellipse([cx - cr + ox, cy - cr + oy, cx + cr + ox, cy + cr + oy], fill=0)

    # 四角星
    sx, sy = S * 0.752, S * 0.288
    r, w = S * 0.125, S * 0.125 * 0.27
    d.polygon([(sx, sy - r), (sx + w, sy), (sx, sy + r), (sx - w, sy)], fill=255)


def sym_doc(d):
    """岗位匹配：一页文档 + 三行内容。"""
    x1, y1, x2, y2 = S * 0.295, S * 0.205, S * 0.705, S * 0.795
    r = S * 0.058
    d.rounded_rectangle([x1, y1, x2, y2], radius=r, fill=255)
    lx1, lx2 = x1 + S * 0.078, x2 - S * 0.078
    lh = S * 0.046
    for y in (S * 0.345, S * 0.475, S * 0.605):
        d.rounded_rectangle([lx1, y, lx2, y + lh], radius=lh / 2, fill=0)
    d.rounded_rectangle([lx1, S * 0.720, lx1 + (lx2 - lx1) * 0.55, S * 0.720 + lh],
                        radius=lh / 2, fill=0)


def sym_cap(d):
    """每日一课：学士帽（帽顶菱形 + 帽冠梯形 + 流苏）。"""
    cx = S * 0.5
    top = S * 0.272
    w = S * 0.300
    h = S * 0.118

    # 帽顶（菱形）
    d.polygon([(cx, top), (cx + w, top + h), (cx, top + 2 * h), (cx - w, top + h)],
              fill=255)
    # 帽冠（梯形，顶边藏在菱形里，视觉上连成一体）
    d.polygon([(cx - S * 0.175, top + h * 1.30),
               (cx + S * 0.175, top + h * 1.30),
               (cx + S * 0.150, top + h * 2.95),
               (cx - S * 0.150, top + h * 2.95)], fill=255)
    # 流苏
    tx = cx + w * 0.90
    ty0 = top + h * 1.05
    ty1 = S * 0.690
    d.line([(tx, ty0), (tx, ty1)], fill=255, width=int(S * 0.024))
    rr = S * 0.038
    d.ellipse([tx - rr, ty1 - rr, tx + rr, ty1 + rr], fill=255)


SYMBOLS = {
    "home": sym_grid,
    "answer": sym_book,
    "fortune": sym_moon,
    "jobs": sym_doc,
    "learn": sym_cap,
}


def scale_mask(mask, k):
    if k == 1.0:
        return mask
    w = int(S * k)
    out = Image.new("L", (S, S), 0)
    out.paste(mask.resize((w, w), Image.LANCZOS), ((S - w) // 2, (S - w) // 2))
    return out


# ---------------------------------------------------------------- 组装

def render(key, style, sym_scale=1.0):
    grad_top, grad_bot, flat, accent = PALETTE[key]

    if style == "a":
        img = bg_gradient(grad_top, grad_bot)
        img = add_top_light(img)
        fg = (255, 255, 255)
        shadow = 0.30
    elif style == "b":
        img = bg_flat(flat)
        fg = (255, 255, 255)
        shadow = 0.0
    else:  # c
        img = bg_gradient((247, 248, 251), (226, 230, 238))
        fg = accent
        shadow = 0.16

    mask = Image.new("L", (S, S), 0)
    SYMBOLS[key](ImageDraw.Draw(mask))
    mask = scale_mask(mask, sym_scale)

    if shadow > 0:
        sh = mask.filter(ImageFilter.GaussianBlur(S * 0.021))
        sh = ImageChops.offset(sh, 0, int(S * 0.019))
        sh = sh.point(lambda v: int(v * shadow))
        img.paste(Image.new("RGB", (S, S), (0, 0, 0)), (0, 0), sh)

    img.paste(Image.new("RGB", (S, S), fg), (0, 0), mask)
    return img


def save_set(style, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    n = 0
    for key in KEYS:
        base = render(key, style, 1.0)
        base.resize((512, 512), Image.LANCZOS).save(
            os.path.join(out_dir, key + "-512.png"), "PNG", optimize=True)
        base.resize((192, 192), Image.LANCZOS).save(
            os.path.join(out_dir, key + "-192.png"), "PNG", optimize=True)
        base.resize((180, 180), Image.LANCZOS).save(
            os.path.join(out_dir, key + "-180.png"), "PNG", optimize=True)

        # maskable：符号缩到 74%，留出系统裁剪的安全区，背景依旧满幅
        render(key, style, 0.74).resize((512, 512), Image.LANCZOS).save(
            os.path.join(out_dir, key + "-maskable-512.png"), "PNG", optimize=True)
        n += 4
    return n


def squircle(size, ratio=0.2237, ss=4):
    s = size * ss
    m = Image.new("L", (s, s), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, s - 1, s - 1],
                                        radius=int(s * ratio), fill=255)
    return m.resize((size, size), Image.LANCZOS)


def preview(out_path):
    """三方向对比图：模拟 iOS 主屏底色 + 圆角遮罩，附 52px 小尺寸观感。"""
    cols, big, gap = 4, 118, 158
    pad_x, pad_y = 168, 74
    W = pad_x + cols * gap + 40
    row_h = big + 96
    small, small_row = 52, 78
    small_title = 52

    H = pad_y + row_h * 3 + small_title + small_row * 3 + 24

    canvas = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(canvas)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)],
               fill=(int(20 + 26 * t), int(22 + 24 * t), int(38 + 44 * t)))

    f_title = font(21)
    f_sub = font(14)
    f_lb = font(15)
    f_small = font(18)

    titles = {
        "a": ("方向 A · 深色渐变 + 白色符号", "有顶光有投影，质感最好，最像正经 App"),
        "b": ("方向 B · 纯色扁平 + 白色符号", "无渐变无阴影，干净现代，辨识度最高"),
        "c": ("方向 C · 浅底 + 彩色符号", "通透克制，像 iOS 设置/备忘录那种浅色系"),
    }

    for r, style in enumerate(["a", "b", "c"]):
        y0 = pad_y + r * row_h
        title, sub = titles[style]
        d.text((26, y0 + 8), title, font=f_title, fill=(232, 236, 245))
        d.text((26, y0 + 36), sub, font=f_sub, fill=(138, 150, 172))
        for c, key in enumerate(KEYS):
            x = pad_x + c * gap
            im = render(key, style, 1.0).resize((big, big), Image.LANCZOS)
            canvas.paste(im, (x, y0 + 62), squircle(big))
            lb = LABELS[key]
            if f_lb:
                bb = d.textbbox((0, 0), lb, font=f_lb)
                d.text((x + (big - (bb[2] - bb[0])) / 2, y0 + 62 + big + 9),
                       lb, font=f_lb, fill=(170, 180, 198))

    # ---- 小尺寸区：主屏图标真正要比的是缩小后的辨识度 ----
    sy = pad_y + row_h * 3 + 14
    d.text((26, sy), "缩小到 52px（主屏实际观感）", font=f_small, fill=(232, 236, 245))
    for r, style in enumerate(["a", "b", "c"]):
        for c, key in enumerate(KEYS):
            x = pad_x + c * gap + (big - small) // 2
            y = sy + 34 + r * small_row
            canvas.paste(render(key, style, 1.0).resize((small, small), Image.LANCZOS),
                         (x, y), squircle(small))

    canvas.save(out_path)
    return out_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--style", choices=["a", "b", "c"], default=None)
    ap.add_argument("--preview", action="store_true")
    args = ap.parse_args()

    # 对比图写到部署目录的上一层，避免被打进部署包
    pv = os.path.join(os.path.dirname(ROOT), "_icon-styles.png")
    preview(pv)
    print("对比图 ->", pv)

    if args.preview or not args.style:
        if not args.style:
            print("（未指定 --style，正式图标未改动。三个方向都在对比图里了。）")
        return

    n = save_set(args.style, ICON_DIR)
    print("已应用方向 %s，写入 %d 张图标 -> %s" % (args.style.upper(), n, ICON_DIR))


if __name__ == "__main__":
    main()
