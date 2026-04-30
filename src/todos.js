export const todos = []

export function addTodo(text) {
  const trimmed = text.trim()
  if (!trimmed) return false
  todos.push({
    id: crypto.randomUUID(),
    text: trimmed,
    done: false,
  })
  return true
}

export function toggleTodo(id) {
  const t = todos.find((x) => x.id === id)
  if (t) t.done = !t.done
}

export function removeTodo(id) {
  const i = todos.findIndex((x) => x.id === id)
  if (i >= 0) todos.splice(i, 1)
}

export function startEdit(id) {
  const t = todos.find((x) => x.id === id)
  if (t) t.editing = true
}

export function commitEdit(id, text) {
  const t = todos.find((x) => x.id === id)
  if (!t || !t.editing) return
  const trimmed = text.trim()
  if (!trimmed) {
    removeTodo(id)
    return
  }
  t.text = trimmed
  t.editing = false
}

export function cancelEdit(id) {
  const t = todos.find((x) => x.id === id)
  if (t) t.editing = false
}
