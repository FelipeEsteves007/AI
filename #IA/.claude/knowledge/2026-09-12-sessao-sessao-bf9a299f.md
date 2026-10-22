---
agent: sessao
slug: sessao-bf9a299f
data: 2026-09-12
origem: claude
---

# Aprendizados — sessao · sessao-bf9a299f · 2026-09-12
## bugs
- Todas as páginas do Next davam 500 → agents rodaram `npm run build` com o `next dev` no ar, e os dois gravam na mesma pasta `.next` → parar o Next, apagar `.next` e subir de novo. Virou regra: não rodar build com o servidor de dev no ar.
- O PUT de aluno devolvia 500 quando o aluno era excluído entre a leitura e a gravação → o `findById` usava o escopo, mas o `update` filtrava só por `id`, e o `P2025` do Prisma não era tratado → gravar com `where: { id, assignedTo }` quando há escopo e mapear `P2025` para 404 com `isRecordNotFound` em `prismaErrors.ts`.
- A edição de um vendedor podia ser gravada num aluno reatribuído a outro vendedor no meio da operação → a checagem de escopo e a gravação eram passos separados (corrida) → a mesma correção: escopo no `where` do `update`, com `P2025` virando 404.
- Um aluno atribuído a um usuário desativado sumia da carteira de todos os vendedores ativos → não havia checagem de `isActive` na atribuição → `assertAssignable(assignedTo, current)` exige usuário existente e ativo, a não ser que o responsável seja o mesmo de antes.
- A busca apagava o espaço digitado no fim do termo → o pai devolvia o termo aparado e o `StudentSearchBar` reescrevia o campo → o componente guarda o último termo que enviou e não reescreve o campo quando o pai devolve esse mesmo termo.
- Na edição inline, a resposta atrasada de um campo desfazia o valor salvo em outro campo → o `saveField` juntava a resposta inteira do PUT (`{ ...current, ...updated }`) → aplicar só o campo salvo; o `updatedAt` só avança.
- A URL com `assignedTo` que não é UUID ou com `search` longo travava a listagem em 400 → os parâmetros da URL iam direto para a API → descartar o UUID inválido, cortar `search` em 255 e voltar os filtros ao padrão num 400 `VALIDATION_ERROR`, sem repetir a busca se já estiverem no padrão.
- Colar mais de 255 caracteres na busca zerava todos os filtros sem aviso → o corte só valia para a URL, e o backend respondia 400 → `maxLength={255}` no input, mais corte no `onChange`.
- A coluna "Nome" da tabela aparecia centralizada → era `<th scope="row">`, que o navegador centraliza por padrão, enquanto as outras colunas são `td` → `text-left` no `th`.
- O foco caía no `body` depois de excluir pela lista → o dialog devolvia o foco ao botão da linha, e o `reload()` removia a linha logo depois → tirar o aluno da lista no mesmo momento em que o dialog fecha, e usar `returnFocusFallbackRef` (o `h1` com `tabIndex={-1}`) no `useDialogFocus`.
- O foco se perdia durante a exclusão no dialog → os botões ficavam com `disabled`, que tira o foco do elemento → usar `aria-disabled` e ignorar os cliques com a guarda `!isDeleting`.
- O erro de campo ("E-mail já cadastrado") continuava na tela depois de Esc ou de sair do campo sem mudar nada → `cancel()` e o ramo "sem mudança" não limpavam o erro → `setError(null)` nesses dois caminhos.
- No teste, um aluno removido entre a leitura e a gravação virava 500 → o fake lançava um `Error` comum em vez do erro do Prisma → o fake passou a lançar um `PrismaClientKnownRequestError` real com `P2025`.

## arquitetura
- Escopo de escrita no próprio `where` do `update` (`{ id, assignedTo }`, aceito como `StudentWhereUniqueInput` no Prisma 6), com `P2025` virando 404. A alternativa descartada foi confiar só na leitura prévia com escopo, que deixa uma janela de corrida.
- `DELETE /api/students/:id` sem leitura prévia: um id inexistente gera `P2025`, que vira 404. `requirePermission` vem antes de `validate`, então vendedor e CEO recebem 403 para qualquer id (válido, inválido ou inexistente) e não descobrem se o aluno existe.
- A exclusão em cascata (compras, leads, tarefas) fica no banco, com `onDelete: Cascade`. O serviço não apaga os filhos à mão, e o fake em memória reproduz a cascata.
- Serviços de escrita destrutiva repetem o `hasPermission` além do middleware da rota, como defesa em profundidade. É mais rígido que o `userService` da feature 002, e a importação (TASK-012) deve seguir o mesmo caminho.
- String vazia em `phone`, `cpf` e `notes` vira `null` na rota. Motivo: é o comportamento certo para formulário, e evita que o segundo aluno sem CPF colida no `@unique` do `cpf`.
- Atribuição: só uma atribuição **nova** (POST, ou PUT que muda o `assignedTo`) exige usuário ativo. Manter um responsável já inativo é permitido. Admin/CEO como responsável é aceito, porque eles veem tudo.
- Proteção contra mass assignment em três camadas: o `z.object` do Zod 4 descarta chaves desconhecidas, o `validate` troca o `req.body` pelo dado validado e o serviço monta os dados campo a campo. Assim `id`, `createdAt` e `lastContactDate` nunca chegam ao Prisma.
- O e-mail é normalizado (`trim().toLowerCase()`) em todas as camadas: rota, serviço, `findByEmail` e `create`/`update` do model.
- No detalhe do aluno, `pipelineLeads` e `tasks` são filtrados por `assignedTo` só quando há escopo; `purchases` não tem filtro.
- Frontend: id que não é UUID mostra "não encontrado" sem chamar a API. Um 400 no GET do detalhe cai no mesmo estado. Um 404 no PUT troca a página inteira para "não encontrado", em vez de deixar a tela editável com dados velhos.
- Falha ao salvar na edição inline: a exibição volta ao valor gravado, mas o texto digitado fica guardado para quando a edição for reaberta. Esc, sair sem mudar ou salvar com sucesso descartam esse texto.
- Hook próprio `useDialogFocus` (foco inicial, Tab preso, Esc ouvido em `document`, devolução do foco), criado porque não havia modal acessível para reusar; o `UserFormModal` só tratava Esc no próprio elemento.
- `formatDateOnly` formata datas sem usar `Date`, para não deslocar pelo fuso (ex.: `purchaseDate`). O formato de `dueDate` precisa ser fixado no contrato antes da Sprint 8.
- Seed de demonstração (`npm run db:seed-demo`):
  - recusa rodar com `NODE_ENV=production`;
  - só mexe no que ele mesmo cria (`@demo.crm.test`, `@exemplo.test`);
  - usa o volume real de 3.000 alunos, então serve também para medir desempenho;
  - põe cerca de 10% dos leads com um vendedor diferente do dono do aluno, para exercitar a regra de visibilidade.

