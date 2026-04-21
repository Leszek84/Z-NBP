from unittest.mock import MagicMock, patch

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

LOCMEM_CACHE = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-market-cache",
    }
}

TRENDING_RESPONSE = {
    "data": [
        {
            "id": "eth_0xpool1",
            "attributes": {
                "name": "TOKEN / WETH",
                "base_token_price_usd": "1.23",
                "price_change_percentage": {"h24": "5.5"},
            },
            "relationships": {"base_token": {"data": {"id": "eth_0xtoken1"}}},
        }
    ],
    "included": [
        {
            "id": "eth_0xtoken1",
            "type": "token",
            "attributes": {"name": "Token", "symbol": "TKN", "image_url": "https://img/tkn.png"},
        }
    ],
}

POOL_DETAILS_RESPONSE = {
    "data": {
        "id": "eth_0xpool1",
        "attributes": {
            "name": "TOKEN / WETH",
            "base_token_price_usd": "2.50",
            "price_change_percentage": {"h24": "-1.2"},
        },
        "relationships": {"base_token": {"data": {"id": "eth_0xtoken1"}}},
    },
    "included": [
        {
            "id": "eth_0xtoken1",
            "type": "token",
            "attributes": {"name": "Token", "symbol": "TKN", "image_url": None},
        }
    ],
}

OHLCV_RESPONSE = {
    "data": {
        "attributes": {
            "ohlcv_list": [
                [1700000200, "3.0", "3.1", "2.9", "3.05"],
                [1700000100, "2.9", "3.0", "2.8", "3.0"],
            ]
        }
    }
}

TOKEN_POOLS_RESPONSE = {
    "data": [
        {
            "attributes": {
                "address": "0xpool1",
                "dex_id": "uniswap_v3",
                "base_token_price_usd": "1.5",
                "volume_usd": {"h24": "500000"},
            },
            "relationships": {},
        }
    ]
}

SEARCH_RESPONSE = {
    "data": [
        {
            "id": "eth_0xpool1",
            "attributes": {
                "name": "TOKEN / WETH",
                "base_token_price_usd": "1.0",
                "price_change_percentage": {"h24": "2.0"},
            },
            "relationships": {"base_token": {"data": {"id": "eth_0xtoken1"}}},
        }
    ],
    "included": [
        {
            "id": "eth_0xtoken1",
            "type": "token",
            "attributes": {"name": "Token", "symbol": "TKN", "image_url": None},
        }
    ],
}


def _mock_fetch(return_value):
    m = MagicMock(return_value=return_value)
    return patch("market.views.fetch_gecko", m)


@override_settings(CACHES=LOCMEM_CACHE)
class TrendingTokensViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    def test_returns_transformed_data(self):
        with _mock_fetch(TRENDING_RESPONSE) as mock_fetch:
            resp = self.client.get("/api/market/trending/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data), 1)
        item = data[0]
        self.assertEqual(item["id"], "eth_0xpool1")
        self.assertEqual(item["name"], "Token")
        self.assertEqual(item["symbol"], "TKN")
        self.assertAlmostEqual(item["price"], 1.23)
        self.assertAlmostEqual(item["priceChange24h"], 5.5)
        self.assertEqual(item["imageUrl"], "https://img/tkn.png")
        mock_fetch.assert_called_once()

    def test_second_call_uses_cache(self):
        with _mock_fetch(TRENDING_RESPONSE) as mock_fetch:
            self.client.get("/api/market/trending/")
            self.client.get("/api/market/trending/")
        self.assertEqual(mock_fetch.call_count, 1)

    def test_different_limit_uses_different_cache_key(self):
        with _mock_fetch(TRENDING_RESPONSE) as mock_fetch:
            self.client.get("/api/market/trending/?limit=5")
            self.client.get("/api/market/trending/?limit=10")
        self.assertEqual(mock_fetch.call_count, 2)

    def test_limit_param_slices_results(self):
        multi = {
            "data": TRENDING_RESPONSE["data"] * 5,
            "included": TRENDING_RESPONSE["included"],
        }
        with _mock_fetch(multi):
            resp = self.client.get("/api/market/trending/?limit=3")
        self.assertEqual(len(resp.json()), 3)

    def test_gecko_error_propagates(self):
        from market.gecko_client import GeckoError
        with patch("market.views.fetch_gecko", side_effect=GeckoError(429)):
            resp = self.client.get("/api/market/trending/")
        self.assertEqual(resp.status_code, 429)


@override_settings(CACHES=LOCMEM_CACHE)
class PoolDetailsViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()
        self.url = "/api/market/pools/eth/0xpool1/"


    def test_returns_transformed_data(self):
        with _mock_fetch(POOL_DETAILS_RESPONSE) as mock_fetch:
            resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["name"], "Token")
        self.assertEqual(data["symbol"], "TKN")
        self.assertAlmostEqual(data["price"], 2.50)
        self.assertAlmostEqual(data["priceChange24h"], -1.2)
        self.assertIsNone(data["imageUrl"])
        self.assertEqual(data["tokenAddress"], "0xtoken1")
        mock_fetch.assert_called_once()

    def test_second_call_uses_cache(self):
        with _mock_fetch(POOL_DETAILS_RESPONSE) as mock_fetch:
            self.client.get(self.url)
            self.client.get(self.url)
        self.assertEqual(mock_fetch.call_count, 1)

    def test_different_pools_use_different_cache_entries(self):
        with _mock_fetch(POOL_DETAILS_RESPONSE) as mock_fetch:
            self.client.get("/api/market/pools/eth/0xpool1/")
            self.client.get("/api/market/pools/eth/0xpool2/")
        self.assertEqual(mock_fetch.call_count, 2)


