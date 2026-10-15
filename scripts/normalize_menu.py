"""Turn the raw Chowbus export (.work/menu-raw.json) into src/data/menu.json.

Usage: python -I -X utf8 scripts/normalize_menu.py .work/menu-raw.json src/data/menu.json .work/image-jobs.json
Edit the tables below to rename dishes, re-tag them or move them between sections.
"""
import json, re, sys

RAW, OUT, JOBS = sys.argv[1:4]

# raw lowercase name -> (display name, portion note)
NAMES = {
    "kaili sour soup fish": ("Kaili Sour Soup Fish", "Whole fish"),
    "the zesty lamb skewers 5": ("Zesty Lamb Skewers", "5 skewers"),
    "angus grilled sliced beef(5)": ("Angus Sliced Beef Skewers", "5 skewers"),
    "crispy tofu balls(house specialty)": ("Crispy Tofu Balls", ""),
    "juice pork (5)": ("Juicy Pork Skewers", "5 skewers"),
    "wagyu beef (5)": ("Wagyu Beef Skewers", "5 skewers"),
    "crispy pork crunch rice bowl": ("Crispy Pork Crunch Rice Bowl", ""),
    "the king roasted eggplant": ("The King Roasted Eggplant", "Whole eggplant"),
    "corn on the cob": ("Grilled Corn on the Cob", ""),
    "crispy potato pancakes": ("Crispy Potato Pancakes", ""),
    "grilled eel (2)": ("Grilled Eel Skewers", "2 skewers"),
    "soul chili powder": ("Soul Chili Powder", "Take-home jar"),
    "pork belly taco(3)": ("Pork Belly Tacos", "3 tacos"),
    "angus grilled sliced beef taco (3)": ("Angus Beef Tacos", "3 tacos"),
    "beef tongue taco (3)": ("Beef Tongue Tacos", "3 tacos"),
    "grilled beef tongue(3)": ("Grilled Beef Tongue", "3 skewers"),
    "grilled sausage(3)": ("Grilled Sausage", "3 skewers"),
    "pork belly(5)": ("Red-Chili Pork Belly", "5 skewers"),
    "grilled mini pork ribs(bone in)(5)": ("Mini Pork Ribs", "5 skewers, bone-in"),
    "chicken wing skewers (bone in) (6)": ("Chicken Wing Skewers", "6 wings, bone-in"),
    "grilled pork skin skewers (3)": ("Grilled Pork Skin", "3 skewers"),
    "grilled shrimp (2)": ("Grilled Shrimp", "2 skewers"),
    "chicken palm cartilage bone in (4)": ("Chicken Knee Cartilage", "4 skewers"),
    "duck gizzard (2)": ("Duck Gizzard", "2 skewers"),
    "grilled chicken skin (2)": ("Grilled Chicken Skin", "2 skewers"),
    "pork loin": ("Grilled Pork Tendon", ""),
    "charcoal grilled squid (2)": ("Charcoal-Grilled Squid", "2 skewers"),
    "grilled pork trotters (3)": ("Grilled Pork Trotters", "3 pieces"),
    "spicy stir-fried clams": ("Spicy Stir-Fried Clams", ""),
    "grilled oysters (6)": ("Grilled Oysters", "6 oysters"),
    "chefs special grilled squid": ("Chef's Special Whole Squid", ""),
    "2ib boiled crawfish combo": ("Boiled Crawfish Combo", "2 lb"),
    "spicy chicken": ("Guizhou Spicy Chicken", ""),
    "power lunch": ("Power Lunch", "Build your own"),
    "backyard combo": ("Backyard Combo", "Feeds 2"),
    "pitmaster plate": ("Pitmaster Plate", "Feeds 1"),
    "yangs bbq feast": ("Yang's BBQ Feast", "Feeds 3–4"),
    "texas trio lunch box": ("Texas Trio Lunch Box", ""),
    "smashed cucumber salad": ("Smashed Cucumber Salad", ""),
    "fried sweet potato fries": ("Sweet Potato Fries", ""),
    "chicken potstickers": ("Chicken Potstickers", ""),
    "sampler basket": ("Sampler Basket", ""),
    "110 chicken spring roll(2)": ("Chicken Spring Rolls", "2 rolls"),
    "crispy fried chicken(6)": ("Crispy Fried Chicken", "6 pieces"),
    "grilled chives": ("Grilled Chives", ""),
    "grilled potato slices": ("Grilled Potato Slices", ""),
    "grilled zucchini": ("Grilled Zucchini", ""),
    "grilled mushroom (2)": ("Grilled Mushrooms", "2 skewers"),
    "grilled cabbage": ("Grilled Cabbage", ""),
    "grilled cauliflower": ("Grilled Cauliflower", ""),
    "green beans skewers (4)": ("Green Bean Skewers", "4 skewers"),
    "spicy roasted pig brain": ("Spicy Roasted Pig Brain", ""),
    "savory pepper & pork stir-fry bowl(spicy)": ("Green Pepper Pork Rice Bowl", ""),
    "classic egg fried rice": ("Classic Egg Fried Rice", ""),
    "sweet & spicy sichuan pork bowl(spicy)": ("Yu Xiang Shredded Pork Rice Bowl", ""),
    "pork tendon rice bowl(spicy)": ("Pork Tendon Rice Bowl", ""),
    "fried buns (6)": ("Fried Mini Buns", "6 buns"),
    "papa noodles (1)": ("Papa's Noodles", ""),
    "steamed rice": ("Steamed Rice", ""),
    "southern cold noodles(spicy)": ("Southern Cold Noodles", ""),
    "dubai chocolate cake": ("Dubai Chocolate Cake", ""),
    "tiramisu": ("Tiramisu", ""),
    "tres leches cake": ("Tres Leches Cake", ""),
    "vanilla ice cream": ("Vanilla Ice Cream", ""),
    "chocolate ice cream": ("Chocolate Ice Cream", ""),
    "new york cheesecake": ("New York Cheesecake", ""),
    "sprite": ("Sprite", ""), "diet coke": ("Diet Coke", ""), "coke": ("Coke", ""),
    "dr pepper": ("Dr Pepper", ""), "wang lao ji": ("Wong Lo Kat Herbal Tea", ""),
    "bottle water": ("Bottled Water", ""), "beer ultra": ("Michelob Ultra", ""),
    "can beer": ("Canned Beer", ""), "sweet tea": ("Sweet Tea", ""), "coke zero": ("Coke Zero", ""),
    "miao silver refrigerator magnet": ("Miao Silver Fridge Magnet", ""),
    "mango smoothie": ("Mango Smoothie", ""), "strawberry smoothie": ("Strawberry Smoothie", ""),
    "lime sparkling drink": ("Lime Sparkler", ""),
    "yomie s purple rice yogurt": ("Purple Rice Yogurt", ""), "yomie s oats yogurt": ("Oat Yogurt", ""),
    "double mix yogurt": ("Purple Rice & Oat Yogurt", ""),
    "gold sweet melon yogurt": ("Golden Melon Yogurt", ""),
    "pink fleshy peach fruit yogurt": ("Pink Peach Yogurt", ""),
    "jujebe oats yogurt": ("Jujube Oat Yogurt", ""), "miss haw yogurt": ("Hawthorn Yogurt", ""),
    "haw purple rice yogurt": ("Hawthorn Purple Rice Yogurt", ""), "haw oats yogurt": ("Hawthorn Oat Yogurt", ""),
    "melon melon": ("Melon Melon Yogurt", ""), "cream cheese grape": ("Cheese Foam Grape", ""),
    "creamy cheese peach": ("Cheese Foam Peach", ""), "creamy cheese strawberry": ("Cheese Foam Strawberry", ""),
    "creamy cheese mango": ("Cheese Foam Mango", ""),
}

