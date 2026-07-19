# AI Chat Bot Website

AI chat website សម្រាប់ភាសាខ្មែរ និងអង់គ្លេស ដែលដំណើរការផ្ទាល់នៅក្នុង browser។ វា **មិនហៅ OpenAI, Gemini ឬ AI API ខាងក្រៅ** មិនត្រូវការ token និងមិនត្រូវការ VPS ទេ។

## Live website

បន្ទាប់ពីបើក GitHub Pages វេបសាយនឹងមានអាសយដ្ឋាន៖

<https://vunheng11133.github.io/ai-chat-bot/>

## មុខងារ

- សន្ទនាជាភាសាខ្មែរ និងអង់គ្លេស
- ផ្គូផ្គងសំណួរដោយ character n-gram TF-IDF ដែលសរសេរដោយ JavaScript សុទ្ធ
- ចងចាំឈ្មោះ អាយុ ទីកន្លែង ចំណូលចិត្ត និងប្រវត្តិសន្ទនាក្នុង browser (`localStorage`)
- បង្រៀនចម្លើយថ្មីជាមួយ `/teach សំណួរ | ចម្លើយ`
- រចនាសម្រាប់ទូរស័ព្ទ និងកុំព្យូទ័រ
- មិនមាន API key ឬ dependency ខាងក្រៅ
- មានចំណេះដឹង 96 ក្រុម និងសំណួរគំរូជាង 230 ទម្រង់ក្នុង `knowledge.json`

## បើក GitHub Pages

1. ចូល repository នេះ ហើយចុច **Settings**
2. ចុច **Pages**
3. ត្រង់ **Build and deployment → Source** ជ្រើស **Deploy from a branch**
4. ជ្រើស branch **main** និង folder **/(root)**
5. ចុច **Save** ហើយរង់ចាំ 1–3 នាទី

## ដំណើរការនៅក្នុងម៉ាស៊ីន

```bash
python3 -m http.server 8000
```

បន្ទាប់មកបើក <http://localhost:8000>។

## ចំណាំ

AI នេះជា retrieval-based AI ខ្នាតតូច មិនមែន LLM ដូច ChatGPT ទេ។ ចំណេះដឹងដែលបង្រៀនថ្មីរក្សាទុកតែក្នុង browser/ឧបករណ៍នោះ ហើយមិនបញ្ជូនទៅ server ទេ។


## License

MIT
