# AI Chat Bot for Telegram

Telegram chatbot សម្រាប់ភាសាខ្មែរ និងអង់គ្លេស ដែលប្រើ AI engine ខ្នាតតូចសរសេរនៅក្នុង repository នេះ។ វា **មិនហៅ OpenAI, Gemini ឬ AI API ខាងក្រៅ** និងមិនត្រូវការ Python package បន្ថែមទេ។

> ចំណាំ៖ Telegram Bot API នៅតែចាំបាច់សម្រាប់ទទួល និងផ្ញើសារ។ AI នេះជា retrieval-based AI មិនមែន LLM ដូច ChatGPT ទេ ដូច្នេះចំណេះដឹងដំបូងមានកម្រិត ប៉ុន្តែអ្នកអាចបង្រៀនវាបន្ថែមបាន។

## មុខងារ

- សន្ទនាជាភាសាខ្មែរ និងអង់គ្លេស
- ផ្គូផ្គងសំណួរដោយ character n-gram TF-IDF ដែលសរសេរដោយ Python សុទ្ធ
- ចងចាំឈ្មោះអ្នកប្រើម្នាក់ៗ
- រៀនសំណួរ–ចម្លើយថ្មីជាមួយ `/teach`
- រក្សាទុកការចងចាំក្នុង `data/`
- មិនមាន dependency ក្រៅ Python standard library

## 1. បង្កើត Telegram Bot

1. បើក Telegram ហើយស្វែងរក `@BotFather` (ត្រូវពិនិត្យថាមានសញ្ញា verified)
2. ផ្ញើ `/newbot`
3. ដាក់ឈ្មោះ bot
4. ដាក់ username ដែលបញ្ចប់ដោយ `bot` ឧទាហរណ៍ `vunheng_ai_chat_bot`
5. BotFather នឹងផ្ញើ Token មកអ្នក។ **កុំដាក់ Token ក្នុង GitHub ឬផ្ញើឱ្យអ្នកដទៃ។**

## 2. ដំណើរការ

ត្រូវការ Python 3.10 ឬថ្មីជាងនេះ៖

```bash
git clone https://github.com/Vunheng11133/ai-chat-bot.git
cd ai-chat-bot
export TELEGRAM_BOT_TOKEN="TOKEN_FROM_BOTFATHER"
python3 bot.py
```

Windows PowerShell៖

```powershell
$env:TELEGRAM_BOT_TOKEN="TOKEN_FROM_BOTFATHER"
python bot.py
```

Bot ត្រូវការម៉ាស៊ីនដែលបើកជាប់ និងមានអ៊ីនធឺណិត។ GitHub រក្សាទុកកូដ ប៉ុន្តែមិនរត់ bot ឱ្យដោយស្វ័យប្រវត្តិទេ។

## 3. ប្រើ Bot

```text
/start
/help
/stats
/teach សំណួរ | ចម្លើយ
```

ឧទាហរណ៍៖

```text
/teach តើរាជធានីកម្ពុជាគឺអ្វី | រាជធានីកម្ពុជាគឺភ្នំពេញ។
```

សរសេរ `ខ្ញុំឈ្មោះ វុនហេង` ហើយ bot នឹងចងចាំឈ្មោះសម្រាប់ Telegram user នោះ។

## Docker

```bash
docker build -t ai-chat-bot .
docker run -d --name ai-chat-bot \
  --restart unless-stopped \
  -e TELEGRAM_BOT_TOKEN="TOKEN_FROM_BOTFATHER" \
  -v ai-chat-data:/app/data \
  ai-chat-bot
```

## តេស្ត

```bash
python3 -m unittest discover -s tests -v
```

## សុវត្ថិភាព

- កុំសរសេរ Token ចូល `bot.py`។
- កុំ commit ឯកសារ `.env`។
- បើ Token បែកធ្លាយ សូមចូល BotFather ហើយ revoke វាភ្លាម។
- ពាក្យបញ្ជា `/teach` បើកឱ្យអ្នកប្រើគ្រប់គ្នាបង្រៀន bot។ សម្រាប់ public bot គួរបន្ថែម admin allowlist មុនដាក់ប្រើទូលំទូលាយ។

## License

MIT