# Short, factual copy for dishes Chowbus has no description for.
DESC = {
    "Wagyu Beef Skewers": "Wagyu beef grilled over live charcoal and finished with our house spice.",
    "Grilled Beef Tongue": "Tender beef tongue slices, lightly seasoned and grilled for a rich, chewy bite.",
    "Chicken Knee Cartilage": "A Guizhou street favorite: crunchy cartilage with a strong, spicy, almost numbing kick.",
    "Soul Chili Powder": "Grandma Yang's hand-crushed chili blend, the same one on every skewer. Take a jar home.",
    "Crispy Tofu Balls": "Guizhou-style tofu balls, crisp outside and soft inside, served with spicy dipping sauce. Loved by vegetarians and regulars alike.",
    "Kaili Sour Soup Fish": "Whole fish in Kaili's tangy red sour soup, a Guizhou classic. Please ask us a day ahead so we can prepare it.",
    "Backyard Combo": "A combo of our signature skewers, sized for two.",
    "Pitmaster Plate": "A combo of our signature skewers for one hungry guest.",
    "Yang's BBQ Feast": "Our biggest combo, made for a table of three to four.",
    "Power Lunch": "Build-your-own lunch set, served weekday lunchtimes.",
}

SECTIONS = [
    ("favorites", "House favorites", "招牌推荐", "Where regulars start. Order a few skewers per person, then add a rice bowl to share."),
    ("skewers", "Signature skewers", "杨记招牌烧烤", "Marinated in Grandma Yang's 40-year spice blend and grilled over live charcoal."),
    ("vegetables", "Grilled vegetables", "烧烤蔬菜", "Seasonal vegetables off the same charcoal grill."),
    ("seafood", "Seafood & chef's specials", "海鲜与主厨特荐", "Bigger plates to share."),
    ("tacos", "Tacos", "塔可", "Our skewer meats folded into tortillas: Guizhou meets Texas."),
    ("combos", "Combos & lunch", "套餐", "Easy sets for one, two or the whole table."),
    ("sides", "Sides & small plates", "小吃配菜", "Crunchy, cool and fried things to round out the table."),
    ("rice-noodles", "Rice & noodles", "主食", "Guizhou home-style bowls."),
    ("adventurous", "Adventurous eats", "勇者挑战", "For the brave."),
    ("desserts", "Desserts", "甜点", ""),
    ("drinks", "Drinks", "饮品", "Yomie's yogurt and fresh teas made in house, plus sodas and beer."),
    ("take-home", "Take Yang's home", "零售", ""),
]
MENU_TO_SECTION = {
    "Signature BBQ Skewers": "skewers", "Grilled Vegetables": "vegetables",
    "Seafood & Chef’s Specials": "seafood", "Taco": "tacos", 'Customize "Power Lunch"': "combos",
    "Dinner Combo": "combos", "Foil-Wrapped & Sides": "sides", "Main Food": "rice-noodles",
    "Adventurous Eats": "adventurous", "Desserts": "desserts", "Drink": "drinks",
    "Homemade Drinks": "drinks", "Take Yang's Home": "take-home",
}

