const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mapTaskForFrontend = (task) => ({
    ...task,
    assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.name, email: task.assignee.email } : null,
    createdBy: task.createdBy ? { id: task.createdBy.id, name: task.createdBy.name, email: task.createdBy.email } : null
});

const getTasks = async (req, res) => {
    try {
        const tasks = await prisma.task.findMany({
            include: {
                assignee: { select: { id: true, name: true, email: true } },
                createdBy: { select: { id: true, name: true, email: true } }
            },
            orderBy: [
                { startDate: 'asc' },
                { tentativeEndDate: 'asc' }
            ]
        });
        res.json(tasks.map(mapTaskForFrontend));
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching tasks', error: error.message });
    }
};

const createTask = async (req, res) => {
    const { title, track, description, comments, startDate, tentativeEndDate, priority, assignee, assignedBy } = req.body;

    if (!title || !track || !startDate || !tentativeEndDate || !assignee) {
        return res.status(400).json({ message: 'Please provide required fields' });
    }

    try {
        const task = await prisma.task.create({
            data: {
                title,
                track,
                description,
                comments,
                assignedBy,
                startDate: new Date(startDate),
                tentativeEndDate: new Date(tentativeEndDate),
                priority,
                status: 'Not Started',
                assignee: { connect: { id: assignee } },
                createdBy: { connect: { id: req.user.id } }
            },
            include: {
                assignee: { select: { id: true, name: true, email: true } },
                createdBy: { select: { id: true, name: true, email: true } }
            }
        });

        await prisma.activityLog.create({
            data: {
                taskId: task.id,
                userId: req.user.id,
                action: 'Created',
                details: `Task was created by ${req.user.name}. Priority: ${priority}`,
            }
        });

        res.status(201).json(mapTaskForFrontend(task));
    } catch (err) {
        res.status(500).json({ message: 'Failed to create task', error: err.message });
        console.log(err.message)
    }
};

const updateTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const task = await prisma.task.findUnique({ where: { id: taskId } });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (req.user.role === 'MEMBER' && task.assigneeId !== req.user.id) {
            return res.status(403).json({ message: 'User not authorized to update this task' });
        }

        let updatedData = { ...req.body };
        // Clean up Mongoose fields that might crash Prisma
        delete updatedData._id;
        delete updatedData.id;
        delete updatedData.createdBy;
        if (updatedData.assignee) {
            const assigneeId = typeof updatedData.assignee === 'string' ? updatedData.assignee : updatedData.assignee.id;
            updatedData.assignee = { connect: { id: assigneeId } };
        }

        if (updatedData.startDate) updatedData.startDate = new Date(updatedData.startDate);
        if (updatedData.tentativeEndDate) updatedData.tentativeEndDate = new Date(updatedData.tentativeEndDate);
        if (updatedData.actualEndDate) updatedData.actualEndDate = new Date(updatedData.actualEndDate);

        if (updatedData.status === 'Completed' && task.status !== 'Completed') {
            updatedData.actualEndDate = new Date();
        }

        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: updatedData,
            include: {
                assignee: { select: { id: true, name: true, email: true } },
                createdBy: { select: { id: true, name: true, email: true } }
            }
        });

        let details = 'Task was updated.';
        if (updatedData.status && updatedData.status !== task.status) {
            details = `Status changed from ${task.status} to ${updatedData.status}.`;
        }

        await prisma.activityLog.create({
            data: {
                taskId: taskId,
                userId: req.user.id,
                action: 'Updated',
                details: details,
            }
        });

        res.json(mapTaskForFrontend(updatedTask));
    } catch (err) {
        res.status(500).json({ message: 'Failed to update task', error: err.message });
    }
};

const deleteTask = async (req, res) => {
    try {
        const task = await prisma.task.findUnique({ where: { id: req.params.id } });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await prisma.task.delete({ where: { id: req.params.id } });

        res.json({ id: req.params.id, message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete task', error: err.message });
    }
};

const getTaskActivityLog = async (req, res) => {
    try {
        const logs = await prisma.activityLog.findMany({
            where: { taskId: req.params.id },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching activity logs' });
    }
};

const bulkImportTasks = async (req, res) => {
    try {
        const tasksToImport = req.body;

        if (!Array.isArray(tasksToImport) || tasksToImport.length === 0) {
            return res.status(400).json({ message: 'Please provide an array of tasks' });
        }

        const tasksWithCreator = tasksToImport.map(task => ({
            ...task,
            startDate: new Date(task.startDate),
            tentativeEndDate: new Date(task.tentativeEndDate),
            createdById: req.user.id,
            assigneeId: typeof task.assignee === 'string' ? task.assignee : task.assignee.id
        }));

        // Remove nested objects
        tasksWithCreator.forEach(t => { delete t.assignee; delete t.createdBy; delete t._id; delete t.id; });

        await prisma.task.createMany({ data: tasksWithCreator });
        res.status(201).json({ message: 'Imported successfully' });
    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ message: 'Failed to import tasks', error: error.message });
    }
};

module.exports = {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    getTaskActivityLog,
    bulkImportTasks,
};
