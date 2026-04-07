The main specification for this project is held in docs/obsidian. It is in Obsidian vault
format and the "entry point" file is README.md. I have done my best to make these documents
authoritative, but it is possible that there are still some inconsistencies. Please let me know.

The intended tech stack for this project is:
- Preact
- TypeScript
- preact-iso
- Tailwind
- vitest
- bun

I'd like you to start by analysing the documentation and then preparing a suitable 
implementation plan.

There are three "sources of truth" in this documentation:
- The docs in the Obsidian vault
- The wireframes referenced from those docs
- The acceptance tests defined in docs/acceptance

If you ever discover any inconsistency between these three versions of the truth, please flag it
immediately to me.

Please understand that I want a functional TypeScript solution that can be maintained by both
LLM and human. I want high quality "Senior" level code. I also want fully functional tests that
reflect the acceptance tests. I expect you to use those tests to ensure that the code quality is
preserved as the project progresses.

Finally, please do not use any Git functions for any purposes, but please preserve the ".git"
folder. I will be doing the git functions.