## padrao
- TDD: escrever o teste, ver falhar e só então implementar. Testes que já nascem verdes são registrados explicitamente como testes de regressão.
- Toda rodada de implementação passa por um code-reviewer isolado, sem exceção. Os achados importantes entram na task seguinte do mesmo agent, sem rodada extra.
- Agents em paralelo ficam em diretórios separados: backend em `api/` e `tests/api/`, frontend em `src/` e `tests/src/`. Nenhum dos dois toca `prisma/` nem a pasta da nota da sprint.
- Refinamentos aceitos no review são registrados na nota da sprint com id (`S6-10`, `S6-11`…). Desvios de contrato são relatados na entrega.
- Erros do Prisma são interpretados por helpers em `api/utils/prismaErrors.ts` (`uniqueViolationTarget`, `isRecordNotFound`), nunca espalhados pelo código.
- Fakes em memória lançam o `PrismaClientKnownRequestError` real, com o código certo, para o `instanceof` dos helpers funcionar nos testes.
- Next sempre com `--turbopack`: o `#` no caminho do projeto quebra o webpack.
- Testes de página terminam esperando a tela estabilizar (helper `waitForListIdle()`: sem skeleton e sem `aria-busy="true"`), nunca só conferindo os argumentos da chamada mockada. Isso evita warnings de `act(...)`.
- Condições de corrida no front ganham teste com duas promises resolvidas fora de ordem.
- Todo hook em `src/hooks/` tem teste próprio em `tests/src/hooks/`, espelhando a estrutura.
- Constantes de limite compartilhadas são exportadas do componente (ex.: `SEARCH_MAX_LENGTH`), não duplicadas.
- Ações ainda não implementadas usam `aria-disabled`, sem `onClick`, com a explicação ligada por `aria-describedby`.
- Capturas de prévia vão para `ImersaoIA/sprints/assets/sprint-N/`; `.playwright-mcp/` fica no `.gitignore`.
- Esconder a barra de rolagem com classes arbitrárias do Tailwind (`[scrollbar-width:none]`, `[&::-webkit-scrollbar]:hidden`), sem mexer no CSS global.
- Ajustes visuais que o jsdom não mostra (barra de rolagem, alinhamento) são conferidos na prévia real, com Playwright.
- Para ler campos do payload de um hook do Claude Code (ex.: `SubagentStop`), gravar o JSON real do evento e conferir, em vez de supor os nomes.

## falha
- `npm run db:generate` falha com EPERM enquanto o `dev:api` (`tsx watch`) está rodando. É preciso parar o processo antes de regenerar o Prisma Client.
- Rodar `npm run build` com o `next dev` aberto derruba o servidor de dev (500 em todas as páginas). O mesmo vale para o reviewer: não dá para validar build sem encerrar a prévia.
- `jest --silent` esconde o `console.error`, então não serve para detectar warnings de `act(...)`. Para isso, rodar sem `--silent`.
- `maxLength` no input não barra valor atribuído por script. É preciso cortar também no `onChange`.
- Só a opção de foco de reserva no `useDialogFocus` não resolveu o foco caindo no `body`: a linha só sumia depois, no recarregamento. Foi preciso remover o item da lista no mesmo momento em que o dialog fecha.
- Contar a largura de linha com `awk` dá falso positivo em comentários acentuados, porque conta bytes em vez de caracteres.
- Sem git no projeto, não há como comparar byte a byte com a versão anterior a um formatador. A verificação ficou limitada a datas de modificação e à busca por aspas duplas.
- `tsc --noEmit` cobre `api/` e `src/` juntos: um erro da trilha de backend em andamento (export ainda inexistente) quebra o typecheck do frontend e impede o build.
- No Playwright MCP, a captura com `filename` apontando para uma subpasta estourou o tempo limite de 5000 ms; com o arquivo na raiz do projeto funcionou, e depois foi movido.
- O jsdom não mostra barra de rolagem nem o alinhamento real, então testes unitários não bastam para esses ajustes.
- A cascata de exclusão testada só no fake não prova o comportamento no Postgres. A garantia real vem da migration e de verificação manual, e o teste de integração ainda está pendente.
- Casar o `meta.target` do P2002 com `includes` por substring é impreciso: um futuro campo como `emailSecundario` seria tratado como `EMAIL_IN_USE`. Comparar com `field === 'email' || field.endsWith('_email_key')`.
- A exclusão de aluno não grava auditoria, porque o enum `AuditAction` não tem ação para isso. Como o `AuditLog` não tem chave estrangeira para o aluno, a correção precisa de migration, leitura prévia e snapshot em `metadata`.
