# Z-NBP Backend

Backend API zbudowany w oparciu o Django + Django REST Framework.
Autoryzacja realizowana jest przez JWT (`access_token` + `refresh_token`).

## Wymagania

- Python 3.12+
- `pip`
- terminal (`bash`, PowerShell lub CMD)

## Szybki start (5-10 minut)

Instrukcje ponizej dzialaja dla obu systemow: Linux/macOS oraz Windows.

### Linux / macOS

1. Wejdz do katalogu projektu:

```bash
cd backend
```

2. Aktywuj wirtualne srodowisko:

```bash
source .venv/bin/activate
```

3. Zainstaluj zaleznosci:

```bash
pip install -r requirements.txt
```

4. Utworz plik `.env`:

```bash
cp .env.example .env
```

5. Wykonaj migracje:

```bash
python manage.py migrate
```

6. Uruchom aplikacje:

```bash
python manage.py runserver
```

### Windows (PowerShell)

1. Wejdz do katalogu projektu:

```powershell
cd backend
```

2. Aktywuj wirtualne srodowisko:

```powershell
.\.venv\Scripts\Activate.ps1
```

3. Zainstaluj zaleznosci:

```powershell
pip install -r requirements.txt
```

4. Utworz plik `.env`:

```powershell
Copy-Item .env.example .env
```

5. Wykonaj migracje:

```powershell
python manage.py migrate
```

6. Uruchom aplikacje:

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

## Konfiguracja srodowiska (`.env`)

Przykladowe wartosci:

```env
DEBUG=True
DJANGO_SECRET_KEY=change-me-to-a-long-random-secret-key-32-plus-chars
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOW_ALL_ORIGINS=False

# SQLite (domyslnie):
# DATABASE_URL=sqlite:///db.sqlite3

# PostgreSQL (np. Docker):
# DATABASE_URL=postgres://postgres:postgres@db:5432/z_nbp
```
Wazne:

- w produkcji ustaw silny `DJANGO_SECRET_KEY`,
- przy przejsciu na Postgres wystarczy ustawic `DATABASE_URL`.

## Tworzenie konta

Dwa mozliwe sposoby: przez API lub przez panel admin.

### 1. Konto przez API (typowy scenariusz)

`POST /api/auth/register/`

```bash
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jan",
    "email": "jan@example.com",
    "password": "StrongPass123!"
  }'
```

W odpowiedzi dostaniesz od razu tokeny i dane uzytkownika.

### 2. Konto administratora (panel Django)

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

lub:

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

Uruchom:

Linux/macOS:

```bash
python manage.py check
python manage.py test
```

Windows (PowerShell):

```powershell
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

- `accounts/` - logika kont uzytkownikow i endpointy auth,
- `config/` - konfiguracja Django i glowny routing,
- `manage.py` - komendy administracyjne.

## Najczestsze problemy

1. `401 Unauthorized`

- sprawdz czy wysylasz `Authorization: Bearer <access_token>`,
- sprawdz czy token nie wygasl,
- w razie potrzeby odswiez token przez `/api/auth/token/refresh/`.

2. Blad CORS w przegladarce

- sprawdz `CORS_ALLOW_ALL_ORIGINS` i konfiguracje frontendowego hosta.

3. Brak tabel w bazie

- wykonaj `python manage.py migrate`.
