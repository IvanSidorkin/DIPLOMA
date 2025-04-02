import requests
from bs4 import BeautifulSoup

for start in range(0, 101, 50):
    url = ('https://store.steampowered.com/search/results/?'
    'query&'
    f'start={start}&'
    'count=50&'
    'dynamic_data=&'
    'sort_by=_ASC&'
    'ignore_preferences=1&'
    'supportedlang=english&os=win&'
    'snr=1_7_7_230_7&'
    'infinite=1'
    )
response_json = requests.get(url).json()

soup = BeautifulSoup(response_json['results_html'], 'lxml')

game_titles = soup.find_all('span', attrs={'class': 'title'})

print(
    tuple(
        map(lambda game_title: game_title.text,
            game_titles
        )
    )
)