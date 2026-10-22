---
agent: sessao
slug: sessao-d6c2da31
data: 2026-09-12
origem: claude
---

# Aprendizados — sessao · sessao-d6c2da31 · 2026-09-12
## bugs
- (nada nesta sessão)

## arquitetura
- (nada nesta sessão)

## padrao
- Para desenhar no Excalidraw via MCP, as ferramentas (`read_me`, `create_view`, `export_to_excalidraw`) começam indisponíveis. Primeiro é preciso carregá-las com `ToolSearch` (`select:`), e `read_me` roda antes de `create_view`.
- O fluxo de referência para explicar uma API REST com Horse (Delphi) segue esta ordem:
  - Cliente HTTP chama `THorse.Listen`.
  - Os middlewares entram via `THorse.Use`, nesta ordem: Jhonson, CORS, JWT, HandleException.
  - A rota (`THorse.Get('/recurso/:id')`) chama o Controller `(Req, Res, Next)`.
  - O Controller chama o Service (regras de negócio), que chama o DAO/Repository (FireDAC), que consulta o banco.
- Caminho de sucesso: o Controller responde com `Res.Send<TJSONObject>(...).Status(200)`.
- Caminho de erro: o Service lança `EHorseException`, que o middleware converte em 400, 404 ou 500 com corpo JSON.
- Gerar link compartilhável no excalidraw.com (`export_to_excalidraw`) deixa o desenho público no site deles. Isso deve ser avisado antes, e o link só é gerado se o usuário pedir.

## falha
- (nada nesta sessão)
