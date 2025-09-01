// Script to mark Adam Jones tasks as complete
// This will be executed in the browser console

// First, let's check if the function exists and run it
if (typeof markAllTasksComplete === 'function') {
    markAllTasksComplete('Adam Jones');
    console.log('Adam Jones tasks marked as complete!');
} else {
    console.log('Function not found. Make sure the dashboard is loaded.');
}
