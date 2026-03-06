const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// CONFIGURATION
const EXTENSION_TO_CALL = '100';
const TEMP_FILE = path.join(__dirname, 'outbound_test.call');
const ASTERISK_SPOOL_DIR = '/var/spool/asterisk/outgoing/';

/**
 * CHANGE: We use PJSIP/100/100 or PJSIP/100
 * If PJSIP/100 fails, Asterisk is struggling to resolve the contact.
 * We will try the most compatible outbound string here.
 */
const callFileContent = `Channel: PJSIP/${EXTENSION_TO_CALL}
MaxRetries: 0
RetryTime: 60
WaitTime: 30
Context: outbound-playback
Extension: s
Priority: 1
`;

async function initiateCall() {
    console.log(`📞 Attempting to trigger call to ${EXTENSION_TO_CALL}...`);

    try {
        const tempSpool = '/var/spool/asterisk/tmp/outbound_test.call';
        const finalSpool = path.join(ASTERISK_SPOOL_DIR, 'outbound_test.call');

        // 1. Write to temp dir
        fs.writeFileSync(tempSpool, callFileContent);

        // 2. Open permissions
        fs.chmodSync(tempSpool, 0o666);

        // 3. Move to spool
        fs.renameSync(tempSpool, finalSpool);

        console.log("🚀 Call file placed.");
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

initiateCall();