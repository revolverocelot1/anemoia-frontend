import requests
import json
import base64

# Test the backend API directly
backend_url = "http://localhost:3001/api/gemini/image-edit"

# Read test image
with open("test-person.jpg", "rb") as f:
    image_bytes = f.read()

# Create form data
files = {
    'image': ('test-person.jpg', image_bytes, 'image/jpeg')
}
data = {
    'prompt': 'Transform this person into a perfect T-pose: arms extended horizontally at shoulder level, legs straight and together, neutral expression, looking straight ahead. Keep all facial features and clothing details identical. Output full body visible.',
    'input_mime_type': 'image/jpeg',
    'output_mime_type': 'image/png'
}

print("[Test] Sending request to backend API...")
print(f"[Test] URL: {backend_url}")

try:
    response = requests.post(backend_url, files=files, data=data, timeout=60)
    
    print(f"[Test] Response status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"[Test] Success! Response keys: {list(result.keys())}")
        if 'image_base64' in result:
            print(f"[Test] Image base64 length: {len(result['image_base64'])}")
            print(f"[Test] MIME type: {result.get('mime_type')}")
            print(f"[Test] Model: {result.get('model')}")
    else:
        print(f"[Test] Error response: {response.text}")
        
except Exception as e:
    print(f"[Test] Exception: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
