Staff Management Software 2.0 - Flask Ready Conversion

This is the compiled Volt React Dashboard served through Flask.
The original template was React, not plain Flask HTML. To preserve the exact same UI, components, charts, sidebar, pages, and behavior, the React build output is placed into Flask's templates/static structure.

Folder structure:
- app.py
- templates/index.html
- static/css
- static/js
- static/media
- static favicon/manifest files
- requirements.txt

How to run:
1. Open this folder in VS Code or terminal.
2. Install Flask:
   pip install -r requirements.txt
3. Run:
   python app.py
4. Open:
   http://127.0.0.1:5000/

Useful routes:
- /
- /dashboard/overview
- /examples/sign-in
- /examples/sign-up
- /transactions
- /settings
- /components/forms
- /components/tables
- /tables/bootstrap-tables

Important:
This is still a React single-page dashboard rendered by Flask. Flask serves one index.html, while React controls the pages and components.
