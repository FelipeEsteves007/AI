---
agent: code-reviewer
slug: task-abdb4ed7
data: 2026-09-12
origem: claude
---

# Aprendizados — code-reviewer · task-abdb4ed7 · 2026-09-12
## bugs
- A busca apagava o espaço digitado (`maria ` + 300 ms de debounce + `s` virava `marias`) → quando o pai devolvia o termo já aparado, o `StudentSearchBar` reescrevia o campo com ele → correção: o componente guarda o último termo que enviou e só reescreve o campo quando o valor do pai é diferente desse termo; mudanças externas, como "Limpar filtros", continuam reescrevendo.
- A lista de alunos travava em 400 com "Tentar novamente" infinito → `assignedTo` que não era UUID e `search` com mais de 255 caracteres vinham da URL e iam direto para a API → correção: descartar `assignedTo` inválido e aparar e cortar `search` em 255 ao ler a URL; um 400 `VALIDATION_ERROR` com filtros fora do padrão volta os filtros ao padrão; se os filtros já estão no padrão, mostra o erro sem repetir a chamada.

## arquitetura
- A resposta da API é validada com `requireBody` no `studentsService`, no lugar de casts `as ...`, para não aceitar um corpo ausente como se fosse do tipo esperado.
- `isUuid` fica em `src/utils/uuid.ts`, reaproveitado pela lista (filtro `assignedTo`) e pelo detalhe (id da URL).
- O foco de dialog fica num hook próprio (`useDialogFocus`). Ele abre o foco no botão Cancelar, prende o Tab nos dois sentidos e trata o Esc por listener em `document`, removido no cleanup. Também devolve o foco a quem abriu, só se o elemento ainda estiver no DOM (`isConnected`), e lê sempre a versão mais nova do callback.
- Durante a exclusão, o botão usa `aria-disabled` em vez de `disabled`, e a guarda (`!isDeleting`) fica no `onClick`. Clique, Enter e Espaço caem no mesmo handler, e o Esc também respeita `isDeleting`.
- As ações futuras ("Enviar e-mail", "Nova tarefa") ficam com `aria-disabled`, sem `onClick` e com a explicação ligada por `aria-describedby`. Continuam focáveis e não fazem nada.
- O botão Excluir aparece só com `students:delete`, mas isso é apenas visual: quem barra é o backend.
- Id inválido na URL não chama a API e mostra "não encontrado"; um 400 do endpoint de detalhe cai no mesmo estado.
- `purchaseDate` (`YYYY-MM-DD`) é formatada por `formatDateOnly` sem passar por `Date`, porque `new Date('2026-09-01')` em UTC-3 vira 31/08. `formatCurrency` usa `Intl` pt-BR/BRL.
- Na edição inline, `phone`, `cpf` e `notes` vazios são enviados como `null`, alinhado ao refinamento da TASK-008.

## padrao
- Edição inline: um `editingRef` síncrono garante um único salvamento por edição, mesmo com Enter seguido de blur; valor sem mudança não dispara PUT; no erro, o campo volta ao valor anterior.
- Erros da edição inline: 409 `EMAIL_IN_USE`/`CPF_IN_USE` e 400 com `details` viram mensagem junto do campo, num `role="alert"`.
- Teste de debounce usa timer falso, nunca timer real.
- Teste de página assíncrona termina esperando a tela estabilizar (por exemplo `waitFor` sem `[aria-busy="true"]`, ou a linha esperada), não só os argumentos da chamada ao service.
- Hook em `src/hooks/` ganha teste próprio espelhado em `tests/src/hooks/`, não só cobertura indireta pelo componente que o usa.
- Limite de tamanho aceito pelo backend vale também no input (`maxLength`), não só na leitura da URL.
- Ao juntar a resposta de um PUT parcial no estado, juntar só o campo salvo e o `updatedAt` (ou ignorar respostas mais velhas com um contador por requisição), e testar com duas promises resolvidas fora de ordem.
- Com 404 num PUT (aluno excluído ou reatribuído no meio da edição), a página deve ir para o estado "não encontrado" em vez de continuar editável.
- Verificação do frontend: `npx jest --selectProjects web` e `npx tsc --noEmit` filtrando `src/` e `tests/src/`, porque o backend em andamento pode quebrar o typecheck global.
- Saída do code-reviewer: abre com `🤖 agent: code-reviewer`, traz veredito, achados em 🔴/🟡/🟢 com arquivo:linha, cenário concreto, referência e correção, e fecha com `↩️ devolvendo ao orquestrador: ...`.

## falha
- Juntar a resposta inteira do PUT no estado (`{ ...current, ...updated }`) não funciona com edições simultâneas em campos diferentes: se a resposta mais antiga chega por último, ela sobrescreve na tela o valor já salvo do outro campo, e a tela fica diferente do banco.
- `npx jest --silent` não serve para investigar aviso de `act(...)`, porque esconde o `console.error`; é preciso rodar sem `--silent`.
- `npx jest --selectProjects web tests/src/pages/students` não restringiu a execução à pasta: rodou o projeto web inteiro (234 testes).
- O aviso intermitente de `act(...)` não é ruído aceitável. A causa provável é o teste terminar com a promise de carregamento pendente, e o `setState` que vem depois cai fora do `act`.
- `npm run build` não serve de verificação do frontend enquanto a trilha de backend deixa o typecheck quebrado.
- Cortar `search` em 255 só na leitura da URL não basta: colar mais de 255 caracteres no input gera 400, e a regra de recuperação zera todos os filtros sem avisar.
- Devolver o foco ao botão que abriu o dialog falha depois da exclusão pela lista: o `reload()` tira a linha do DOM e o foco cai no `body`. Falta um alvo de reserva para o foco.
- Limpar a mensagem de erro do campo só no próximo salvamento deixa o alerta velho visível depois de Esc ou de sair do campo sem mudança.
- `dueDate` serializado com `toISOString()` e formatado via `Date` local pode aparecer um dia antes em UTC-3, se o vencimento for gravado como meia-noite UTC. A mesma proteção de `purchaseDate` não foi aplicada.
