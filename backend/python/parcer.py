import asyncio
import aiohttp
from bs4 import BeautifulSoup

async def handle_suburl(html_content, url):
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
    all_tags = [a.text.strip() for a in tags.find_all('a')] if tags else ""
    tags_string = ", ".join(all_tags) if all_tags else "Метки не найдены"
#-------------------------
    prices = soup.find('div', class_='game_purchase_price price')
    if prices and 'data-price-final' in prices.attrs:
        price = str(int(prices['data-price-final'])//100) + ' руб.'
    else:
        price = "Бесплатно"
#-------------------------    
    img_tag = soup.find('img', class_='game_header_image_full')
    img_url = img_tag['src'] if img_tag else "URL не найден"
#-------------------------    
    print(f"Ссылка на игру: {url}\nНазвание: {title}\nГл.Изображение: {img_url}\nОписание: {description}\nОтзывы: {review}\nДата Выхода: {release_date}\n"
           f"Разработчик: {dev}\nИздатель: {pub}\n Популярные метки: {tags_string}\n Цена: {price}\n----------- ")

async def handle_response(session, response_json):
    print('response')
    soup = BeautifulSoup(response_json['results_html'], 'lxml')
    
    suburls = [a['href'] for a in soup.find_all('a', href=True) if a['href'].startswith('https://store.steampowered.com/app/')]
    print(suburls)
    for suburl in suburls:
        try:
            async with session.get(suburl, verify_ssl=False) as resp:
                html_content = await resp.text()
                await handle_suburl(html_content, suburl)
        except Exception as e:
            print(f"Error processing {suburl}: {str(e)}")

async def call_page(session, url):
    print('Async?')
    async with session.get(url, verify_ssl=False) as resp:
        try:
            json_data = await resp.json()
            await handle_response(session, json_data)
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
    async with aiohttp.ClientSession(headers=headers, cookies=cookies) as session:
        tasks = []
        for start in range(0, 51, 50):
            task = asyncio.create_task(
                call_page(
                    session,
                    url.format(start=start)
                )
            )
            tasks.append(task)
        await asyncio.gather(*tasks)

asyncio.run(main())