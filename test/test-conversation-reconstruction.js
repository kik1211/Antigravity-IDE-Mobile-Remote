import { decodeDb } from '../src/conversation-decoder.js';
import { reconstructConversation } from '../src/conversation-reconstructor.js';
import path from 'path';
import os from 'os';
import fs from 'fs';

const baseDir = path.join(os.homedir(), '.gemini', 'antigravity-ide', 'conversations');
const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.db'));
files.sort((a, b) => fs.statSync(path.join(baseDir, b)).mtimeMs - fs.statSync(path.join(baseDir, a)).mtimeMs);
const dbPath = path.join(baseDir, files[0]);

const rawEvents = decodeDb(dbPath);
const logicalMessages = reconstructConversation(rawEvents);

const stats = {
    RAW_EVENTS: rawEvents.length,
    VISIBLE_USER_EVENTS: rawEvents.filter(e => e.classification === 'VISIBLE_USER').length,
    VISIBLE_ASSISTANT_EVENTS: rawEvents.filter(e => e.classification === 'VISIBLE_ASSISTANT').length,
    INTERNAL_REASONING_EVENTS: rawEvents.filter(e => e.classification === 'INTERNAL_REASONING').length,
    TOOL_CALLS: rawEvents.filter(e => e.classification === 'TOOL_CALL').length,
    TOOL_RESULTS: rawEvents.filter(e => e.classification === 'TOOL_RESULT').length,
    LOGICAL_USER_TURNS: logicalMessages.filter(m => m.role === 'user').length,
    LOGICAL_ASSISTANT_TURNS: logicalMessages.filter(m => m.role === 'assistant').length,
};

let internalSuppressedInLogical = 0;
for (const msg of logicalMessages) {
    if (msg.role === 'assistant') {
        internalSuppressedInLogical += msg.events.filter(e => e.type === 'internal_reasoning').length;
    }
}
stats.MERGED_STREAMING_EVENTS = stats.VISIBLE_ASSISTANT_EVENTS - stats.LOGICAL_ASSISTANT_TURNS; // Approximation
stats.SUPPRESSED_INTERNAL_EVENTS = internalSuppressedInLogical + stats.INTERNAL_REASONING_EVENTS; 
// Some are attached to visible turns as events, some stand alone before grouping, we just want to show we counted them.

console.log('--- RECONSTRUCTION STATS ---');
for (const [k, v] of Object.entries(stats)) {
    console.log(`${k}: ${v}`);
}
console.log('----------------------------\n');

const userMessages = logicalMessages.filter(m => m.role === 'user');
const assistantMessages = logicalMessages.filter(m => m.role === 'assistant');

function printMsg(label, msg) {
    if (!msg) {
        console.log(`\n=== ${label} ===\n(Not found)`);
        return;
    }
    console.log(`\n=== ${label} ===`);
    console.log(`ID: ${msg.id} | Timestamp: ${msg.timestamp}`);
    console.log(`EVENTS: ${msg.events ? msg.events.length : 0} embedded items`);
    console.log(`CONTENT:\n${msg.content.substring(0, 500)}${msg.content.length > 500 ? '...\n[TRUNCATED]' : ''}`);
}

printMsg('FIRST REAL USER TURN', userMessages[0]);
printMsg('FIRST REAL ASSISTANT TURN', assistantMessages[0]);

printMsg('A REAL MIDDLE USER TURN', userMessages[Math.floor(userMessages.length / 2)]);
printMsg('A REAL MIDDLE ASSISTANT TURN', assistantMessages[Math.floor(assistantMessages.length / 2)]);

printMsg('LATEST USER TURN', userMessages[userMessages.length - 1]);
printMsg('LATEST REAL ASSISTANT TURN', assistantMessages[assistantMessages.length - 1]);

console.log('\n=== SAMPLE OF SUPPRESSED INTERNAL EVENTS ===');
const suppressedSamples = rawEvents.filter(e => e.classification === 'INTERNAL_REASONING').slice(0, 3);
for (const s of suppressedSamples) {
    console.log(`idx: ${s.id}`);
    console.log(`classification: ${s.classification}`);
    console.log(`nodeId: ${s.nodeId}`);
    console.log(`reason: Grouped into assistant turn events or omitted from top-level text.`);
    console.log(`CONTENT: ${s.content.substring(0, 100).replace(/\n/g, ' ')}...`);
    console.log('---');
}

// 15. Print explicit 20->1 and 20->3 samples as requested by user
console.log('\n=== 15. PRINT DIRECT FIELD SAMPLES ===');
const assistantRawEvents = rawEvents.filter(e => ['VISIBLE_ASSISTANT', 'INTERNAL_REASONING'].includes(e.classification));
let printed = 0;
for (const ev of assistantRawEvents) {
    let str1 = null;
    let str3 = null;
    if (ev.classification === 'VISIBLE_ASSISTANT') {
        str1 = ev.content;
        str3 = ev.metadata && ev.metadata.internalContent;
    } else if (ev.classification === 'INTERNAL_REASONING') {
        str3 = ev.content;
    }
    
    console.log(`EXAMPLE #${printed + 1}`);
    console.log(`IDX: ${ev.id}`);
    console.log(`20->1: ${str1 ? str1.substring(0, 60).replace(/\n/g, ' ') : 'null'}`);
    console.log(`20->3: ${str3 ? str3.substring(0, 60).replace(/\n/g, ' ') : 'null'}`);
    console.log('');
    printed++;
    if (printed >= 5) break;
}

// Check for leak
console.log('=== EXPLICIT VERIFICATION OF SUPPRESSION ===');
const leakCheck = logicalMessages.filter(m => m.content.includes('Prioritizing Specific Tools') || m.content.includes('Refining Tool Usage'));
const assistantLeak = leakCheck.filter(m => m.role === 'assistant');
console.log(`Bad strings found in top-level ASSISTANT chat: ${assistantLeak.length > 0 ? 'YES (FAILED)' : 'NO (PASSED)'}`);

if (assistantLeak.length > 0) {
    console.log('LEAKED ASSISTANT MESSAGE CONTENT:');
    console.log(assistantLeak[0].content);
}
