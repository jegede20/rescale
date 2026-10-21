"""
USDA SR Legacy standard nutrient data per 100g edible portion + common household gram weights.
Used alongside live USDA FoodData Central API lookups so every ingredient yields reliable
per-serving macro estimates even under API rate limits.
"""

from typing import Dict, Optional, Tuple

# Nutrient values per 100g: (calories_kcal, protein_g, carbs_g, fat_g, sugar_g, fiber_g, sodium_mg)
USDA_PER_100G: Dict[str, Tuple[float, float, float, float, float, float, float]] = {
    "all-purpose flour": (364.0, 10.3, 76.3, 1.0, 0.3, 2.7, 2.0),
    "bread flour": (361.0, 12.0, 72.5, 1.7, 0.3, 2.4, 2.0),
    "cake flour": (362.0, 8.2, 78.0, 0.9, 0.3, 1.7, 2.0),
    "whole wheat flour": (340.0, 13.2, 72.0, 2.5, 0.4, 10.7, 2.0),
    "almond flour": (579.0, 21.2, 21.6, 49.9, 4.4, 12.5, 1.0),
    "coconut flour": (400.0, 19.3, 60.0, 13.3, 8.7, 39.0, 48.0),
    "oat flour": (404.0, 14.7, 65.7, 9.1, 0.8, 6.5, 19.0),
    "flour": (364.0, 10.3, 76.3, 1.0, 0.3, 2.7, 2.0),
    "cornstarch": (381.0, 0.3, 91.3, 0.1, 0.0, 0.9, 9.0),
    "cornmeal": (370.0, 8.1, 79.1, 1.8, 0.6, 3.9, 7.0),
    "granulated sugar": (387.0, 0.0, 100.0, 0.0, 99.8, 0.0, 1.0),
    "white sugar": (387.0, 0.0, 100.0, 0.0, 99.8, 0.0, 1.0),
    "sugar": (387.0, 0.0, 100.0, 0.0, 99.8, 0.0, 1.0),
    "brown sugar": (380.0, 0.1, 98.1, 0.0, 97.0, 0.0, 28.0),
    "powdered sugar": (389.0, 0.0, 99.8, 0.0, 97.8, 0.0, 2.0),
    "confectioners sugar": (389.0, 0.0, 99.8, 0.0, 97.8, 0.0, 2.0),
    "honey": (304.0, 0.3, 82.4, 0.0, 82.1, 0.2, 4.0),
    "maple syrup": (260.0, 0.0, 67.0, 0.1, 60.5, 0.0, 12.0),
    "molasses": (290.0, 0.0, 74.7, 0.1, 74.7, 0.0, 37.0),
    "unsalted butter": (717.0, 0.9, 0.1, 81.1, 0.1, 0.0, 11.0),
    "salted butter": (717.0, 0.9, 0.1, 81.1, 0.1, 0.0, 643.0),
    "butter": (717.0, 0.9, 0.1, 81.1, 0.1, 0.0, 11.0),
    "olive oil": (884.0, 0.0, 0.0, 100.0, 0.0, 0.0, 2.0),
    "vegetable oil": (884.0, 0.0, 0.0, 100.0, 0.0, 0.0, 0.0),
    "canola oil": (884.0, 0.0, 0.0, 100.0, 0.0, 0.0, 0.0),
    "coconut oil": (892.0, 0.0, 0.0, 99.1, 0.0, 0.0, 0.0),
    "sesame oil": (884.0, 0.0, 0.0, 100.0, 0.0, 0.0, 0.0),
    "oil": (884.0, 0.0, 0.0, 100.0, 0.0, 0.0, 0.0),
    "whole milk": (61.0, 3.2, 4.8, 3.3, 5.1, 0.0, 43.0),
    "milk": (61.0, 3.2, 4.8, 3.3, 5.1, 0.0, 43.0),
    "skim milk": (34.0, 3.4, 5.0, 0.1, 5.0, 0.0, 42.0),
    "buttermilk": (40.0, 3.3, 4.8, 0.9, 4.8, 0.0, 105.0),
    "heavy cream": (340.0, 2.1, 2.7, 36.1, 2.7, 0.0, 27.0),
    "whipping cream": (340.0, 2.1, 2.7, 36.1, 2.7, 0.0, 27.0),
    "half-and-half": (131.0, 3.1, 4.3, 11.5, 4.3, 0.0, 41.0),
    "sour cream": (198.0, 2.4, 4.6, 19.4, 3.4, 0.0, 31.0),
    "greek yogurt": (97.0, 9.0, 3.9, 5.0, 3.2, 0.0, 35.0),
    "yogurt": (61.0, 3.5, 4.7, 3.3, 4.7, 0.0, 46.0),
    "cream cheese": (350.0, 6.2, 5.5, 34.4, 3.8, 0.0, 314.0),
    "parmesan": (431.0, 38.5, 4.1, 28.6, 0.9, 0.0, 1529.0),
    "cheddar": (403.0, 24.9, 1.3, 33.1, 0.5, 0.0, 621.0),
    "mozzarella": (280.0, 27.5, 3.1, 17.1, 1.0, 0.0, 500.0),
    "feta": (264.0, 14.2, 4.1, 21.3, 4.1, 0.0, 917.0),
    "ricotta": (174.0, 11.3, 3.0, 13.0, 0.3, 0.0, 84.0),
    "egg": (143.0, 12.6, 0.7, 9.5, 0.4, 0.0, 142.0),
    "eggs": (143.0, 12.6, 0.7, 9.5, 0.4, 0.0, 142.0),
    "egg yolk": (322.0, 15.9, 3.6, 26.5, 0.6, 0.0, 48.0),
    "egg white": (52.0, 10.9, 0.7, 0.2, 0.7, 0.0, 166.0),
    "chocolate chips": (479.0, 4.2, 63.1, 29.7, 54.0, 5.9, 11.0),
    "dark chocolate": (598.0, 7.8, 45.9, 42.6, 24.0, 10.9, 20.0),
    "cocoa powder": (228.0, 19.6, 57.9, 13.7, 1.8, 33.2, 21.0),
    "vanilla extract": (288.0, 0.1, 12.7, 0.1, 12.7, 0.0, 9.0),
    "baking powder": (53.0, 0.0, 27.7, 0.0, 0.0, 0.2, 10600.0),
    "baking soda": (0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 27360.0),
    "salt": (0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 38758.0),
    "kosher salt": (0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 38758.0),
    "black pepper": (251.0, 10.4, 64.0, 3.3, 0.6, 25.3, 20.0),
    "cinnamon": (247.0, 4.0, 80.6, 1.2, 2.2, 53.1, 10.0),
    "rolled oats": (389.0, 16.9, 66.3, 6.9, 1.0, 10.6, 2.0),
    "oats": (389.0, 16.9, 66.3, 6.9, 1.0, 10.6, 2.0),
    "white rice": (365.0, 7.1, 80.0, 0.7, 0.1, 1.3, 5.0),
    "brown rice": (367.0, 7.5, 76.2, 3.2, 0.7, 3.6, 5.0),
    "rice": (365.0, 7.1, 80.0, 0.7, 0.1, 1.3, 5.0),
    "pasta": (371.0, 13.0, 74.7, 1.5, 2.7, 3.2, 6.0),
    "spaghetti": (371.0, 13.0, 74.7, 1.5, 2.7, 3.2, 6.0),
    "quinoa": (368.0, 14.1, 64.2, 6.1, 1.6, 7.0, 5.0),
    "bread": (265.0, 9.0, 49.0, 3.2, 5.0, 2.7, 491.0),
    "breadcrumbs": (395.0, 13.4, 72.0, 5.3, 6.2, 4.5, 732.0),
    "chicken breast": (165.0, 31.0, 0.0, 3.6, 0.0, 0.0, 74.0),
    "chicken thigh": (177.0, 24.0, 0.0, 8.2, 0.0, 0.0, 84.0),
    "chicken": (172.0, 27.0, 0.0, 6.5, 0.0, 0.0, 78.0),
    "ground beef": (250.0, 17.2, 0.0, 20.0, 0.0, 0.0, 66.0),
    "beef": (250.0, 26.0, 0.0, 15.0, 0.0, 0.0, 72.0),
    "bacon": (541.0, 37.0, 1.4, 41.8, 0.0, 0.0, 1717.0),
    "pork": (242.0, 27.0, 0.0, 14.0, 0.0, 0.0, 62.0),
    "salmon": (208.0, 20.4, 0.0, 13.4, 0.0, 0.0, 59.0),
    "shrimp": (99.0, 24.0, 0.2, 0.3, 0.0, 0.0, 111.0),
    "tofu": (76.0, 8.1, 1.9, 4.8, 0.6, 0.3, 7.0),
    "black beans": (132.0, 8.9, 23.7, 0.5, 0.3, 8.7, 2.0),
    "chickpeas": (164.0, 8.9, 27.4, 2.6, 4.8, 7.6, 7.0),
    "lentils": (116.0, 9.0, 20.1, 0.4, 1.8, 7.9, 2.0),
    "garlic": (149.0, 6.4, 33.1, 0.5, 1.0, 2.1, 17.0),
    "onion": (40.0, 1.1, 9.3, 0.1, 4.2, 1.7, 4.0),
    "shallot": (72.0, 2.5, 16.8, 0.1, 7.9, 3.2, 12.0),
    "carrot": (41.0, 0.9, 9.6, 0.2, 4.7, 2.8, 69.0),
    "celery": (16.0, 0.7, 3.0, 0.2, 1.3, 1.6, 80.0),
    "potato": (77.0, 2.0, 17.5, 0.1, 0.8, 2.2, 6.0),
    "sweet potato": (86.0, 1.6, 20.1, 0.1, 4.2, 3.0, 55.0),
    "tomato": (18.0, 0.9, 3.9, 0.2, 2.6, 1.2, 5.0),
    "tomato paste": (82.0, 4.3, 18.9, 0.5, 12.2, 4.1, 59.0),
    "tomato sauce": (29.0, 1.3, 5.8, 0.3, 3.8, 1.5, 421.0),
    "spinach": (23.0, 2.9, 3.6, 0.4, 0.4, 2.2, 79.0),
    "broccoli": (34.0, 2.8, 6.6, 0.4, 1.7, 2.6, 33.0),
    "bell pepper": (31.0, 1.0, 6.0, 0.3, 4.2, 2.1, 4.0),
    "mushroom": (22.0, 3.1, 3.3, 0.3, 2.0, 1.0, 5.0),
    "avocado": (160.0, 2.0, 8.5, 14.7, 0.7, 6.7, 7.0),
    "banana": (89.0, 1.1, 22.8, 0.3, 12.2, 2.6, 1.0),
    "apple": (52.0, 0.3, 13.8, 0.2, 10.4, 2.4, 1.0),
    "lemon juice": (22.0, 0.4, 6.9, 0.2, 2.5, 0.3, 1.0),
    "lemon": (29.0, 1.1, 9.3, 0.3, 2.5, 2.8, 2.0),
    "blueberry": (57.0, 0.7, 14.5, 0.3, 10.0, 2.4, 1.0),
    "strawberry": (32.0, 0.7, 7.7, 0.3, 4.9, 2.0, 1.0),
    "walnuts": (654.0, 15.2, 13.7, 65.2, 2.6, 6.7, 2.0),
    "pecans": (691.0, 9.2, 13.9, 72.0, 4.0, 9.6, 0.0),
    "almonds": (579.0, 21.2, 21.6, 49.9, 4.4, 12.5, 1.0),
    "peanut butter": (588.0, 25.1, 20.0, 50.4, 9.2, 6.0, 429.0),
    "soy sauce": (53.0, 8.1, 4.9, 0.6, 0.4, 0.8, 5493.0),
    "chicken broth": (7.0, 0.6, 0.5, 0.2, 0.2, 0.0, 343.0),
    "vegetable broth": (5.0, 0.2, 0.8, 0.1, 0.4, 0.0, 310.0),
    "water": (0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 4.0),
}

