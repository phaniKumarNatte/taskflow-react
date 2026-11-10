import { useState } from "react";
import TaskList from "../components/task/TaskList";
import AddTaskButton from "../components/task/AddTaskButton";
import { useAuth } from "../hooks/useAuth.js";

// This is the first real page rendered behind ProtectedRoute (see
// routes/ProtectedRoute.jsx). Reaching it at all proves the whole Auth
// slice end-to-end: login/register issued a session, the silent
// refresh-on-reload flow re-established it, and useAuth() here is the
// SAME context every other protected page will read from.
function Dashboard() {
    const { user, logout } = useAuth();

    const [tasks, setTasks] = useState([
        "Learn React",
        "Learn Node.js",
        "Learn TypeScript"
    ]);

    function addTask() {
        console.log('add Task');
        setTasks(previousTasks => [
            ...previousTasks,
            "Learn Redux"
        ]);
    }

    return (
        <>
            <div className="flex items-center justify-between p-4">
                <h1 className="text-xl font-semibold">TaskFlow</h1>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span>{user?.name}</span>
                    <button
                        onClick={logout}
                        className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50"
                    >
                        Log out
                    </button>
                </div>
            </div>

            <TaskList tasks={tasks} />

            <AddTaskButton onAddTask={addTask} />
        </>
    );
}

export default Dashboard;