def drink_group(name, raw):
    n = raw.lower()
    if n in ("mango smoothie", "strawberry smoothie", "lime sparkling drink"): return "House-made"
    if "ice cream" in n: return "Yogurt ice cream bites"
    if "yogurt" in n or n == "melon melon": return "Yomie's yogurt"
    if "cheese" in n: return "Cheese foam teas"
    if "milk tea" in n: return "Milk teas"
    if "tea" in n: return "Fruit & fresh teas"
    return "Sodas, beer & more"
DRINK_ORDER = ["House-made", "Yomie's yogurt", "Fruit & fresh teas", "Cheese foam teas", "Milk teas", "Yogurt ice cream bites", "Sodas, beer & more"]

def title(s):
    small = {"and", "of", "on", "the", "with", "&"}
    w = s.split()
    return " ".join(x if (i and x in small) else x[:1].upper() + x[1:] for i, x in enumerate(w))

def slugify(s):
    s = s.lower().replace("'", "").replace("&", "and")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

def clean_cn(s):
    s = (s or "").replace("🔥", "").strip()
    s = re.sub(r"\s*[（(]\s*\d+\s*(串|个|pcs)?\s*[)）]\s*$", "", s)
    s = re.sub(r"\s*\d+\s*$", "", s)
    s = re.sub(r"[（(]辣[)）]", "", s)
    return s.strip()

