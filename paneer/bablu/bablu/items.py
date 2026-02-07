# Define here the models for your scraped items
#
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/items.html

import scrapy


class BabluItem(scrapy.Item):
    url = scrapy.Field()
    source_url = scrapy.Field()
    content_type = scrapy.Field()
    body = scrapy.Field()
