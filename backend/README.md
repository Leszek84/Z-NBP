# Z-NBP Backend

Backend API oparty o Django i Django REST Framework.
Uwierzytelnianie jest realizowane przez JWT (`access_token`, `refresh_token`).

## Zakres projektu

- rejestracja i logowanie uzytkownika,
- odswiezanie tokenu i wylogowanie (blacklist refresh tokenow),
- endpoint profilu zalogowanego uzytkownika,
- warstwa cache przygotowana pod Redis.

## Wymagania

- Python 3.12+
- `pip`
- terminal (`bash`, PowerShell lub CMD)

## Tryby uruchomienia

| Tryb | Sposob uruchomienia | Serwer aplikacji | Baza danych |
| --- | --- | --- | --- |
| Lokalny (bez Docker) | `python manage.py runserver` | Django runserver | SQLite (domyslnie) |
| Docker Compose | `docker compose up --build` | gunicorn | PostgreSQL |
| Azure Web App (container) | ten sam obraz Docker | gunicorn | PostgreSQL |

## Szybki start lokalny (bez Docker)

### Linux / macOS

- Krok 1. Wejdz do katalogu backend:

  ```bash
  cd backend
  ```

- Krok 2. Aktywuj srodowisko:

  ```bash
  source .venv/bin/activate
  ```

- Krok 3. Zainstaluj zaleznosci:

  ```bash
  pip install -r requirements.txt
  ```

- Krok 4. Utworz lokalny plik `.env`:

  ```bash
  cp .env.example .env
  ```

- Krok 5. Wykonaj migracje:

  ```bash
  python manage.py migrate
  ```

- Krok 6. Uruchom backend:

  ```bash
  python manage.py runserver
  ```

### Windows (PowerShell)

- Krok 1. Wejdz do katalogu backend:

  ```powershell
  cd backend
  ```

- Krok 2. Aktywuj srodowisko:

  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```

- Krok 3. Zainstaluj zaleznosci:

  ```powershell
  pip install -r requirements.txt
  ```

- Krok 4. Utworz lokalny plik `.env`:

  ```powershell
  Copy-Item .env.example .env
  ```

- Krok 5. Wykonaj migracje:

  ```powershell
  python manage.py migrate
  ```

- Krok 6. Uruchom backend:

  ```powershell
  python manage.py runserver
  ```

Po starcie backend jest dostepny pod adresem `http://127.0.0.1:8000`

## Jak dziala aplikacja

1. Uzytkownik zaklada konto lub loguje sie.
2. Backend zwraca tokeny JWT (`access_token`, `refresh_token`).
3. Frontend wysyla `access_token` w naglowku `Authorization`.
4. Gdy `access_token` wygasnie, frontend uzywa `refresh_token` aby pobrac nowy.
5. Przy wylogowaniu refresh token jest uniewazniany (blacklist).

## Konfiguracja srodowiska

Plik `backend/.env` jest opcjonalny i sluzy glownie do pracy lokalnej bez Dockera.

Przykladowy zestaw (lokalny, SQLite):

```env
DEBUG=True
DJANGO_SECRET_KEY=change-me-to-a-long-random-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOW_ALL_ORIGINS=False

# Opcjonalnie lokalny PostgreSQL:
# DATABASE_URL=postgres://postgres:postgres@localhost:5432/z_nbp

# Opcjonalnie lokalny Redis:
# REDIS_URL=redis://localhost:6379/1
```

### Precedence zmiennych

Kolejnosc od najwyzszego priorytetu:

1. zmienne procesu (`docker-compose.yml`, Azure App Settings, shell),
2. `backend/.env` (tylko jesli istnieje, `overwrite=False`),
3. domyslne wartosci z `settings.py` (`DEBUG=True`, SQLite, localhost).

## Docker i Azure

Obecna konfiguracja jest docelowa i nie wymaga rozdzielania na osobne Dockerfile.

