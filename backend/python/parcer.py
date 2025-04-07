import asyncio
import aiohttp
from bs4 import BeautifulSoup
import psycopg2



async def handle_suburl(html_content, url, conn, cur):
    soup = BeautifulSoup(html_content, 'lxml')
    game_title = soup.find('div', id='appHubAppName')
    title = game_title.text.strip() if game_title else "Название не найдено"

#-------------------------
    game_description = soup.find('div', class_='game_description_snippet')
    description = game_description.text.strip() if game_description else "Описание не найдено"
#-------------------------
    aggr_reviews = soup.find('div', itemprop='aggregateRating')
    review = aggr_reviews['data-tooltip-html'] if aggr_reviews else "Отзывы не найдены"
#-------------------------
    release_dates = soup.find('div', class_='date')
    release_date = release_dates.text.strip() if release_dates else "Дата выхода не найдена"
#-------------------------
    developers = soup.find('div', class_='subtitle column', string='Разработчик:')
    dev = developers.find_next('a').text.strip() if developers else "Разработчик найден"
#-------------------------
    publishers = soup.find('div', class_='subtitle column', string='Издатель:')
    pub = publishers.find_next('a').text.strip() if publishers else "Издатель не найден"
#-------------------------
    tags = soup.find('div', class_='glance_tags popular_tags')
    all_tags = [a.text.strip() for a in tags.find_all('a')] if tags else []
    tags_string = ", ".join(all_tags) if all_tags else "Метки не найдены"
#-------------------------
    prices = soup.find('div', class_='game_purchase_price price')
    if prices and 'data-price-final' in prices.attrs:
        price = str(int(prices['data-price-final'])//100) + ' руб.'
    else:
        price = "Бесплатно"
#-------------------------
    min_syss = soup.find('div', class_='game_area_sys_req_leftCol')
    min_sys = []
    if min_syss:
        for li in min_syss.find_all('li'):
            texts = []
            for element in li.descendants:
                if isinstance(element, str) and element.parent.name != 'strong':
                    texts.append(element.strip())
            min_sys.append(' '.join([t for t in texts if t]))
#-------------------------
    rec_syss = soup.find('div', class_='game_area_sys_req_rightCol')
    rec_sys = []
    if rec_syss:
        for li in rec_syss.find_all('li'):
            texts = []
            for element in li.descendants:
                if isinstance(element, str) and element.parent.name != 'strong':
                    texts.append(element.strip())
            rec_sys.append(' '.join([t for t in texts if t]))
#-------------------------
    scroll_imgs = soup.find('div', id='highlight_strip_scroll')
    scroll_img = scroll_imgs.find_all('img', limit = 5) if scroll_imgs else []
    scroll_src = [img['src'] for img in scroll_img if img.has_attr('src')]
#-------------------------
    img_tag = soup.find('img', class_='game_header_image_full')
    img_url = img_tag['src'] if img_tag else "URL не найден"
#------------------------- 
    cur.execute(
    "INSERT INTO games (name, description, reviews, release_date, dev, pub, tags, price, scroll_imgs, header_image, steam_url, min_sys, rec_sys) "
    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
    (title, description, review, release_date, dev, pub, all_tags, price, scroll_src, img_url, url, min_sys, rec_sys)
    )
    conn.commit()  
    print(scroll_src)
    print(min_sys)
    print(rec_sys)
    print(f"Ссылка на игру: {url}\nНазвание: {title}\nГл.Изображение: {img_url}\nОписание: {description}\nОтзывы: {review}\nДата Выхода: {release_date}\n"
           f"Разработчик: {dev}\nИздатель: {pub}\n Популярные метки: {tags_string}\n Цена: {price}\n----------- ")

async def handle_response(session, response_json, conn, cur):
    print('response')
    soup = BeautifulSoup(response_json['results_html'], 'lxml')
    
    suburls = [a['href'] for a in soup.find_all('a', href=True) if a['href'].startswith('https://store.steampowered.com/app/')]
    print(suburls)
    for suburl in suburls:
        try:
            async with session.get(suburl, verify_ssl=False) as resp:
                html_content = await resp.text()
                await handle_suburl(html_content, suburl, conn, cur)
        except Exception as e:
            print(f"Error processing {suburl}: {str(e)}")

async def call_page(session, url, conn, cur):
    print('Async?')
    async with session.get(url, verify_ssl=False) as resp:
        try:
            json_data = await resp.json()
            await handle_response(session, json_data, conn, cur)
        except Exception as e:
            print(f"Error processing {url}: {str(e)}")

async def main():
    url = ('https://store.steampowered.com/search/results/?'
    'query&'
    'start={start}&'
    'count=50&'
    'dynamic_data=&'
    'sort_by=_ASC&'
    'ignore_preferences=1&'
    'supportedlang=english&os=win&'
    'snr=1_7_7_230_7&'
    'infinite=1'
    )
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'ru-RU,ru;q=0.9',
    }

    # Куки для языка и возраста
    cookies = {
        'steamLanguage': 'russian',
        'birthtime': '0',
    }
    conn = psycopg2.connect(
    host="localhost",
    database="products",
    user="postgres",
    password="123456",
    port = 5413,
    )
    cur = conn.cursor()

    async with aiohttp.ClientSession(headers=headers, cookies=cookies) as session:
        tasks = []
        for start in range(0, 51, 50):
            task = asyncio.create_task(
                call_page(
                    session,
                    url.format(start=start),
                    conn,
                    cur
                )
            )
            tasks.append(task)
        await asyncio.gather(*tasks)
    cur.close()
    conn.close() 
asyncio.run(main())