import express from 'express';
import { body, validationResult } from 'express-validator';
import Task from '../models/Task.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all tasks for user
router.get('/', protect, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create task
router.post('/', [
  protect,
  body('title').notEmpty().withMessage('Title is required'),
  body('deadline').isISO8601().withMessage('Valid deadline is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = new Task({
      ...req.body,
      user: req.user._id
    });

    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
// Update task
router.put('/:id', [
  protect,
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('deadline').optional().isISO8601().withMessage('Valid deadline is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    Object.assign(task, req.body);
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
// Get tasks with filtering and sorting
router.get('/', protect, async (req, res) => {
  try {
    const { status, priority, search, sortBy, sortOrder = 'desc' } = req.query;
    
    let filter = { user: req.user._id };
    
    // Apply filters
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Apply sorting
    let sortOptions = {};
    if (sortBy === 'deadline') {
      sortOptions.deadline = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'priority') {
      sortOptions.priority = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.createdAt = -1;
    }
    
    const tasks = await Task.find(filter).sort(sortOptions);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
export default router;