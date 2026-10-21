import asyncio
import base64
import io
import json
import os
import re
from fractions import Fraction
from typing import Any, Dict, List, Optional

import httpx
import pytesseract
from bs4 import BeautifulSoup
from curl_cffi import requests as cffi_requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from groq import AsyncGroq
from ingredient_parser import parse_ingredient
from PIL import Image, ImageEnhance, ImageOps
from pydantic import BaseModel
from recipe_scrapers import scrape_html

from usda_fallback import estimate_grams, fallback_nutrients_per_100g

load_dotenv()

app = FastAPI(
    title="Rescale API",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "HEAD", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/")
async def root_health() -> Dict[str, str]:
    return {"status": "ok", "service": "Rescale API"}

AI_PARSE_SYSTEM_PROMPT = (
    "You are an expert chef and recipe parser. "
    "1) If the input text already contains a recipe (even messy, unformatted, or dictated speech), "
    "extract its structured recipe data accurately. "
    "2) If the input text is just a dish name, short phrase, or bare ingredient list without cooking steps "
    "(for example 'noodles and egg', 'jollof rice for 4', or 'fluffy pancakes'), "
    "generate a complete, authentic, chef-tested home recipe for that dish with proper quantities, units, and step-by-step instructions (including temperatures and cook times). "
    "Return valid JSON ONLY with fields: title (string), servings (number), "
    "ingredients (array of {quantity (number or null), unit (string), ingredient (string), preparation (string)}), "
    "and steps (array of clear step strings)."
)

UNSCALABLE_UNITS = {
    "pinch",
    "pinches",
    "dash",
    "dashes",
    "smidgen",
    "drop",
    "drops",
    "splash",
    "handful",
    "handfuls",
}

UNSCALABLE_PHRASES = (
    "to taste",
    "as needed",
    "for garnish",
    "for serving",
    "for dusting",
    "for greasing",
    "optional",
)

PLURAL_UNIT_MAP = {
    "cup": "cups",
    "tablespoon": "tablespoons",
    "teaspoon": "teaspoons",
    "ounce": "ounces",
    "pound": "pounds",
    "gram": "grams",
    "kilogram": "kg",
    "milliliter": "mL",
    "liter": "liters",
    "clove": "cloves",
    "slice": "slices",
    "stick": "sticks",
    "can": "cans",
    "bunch": "bunches",
    "sprig": "sprigs",
}

USDA_CACHE: Dict[str, tuple[float, float, float, float, float, float, float]] = {}


class ParseRequest(BaseModel):
    ingredients: List[str]


class ScrapeRequest(BaseModel):
    url: str


class AIParseRequest(BaseModel):
    text: str


class NutritionIngredientItem(BaseModel):
    quantity: Optional[float] = None
    unit: str = ""
    ingredient: str


class NutritionRequest(BaseModel):
    ingredients: List[NutritionIngredientItem]
    servings: int = 1


def _to_float(val: Any) -> Optional[float]:
    if val is None or val == "":
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, Fraction):
        return float(val)
    try:
        return float(Fraction(str(val).strip()))
    except Exception:
        try:
            return float(str(val).strip())
        except Exception:
            return None


def _format_unit(unit_obj: Any, qty: Optional[float]) -> str:
    if unit_obj is None:
        return ""
    raw = str(unit_obj).strip()
    if not raw:
        return ""
    lower = raw.lower()
    if lower == "milliliter" or lower == "milliliters" or lower == "ml":
        return "mL"
    if qty is not None and qty > 1 and lower in PLURAL_UNIT_MAP:
        return PLURAL_UNIT_MAP[lower]
    return raw


