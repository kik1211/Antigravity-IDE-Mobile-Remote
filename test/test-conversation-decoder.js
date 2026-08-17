import { decodeDb } from '../src/conversation-decoder.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function run() {
    const baseDir = path.join(os.homedir(), '.gemini', 'antigravity-ide', 'conversations');
    const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.db'));
    files.sort((a, b) => fs.statSync(path.join(baseDir, b)).mtimeMs - fs.statSync(path.join(baseDir, a)).mtimeMs);
    const dbPath = path.join(baseDir, files[0]);
    const uuid = files[0].replace('.db', '');
    
    console.log(`ACTIVE CONVERSATION:\n${uuid}\n`);
    console.log(`DATABASE:\n${dbPath}\n`);

    const messages = decodeDb(dbPath);
    console.log(`TOTAL DECODED STEPS:\n${messages.length}\n`);

    const userMsgs = messages.filter(m => m.role === 'user');
    const asstMsgs = messages.filter(m => m.role === 'assistant');
    const toolCalls = messages.filter(m => m.type === 'tool_call');
    const toolResults = messages.filter(m => m.type === 'tool_result');
    const errors = messages.filter(m => m.decodeError);

    console.log(`DECODED USER:\n${userMsgs.length}`);
    console.log(`DECODED ASSISTANT:\n${asstMsgs.length}`);
    console.log(`DECODED TOOL CALL:\n${toolCalls.length}`);
    console.log(`DECODED TOOL RESULT:\n${toolResults.length}`);
    console.log(`DECODE ERRORS:\n${errors.length}\n`);

    if (userMsgs.length > 0) {
        console.log(`FIRST USER MESSAGE:\n${userMsgs[0].content}\n`);
        if (userMsgs.length > 1) {
            console.log(`MIDDLE USER MESSAGE:\n${userMsgs[Math.floor(userMsgs.length / 2)].content}\n`);
        }
        console.log(`LATEST USER MESSAGE:\n${userMsgs[userMsgs.length - 1].content}\n`);
    }

    if (asstMsgs.length > 0) {
        console.log(`FIRST ASSISTANT MESSAGE:\n${asstMsgs[0].content.substring(0, 500)}...\n`);
        if (asstMsgs.length > 1) {
            console.log(`MIDDLE ASSISTANT MESSAGE:\n${asstMsgs[Math.floor(asstMsgs.length / 2)].content.substring(0, 500)}...\n`);
        }
        console.log(`LATEST ASSISTANT MESSAGE:\n${asstMsgs[asstMsgs.length - 1].content.substring(0, 500)}...\n`);
    }

    if (toolCalls.length > 0) {
        console.log(`SAMPLE TOOL CALL:\n${JSON.stringify(toolCalls[0], null, 2)}\n`);
    }

    if (toolResults.length > 0) {
        console.log(`SAMPLE TOOL RESULT:\n${JSON.stringify(toolResults[0], null, 2)}\n`);
    }

    if (errors.length > 0) {
        console.log(`SAMPLE DECODE ERROR:\n${JSON.stringify(errors[0], null, 2)}\n`);
    }
}

run().catch(console.error);
