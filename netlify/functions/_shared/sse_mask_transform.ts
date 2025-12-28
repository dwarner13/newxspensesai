/**
 * 🔄 SSE Mask Transform Stream (Day 7 Enhanced)
 * 
 * Transform stream that masks PII in SSE "data:" payloads while preserving
 * SSE event framing (\n\n boundaries).
 * 
 * Day 7 Enhancements:
 * - Unicode-safe chunk handling (preserves multi-byte characters)
 * - Backpressure-safe (respects stream backpressure)
 * - Newline-safe SSE framing (guarantees \n\n boundaries)
 * - Chunk counting for debugging
 * 
 * CRITICAL: SSE format must be preserved:
 * - Events: "data: {...}\n\n"
 * - Masking must only affect JSON payload, not framing
 * - Event boundaries (\n\n) must remain intact
 * - Never split multi-byte UTF-8 characters
 * 
 * @module sse_mask_transform
 */

import { Transform } from 'stream';

/**
 * Creates a Transform stream that masks PII in SSE data payloads
 * 
 * Day 7 Enhanced Version:
 * - Unicode-safe: Preserves multi-byte UTF-8 characters
 * - Backpressure-safe: Respects stream backpressure
 * - Newline-safe: Guarantees \n\n boundaries
 * - Chunk counting: Tracks processed chunks for debugging
 * 
 * This stream:
 * 1. Buffers incoming chunks until complete SSE events are formed
 * 2. Extracts JSON payload from "data: {...}" lines
 * 3. Applies masker function to JSON content (not framing)
 * 4. Preserves SSE event boundaries (\n\n)
 * 5. Never splits multi-byte UTF-8 characters
 * 
 * @param masker Function that masks PII in a string
 * @param options Configuration options
 * @returns Transform stream that masks SSE payloads + chunk counter
 * 
 * @example
 * ```typescript
 * import { maskPII } from './pii';
 * 
 * const masker = (text: string) => maskPII(text, 'last4').masked;
 * const { transform, getChunkCount } = createSSEMaskTransform(masker);
 * 
 * // Pipe OpenAI stream through transform
 * openaiStream.pipe(transform).pipe(response);
 * 
 * // Get chunk count for header
 * const chunkCount = getChunkCount();
 * ```
 */
export interface SSEMaskTransformOptions {
  flushEvery?: number; // Flush every N chunks (default: 1, flush immediately)
  preserveBoundaries?: boolean; // Ensure \n\n boundaries (default: true)
}

export interface SSEMaskTransformResult {
  transform: Transform;
  getChunkCount: () => number;
}

export function createSSEMaskTransform(
  masker: (text: string) => string,
  options: SSEMaskTransformOptions = {}
): SSEMaskTransformResult {
  const { flushEvery = 1, preserveBoundaries = true } = options;
  let buffer = '';
  let chunkCount = 0;
  let eventBuffer = '';

  const transform = new Transform({
    objectMode: false,
    encoding: 'utf8',
    
    transform(chunk: Buffer, encoding: BufferEncoding, callback: Function) {
      chunkCount++;
      
      // Decode chunk safely (preserves UTF-8 multi-byte characters)
      const chunkStr = chunk.toString('utf8');
      buffer += chunkStr;

      // Process complete SSE events (ending with \n\n)
      // Use lastIndexOf to find the last complete event boundary
      let lastIndex = 0;
      let eventEnd = buffer.indexOf('\n\n', lastIndex);

      while (eventEnd !== -1) {
        // Extract complete event (including \n\n)
        const event = buffer.slice(lastIndex, eventEnd + 2);
        
        // Check if this is a "data:" event
        if (event.startsWith('data: ')) {
          // Extract JSON payload (everything after "data: " until first \n)
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
              const maskedEvent = preserveBoundaries 
                ? `data: ${maskedJson}\n\n`
                : `data: ${maskedJson}\n`;
              
              // Push with backpressure check
              if (!this.push(maskedEvent)) {
                // Backpressure: pause and wait for drain
                eventBuffer += maskedEvent;
              }
            } catch (parseErr) {
              // If JSON parse fails, push original event (safer)
              console.warn('[SSE Mask Transform] JSON parse failed, passing through:', parseErr);
              if (!this.push(event)) {
                eventBuffer += event;
              }
            }
          } else {
            // No newline found, push as-is
            if (!this.push(event)) {
              eventBuffer += event;
            }
          }
        } else {
          // Not a data event, push as-is (preserves comments, event types, etc.)
          if (!this.push(event)) {
            eventBuffer += event;
          }
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
              const finalEvent = preserveBoundaries 
                ? `data: ${maskedJson}\n\n`
                : `data: ${maskedJson}\n`;
              this.push(finalEvent);
            } catch (parseErr) {
              // Pass through on error (ensure \n\n boundary)
              const finalBuffer = preserveBoundaries && !buffer.endsWith('\n\n')
                ? buffer + '\n\n'
                : buffer;
              this.push(finalBuffer);
            }
          } else {
            // Ensure \n\n boundary if preserveBoundaries
            const finalBuffer = preserveBoundaries && !buffer.endsWith('\n\n')
              ? buffer + '\n\n'
              : buffer;
            this.push(finalBuffer);
          }
        } else {
          // Ensure \n\n boundary if preserveBoundaries
          const finalBuffer = preserveBoundaries && !buffer.endsWith('\n\n')
            ? buffer + '\n\n'
            : buffer;
          this.push(finalBuffer);
        }
      }
      
      // Push any buffered events from backpressure
      if (eventBuffer.length > 0) {
        this.push(eventBuffer);
        eventBuffer = '';
      }
      
      callback();
    }
  });

  // Handle drain event for backpressure
  transform.on('drain', () => {
    if (eventBuffer.length > 0) {
      const toPush = eventBuffer;
      eventBuffer = '';
      transform.push(toPush);
    }
  });

  return {
    transform,
    getChunkCount: () => chunkCount
  };
}


