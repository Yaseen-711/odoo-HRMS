// Initial mock employee directory data for Dayflow HRMS
export const initialEmployees = [
  {
    id: 1,
    employee_id: "EMP-0001",
    first_name: "Marcus",
    last_name: "Vance",
    email: "marcus.vance@dayflow.com",
    phone: "+1 (555) 019-2834",
    address: "742 Evergreen Terrace, Springfield",
    date_of_birth: "1990-05-12",
    date_of_joining: "2022-03-15",
    department: "Engineering",
    job_position: "Lead Dev",
    company: "Dayflow Inc.",
    location: "San Francisco",
    manager: "Sarah Jenkins",
    status: "Present", // "Present", "Absent", "On Leave"
    profile_picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200",
    salary: 125000
  },
  {
    id: 2,
    employee_id: "EMP-0002",
    first_name: "Sophia",
    last_name: "Martinez",
    email: "sophia.martinez@dayflow.com",
    phone: "+1 (555) 014-9384",
    address: "123 Maple Street, Oakland",
    date_of_birth: "1994-08-22",
    date_of_joining: "2023-01-10",
    department: "Design",
    job_position: "UI Designer",
    company: "Dayflow Inc.",
    location: "San Francisco",
    manager: "Sarah Jenkins",
    status: "Present",
    profile_picture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200",
    salary: 85000
  },
  {
    id: 3,
    employee_id: "EMP-0003",
    first_name: "Leah",
    last_name: "Chen",
    email: "leah.chen@dayflow.com",
    phone: "+1 (555) 017-4829",
    address: "456 Pine Ave, Berkeley",
    date_of_birth: "1988-11-30",
    date_of_joining: "2021-06-01",
    department: "Product",
    job_position: "Product Manager",
    company: "Dayflow Inc.",
    location: "San Francisco",
    manager: "Sarah Jenkins",
    status: "On Leave",
    profile_picture: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200",
    salary: 95000
  },
  {
    id: 4,
    employee_id: "EMP-0004",
    first_name: "David",
    last_name: "Kim",
    email: "david.kim@dayflow.com",
    phone: "+1 (555) 012-7384",
    address: "982 Cedar Way, San Jose",
    date_of_birth: "1992-04-05",
    date_of_joining: "2023-05-18",
    department: "QA",
    job_position: "QA Engineer",
    company: "Dayflow Inc.",
    location: "San Jose",
    manager: "Marcus Vance",
    status: "Absent",
    profile_picture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200&h=200",
    salary: 60000
  },
  {
    id: 5,
    employee_id: "EMP-0005",
    first_name: "Clara",
    last_name: "Oswald",
    email: "clara.oswald@dayflow.com",
    phone: "+1 (555) 011-8890",
    address: "555 TARDIS Road, London",
    date_of_birth: "1989-10-10",
    date_of_joining: "2024-02-01",
    department: "HR & Admin",
    job_position: "HR Specialist",
    company: "Dayflow Inc.",
    location: "London",
    manager: "Sarah Jenkins",
    status: "Present",
    profile_picture: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200&h=200",
    salary: 55000
  }
];

// Helper functions for employee management
export const employeeRepository = {
  getAll: () => {
    let list = localStorage.getItem("dayflow_mock_employees");
    if (!list) {
      localStorage.setItem("dayflow_mock_employees", JSON.stringify(initialEmployees));
      return initialEmployees;
    }
    
    // Check if the stored database lacks salary fields and reset/merge if needed
    const parsed = JSON.parse(list);
    if (parsed.length > 0 && parsed[0].salary === undefined) {
      localStorage.setItem("dayflow_mock_employees", JSON.stringify(initialEmployees));
      return initialEmployees;
    }
    
    return parsed;
  },
  
  getById: (id) => {
    const list = employeeRepository.getAll();
    return list.find(e => e.id === Number(id) || e.employee_id === id);
  },

  create: (data) => {
    const list = employeeRepository.getAll();
    const newId = list.length > 0 ? Math.max(...list.map(e => e.id)) + 1 : 1;
    const newEmpId = `EMP-${String(newId).padStart(4, "0")}`;
    
    const newEmployee = {
      id: newId,
      employee_id: newEmpId,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone || "",
      address: data.address || "",
      date_of_birth: data.date_of_birth || "",
      date_of_joining: data.date_of_joining || new Date().toISOString().split('T')[0],
      department: data.department || "Engineering",
      job_position: data.job_position || "Staff",
      company: data.company || "Dayflow Inc.",
      location: data.location || "San Francisco",
      manager: data.manager || "Sarah Jenkins",
      status: "Absent",
      profile_picture: data.profile_picture || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200&h=200"
    };

    const updatedList = [...list, newEmployee];
    localStorage.setItem("dayflow_mock_employees", JSON.stringify(updatedList));
    return newEmployee;
  },

  update: (id, data) => {
    const list = employeeRepository.getAll();
    const index = list.findIndex(e => e.id === Number(id));
    if (index === -1) return null;

    list[index] = { ...list[index], ...data };
    localStorage.setItem("dayflow_mock_employees", JSON.stringify(list));
    return list[index];
  }
};
