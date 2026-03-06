require('dotenv').config();
const { OpenAI } = require('openai');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const AUDIO_DIR = path.join('/data/', 'audio');

// The text you want the AI to say
const testText = "Hello! This is a test of the Asterisk AI voice system. If you can hear this, your audio pipeline is working perfectly.";

async function generateTestAudio() {
    console.log("🚀 Generating TTS from OpenAI...");

    try {
        const mp3Response = await openai.audio.speech.create({
            model: 'tts-1',
            voice: 'alloy',
            input: testText,
        });

        const mp3Path = path.join(AUDIO_DIR, 'test_speech.mp3');
        const wavPath = path.join(AUDIO_DIR, 'test_speech.wav');

        const buffer = Buffer.from(await mp3Response.arrayBuffer());
        await fs.promises.writeFile(mp3Path, buffer);

        console.log("🔄 Converting to Asterisk 8kHz Mono WAV...");
        exec(`ffmpeg -y -i ${mp3Path} -ar 8000 -ac 1 -c:a pcm_s16le ${wavPath}`, (error) => {
            if (error) {
                console.error("FFmpeg Error:", error);
            } else {
                console.log(`✅ Success! File created at: ${wavPath}`);
                console.log("You can now call extension 300 to hear it.");
            }
        });
    } catch (err) {
        console.error("Error:", err);
    }
}

generateTestAudio();