Create implementation-plan-eight.md in the prompts directory.

Create an implementation plan to handle the following feature creation or adjustment.

Output the plan to the implementation plan file.

### Overview

I want to build out the Playmaker feature. This will be where I can create activities and standard training sessions to be used and adapted at later times.

The design should be flexible, as some activities could be relevant to multiple different phases of play or principles. The detail for such activities is in how it is coached.

Training activities should be able to have progression candidates, allowing me to link one activity to another.

Training sessions will be handled as a follow up feature.

### Tasks

- Create the ability for me to import images to use with training activities.
- Implement functionality to create, import, edit, clone, and delete training activities.
- Create an activity import markdown template
- Training activities should enforce inclusion of:
  - Summary
  - Description
- Training activities should also allow optional inclusion of:
  - Activity Type (Warm Up, Possession, Finishing, Scrimmage, Set Piece, etc.)
  - Duration
  - DNA Framework Categorizations (see below)
  - Field Setup
  - External References (http links)
  - Coaching Points
  - Any relevant details around flexibility and activity linking as described above.
- I should be able to categorize activities based on one or more DNA Frameworks including:
  - noting the relevant phase(s) of play
  - noting the main principle
  - noting the sub principle

### Future Features

The following are features to keep in mind as developing the above changes, but will be handled as their own standalone feature enhancements:

- Activity Image
  - Not includable via import, only on create or edit
  - Will allow adding an image to an activity
- Activity Video
  - Not includable via import, only on create or edit
  - Will allow embedding videos via youtube, vimeo, local files, etc.
