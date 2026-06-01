Create implementation-plan-17.md in the prompts directory.

Create an implementation plan to handle the following feature creation or adjustment.

Output the plan to the implementation plan file.

### Overview

The next features to implement are on the squad assist page.

Each of the following features should be tabs in the squad assist page next to Roster and Formations.

### Features

- Periodization Plan
  - I should be able to create a periodization plan for a team in squad assist. For simplicity, this should just be a plan structured in markdown.

- Training Schedule
  - I should be able to create a training schedule where I take existing playmaker sessions and activities and arrange a calendar of scheduled sessions.
  - The calendar should be arranged in a list of Scheduled Session cards, each displaying the following details when viewing in list view:
    - Date
    - Game Phase
    - Objective
    - Evaluation Status Indicator Icon
  - Scheduled sessions should be copied for the playmaker sessions so that any edits made to the scheduled session doesn't persist to the playmaker version.
  - I should be able to click into a training session and view it in full, and edit it for the specific instance of that session.
  - Each session should have three tabs:
    - Session Details
      - This contains the details of the training plan
    - Players
      - This is a list of the players who may attend
      - This should default to the list of players that are assigned to the current squad that was selected from squad assist
      - I should have the ability to add a guest player to a specific session, and this player should persist only to the existing session
      - I should be able to mark player attendance as one of the following:
        - Attended
        - Excused
        - Unexcused
    - Evaluation
      - I should be able to provide an evaluation to each session at the full session level, as well as at the level of each activity.
      - Assessments should be ratings from 1-10
      - I should be able to enter notes from a session
      - I should be able to optionally mark the top 3 and bottom 2 players from a session
