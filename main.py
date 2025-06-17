from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse
from urllib.parse import urlencode
import requests
import os
import json
from dotenv import load_dotenv
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from fastapi.middleware.cors import CORSMiddleware

# ----------------------
# Environment & Sentry
# ----------------------

load_dotenv()

sentry_dsn = os.getenv("SENTRY_DSN_BACKEND")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[FastApiIntegration()],
        traces_sample_rate=1.0,
    )

# Create the FastAPI app
app = FastAPI(
    title="Anemoia Backend",
    description="API for the Anemoia web application",
    version="1.0.0",
)

# ----------------------
# CORS setup
# ----------------------

origins = [
    "http://localhost:5173",            # Local dev server
    "https://anemoia-web.onrender.com", # Render frontend
    "https://anemoias.me",              # Custom domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------
# OAuth / Google
# ----------------------

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/auth/callback")

GOOGLE_SCOPES = "openid email profile"

# Simple in-memory state store (replace with DB/Redis in prod)
oauth_states: set[str] = set()

# Keep original /api/health for backward-compatibility

@app.get("/api/health", tags=["Status"])
def health_check():
    """A simple endpoint to confirm the API is running."""
    return {"status": "ok"}

# ----------------------
# Google OAuth endpoints
# ----------------------

@app.get("/auth/google", tags=["Auth"])
def google_auth():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    import secrets
    state = secrets.token_urlsafe(16)
    oauth_states.add(state)

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }

    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(auth_url)

@app.get("/auth/callback", tags=["Auth"])
def google_auth_callback(code: str | None = None, state: str | None = None):
    if state is None or state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state")

    oauth_states.discard(state)

    if code is None:
        raise HTTPException(status_code=400, detail="Missing code")

    token_resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=15,
    )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch tokens from Google")

    tokens = token_resp.json()

    id_token = tokens.get("id_token", "")
    js_object_literal = json.dumps({
        "token": id_token,
        "raw": tokens,
    })
    # Inlining JSON directly into JS. Ensure closing tags are escaped.
    js_object_literal = js_object_literal.replace("</", "<\/")

    html = (
        f"""
        <html><body>
        <script>
        window.opener?.postMessage({js_object_literal}, '*');
        window.close();
        </script>
        <p>You may close this window.</p>
        </body></html>
        """
    )
    return HTMLResponse(content=html, status_code=200)

# ----------------------
# Root path
# ----------------------

@app.get("/", include_in_schema=False)
@app.head("/", include_in_schema=False)
def root():
    """Basic welcome endpoint used by Render health-checks."""
    return {"message": "Welcome to the Anemoia API"} 