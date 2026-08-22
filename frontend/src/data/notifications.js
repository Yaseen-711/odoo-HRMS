export const initialNotifications = [
  {
    id: 1,
    title: "New Leave Request",
    message: "Leah Chen has requested 3 days of PAID leave.",
    time: "2 hours ago",
    read: false,
    type: "leave"
  },
  {
    id: 2,
    title: "Clock-in Alert",
    message: "Sophia Martinez checked in late today (09:05 AM).",
    time: "4 hours ago",
    read: false,
    type: "attendance"
  },
  {
    id: 3,
    title: "System Update",
    message: "Security patches and performance optimizations applied.",
    time: "1 day ago",
    read: true,
    type: "system"
  }
];

export const notificationRepository = {
  getAll: () => {
    const list = localStorage.getItem("dayflow_mock_notifications");
    if (!list) {
      localStorage.setItem("dayflow_mock_notifications", JSON.stringify(initialNotifications));
      return initialNotifications;
    }
    return JSON.parse(list);
  },

  getUnreadCount: () => {
    const list = notificationRepository.getAll();
    return list.filter(n => !n.read).length;
  },

  markAllAsRead: () => {
    const list = notificationRepository.getAll();
    const updated = list.map(n => ({ ...n, read: true }));
    localStorage.setItem("dayflow_mock_notifications", JSON.stringify(updated));
    return updated;
  },

  markAsRead: (id) => {
    const list = notificationRepository.getAll();
    const index = list.findIndex(n => n.id === Number(id));
    if (index !== -1) {
      list[index].read = true;
      localStorage.setItem("dayflow_mock_notifications", JSON.stringify(list));
    }
    return list;
  },

  add: (title, message, type = "system") => {
    const list = notificationRepository.getAll();
    const newNotification = {
      id: list.length > 0 ? Math.max(...list.map(n => n.id)) + 1 : 1,
      title,
      message,
      time: "Just now",
      read: false,
      type
    };
    list.unshift(newNotification);
    localStorage.setItem("dayflow_mock_notifications", JSON.stringify(list));
    return newNotification;
  }
};
