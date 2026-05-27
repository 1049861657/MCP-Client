import { v7 as uuidv7 } from 'uuid';

/** RFC 9562 UUID v7，用于 requestId / traceId / 幂等键 */
export function generateRequestId(): string {
  return uuidv7();
}
