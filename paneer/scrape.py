import os
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from collections import deque

# --- CONFIGURATION ---
BASE_URL = "https://www.nitt.edu/"
TARGET_DOMAIN = "nitt.edu"
MAX_DEPTH = 5  # increased from 3 to 5
OUTPUT_DIR = "nitt_data_bfs"

# Queue stores tuples of: (url, current_depth)
# We start with the homepage at depth 0
queue = deque([(BASE_URL, 0)])
visited_urls = set([BASE_URL])

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def save_file(url, content, is_pdf=False):
    """Saves content with a unique filename."""
    try:
        parsed = urlparse(url)
        # Create filename from path, e.g., /students/circulars -> students_circulars
        clean_name = parsed.path.strip("/").replace("/", "_").replace(".php", "").replace(".aspx", "")
        
        if not clean_name:
            clean_name = "home_index"
            
        # Add extension
        ext = ".pdf" if is_pdf else ".html"
        filename = f"{clean_name}{ext}"
        
        # Handle duplicate names by adding a hash or counter if needed (simplified here)
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        mode = "wb" if is_pdf else "w"
        encoding = None if is_pdf else "utf-8"
        
        with open(filepath, mode, encoding=encoding) as f:
            f.write(content)
        return True
    except Exception as e:
        print(f"❌ Error saving {url}: {e}")
        return False

# --- MAIN LOOP ---
if __name__ == "__main__":
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    print(f"🚀 Starting BFS Crawl on {BASE_URL}")

    while queue:
        # Get the next URL to process
        current_url, depth = queue.popleft()
        
        # STOP condition
        if depth > MAX_DEPTH:
            continue

        print(f"[{depth}] Processing: {current_url}")

        try:
            response = requests.get(current_url, headers=HEADERS, timeout=10)
            content_type = response.headers.get("Content-Type", "").lower()

            # 1. Handle PDFs
            if "application/pdf" in content_type or current_url.endswith(".pdf"):
                print(f"   📄 Found PDF! Downloading...")
                save_file(current_url, response.content, is_pdf=True)
                continue # Done with this link

            # 2. Handle HTML
            if "text/html" in content_type:
                save_file(current_url, response.text, is_pdf=False)
                
                # If we haven't hit max depth, extract links for the NEXT layer
                if depth < MAX_DEPTH:
                    soup = BeautifulSoup(response.text, "html.parser")
                    links = soup.find_all("a", href=True)
                    
                    for link in links:
                        # Clean and normalize the URL
                        next_url = urljoin(current_url, link["href"]).split("#")[0]
                        
                        # VALIDATION CHECKS
                        if next_url not in visited_urls and TARGET_DOMAIN in urlparse(next_url).netloc:
                            visited_urls.add(next_url)
                            queue.append((next_url, depth + 1))
            
            # Be polite to the server
            time.sleep(0.2)

        except Exception as e:
            print(f"   ⚠️ Failed: {e}")