def _parse_single_ingredient(line: str) -> Dict[str, Any]:
    cleaned = re.sub(r"^\s*[-•*▪◦]+\s*", "", line or "").strip()
    if not cleaned:
        return {
            "raw": line,
            "quantity": None,
            "quantityMax": None,
            "unit": "",
            "ingredient": "",
            "preparation": "",
            "isRange": False,
            "unscalable": True,
            "confidence": 0.0,
        }

    parsed = parse_ingredient(cleaned)

    names = getattr(parsed, "name", None) or []
    if isinstance(names, list):
        ingredient_name = ", ".join(n.text for n in names if getattr(n, "text", "")).strip()
        name_conf = min((getattr(n, "confidence", 0.85) for n in names), default=0.7)
    else:
        ingredient_name = getattr(names, "text", "") or cleaned
        name_conf = getattr(names, "confidence", 0.85)

    prep_parts: List[str] = []
    prep_obj = getattr(parsed, "preparation", None)
    if prep_obj and getattr(prep_obj, "text", ""):
        prep_parts.append(prep_obj.text.strip())
    size_obj = getattr(parsed, "size", None)
    if size_obj and getattr(size_obj, "text", ""):
        ingredient_name = f"{size_obj.text.strip()} {ingredient_name}".strip()
    comment_obj = getattr(parsed, "comment", None)
    if comment_obj and getattr(comment_obj, "text", ""):
        prep_parts.append(comment_obj.text.strip("() "))

    preparation = ", ".join(p for p in prep_parts if p)

    amounts = getattr(parsed, "amount", None) or []
    qty: Optional[float] = None
    qty_max: Optional[float] = None
    unit_str = ""
    is_range = False
    amt_conf = 0.85

    if amounts:
        primary = amounts[0]
        qty = _to_float(getattr(primary, "quantity", None))
        qty_max = _to_float(getattr(primary, "quantity_max", None))
        is_range = bool(getattr(primary, "RANGE", False)) or (
            qty is not None and qty_max is not None and qty_max > qty
        )
        unit_str = _format_unit(getattr(primary, "unit", None), qty)
        amt_conf = float(getattr(primary, "confidence", 0.9))

    lower_line = cleaned.lower()
    is_unscalable = (
        qty is None
        or unit_str.lower() in UNSCALABLE_UNITS
        or any(phrase in lower_line for phrase in UNSCALABLE_PHRASES)
    )

    if is_unscalable and unit_str.lower() in UNSCALABLE_UNITS and qty == 1.0:
        # Preserve human phrase such as "pinch" while marking unscalable
        qty = None

    confidence = round(min(name_conf, amt_conf), 3)

    return {
        "raw": cleaned,
        "quantity": round(qty, 4) if qty is not None else None,
        "quantityMax": round(qty_max, 4) if (is_range and qty_max is not None) else None,
        "unit": unit_str,
        "ingredient": ingredient_name or cleaned,
        "preparation": preparation,
        "isRange": is_range,
        "unscalable": is_unscalable,
        "confidence": confidence,
    }


def _extract_servings_number(value: Any, default: int = 4) -> int:
    if isinstance(value, int) and value > 0:
        return value
    if isinstance(value, list) and value:
        value = value[0]
    text = str(value or "")
    match = re.search(r"(\d+)", text)
    if match:
        n = int(match.group(1))
        if 1 <= n <= 200:
            return n
    return default


