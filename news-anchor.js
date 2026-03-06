require('dotenv').config();
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');

// 1. Setup OpenAI (For the Voice)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// 2. Setup Perplexity (For the Brains and Web Search)
// We use the OpenAI library but point it at Perplexity's servers
const perplexity = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: 'https://api.perplexity.ai'
});

// Paths & Config
const AUDIO_DIR = '/data/audio';
const MP3_PATH = path.join(AUDIO_DIR, 'daily_news.mp3');
const WAV_PATH = path.join(AUDIO_DIR, 'daily_news.wav');
const TEMP_CALL_FILE = path.join(__dirname, 'news.call');
const ASTERISK_SPOOL_DIR = '/var/spool/asterisk/outgoing/';
const EXTENSION_TO_CALL = '100';

// Define your "For You" interests here
const MY_INTERESTS = "Artificial Intelligence";

function convertAudio(inputMp3, outputWav) {
    return new Promise((resolve, reject) => {
        exec(`ffmpeg -y -i ${inputMp3} -ar 8000 -ac 1 -c:a pcm_s16le ${outputWav}`, (error) => {
            if (error) reject(error);
            else resolve(outputWav);
        });
    });
}

async function runNewsAnchor() {
    console.log("📰 Asking Perplexity to research today's news...");

    try {
        // --- STEP 1: Get the News from Perplexity ---
        // Dynamically grab today's date in YYYY-MM-DD format
        const todayIsoDate = new Date().toISOString().split('T')[0];

        const searchResponse = await perplexity.chat.completions.create({
            model: 'sonar-pro-latest', // Upgraded to the latest Pro model
            messages: [
                {
                    role: 'system',
                    content: `You are a seasoned morning news anchor for a major network.
Your job is to deliver a clear, engaging daily news brief that sounds like spoken broadcast copy, not a chat response.
Style rules:
Tone: calm, neutral, and professional, with light, natural transitions between segments.
Pacing: write as if the segment will be read aloud in about 3–5 minutes.
Structure: open with a 1–2 sentence overview, then cover sections in this order:
World news
National news (for the listener’s country)
Business and markets
Technology and AI
Weather snapshot (very brief, high level)
Format with short paragraphs and bullet points, no markdown headings, no emojis, no asides about being an AI.
Prioritize developments from roughly the last 24 hours, and avoid speculation.
If a story is uncertain or developing, clearly say so.`
                },
                {
                    role: 'user',
                    content: `Today is ${todayIsoDate}.
Create a morning news brief as described in the system instructions for a listener in Calgary, Alberta, Canada.
Time window: focus on events and coverage from the last 24 hours, but include overnight updates if relevant.
Level: informed general audience, not specialists.
Length: target about 700–1,000 words of spoken copy.
End with a one-sentence sign-off suitable for morning TV or radio.`
                }
            ],
        });

        const newsScript = searchResponse.choices[0].message.content;
        console.log(`\n📝 Script generated:\n${newsScript}\n`);

        // --- STEP 2: Convert Text to Speech with OpenAI ---
        console.log("🎙️ Generating TTS audio with OpenAI 'Onyx' voice...");
        const mp3Response = await openai.audio.speech.create({
            model: 'tts-1',
            voice: 'onyx',
            input: newsScript,
        });

        const buffer = Buffer.from(await mp3Response.arrayBuffer());
        await fs.promises.writeFile(MP3_PATH, buffer);

        // --- STEP 3: Convert for Asterisk ---
        console.log("🔄 Converting to Asterisk WAV format...");
        await convertAudio(MP3_PATH, WAV_PATH);

        // --- STEP 4: Call the Phone ---
        console.log("📞 Initiating call to your handset...");
        const callFileContent = `Channel: PJSIP/${EXTENSION_TO_CALL}
MaxRetries: 1
RetryTime: 60
WaitTime: 30
Context: daily-news
Extension: s
Priority: 1
`;

        // 1. Write to the Asterisk temp directory
        fs.writeFileSync(TEMP_CALL_FILE, callFileContent);

        // 2. Give the file open permissions so Asterisk can modify it
        fs.chmodSync(TEMP_CALL_FILE, 0o666);

        // 3. Atomically move it to outgoing to trigger the call
        fs.renameSync(TEMP_CALL_FILE, FINAL_CALL_FILE);

        console.log("✅ Custom Perplexity News Anchor is live!");

    } catch (error) {
        console.error("❌ Error in News Anchor pipeline:", error);
    }
}

runNewsAnchor();