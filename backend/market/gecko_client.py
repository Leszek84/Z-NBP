import urllib.error
import urllib.parse
import urllib.request
import json

GECKO_BASE = "https://api.geckoterminal.com/api/v2"
_HEADERS = {"Accept": "application/json;version=20230302"}


def fetch_gecko(path: str) -> dict:
    url = f"{GECKO_BASE}{path}"
    req = urllib.request.Request(url, headers=_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        raise GeckoError(exc.code) from exc


class GeckoError(Exception):
    def __init__(self, status_code: int):
        self.status_code = status_code
        super().__init__(f"GeckoTerminal error: {status_code}")
