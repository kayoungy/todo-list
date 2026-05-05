import './styles/index.css'
import { supabase } from './supabase.js'
import { todos } from './todos.js'

document.querySelector('#app').innerHTML = `
  <main class="todo">
    <header class="todo-header">
      <h1 class="todo-date-heading">
        <span id="todo-date"></span>
        <span class="todo-title-label">todos</span>
      </h1>
      <div class="auth-trigger" id="auth-trigger"></div>
    </header>

    <section class="auth" id="auth"></section>

    <div class="todo-draft">
      <span class="todo-draft-check" aria-hidden="true"></span>
      <input
        class="todo-draft-input"
        id="todo-draft-input"
        type="text"
        placeholder=" "
        autocomplete="off"
      />
    </div>

    <ul class="todo-list" id="todo-list"></ul>
    <p class="todo-empty">No todos yet</p>
  </main>
`

const now = new Date()
const locale = undefined
const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(now)
const monthDay = new Intl.DateTimeFormat(locale, {
  month: 'long',
  day: 'numeric',
}).format(now)
document.querySelector('#todo-date').textContent = `${weekdayShort}, ${monthDay}`

const draftInput = document.querySelector('#todo-draft-input')
const list = document.querySelector('#todo-list')
const auth = document.querySelector('#auth')
const authTrigger = document.querySelector('#auth-trigger')

draftInput.focus()

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

  const cls = `todo-item${t.is_complete ? ' is-done' : ''}`
  return `
    <li class="${cls}" data-id="${t.id}">
      ${checkbox}
      <input
        class="todo-text-input"
        type="text"
        value="${escapeHtml(t.text)}"
        data-action="edit"
      />
      ${deleteBtn}
    </li>
  `
}

function render() {
  const sorted = [...todos].sort((a, b) => {
    if (a.is_complete !== b.is_complete) {
      return Number(a.is_complete) - Number(b.is_complete)
    }
    return (a.position ?? 0) - (b.position ?? 0)
  })
  list.innerHTML = sorted.map(renderItem).join('')
}

const idOf = (el) => el.closest('[data-id]')?.dataset.id

draftInput.addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return
  e.preventDefault()
  const text = draftInput.value.trim()
  if (!text) return
  const maxPosition = todos.reduce((m, t) => Math.max(m, t.position ?? 0), 0)
  const { error } = await supabase
    .from('todos')
    .insert({ text, position: maxPosition + 1 })
    .select()
  if (error) {
    console.error('Failed to add todo:', error)
    return
  }
  draftInput.value = ''
  await loadTodos()
  draftInput.focus()
})

