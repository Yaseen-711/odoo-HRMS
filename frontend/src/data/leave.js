// Initial mock leave balance allocations and requests
export const initialLeaves = [
  {
    id: 1,
    employee_id: "EMP-0003",
    leave_type: "PAID",
    start_date: "2026-08-20",
    end_date: "2026-08-25",
    remarks: "Visiting family",
    status: "APPROVED" // PENDING, APPROVED, REJECTED
  },
  {
    id: 2,
    employee_id: "EMP-0001",
    leave_type: "SICK",
    start_date: "2026-08-15",
    end_date: "2026-08-16",
    remarks: "Medical checkup",
    status: "APPROVED"
  },
  {
    id: 3,
    employee_id: "EMP-0002",
    leave_type: "PAID",
    start_date: "2026-08-28",
    end_date: "2026-08-30",
    remarks: "Weekend getaway",
    status: "PENDING"
  }
];

export const initialBalances = {
  "EMP-0001": { PAID: 15, SICK: 8, UNPAID: 10 },
  "EMP-0002": { PAID: 18, SICK: 6, UNPAID: 12 },
  "EMP-0003": { PAID: 12, SICK: 9, UNPAID: 15 },
  "EMP-0004": { PAID: 20, SICK: 10, UNPAID: 10 },
  "EMP-0005": { PAID: 16, SICK: 7, UNPAID: 8 }
};

export const leaveRepository = {
  getAll: () => {
    const list = localStorage.getItem("dayflow_mock_leaves");
    if (!list) {
      localStorage.setItem("dayflow_mock_leaves", JSON.stringify(initialLeaves));
      return initialLeaves;
    }
    return JSON.parse(list);
  },

  getByEmployee: (empId) => {
    const list = leaveRepository.getAll();
    return list.filter(l => l.employee_id === empId);
  },

  getBalances: (empId) => {
    const balances = localStorage.getItem("dayflow_mock_leave_balances");
    const parsed = balances ? JSON.parse(balances) : initialBalances;
    if (!balances) {
      localStorage.setItem("dayflow_mock_leave_balances", JSON.stringify(initialBalances));
    }
    return parsed[empId] || { PAID: 15, SICK: 8, UNPAID: 10 };
  },

  submit: (empId, data) => {
    const list = leaveRepository.getAll();
    const newId = list.length > 0 ? Math.max(...list.map(l => l.id)) + 1 : 1;

    // Calculate duration in days
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newRequest = {
      id: newId,
      employee_id: empId,
      leave_type: data.leave_type,
      start_date: data.start_date,
      end_date: data.end_date,
      remarks: data.remarks || "",
      status: "PENDING"
    };

    list.unshift(newRequest);
    localStorage.setItem("dayflow_mock_leaves", JSON.stringify(list));

    // If request is pending, it doesn't immediately subtract from balance.
    // In a real flow it subtracts on approval, but let's deduct just to show interaction
    // Or we keep balance intact. Let's keep balance intact until approved.
    
    // If the request type is On Leave, we can also simulate changing employee status
    // once approved, but we can keep employee status in the DB
    return newRequest;
  },

  decide: (id, status) => {
    const list = leaveRepository.getAll();
    const index = list.findIndex(l => l.id === Number(id));
    if (index === -1) return null;

    list[index].status = status;
    localStorage.setItem("dayflow_mock_leaves", JSON.stringify(list));

    // If approved, deduct from balance
    if (status === "APPROVED") {
      const leave = list[index];
      const balances = JSON.parse(localStorage.getItem("dayflow_mock_leave_balances") || JSON.stringify(initialBalances));
      if (balances[leave.employee_id]) {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        balances[leave.employee_id][leave.leave_type] = Math.max(0, balances[leave.employee_id][leave.leave_type] - diffDays);
        localStorage.setItem("dayflow_mock_leave_balances", JSON.stringify(balances));
      }

      // Also change employee status to "On Leave" if the leave range covers today
      const todayStr = new Date().toISOString().split('T')[0];
      if (todayStr >= leave.start_date && todayStr <= leave.end_date) {
        const employeesList = JSON.parse(localStorage.getItem("dayflow_mock_employees") || "[]");
        const empIdx = employeesList.findIndex(e => e.employee_id === leave.employee_id);
        if (empIdx !== -1) {
          employeesList[empIdx].status = "On Leave";
          localStorage.setItem("dayflow_mock_employees", JSON.stringify(employeesList));
        }
      }
    }

    return list[index];
  }
};