def price(p):
    return f"{float(p):.2f}"

raw = json.load(open(RAW, encoding="utf-8"))
items, order = {}, {k[0]: [] for k in SECTIONS}
drink_groups = {g: [] for g in DRINK_ORDER}
jobs = {}
for m in sorted(raw, key=lambda m: (m["seq"] or 0)):
    rawname = m["name"].strip()
    en, portion = NAMES.get(rawname, (None, ""))
    if not en:
        en = title(re.sub(r"\s*\(?(\d+)\s*pcs\)?", "", rawname))
        mm = re.search(r"\((\d+)\s*pcs\)", rawname)
        portion = f"{mm.group(1)} pieces" if mm else ""
    slug = slugify(en)
    desc = (m["desc"] or "").strip()
    tags = []
    if "🔥" in (m["cn"] or ""): tags.append("signature")
    if "spicy" in rawname or "辣" in (m["cn"] or "") or "chili" in desc.lower() or en in ("Red-Chili Pork Belly", "Chicken Knee Cartilage", "Southern Cold Noodles", "Guizhou Spicy Chicken"): tags.append("spicy")
    if "💪" in desc: tags.append("high-protein")
    if "house specialty" in rawname: tags.append("house-specialty")
    if en == "Kaili Sour Soup Fish": tags.append("call-ahead")
    prot = re.search(r"Protein:\s*~?(\d+)g", desc)
    desc = re.sub(r"💪.*$", "", desc).strip()
    # portion lives in its own field; Chowbus copy sometimes contradicts it
    desc = re.sub(r"\s*(One|Two|Three|Four|Five|Six)\s+(pieces|skewers)\s+per serving\.?", "", desc, flags=re.I).strip()
    if en == "The King Roasted Eggplant":
        desc = "Whole eggplant roasted until soft and smoky, topped with minced pork, fragrant garlic and house sauce."
    if en == "Kaili Sour Soup Fish" or (not desc and en in DESC): desc = DESC[en]
    if en in ("Soul Chili Powder", "Crispy Tofu Balls", "Wagyu Beef Skewers", "Chicken Knee Cartilage",
              "Backyard Combo", "Pitmaster Plate", "Yang's BBQ Feast", "Power Lunch"): desc = DESC[en]
    rec = items.get(slug)
    if not rec:
        rec = items[slug] = {
            "slug": slug, "en": en, "cn": clean_cn(m["cn"]), "price": price(m["price"]),
            "portion": portion, "desc": desc, "tags": tags, "options": bool(m["customize"]),
            "img": None, "protein": int(prot.group(1)) if prot else None,
        }
    if m["img"] and not rec["img"]:
        rec["img"] = slug
        jobs[slug] = m["id"]
    for mn in m["menus"]:
        sec = "favorites" if mn == "Recommended" else MENU_TO_SECTION.get(mn)
        if not sec: continue
        if sec == "drinks":
            g = drink_group(en, rawname)
            if slug not in drink_groups[g]: drink_groups[g].append(slug)
        elif slug not in order[sec]:
            order[sec].append(slug)

sections = []
for sid, en, cn, blurb in SECTIONS:
    s = {"id": sid, "en": en, "cn": cn, "blurb": blurb}
    if sid == "drinks":
        s["groups"] = [{"en": g, "items": drink_groups[g]} for g in DRINK_ORDER if drink_groups[g]]
    else:
        s["groups"] = [{"en": None, "items": order[sid]}]
    sections.append(s)

json.dump({"sections": sections, "items": items}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(jobs, open(JOBS, "w", encoding="utf-8"), indent=1)
print(len(items), "unique items,", len(jobs), "with photos")
for s in sections:
    print(f"  {s['id']}: {sum(len(g['items']) for g in s['groups'])}")
