import scrapy
from scrapy.spiders import CrawlSpider, Rule
from scrapy.linkextractors import LinkExtractor
from bablu.items import BabluItem

class PdfSpider(CrawlSpider):
    name = 'pdf_spider'
    custom_output_dir = "nitt_pdfs"
    allowed_domains = ['nitt.edu']
    start_urls = ['https://www.nitt.edu/home/academics/calendar/']

    custom_settings = {
        'SCHEDULER': 'scrapy.core.scheduler.Scheduler',
        'DUPEFILTER_CLASS': 'scrapy.dupefilters.RFPDupeFilter',
        'ITEM_PIPELINES': {
            'bablu.pipelines.BabluPipeline': 300,
        }
    }

    rules = (
        # Rule to extract PDF links and parse them - High Priority
        Rule(
            LinkExtractor(allow=r'.*\.pdf$', deny_extensions=[]), 
            callback='parse_pdf',
            follow=False,
            process_request='set_pdf_priority'
        ),
        # Rule to follow other links to find more PDFs - Low Priority
        Rule(
            LinkExtractor(allow=(), deny_extensions=['pdf', 'zip', 'rar', 'exe', 'iso']),
            follow=True,
            process_request='set_link_priority'
        ),
    )

    def set_pdf_priority(self, request, response):
        request.priority = 100
        return request

    def set_link_priority(self, request, response):
        request.priority = 1
        return request

    def parse_pdf(self, response):
        self.logger.info(f"PDF Found: {response.url}")
        
        item = BabluItem()
        item['url'] = response.url
        item['source_url'] = response.request.headers.get('Referer', b'').decode('utf-8')
        item['content_type'] = response.headers.get('Content-Type', b'').decode('utf-8')
        item['body'] = response.body
        yield item