def _fallback_structure_text(text: str) -> Dict[str, Any]:
    lines = [ln.strip() for ln in (text or "").splitlines() if ln.strip()]
    if not lines:
        return {"title": "Untitled Recipe", "servings": 4, "ingredients": [], "steps": []}

    title = "Untitled Recipe"
    servings = 4
    ing_lines: List[str] = []
    step_lines: List[str] = []

    section: Optional[str] = None
    unit_hint = re.compile(
        r"^(\d+|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|a\s+pinch|pinch|salt\b|pepper\b|olive\s+oil\b)",
        re.IGNORECASE,
    )

    for idx, ln in enumerate(lines):
        serv_match = re.search(
            r"(?:serves|servings|yield|makes)\s*:?\s*(\d+)", ln, re.IGNORECASE
        )
        if serv_match:
            servings = int(serv_match.group(1))
            if len(ln) < 32:
                continue

        if idx == 0 and len(ln) < 90 and not unit_hint.match(ln):
            title = re.sub(r"^#+\s*", "", ln)
            continue

        header_clean = re.sub(r"[:\-\s#*]+$", "", ln).strip().lower()
        if header_clean in ("ingredients", "ingredient list", "what you need", "for the batter", "for the sauce"):
            section = "ingredients"
            continue
        if header_clean in ("instructions", "directions", "method", "steps", "preparation", "how to make it"):
            section = "steps"
            continue

        if section == "ingredients":
            ing_lines.append(ln)
        elif section == "steps":
            step_lines.append(re.sub(r"^\d+[\).\-\s]+", "", ln).strip())
        else:
            if re.match(r"^\d+[\).\s]+[A-Z]", ln) or len(ln) > 95:
                step_lines.append(re.sub(r"^\d+[\).\-\s]+", "", ln).strip())
            elif unit_hint.match(ln) or len(ln) < 65:
                ing_lines.append(ln)
            else:
                step_lines.append(ln)

    # Split single-block prose steps into sentences if needed
    if len(step_lines) == 1 and len(step_lines[0]) > 60:
        chunks = [
            s.strip()
            for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", step_lines[0])
            if s.strip()
        ]
        if len(chunks) > 1:
            step_lines = chunks

    parsed_ings = []
    for raw_ing in ing_lines:
        item = _parse_single_ingredient(raw_ing)
        parsed_ings.append(
            {
                "quantity": item["quantity"],
                "unit": item["unit"],
                "ingredient": item["ingredient"],
                "preparation": item["preparation"],
            }
        )

    return {
        "title": title,
        "servings": servings,
        "ingredients": parsed_ings,
        "steps": step_lines,
    }


@app.post("/parse")
async def parse_ingredients_endpoint(payload: ParseRequest) -> List[Dict[str, Any]]:
    results = await asyncio.to_thread(
        lambda: [_parse_single_ingredient(item) for item in payload.ingredients]
    )
    return results


VISION_RECIPE_PROMPT = """You are an expert culinary OCR and visual recipe assistant.
Examine this image carefully and follow ONE of the two cases below:

CASE 1 — The image contains readable recipe text (cookbook page, recipe card, handwritten note, or screenshot):
Transcribe the entire recipe verbatim (Title, Servings, Ingredients with exact fractions/units, and numbered Instructions).

CASE 2 — The image is a photograph of a prepared dish / food with NO written recipe text:
1. Inspect the food closely before naming it: check exact pasta/grain/bread shape (for example, distinguish baked elbow macaroni & cheese casserole from bread sliders/rolls, rice dishes, etc.), cheese sauce or crust, proteins, vegetables, spices, and baking dish or plate.
2. Identify the dish accurately and write a complete, authentic, chef-tested home recipe for that exact dish.

STRICT OUTPUT FORMAT (plain text ONLY — NO markdown bold **, NO backticks, NO commentary, NEVER say "No recipe text appears in this image"):
<Dish Title>
Serves <number>

Ingredients:
<quantity> <unit> <ingredient, preparation>
...

Instructions:
1. <step with exact temperatures in °F and cooking times in minutes>
2. <step>
..."""

SCRAPE_AI_SYSTEM_PROMPT = """Extract the recipe from the provided webpage content and return ONLY valid JSON with this exact schema:
{
  "title": "Exact Recipe Title",
  "servings": 4,
  "ingredients": ["1 cup all-purpose flour", "2 large eggs, room temperature"],
  "instructions": ["Arrange a rack in the middle of the oven and heat to 350°F...", "Whisk flour..."]
}
Rules:
- Extract the REAL ingredients (with exact quantities/units) and step-by-step instructions from the page.
- Ignore ads, author bios, related recipes, comments, and video player controls.
- If the page genuinely contains NO recipe at all, return {"title": "", "servings": 4, "ingredients": [], "instructions": []}."""


def _normalize_scrape_url(raw: str) -> str:
    cleaned = (raw or "").strip()
    url_match = re.search(r"https?://[^\s<>\"']+", cleaned)
    if url_match:
        return url_match.group(0).rstrip(".,;)")
    if cleaned and not cleaned.startswith(("http://", "https://")) and "." in cleaned:
        return f"https://{cleaned}"
    return cleaned


