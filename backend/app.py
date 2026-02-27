from __future__ import annotations

import os

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials
from flask import Flask, jsonify
from flask_cors import CORS

from api.routes.ai import ai_bp
from api.routes.auth import auth_bp
from api.routes.reminders import reminders_bp


def _init_firebase() -> None:
    if firebase_admin._apps:  # type: ignore[attr-defined]
        return

    cred_path = os.getenv("FIREBASE_ADMIN_CREDENTIALS")
    if not cred_path:
        return
    if not os.path.exists(cred_path):
        return

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)


def create_app() -> Flask:
    load_dotenv()
    _init_firebase()

    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    app.config["JSON_SORT_KEYS"] = False

    app.register_blueprint(auth_bp)
    app.register_blueprint(reminders_bp)
    app.register_blueprint(ai_bp)

    @app.get("/health")
    def health():
        return jsonify({"ok": True, "service": "haptimize-backend"})

    return app


if __name__ == "__main__":
    application = create_app()
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", "8000"))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    application.run(host=host, port=port, debug=debug)
