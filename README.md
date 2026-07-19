# AI Chat Bot Website

AI chat website សម្រាប់ភាសាខ្មែរ និងអង់គ្លេស ដែលដំណើរការផ្ទាល់នៅក្នុង browser។ វា **មិនហៅ OpenAI, Gemini ឬ AI API ខាងក្រៅ** មិនត្រូវការ token និងមិនត្រូវការ VPS ទេ។

## Live website

<https://ai-chat-bot-bwm.pages.dev/>

Cloudflare Pages deploy ដោយស្វ័យប្រវត្តិពី branch `agent/web-chat`។

## មុខងារ

- **1 Fast** — ផ្គូផ្គងចម្លើយរហ័សសម្រាប់ការសន្ទនា និងសំណួរទូទៅ
- **2 Thinking** — ពិនិត្យលទ្ធផលផ្គូផ្គងជាច្រើនមុនជ្រើសចម្លើយ
- **3 Pro** — គណិតបន្ថែមដូចជា `sqrt`, `^`, `!`, `gcd`, `lcm`, ភាគរយ និងចំណេះដឹងកូដ
- Sidebar មាន **សន្ទនាថ្មី**, ស្វែងរកប្រវត្តិ, **ថ្មីៗ** និង **បានខ្ទាស់**
- Local profile នីមួយៗមាន memory, mode និងប្រវត្តិសន្ទនាដាច់ដោយឡែក
- ចងចាំឈ្មោះ អាយុ ទីកន្លែង និងចំណូលចិត្តក្នុង browser (`localStorage`)
- ផ្គូផ្គងចំណេះដឹងដោយ character n-gram TF-IDF ដែលសរសេរដោយ JavaScript សុទ្ធ
- ចំណេះដឹងខ្មែរ/អង់គ្លេសគ្រប់គ្រងក្នុង `knowledge.json`
- រចនាសម្រាប់ទូរស័ព្ទ និងកុំព្យូទ័រ
- មិនមាន API key ឬ dependency ខាងក្រៅ

## គណនី និងភាពឯកជន

Local profile មិនមែនជាគណនីអនឡាញ និងមិនមានការផ្ទៀងផ្ទាត់ password ទេ។ ទិន្នន័យស្ថិតនៅតែក្នុង browser/ឧបករណ៍នោះ ហើយអាចបាត់បើលុប site data។

ប៊ូតុង Google និង Apple ត្រូវបានបង្ហាញសម្រាប់ UI ប៉ុណ្ណោះ។ ដើម្បីឲ្យ login ពិត និង sync ទិន្នន័យឆ្លងឧបករណ៍ ត្រូវភ្ជាប់ OAuth credentials, callback URL និង database/backend សុវត្ថិភាពជាមុន។ វេបសាយមិនបន្លំថាបាន authenticate អ្នកប្រើទេ។

## អំពី “model” ទាំង 3

Fast, Thinking និង Pro គឺជា **local operating modes** របស់ retrieval engine មួយ មិនមែនជា LLM 3 ផ្សេងគ្នា និងមិនមែនជា ChatGPT/OpenAI/Gemini ទេ។ Thinking ប្រើការផ្គូផ្គងប្រុងប្រយ័ត្នជាង ខណៈ Pro បើក parser គណិតបន្ថែមដោយមិនប្រើ `eval`។

## ឯកសារសំខាន់

- `index.html` — រចនាសម្ព័ន្ធ UI
- `styles.css` — រូបរាង responsive និង animation
- `app.js` — chat engine, modes, profiles, memory, history និង math parser
- `knowledge.json` — សំណួរគំរូ និងចម្លើយ

## ដំណើរការនៅក្នុងម៉ាស៊ីន

```bash
python3 -m http.server 8000
```

បន្ទាប់មកបើក <http://localhost:8000>។

## របៀបអាប់ដេត

1. កែកូដនៅ branch `agent/web-chat`
2. Commit និង push ទៅ GitHub
3. Cloudflare Pages build និង deploy កំណែថ្មីស្វ័យប្រវត្តិ
4. មើលការផ្លាស់ប្តូរនៅ **GitHub → branch `agent/web-chat` → Commits**

## ចំណាំ

AI នេះជា retrieval-based AI ខ្នាតតូច។ វាមិនអាចយល់ និងបង្កើតចម្លើយទូទៅដូច LLM ធំបានទេ។ ចំណេះដឹងសាធារណៈស្ថិតក្នុង `knowledge.json` រីឯព័ត៌មានផ្ទាល់ខ្លួន និងប្រវត្តិសន្ទនារក្សាទុកតែក្នុង browser។

## License

MIT
