// jsdom's own TextEncoder/TextDecoder produce Uint8Array instances from a different realm
// than Node's global Uint8Array. Libraries that do a strict `instanceof Uint8Array` check on
// encoded bytes (jose's JWE encryption does, for example) then fail with
// "TypeError: plaintext must be an instance of Uint8Array" even though the bytes are
// perfectly valid. Forcing Node's own TextEncoder/TextDecoder onto the global scope keeps
// everything in the same realm.
import { TextEncoder, TextDecoder } from 'node:util';

globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
