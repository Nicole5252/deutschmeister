import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url';

// Initialize pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Convert a specific page of a PDF File to a base64 PNG image.
 * @param {File} file  - The PDF File object
 * @param {number} pageNum - 1-indexed page number (default: 1)
 * @returns {Promise<{ base64: string, mimeType: string }>}
 */
export async function pdfPageToImageBase64(file, pageNum = 1) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const page = await pdf.getPage(Math.min(pageNum, totalPages));

  const viewport = page.getViewport({ scale: 2.0 }); // 2x for clarity
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport }).promise;

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  return { base64, mimeType: 'image/png', totalPages };
}


let germanVoice = null;

function findGermanVoice() {
  const voices = window.speechSynthesis.getVoices();
  // Prefer German voices
  return voices.find(v => v.lang.startsWith('de')) || 
         voices.find(v => v.lang.includes('de')) || 
         null;
}

export function initTTS() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
      germanVoice = findGermanVoice();
    };
    germanVoice = findGermanVoice();
  }
}

export function speak(text, rate = 0.8) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  if (!germanVoice) germanVoice = findGermanVoice();
  if (germanVoice) utterance.voice = germanVoice;
  utterance.lang = 'de-DE';
  utterance.rate = rate;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

export function getAvailableVoices() {
  if (!window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('de'));
}

// UUID generator
export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// Format date relative
export function formatRelativeDate(timestamp) {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 週前`;
  return `${Math.floor(days / 30)} 個月前`;
}

// Format next review date
export function formatNextReview(timestamp) {
  if (!timestamp) return '新卡片';
  const diff = timestamp - Date.now();
  if (diff <= 0) return '待複習';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} 分後`;
  if (hours < 24) return `${hours} 小時後`;
  return `${days} 天後`;
}

// AI API call to Google Gemini
export async function callGemini(apiKey, contents, model = 'gemini-1.5-flash') {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        responseMimeType: 'application/json',
      }
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
    throw new Error('Gemini API 沒有回傳內容。請檢查 API Key 是否有效。');
  }
  return data.candidates[0].content.parts[0].text;
}

// Helper to determine AI mode and key
function getAIModeAndKey(apiKeys) {
  if (typeof apiKeys === 'string') {
    return { mode: 'openai', key: apiKeys };
  }
  if (apiKeys?.openaiKey) {
    return { mode: 'openai', key: apiKeys.openaiKey };
  }
  if (apiKeys?.geminiKey) {
    return { mode: 'gemini', key: apiKeys.geminiKey };
  }
  throw new Error('未設定 API Key，請先在設定中填入 OpenAI 或 Gemini API Key');
}

// AI API call to OpenAI
export async function callOpenAI(apiKey, messages, model = 'gpt-4o-mini') {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Extract words from image using AI (OpenAI or Gemini)
export async function extractWordsFromImage(apiKeys, imageBase64, mimeType = 'image/jpeg') {
  const { mode, key } = getAIModeAndKey(apiKeys);
  
  const prompt = `你是一個極度嚴謹且高精準度的德文學習助手與文字辨識 (OCR) 專家。
請仔細分析這張圖片，從上到下、從左到右地毯式掃描每一個角落（包含標題、主內文、表格、清單、註解、邊欄、例句中的關鍵詞、甚至是微小的標記），提取圖片中出現的【所有】德文單字或片語，不要遺漏任何一個。

請以 JSON 格式回覆，格式如下：
{
  "words": [
    {
      "german": "德文單字或片語（不含冠詞）",
      "chinese": "中文翻譯",
      "partOfSpeech": "noun/verb/adjective/adverb/other",
      "article": "der/die/das（如果不是名詞則留空）",
      "example": "為該單字自動生成的德文例句（限 A1 程度，並附帶中文翻譯，例如：Das Haus ist groß. 房子很大。）"
    }
  ]
}

提取與辨識規範：
1. 【地毯式提取】：必須仔細辨識圖片中每一個文字區域。凡是圖片中可被視為詞彙（單字、動詞片語、名詞片語等）的文字，都必須提取出來。絕對不能偷懶或只提取前幾個，必須做到滴水不漏。
2. 【冠詞分離】：如果是名詞，提取出的「german」欄位不應包含冠詞（如 der/die/das 應抽離），並將冠詞填在「article」欄位中。
3. 【自動生成 A1 例句】：對於「每一個」提取出來的單字，必須為其自動生成一個實用、簡單、嚴格符合 A1 程度的德文例句，並在例句後附上中文對照翻譯。例句不能為空。
4. 【只回覆 JSON】：請僅回覆合法的 JSON 字串，不要包含任何 markdown 標記（如 \`\`\`json）或額外的說明文字。`;

  let result;
  if (mode === 'openai') {
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' } }
        ]
      }
    ];
    result = await callOpenAI(key, messages, 'gpt-4o');
  } else {
    const contents = [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: imageBase64
            }
          }
        ]
      }
    ];
    result = await callGemini(key, contents, 'gemini-3.5-flash');
  }
  
  // Parse JSON
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid AI response format');
  return JSON.parse(jsonMatch[0]);
}

