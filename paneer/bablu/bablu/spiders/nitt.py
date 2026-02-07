import re
from scrapy_redis.spiders import RedisCrawlSpider
from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import Rule

class NittSpider(RedisCrawlSpider):
    name = 'nitt_spider'
    redis_key = 'nitt:start_urls'
    
    allowed_domains = ['nitt.edu']

    rules = (
        # High priority for Faculty, Curriculum, Departments
        Rule(
            LinkExtractor(
                allow=[r'faculty', r'people', r'curriculum', r'academics', r'dept', r'profile'],
                deny=[
                    r'login', r'register', r'resetPasswd', r'reSendKey', r'subaction', r'action', r'\+'
                ],
                deny_extensions=[]  # Ensure PDFs are scraped
            ),
            callback='parse_item',
            follow=True,
            process_request='set_priority'
        ),
        # General rule for other pages, with junk filtering
        Rule(
            LinkExtractor(
                allow=r'^https?://(www\.)?nitt\.edu/',
                deny=[
                    r'login', r'register', r'resetPasswd', r'reSendKey', r'subaction', r'action', r'\+'
                ],
                deny_extensions=[], 
            ), 
            callback='parse_item', 
            follow=True
        ),
    )

    def set_priority(self, request, response):
        request.priority = 20
        return request

    def parse_item(self, response):
        content_type = response.headers.get("Content-Type", b"").decode("utf-8").lower()
        
        yield {
            'url': response.url,
            'content_type': content_type,
            'body': response.body
        }