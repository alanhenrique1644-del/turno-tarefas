import { Router } from 'express';
import {
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  updateTask,
} from '../controllers/task.controller.js';

const taskRouter = Router();
taskRouter.get('/', listTasks);
taskRouter.get('/:id', getTaskById);
taskRouter.post('/', createTask);
taskRouter.patch('/:id', updateTask);
taskRouter.delete('/:id', deleteTask);

export default taskRouter;