// Generate grammar questions using AI (OpenAI or Gemini)
export async function generateGrammarQuestions(apiKeys, topic, description, questionCount = 5, type = 'multiple', userVocabList = []) {
  const { mode, key } = getAIModeAndKey(apiKeys);
  
  const typeMap = {
    multiple: '選擇題（4個選項，1個正確答案）',
    fillBlank: '填空題（提供一個句子，填入正確的形式）',
    sentence: '造句練習（給出單字，造出正確的德文句子）',
  };

  let vocabInstruction = '';
  if (Array.isArray(userVocabList) && userVocabList.length > 0) {
    vocabInstruction = `\n【出題詞彙要求（以使用者單字本為主，不得超過 A1 範圍）】：
為了讓練習更符合使用者的真實學習內容，你必須「優先且主要」使用以下使用者單字本中的單字來設計題目（如例句、選項、問答）：
${userVocabList.slice(0, 100).join(', ')}
如果單字量不足或文法點需要其他單字配合，你可以使用其他德文單字，但所有使用的詞彙與句子結構都必須「嚴格限制在 A1 程度」，不得超過 A1 的範圍！\n`;
  } else {
    vocabInstruction = `\n【出題詞彙要求】：
請使用簡單的德文單字，且所有題目與句子的字彙、片語及語法結構必須「嚴格限制在 A1 程度」，不得超過 A1 的範圍！\n`;
  }

  const prompt = `你是一個專業的德文文法教師。請根據以下文法主題，生成 ${questionCount} 道練習題。

文法主題：${topic}
說明：${description || '請根據主題自行判斷'}
要求題型形式：${typeMap[type] || '選擇題'}
${vocabInstruction}

【出題與題型規範（極重要）】：
你生成的題目必須且只能屬於以下五大題型之一。所有題目中的德文單字、片語及句型必須嚴格限制在德語 A1 程度。

1. 題型 1：可分動詞與情態助動詞填空題 (Trennbare Verben & Modalverben)
   - 格式：一個完整的德文句子，中間挖空兩個格子（用 "______" 表示）。句尾會括號給予動詞原形。
   - JSON 範例：
     {
       "type": "fillBlank",
       "question": "______ du heute ______? (einkaufen)",
       "blanks": ["Kaufst", "ein"],
       "explanation": "文法說明（請用繁體中文）"
     }
     或：
     {
       "type": "fillBlank",
       "question": "Ich ______ heute nicht ______. (können, kommen)",
       "blanks": ["kann", "kommen"],
       "explanation": "文法說明（請用繁體中文）"
     }

2. 題型 2：祈使句/命令句改寫與填空題 (Imperativ)
   - 格式：給予情境或一般陳述句，要求填入或選擇對應的 Imperativ 形式（含 du, ihr, Sie）。
   - JSON 範例：
     {
       "type": "fillBlank",
       "question": "(du) ______ leise! (sein)",
       "blank": "Sei",
       "explanation": "文法說明（請用繁體中文）"
     }

3. 題型 3：雙介系詞與德文語格「二選一」或「填空題」 (Wechselpräpositionen: Akkusativ oder Dativ)
   - 格式：根據動詞是動態（Wohin）還是靜態（Wo），決定要填入 Akkusativ 還是 Dativ 的冠詞/介系詞。
   - JSON 範例：
     {
       "type": "fillBlank",
       "question": "Das Bild hängt an ______ Wand (f.). [提示：hängen是靜態]",
       "blank": "der",
       "explanation": "文法說明（請用繁體中文）"
     }

4. 題型 4：現在完成式造句與填空題 (Perfekt)
   - 格式：給予現在式句子或單字碎片，判斷助動詞 (haben/sein) 並填入過去分詞 (Partizip II)。可以挖空兩個格子。
   - JSON 範例：
     {
       "type": "fillBlank",
       "question": "提示：gestern / ich / nach Hause / gehen\\nIch ______ gestern nach Hause ______.",
       "blanks": ["bin", "gegangen"],
       "explanation": "文法說明（請用繁體中文）"
     }

5. 題型 5：情境問答與對話連線/填空題 (Situationen & Dialoge)
   - 格式：給予生活對話情境或問題，選擇或填入最符合邏輯的回應。
   - JSON 範例：
     {
       "type": "multiple",
       "question": "情境：在商店中，店員問：'Was möchten Sie?'。以下哪個回答最合適？",
       "options": ["Ich möchte ein Kilo Äpfel, bitte.", "Ich gehe nach Hause.", "Es tut mir leid.", "Ich bin müde."],
       "correctAnswer": 0,
       "explanation": "文法說明（請用繁體中文）"
     }

【格式調整要求】：
- 如果「要求題型形式」是「選擇題（multiple）」，請將題目改為選擇題形式，提供 4 個 options，並指出正確的 correctAnswer（索引值 0-3）。
- 如果「要求題型形式」是「填空題（fillBlank）」，請依上述挖空格式出題，單格填空使用 "blank" 欄位，雙格填空使用 "blanks" 陣列欄位。
- 如果「要求題型形式」是「造句練習（sentence）」，請將題目設定為 "type": "sentence"，提供單字碎片陣列 "words" 及正確句子 "correctAnswer"，例如考 Imperativ 或 Perfekt 的造句排順序。

只回覆 JSON，不要其他文字。`;

  let result;
  if (mode === 'openai') {
    result = await callOpenAI(key, [{ role: 'user', content: prompt }]);
  } else {
    const contents = [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];
    result = await callGemini(key, contents, 'gemini-1.5-flash');
  }
  
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 回傳格式錯誤，請再試一次');
  return JSON.parse(jsonMatch[0]);
}