def _extract_jsonld_recipe(html: str) -> Optional[Dict[str, Any]]:
    soup = BeautifulSoup(html, "lxml")

    def _walk_nodes(obj: Any) -> List[Dict[str, Any]]:
        found: List[Dict[str, Any]] = []
        if isinstance(obj, dict):
            found.append(obj)
            if "@graph" in obj:
                found.extend(_walk_nodes(obj["@graph"]))
        elif isinstance(obj, list):
            for el in obj:
                found.extend(_walk_nodes(el))
        return found

    def _extract_steps(raw_steps: Any) -> List[str]:
        out: List[str] = []
        if isinstance(raw_steps, str):
            out.extend(s.strip() for s in raw_steps.splitlines() if s.strip())
        elif isinstance(raw_steps, list):
            for st in raw_steps:
                if isinstance(st, str) and st.strip():
                    out.append(st.strip())
                elif isinstance(st, dict):
                    if st.get("text"):
                        out.append(str(st["text"]).strip())
                    elif "itemListElement" in st:
                        out.extend(_extract_steps(st["itemListElement"]))
        return out

    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "{}")
            for node in _walk_nodes(data):
                node_type = node.get("@type", "")
                if "Recipe" in str(node_type):
                    ingredients = [str(i).strip() for i in (node.get("recipeIngredient") or []) if str(i).strip()]
                    steps = _extract_steps(node.get("recipeInstructions", []))
                    if ingredients or steps:
                        img_field = node.get("image")
                        image_url = None
                        if isinstance(img_field, str):
                            image_url = img_field
                        elif isinstance(img_field, list) and img_field:
                            image_url = img_field[0].get("url") if isinstance(img_field[0], dict) else img_field[0]
                        elif isinstance(img_field, dict):
                            image_url = img_field.get("url")
                        return {
                            "title": str(node.get("name") or "Imported Recipe").strip(),
                            "servings": _extract_servings_number(node.get("recipeYield"), default=4),
                            "ingredients": ingredients,
                            "instructions": steps,
                            "image": image_url,
                        }
        except Exception:
            continue
    return None


