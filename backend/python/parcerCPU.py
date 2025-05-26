import requests
from bs4 import BeautifulSoup
import psycopg2

URL = "https://www.cpubenchmark.net/cpu_list.php"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

conn = psycopg2.connect(
    host="localhost",
    database="products",
    user="postgres",
    password="123456",
    port=5413
)
cur = conn.cursor()

response = requests.get(URL, headers=HEADERS)
response.raise_for_status()

soup = BeautifulSoup(response.text, "html.parser")

rows = soup.select("tr[id^=cpu]")

cpu_data = []

for row in rows:
    cols = row.find_all("td")
    if len(cols) >= 2:
        name_tag = cols[0].find("a")
        name = name_tag.text.strip() if name_tag else cols[0].text.strip()
        
        score = cols[1].text.strip().replace(',', '')
        if score.isdigit():
            cpu_name = name
            cpu_mark = int(score)
            cur.execute(
                "INSERT INTO cpu (cpu_name, cpu_mark) VALUES (%s, %s)",
                (cpu_name, cpu_mark)
            )
            cpu_data.append((cpu_name, cpu_mark))

conn.commit()
cur.close()
conn.close()
for cpu_name, cpu_mark in cpu_data:
    print(f"{cpu_name} --> {cpu_mark}")

print(f"\nВсего добавлено CPU: {len(cpu_data)}")
