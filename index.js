const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const toggleCompletedBtn = document.getElementById('toggle-completed');
const sortSelect = document.getElementById('sort-select');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const emptyMessage = document.getElementById('empty-message');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let showCompleted = false;
let darkMode = JSON.parse(localStorage.getItem('darkMode')) || false;

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function saveDarkMode(value) {
  localStorage.setItem('darkMode', JSON.stringify(value));
}

function renderTasks() {
  taskList.innerHTML = '';

  let filteredTasks = showCompleted ? tasks : tasks.filter(t => !t.completed);

  if (filteredTasks.length === 0) {
    emptyMessage.hidden = false;
  } else {
    emptyMessage.hidden = true;
  }

  // Sort tasks
  const sortBy = sortSelect.value;
  filteredTasks.sort((a, b) => {
    if (sortBy === 'priority') {
      const prioMap = { High: 3, Medium: 2, Low: 1, '': 0 };
      return prioMap[b.priority] - prioMap[a.priority];
    }
    if (sortBy === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    // createdAt default
    return a.createdAt - b.createdAt;
  });

  // Pinned tasks always on top
  filteredTasks.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  filteredTasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task';
    if (task.completed) li.classList.add('completed');
    li.setAttribute('draggable', task.pinned ? 'true' : 'false');
    li.dataset.id = task.id;

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.title = 'Mark complete';
    checkbox.addEventListener('change', () => toggleComplete(task.id));
    li.appendChild(checkbox);

    // Content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'task-content';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'task-title';
    titleSpan.textContent = task.title;
    contentDiv.appendChild(titleSpan);

    // Priority (optional)
    if (task.priority) {
      const prioSpan = document.createElement('span');
      prioSpan.className = 'task-priority priority-' + task.priority;
      prioSpan.textContent = task.priority;
      contentDiv.appendChild(prioSpan);
    }

    // Due date (optional)
    if (task.dueDate) {
      const dueSpan = document.createElement('span');
      dueSpan.className = 'due-date';
      dueSpan.textContent = `Due: ${task.dueDate}`;
      contentDiv.appendChild(dueSpan);
    }

    li.appendChild(contentDiv);

    // Buttons container
    const btnsDiv = document.createElement('div');
    btnsDiv.className = 'task-buttons';

    // Pin button
    const pinBtn = document.createElement('button');
    pinBtn.className = 'pin-btn';
    pinBtn.title = task.pinned ? "Unpin task" : "Pin task";
    pinBtn.innerHTML = task.pinned ? '📌' : '📍';
    pinBtn.classList.toggle('pinned', task.pinned);
    pinBtn.addEventListener('click', () => togglePin(task.id));
    btnsDiv.appendChild(pinBtn);

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.title = "Edit task";
    editBtn.innerHTML = '✏️';
    editBtn.addEventListener('click', () => editTask(task.id));
    btnsDiv.appendChild(editBtn);

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.title = "Delete task";
    delBtn.innerHTML = '🗑️';
    delBtn.addEventListener('click', () => deleteTask(task.id));
    btnsDiv.appendChild(delBtn);

    li.appendChild(btnsDiv);

    taskList.appendChild(li);
  });

  enableDragAndDrop();
}

taskForm.addEventListener('submit', e => {
  e.preventDefault();
  const title = taskForm['task-title'].value.trim();
  if (!title) return alert("Task title can't be empty!");

  const newTask = {
    id: Date.now(),
    title,
    priority: taskForm['task-priority'].value,
    dueDate: taskForm['task-date'].value,
    completed: false,
    pinned: false,
    createdAt: Date.now()
  };

  tasks.push(newTask);
  saveTasks();
  renderTasks();
  taskForm.reset();
});

function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  if (task.completed) {
    // unmark completed, show popup warning
    task.completed = false;
    alert(`⚠️ Task "${task.title}" is marked as NOT completed yet!`);
  } else {
    task.completed = true;
  }
  saveTasks();
  renderTasks();
}

function togglePin(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.pinned = !task.pinned;
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  if (!confirm("Are you sure to delete this task?")) return;
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

toggleCompletedBtn.addEventListener('click', () => {
  showCompleted = !showCompleted;
  toggleCompletedBtn.textContent = showCompleted ? 'Hide Completed' : 'Show Completed';
  renderTasks();
});

sortSelect.addEventListener('change', () => renderTasks());

function applyDarkMode(isDark) {
  document.body.classList.toggle('dark', isDark);
  darkModeToggle.textContent = isDark ? '☀️' : '🌙';
  saveDarkMode(isDark);
}

darkModeToggle.addEventListener('click', () => {
  darkMode = !darkMode;
  applyDarkMode(darkMode);
});

// Drag & Drop for pinned tasks
function enableDragAndDrop() {
  const draggables = document.querySelectorAll('.task[draggable="true"]');
  let draggedItem = null;

  draggables.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      if (!draggedItem) return;
      draggedItem.classList.remove('dragging');
      draggedItem = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedItem) return;

      const bounding = item.getBoundingClientRect();
      const offset = bounding.y + bounding.height / 2;
      const after = e.clientY > offset;

      if (draggedItem === item) return;

      const idDragged = Number(draggedItem.dataset.id);
      const idTarget = Number(item.dataset.id);

      const draggedTask = tasks.find(t => t.id === idDragged);
      const targetTask = tasks.find(t => t.id === idTarget);

      // Only reorder pinned tasks relative to pinned tasks
      if (!draggedTask.pinned || !targetTask.pinned) return;

      tasks = tasks.filter(t => t.id !== idDragged);
      const targetIndex = tasks.findIndex(t => t.id === idTarget);
      if (after) {
        tasks.splice(targetIndex + 1, 0, draggedTask);
      } else {
        tasks.splice(targetIndex, 0, draggedTask);
      }
      saveTasks();
      renderTasks();
    });
  });
}

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const newTitle = prompt("Edit Task Title:", task.title);
  if (newTitle === null) return; // Cancelled
  if (newTitle.trim() === "") {
    alert("Task title cannot be empty.");
    return;
  }

  const newPriority = prompt("Edit Priority (High, Medium, Low or leave blank):", task.priority || "");
  const allowedPrio = ["High", "Medium", "Low", ""];
  if (!allowedPrio.includes(newPriority)) {
    alert("Invalid priority. Use High, Medium, Low or leave blank.");
    return;
  }

  const newDueDate = prompt("Edit Due Date (YYYY-MM-DD) or leave blank:", task.dueDate || "");
  if (newDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(newDueDate)) {
    alert("Invalid date format. Use YYYY-MM-DD or leave blank.");
    return;
  }

  task.title = newTitle.trim();
  task.priority = newPriority;
  task.dueDate = newDueDate || "";
  saveTasks();
  renderTasks();
}

// Initial render and dark mode apply
applyDarkMode(darkMode);
renderTasks();