// Extract grammar rules and generate questions from an image using AI (OpenAI or Gemini)
export async function extractGrammarFromImage(apiKeys, imageBase64, mimeType = 'image/png', options = {}) {
  const { mode, key } = getAIModeAndKey(apiKeys);
  const { count = 5, type = 'multiple', difficulty = 'medium' } = options;

  const typeInstructions = {
    multiple: `選擇題格式：
{
  "type": "multiple",
  "question": "題目（德文句子）",
  "options": ["選項A", "選項B", "選項C", "選項D"],
  "correctAnswer": 0,
  "explanation": "文法解說（繁體中文）"
}`,
    fillBlank: `填空題格式：
{
  "type": "fillBlank",
  "question": "Die Katze ___ (schlafen) auf dem Sofa.",
  "blank": "schläft",
  "hint": "動詞提示",
  "explanation": "文法解說（繁體中文）"
}`,
    sentence: `造句題格式：
{
  "type": "sentence",
  "words": ["ich", "gehen", "heute", "Schule"],
  "correctAnswer": "Ich gehe heute in die Schule.",
  "explanation": "文法解說（繁體中文）"
}`,
  };

  const prompt = `你是一位專業德文文法教師。請仔細分析這張圖片中的文法內容（可能是教科書頁面、筆記、練習題或文法說明）。

根據圖片中的文法知識，生成 ${count} 道難度為「${difficulty}」的德文練習題。

題型：${typeInstructions[type] || typeInstructions.multiple}

請以 JSON 格式回覆，格式如下：
{
  "topicDetected": "偵測到的文法主題名稱（德文）",
  "topicZh": "文法主題中文名稱",
  "questions": [ ...題目陣列... ]
}

注意：
- 題目要基於圖片中實際出現的文法概念
- 解說使用繁體中文
- 難度「easy」表示基礎用法，「medium」表示正常課本程度，「hard」表示較複雜的變化
- 只回覆 JSON，不要其他文字`;

  let result;
  if (mode === 'openai') {
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' } },
        ],
      },
    ];
    result = await callOpenAI(key, messages, 'gpt-4o');
  } else {
    const contents = [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: imageBase64
            }
          }
        ]
      }
    ];
    result = await callGemini(key, contents, 'gemini-3.5-flash');
  }

  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 回傳格式錯誤，請再試一次');
  return JSON.parse(jsonMatch[0]);
}

