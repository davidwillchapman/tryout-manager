I want to pivot this application and create a series of new functionality.

Create implementation-plan-three.md in the prompts directory.

Create an implementation plan to handle the first wave of adjustments that will allow the future features to be implemented more cleanly. Output the plan to the implementation plan file.

Tasks:

- Refactor the application to be called 'Sideline Sidekick'
- Refactor the application homepage to be a simple overview page with a logo. Keep text very brief for now.
- Refactor the sidebar in the following ways:
    - Adjust Navigation Options to:
        - Provide on hover indication
        - Navigate to an option landing page on click
        - Have an arrow expand option to show subpages
            - Do not redirect to the page if clicking just the arrow
            - Default homepage to have all expand options render as closed
            - Allow all navigation options to be expanded, meaning if I expand one and then another, they both are allowed to be open
            - When redirecting to a new page, collapse all option subpages other than that page's subpage options
    - Adjust Navigation Options to be:
        - 'Playmaker'
        - 'Squad Assist'
        - 'Tryout Manager'
            - Move Groups, Teams and Players under this page
        - 'League Results'
            - Move existing League Results page under this page
- Adjust the README to account for these changes and the current state of the application.
