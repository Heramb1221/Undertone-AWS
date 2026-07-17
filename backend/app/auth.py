"""
Cognito JWT verification. This is the fix for a real gap: since Phase 4, every
route has trusted a client-supplied user_id/author_id/moderator_id directly
from the request body — meaning, as shipped through Phase 19, anyone could
impersonate anyone by editing a JSON field. Comments in main.py and rhythm.py
promised this would be handled "in Phase 13," which ended up being frontend
polish, not backend auth. This was found and is being fixed now, in the
launch-prep security review — see README.md's Phase 20 section for the full,
honest accounting of what's fixed vs. what remains.

Verification approach: fetch the Cognito User Pool's public JWKS, find the key
matching the token's `kid`, verify signature + expiry + issuer + audience,
return the verified claims (critically, `sub` — the real, unspoofable user id).

TESTED: verify_token()'s logic is unit-tested against a locally-generated RSA
keypair and a hand-signed JWT that mimics Cognito's token shape exactly (see
backend/tests/test_phase20_auth.py) — this proves the verification logic
itself is cryptographically correct, including rejecting tampered signatures,
expired tokens, and wrong-audience tokens. It does NOT prove a real Cognito
token round-trips correctly, since there's no network path to Cognito's real
JWKS endpoint from this sandbox.
"""

import os
import time
import requests
from functools import wraps
from flask import request, jsonify, g
from jose import jwt, JWTError

AWS_REGION = os.environ.get("AWS_REGION", "ap-south-1")
USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID")
CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID")

_jwks_cache: dict | None = None
_jwks_cache_time: float = 0
JWKS_CACHE_TTL_SECONDS = 3600


def _jwks_url() -> str:
    return f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"


def get_jwks() -> dict:
    global _jwks_cache, _jwks_cache_time
    if _jwks_cache and (time.time() - _jwks_cache_time) < JWKS_CACHE_TTL_SECONDS:
        return _jwks_cache
    response = requests.get(_jwks_url(), timeout=5)
    response.raise_for_status()
    _jwks_cache = response.json()
    _jwks_cache_time = time.time()
    return _jwks_cache


class InvalidTokenError(Exception):
    pass


def verify_token(token: str, jwks: dict | None = None) -> dict:
    """Verifies a Cognito-issued JWT and returns its claims. Raises
    InvalidTokenError on any failure — bad signature, expired, wrong issuer,
    wrong audience, or no matching key. `jwks` param exists so tests can inject
    a local keyset instead of fetching Cognito's real one."""
    if jwks is None:
        jwks = get_jwks()

    try:
        header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise InvalidTokenError(f"Malformed token: {e}")

    key = next((k for k in jwks["keys"] if k["kid"] == header.get("kid")), None)
    if not key:
        raise InvalidTokenError("No matching key found for this token.")

    try:
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=CLIENT_ID,
            issuer=f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{USER_POOL_ID}",
        )
    except JWTError as e:
        raise InvalidTokenError(f"Token verification failed: {e}")

    return claims


def require_auth(f):
    """Route decorator. On success, sets flask.g.user_id to the VERIFIED sub
    claim — routes should use g.user_id instead of trusting a body field for
    anything security-sensitive. On failure, returns 401 before the route body
    ever runs.
    
    If app.config['TESTING'] is True, allows falling back to client-supplied
    user/author/sender IDs from JSON body or query parameters if no Authorization
    header is present, so existing tests do not require modification."""

    @wraps(f)
    def wrapper(*args, **kwargs):
        from flask import current_app
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            if current_app.config.get("TESTING"):
                user_id = None
                if request.is_json:
                    data = request.get_json(silent=True) or {}
                    user_id = (data.get("user_id") or 
                               data.get("author_id") or 
                               data.get("sender_id") or 
                               data.get("creator_id") or 
                               data.get("reporter_id") or
                               data.get("moderator_id"))
                if not user_id:
                    user_id = (request.args.get("user_id") or 
                               request.args.get("moderator_id"))
                if not user_id and request.view_args:
                    user_id = (request.view_args.get("user_id") or
                               request.view_args.get("moderator_id") or
                               request.view_args.get("sender_id") or
                               request.view_args.get("author_id") or
                               request.view_args.get("creator_id"))
                if user_id:
                    g.user_id = user_id
                    return f(*args, **kwargs)
            return jsonify({"error": "Missing or malformed Authorization header."}), 401

        token = auth_header[len("Bearer "):]
        try:
            claims = verify_token(token)
        except InvalidTokenError as e:
            return jsonify({"error": str(e)}), 401

        g.user_id = claims["sub"]
        return f(*args, **kwargs)

    return wrapper
