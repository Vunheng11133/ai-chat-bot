import random
import tempfile
import unittest
from pathlib import Path

from ai_engine import FALLBACK_RESPONSES, LocalAI


ROOT = Path(__file__).resolve().parents[1]


class LocalAITest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.ai = LocalAI(
            ROOT / "knowledge.json",
            data_dir=self.temporary.name,
            rng=random.Random(1),
        )

    def tearDown(self):
        self.temporary.cleanup()

    def test_matches_khmer_greeting(self):
        answer = self.ai.respond("ជំរាបសួរ", user_id=1)
        self.assertNotIn(answer, FALLBACK_RESPONSES)

    def test_unknown_question_uses_fallback(self):
        answer = self.ai.respond("xyzzy plugh 987654", user_id=1)
        self.assertIn(answer, FALLBACK_RESPONSES)

    def test_remembers_name_per_user(self):
        self.ai.respond("ខ្ញុំឈ្មោះ វុនហេង", user_id=42)
        self.assertEqual(self.ai.respond("តើខ្ញុំឈ្មោះអ្វី", user_id=42), "អ្នកឈ្មោះ វុនហេង។")
        self.assertIn("មិនទាន់ស្គាល់", self.ai.respond("តើខ្ញុំឈ្មោះអ្វី", user_id=7))

    def test_teaching_persists(self):
        self.ai.teach("តើពណ៌ដែលខ្ញុំចូលចិត្តជាអ្វី", "អ្នកចូលចិត្តពណ៌ខៀវ។")
        reloaded = LocalAI(ROOT / "knowledge.json", data_dir=self.temporary.name)
        self.assertEqual(
            reloaded.respond("តើពណ៌ដែលខ្ញុំចូលចិត្តជាអ្វី", user_id=1),
            "អ្នកចូលចិត្តពណ៌ខៀវ។",
        )
        self.assertEqual(reloaded.learned_count, 1)

    def test_rejects_empty_training(self):
        with self.assertRaises(ValueError):
            self.ai.teach("", "answer")


if __name__ == "__main__":
    unittest.main()
