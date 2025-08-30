import requests
import json
import base64

# Test OpenRouter API directly
api_key = "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"
model = "google/gemini-2.5-flash-image-preview:free"

# Read test image
with open("test-person.jpg", "rb") as f:
    image_data = base64.b64encode(f.read()).decode('utf-8')

# Build request
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
    "HTTP-Referer": "https://anemoias.me",
    "X-Title": "Anemoia T-Pose Test"
}

payload = {
    "model": model,
    "messages": [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Transform this person into a perfect T-pose: arms extended horizontally at shoulder level, legs straight and together, neutral expression, looking straight ahead. Keep all facial features and clothing details identical. Output full body visible.\n\nGenerate a high-quality image based on this prompt and the provided reference image."
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_data}"
                    }
                }
            ]
        }
    ],
    "temperature": 0.4,
    "max_tokens": 8192
}

print("[Test] Sending request to OpenRouter API...")
print(f"[Test] Model: {model}")
print(f"[Test] Payload size: {len(json.dumps(payload))} bytes")

try:
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        json=payload,
        headers=headers,
        timeout=60
    )
    
    print(f"[Test] Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"[Test] Response: {json.dumps(data, indent=2)[:1000]}")
        
        # Check for image in response
        if "choices" in data and len(data["choices"]) > 0:
            choice = data["choices"][0]
            if "message" in choice:
                content = choice["message"].get("content", "")
                print(f"[Test] Content type: {type(content)}")
                if isinstance(content, list):
                    print(f"[Test] Content has {len(content)} items")
                    for i, item in enumerate(content):
                        if isinstance(item, dict):
                            print(f"[Test] Item {i}: type={item.get('type')}")
                elif isinstance(content, str):
                    print(f"[Test] Content is string, length: {len(content)}")
                    print(f"[Test] First 200 chars: {content[:200]}")
    else:
        print(f"[Test] Error response: {response.text}")
        
except Exception as e:
    print(f"[Test] Exception: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
