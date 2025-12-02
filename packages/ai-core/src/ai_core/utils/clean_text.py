import re
import unicodedata

URL_RE = re.compile(r"https?://\S+|www\.\S+")
MULTISPACE_RE = re.compile(r"\s+")


def normalize_unicode(text: str) -> str:
    # chuẩn hoá tổ hợp dấu tiếng Việt
    return unicodedata.normalize("NFC", text)


def strip_urls(text: str) -> str:
    return URL_RE.sub(" ", text)


def basic_clean(text: str) -> str:
    if not text:
        return ""
    text = normalize_unicode(text)
    text = text.replace("\u200b", "")  # zero-width
    text = strip_urls(text)
    # bỏ ký tự lạ/emoji (đơn giản): giữ lại chữ, số, dấu câu cơ bản
    text = re.sub(r"[^0-9A-Za-zÀ-ỹ.,:;!?()'\-\s]", " ", text)
    text = MULTISPACE_RE.sub(" ", text).strip()
    return text


def valid_min_length(text: str, min_chars: int = 10) -> bool:
    return len(text) >= min_chars


# normalize_unicode(NFC): hợp nhất ký tự + dấu, tránh sai khi tokenization.
# zero-width: ký tự vô hình gây lỗi.
# min_chars: essay quá ngắn thường vô ích khi train.
