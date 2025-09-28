document.addEventListener('DOMContentLoaded', () => {
    const staffNameEl = document.getElementById('staff-name');
    const checkInOutBtn = document.getElementById('check-in-out-btn');
    const todayHoursEl = document.getElementById('today-hours');
    const monthlyHoursEl = document.getElementById('monthly-hours');
    const estimatedSalaryEl = document.getElementById('estimated-salary');

    const currentUser = Auth.getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    staffNameEl.textContent = currentUser.name;

    function updateDashboard() {
        const todaysAttendance = Auth.getTodaysAttendance(currentUser.userId);

        if (todaysAttendance && !todaysAttendance.check_out) {
            checkInOutBtn.textContent = 'Check Out';
            checkInOutBtn.style.background = 'var(--error-color)';
        } else {
            checkInOutBtn.textContent = 'Check In';
            checkInOutBtn.style.background = 'var(--success-color)';
        }

        if (todaysAttendance) {
            todayHoursEl.textContent = parseFloat(todaysAttendance.total_hours || 0).toFixed(2);
        }

        const month = new Date().toISOString().slice(0, 7);
        const monthlyAttendance = Auth.getAttendance({ staff_id: currentUser.userId, date: month });
        const monthlyHours = monthlyAttendance.reduce((sum, a) => sum + parseFloat(a.total_hours || 0), 0);
        monthlyHoursEl.textContent = monthlyHours.toFixed(2);

        const staffList = JSON.parse(localStorage.getItem('staffAccounts') || '[]');
        const staff = staffList.find(s => s.userId === currentUser.userId);
        if (staff) {
            let salary = 0;
            if (staff.salary_type === 'hourly') {
                salary = monthlyHours * (staff.salary_rate || 0);
            } else if (staff.salary_type === 'monthly') {
                const daysPresent = monthlyAttendance.length;
                const totalDays = new Date(month.split('-')[0], month.split('-')[1], 0).getDate();
                salary = (daysPresent / totalDays) * (staff.monthly_salary || 0);
            }
            estimatedSalaryEl.textContent = salary.toFixed(2);
        }
    }

    checkInOutBtn.addEventListener('click', () => {
        const todaysAttendance = Auth.getTodaysAttendance(currentUser.userId);
        if (todaysAttendance && !todaysAttendance.check_out) {
            const result = Auth.checkOut(currentUser.userId);
            alert(result.message);
        } else {
            const result = Auth.checkIn(currentUser.userId);
            alert(result.message);
        }
        updateDashboard();
    });

    updateDashboard();
});