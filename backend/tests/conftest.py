"""
Shared pytest fixtures. `auth_headers` provides a valid, locally-signed test
JWT for exercising @require_auth-protected endpoints (currently just
resolve_report_route — see app/auth.py and README.md's Phase 20 section)
without needing a real Cognito connection.
"""

import time
import base64
import pytest
from jose import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

TEST_ISSUER = "https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_testpool"
TEST_AUDIENCE = "test-client-id"
TEST_KID = "test-key-1"


def _b64url_uint(n: int) -> str:
    byte_length = (n.bit_length() + 7) // 8
    return base64.urlsafe_b64encode(n.to_bytes(byte_length, "big")).rstrip(b"=").decode()


@pytest.fixture(scope="session")
def test_keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_numbers = private_key.public_key().public_numbers()
    jwk = {
        "kty": "RSA", "kid": TEST_KID, "use": "sig", "alg": "RS256",
        "n": _b64url_uint(public_numbers.n), "e": _b64url_uint(public_numbers.e),
    }
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return {"private_pem": private_pem, "jwks": {"keys": [jwk]}}


@pytest.fixture
def make_token(test_keypair):
    def _make(sub: str) -> str:
        claims = {
            "sub": sub, "iss": TEST_ISSUER, "aud": TEST_AUDIENCE,
            "exp": int(time.time()) + 3600, "iat": int(time.time()),
        }
        return jwt.encode(claims, test_keypair["private_pem"], algorithm="RS256", headers={"kid": TEST_KID})
    return _make


@pytest.fixture(autouse=True)
def patch_jwks(monkeypatch, test_keypair):
    """Every test gets a working (mocked) JWKS automatically, so tests that
    don't care about auth don't need to think about it, and tests that do
    (via make_token) just work.

    Patches app.auth's module-level constants directly rather than os.environ
    — those constants are read from the environment at IMPORT time, so setting
    os.environ after app.auth has already been imported (which happens as soon
    as anything imports app.main) would silently do nothing. Caught this before
    it caused a confusing failure, not after."""
    import app.auth as auth_module
    monkeypatch.setattr(auth_module, "get_jwks", lambda: test_keypair["jwks"])
    monkeypatch.setattr(auth_module, "AWS_REGION", "ap-south-1")
    monkeypatch.setattr(auth_module, "USER_POOL_ID", "ap-south-1_testpool")
    monkeypatch.setattr(auth_module, "CLIENT_ID", TEST_AUDIENCE)
    yield
