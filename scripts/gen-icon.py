#!/usr/bin/env python3
"""诗音正式图标/启动图生成脚本（无字体方案，避免 CJK 字体依赖）。

设计：纯净白底 + 暖炭色唱片圆盘（同心纹路）+ 米白中心标，
呼应产品「纯净白」主题（accent #4E463C / bg #FFFFFF→#F6F3EF）。
4 倍超采样绘制后缩小，保证边缘平滑。

产物（仓库根目录 assets/，供 @capacitor/assets 消费）：
- assets/icon.png    1024×1024
- assets/splash.png  2732×2732

用法：python3 scripts/gen-icon.py && npx @capacitor/assets generate android
依赖：Pillow（pip install pillow 或系统 python3-PIL）。
"""

from PIL import Image, ImageDraw

SS = 4  # 超采样倍数

# 纯净白主题色板
BG_TOP = (255, 255, 255)
BG_BOTTOM = (246, 243, 239)
DISC = (46, 41, 34)          # 暖炭唱片
DISC_GROOVE = (74, 67, 56)   # 纹路（略亮）
LABEL = (245, 239, 230)      # 米白中心标
LABEL_RING = (78, 70, 60)
HOLE = (46, 41, 34)


def v_gradient(size: int, top, bottom) -> Image.Image:
    """竖直渐变底图"""
    base = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / max(size - 1, 1)
        base.putpixel((0, y), tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return base.resize((size, size))


def draw_disc(img: Image.Image, cx: int, cy: int, r: int) -> None:
    d = ImageDraw.Draw(img)
    # 唱片本体
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=DISC)
    # 同心纹路
    for frac in (0.88, 0.76, 0.64):
        gr = int(r * frac)
        d.ellipse([cx - gr, cy - gr, cx + gr, cy + gr], outline=DISC_GROOVE, width=max(2, r // 90))
    # 米白中心标 + 描边环
    lr = int(r * 0.38)
    d.ellipse([cx - lr, cy - lr, cx + lr, cy + lr], fill=LABEL)
    d.ellipse([cx - lr, cy - lr, cx + lr, cy + lr], outline=LABEL_RING, width=max(2, r // 70))
    # 中心孔
    hr = int(r * 0.075)
    d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=HOLE)


def make_icon() -> Image.Image:
    size = 1024 * SS
    img = v_gradient(size, BG_TOP, BG_BOTTOM)
    draw_disc(img, size // 2, size // 2, int(size * 0.40))
    return img.resize((1024, 1024), Image.LANCZOS)


def make_splash() -> Image.Image:
    size = 2732
    big = size * 2
    img = v_gradient(big, BG_TOP, BG_BOTTOM)
    draw_disc(img, big // 2, big // 2, int(big * 0.17))
    return img.resize((size, size), Image.LANCZOS)


def make_foreground(size: int) -> Image.Image:
    """自适应图标前景层：透明底，唱片居中且落在安全区（直径约 62%）内"""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw_disc(img, big // 2, big // 2, int(big * 0.31))
    return img.resize((size, size), Image.LANCZOS)


def make_monochrome(size: int) -> Image.Image:
    """自适应图标单色层（Android 13+ 主题图标用，1.1.0 新增）。

    系统只取 alpha 形状并按壁纸色重新着色，因此画纯黑唱片剪影：
    盘体实心、中心标挖空成环、中心孔再挖空，与前景层同一几何。
    没有这一层时新系统会自动生成主题图标，形状不可控。
    """
    big = size * SS
    mask = Image.new("L", (big, big), 0)
    d = ImageDraw.Draw(mask)
    cx = cy = big // 2
    r = int(big * 0.31)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    # 中心标挖空（留环形剪影）
    lr = int(r * 0.38)
    d.ellipse([cx - lr, cy - lr, cx + lr, cy + lr], fill=0)
    # 中心孔保留一小点实心，与唱片中心标点呼应
    hr = int(r * 0.075)
    d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=255)
    img = Image.new("RGBA", (big, big), (0, 0, 0, 255))
    img.putalpha(mask)
    return img.resize((size, size), Image.LANCZOS)


def make_round(size: int) -> Image.Image:
    """圆形图标：完整图标加圆形 alpha 蒙版"""
    icon = make_icon().resize((size * SS, size * SS), Image.LANCZOS)
    mask = Image.new("L", icon.size, 0)
    ImageDraw.Draw(mask).ellipse([0, 0, icon.size[0], icon.size[1]], fill=255)
    out = Image.new("RGBA", icon.size, (0, 0, 0, 0))
    out.paste(icon, (0, 0), mask)
    return out.resize((size, size), Image.LANCZOS)


def make_splash_sized(w: int, h: int) -> Image.Image:
    big_w, big_h = w * 2, h * 2
    img = v_gradient(big_h, BG_TOP, BG_BOTTOM).resize((big_w, big_h))
    draw_disc(img, big_w // 2, big_h // 2, int(min(big_w, big_h) * 0.17))
    return img.resize((w, h), Image.LANCZOS)


def write_android_res(res_dir: str = "android/app/src/main/res") -> None:
    """把各密度图标/启动图直接写入 Android 工程（@capacitor/assets 的等价产物）。

    密度表：legacy 图标 48dp 基准、自适应前景 108dp 基准。
    自适应背景走 @color/ic_launcher_background（脚本同步改其色值），此处只写前景。
    """
    import glob
    import os

    legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    foreground = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
    icon_master = make_icon()
    for density, px in legacy.items():
        folder = os.path.join(res_dir, f"mipmap-{density}")
        icon_master.resize((px, px), Image.LANCZOS).save(os.path.join(folder, "ic_launcher.png"))
        make_round(px).save(os.path.join(folder, "ic_launcher_round.png"))
    for density, px in foreground.items():
        folder = os.path.join(res_dir, f"mipmap-{density}")
        make_foreground(px).save(os.path.join(folder, "ic_launcher_foreground.png"))
        make_monochrome(px).save(os.path.join(folder, "ic_launcher_monochrome.png"))
    # 启动图：按工程内既有文件的原始尺寸逐个重绘
    for path in glob.glob(os.path.join(res_dir, "**", "splash.png"), recursive=True):
        with Image.open(path) as old:
            w, h = old.size
        make_splash_sized(w, h).save(path)
    # 自适应图标背景色对齐纯净白底
    color_file = os.path.join(res_dir, "values", "ic_launcher_background.xml")
    if os.path.exists(color_file):
        with open(color_file, "w", encoding="utf-8") as f:
            f.write(
                '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
                '    <color name="ic_launcher_background">#F6F3EF</color>\n</resources>\n'
            )
    print(f"已写入 Android 图标与启动图：{res_dir}")


if __name__ == "__main__":
    import os

    os.makedirs("assets", exist_ok=True)
    make_icon().save("assets/icon.png")
    make_splash().save("assets/splash.png")
    print("已生成 assets/icon.png 与 assets/splash.png")
    if os.path.isdir("android/app/src/main/res"):
        write_android_res()
