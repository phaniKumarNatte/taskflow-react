## State represents the current condition of a component at a specific point in time

## Architecture View
Component
│
├── Props
│      (Input from Parent)
│
├── State
│      (Owned by Component)
│
└── JSX
       (UI Description)

## note: 
Props → Parent owns them.
State → The component owns it.


## The Three Ways Components Communicate

<TaskList tasks={tasks} />
Dashboard owns the tasks.
TaskList receives them.


## two way data binding 
Dashboard:

<AddTaskButton onAddTask={addTask} />

Child:

<button onClick={onAddTask}>

Notice something.

The child is not modifying the state.

## 
Parent owns data.

↓

Child receives data.

↓

Child asks parent for changes.

## userEffect
The rule to remember
useEffect(() => { ... }, []) → Runs once after the initial render.
useEffect(() => { ... }, [userId]) → Runs after the initial render and whenever userId changes.
useEffect(() => { ... }) (no dependency array) → Runs after every render.

## React compent mount and un moount
cleanup can happen before unmount too, whenever React needs to replace an old effect with a new one. 

## Phase 3 – React Performance
"My app is slow. Let me use useMemo." 

"My Node.js API is slow. Let me add Redis."


## React.memo VS useMemo
React.memo
        ↓
Should this component execute again?

----------------------------

useMemo
        ↓
Should I calculate this value again?

Notice the difference.

One optimizes components.

The other optimizes values.

## SPA
React changes the displayed component without reloading the page.

This is called a:

Single Page Application (SPA)

Express Routing decides:

Which backend function should execute?

React Router decides:

Which React component should render?

Notice the similarity.

Backend

URL

↓

Controller

Frontend

URL

↓

Component


## "Why do we use <Link> instead of <a>?"

A strong answer is:

"<Link> performs client-side navigation. It updates the URL and lets React Router render the appropriate component without reloading the page. An <a> tag performs a full page navigation, which reloads the application."

##
| Component     | Responsibility                 |
| ------------- | ------------------------------ |
| BrowserRouter | Listen to URL changes          |
| Routes        | Match the URL                  |
| Route         | Define URL → Component mapping |
| Outlet        | Render child route             |
| Link          | Navigate without page refresh  |

## What is useNavigate?

A strong answer:

"useNavigate is a React Router hook that returns a function for programmatic navigation. It allows navigation from JavaScript code, such as after a successful login, logout, or form submission."

## What is a controlled component?
In Normal html form the browser will stores the values, with controlled component react will store values using state. 

## error isolation
Only the Tasks component should fail because other modules don't depend on it.

## React Query 
React Query centralizes server state management library.
React Query is not a data fetching library.

useQuery is for reading. useMutation is for changing.

| Backend                  | React             |
| ------------------------ | ----------------- |
| Express Error Middleware | Error Boundary    |
| Auth Middleware          | ProtectedRoute    |
| Redis Cache              | React Query Cache |
| Service Layer            | Custom Hooks      |
| JWT Context              | AuthProvider      |
