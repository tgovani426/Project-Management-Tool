const express = require('express');
const router = express.Router();
const { getTasks, createTask, updateTask, deleteTask, bulkImportTasks, getTaskActivityLog } = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/roleMiddleware');

router.route('/')
    .get(protect, getTasks)
    .post(protect, createTask);

router.route('/bulk-import')
    .post(protect, admin, bulkImportTasks);

router.route('/:id')
    .put(protect, updateTask)
    .delete(protect, admin, deleteTask);

router.route('/:id/activity')
    .get(protect, getTaskActivityLog);

module.exports = router;
