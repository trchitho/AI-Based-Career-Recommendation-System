import re
import unicodedata

URL_RE = re.compile(r"https?://\S+|www\.\S+")
MULTISPACE_RE = re.compile(r"\s+")


def normalize_unicode(text: str) -> str:
    # chuáº©n hoÃ¡ tá»• há»£p dáº¥u tiáº¿ng Viá»‡t
    return unicodedata.normalize("NFC", text)


def strip_urls(text: str) -> str:
    return URL_RE.sub(" ", text)


def basic_clean(text: str) -> str:
    if not text:
        return ""
    text = normalize_unicode(text)
    text = text.replace("\u200b", "")  # zero-width
    text = strip_urls(text)
    # bá» kÃ½ tá»± láº¡/emoji (Ä‘Æ¡n giáº£n): giá»¯ láº¡i chá»¯, sá»‘, dáº¥u cÃ¢u cÆ¡ báº£n
    text = re.sub(r"[^0-9A-Za-zÃ€-á»¹.,:;!?()'\-\s]", " ", text)
    text = MULTISPACE_RE.sub(" ", text).strip()
    return text


def valid_min_length(text: str, min_chars: int = 10) -> bool:
    return len(text) >= min_chars


# normalize_unicode(NFC): há»£p nháº¥t kÃ½ tá»± + dáº¥u â†’ trÃ¡nh sai khi tokenization.
# zero-width: kÃ½ tá»± vÃ´ hÃ¬nh gÃ¢y lá»—i.
# min_chars: essay quÃ¡ ngáº¯n thÆ°á»ng vÃ´ Ã­ch Ä‘á»ƒ train.