list.addEventListener('change', async (e) => {
  if (!e.target.matches('[data-action="toggle"]')) return
  const id = idOf(e.target)
  const isComplete = e.target.checked
  const update = { is_complete: isComplete }
  if (isComplete) {
    const maxCompletedPos = todos
      .filter((t) => t.is_complete && String(t.id) !== String(id))
      .reduce((m, t) => Math.max(m, t.position ?? 0), 0)
    update.position = maxCompletedPos + 1
  }
  const { error } = await supabase
    .from('todos')
    .update(update)
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

list.addEventListener('change', async (e) => {
  if (!e.target.matches('[data-action="edit"]')) return
  const id = idOf(e.target)
  const newText = e.target.value.trim()
  if (!newText) {
    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (error) {
      console.error('Failed to delete todo:', error)
      return
    }
    await loadTodos()
    return
  }
  const { error } = await supabase
    .from('todos')
    .update({ text: newText })
    .eq('id', id)
  if (error) {
    console.error('Failed to update todo:', error)
    return
  }
  await loadTodos()
})

list.addEventListener('keydown', (e) => {
  if (!e.target.matches('[data-action="edit"]')) return
  if (e.key === 'Enter') {
    e.preventDefault()
    e.target.blur()
  } else if (e.key === 'Escape') {
    const id = idOf(e.target)
    const current = todos.find((t) => String(t.id) === String(id))
    if (current) e.target.value = current.text
    e.target.blur()
  }
})

let dragId = null

list.addEventListener('mousedown', (e) => {
  const li = e.target.closest('.todo-item')
  if (!li) return
  const interactive = e.target.closest('input, button')
  li.draggable = !interactive
})

list.addEventListener('dragstart', (e) => {
  const li = e.target.closest('.todo-item')
  if (!li) return
  dragId = li.dataset.id
  e.dataTransfer.effectAllowed = 'move'
  li.classList.add('is-dragging')
})

list.addEventListener('dragend', () => {
  list.querySelectorAll('.is-dragging, .is-drop-above, .is-drop-below').forEach((el) => {
    el.classList.remove('is-dragging', 'is-drop-above', 'is-drop-below')
  })
  dragId = null
})

function sameCategorySorted() {
  const dragged = todos.find((t) => String(t.id) === String(dragId))
  if (!dragged) return null
  return [...todos]
    .filter((t) => t.is_complete === dragged.is_complete)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

list.addEventListener('dragover', (e) => {
  if (!dragId) return
  const li = e.target.closest('.todo-item')
  if (!li || li.dataset.id === dragId) return
  const target = todos.find((t) => String(t.id) === String(li.dataset.id))
  const dragged = todos.find((t) => String(t.id) === String(dragId))
  if (!target || !dragged || target.is_complete !== dragged.is_complete) {
    list.querySelectorAll('.is-drop-above, .is-drop-below').forEach((el) => {
      el.classList.remove('is-drop-above', 'is-drop-below')
    })
    return
  }
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  const rect = li.getBoundingClientRect()
  const above = e.clientY < rect.top + rect.height / 2
  list.querySelectorAll('.is-drop-above, .is-drop-below').forEach((el) => {
    el.classList.remove('is-drop-above', 'is-drop-below')
  })
  li.classList.add(above ? 'is-drop-above' : 'is-drop-below')
})

list.addEventListener('drop', async (e) => {
  if (!dragId) return
  e.preventDefault()
  const targetLi = e.target.closest('.todo-item')
  if (!targetLi || targetLi.dataset.id === dragId) return

  const target = todos.find((t) => String(t.id) === String(targetLi.dataset.id))
  const dragged = todos.find((t) => String(t.id) === String(dragId))
  if (!target || !dragged || target.is_complete !== dragged.is_complete) return

  const group = sameCategorySorted()
  if (!group) return
  const targetIdx = group.findIndex((t) => String(t.id) === String(target.id))
  if (targetIdx === -1) return

  const rect = targetLi.getBoundingClientRect()
  const above = e.clientY < rect.top + rect.height / 2

  let newPosition
  if (above) {
    const prev = group[targetIdx - 1]
    if (prev && String(prev.id) === String(dragId)) return
    newPosition = prev ? (prev.position + target.position) / 2 : target.position - 1
  } else {
    const next = group[targetIdx + 1]
    if (next && String(next.id) === String(dragId)) return
    newPosition = next ? (target.position + next.position) / 2 : target.position + 1
  }

  const { error } = await supabase
    .from('todos')
    .update({ position: newPosition })
    .eq('id', dragId)
  if (error) {
    console.error('Failed to reorder:', error)
    return
  }
  await loadTodos()
})

let user = null
let authMode = 'signup'
let authExpanded = false

function renderAuth() {
  if (!user) {
    authTrigger.innerHTML = ''
    auth.innerHTML = ''
    return
  }

  if (!user.is_anonymous) {
    authTrigger.innerHTML = `
      <span class="auth-email">${escapeHtml(user.email)}</span>
      <button class="auth-signout" type="button" id="auth-signout">Sign out</button>
    `
    auth.innerHTML = ''
    return
  }

  if (!authExpanded) {
    const nudge = todos.length >= 3 ? ' is-nudge' : ''
    authTrigger.innerHTML = `
      <button class="auth-trigger-btn${nudge}" type="button" id="auth-expand">Save your list</button>
    `
    auth.innerHTML = ''
    return
  }

  const isSignUp = authMode === 'signup'
  authTrigger.innerHTML = `
    <button class="auth-trigger-btn" type="button" id="auth-collapse">Cancel</button>
  `
  auth.innerHTML = `
    <h2 class="auth-title">${isSignUp ? 'Create an account to save your list across devices' : 'Sign in'}</h2>
    <form class="auth-form" id="auth-form">
      <input class="auth-input" id="auth-email" type="email" placeholder="Email" autocomplete="email" required />
      <input class="auth-input" id="auth-password" type="password" placeholder="Password" autocomplete="${isSignUp ? 'new-password' : 'current-password'}" required />
      <button class="auth-submit" type="submit">${isSignUp ? 'Sign up' : 'Sign in'}</button>
    </form>
    <button class="auth-toggle" type="button" id="auth-toggle">
      ${isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
    </button>
    <p class="auth-status" id="auth-status"></p>
  `
}

document.addEventListener('click', async (e) => {
  if (e.target.id === 'auth-expand') {
    authExpanded = true
    authMode = 'signup'
    renderAuth()
    document.querySelector('#auth-email')?.focus()
  } else if (e.target.id === 'auth-collapse') {
    authExpanded = false
    renderAuth()
  } else if (e.target.id === 'auth-toggle') {
    authMode = authMode === 'signup' ? 'signin' : 'signup'
    renderAuth()
    document.querySelector('#auth-email')?.focus()
  } else if (e.target.id === 'auth-signout') {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Failed to sign out:', error)
  }
})

auth.addEventListener('submit', async (e) => {
  if (e.target.id !== 'auth-form') return
  e.preventDefault()
  const email = document.querySelector('#auth-email').value
  const password = document.querySelector('#auth-password').value
  const status = document.querySelector('#auth-status')

  if (authMode === 'signup') {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      status.textContent = error.message
      return
    }
    if (!data.session) {
      status.textContent = 'Check your email to confirm your account.'
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      status.textContent = error.message
    }
  }
})

async function loadTodos() {
  if (!user) return
  const { data, error } = await supabase
    .from('todos')
    .select('id, text, is_complete, created_at, position')
    .eq('user_id', user.id)
    .order('position', { ascending: true })
  if (error) {
    console.error('Failed to load todos:', error)
    return
  }
  todos.length = 0
  todos.push(...data)
  render()
  renderAuth()
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') return

  setTimeout(async () => {
    if (session) {
      user = session.user
      if (!user.is_anonymous) authExpanded = false
      renderAuth()
      await loadTodos()
      return
    }

    user = null
    authExpanded = false
    const { error } = await supabase.auth.signInAnonymously()
    if (error) console.error('Failed to sign in anonymously:', error)
  }, 0)
})
