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

4. Prediction
what the model actually does:

An LLM does one single thing: it predicts the next piece of text. It’s like the autocomplete feature on a mobile phone keyboard—only massive and trained on a vast amount of text.

An illustrative example, using made-up numbers:

“The sky is ___”
blue (60%) · cloudy (20%) · beautiful (10%) · other (10%)

It selects one (with a degree of randomness, controlled by a parameter called “temperature”), adds it to the text, and repeats the process. An entire response is built this way—one piece at a time. It does not plan the whole text in advance.

5. Tokens: the “pieces” of text

The model does not read individual letters or exact words. Instead, it reads tokens—which can be a short word, part of a word, a symbol, or even a space. The precise way text is broken down depends on the specific model.

Why this matters:
Context limits and costs are calculated in tokens, not words.
Texts in Portuguese and programming code typically consume more tokens than simple English text.
Because the model does not perceive letters one by one, tasks such as “count the letters in this word” may fail.

6. Vectors (embeddings): meaning expressed in numbers
Each token is transformed into a list of numbers—a vector. Think of it like a map: words with similar meanings are positioned close to one another (“dog” would be near “canine,” but far from “compiler”).
These are the numbers the model uses for its internal processing. Externally, this same mechanism enables searches based on meaning rather than exact keyword matches, and it serves as the foundation for RAG.

7. Hallucination: a direct consequence of prediction
Because the model selects the most probable and coherent text—rather than consulting a factual database—it may generate content that sounds correct but is actually false. Furthermore, it cannot recognize this on its own.
This occurs more frequently when:

- there is limited training material on the subject
- context is missing
- the prompt is vague
- the conversation has become too long

How to mitigate this: provide context, instruct the model to say "I don't know" when it is uncertain, verify the output (by compiling, testing, or checking documentation), and implement a framework that incorporates external tools and RAG (Retrieval-Augmented Generation).

8. SDD stands for Spec-Driven Development.

The idea is that you first write down what you want to build (the spec), and then the AI ​​implements it based on that spec, rather than you asking for the code directly.

- spec.md (SDD)
  What it is: A file that describes WHAT to build, before the AI ​​writes any code. The agent reads it and uses it as a guide (think of it as a "signpost").
  
  What to include:
- Objective: the problem the system solves
- Requirements: what it must do
- Rules and constraints
- Out of scope: what will NOT be built
- Acceptance criteria: how to determine when it’s finished

Why use it: Vague requests lead the AI ​​to guess (hallucinate). The spec removes ambiguity before the coding begins.

[ PRD ] ──► [ Constitution ] ──► [ Specify ] ──► [ Plan ] ──► [ Tasks ] ──► [ Implement ]

PRD (Business): Defines the "what" and the "why." Focuses on objectives, scope, and the user's problem.

Constitution (Project Rules): Global, non-negotiable technical rules. Includes Delphi coding standards, layered architecture, naming conventions, and frameworks.

Specify (Functional): Business rules for the feature. Covers use cases, screen validations, alternative flows, and acceptance criteria (Given/When/Then).

Plan (Technical): The "how" within the Delphi context. Includes class modeling, interfaces, records, DTOs, and database modifications.

Tasks (Execution): A list of atomic, sequential tasks. Each item must be small, compilable, and independently testable.

Implement (Coding): Generating code via DelphiDev, executing one task at a time while strictly adhering to the Plan and the Constitution.

9. /init, CLAUDE.md, and AGENTS.md

- /init: A command that analyzes the project and generates an initial CLAUDE.md file. I subsequently reviewed and adjusted it.
- AGENTS.md: The equivalent of CLAUDE.md in other tools (e.g., OpenCode). Each tool has its own specific file.
- Multiple .md files are possible: In large projects (e.g., an ERP with many modules), there might be a main file, with additional files for each module.
- The main file is the first one to be read, so it is kept concise—no more than 400 lines (a limit mentioned during the lesson).