@app.post("/scrape")
async def scrape_recipe_endpoint(payload: ScrapeRequest) -> Dict[str, Any]:
    url = _normalize_scrape_url(payload.url)
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid recipe URL.")

    html = ""
    http_status = 0

    # Tier 1: Real Chrome TLS/HTTP2 impersonation via curl_cffi (bypasses standard Python TLS blocks)
    def _fetch_chrome(target_url: str) -> tuple[int, str]:
        resp = cffi_requests.get(
            target_url,
            impersonate="chrome",
            timeout=15,
            allow_redirects=True,
        )
        return resp.status_code, resp.text

    try:
        http_status, html = await asyncio.to_thread(_fetch_chrome, url)
    except Exception:
        http_status, html = 0, ""

    if http_status == 200 and html:
        try:
            scraper = scrape_html(html, org_url=url, supported_only=False)
            title = (scraper.title() or "Imported Recipe").strip()
            servings = _extract_servings_number(scraper.yields(), default=4)
            ingredients = [str(i).strip() for i in (scraper.ingredients() or []) if str(i).strip()]
            instructions = [str(s).strip() for s in (scraper.instructions_list() or []) if str(s).strip()]
            if not instructions:
                raw_inst = scraper.instructions() or ""
                instructions = [s.strip() for s in raw_inst.splitlines() if s.strip()]
            try:
                image = scraper.image()
            except Exception:
                image = None

            if ingredients and instructions:
                return {
                    "title": title,
                    "servings": servings,
                    "ingredients": ingredients,
                    "instructions": instructions,
                    "image": image,
                }
        except Exception:
            pass

        ld_recipe = _extract_jsonld_recipe(html)
        if ld_recipe:
            return ld_recipe

    # Tier 2: Cloudflare / Anti-Bot Reader (r.jina.ai) + LLM Structured Extraction
    page_markdown = ""
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=22.0) as client:
            jina_resp = await client.get(
                f"https://r.jina.ai/{url}",
                headers={"Accept": "text/plain"},
            )
            if jina_resp.status_code == 200 and len(jina_resp.text.strip()) > 120:
                page_markdown = jina_resp.text.strip()
    except Exception:
        page_markdown = ""

    # Fallback readable text from direct HTML if available
    if not page_markdown and html and http_status == 200:
        soup = BeautifulSoup(html, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "aside"]):
            tag.decompose()
        page_markdown = soup.get_text("\n", strip=True)

    if page_markdown:
        trimmed_content = page_markdown[:28000]

        # Extract cleanly via Groq primary model
        groq_key = os.getenv("GROQ_API_KEY", "").strip()
        if groq_key:
            client = AsyncGroq(api_key=groq_key)
            primary_model = os.getenv("GROQ_TEXT_MODEL", "openai/gpt-oss-120b").strip()
            for model_id in list(dict.fromkeys([primary_model, "openai/gpt-oss-20b"])):
                try:
                    comp = await client.chat.completions.create(
                        model=model_id,
                        messages=[
                            {"role": "system", "content": SCRAPE_AI_SYSTEM_PROMPT},
                            {"role": "user", "content": trimmed_content},
                        ],
                        temperature=0.0,
                        response_format={"type": "json_object"},
                    )
                    raw_json = (comp.choices[0].message.content or "{}").strip()
                    data = json.loads(raw_json)
                    ings = [str(i).strip() for i in (data.get("ingredients") or []) if str(i).strip()]
                    steps = [str(s).strip() for s in (data.get("instructions") or []) if str(s).strip()]
                    if ings or steps:
                        return {
                            "title": str(data.get("title") or "Imported Recipe").strip(),
                            "servings": _extract_servings_number(data.get("servings"), default=4),
                            "ingredients": ings,
                            "instructions": steps,
                            "image": None,
                        }
                except Exception:
                    continue

        # Secondary AI fallback via Gemini free key
        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        if gemini_key:
            g_model = os.getenv("GEMINI_VISION_MODEL", "gemini-3.5-flash").strip()
            try:
                async with httpx.AsyncClient(timeout=22.0) as g_client:
                    g_resp = await g_client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent",
                        params={"key": gemini_key},
                        json={
                            "contents": [
                                {
                                    "parts": [
                                        {"text": f"{SCRAPE_AI_SYSTEM_PROMPT}\n\nWEBPAGE CONTENT:\n{trimmed_content}"}
                                    ]
                                }
                            ],
                            "generationConfig": {
                                "temperature": 0.0,
                                "responseMimeType": "application/json",
                            },
                        },
                    )
                    if g_resp.status_code == 200:
                        parts = (g_resp.json().get("candidates") or [{}])[0].get("content", {}).get("parts") or []
                        txt = "".join(p.get("text", "") for p in parts if not p.get("thought")).strip()
                        data = json.loads(txt)
                        ings = [str(i).strip() for i in (data.get("ingredients") or []) if str(i).strip()]
                        steps = [str(s).strip() for s in (data.get("instructions") or []) if str(s).strip()]
                        if ings or steps:
                            return {
                                "title": str(data.get("title") or "Imported Recipe").strip(),
                                "servings": _extract_servings_number(data.get("servings"), default=4),
                                "ingredients": ings,
                                "instructions": steps,
                                "image": None,
                            }
            except Exception:
                pass

    raise HTTPException(
        status_code=422,
        detail="No structured recipe found at that URL.",
    )


def _is_refusal_or_non_recipe(text: str) -> bool:
    if not text or len(text.strip()) < 20:
        return True
    lowered = text.lower()
    refusal_markers = (
        "no recipe text",
        "only shows a photograph",
        "does not contain any text",
        "no text visible",
        "cannot find any recipe",
        "there is no text",
    )
    return any(m in lowered for m in refusal_markers)


