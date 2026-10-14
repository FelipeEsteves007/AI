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
