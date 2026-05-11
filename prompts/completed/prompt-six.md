Create implementation-plan-six.md in the prompts directory.

Create an implementation plan to handle the following feature creation or adjustment.

Output the plan to the implementation plan file.

### Overview

The last implemented feature was DNA Frameworks.

It was a good start, but it needs some refinement.

In the assets folder is a markdown file that was imported successfully.
This markdown file was generated from the pdf document in the same folder via claude.
Despite being successfully imported, this highlighted that the import format is subpar.
To be more specific, the framework document imports down to the main principle, but the resulting framework view in the app is simply the sub principles and descriptions as text boxes.

### Tasks

- Adjust to only support importing via markdown.
- Create a markdown import template that could be used to instruct an LLM on how to convert a framework text or pdf document into a markdown document that will be able to be imported properly.
- Refine the import process so that sub principles are also handled.
- Adjust the UI so that clicking a section in the framework navigator menu shows a list of everything within the next layer.
  - ex: clicking "Attacking" Shows the text content stored in the attacking section, and then a list of each sub section.
  - ex: clicking "Team Tactical Principles" shows a list of the principles that are below it.
  - etc.
- Adjust each text box to use formatted text content instead of raw text.
