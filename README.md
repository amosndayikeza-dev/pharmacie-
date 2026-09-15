# LGO Pharmacie

## Installation (nouveaux développeurs)

```bash
git clone <url-du-repo> pharmacie
cd pharmacie
composer install
cp .env.example .env
php artisan key:generate
# Éditer .env : DB_USERNAME, DB_PASSWORD, REDIS_HOST...
php artisan migrate --seed
npm install && npm run dev
php artisan serve