COUNT_GRAMS: Dict[str, float] = {
    "egg": 50.0,
    "eggs": 50.0,
    "egg yolk": 17.0,
    "egg white": 33.0,
    "clove": 4.0,
    "cloves": 4.0,
    "garlic": 4.0,
    "banana": 118.0,
    "apple": 182.0,
    "lemon": 58.0,
    "lime": 44.0,
    "onion": 150.0,
    "shallot": 45.0,
    "carrot": 61.0,
    "potato": 170.0,
    "tomato": 123.0,
    "avocado": 150.0,
    "bell pepper": 120.0,
    "chicken breast": 175.0,
    "slice": 30.0,
    "stick": 113.5,
    "sticks": 113.5,
}

CUP_DENSITY_GRAMS: Dict[str, float] = {
    "flour": 120.0,
    "almond flour": 96.0,
    "coconut flour": 112.0,
    "cornstarch": 128.0,
    "granulated sugar": 200.0,
    "brown sugar": 213.0,
    "powdered sugar": 120.0,
    "sugar": 200.0,
    "butter": 227.0,
    "oil": 218.0,
    "honey": 340.0,
    "maple syrup": 315.0,
    "milk": 244.0,
    "buttermilk": 245.0,
    "heavy cream": 238.0,
    "sour cream": 230.0,
    "yogurt": 245.0,
    "oats": 90.0,
    "rice": 185.0,
    "chocolate chips": 170.0,
    "cocoa powder": 85.0,
    "peanut butter": 258.0,
    "walnuts": 115.0,
    "pecans": 109.0,
    "almonds": 143.0,
}


