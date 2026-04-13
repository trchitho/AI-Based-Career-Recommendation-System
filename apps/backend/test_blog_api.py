import requests

try:
    response = requests.get('http://localhost:8000/api/blog?limit=5&offset=0')
    print(f'Status: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        print(f'API working! Found {data.get("total", 0)} blog posts')
        print(f'Items returned: {len(data.get("items", []))}')
        
        # Show first post if available
        items = data.get("items", [])
        if items:
            first_post = items[0]
            print(f'First post: {first_post.get("title", "No title")}')
            print(f'Like count: {first_post.get("like_count", 0)}')
            print(f'Dislike count: {first_post.get("dislike_count", 0)}')
    else:
        print(f'API error: {response.text}')
except Exception as e:
    print(f'Connection error: {e}')