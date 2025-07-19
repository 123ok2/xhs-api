from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

@app.route('/')
def home():
    return '✅ XHS Video Extractor API is running.'

@app.route('/get', methods=['POST'])
def get_video_url():
    try:
        data = request.get_json()
        url = data.get('url')
        if not url:
            return jsonify({'error': '❌ Missing "url" field in JSON'}), 400

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }

        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return jsonify({'error': f'❌ Failed to fetch page, status: {response.status_code}'}), 500

        soup = BeautifulSoup(response.text, 'html.parser')

        # Tìm tất cả các thẻ video có src .mp4
        mp4_links = [video['src'] for video in soup.find_all('video') if video.get('src', '').endswith('.mp4')]

        if not mp4_links:
            return jsonify({'message': '✅ No mp4 video found in page', 'mp4_links': []})

        return jsonify({'mp4_links': mp4_links})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=10000)