@app.post("/ocr")
async def ocr_endpoint(
    files: Optional[List[UploadFile]] = File(default=None),
    file: Optional[UploadFile] = File(default=None),
) -> Dict[str, str]:
    uploads: List[UploadFile] = []
    if files:
        uploads.extend(f for f in files if f is not None)
    if file is not None:
        uploads.append(file)

    if not uploads:
        raise HTTPException(status_code=400, detail="Empty image upload.")
    if len(uploads) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 images allowed per scan.")

    raw_images: List[bytes] = []
    for up in uploads:
        b = await up.read()
        if b:
            raw_images.append(b)

    if not raw_images:
        raise HTTPException(status_code=400, detail="Empty image upload.")

    def _compose_clean_vision_frame(raw_list: List[bytes]) -> bytes:
        pil_imgs = [
            ImageOps.exif_transpose(Image.open(io.BytesIO(b))).convert("RGB")
            for b in raw_list
        ]
        if len(pil_imgs) == 1:
            im = pil_imgs[0].copy()
            im.thumbnail((1500, 1500), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=88)
            return buf.getvalue()

        # Stack 2..5 images vertically at crisp readable width under Groq's 4MP single-request limit
        target_w = 1100
        scaled: List[Image.Image] = []
        for sub in pil_imgs:
            ratio = target_w / max(1, sub.width)
            new_h = max(1, int(sub.height * ratio))
            scaled.append(sub.resize((target_w, new_h), Image.Resampling.LANCZOS))

        divider_h = 18
        total_h = sum(s.height for s in scaled) + divider_h * (len(scaled) - 1)
        canvas = Image.new("RGB", (target_w, total_h), (245, 243, 238))
        y = 0
        for s in scaled:
            canvas.paste(s, (0, y))
            y += s.height + divider_h

        # Keep total pixel area safely under 3.2 megapixels while preserving razor-sharp text
        max_pixels = 3_100_000
        cur_pixels = canvas.width * canvas.height
        if cur_pixels > max_pixels:
            scale = (max_pixels / cur_pixels) ** 0.5
            canvas = canvas.resize(
                (max(1, int(canvas.width * scale)), max(1, int(canvas.height * scale))),
                Image.Resampling.LANCZOS,
            )

        buf = io.BytesIO()
        canvas.save(buf, format="JPEG", quality=88)
        return buf.getvalue()

    def _run_tesseract_all(all_bytes: List[bytes]) -> str:
        pages: List[str] = []
        for img_bytes in all_bytes:
            img = ImageOps.exif_transpose(Image.open(io.BytesIO(img_bytes)))
            gray = ImageOps.grayscale(img)
            enhanced = ImageEnhance.Contrast(gray).enhance(1.5)
            txt = pytesseract.image_to_string(enhanced).strip()
            if txt:
                pages.append(txt)
        return "\n\n".join(pages).strip()

    try:
        combined_jpeg = await asyncio.to_thread(_compose_clean_vision_frame, raw_images)
    except Exception:
        raise HTTPException(
            status_code=422,
            detail="Unsupported or corrupted image file.",
        )

    multi_note = (
        f"\nNOTE: This composite stacks {len(raw_images)} sequential images top-to-bottom in reading order. "
        "Combine every ingredient and instruction across all sections seamlessly into ONE unified, non-duplicated recipe."
        if len(raw_images) > 1
        else ""
    )
    full_vision_prompt = VISION_RECIPE_PROMPT + multi_note
    b64_img = base64.b64encode(combined_jpeg).decode("ascii")

    extracted = ""

    # Tier 1a (Blazing ~1.3s response across all 1..5 images!): Groq LPU Multimodal Vision
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_key:
        try:
            vision_model = os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b").strip()
            gclient = AsyncGroq(api_key=groq_key, max_retries=1, timeout=15.0)
            v_comp = await gclient.chat.completions.create(
                model=vision_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": full_vision_prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}},
                        ],
                    }
                ],
                temperature=0.1,
                max_tokens=2048,
            )
            candidate_text = (v_comp.choices[0].message.content or "").replace("**", "").strip()
            if not _is_refusal_or_non_recipe(candidate_text):
                extracted = candidate_text
        except Exception:
            extracted = ""

    # Tier 1b: Google AI Studio Gemini 3.5 Flash Vision fallback (verified 200 OK!)
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not extracted and gemini_key:
        primary_gemini = os.getenv("GEMINI_VISION_MODEL", "gemini-3.5-flash").strip()
        gemini_models = list(dict.fromkeys([primary_gemini, "gemini-3.5-flash", "gemini-3.8-flash"]))
        async with httpx.AsyncClient(timeout=20.0) as client:
            for g_model in gemini_models:
                try:
                    g_resp = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent",
                        params={"key": gemini_key},
                        json={
                            "contents": [
                                {
                                    "parts": [
                                        {"text": full_vision_prompt},
                                        {"inline_data": {"mime_type": "image/jpeg", "data": b64_img}},
                                    ]
                                }
                            ],
                            "generationConfig": {"temperature": 0.1},
                        },
                    )
                    if g_resp.status_code != 200:
                        continue
                    candidates = g_resp.json().get("candidates") or []
                    if candidates:
                        parts = (candidates[0].get("content") or {}).get("parts") or []
                        candidate_text = "".join(
                            p.get("text", "") for p in parts if not p.get("thought")
                        ).replace("**", "").strip()
                        if not _is_refusal_or_non_recipe(candidate_text):
                            extracted = candidate_text
                            break
                except Exception:
                    continue

    # Tier 2 (Optional free cloud OCR): OCR.space API
    ocr_space_key = os.getenv("OCR_SPACE_API_KEY", "").strip()
    if not extracted and ocr_space_key:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                o_resp = await client.post(
                    "https://api.ocr.space/parse/image",
                    data={
                        "apikey": ocr_space_key,
                        "base64Image": f"data:image/jpeg;base64,{b64_img}",
                        "language": "eng",
                        "OCREngine": "2",
                    },
                )
                o_resp.raise_for_status()
                results = o_resp.json().get("ParsedResults") or []
                extracted = "\n".join(r.get("ParsedText", "") for r in results).strip()
        except Exception:
            extracted = ""

    # Tier 3 (Offline container fallback): Local Tesseract 5 across all uploaded images
    if not extracted:
        try:
            extracted = await asyncio.to_thread(_run_tesseract_all, raw_images)
        except Exception:
            extracted = ""

    if not extracted:
        raise HTTPException(
            status_code=422,
            detail="No readable recipe text detected in image.",
        )

    return {"text": extracted}


