"""
Phase 20 auth tests. Generates a real RSA keypair locally and hand-signs JWTs
matching Cognito's exact token shape (RS256, iss/aud/exp/sub claims, kid in
header), then verifies auth.py's verify_token() against them — the same
verification path a real Cognito token would go through. This proves the
cryptographic verification logic is genuinely correct: valid tokens pass,
tampered signatures are rejected, expired tokens are rejected, wrong-audience
tokens are rejected. It does NOT prove a real Cognito-issued token round-trips
end to end, since there's no network path to Cognito's real JWKS endpoint from
this sandbox — that remains genuinely unverified, and is stated as such in
README.md's Phase 20 section.

Run with: python -m pytest backend/tests/test_phase20_auth.py -v
"""

import os
import time
import base64
import pytest
from jose import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

os.environ["AWS_REGION"] = "ap-south-1"
os.environ["COGNITO_USER_POOL_ID"] = "ap-south-1_testpool"
os.environ["COGNITO_CLIENT_ID"] = "test-client-id"

from app.auth import verify_token, InvalidTokenError

ISSUER = "https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_testpool"
AUDIENCE = "test-client-id"
KID = "test-key-1"


def _b64url_uint(n: int) -> str:
    byte_length = (n.bit_length() + 7) // 8
    return base64.urlsafe_b64encode(n.to_bytes(byte_length, "big")).rstrip(b"=").decode()


@pytest.fixture(scope="module")
def keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_numbers = private_key.public_key().public_numbers()
    jwk = {
        "kty": "RSA",
        "kid": KID,
        "use": "sig",
        "alg": "RS256",
        "n": _b64url_uint(public_numbers.n),
        "e": _b64url_uint(public_numbers.e),
    }
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return {"private_pem": private_pem, "jwks": {"keys": [jwk]}}


def _make_token(keypair, sub="user-abc-123", overrides=None):
    claims = {
        "sub": sub,
        "iss": ISSUER,
        "aud": AUDIENCE,
        "token_use": "id",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }
    if overrides:
        claims.update(overrides)
    return jwt.encode(claims, keypair["private_pem"], algorithm="RS256", headers={"kid": KID})


def test_valid_token_verifies_and_returns_correct_sub(keypair):
    token = _make_token(keypair, sub="user-abc-123")
    claims = verify_token(token, jwks=keypair["jwks"])
    assert claims["sub"] == "user-abc-123"


def test_tampered_signature_rejected(keypair):
    token = _make_token(keypair)
    # Flip a character in the signature portion (after the last dot)
    header_payload, signature = token.rsplit(".", 1)
    tampered_signature = ("A" if signature[0] != "A" else "B") + signature[1:]
    tampered = f"{header_payload}.{tampered_signature}"

    with pytest.raises(InvalidTokenError):
        verify_token(tampered, jwks=keypair["jwks"])


def test_expired_token_rejected(keypair):
    token = _make_token(keypair, overrides={"exp": int(time.time()) - 3600})
    with pytest.raises(InvalidTokenError):
        verify_token(token, jwks=keypair["jwks"])


def test_wrong_audience_rejected(keypair):
    token = _make_token(keypair, overrides={"aud": "some-other-client-id"})
    with pytest.raises(InvalidTokenError):
        verify_token(token, jwks=keypair["jwks"])


def test_wrong_issuer_rejected(keypair):
    token = _make_token(keypair, overrides={"iss": "https://evil.example.com/fake-pool"})
    with pytest.raises(InvalidTokenError):
        verify_token(token, jwks=keypair["jwks"])


def test_unknown_kid_rejected(keypair):
    # A validly-signed token, but claiming a kid that isn't in the JWKS —
    # simulates an attacker trying to reference a key that was never issued.
    token = jwt.encode(
        {"sub": "attacker", "iss": ISSUER, "aud": AUDIENCE, "exp": int(time.time()) + 3600},
        keypair["private_pem"],
        algorithm="RS256",
        headers={"kid": "nonexistent-key"},
    )
    with pytest.raises(InvalidTokenError, match="No matching key"):
        verify_token(token, jwks=keypair["jwks"])


def test_malformed_token_rejected(keypair):
    with pytest.raises(InvalidTokenError):
        verify_token("not-a-real-jwt-at-all", jwks=keypair["jwks"])


def test_require_auth_decorator_end_to_end(keypair):
    """Exercises the actual Flask decorator, not just verify_token() directly —
    confirms the 401 response shape and that g.user_id is set correctly on success."""
    from flask import Flask, g, jsonify
    from unittest.mock import patch
    import app.auth as auth_module

    app = Flask(__name__)

    @app.get("/protected")
    @auth_module.require_auth
    def protected():
        return jsonify({"user_id": g.user_id})

    client = app.test_client()

    # No token at all
    resp = client.get("/protected")
    assert resp.status_code == 401

    # Valid token
    token = _make_token(keypair, sub="real-user-42")
    with patch.object(auth_module, "get_jwks", return_value=keypair["jwks"]):
        resp = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.get_json()["user_id"] == "real-user-42"

    # Tampered token
    bad_token = token[:-5] + "xxxxx"
    with patch.object(auth_module, "get_jwks", return_value=keypair["jwks"]):
        resp = client.get("/protected", headers={"Authorization": f"Bearer {bad_token}"})
        assert resp.status_code == 401
