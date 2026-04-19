# DexTracker — Frontend

Aplikacja webowa do śledzenia cen tokenów DeFi w czasie rzeczywistym. Dane rynkowe pobierane są z [GeckoTerminal API](https://www.geckoterminal.com/dex-api), autoryzacja obsługiwana przez własny backend Django.

---

## Wymagania

- **Node.js** v18+
- **npm** v9+
- Backend Django uruchomiony na `http://127.0.0.1:8000` (wymagany do logowania/rejestracji)

---

## Uruchomienie

```bash
# Instalacja zależności
npm install

# Tryb deweloperski (HMR)
npm run dev

# Build produkcyjny
npm run build

# Podgląd buildu
npm run preview

# Linting
npm run lint
```

Aplikacja domyślnie uruchamia się na `http://localhost:5173`.

---

## Stack technologiczny

| Technologia | Wersja | Zastosowanie |
|---|---|---|
| React | 19 | Biblioteka UI |
| Vite | 8 | Bundler / dev server |
| React Router | 7 | Routing SPA |
| Tailwind CSS | 4 | Klasy CSS (konfiguracja obecna) |
| lightweight-charts | 5 | Wykresy świecowe TradingView |

---

## Struktura projektu

```
frontend/
├── public/                  # Statyczne zasoby (ikony, svg)
├── src/
│   ├── api/
│   │   ├── gecko.js         # GeckoTerminal API (trending, search, OHLCV, pule)
│   │   └── index.js         # Backend API (login, register, logout)
│   ├── assets/              # Obrazy, loga
│   ├── components/
│   │   ├── Chart.jsx        # Wykres świecowy (lightweight-charts v5)
│   │   ├── MarketSelector.jsx  # Panel puli/rynków na DetailsPage
│   │   ├── Navbar.jsx       # Nawigacja + wyszukiwarka + przyciski auth
│   │   ├── SearchDropdown.jsx  # Dropdown wyników wyszukiwania
│   │   ├── TokenCard.jsx    # Kafelek tokena (strona główna)
│   │   └── modals/
│   │       ├── LoginModal.jsx    # Modal logowania
│   │       └── RegisterModal.jsx # Modal rejestracji
│   ├── context/
│   │   └── AuthContext.jsx  # Stan autoryzacji + JWT (localStorage)
│   ├── pages/
│   │   ├── HomePage.jsx     # Strona główna — siatka trending tokenów
│   │   └── DetailsPage.jsx  # Szczegóły tokena — wykres + panel rynków
│   ├── App.jsx              # Router + layout
│   ├── main.jsx             # Punkt wejścia (AuthProvider)
│   └── index.css            # Globalne style + CSS custom properties
├── package.json
└── vite.config.js
```

---

## Routing

| Ścieżka | Komponent | Opis |
|---|---|---|
| `/` | `HomePage` | Siatka 12 trending tokenów |
| `/token/:network/:poolAddress` | `DetailsPage` | Wykres OHLCV + panel rynków |

---

## API

### GeckoTerminal (`src/api/gecko.js`)

Bezpłatne, nie wymaga klucza API.

| Funkcja | Endpoint | Opis |
|---|---|---|
| `getTrendingTokens(limit)` | `GET /networks/trending_pools` | Trending pule ze wszystkich sieci |
| `searchPools(query, limit)` | `GET /search/pools?query=` | Wyszukiwanie tokenów/puli |
| `getPoolDetails(network, poolAddress)` | `GET /networks/:n/pools/:addr` | Szczegóły puli (nazwa, cena, zmiana) |
| `getOHLCV(network, pool, timeframe, aggregate, limit)` | `GET /networks/:n/pools/:addr/ohlcv/:tf` | Dane świecowe |
| `getTokenPools(network, tokenAddress, limit)` | `GET /networks/:n/tokens/:addr/pools` | Pule danego tokena |

**Dostępne timeframe'y:**

| Label | `timeframe` | `aggregate` |
|---|---|---|
| 1D | `day` | 1 |
| 4H | `hour` | 4 |
| 1H | `hour` | 1 |
| 15M | `minute` | 15 |
| 5M | `minute` | 5 |

### Backend (`src/api/index.js`)

Backend musi działać na `http://127.0.0.1:8000`.

| Funkcja | Endpoint | Opis |
|---|---|---|
| `authApi.login(username_email, password)` | `POST /api/auth/login/` | Logowanie, zwraca JWT |
| `authApi.register(username, email, password)` | `POST /api/auth/register/` | Rejestracja, zwraca JWT |
| `authApi.logout(token)` | `POST /api/auth/logout/` | Wylogowanie (blacklist tokena) |

---

## Autoryzacja

Stan autoryzacji zarządzany przez `AuthContext` (`src/context/AuthContext.jsx`):

- Token JWT i dane użytkownika przechowywane w `localStorage` (`auth_token`, `auth_user`)
- Po odświeżeniu strony sesja jest przywracana automatycznie
- Hook `useAuth()` udostępnia: `user`, `token`, `login()`, `register()`, `logout()`

```jsx
import { useAuth } from './context/AuthContext'

const { user, login, logout } = useAuth()
```

---

## Style

Projekt używa **CSS custom properties** zdefiniowanych w `src/index.css`. Obsługiwany jest automatyczny ciemny motyw (`prefers-color-scheme: dark`).

| Zmienna | Opis |
|---|---|
| `--bg` | Tło strony |
| `--text` | Kolor tekstu podstawowego |
| `--text-h` | Kolor nagłówków / tekstu wyróżnionego |
| `--border` | Kolor obramowań |
| `--code-bg` | Tło pól input / kart pomocniczych |
| `--accent` | Kolor akcentowy (przyciski, focus) |
| `--accent-bg` | Tło akcentowe (hover, aktywne elementy) |
| `--accent-border` | Obramowanie akcentowe |
| `--shadow` | Cień kart |

---

## Znane ograniczenia

- GeckoTerminal API nie wymaga klucza, ale ma limit zapytań (ok. 30 req/min dla darmowego dostępu)
- Endpoint `/api/favorites/` w backendzie nie jest jeszcze zaimplementowany — przycisk ☆ na DetailsPage jest obecnie nieaktywny
- Wyszukiwarka wymaga minimum 2 znaków
