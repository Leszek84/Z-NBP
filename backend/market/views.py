import urllib.parse

from django.core.cache import cache
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .gecko_client import GeckoError, fetch_gecko

_TTL_TRENDING = 60
_TTL_POOL_DETAILS = 60
_TTL_TOKEN_POOLS = 60
_TTL_SEARCH = 30
_TTL_OHLCV = {"minute": 60, "hour": 300, "day": 3600}
_TTL_OHLCV_DEFAULT = 60


def _ohlcv_ttl(timeframe: str) -> int:
    return _TTL_OHLCV.get(timeframe, _TTL_OHLCV_DEFAULT)


def _gecko_error_response(exc: GeckoError):
    return Response(
        {"error": f"GeckoTerminal error: {exc.status_code}"},
        status=exc.status_code if 400 <= exc.status_code < 600 else 502,
    )


class TrendingTokensView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        limit = max(1, min(int(request.query_params.get("limit", 12)), 100))
        cache_key = f"market:trending:{limit}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        try:
            data = fetch_gecko("/networks/trending_pools?include=base_token&page=1")
        except GeckoError as exc:
            return _gecko_error_response(exc)

        token_map = {
            item["id"]: item["attributes"]
            for item in (data.get("included") or [])
            if item.get("type") == "token"
        }

        result = []
        for pool in data.get("data", [])[:limit]:
            attrs = pool.get("attributes", {})
            token_id = (pool.get("relationships") or {}).get("base_token", {}).get("data", {}).get("id")
            token = token_map.get(token_id, {})
            result.append({
                "id": pool["id"],
                "name": token.get("name") or attrs.get("name", ""),
                "symbol": token.get("symbol") or "",
                "price": float(attrs.get("base_token_price_usd") or 0),
                "priceChange24h": float((attrs.get("price_change_percentage") or {}).get("h24") or 0),
                "imageUrl": token.get("image_url"),
            })

        cache.set(cache_key, result, _TTL_TRENDING)
        return Response(result)


class PoolDetailsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, network, pool_address):
        cache_key = f"market:pool:{network}:{pool_address}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        try:
            data = fetch_gecko(f"/networks/{network}/pools/{pool_address}?include=base_token")
        except GeckoError as exc:
            return _gecko_error_response(exc)

        pool = data.get("data", {})
        attrs = pool.get("attributes", {})
        token_map = {
            item["id"]: item["attributes"]
            for item in (data.get("included") or [])
            if item.get("type") == "token"
        }
        token_id = (pool.get("relationships") or {}).get("base_token", {}).get("data", {}).get("id")
        token = token_map.get(token_id, {})
        token_address = token_id.replace(f"{network}_", "") if token_id else None

        result = {
            "name": token.get("name") or attrs.get("name", ""),
            "symbol": token.get("symbol") or "",
            "price": float(attrs.get("base_token_price_usd") or 0),
            "priceChange24h": float((attrs.get("price_change_percentage") or {}).get("h24") or 0),
            "imageUrl": token.get("image_url"),
            "tokenAddress": token_address,
        }

        cache.set(cache_key, result, _TTL_POOL_DETAILS)
        return Response(result)


class OHLCVView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, network, pool_address, timeframe):
        aggregate = int(request.query_params.get("aggregate", 1))
        limit = max(1, min(int(request.query_params.get("limit", 100)), 1000))
        cache_key = f"market:ohlcv:{network}:{pool_address}:{timeframe}:{aggregate}:{limit}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        path = (
            f"/networks/{network}/pools/{pool_address}/ohlcv/{timeframe}"
            f"?aggregate={aggregate}&limit={limit}&currency=usd&token=base"
        )
        try:
            data = fetch_gecko(path)
        except GeckoError as exc:
            return _gecko_error_response(exc)

        ohlcv_list = (data.get("data") or {}).get("attributes", {}).get("ohlcv_list") or []
        result = [
            {
                "time": int(row[0]),
                "open": float(row[1]),
                "high": float(row[2]),
                "low": float(row[3]),
                "close": float(row[4]),
            }
            for row in reversed(ohlcv_list)
        ]

        cache.set(cache_key, result, _ohlcv_ttl(timeframe))
        return Response(result)


class TokenPoolsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, network, token_address):
        limit = max(1, min(int(request.query_params.get("limit", 10)), 100))
        cache_key = f"market:token_pools:{network}:{token_address}:{limit}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        try:
            data = fetch_gecko(f"/networks/{network}/tokens/{token_address}/pools?page=1")
        except GeckoError as exc:
            return _gecko_error_response(exc)

        result = []
        for pool in (data.get("data") or [])[:limit]:
            attrs = pool.get("attributes", {})
            dex_id = attrs.get("dex_id") or (pool.get("relationships") or {}).get("dex", {}).get("data", {}).get("id") or "—"
            result.append({
                "poolAddress": attrs.get("address", ""),
                "dexName": dex_id,
                "price": float(attrs.get("base_token_price_usd") or 0),
                "volume24h": float((attrs.get("volume_usd") or {}).get("h24") or 0),
            })

        cache.set(cache_key, result, _TTL_TOKEN_POOLS)
        return Response(result)


class SearchPoolsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get("query", "").strip()
        if not query:
            return Response({"error": "query parameter is required"}, status=400)
        limit = max(1, min(int(request.query_params.get("limit", 8)), 100))
        cache_key = f"market:search:{query}:{limit}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        encoded = urllib.parse.quote(query)
        try:
            data = fetch_gecko(f"/search/pools?query={encoded}&include=base_token")
        except GeckoError as exc:
            return _gecko_error_response(exc)

        token_map = {
            item["id"]: item["attributes"]
            for item in (data.get("included") or [])
            if item.get("type") == "token"
        }

        result = []
        for pool in (data.get("data") or [])[:limit]:
            attrs = pool.get("attributes", {})
            token_id = (pool.get("relationships") or {}).get("base_token", {}).get("data", {}).get("id")
            token = token_map.get(token_id, {})
            pool_id = pool.get("id", "")
            underscore_idx = pool_id.find("_")
            if underscore_idx >= 0:
                network = pool_id[:underscore_idx]
                pool_address = pool_id[underscore_idx + 1:]
            else:
                network = ""
                pool_address = pool_id
            result.append({
                "poolAddress": pool_address,
                "network": network,
                "networkName": network.upper(),
                "name": token.get("name") or attrs.get("name", ""),
                "symbol": token.get("symbol") or "",
                "price": float(attrs.get("base_token_price_usd") or 0),
                "priceChange24h": float((attrs.get("price_change_percentage") or {}).get("h24") or 0),
                "imageUrl": token.get("image_url"),
            })

        cache.set(cache_key, result, _TTL_SEARCH)
        return Response(result)
