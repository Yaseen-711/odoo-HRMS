// Initial mock attendance history records
export const initialAttendance = [
  {
    id: 1,
    employee_id: "EMP-0001",
    date: "2026-08-22",
    check_in: "08:58 AM",
    check_out: "05:15 PM",
    duration: "8h 17m",
    status: "Present"
  },
  {
    id: 2,
    employee_id: "EMP-0002",
    date: "2026-08-22",
    check_in: "09:05 AM",
    check_out: "06:00 PM",
    duration: "8h 55m",
    status: "Present"
  },
  {
    id: 3,
    employee_id: "EMP-0004",
    date: "2026-08-22",
    check_in: "--",
    check_out: "--",
    duration: "0h 0m",
    status: "Absent"
  },
  {
    id: 4,
    employee_id: "EMP-0001",
    date: "2026-08-21",
    check_in: "09:00 AM",
    check_out: "05:30 PM",
    duration: "8h 30m",
    status: "Present"
  },
  {
    id: 5,
    employee_id: "EMP-0002",
    date: "2026-08-21",
    check_in: "09:12 AM",
    check_out: "06:10 PM",
    duration: "8h 58m",
    status: "Present"
  },
  {
    id: 6,
    employee_id: "EMP-0005",
    date: "2026-08-21",
    check_in: "08:45 AM",
    check_out: "05:00 PM",
    duration: "8h 15m",
    status: "Present"
  }
];

export const attendanceRepository = {
  getAll: () => {
    const list = localStorage.getItem("dayflow_mock_attendance");
    if (!list) {
      localStorage.setItem("dayflow_mock_attendance", JSON.stringify(initialAttendance));
      return initialAttendance;
    }
    return JSON.parse(list);
  },

  getByEmployee: (empId) => {
    const list = attendanceRepository.getAll();
    return list.filter(a => a.employee_id === empId);
  },

  getTodayStatus: (empId) => {
    const list = attendanceRepository.getAll();
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecord = list.find(a => a.employee_id === empId && a.date === todayStr);
    
    if (!todayRecord) {
      return { status: "Absent", check_in: "--", check_out: "--", duration: "0h 0m" };
    }
    return todayRecord;
  },

  checkIn: (empId) => {
    const list = attendanceRepository.getAll();
    const todayStr = new Date().toISOString().split('T')[0];
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Check if there is already a record for today
    const index = list.findIndex(a => a.employee_id === empId && a.date === todayStr);
    
    const newRecord = {
      id: list.length > 0 ? Math.max(...list.map(a => a.id)) + 1 : 1,
      employee_id: empId,
      date: todayStr,
      check_in: timeStr,
      check_out: "--",
      duration: "Active",
      status: "Present"
    };

    if (index !== -1) {
      list[index] = { ...list[index], check_in: timeStr, check_out: "--", duration: "Active", status: "Present" };
    } else {
      list.unshift(newRecord);
    }

    localStorage.setItem("dayflow_mock_attendance", JSON.stringify(list));
    
    // Also update employee status to "Present"
    const employeesList = JSON.parse(localStorage.getItem("dayflow_mock_employees") || "[]");
    const empIdx = employeesList.findIndex(e => e.employee_id === empId);
    if (empIdx !== -1) {
      employeesList[empIdx].status = "Present";
      localStorage.setItem("dayflow_mock_employees", JSON.stringify(employeesList));
    }

    return index !== -1 ? list[index] : newRecord;
  },

  checkOut: (empId) => {
    const list = attendanceRepository.getAll();
    const todayStr = new Date().toISOString().split('T')[0];
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const index = list.findIndex(a => a.employee_id === empId && a.date === todayStr);
    if (index === -1) return null; // Can't checkout without checkin

    const checkInTime = list[index].check_in;
    let durationStr = "8h 00m";
    if (checkInTime && checkInTime !== "--") {
      try {
        const todayDate = new Date();
        const [inHourMin, inAmpm] = checkInTime.split(' ');
        let [inHour, inMin] = inHourMin.split(':').map(Number);
        if (inAmpm === "PM" && inHour !== 12) inHour += 12;
        if (inAmpm === "AM" && inHour === 12) inHour = 0;

        const inDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), inHour, inMin);
        const diffMs = now - inDate;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        durationStr = `${diffHrs}h ${diffMins}m`;
      } catch (err) {
        console.error("Error calculating duration", err);
      }
    }

    list[index].check_out = timeStr;
    list[index].duration = durationStr;
    list[index].status = "Present"; // retains Present state

    localStorage.setItem("dayflow_mock_attendance", JSON.stringify(list));
    return list[index];
  }
};
