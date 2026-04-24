import urllib.error
import urllib.request
import json
from django.core.cache import cache

GECKO_BASE = "https://api.geckoterminal.com/api/v2"
GECKO_TIMEOUT_SECONDS = 10

_HEADERS = {
    "Accept": "application/json;version=20230302",
    "User-Agent": "Z-NBP-Backend/1.0 (+https://localhost)",
}


def fetch_gecko(path: str) -> dict:
    if cache.get("gecko_429_lock"):
        raise GeckoError(429)

    url = f"{GECKO_BASE}{path}"
    req = urllib.request.Request(url, headers=_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        if exc.code == 429:
            cache.set("gecko_429_lock", True, 30)
        raise GeckoError(exc.code) from exc


class GeckoError(Exception):
    def __init__(self, status_code: int):
        self.status_code = status_code
        super().__init__(f"GeckoTerminal error: {status_code}")
