import re
from rapidfuzz import fuzz


def normalize_string(val: str) -> str:
    """
    Normalizes string by stripping, lowering case, and condensing whitespace.
    """
    if not val:
        return ""
    cleaned = re.sub(r"[^\w\s]", " ", val)
    return " ".join(cleaned.lower().split())


def compare_fields(label: str, existing: str, extracted: str) -> str:
    """
    Determines MATCH, MISMATCH, or UNCERTAIN between existing record and extracted document text.
    """
    if not extracted or extracted.strip() in ["", "—", "-", "N/A"]:
        return "UNCERTAIN"

    norm_exist = normalize_string(existing)
    norm_extract = normalize_string(extracted)

    # Exact normalized match
    if norm_exist == norm_extract:
        return "MATCH"

    # Address / multi-word fuzzy matching
    if "address" in label.lower() or "name" in label.lower():
        similarity = fuzz.token_sort_ratio(norm_exist, norm_extract)
        if similarity >= 85:
            return "MATCH"
        elif similarity >= 65:
            return "UNCERTAIN"
        else:
            return "MISMATCH"

    # Document number matching (ignore spaces/dashes)
    if "number" in label.lower() or "no" in label.lower():
        clean_exist = re.sub(r"[\s\-]", "", existing.upper())
        clean_extract = re.sub(r"[\s\-]", "", extracted.upper())
        if clean_exist == clean_extract:
            return "MATCH"
        return "MISMATCH"

    # Date comparison
    if "date" in label.lower() or "dob" in label.lower():
        # Clean spacing
        if norm_exist == norm_extract:
            return "MATCH"
        return "MISMATCH"

    return "MISMATCH"
