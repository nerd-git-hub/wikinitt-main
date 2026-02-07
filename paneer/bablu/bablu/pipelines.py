import os
import json
from urllib.parse import urlparse
import hashlib

class BabluPipeline:
    def open_spider(self, spider):
        self.output_dir = getattr(spider, 'custom_output_dir', "nitt_data_scrapy")
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

    def process_item(self, item, spider):
        url = item['url']
        content = item['body']
        content_type = item.get('content_type', '')

        parsed = urlparse(url)
        clean_name = parsed.path.strip("/").replace("/", "_").replace(".php", "").replace(".aspx", "")
        if not clean_name: clean_name = "home_index"
        url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()[:8]
        
        is_pdf = "pdf" in content_type or url.endswith(".pdf")
        data_ext = ".pdf" if is_pdf else ".html"
        
        filename_base = f"{clean_name}_{url_hash}"
        data_filename = f"{filename_base}{data_ext}"
        meta_filename = f"{filename_base}.meta.json"

        filepath = os.path.join(self.output_dir, data_filename)
        mode = "wb" if is_pdf else "w"
        encoding = None if is_pdf else "utf-8"
        
        if not is_pdf and isinstance(content, bytes):
            content = content.decode('utf-8', errors='ignore')

        with open(filepath, mode, encoding=encoding) as f:
            f.write(content)

        meta_filepath = os.path.join(self.output_dir, meta_filename)
        metadata = {
            "url": url,
            "source_url": item.get('source_url', ''),
            "filename": data_filename,
            "content_type": content_type
        }
        
        with open(meta_filepath, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=4)
        
        return item