// Generate mixed grammar questions based on selected topics with strict A1 vocabulary/syntax constraints
export async function generateMixedGrammarQuestions(apiKeys, selectedTopics, questionCount = 5, type = 'multiple', userVocabList = []) {
  const { mode, key } = getAIModeAndKey(apiKeys);

  const typeMap = {
    multiple: '選擇題（4個選項，1個正確答案）',
    fillBlank: '填空題（提供一個句子，填入正確的形式）',
    sentence: '造句練習（給出單字，造出正確的德文句子）',
  };

  const topicListStr = selectedTopics.map(t => `${t.name} (${t.nameZh || ''})`).join(', ');

  let vocabInstruction = '';
  if (Array.isArray(userVocabList) && userVocabList.length > 0) {
    vocabInstruction = `\n【出題詞彙要求（以使用者單字本為主，不得超過 A1 範圍）】：
為了讓練習更符合使用者的真實學習內容，你必須「優先且主要」使用以下使用者單字本中的單字來設計題目（如例句、選項、問答）：
${userVocabList.slice(0, 100).join(', ')}
如果單字量不足或文法點需要其他單字配合，你可以使用其他德文單字，但所有使用的詞彙與句子結構都必須「嚴格限制在 A1 程度」，不得超過 A1 的範圍！\n`;
  } else {
    vocabInstruction = `\n【出題詞彙要求】：
請使用簡單的德文單字，且所有題目與句子的字彙、片語及語法結構必須「嚴格限制在 A1 程度」，不得超過 A1 的範圍！\n`;
  }

  const prompt = `你是一個專業的德文文法教師。請根據以下勾選的德文文法主題，生成 ${questionCount} 道練習題。

文法主題範圍：${topicListStr}
要求題型形式：${typeMap[type] || '選擇題'}
${vocabInstruction}

【出題與題型規範（極重要）】：
你生成的題目必須且只能屬於以下五大題型之一。所有題目中的德文單字、片語及句型必須嚴格限制在德語 A1 程度。

1. 題型 1：可分動詞與情態助動詞填空題 (Trennbare Verben & Modalverben)
   - 格式：一個完整的德文句子，中間挖空兩個格子（用 "______" 表示）。句尾會括號給予動詞原形。
   - JSON 範例：
     {
       "type": "fillBlank",
       "question": "______ du heute ______? (einkaufen)",
       "blanks": ["Kaufst", "ein"],
       "explanation": "文法說明（請用繁體中文）"
     }
     或：
     {
       "type": "fillBlank",
       "question": "Ich ______ heute nicht ______. (können, kommen)",
       "blanks": ["kann", "kommen"],
       "explanation": "文法說明（請用繁體中文）"
     }

2. 題型 2：祈使句/命令句改寫與填空題 (Imperativ)
   - 格式：給予情境或一般陳述句，要求填入或選擇對應的 Imperativ 形式（含 du, ihr, Sie）。
   - JSON 範例：
     {
       "type": "fillBlank",
       "question": "(du) ______ leise! (sein)",
       "blank": "Sei",
       "explanation": "文法說明（請用繁體中文）"
     }

3. 題型 3：雙介系詞與德文語格「二選一」或「填空題」 (Wechselpräpositionen: Akkusativ oder Dativ)
   - 格式：根據動詞是動態（Wohin）還是靜態（Wo），決定要填入 Akkusativ 還是 Dativ 的冠詞/介系詞。
   - JSON 範例：
     {
       "type": "fillBlank",
       "question": "Das Bild hängt an ______ Wand (f.). [提示：hängen是靜態]",
       "blank": "der",
       "explanation": "文法說明（請用繁體中文）"
     }

4. 題型 4：現在完成式造句與填空題 (Perfekt)
   - 格式：給予現在式句子或單字碎片，判斷助動詞 (haben/sein) 並填入過去分詞 (Partizip II)。可以挖空兩個格子。
   - JSON 範例：
     {
       "type": "fillBlank",
       "question": "提示：gestern / ich / nach Hause / gehen\\nIch ______ gestern nach Hause ______.",
       "blanks": ["bin", "gegangen"],
       "explanation": "文法說明（請用繁體中文）"
     }

5. 題型 5：情境問答與對話連線/填空題 (Situationen & Dialoge)
   - 格式：給予生活對話情境或問題，選擇或填入最符合邏輯的回應。
   - JSON 範例：
     {
       "type": "multiple",
       "question": "情境：在商店中，店員問：'Was möchten Sie?'。以下哪個回答最合適？",
       "options": ["Ich möchte ein Kilo Äpfel, bitte.", "Ich gehen nach Hause.", "Es tut mir leid.", "Ich bin müde."],
       "correctAnswer": 0,
       "explanation": "文法說明（請用繁體中文）"
     }

【格式調整要求】：
- 如果「要求題型形式」是「選擇題（multiple）」，請將題目改為選擇題形式，提供 4 個 options，並指出正確的 correctAnswer（索引值 0-3）。
- 如果「要求題型形式」是「填空題（fillBlank）」，請依上述挖空格式出題，單格填空使用 "blank" 欄位，雙格填空使用 "blanks" 陣列欄位。
- 如果「要求題型形式」是「造句練習（sentence）」，請將題目設定為 "type": "sentence"，提供單字碎片陣列 "words" 及正確句子 "correctAnswer"，例如考 Imperativ 或 Perfekt 的造句排順序。

只回覆 JSON，不要其他文字。`;

  let result;
  if (mode === 'openai') {
    result = await callOpenAI(key, [{ role: 'user', content: prompt }]);
  } else {
    const contents = [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];
    result = await callGemini(key, contents, 'gemini-1.5-flash');
  }

  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid AI response format');
  return JSON.parse(jsonMatch[0]);
}

