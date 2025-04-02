import asyncio
import aiohttp
from bs4 import BeautifulSoup

async def handle_response(response_json):
    soup = BeautifulSoup(response_json['results_html'], 'lxml')

    game_titles = soup.find_all('span', attrs={'class': 'title'})
    release_dates = soup.find_all('div', attrs={'class': 'search_released'})
    print(release_dates)
    combined_list = list(map(lambda game_title, release_date: f"{game_title.text.strip()} - {release_date.text.strip()}",
                    game_titles, release_dates))
    print(
        tuple(
            combined_list
        )
    )

async def call_page(sessions, url):
    print('Async?')
    async with sessions.get(url, verify_ssl=0) as resp:
        await handle_response(await resp.json())

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
        
    coroutines = []
    async with aiohttp.ClientSession() as  sessions:
        for start in range(0, 101, 50):
            coroutines.append(
                asyncio.create_task(
                    call_page(
                        sessions,
                        url.format(start=start)
                    )
                )
            )
        await asyncio.wait(coroutines)

asyncio.run(main())