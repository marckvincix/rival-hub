"""
One-off import of the Awin/Adidas product datafeed into Supabase.

The feed is a variant-level CSV (one row per size), ~93k rows. There's no
parent_product_id in this feed, so products are grouped by "style code":
the part of merchant_product_id before the last '-' (e.g. "LI2482-0004" and
"LI2482-0005" are the same product in sizes L and XL, style code "LI2482").

Only rows that look like they belong to one of the app's sports (matched by
keyword against merchant_category / product_name / merchant_product_category_path)
are imported — the feed's ~93k rows are almost entirely generic lifestyle
apparel with no sport relevance to a tournament app.

Usage: backend/.venv/bin/python import_products.py /path/to/feed.csv
"""
import csv
import os
import re
import sys
from collections import defaultdict

from dotenv import load_dotenv
from supabase import create_client

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

SPORT_KEYWORDS = {
    "calcio": ["calcio", "football", "soccer"],
    "basket": ["basket", "pallacanestro"],
    "padel": ["padel"],
    "tennis": ["tennis"],
    "pallavolo": ["pallavolo", "volley"],
    "rugby": ["rugby"],
}


def match_sport(row: dict) -> str | None:
    # The product name is the most specific signal about what the product
    # actually is (e.g. Adidas files some rugby boots under a "calcio"/
    # football-boots merchant category, but the name says "Scarpe da rugby").
    # Check it first and only fall back to category/path if the name itself
    # doesn't name a sport.
    name = (row.get("product_name", "") or "").lower()
    for sport, keywords in SPORT_KEYWORDS.items():
        if any(kw in name for kw in keywords):
            return sport

    haystack = " ".join([
        row.get("merchant_category", ""),
        row.get("merchant_product_category_path", ""),
    ]).lower()
    for sport, keywords in SPORT_KEYWORDS.items():
        if any(kw in haystack for kw in keywords):
            return sport
    return None


def to_float(value: str) -> float | None:
    value = (value or "").strip()
    if not value:
        return None
    # Some price fields carry a currency prefix, e.g. "EUR130.00"
    value = re.sub(r"^[A-Za-z€$£\s]+", "", value).strip().replace(",", ".")
    try:
        return float(value)
    except ValueError:
        return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python import_products.py /path/to/feed.csv")
        sys.exit(1)

    csv_path = sys.argv[1]
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    # style_code -> accumulated product dict
    products: dict[str, dict] = {}

    with open(csv_path, encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            merchant_product_id = (row.get("merchant_product_id") or "").strip()
            if "-" not in merchant_product_id:
                continue

            sport = match_sport(row)
            if not sport:
                continue

            style_code = merchant_product_id.rsplit("-", 1)[0]
            size = (row.get("Fashion:size") or "").strip()
            in_stock = (row.get("in_stock") or "").strip() == "1"

            if style_code not in products:
                price_original = (
                    to_float(row.get("rrp_price"))
                    or to_float(row.get("store_price"))
                    or to_float(row.get("product_price_old"))
                )
                price_current = to_float(row.get("display_price")) or to_float(row.get("search_price"))

                # Recompute the discount from the two prices rather than trusting
                # the feed's own savings_percent column, which was observed to
                # sometimes carry bogus values (e.g. "130" with no real original
                # price behind it). Only fall back to the feed's own value, with
                # a sanity clamp, when we don't have both prices to compute it.
                discount_percent = None
                if price_original and price_current and price_original > price_current > 0:
                    discount_percent = round((1 - price_current / price_original) * 100, 1)
                else:
                    price_original = None  # don't show a crossed-out price we can't justify
                    feed_discount = to_float(row.get("savings_percent"))
                    if feed_discount is not None and 0 < feed_discount <= 85:
                        discount_percent = feed_discount

                delivery_cost = to_float(row.get("delivery_cost"))

                # aw_image_url is deliberately excluded: it's a small 200x200
                # white-background thumbnail proxy, visibly lower quality than
                # the merchant's own product photography (grey background,
                # full resolution) used by the other image columns.
                images = []
                for col in ("large_image", "alternate_image", "alternate_image_two", "alternate_image_three", "alternate_image_four"):
                    url = (row.get(col) or "").strip()
                    if url and url not in images:
                        images.append(url)

                products[style_code] = {
                    "id": style_code,
                    "name": (row.get("product_name") or "").strip(),
                    "brand": (row.get("brand_name") or "Adidas").strip() or "Adidas",
                    "sport": sport,
                    "category": (row.get("merchant_category") or "").strip(),
                    "gender": (row.get("Fashion:suitable_for") or "").strip() or None,
                    "colour": (row.get("colour") or "").strip() or None,
                    "description": (row.get("product_short_description") or row.get("description") or "").strip()[:800] or None,
                    "price_original": price_original,
                    "price_current": price_current,
                    "discount_percent": discount_percent,
                    "free_shipping": delivery_cost is not None and delivery_cost <= 0,
                    "referral_link": (row.get("aw_deep_link") or "").strip(),
                    "product_page_link": (row.get("merchant_deep_link") or "").strip() or None,
                    "images": images[:6],
                    "sizes": [],
                    "color_variants": [],
                    "in_stock": False,
                    "ean": (row.get("ean") or "").strip() or None,
                    "last_updated": (row.get("last_updated") or "").strip() or None,
                }

            product = products[style_code]
            if size:
                if not any(s["size"] == size for s in product["sizes"]):
                    product["sizes"].append({"size": size, "in_stock": in_stock})
            if in_stock:
                product["in_stock"] = True

            if (i + 1) % 10000 == 0:
                print(f"...scanned {i + 1} rows, {len(products)} products matched so far")

    print(f"Done scanning. {len(products)} products to upsert.")

    # Drop products with no referral link or no price (unusable in the UI)
    rows = [p for p in products.values() if p["referral_link"] and p["price_current"]]
    print(f"{len(rows)} products have a referral link and price, importing those.")

    # Group colour variants: the feed has no parent/family id linking colours
    # of the same product (parent_product_id and model_number are both empty
    # in this feed), so fall back to grouping by exact (sport, lowercased
    # product_name) — different style codes sharing an identical name are, in
    # practice, the same product in different colours.
    name_groups: dict[tuple, list[dict]] = defaultdict(list)
    for p in rows:
        name_groups[(p["sport"], p["name"].strip().lower())].append(p)

    variant_count = 0
    for group in name_groups.values():
        if len(group) < 2:
            continue
        for p in group:
            p["color_variants"] = [
                {"id": other["id"], "colour": other["colour"], "image": (other["images"][0] if other["images"] else None)}
                for other in group
                if other["id"] != p["id"]
            ]
            variant_count += 1
    print(f"{variant_count} products have colour variants linked.")

    by_sport = defaultdict(int)
    for p in rows:
        by_sport[p["sport"]] += 1
    for sport, count in sorted(by_sport.items()):
        print(f"  {sport}: {count}")

    batch_size = 500
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        client.table("products").upsert(batch).execute()
        print(f"Upserted {min(i + batch_size, len(rows))}/{len(rows)}")

    print("Import complete.")


if __name__ == "__main__":
    main()
