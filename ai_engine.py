"""A tiny, dependency-free conversational AI engine.

The engine uses character n-gram TF-IDF similarity rather than an external
language-model API.  It is intentionally small enough to run on inexpensive
hardware and can learn new question/answer pairs at runtime.
"""

from __future__ import annotations

import json
import math
import os
import random
import re
import tempfile
import unicodedata
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any


FALLBACK_RESPONSES = (
    "ខ្ញុំមិនទាន់ចេះឆ្លើយសំណួរនេះទេ។ អ្នកអាចបង្រៀនខ្ញុំដោយប្រើ /teach សំណួរ | ចម្លើយ",
    "សូមសរសេរឲ្យខុសបន្តិច ឬបង្រៀនខ្ញុំដោយ /teach សំណួរ | ចម្លើយ។",
    "I do not know that yet. Teach me with /teach question | answer",
)


def _read_json(path: Path, default: Any) -> Any:
    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return default


def _atomic_write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as file:
            json.dump(value, file, ensure_ascii=False, indent=2)
            file.write("\n")
        os.replace(temporary_name, path)
    except Exception:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
        raise


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).casefold().strip()
    text = re.sub(r"[^\w\u1780-\u17ff]+", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


def features(text: str) -> Counter[str]:
    """Return word and character n-gram features for Khmer and Latin text."""
    clean = normalize(text)
    values: Counter[str] = Counter()
    if not clean:
        return values

    for word in clean.split():
        values[f"w:{word}"] += 2

    compact = clean.replace(" ", "_")
    for size in (2, 3, 4):
        for index in range(max(0, len(compact) - size + 1)):
            values[f"c:{compact[index:index + size]}"] += 1
    return values


class LocalAI:
    """Retrieval-based chatbot with per-user memory and runtime teaching."""

    def __init__(
        self,
        knowledge_path: str | Path,
        data_dir: str | Path = "data",
        threshold: float = 0.30,
        rng: random.Random | None = None,
    ) -> None:
        self.knowledge_path = Path(knowledge_path)
        self.data_dir = Path(data_dir)
        self.custom_path = self.data_dir / "learned.json"
        self.memory_path = self.data_dir / "memory.json"
        self.threshold = threshold
        self.rng = rng or random.Random()
        self.memory: dict[str, dict[str, str]] = _read_json(self.memory_path, {})
        self.entries: list[dict[str, Any]] = []
        self._documents: list[tuple[Counter[str], list[str]]] = []
        self._idf: dict[str, float] = {}
        self.reload()

    def reload(self) -> None:
        built_in = _read_json(self.knowledge_path, [])
        learned = _read_json(self.custom_path, [])
        self.entries = [
            item
            for item in [*built_in, *learned]
            if isinstance(item, dict)
            and isinstance(item.get("patterns"), list)
            and isinstance(item.get("responses"), list)
            and item["patterns"]
            and item["responses"]
        ]
        self._build_index()

    def _build_index(self) -> None:
        raw_documents: list[tuple[Counter[str], list[str]]] = []
        document_frequency: Counter[str] = Counter()

        for entry in self.entries:
            responses = [str(value) for value in entry["responses"] if str(value).strip()]
            for pattern in entry["patterns"]:
                vector = features(str(pattern))
                if vector and responses:
                    raw_documents.append((vector, responses))
                    document_frequency.update(vector.keys())

        count = max(1, len(raw_documents))
        self._idf = {
            name: math.log((count + 1) / (frequency + 1)) + 1.0
            for name, frequency in document_frequency.items()
        }
        self._documents = raw_documents

    def _similarity(self, left: Counter[str], right: Counter[str]) -> float:
        shared = left.keys() & right.keys()
        numerator = sum(
            left[key] * right[key] * self._idf.get(key, 1.0) ** 2
            for key in shared
        )
        left_length = math.sqrt(
            sum((value * self._idf.get(key, 1.0)) ** 2 for key, value in left.items())
        )
        right_length = math.sqrt(
            sum((value * self._idf.get(key, 1.0)) ** 2 for key, value in right.items())
        )
        if not left_length or not right_length:
            return 0.0
        return numerator / (left_length * right_length)

    def _remember_name(self, message: str, user_id: str) -> str | None:
        expressions = (
            r"(?:ខ្ញុំឈ្មោះ|ឈ្មោះខ្ញុំគឺ)\s+([^\s,.!?]{1,40})",
            r"(?:my name is|call me)\s+([\w'-]{1,40})",
        )
        for expression in expressions:
            match = re.search(expression, message, flags=re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                self.memory.setdefault(user_id, {})["name"] = name
                _atomic_write_json(self.memory_path, self.memory)
                return f"រីករាយដែលបានស្គាល់ {name}! ខ្ញុំនឹងចងចាំឈ្មោះរបស់អ្នក។"
        return None

    def _recall_name(self, message: str, user_id: str) -> str | None:
        clean = normalize(message)
        questions = (
            "តើខ្ញុំឈ្មោះអ្វី",
            "ចាំឈ្មោះខ្ញុំទេ",
            "what is my name",
            "do you remember my name",
        )
        if any(normalize(question) in clean for question in questions):
            name = self.memory.get(user_id, {}).get("name")
            if name:
                return f"អ្នកឈ្មោះ {name}។"
            return "ខ្ញុំមិនទាន់ស្គាល់ឈ្មោះអ្នកទេ។ សរសេរ៖ ខ្ញុំឈ្មោះ [ឈ្មោះរបស់អ្នក]"
        return None

    def respond(self, message: str, user_id: str | int = "anonymous") -> str:
        message = message.strip()
        identity = str(user_id)
        if not message:
            return "សូមសរសេរសារមកខ្ញុំ។"

        memory_response = self._remember_name(message, identity)
        if memory_response:
            return memory_response
        recall_response = self._recall_name(message, identity)
        if recall_response:
            return recall_response

        query = features(message)
        best_score = 0.0
        best_responses: list[str] | None = None
        for document, responses in self._documents:
            score = self._similarity(query, document)
            if score > best_score:
                best_score = score
                best_responses = responses

        if best_responses and best_score >= self.threshold:
            response = self.rng.choice(best_responses)
            now = datetime.now().astimezone()
            return response.format(
                name=self.memory.get(identity, {}).get("name", "មិត្តភក្តិ"),
                time=now.strftime("%H:%M"),
                date=now.strftime("%Y-%m-%d"),
            )
        return self.rng.choice(FALLBACK_RESPONSES)

    def teach(self, question: str, answer: str) -> None:
        question = question.strip()
        answer = answer.strip()
        if len(question) < 2 or len(answer) < 2:
            raise ValueError("Question and answer must each contain at least 2 characters.")
        if len(question) > 500 or len(answer) > 2000:
            raise ValueError("Question or answer is too long.")

        learned = _read_json(self.custom_path, [])
        if not isinstance(learned, list):
            learned = []
        learned.append({"patterns": [question], "responses": [answer]})
        _atomic_write_json(self.custom_path, learned)
        self.reload()

    @property
    def learned_count(self) -> int:
        learned = _read_json(self.custom_path, [])
        return len(learned) if isinstance(learned, list) else 0
