# Todo list — plan & tracker

Week 3 project. Course root: [../../CLAUDE.md](../../CLAUDE.md)

## Scope (v1)

Match the README:
1. Add a todo
2. Toggle complete / incomplete
3. Edit todo text
4. Delete a todo

Out of scope for v1: filtering, due dates, persistence (localStorage), drag-to-reorder, categories. Easy to add later.

## Data model

Single in-memory array, rebuilt to DOM on every change:

```js
// shape: { id: string, text: string, done: boolean }
let todos = []
```

`id` = `crypto.randomUUID()`. No persistence in v1, so refresh wipes the list. Adding `localStorage` later is a 5-line change.

## File structure (target)

```
src/
├── main.js                # entry — wires up form + render loop + event delegation
├── todos.js               # todos array + add/toggle/remove/edit functions
└── styles/
    ├── tokens.css         # colors, spacing, font tokens (incl. dark mode)
    ├── base.css           # reset, body, headings
    ├── components.css     # .todo, .todo-form, .todo-input, .todo-add,
    │                      # .todo-list, .todo-item, .todo-check, .todo-text,
    │                      # .todo-delete
    └── index.css          # imports the three above
```

## UI

```
┌─────────────────────────────┐
│  Todo                       │
│                             │
│  [ new todo...     ] [Add]  │  ← form
│                             │
│  ☐ Buy milk            ✕   │  ← list items
│  ☑ Call mom            ✕   │     (checkbox toggles, ✕ deletes,
│  ☐ Write README        ✕   │      double-click text to edit)
└─────────────────────────────┘
```

## Behavior

- **Add**: form submit → trim → ignore if empty → push to array → re-render → clear input → refocus
- **Toggle**: click checkbox → flip `done` → re-render (completed items get strikethrough + muted color)
- **Edit**: double-click text → swap in an `<input>` → Enter or blur to save, Esc to cancel
- **Delete**: click ✕ → filter out by id → re-render
- Event delegation on the list container — one listener handles toggle / delete / edit via `data-id` and `data-action`

## Render strategy

Rebuild `<ul>` innerHTML from `todos` on every state change. Simple, fine for hundreds of items. Consequence: any in-DOM state (a half-typed edit) wipes on render, so edit mode needs to live in the data model, not just the DOM.

User-typed text is escaped before injection (`escapeHtml`) — without it, a todo like `<img src=x onerror=...>` would actually run.

## Build steps

- [x] **Step 1 — Clean the scaffold.** Strip Vite starter; create `src/styles/{tokens,base,components,index}.css`; delete `counter.js`, starter assets, `public/icons.svg`. README updated to include "Edit todo text".
- [x] **Step 2 — Static markup.** Heading, form, empty `<ul>` rendered from `main.js`. (Landed inside step 1.)
- [x] **Step 3 — Add.** `todos.js` with `addTodo()`; form submit handler; `render()` rebuilds list from array; checkbox + delete button render but inert. HTML escaping in place.
- [x] **Step 4 — Toggle, delete, edit.** Event delegation on `#todo-list` with `change` (toggle), `click` (delete), `dblclick` (start edit), `keydown` (Enter saves, Esc cancels), `focusout` (blur saves). Edit state stored as `editing: true` on the todo. Empty edit deletes the todo.
- [ ] **Step 5 — Style.** Flesh out tokens + layout. Completed state (strikethrough, muted). Hover/focus on input, button, delete, item.
- [ ] **Step 6 — Polish.** Empty state ("No todos yet"). Confirm Enter-to-add, autofocus, refocus-after-add still work.

Each step = one commit.

## Decisions log

- **Plain JS, no framework.** Per README. Vanilla event listeners + innerHTML render is plenty at this scale.
- **HTML escape on render.** XSS is real even in a personal todo app — paste in anything from a webpage and you've got attacker-controlled strings.
- **Edit state lives in the data model.** Because we re-render the whole list, DOM-only edit state would get wiped. An `editing` flag on the todo survives re-renders.
- **Items added to the bottom.** Conventional. Switch to `unshift` if "newest first" feels better in practice.

## Deferred (post-v1)

- `localStorage` persistence
- Filter (all / active / completed)
- Item count
- Clear completed
- Deploy to Netlify (mirroring score-keeper)
