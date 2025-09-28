// Admin Panel Logic
document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isAdmin()) {
        // Redirect if not admin
        alert('Access Denied. Admins only.');
        window.location.href = 'index.html';
        return;
    }

    // Elements for Admin Creds
    const adminCredsForm = document.getElementById('admin-creds-form');
    const newAdminIdInput = document.getElementById('new-admin-id');
    const newAdminPasswordInput = document.getElementById('new-admin-password');

    // Elements for Staff Management
    const staffTbody = document.getElementById('staff-tbody');
    const logsTbody = document.getElementById('logs-tbody');
    const staffModal = document.getElementById('staff-modal');
    const staffForm = document.getElementById('staff-form');
    const modalTitle = document.getElementById('modal-title');
    const hiddenStaffId = document.getElementById('staff-id-hidden');

    // Dashboard elements
    const totalStaffEl = document.getElementById('total-staff');
    const totalHoursEl = document.getElementById('total-hours');
    const totalPayrollEl = document.getElementById('total-payroll');
    
    // --- New Functionality ---
    function loadAdminCredentials() {
        const creds = Auth.getAdminCredentials();
        if (creds) {
            newAdminIdInput.value = creds.userId;
            newAdminPasswordInput.value = creds.password;
        }
    }

    function handleAdminCredsUpdate(e) {
        e.preventDefault();
        const newCreds = {
            userId: newAdminIdInput.value.trim(),
            password: newAdminPasswordInput.value.trim()
        };

        const result = Auth.updateAdminCredentials(newCreds);
        alert(result.message);
        if (result.success) {
            Auth.logout();
        }
    }

    function loadDashboard() {
        const staff = Auth.getAllStaff();
        totalStaffEl.textContent = staff.length;

        const month = new Date().toISOString().slice(0, 7);
        const attendance = Auth.getAttendance();
        const monthlyAttendance = attendance.filter(a => a.date.startsWith(month));
        
        const totalHours = monthlyAttendance.reduce((sum, a) => sum + parseFloat(a.total_hours || 0), 0);
        totalHoursEl.textContent = totalHours.toFixed(2);
        
        const payroll = Auth.getPayroll(month);
        const totalPayroll = payroll.reduce((sum, p) => sum + parseFloat(p.salary_amount || 0), 0);
        totalPayrollEl.textContent = `$${totalPayroll.toFixed(2)}`;
    }

    // --- Existing Functionality ---
    function loadStaff() {
        const staffList = Auth.getAllStaff();
        staffTbody.innerHTML = staffList.map(staff => `
            <tr>
                <td>${staff.name}</td>
                <td>${staff.userId}</td>
                <td>${staff.department || 'N/A'}</td>
                <td>
                    <button class="btn" onclick="openEditModal('${staff.userId}')">Edit</button>
                    <button class="btn btn-danger" onclick="deleteStaff('${staff.userId}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    function loadLogs() {
        const logs = Auth.getActivityLogs();
        logsTbody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.user}</td>
                <td>${log.activity}</td>
            </tr>
        `).join('');
    }

    function openAddModal() {
        modalTitle.textContent = 'Add Staff';
        staffForm.reset();
        hiddenStaffId.value = '';
        staffModal.classList.add('show');
    }

    window.openEditModal = function(userId) {
        const staffList = Auth.getAllStaff();
        const staff = staffList.find(s => s.userId === userId);
        if (staff) {
            modalTitle.textContent = 'Edit Staff';
            hiddenStaffId.value = staff.userId;
            staffForm.name.value = staff.name;
            staffForm.userId.value = staff.userId;
            staffForm.userId.disabled = true; // Cannot edit userId
            staffForm.password.value = staff.password;
            staffModal.classList.add('show');
        }
    }

    function closeModal() {
        staffModal.classList.remove('show');
        staffForm.userId.disabled = false;
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        const staffData = {
            name: staffForm.name.value,
            userId: staffForm.userId.value,
            password: staffForm.password.value,
        };

        let result;
        if (hiddenStaffId.value) { // Update
            result = Auth.updateStaffAccount(hiddenStaffId.value, staffData);
        } else { // Create
            result = Auth.createStaffAccount(staffData);
        }

        if (result.success) {
            loadStaff();
            closeModal();
        } else {
            alert(`Error: ${result.message}`);
        }
    }

    window.deleteStaff = function(userId) {
        if (confirm(`Are you sure you want to delete staff member ${userId}?`)) {
            Auth.deleteStaffAccount(userId);
            loadStaff();
        }
    }

    // --- Tab Switching ---
    window.openTab = function(evt, tabName) {
        let i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tab-content");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        tablinks = document.getElementsByClassName("tab-button");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
    }

    // --- Initial Load and Event Listeners ---
    loadAdminCredentials();
    loadDashboard();
    loadStaff();
    loadLogs();

    adminCredsForm.addEventListener('submit', handleAdminCredsUpdate);
    document.getElementById('add-staff-btn').addEventListener('click', openAddModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    staffForm.addEventListener('submit', handleFormSubmit);
});