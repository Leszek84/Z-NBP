from django.urls import path

from .views import OHLCVView, PoolDetailsView, SearchPoolsView, TokenPoolsView, TrendingTokensView

urlpatterns = [
    path("trending/", TrendingTokensView.as_view(), name="market-trending"),
    path("search/", SearchPoolsView.as_view(), name="market-search"),
    path("pools/<str:network>/<str:pool_address>/", PoolDetailsView.as_view(), name="market-pool-details"),
    path("pools/<str:network>/<str:pool_address>/ohlcv/<str:timeframe>/", OHLCVView.as_view(), name="market-ohlcv"),
    path("tokens/<str:network>/<str:token_address>/pools/", TokenPoolsView.as_view(), name="market-token-pools"),
]
