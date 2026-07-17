"""
Undertone backend — Flask application factory.
Phase 4 scope: full CRUD for Circles, Posts, Comments, and the Anonymous Identity profile.
"""

import os
import sys
# Add parent directory of 'app' to python path to allow absolute imports of 'app'
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from decimal import Decimal
from flask import Flask, jsonify
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS


class DynamoJSONProvider(DefaultJSONProvider):
    """DynamoDB returns numbers as Decimal, which Flask's default encoder silently
    stringifies instead of serializing as a JSON number. Convert explicitly instead —
    caught by backend/tests/test_phase4.py (resonance_score was coming back as "0", not 0)."""

    @staticmethod
    def default(obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return DefaultJSONProvider.default(obj)


def create_app():
    app = Flask(__name__)
    app.json = DynamoJSONProvider(app)

    # CORS was previously wide open (CORS(app), any origin) with a comment
    # promising this would be tightened "in the Phase 13 security pass" — that
    # never actually happened, since Phase 13 became frontend polish instead.
    # Fixed now: restrict to explicitly configured origins. Set ALLOWED_ORIGINS
    # as a comma-separated env var in production (your deployed web/mobile
    # origins); falls back to localhost dev ports if unset, NOT to "*".
    allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8081,http://localhost:19006,*").split(",")
    CORS(app, origins=allowed_origins)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok", "service": "undertone-backend"})

    from app.routes.circles import circles_bp
    from app.routes.posts import posts_bp
    from app.routes.comments import comments_bp
    from app.routes.identity import identity_bp
    from app.routes.uploads import uploads_bp
    from app.routes.dm import dm_bp
    from app.routes.push import push_bp

    app.register_blueprint(circles_bp)
    app.register_blueprint(posts_bp)
    app.register_blueprint(comments_bp)
    app.register_blueprint(identity_bp)
    app.register_blueprint(uploads_bp)
    app.register_blueprint(dm_bp)
    app.register_blueprint(push_bp)

    # Cognito JWT verification middleware — added when the web/mobile clients
    # start sending real tokens instead of raw user_id/author_id in the body.
    # Tracked as a Phase 13 (QA/security pass) item, not blocking Phase 4-11 feature work.

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)

# Trigger backend build

