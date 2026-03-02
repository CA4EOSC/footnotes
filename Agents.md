# Agents and Skills

This document describes the agents and skills available within the `footnotes` project (AI Footnotes).

## Architecture

The extension embeds a terminal linked to a local pseudo-terminal (PTY) running the Gemini CLI. The interactions are orchestrated by an agent that leverages specialized "skills" to perform tasks directly on the user's local machine.

## Available Skills

Skills are modular sets of instructions and tools housed in the `skills/` directory.

### Librarian
- **Location**: `skills/librarian/`
- **Description**: Resolves Decentralized Identifiers (DIDs) and searches for information using ODRL services. It provides semantic search capabilities and seamless integration with metadata repositories.

### Notetaker
- **Location**: `skills/notetaker/`
- **Description**: Saves highlighted or provided text as a note in a local directory. Clicking "Save Note via Gemini" in the extension UI triggers this skill, creating uniquely named notes for later reference.

### Interpretator
- **Location**: `skills/interpretator/`
- **Description**: Finds contradicting interpretations of a given fragment of text, comparing the pros and cons of each perspective to provide a balanced analysis.

### Transcripter
- **Location**: `skills/transcripter/`
- **Description**: Extracts full English transcripts from YouTube videos using their video ID. This allows LLMs to summarize or analyze video content directly from YouTube links without hallucinating.

## Adding New Skills
To add a new skill to the `footnotes` ecosystem:
1. Create a new subfolder in `skills/` (e.g., `skills/my_new_skill/`).
2. Add a `SKILL.md` file within the folder containing the specific instructions and YAML frontmatter for the skill.
3. Place any helper scripts in a `scripts/` subdirectory within your skill folder.
4. Keep all instructions modular and follow the conventions described in existing skills.
