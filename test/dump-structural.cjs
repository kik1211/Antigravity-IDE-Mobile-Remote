const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const os = require('os');
const fs = require('fs');

const dbPath = path.join(os.homedir(), '.gemini/antigravity-ide/conversations/8549a14c-842f-4b79-95e0-44203bdb30bd.db');
const db = new DatabaseSync(dbPath);

function readVarint(buf, offset) {
    let result = 0n;
    let shift = 0n;
    let bytesRead = 0;
    while (offset + bytesRead < buf.length) {
        let b = BigInt(buf[offset + bytesRead]);
        bytesRead++;
        result |= (b & 0x7fn) << shift;
        if ((b & 0x80n) === 0n) break;
        shift += 7n;
    }
    return { value: Number(result), bytesRead };
}

function parseProtobufTree(buf) {
    let offset = 0;
    const fields = {};
    while (offset < buf.length) {
        const tagWire = readVarint(buf, offset);
        if (tagWire.bytesRead === 0) break;
        offset += tagWire.bytesRead;
        const wireType = tagWire.value & 0x7;
        const fieldNum = tagWire.value >> 3;
        if (!fields[fieldNum]) fields[fieldNum] = [];

        if (wireType === 0) {
            const v = readVarint(buf, offset);
            fields[fieldNum].push({ type: 'varint', value: v.value });
            offset += v.bytesRead;
        } else if (wireType === 1) {
            offset += 8;
            fields[fieldNum].push({ type: '64bit' });
        } else if (wireType === 2) {
            const len = readVarint(buf, offset);
            offset += len.bytesRead;
            const data = buf.slice(offset, offset + len.value);
            const node = { type: 'len', data: data };
            try {
                if (data.length > 0) {
                    node.nested = parseProtobufTree(data);
                }
            } catch (e) {}
            fields[fieldNum].push(node);
            offset += len.value;
        } else if (wireType === 5) {
            offset += 4;
            fields[fieldNum].push({ type: '32bit' });
        } else {
            break;
        }
    }
    return fields;
}

function dumpFields(node, prefix = '') {
    if (!node) return;
    for (const [k, arr] of Object.entries(node)) {
        for (const item of arr) {
            if (item.type === 'varint') {
                console.log(prefix + k + ' (varint): ' + item.value);
            } else if (item.type === 'len') {
                let isString = true;
                let str = '';
                for (let i=0; i<item.data.length; i++) {
                    if (item.data[i] < 32 && item.data[i] !== 10 && item.data[i] !== 13) {
                        isString = false;
                        break;
                    }
                }
                if (isString) str = item.data.toString('utf8');
                
                if (item.data.length === 16) {
                    // might be UUID
                    const hex = item.data.toString('hex');
                    console.log(prefix + k + ' (UUID?): ' + hex);
                } else if (isString && str.length > 0) {
                    console.log(prefix + k + ' (string): ' + str.substring(0, 50).replace(/\n/g, ' '));
                } else {
                    console.log(prefix + k + ' (bytes len ' + item.data.length + ')');
                }
                if (item.nested) {
                    dumpFields(item.nested, prefix + '  ' + k + '->');
                }
            }
        }
    }
}

const rows = db.prepare('SELECT idx, step_type, step_payload, metadata FROM steps WHERE step_type IN (14, 15) ORDER BY idx ASC').all();

console.log('--- EXAMINING BAD EVENTS ---');
for (const row of rows) {
    if (!row.step_payload) continue;
    const str = Buffer.from(row.step_payload).toString('utf8');
    if (str.includes('Prioritizing Specific Tools') || str.includes('Refining Tool Usage') || str.includes('Updating Metadata Retrieval')) {
        console.log('\n=== BAD EVENT IDX:', row.idx, 'STEP_TYPE:', row.step_type, '===');
        if (row.metadata) {
            console.log('METADATA:');
            dumpFields(parseProtobufTree(Buffer.from(row.metadata)));
        }
        console.log('PAYLOAD:');
        dumpFields(parseProtobufTree(Buffer.from(row.step_payload)));
    }
}

console.log('\n\n--- EXAMINING GOOD EVENTS ---');
let goodCount = 0;
for (const row of rows) {
    if (!row.step_payload) continue;
    const str = Buffer.from(row.step_payload).toString('utf8');
    if (row.step_type === 15 && str.includes('I have completed the implementation of the Protobuf semantic conversation decoder')) {
        console.log('\n=== GOOD EVENT IDX:', row.idx, 'STEP_TYPE:', row.step_type, '===');
        if (row.metadata) {
            console.log('METADATA:');
            dumpFields(parseProtobufTree(Buffer.from(row.metadata)));
        }
        console.log('PAYLOAD:');
        dumpFields(parseProtobufTree(Buffer.from(row.step_payload)));
        goodCount++;
        if (goodCount >= 2) break;
    }
}

db.close();
