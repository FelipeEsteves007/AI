AI

1. Harness
The model (Claude, GPT, etc.) is merely the “engine”: it receives text and returns text. The harness is everything surrounding it that transforms it into something useful:

- fixed instructions (system prompt, CLAUDE.md file)
- tools it can use (reading files, running commands, compiling)
- permissions and rules (what it can or cannot do)
- the loop (it requests an action, the program executes it and returns the result, and the process continues)
- memory and context sent with each call

2. Prompt types
The most common ones:

- System prompt: permanent instructions that define the role and rules (e.g., "You review Delphi code; respond in Portuguese").
- User prompt: the immediate request.
- Zero-shot: a request made without providing an example.
- Few-shot: providing 2 or 3 examples of what is expected, so the model mimics the format.
- Step-by-step reasoning: asking the model to think through the steps before responding.

3. Artifacts
The model does not retain information from one session to the next. The project’s "memory" resides in files (artifacts), which the harness provides to the model.
- Evolving harness: it does not start out complete; it grows with every error.
  1. The agent makes a mistake.
  2. I identify the cause (a missing context, rule, or check).
  3. I adjust the harness and test again.

General project rules, to be read upon opening. Each tool has its own file.

rules
- Rules divided into smaller files, organized by topic or folder (e.g., naming conventions, databases, tests).
- Use this when `CLAUDE.md` becomes too large.

skills
- Instruction packages (sometimes including scripts) for a specific task, loaded only when needed.
- Use for tasks that you perform repeatedly (e.g., generating a report according to our standard format).

specs
- Describe WHAT to build: objective, requirements, acceptance criteria. Basis for the SDD (development is carried out based on the specification).

plan.md
- Steps for the current task, with status ([ ] and [x]). Allows you to resume work in a new session without losing your place.

agents 
- Definitions for sub-agents: assistants with specific roles (e.g., code reviewer, tester), each with its own set of instructions.

context
- Reference documents that the agent consults when needed: architecture, glossary, decisions, code examples.

hooks
- Commands that run automatically at specific points in a cycle (e.g., before a tool, after a tool, or upon completion).
- Examples: blocking a dangerous command, or running a compiler or tests after every change.
- Since they execute code, they do not rely on the model to comply.

Permissions (settings.json, permissions.deny)
- Define what the agent is allowed to do, what requires confirmation, and what is prohibited.
- Always test: try to get the agent to access something that is blocked and see if it refuses.