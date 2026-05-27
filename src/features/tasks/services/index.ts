export * as remindersRepository from "../repositories/remindersRepository";
export * as taskActivitiesRepository from "../repositories/taskActivitiesRepository";
export * as taskNotificationsRepository from "../repositories/taskNotificationsRepository";
export * as tasksRepository from "../repositories/tasksRepository";

import * as remindersRepository from "../repositories/remindersRepository";
import * as taskActivitiesRepository from "../repositories/taskActivitiesRepository";
import * as taskNotificationsRepository from "../repositories/taskNotificationsRepository";
import * as tasksRepository from "../repositories/tasksRepository";

export const taskServices = {
  reminders: remindersRepository,
  activities: taskActivitiesRepository,
  notifications: taskNotificationsRepository,
  tasks: tasksRepository,
};

export default taskServices;