WHISPER_SILENCE_ARTIFACTS = {
    "thank you",
    "thank you.",
    "thanks for watching",
    "thanks for watching.",
    "thanks for listening",
    "subtitles by the amara.org community",
    "you",
    ".",
    "...",
}


@app.post("/voice")
async def voice_endpoint(file: UploadFile = File(...)) -> Dict[str, str]:
    audio_bytes = await file.read()
    if not audio_bytes or len(audio_bytes) < 256:
        raise HTTPException(status_code=400, detail="Recording was too short or empty.")

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_key:
        raise HTTPException(
            status_code=503,
            detail="Voice transcription fallback requires GROQ_API_KEY.",
        )

    # Ensure filename extension matches container MIME so Whisper decodes WebM/MP4/OGG/WAV accurately
    raw_name = (file.filename or "").strip()
    ctype = (file.content_type or "").lower()
    if not raw_name:
        if "mp4" in ctype or "aac" in ctype or "m4a" in ctype:
            raw_name = "recording.m4a"
        elif "ogg" in ctype:
            raw_name = "recording.ogg"
        elif "wav" in ctype:
            raw_name = "recording.wav"
        else:
            raw_name = "recording.webm"

    client = AsyncGroq(api_key=groq_key)
    primary_voice = os.getenv("GROQ_VOICE_MODEL", "whisper-large-v3-turbo").strip()
    voice_models = list(dict.fromkeys([primary_voice, "whisper-large-v3"]))

    last_exc: Optional[Exception] = None
    for model_id in voice_models:
        try:
            transcription = await client.audio.transcriptions.create(
                file=(raw_name, audio_bytes),
                model=model_id,
                language="en",
                temperature=0.0,
                prompt="Cooking recipe dictation: dish name, servings, ingredients, fractions, cups, tablespoons, teaspoons, grams, temperatures, and cooking instructions.",
                response_format="json",
            )
            cleaned = (transcription.text or "").strip()
            if cleaned.lower() in WHISPER_SILENCE_ARTIFACTS:
                cleaned = ""
            return {"text": cleaned}
        except Exception as exc:
            last_exc = exc

    raise HTTPException(
        status_code=502, detail="Could not transcribe audio."
    ) from last_exc


