import re
from scrapy_redis.spiders import RedisCrawlSpider
from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import Rule

class NittSpider(RedisCrawlSpider):
    name = 'nitt_spider'
    redis_key = 'nitt:start_urls'
    
    allowed_domains = ['nitt.edu']

    rules = (
        Rule(
            LinkExtractor(
                allow=r'^https?://(www\.)?nitt\.edu/'
            ), 
            callback='parse_item', 
            follow=True
        ),
    )

    def parse_item(self, response):
        content_type = response.headers.get("Content-Type", b"").decode("utf-8").lower()
        
        yield {
            'url': response.url,
            'content_type': content_type,
            'body': response.body
        }