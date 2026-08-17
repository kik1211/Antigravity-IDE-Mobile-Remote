export function reconstructConversation(rawMessages) {
    const logicalMessages = [];
    let currentAssistantTurn = null;

    function finalizeAssistantTurn() {
        if (!currentAssistantTurn) return;
        
        // Concatenate all text nodes in chronological order
        const parts = [];
        for (const nodeId of currentAssistantTurn.orderedNodeIds) {
            const text = currentAssistantTurn.textNodes.get(nodeId);
            if (text && text.trim().length > 0) {
                parts.push(text);
            }
        }
        
        const finalContent = parts.join('\n\n');

        // Only push if there's actual visible content or tools/events
        if (finalContent || currentAssistantTurn.events.length > 0) {
            logicalMessages.push({
                id: currentAssistantTurn.id,
                role: currentAssistantTurn.role,
                type: currentAssistantTurn.type,
                content: finalContent,
                timestamp: currentAssistantTurn.timestamp,
                metadata: currentAssistantTurn.metadata,
                events: currentAssistantTurn.events
            });
        }
        
        currentAssistantTurn = null;
    }

    for (const msg of rawMessages) {
        if (msg.classification === 'VISIBLE_USER') {
            if (currentAssistantTurn) {
                finalizeAssistantTurn();
            }
            
            // User messages are preserved as 1:1 top-level turns
            logicalMessages.push({
                id: msg.id,
                role: 'user',
                type: 'message',
                content: msg.content,
                timestamp: msg.timestamp,
                metadata: msg.metadata || {}
            });
        } else if (['VISIBLE_ASSISTANT', 'TOOL_CALL', 'TOOL_RESULT', 'INTERNAL_REASONING'].includes(msg.classification)) {
            if (!currentAssistantTurn) {
                currentAssistantTurn = {
                    id: msg.id,
                    role: 'assistant',
                    type: 'message',
                    timestamp: msg.timestamp,
                    textNodes: new Map(), // nodeId -> content
                    orderedNodeIds: [],   // keeps chronological order of distinct nodes
                    events: [],           // groups tool calls/results and reasoning
                    metadata: {}
                };
            }

            if (msg.classification === 'VISIBLE_ASSISTANT') {
                const nodeId = msg.nodeId || ('mock_' + msg.id);
                if (!currentAssistantTurn.textNodes.has(nodeId)) {
                    currentAssistantTurn.orderedNodeIds.push(nodeId);
                }
                // Replace earlier streaming state of the same node with the latest content
                currentAssistantTurn.textNodes.set(nodeId, msg.content);
                
                // If it also had internalContent embedded by decoder
                if (msg.metadata && msg.metadata.internalContent) {
                    currentAssistantTurn.events.push({
                        type: 'internal_reasoning',
                        id: msg.id,
                        content: msg.metadata.internalContent,
                        metadata: {}
                    });
                }
            } else if (msg.classification === 'INTERNAL_REASONING') {
                currentAssistantTurn.events.push({
                    type: 'internal_reasoning',
                    id: msg.id,
                    content: msg.content,
                    metadata: msg.metadata || {}
                });
            } else if (msg.classification === 'TOOL_CALL' || msg.classification === 'TOOL_RESULT') {
                currentAssistantTurn.events.push({
                    type: msg.classification.toLowerCase(),
                    id: msg.id,
                    content: msg.content,
                    metadata: msg.metadata || {}
                });
            }
        }
    }

    if (currentAssistantTurn) {
        finalizeAssistantTurn();
    }

    return logicalMessages;
}
