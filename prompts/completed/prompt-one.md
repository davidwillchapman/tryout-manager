Make a plan to implement the following adjustments:

- Add functionality to bulk upload players via csv upload.
- Take a look at the default SelectItem options. Initially, they were empty strings which caused an error. I changed them to various None and All values, but I suspect that may have caused an issue.
- The filtering logic on the players page doesn't appear to be working properly. When I switch between different filter options, I can end up in a state where nothing shows up.
- Adjust the gitignore file to ensure that the various sqlite database files don't get tracked in git.
