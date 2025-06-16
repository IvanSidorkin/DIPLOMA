import time
import requests
from bs4 import BeautifulSoup
import re


def handle_suburl(html_content, url):
    soup = BeautifulSoup(html_content, 'lxml')
    
    # Таймер начала обработки страницы
    start_time = time.time()
    
    #-------------------------
    dlc_indicator = soup.find('div', class_='game_area_dlc_bubble')
    if dlc_indicator:
        print(f"Пропускаем DLC: {url}")
        return
    #-------------------------
    aggr_reviews = soup.find('a', class_='user_reviews_summary_row', itemprop='aggregateRating')
    if aggr_reviews and 'data-tooltip-html' in aggr_reviews.attrs:
        review = aggr_reviews['data-tooltip-html']
        match = re.search(r'(\d+%) из ([\d,]+)', review)
        if match:
            if int(match.group(2).replace(',', '')) < 1000:
                return
            review = f"{match.group(1)} из {match.group(2)}"
    else:
        review = "Отзывы не найдены"
    #-------------------------
    game_title = soup.find('div', id='appHubAppName')
    title = game_title.text.strip() if game_title else "Название не найдено"
    #-------------------------
    game_description = soup.find('div', class_='game_description_snippet')
    description = game_description.text.strip() if game_description else "Описание не найдено"
    #-------------------------
    release_dates = soup.find('div', class_='date')
    release_date = release_dates.text.strip() if release_dates else "Дата выхода не найдена"
    #-------------------------
    developers = soup.find('div', class_='subtitle column', string='Разработчик:')
    dev = developers.find_next('a').text.strip() if developers else "Разработчик не найден"
    #-------------------------
    publishers = soup.find('div', class_='subtitle column', string='Издатель:')
    pub = publishers.find_next('a').text.strip() if publishers else "Издатель не найден"
    #-------------------------
    tags = soup.find('div', class_='glance_tags popular_tags')
    all_tags = [a.text.strip() for a in tags.find_all('a')] if tags else []
    tags_string = ", ".join(all_tags) if all_tags else "Метки не найдены"
    #-------------------------
    discount_block = soup.find('div', class_='discount_block game_purchase_discount')
    prices = soup.find('div', class_='game_purchase_price price')

    if discount_block and 'data-price-final' in discount_block.attrs:
        price = discount_block['data-price-final']
    elif prices and 'data-price-final' in prices.attrs:
        price = prices['data-price-final']
    else:
        price = 0
    #-------------------------
    min_syss = soup.find('div', class_='game_area_sys_req_leftCol')
    min_sys = []
    if min_syss:
        for li in min_syss.find_all('li'):
            texts = []
            for element in li.descendants:
                if isinstance(element, str):
                    texts.append(element.strip())
            min_sys.append(' '.join([t for t in texts if t]))
    #-------------------------
    rec_syss = soup.find('div', class_='game_area_sys_req_rightCol')
    rec_sys = []
    if rec_syss:
        for li in rec_syss.find_all('li'):
            texts = []
            for element in li.descendants:
                if isinstance(element, str):
                    texts.append(element.strip())
            rec_sys.append(' '.join([t for t in texts if t]))
    #-------------------------
    scroll_videos = soup.find_all('div', class_='highlight_movie', limit=3)
    scroll_video = [
        container.get('data-mp4-hd-source') or container.get('data-webm-hd-source')
        for container in scroll_videos if container]
    scroll_vsrc = [src for src in scroll_video if src]

    scroll_img = soup.find_all('a', class_='highlight_screenshot_link')
    scroll_src = [img['href'] for img in scroll_img if img.has_attr('href')] if scroll_img else []

    updatedscroll_visrc = scroll_vsrc + scroll_src
    #-------------------------
    img_tag = soup.find('img', class_='game_header_image_full')
    img_url = img_tag['src'] if img_tag else "URL не найден"
    #-------------------------
    if (
        review == "Отзывы не найдены" 
        or title == "Название не найдено" 
        or description == "Описание не найдено" 
        or release_date == "Дата выхода не найдена" 
        or dev == "Разработчик не найден" 
        or pub == "Издатель не найден" 
        or not all_tags 
        or not min_sys 
        or not rec_sys 
        or not scroll_img 
        or img_url == "URL не найден"
    ):
        return
    
    # Вывод информации о игре
    print(f"\nСсылка на игру: {url}")
    print(f"Название: {title}")
    print(f"Главное изображение: {img_url}")
    print(f"Описание: {description}")
    print(f"Отзывы: {review}")
    print(f"Дата выхода: {release_date}")
    print(f"Разработчик: {dev}")
    print(f"Издатель: {pub}")
    print(f"Популярные метки: {tags_string}")
    print(f"Цена: {price}")
    print(f"Минимальные системные требования: {min_sys}")
    print(f"Рекомендуемые системные требования: {rec_sys}")
    print(f"Медиа-контент: {updatedscroll_visrc}")
    
    # Время обработки страницы
    print(f"Время обработки: {time.time() - start_time:.2f} секунд")
    print("-" * 50)

def handle_response(response_json):
    print('Обработка результатов поиска')
    soup = BeautifulSoup(response_json['results_html'], 'lxml')
    
    suburls = [a['href'] for a in soup.find_all('a', href=True) 
              if a['href'].startswith('https://store.steampowered.com/app/')]
    
    print(f"Найдено игр на странице: {len(suburls)}")
    
    for suburl in suburls:
        try:
            response = requests.get(suburl, headers=headers, cookies=cookies)
            html_content = response.text
            handle_suburl(html_content, suburl)
        except Exception as e:
            print(f"Ошибка при обработке {suburl}: {str(e)}")

def call_page(url):
    print(f'Загрузка страницы: {url}')
    response = requests.get(url, headers=headers, cookies=cookies)
    try:
        json_data = response.json()
        handle_response(json_data)
    except Exception as e:
        print(f"Ошибка при обработке {url}: {str(e)}")

if __name__ == "__main__":
    # Общий таймер выполнения
    total_start_time = time.time()
    
    url_template = ('https://store.steampowered.com/search/results/?'
                   'query&'
                   'start={start}&'
                   'count=50&'
                   'dynamic_data=&'
                   'sort_by=_ASC&'
                   'ignore_preferences=1&'
                   'supportedlang=english&os=win&'
                   'snr=1_7_7_230_7&'
                   'infinite=1')
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'ru-RU,ru;q=0.9',
    }

    cookies = {
        'steamLanguage': 'russian',
        'birthtime': '0',
    }
    
    # Обработка страниц
    for start in range(0, 50, 50):
        call_page(url_template.format(start=start))
    
    # Общее время выполнения
    total_time = time.time() - total_start_time
    print(f"\nОбщее время выполнения: {total_time:.2f} секунд")
    print(f"Среднее время на страницу: {total_time / (50/50):.2f} секунд")