@override_settings(CACHES=LOCMEM_CACHE)
class OHLCVViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()
        self.url = "/api/market/pools/eth/0xpool1/ohlcv/day/"


    def test_returns_sorted_ascending(self):
        with _mock_fetch(OHLCV_RESPONSE):
            resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        bars = resp.json()
        self.assertEqual(len(bars), 2)
        # Oldest first
        self.assertLess(bars[0]["time"], bars[1]["time"])
        self.assertEqual(bars[0]["time"], 1700000100)

    def test_bar_fields(self):
        with _mock_fetch(OHLCV_RESPONSE):
            resp = self.client.get(self.url)
        bar = resp.json()[0]
        self.assertIn("time", bar)
        self.assertIn("open", bar)
        self.assertIn("high", bar)
        self.assertIn("low", bar)
        self.assertIn("close", bar)

    def test_second_call_uses_cache(self):
        with _mock_fetch(OHLCV_RESPONSE) as mock_fetch:
            self.client.get(self.url)
            self.client.get(self.url)
        self.assertEqual(mock_fetch.call_count, 1)

    def test_different_timeframes_use_different_cache_entries(self):
        with _mock_fetch(OHLCV_RESPONSE) as mock_fetch:
            self.client.get("/api/market/pools/eth/0xpool1/ohlcv/day/")
            self.client.get("/api/market/pools/eth/0xpool1/ohlcv/hour/")
        self.assertEqual(mock_fetch.call_count, 2)

    def test_different_aggregate_uses_different_cache_entry(self):
        with _mock_fetch(OHLCV_RESPONSE) as mock_fetch:
            self.client.get(self.url + "?aggregate=1")
            self.client.get(self.url + "?aggregate=4")
        self.assertEqual(mock_fetch.call_count, 2)


@override_settings(CACHES=LOCMEM_CACHE)
class TokenPoolsViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()
        self.url = "/api/market/tokens/eth/0xtoken1/pools/"


    def test_returns_transformed_data(self):
        with _mock_fetch(TOKEN_POOLS_RESPONSE) as mock_fetch:
            resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data), 1)
        item = data[0]
        self.assertEqual(item["poolAddress"], "0xpool1")
        self.assertEqual(item["dexName"], "uniswap_v3")
        self.assertAlmostEqual(item["price"], 1.5)
        self.assertAlmostEqual(item["volume24h"], 500000.0)
        mock_fetch.assert_called_once()

    def test_second_call_uses_cache(self):
        with _mock_fetch(TOKEN_POOLS_RESPONSE) as mock_fetch:
            self.client.get(self.url)
            self.client.get(self.url)
        self.assertEqual(mock_fetch.call_count, 1)

    def test_different_tokens_use_different_cache_entries(self):
        with _mock_fetch(TOKEN_POOLS_RESPONSE) as mock_fetch:
            self.client.get("/api/market/tokens/eth/0xtoken1/pools/")
            self.client.get("/api/market/tokens/eth/0xtoken2/pools/")
        self.assertEqual(mock_fetch.call_count, 2)


@override_settings(CACHES=LOCMEM_CACHE)
class SearchPoolsViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    def test_returns_transformed_data(self):
        with _mock_fetch(SEARCH_RESPONSE) as mock_fetch:
            resp = self.client.get("/api/market/search/?query=token")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data), 1)
        item = data[0]
        self.assertEqual(item["poolAddress"], "0xpool1")
        self.assertEqual(item["network"], "eth")
        self.assertEqual(item["networkName"], "ETH")
        self.assertEqual(item["name"], "Token")
        self.assertEqual(item["symbol"], "TKN")
        mock_fetch.assert_called_once()

    def test_missing_query_returns_400(self):
        resp = self.client.get("/api/market/search/")
        self.assertEqual(resp.status_code, 400)

    def test_second_call_uses_cache(self):
        with _mock_fetch(SEARCH_RESPONSE) as mock_fetch:
            self.client.get("/api/market/search/?query=token")
            self.client.get("/api/market/search/?query=token")
        self.assertEqual(mock_fetch.call_count, 1)

    def test_different_queries_use_different_cache_entries(self):
        with _mock_fetch(SEARCH_RESPONSE) as mock_fetch:
            self.client.get("/api/market/search/?query=btc")
            self.client.get("/api/market/search/?query=eth")
        self.assertEqual(mock_fetch.call_count, 2)
