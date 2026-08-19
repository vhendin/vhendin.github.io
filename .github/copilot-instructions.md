# Copilot Instructions for vhendin.github.io

## Project Overview
This is a personal GitHub Pages website (vhendin.github.io) that hosts several small web applications and interactive pages. The site is entirely static and deployed via GitHub Pages.

## Technology Stack
- **HTML5**: All pages are standalone HTML files
- **CSS3**: Stylesheets located in `/resources/styles/`
- **Vanilla JavaScript**: Scripts located in `/resources/scripts/`
- **No build tools**: This is a static site with no bundlers, transpilers, or build process
- **No package manager**: External libraries are loaded via CDN (e.g., Chart.js)

## Project Structure
```
/
├── index.html              # Main landing page
├── *.html                  # Various app pages (snake, metro, game-planner, etc.)
├── keybase.txt             # Keybase verification file
└── resources/
    ├── styles/             # CSS files (one per HTML page)
    ├── scripts/            # JavaScript files (one per HTML page)
    ├── images/             # Image assets
    └── *.geojson           # Geographic data files for map apps
```

## Coding Conventions

### HTML
- Use semantic HTML5 elements
- Include `lang="en"` on the `<html>` element
- Use proper `<meta>` tags for charset and viewport
- Link to external stylesheets and scripts (not inline)

### CSS
- Each HTML page has a corresponding CSS file with the same base name
- Use CSS3 features like flexbox, animations, and transitions
- Use rem/em units for sizing where appropriate
- Keep styles modular and scoped to their respective pages

### JavaScript
- Use vanilla JavaScript (no frameworks or libraries unless necessary)
- Use `const` and `let` instead of `var`
- Use modern ES6+ features (arrow functions, template literals, etc.)
- Use `document.getElementById()` or `querySelector()` for DOM access
- Attach event listeners in JavaScript, not inline HTML attributes

## File Naming
- HTML files: lowercase, hyphenated (e.g., `game-planner.html`)
- CSS files: match the HTML file name (e.g., `game-planner.css`)
- JavaScript files: match the HTML file name (e.g., `game-planner.js`)

## Testing
This project has no automated test infrastructure. Changes should be manually verified by:
1. Opening the HTML files in a web browser
2. Testing interactive functionality
3. Checking browser console for errors
4. Verifying responsive behavior if applicable

## Deployment
- The site deploys automatically via GitHub Pages from the main branch
- No build step is required
- Changes pushed to main are live immediately

## Additional Notes
- Keep external dependencies minimal
- Ensure accessibility with appropriate ARIA labels and semantic markup
- The main page features animated emoji elements with a randomize button