// Translate a word (German <-> Chinese), find synonyms, and generate an A1 example sentence
export async function translateAndGenerate(apiKeys, text, inputLang) {
  const { mode, key } = getAIModeAndKey(apiKeys);

  const prompt = `你是一個德文學習助手。請分析使用者輸入的詞彙（德文或中文），並提供翻譯、詞性、名詞冠詞（如果是德文名詞）以及自動生成的德文例句。

使用者輸入：${text}
輸入語言類型：${inputLang === 'de' ? '德文' : '中文'}

請遵循以下出題規範：
1. 【單字與句型限制】：例句中所使用的德文單字及句型結構，必須「嚴格限制在 A1 程度」以內。
2. 【同義字與多重翻譯】：提供 2-4 個常見的對應翻譯或同義詞選項。每個選項中必須包含：德文單字（不含冠詞）、中文翻譯、詞性（noun/verb/adjective/adverb/other）、名詞冠詞（der/die/das，若非名詞則留空）。
3. 【自動生成例句】：為該單字自動生成一個適合 A1 程度的簡單德文例句，並在例句後附上中文對照翻譯（例如：Das Haus ist groß. 房子很大。）。例句中所使用的德文單字要與翻譯選項契合。

請以 JSON 格式回覆，格式如下：
{
  "options": [
    {
      "german": "德文單字",
      "chinese": "中文翻譯",
      "partOfSpeech": "noun/verb/adjective/adverb/other",
      "article": "der/die/das（如果不是名詞則為空字串）"
    }
  ],
  "example": "德文例句（附帶中文對照翻譯）"
}
只回覆 JSON，不要其他文字。`;

  let result;
  if (mode === 'openai') {
    result = await callOpenAI(key, [{ role: 'user', content: prompt }]);
  } else {
    const contents = [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];
    result = await callGemini(key, contents, 'gemini-1.5-flash');
  }

  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 翻譯失敗，請再試一次');
  return JSON.parse(jsonMatch[0]);
}