def estimate_grams(quantity: Optional[float], unit: str, ingredient_name: str) -> float:
    if quantity is None or quantity <= 0:
        return 0.0
    u = (unit or "").strip().lower()
    name = (ingredient_name or "").strip().lower()

    if u in ("g", "gram", "grams"):
        return quantity
    if u in ("kg", "kilogram", "kilograms"):
        return quantity * 1000.0
    if u in ("oz", "ounce", "ounces"):
        return quantity * 28.3495
    if u in ("lb", "lbs", "pound", "pounds"):
        return quantity * 453.592
    if u in ("ml", "milliliter", "milliliters"):
        return quantity
    if u in ("l", "liter", "liters", "litre", "litres"):
        return quantity * 1000.0

    # Cup-equivalent density lookup
    cup_grams = 240.0
    for key in sorted(CUP_DENSITY_GRAMS.keys(), key=len, reverse=True):
        if key in name:
            cup_grams = CUP_DENSITY_GRAMS[key]
            break

    if u in ("cup", "cups", "c"):
        return quantity * cup_grams
    if u in ("tbsp", "tablespoon", "tablespoons", "tbs"):
        return quantity * (cup_grams / 16.0)
    if u in ("tsp", "teaspoon", "teaspoons"):
        return quantity * (cup_grams / 48.0)
    if u in ("fl oz", "fluid ounce", "fluid ounces"):
        return quantity * 29.5735
    if u in ("pint", "pints", "pt"):
        return quantity * (cup_grams * 2.0)
    if u in ("quart", "quarts", "qt"):
        return quantity * (cup_grams * 4.0)
    if u in ("stick", "sticks"):
        return quantity * 113.5
    if u in ("clove", "cloves"):
        return quantity * 4.0
    if u in ("pinch", "dash"):
        return quantity * 0.5

    # Count-based fallback
    for key in sorted(COUNT_GRAMS.keys(), key=len, reverse=True):
        if key in name:
            return quantity * COUNT_GRAMS[key]

    return quantity * 50.0


def fallback_nutrients_per_100g(ingredient_name: str) -> Optional[Tuple[float, float, float, float, float, float, float]]:
    name = (ingredient_name or "").strip().lower()
    if name in USDA_PER_100G:
        return USDA_PER_100G[name]
    for key in sorted(USDA_PER_100G.keys(), key=len, reverse=True):
        if key in name:
            return USDA_PER_100G[key]
    return None
