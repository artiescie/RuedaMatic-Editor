#!/usr/bin/env bash

# PREREQUISITE: global installation of npm's replace-in-file
# CUSTOMIZE: the lines a the end referring to VitePress may need to be commented out
#   unless you also have the RuedaMatic docs file and it is in the named location

# THIS UPDATES USER FACING VERSIONS and BUILD DATES text
#   there are currently 2 fixdate.sh scripts (August 2024)
#     In "ruedamatic-editor" project
#        - updates ruedamatic-editor project
#           settingsStore.js      - with version
#           SystemInformation.vue - with datetime stamp
#        - updates VitePress/RuedaMatic Editor project
#           all *.md files that contain "Version [n.n.n] Built [datetime]"
#                                 - with version, datetime stamp
#           the_program.md        - with version (link to zip file on server)
#     In "RM-Spot" project
#        - updates only its own project files
#           LoginPage.vue     - with datetime, and version
# Both scripts take the version number from ruedamatic-editor/package.json

# CALLED BY THE BUILD SCRIPT
# IN the DOCS and DASHBOARD: fixes VERSION and DATE fields.
#   if you call it outside the build script, the docs won't match the build.

# TARGET: both "ruedamatic-editor" and "Vitepress/RuedaMatic Editor" projects
# update timestamp of format: "Built Thu Feb 16, 2023 - (08:36 PM)" using global installation of npm's replace-in-file
#  PLUS the Markdown link to the Setup ZIP file in the docs (the_program.md)
# does parallel update for RME main project, plus rm-spot Spotify player, plus VitePress docs for RuedaMatic
stamp=$(date +"%a %b %d, %Y - (%I:%M %p)")
echo "Modifying dates and versions in VitePress doc files, and in RME GUI"
echo "$stamp"
# get the version from package.json
version=$(awk -F'"' '/"version": ".+"/{ print $4; exit; }' package.json)
echo "$version"

# This local project textual updates
# the RME settings store version if not changed manually
replace-in-file "/version: '\d+\.\d+\.\d+'/g" "version: '$version'" ./src/renderer/store/modules/settingsStore.js --isRegex
# the RME dashboard page
replace-in-file "/Built \w{3} \w{3} \d{1,2}, \d{4} - \(\d{2}:\d{2} (P|A)M\)/g" "Built $stamp" ./src/renderer/components/LandingPage/SystemInformation.vue --isRegex

# Related fields in THIS OTHER PROJECT VitePress docs for RuedaMatic Editor
# the Vitepress project all md pages: currently "the_program" and "index.md"
replace-in-file "/Version \d+\.\d+\.\d+ Built \w{3} \w{3} \d{1,2}, \d{4} - \(\d{2}:\d{2} (P|A)M\)/g" "Version $version Built $stamp" "../VitePress/RuedaMatic Editor/docs/*.md" --isRegex

# change MARKDOWN LINK in 1 Vitepress file.  Avoid windows path mangling with MSYS_NO_PATHCONV=1
MSYS_NO_PATHCONV=1 replace-in-file "/%20\d+\.\d+\.\d+\.zip/g" "%20${version}.zip" "../VitePress/RuedaMatic Editor/docs/the_program.md" --isRegex
