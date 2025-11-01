/**
 * 🔄 SSE Mask Transform Stream
 * 
 * Transform stream that masks PII in SSE "data:" payloads while preserving
 * SSE event framing (\n\n boundaries).
 * 
 * CRITICAL: SSE format must be preserved:
 * - Events: "data: {...}\n\n"
 * - Masking must only affect JSON payload, not framing
 * - Event boundaries (\n\n) must remain intact
 * 
 * @module sse_mask_transform
 */

import { Transform } from 'stream';

/**
 * Creates a Transform stream that masks PII in SSE data payloads
 * 
 * This stream:
 * 1. Buffers incoming chunks until complete SSE events are formed
 * 2. Extracts JSON payload from "data: {...}" lines
 * 3. Applies masker function to JSON content (not framing)
 * 4. Preserves SSE event boundaries (\n\n)
 * 
 * @param masker Function that masks PII in a string
 * @returns Transform stream that masks SSE payloads
 * 
 * @example
 * ```typescript
 * import { maskPII } from './pii';
 * 
 * const masker = (text: string) => maskPII(text, 'last4').masked;
 * const transform = createSSEMaskTransform(masker);
 * 
 * // Pipe OpenAI stream through transform
 * openaiStream.pipe(transform).pipe(response);
 * ```
 */
export function createSSEMaskTransform(
  masker: (text: string) => string
): Transform {
  let buffer = '';

  return new Transform({
    objectMode: false,
    encoding: 'utf8',
    
    transform(chunk: Buffer, encoding: BufferEncoding, callback: Function) {
      // Append chunk to buffer
      buffer += chunk.toString('utf8');

      // Process complete SSE events (ending with \n\n)
      let lastIndex = 0;
      let eventEnd = buffer.indexOf('\n\n', lastIndex);

      while (eventEnd !== -1) {
        // Extract complete event
        const event = buffer.slice(lastIndex, eventEnd + 2); // Include \n\n
        
        // Check if this is a "data:" event
        if (event.startsWith('data: ')) {
          // Extract JSON payload (everything after "data: ")
          const jsonStart = 6; // "data: ".length
          const jsonEnd = event.indexOf('\n');
          
          if (jsonEnd !== -1) {
            const jsonPayload = event.slice(jsonStart, jsonEnd);
            
            try {
              // Parse JSON, mask content fields, re-stringify
              const parsed = JSON.parse(jsonPayload);
              
              // Mask content fields (common in chat responses)
              if (parsed.content && typeof parsed.content === 'string') {
                parsed.content = masker(parsed.content);
              }
              
              // Mask text field (alternative format)
              if (parsed.text && typeof parsed.text === 'string') {
                parsed.text = masker(parsed.text);
              }
              
              // Mask delta.content (streaming format)
              if (parsed.delta?.content && typeof parsed.delta.content === 'string') {
                parsed.delta.content = masker(parsed.delta.content);
              }
              
              // Reconstruct SSE event with masked payload
              const maskedJson = JSON.stringify(parsed);
              const maskedEvent = `data: ${maskedJson}\n\n`;
              
              this.push(maskedEvent);
            } catch (parseErr) {
              // If JSON parse fails, push original event (safer)
              console.warn('[SSE Mask Transform] JSON parse failed, passing through:', parseErr);
              this.push(event);
            }
          } else {
            // No newline found, push as-is
            this.push(event);
          }
        } else {
          // Not a data event, push as-is (preserves comments, event types, etc.)
          this.push(event);
        }

        // Move to next event
        lastIndex = eventEnd + 2;
        eventEnd = buffer.indexOf('\n\n', lastIndex);
      }

      // Keep remaining incomplete event in buffer
      buffer = buffer.slice(lastIndex);
      
      callback();
    },

    flush(callback: Function) {
      // Push any remaining buffer (incomplete event)
      if (buffer.length > 0) {
        // Try to mask if it looks like a data event
        if (buffer.startsWith('data: ')) {
          const jsonStart = 6;
          const jsonEnd = buffer.indexOf('\n');
          
          if (jsonEnd !== -1) {
            const jsonPayload = buffer.slice(jsonStart, jsonEnd);
            
            try {
              const parsed = JSON.parse(jsonPayload);
              
              if (parsed.content && typeof parsed.content === 'string') {
                parsed.content = masker(parsed.content);
              }
              if (parsed.text && typeof parsed.text === 'string') {
                parsed.text = masker(parsed.text);
              }
              if (parsed.delta?.content && typeof parsed.delta.content === 'string') {
                parsed.delta.content = masker(parsed.delta.content);
              }
              
              const maskedJson = JSON.stringify(parsed);
              this.push(`data: ${maskedJson}\n\n`);
            } catch (parseErr) {
              // Pass through on error
              this.push(buffer);
            }
          } else {
            this.push(buffer);
          }
        } else {
          this.push(buffer);
        }
      }
      
      callback();
    }
  });
}

