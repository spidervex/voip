require('dotenv').config();
const ari = require('ari-client');
const { OpenAI } = require('openai');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const AUDIO_DIR = path.join(__dirname, 'audio');

const conversationHistory = [
    { role: 'system', content: 'You are a helpful, concise AI voice assistant over a phone line. Keep your answers brief and spoken-word friendly.' }
];

function convertAudio(inputMp3, outputWav) {
    return new Promise((resolve, reject) => {
        exec(`ffmpeg -y -i ${inputMp3} -ar 8000 -ac 1 -c:a pcm_s16le ${outputWav}`, (error) => {
            if (error) reject(error);
            else resolve(outputWav);
        });
    });
}

ari.connect('http://127.0.0.1:8088', 'ai_user', 'ai_secret_pass', (err, client) => {
    if (err) throw err;
    console.log('✅ Connected to Asterisk ARI');

    client.on('StasisStart', async (event, channel) => {
        console.log(`📞 Call answered on channel ${channel.id}`);
        await channel.answer();
        promptUser(channel);
    });

    async function promptUser(channel) {
        console.log('🎙️ Recording user...');

        const liveRecording = client.LiveRecording();

        try {
            // We initiate the record, but we don't need to specify a path here
            // because we will pull the real path from the object Asterisk creates.
            await channel.record({
                format: 'wav',
                maxSilenceSeconds: 2,
                beep: true,
                ifExists: 'overwrite'
            }, liveRecording);
        } catch (err) {
            console.error("Failed to start recording:", err);
            return;
        }

        liveRecording.on('RecordingFinished', async (event) => {
            console.log(`🛑 Recording state: ${event.recording.state}.`);

            // Asterisk tells us the name it chose in event.recording.name
            const realName = event.recording.name;
            const recordPathWav = `/var/spool/asterisk/recording/${realName}.wav`;

            await new Promise(resolve => setTimeout(resolve, 300));

            try {
                if (!fs.existsSync(recordPathWav)) {
                    console.error(`❌ Still can't find: ${recordPathWav}`);
                    return promptUser(channel);
                }

                // --- 1. STT: Whisper ---
                const transcription = await openai.audio.transcriptions.create({
                    file: fs.createReadStream(recordPathWav),
                    model: 'whisper-1',
                });

                const userText = transcription.text;
                console.log(`👤 User said: ${userText}`);

                if (!userText || userText.trim().length < 2) {
                    return promptUser(channel);
                }

                // --- 2. LLM: Generate Response ---
                conversationHistory.push({ role: 'user', content: userText });
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: conversationHistory,
                });
                const aiResponseText = completion.choices[0].message.content;
                console.log(`🤖 AI says: ${aiResponseText}`);
                conversationHistory.push({ role: 'assistant', content: aiResponseText });

                // --- 3. TTS: Generate Audio ---
                const mp3Response = await openai.audio.speech.create({
                    model: 'tts-1',
                    voice: 'alloy',
                    input: aiResponseText,
                });

                const mp3Path = path.join(AUDIO_DIR, `ai_output_${channel.id.replace(/\./g, '_')}.mp3`);
                const wavPath = path.join(AUDIO_DIR, `ai_output_${channel.id.replace(/\./g, '_')}.wav`);

                const buffer = Buffer.from(await mp3Response.arrayBuffer());
                await fs.promises.writeFile(mp3Path, buffer);
                await convertAudio(mp3Path, wavPath);

                // --- 4. Playback ---
                const playback = client.Playback();
                const asteriskPlayPath = wavPath.replace('.wav', '');

                await channel.play({ media: `sound:${asteriskPlayPath}` }, playback);

                playback.on('PlaybackFinished', () => {
                    // Clean up the recording file to keep your VPS SSD clean
                    if (fs.existsSync(recordPathWav)) fs.unlinkSync(recordPathWav);
                    promptUser(channel);
                });

            } catch (error) {
                console.error("Error in AI pipeline:", error);
                promptUser(channel);
            }
        });
    }

    client.start('ai-assistant');
});