- Docker i Azure uruchamiaja backend przez `gunicorn`.
- W trybie Compose domyslnie ustawione jest `DEBUG=True` (development).
- Przy deployu na Azure nadpisujesz tylko App Settings, bez zmian kodu:
  - `DEBUG=False`
  - `DJANGO_SECRET_KEY=<silny sekret>`
  - `DATABASE_URL=<azure postgres url>`
  - `REDIS_URL=<redis url>`
  - `WEB_CONCURRENCY=<opcjonalnie, np. 2-5>`

Uruchomienie lokalnego stacka Docker:

```bash
docker compose up --build
```

Zatrzymanie:

```bash
docker compose down
```

Reset wolumenow:

```bash
docker compose down -v
```

## Przeplyw autoryzacji

1. Uzytkownik rejestruje konto lub loguje sie.
2. Backend zwraca `access_token` i `refresh_token`.
3. Frontend wysyla `Authorization: Bearer <access_token>`.
4. Po wygasnieciu access tokenu frontend wykonuje refresh.
5. Wylogowanie uniewaznia refresh token (blacklist).

## Tworzenie konta administratora

```bash
python manage.py createsuperuser
```

Nastepnie zaloguj sie na `http://127.0.0.1:8000/admin/`.

## Uzywanie autoryzacji JWT

Po logowaniu wysylaj naglowek:

```http
Authorization: Bearer <access_token>
```

Odnowienie tokenu:

- `POST /api/auth/token/refresh/`

Wylogowanie (uniewaznienie refresh tokenu):

- `POST /api/auth/logout/`

## Endpointy API

### Publiczne

1. `GET /health/`

    - cel: szybki status aplikacji,
    - odpowiedz: `{"status": "ok"}`.

2. `POST /api/auth/register/`

    - cel: rejestracja nowego uzytkownika,
    - body:

    ```json
    {
      "username": "jan",
      "email": "jan@example.com",
      "password": "StrongPass123!"
    }
    ```

3. `POST /api/auth/login/`

    - cel: logowanie po `username` lub `email`,
    - body:

    ```json
    {
      "username_email": "jan@example.com",
      "password": "StrongPass123!"
    }
    ```

4. `POST /api/auth/token/refresh/`

    - cel: wydanie nowego access tokenu,
    - body:

    ```json
    {
      "refresh": "<refresh_token>"
    }
    ```

### Wymagajace zalogowania (`Authorization: Bearer <access_token>`)

1. `POST /api/auth/logout/`

    - cel: wylogowanie i blacklist refresh tokenu,
    - body (akceptowane):

    ```json
    {
      "refresh": "<refresh_token>"
    }
    ```

    - alternatywnie:

    ```json
    {
      "refresh_token": "<refresh_token>"
    }
    ```

2. `GET /api/auth/me/`

    - cel: pobranie profilu aktualnie zalogowanego uzytkownika.

3. `PATCH /api/auth/me/`

    - cel: aktualizacja wybranych pol profilu,
    - przyklad body:

    ```json
    {
      "first_name": "Jan",
      "last_name": "Kowalski"
    }
    ```

4. `DELETE /api/auth/me/`

    - cel: usuniecie aktualnego konta.

## Testy i kontrola jakosci

```bash
python manage.py check
python manage.py test
```

Testy obejmuja m.in.:

- rejestracje, logowanie, refresh,
- scenariusze bledne (zle haslo, nieistniejacy user, nieaktywne konto),
- endpoint `me` (GET/PATCH/DELETE),
- logout i blacklist tokenu,
- healthcheck,
- zachowanie modelu user.

## Struktura projektu

- `accounts/` - logika kont i endpointy auth,
- `config/` - konfiguracja Django i routing,
- `manage.py` - komendy administracyjne.

## Najczestsze problemy

- `401 Unauthorized`

- sprawdz naglowek `Authorization: Bearer <access_token>`,
- sprawdz czy token nie wygasl,
- w razie potrzeby wykonaj `POST /api/auth/token/refresh/`.

- Blad CORS

- sprawdz `CORS_ALLOW_ALL_ORIGINS` oraz host frontendu.

- Brak tabel w bazie

- wykonaj `python manage.py migrate`.
