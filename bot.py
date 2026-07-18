"""Telegram long-polling client for the local AI engine."""

from __future__ import annotations

import json
import logging
import os
import signal
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from ai_engine import LocalAI


LOG = logging.getLogger("ai-chat-bot")
PROJECT_DIR = Path(__file__).resolve().parent
HELP_TEXT = """ពាក្យបញ្ជា៖
/start — ចាប់ផ្តើម
/help — មើលជំនួយ
/teach សំណួរ | ចម្លើយ — បង្រៀន AI
/stats — ចំនួនចំណេះដឹងដែលបានបង្រៀន

អ្នកក៏អាចសរសេរ «ខ្ញុំឈ្មោះ ...» ដើម្បីឱ្យខ្ញុំចងចាំឈ្មោះអ្នក។"""


class TelegramError(RuntimeError):
    pass


class TelegramClient:
    def __init__(self, token: str, timeout: int = 45) -> None:
        self.base_url = f"https://api.telegram.org/bot{token}"
        self.timeout = timeout

    def call(self, method: str, **parameters: Any) -> Any:
        encoded = urllib.parse.urlencode(parameters).encode("utf-8")
        request = urllib.request.Request(
            f"{self.base_url}/{method}",
            data=encoded,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            raise TelegramError(f"Telegram request failed: {type(error).__name__}") from error

        if not payload.get("ok"):
            description = payload.get("description", "Unknown Telegram error")
            raise TelegramError(str(description))
        return payload.get("result")

    def get_updates(self, offset: int | None) -> list[dict[str, Any]]:
        parameters: dict[str, Any] = {
            "timeout": 30,
            "allowed_updates": json.dumps(["message"]),
        }
        if offset is not None:
            parameters["offset"] = offset
        result = self.call("getUpdates", **parameters)
        return result if isinstance(result, list) else []

    def send_message(self, chat_id: int, text: str) -> None:
        # Telegram's message limit is 4096 characters.
        for start in range(0, len(text), 4000):
            self.call("sendMessage", chat_id=chat_id, text=text[start : start + 4000])


class Bot:
    def __init__(self, client: TelegramClient, ai: LocalAI) -> None:
        self.client = client
        self.ai = ai
        self.running = True

    def stop(self, *_: Any) -> None:
        self.running = False

    def reply(self, text: str, user_id: int) -> str:
        command = text.split(maxsplit=1)[0].split("@", maxsplit=1)[0].lower()
        if command == "/start":
            return "សួស្តី! ខ្ញុំជា AI Chat Bot ដែលរត់ដោយមិនប្រើ AI API ខាងក្រៅ។\n\n" + HELP_TEXT
        if command == "/help":
            return HELP_TEXT
        if command == "/stats":
            return f"ខ្ញុំបានរៀនចំណេះដឹងថ្មីចំនួន {self.ai.learned_count}។"
        if command == "/teach":
            parts = text.split(maxsplit=1)
            if len(parts) < 2 or "|" not in parts[1]:
                return "របៀបប្រើ៖ /teach សំណួរ | ចម្លើយ"
            question, answer = parts[1].split("|", maxsplit=1)
            try:
                self.ai.teach(question, answer)
            except ValueError as error:
                return f"មិនអាចរៀនបាន៖ {error}"
            return "ខ្ញុំបានរៀនចម្លើយថ្មីហើយ ✅"
        return self.ai.respond(text, user_id=user_id)

    def handle_update(self, update: dict[str, Any]) -> None:
        message = update.get("message")
        if not isinstance(message, dict) or not isinstance(message.get("text"), str):
            return
        chat = message.get("chat", {})
        sender = message.get("from", {})
        chat_id = chat.get("id")
        user_id = sender.get("id", chat_id)
        if not isinstance(chat_id, int) or not isinstance(user_id, int):
            return
        self.client.send_message(chat_id, self.reply(message["text"], user_id))

    def run(self) -> None:
        offset: int | None = None
        retry_delay = 1
        LOG.info("Bot started. Press Ctrl+C to stop.")
        while self.running:
            try:
                for update in self.client.get_updates(offset):
                    update_id = update.get("update_id")
                    if isinstance(update_id, int):
                        offset = update_id + 1
                    self.handle_update(update)
                retry_delay = 1
            except TelegramError as error:
                LOG.warning("%s; retrying in %ss", error, retry_delay)
                time.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 30)


def main() -> int:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(message)s",
    )
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token:
        LOG.error("TELEGRAM_BOT_TOKEN is not set. See README.md for setup instructions.")
        return 2

    data_dir = Path(os.getenv("DATA_DIR", str(PROJECT_DIR / "data")))
    ai = LocalAI(PROJECT_DIR / "knowledge.json", data_dir=data_dir)
    bot = Bot(TelegramClient(token), ai)
    signal.signal(signal.SIGINT, bot.stop)
    signal.signal(signal.SIGTERM, bot.stop)
    bot.run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
