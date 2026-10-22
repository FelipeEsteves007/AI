/**
 * Ambiente jsdom com as APIs de rede do Node.
 *
 * O jsdom não implementa `fetch`, `Response` nem `Headers`, e os testes do frontend precisam
 * simular o `fetch` (jest.spyOn(global, 'fetch')). Aqui as implementações nativas do Node são
 * copiadas para dentro do global do jsdom — nenhuma requisição real é feita nos testes.
 */
const JSDOMEnvironment = require('jest-environment-jsdom').default;

const WEB_GLOBALS = [
  'fetch',
  'Headers',
  'Request',
  'Response',
  'FormData',
  'Blob',
  'File',
  'AbortController',
  'AbortSignal',
  'ReadableStream',
  'WritableStream',
  'TransformStream',
  'TextEncoder',
  'TextDecoder',
  'structuredClone',
];

class JsdomWithFetchEnvironment extends JSDOMEnvironment {
  constructor(config, context) {
    super(config, context);

    for (const name of WEB_GLOBALS) {
      if (this.global[name] === undefined && globalThis[name] !== undefined) {
        this.global[name] = globalThis[name];
      }
    }
  }
}

module.exports = JsdomWithFetchEnvironment;
