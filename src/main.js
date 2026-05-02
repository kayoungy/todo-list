import './styles/index.css'
import { supabase } from './supabase.js'
import {
  todos,
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
      ${t.is_complete ? 'checked' : ''}
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

  const cls = `todo-item${t.is_complete ? ' is-done' : ''}`
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

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const text = input.value.trim()
  if (!text) {
    input.focus()
    return
  }
  const { error } = await supabase
    .from('todos')
    .insert({ text })
    .select()
  if (error) {
    console.error('Failed to add todo:', error)
    return
  }
  input.value = ''
  await loadTodos()
  input.focus()
})

list.addEventListener('change', async (e) => {
  if (!e.target.matches('[data-action="toggle"]')) return
  const id = idOf(e.target)
  const { error } = await supabase
    .from('todos')
    .update({ is_complete: e.target.checked })
    .eq('id', id)
  if (error) {
    console.error('Failed to toggle todo:', error)
    return
  }
  await loadTodos()
})

list.addEventListener('click', async (e) => {
  if (!e.target.matches('[data-action="delete"]')) return
  const id = idOf(e.target)
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('Failed to delete todo:', error)
    return
  }
  await loadTodos()
})

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

async function loadTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('id, text, is_complete, created_at')
    .order('created_at', { ascending: true })
  if (error) {
    console.error('Failed to load todos:', error)
    return
  }
  todos.length = 0
  todos.push(...data)
  render()
}

loadTodos()
