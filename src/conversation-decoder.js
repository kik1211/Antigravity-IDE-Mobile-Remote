import { DatabaseSync } from 'node:sqlite';

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
        
        if (!fields[fieldNum]) {
            fields[fieldNum] = [];
        }

        if (wireType === 0) { // Varint
            const v = readVarint(buf, offset);
            fields[fieldNum].push({ type: 'varint', value: v.value });
            offset += v.bytesRead;
        } else if (wireType === 1) { // 64-bit
            offset += 8;
            fields[fieldNum].push({ type: '64bit' });
        } else if (wireType === 2) { // Length-delimited
            const len = readVarint(buf, offset);
            offset += len.bytesRead;
            const data = buf.slice(offset, offset + len.value);
            
            const node = { type: 'len', data: data };
            // Try recursive parse
            try {
                if (data.length > 0) {
                    node.nested = parseProtobufTree(data);
                }
            } catch (e) {}
            
            fields[fieldNum].push(node);
            offset += len.value;
        } else if (wireType === 5) { // 32-bit
            offset += 4;
            fields[fieldNum].push({ type: '32bit' });
        } else {
            // Unknown, break parsing
            break;
        }
    }
    return fields;
}

function findLongestString(node) {
    if (!node) return '';
    let longest = '';
    
    // Check current node data
    if (node.data) {
        const str = node.data.toString('utf8');
        // Check if string has invalid UTF-8 (replacement char) or excessive control chars
        const hasInvalidUtf8 = str.includes('\uFFFD');
        let controlChars = 0;
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
                controlChars++;
            }
        }
        
        // If it's a clean string (no invalid UTF-8 and no weird control chars)
        if (!hasInvalidUtf8 && controlChars === 0 && str.length > longest.length) {
            longest = str;
        } else if (!hasInvalidUtf8 && controlChars < 5 && str.length > longest.length && str.length > 50) {
            // Relaxed for long text with occasional control chars
            longest = str;
        }
    }
    
    // Check nested
    if (node.nested) {
        for (const [fnum, arr] of Object.entries(node.nested)) {
            for (const child of arr) {
                const childStr = findLongestString(child);
                if (childStr.length > longest.length) {
                    longest = childStr;
                }
            }
        }
    }
    
    return longest;
}

function decodeToolPayload(dataBuf) {
    if (!dataBuf) return null;
    const str = dataBuf.toString('utf8');
    let toolId = '';
    let toolName = '';
    let args = null;
    
    try {
        const parts = str.split('\x12');
        if (parts.length > 1) {
            toolId = parts[0].replace(/^\n#?/, '').trim();
            const subParts = parts[1].split('\x1a');
            if (subParts.length > 1) {
                // Extract tool name, removing any non-printable prefix
                toolName = subParts[0].replace(/^[\x00-\x1F]+/, '').trim();
                
                // Extract JSON by finding the outermost braces
                let jsonStr = subParts[1];
                const firstBrace = jsonStr.indexOf('{');
                const lastBrace = jsonStr.lastIndexOf('}');
                
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
                    try {
                        args = JSON.parse(jsonStr);
                    } catch (e) {
                        args = jsonStr;
                    }
                } else {
                    args = jsonStr.replace(/[\x00-\x1F]+$/, '').trim();
                }
            }
        }
    } catch(e) {}
    
    return { toolId, toolName, args, rawString: str };
}

function extractStringAtPath(node, path) {
    if (!node || path.length === 0) {
        if (node && node.data) {
            return node.data.toString('utf8');
        }
        return null;
    }
    const [head, ...tail] = path;
    if (node.nested && node.nested[head] && node.nested[head].length > 0) {
        return extractStringAtPath(node.nested[head][0], tail);
    }
    return null;
}

export function decodeDb(dbPath) {
    const db = new DatabaseSync(dbPath);
    const rows = db.prepare('SELECT idx, step_type, step_payload, metadata as raw_metadata FROM steps ORDER BY idx ASC').all();
    db.close();

    const messages = [];

    for (const row of rows) {
        if (!row.step_payload) continue;

        let role = 'unknown';
        let msgType = 'message';
        let classification = 'UNKNOWN';
        let content = '';
        let metadata = {};
        let nodeId = null;

        if (row.raw_metadata) {
            try {
                const metaRoot = parseProtobufTree(Buffer.from(row.raw_metadata));
                if (metaRoot[1] && metaRoot[1][0] && metaRoot[1][0].type === 'len') {
                    nodeId = metaRoot[1][0].data.toString('hex');
                }
            } catch(e) {}
        }

        const buf = Buffer.from(row.step_payload);
        const root = parseProtobufTree(buf);
        const rootNode = { nested: root };

        if (row.step_type === 14) {
            role = 'user';
            classification = 'VISIBLE_USER';
            // User message paths: 19 -> 2, or 19 -> 3 -> 1
            const str1 = extractStringAtPath(rootNode, [19, 2]);
            const str2 = extractStringAtPath(rootNode, [19, 3, 1]);
            content = str1 || str2;
            
            if (!content) {
                continue;
            }
        } else if (row.step_type === 15) {
            role = 'assistant';
            const visibleText = extractStringAtPath(rootNode, [20, 1]);
            const internalText = extractStringAtPath(rootNode, [20, 3]);
            
            if (visibleText && internalText) {
                classification = 'VISIBLE_ASSISTANT';
                content = visibleText;
                metadata.internalContent = internalText;
            } else if (visibleText) {
                classification = 'VISIBLE_ASSISTANT';
                content = visibleText;
            } else if (internalText) {
                classification = 'INTERNAL_REASONING';
                content = internalText;
            } else {
                continue;
            }
        } else if (row.step_type === 8) {
            role = 'tool';
            msgType = 'tool_call';
            classification = 'TOOL_CALL';
            const f5_4 = extractStringAtPath(rootNode, [5, 4]);
            if (f5_4) {
                const toolObj = decodeToolPayload(Buffer.from(f5_4, 'utf8'));
                if (toolObj) {
                    metadata.toolId = toolObj.toolId;
                    metadata.toolName = toolObj.toolName;
                    if (typeof toolObj.args === 'object') {
                        content = JSON.stringify(toolObj.args, null, 2);
                    } else {
                        content = toolObj.args || '';
                    }
                }
            }
        } else if (row.step_type === 9) {
            role = 'tool';
            msgType = 'tool_result';
            classification = 'TOOL_RESULT';
            const f5_4 = extractStringAtPath(rootNode, [5, 4]);
            if (f5_4) {
                const toolObj = decodeToolPayload(Buffer.from(f5_4, 'utf8'));
                if (toolObj) {
                    metadata.toolId = toolObj.toolId;
                    metadata.toolName = toolObj.toolName;
                    if (typeof toolObj.args === 'object') {
                        content = JSON.stringify(toolObj.args, null, 2);
                    } else {
                        content = toolObj.args || '';
                    }
                }
            }
        } else {
            continue;
        }

        // Only push if we actually decoded something meaningful or if it's a known role
        if (content || msgType !== 'message') {
            messages.push({
                id: row.idx.toString(),
                nodeId: nodeId,
                role,
                type: msgType,
                classification,
                content: content || '',
                timestamp: new Date().toISOString(), // Mock timestamp since SQLite lacks it
                metadata
            });
        } else {
            // If we couldn't decode, push a diagnostic object
            messages.push({
                decodeError: true,
                stepIndex: row.idx,
                stepType: row.step_type,
                reason: "Could not find text at expected fields",
                diagnosticFields: Object.keys(root)
            });
        }
    }

    return messages;
}
