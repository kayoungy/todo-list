import './styles/index.css'
import {
  todos,
  addTodo,
  toggleTodo,
  removeTodo,
  startEdit,
  commitEdit,
  cancelEdit,
} from './todos.js'

document.querySelector('#app').innerHTML = `
  <main class="todo">
    <h1>Todo</h1>

    <form class="todo-form" id="todo-form">
      <input
        class="todo-input"
        id="todo-input"
        type="text"
        placeholder="What needs doing?"
        autocomplete="off"
      />
      <button class="todo-add" type="submit">Add</button>
    </form>

    <ul class="todo-list" id="todo-list"></ul>
    <p class="todo-empty">No todos yet</p>
  </main>
`

const form = document.querySelector('#todo-form')
const input = document.querySelector('#todo-input')
const list = document.querySelector('#todo-list')

input.focus()

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderItem(t) {
  const checkbox = `
    <input
      type="checkbox"
      class="todo-check"
      data-action="toggle"
      ${t.done ? 'checked' : ''}
    />
  `
  const deleteBtn = `
    <button
      class="todo-delete"
      type="button"
      data-action="delete"
      aria-label="Delete"
    >✕</button>
  `

  const middle = t.editing
    ? `<input class="todo-edit-input" type="text" value="${escapeHtml(t.text)}" />`
    : `<span class="todo-text">${escapeHtml(t.text)}</span>`

  const cls = `todo-item${t.done ? ' is-done' : ''}`
  return `
    <li class="${cls}" data-id="${t.id}">
      ${checkbox}
      ${middle}
      ${deleteBtn}
    </li>
  `
}

function render() {
  list.innerHTML = todos.map(renderItem).join('')
}

const idOf = (el) => el.closest('[data-id]')?.dataset.id

form.addEventListener('submit', (e) => {
  e.preventDefault()
  if (addTodo(input.value)) {
    input.value = ''
    render()
  }
  input.focus()
})

list.addEventListener('change', (e) => {
  if (!e.target.matches('[data-action="toggle"]')) return
  toggleTodo(idOf(e.target))
  render()
})

list.addEventListener('click', (e) => {
  if (!e.target.matches('[data-action="delete"]')) return
  removeTodo(idOf(e.target))
  render()
})

// Add affordance to communicate that the user can edit the todo. Double-click is not evident to some users.

list.addEventListener('dblclick', (e) => {
  if (!e.target.matches('.todo-text')) return
  const id = idOf(e.target)
  startEdit(id)
  render()
  const editInput = list.querySelector(`[data-id="${id}"] .todo-edit-input`)
  if (editInput) {
    editInput.focus()
    editInput.setSelectionRange(editInput.value.length, editInput.value.length)
  }
})

list.addEventListener('keydown', (e) => {
  if (!e.target.matches('.todo-edit-input')) return
  if (e.key === 'Enter') {
    e.preventDefault()
    commitEdit(idOf(e.target), e.target.value)
    render()
  } else if (e.key === 'Escape') {
    cancelEdit(idOf(e.target))
    render()
  }
})

list.addEventListener('focusout', (e) => {
  if (!e.target.matches('.todo-edit-input')) return
  commitEdit(idOf(e.target), e.target.value)
  render()
})

render()