@app.post("/ai-parse")
async def ai_parse_endpoint(payload: AIParseRequest) -> Dict[str, Any]:
    raw_text = (payload.text or "").strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Recipe text is empty.")

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_key:
        client = AsyncGroq(api_key=groq_key)
        primary_model = os.getenv("GROQ_TEXT_MODEL", "openai/gpt-oss-120b").strip()
        candidate_models = list(
            dict.fromkeys([primary_model, "openai/gpt-oss-20b", "qwen/qwen3.8-27b"])
        )
        for model_id in candidate_models:
            try:
                completion = await client.chat.completions.create(
                    model=model_id,
                    messages=[
                        {"role": "system", "content": AI_PARSE_SYSTEM_PROMPT},
                        {"role": "user", "content": raw_text},
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"},
                )
                content = (completion.choices[0].message.content or "{}").strip()
                content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content).strip()
                parsed_json = json.loads(content)
                return {
                    "title": str(parsed_json.get("title") or "Untitled Recipe"),
                    "servings": _extract_servings_number(parsed_json.get("servings"), 4),
                    "ingredients": parsed_json.get("ingredients") or [],
                    "steps": [
                        str(s)
                        for s in (parsed_json.get("steps") or [])
                        if str(s).strip()
                    ],
                }
            except Exception:
                continue

    return await asyncio.to_thread(_fallback_structure_text, raw_text)


async def _lookup_usda_per_100g(
    client: httpx.AsyncClient, ingredient_name: str, api_key: str
) -> tuple[float, float, float, float, float, float, float]:
    cache_key = ingredient_name.strip().lower()
    if cache_key in USDA_CACHE:
        return USDA_CACHE[cache_key]

    curated = fallback_nutrients_per_100g(cache_key)
    try:
        resp = await client.get(
            "https://api.nal.usda.gov/fdc/v1/foods/search",
            params={
                "api_key": api_key,
                "query": cache_key,
                "dataType": ["Foundation", "SR Legacy"],
                "pageSize": 1,
            },
        )
        if resp.status_code == 200:
            foods = resp.json().get("foods") or []
            if foods:
                nutrients = foods[0].get("foodNutrients") or []
                by_id: Dict[int, float] = {}
                for n in nutrients:
                    nid = n.get("nutrientId")
                    val = n.get("value")
                    if nid is not None and val is not None:
                        by_id[int(nid)] = float(val)

                kcal = by_id.get(1008) or by_id.get(2047) or 0.0
                protein = by_id.get(1003, 0.0)
                fat = by_id.get(1004, 0.0)
                carbs = by_id.get(1005, 0.0)
                sugar = by_id.get(2000, by_id.get(1063, 0.0))
                fiber = by_id.get(1079, 0.0)
                sodium = by_id.get(1093, 0.0)

                if kcal > 0 or protein > 0 or carbs > 0 or fat > 0 or sodium > 0:
                    tup = (kcal, protein, carbs, fat, sugar, fiber, sodium)
                    USDA_CACHE[cache_key] = tup
                    return tup
    except Exception:
        pass

    if curated is not None:
        USDA_CACHE[cache_key] = curated
        return curated

    return (0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)


@app.post("/nutrition")
async def nutrition_endpoint(payload: NutritionRequest) -> Dict[str, float]:
    api_key = os.getenv("USDA_API_KEY", "").strip() or "DEMO_KEY"
    servings = max(1, int(payload.servings or 1))

    totals = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]

    async with httpx.AsyncClient(timeout=8.0) as client:
        tasks = [
            _lookup_usda_per_100g(client, item.ingredient, api_key)
            for item in payload.ingredients
        ]
        per_100g_list = await asyncio.gather(*tasks)

    for item, per_100g in zip(payload.ingredients, per_100g_list):
        grams = estimate_grams(item.quantity, item.unit, item.ingredient)
        factor = grams / 100.0
        for i in range(7):
            totals[i] += per_100g[i] * factor

    return {
        "calories": round(totals[0] / servings),
        "protein": round(totals[1] / servings, 1),
        "carbs": round(totals[2] / servings, 1),
        "fat": round(totals[3] / servings, 1),
        "sugar": round(totals[4] / servings, 1),
        "fiber": round(totals[5] / servings, 1),
        "sodium": round(totals[6] / servings),
    }
