docker run -d --name influxdb -p 8086:8086 -v influxdb-data:/var/lib/influxdb2 influxdb:2

---

za backend:

-dodati .env u root od backend, odnosno poke-price:

INFLUX_URL=http://localhost:8086
INFLUX_TOKEN="vas token"
INFLUX_ORG="vasa organizacija"
INFLUX_BUCKET="vas bucket"

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD="vasa sifra"
DB_NAME=pokeprice

-u root odraditi: docker compose up -d

-na localhost:8086 registrovati se, izmeniti podatke u .env

-u root od backend odraditi npm i

-u root od backend odraditi npm start

---

za frontend:

-u root od pokemon-dashboard odraditi npm i

-u root od pokemon-dashbord odraditi ng serve (ukoliko pita da se dele podaci o ovom projektu sa Google, izabrati ne)

---

za podaci:

-u backend poke-price\src\data odraditi node fetchCards.js

---

-za search, najbolje pustiti aplikaciju da radi 5 minuta (minimum 3), i onda probati search za neku od sledecih kartica:
Alakazam
Blastoise
Chansey
(imamo 50 kartica u .json)

ili iskopirati imena od kartica koja pristizu


