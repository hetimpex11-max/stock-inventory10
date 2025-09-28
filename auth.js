// Authentication and User Management Module
const Auth = (function() {
    'use strict';

    // Initialize admin credentials if not present in localStorage
    if (!localStorage.getItem('adminCredentials')) {
        const defaultAdminCreds = {
            userId: 'seyuri.007',
            password: 'seyuri@007'
        };
        localStorage.setItem('adminCredentials', JSON.stringify(defaultAdminCreds));
    }

    // Initialize staff accounts if not exists
    if (!localStorage.getItem('staffAccounts')) {
        localStorage.setItem('staffAccounts', JSON.stringify([
            { userId: 'staff1', password: 'password1', name: 'John Doe', salary_type: 'hourly', salary_rate: 15 },
            { userId: 'staff2', password: 'password2', name: 'Jane Smith', salary_type: 'monthly', monthly_salary: 3000 }
        ]));
    }

    // Initialize product ownership tracking
    if (!localStorage.getItem('productOwnership')) {
        localStorage.setItem('productOwnership', JSON.stringify({}));
    }

    // Initialize attendance tracking
    if (!localStorage.getItem('attendance')) {
        localStorage.setItem('attendance', JSON.stringify([]));
    }

    // Initialize payroll tracking
    if (!localStorage.getItem('payroll')) {
        localStorage.setItem('payroll', JSON.stringify([]));
    }


    return {
        // Login function
        login: function(userId, password, role) {
            if (role === 'admin') {
                const ADMIN_CREDENTIALS = JSON.parse(localStorage.getItem('adminCredentials'));
                if (userId === ADMIN_CREDENTIALS.userId && password === ADMIN_CREDENTIALS.password) {
                    const adminUser = {
                        userId: userId,
                        role: 'admin',
                        name: 'System Administrator',
                        loginTime: new Date().toISOString()
                    };
                    localStorage.setItem('currentUser', JSON.stringify(adminUser));
                    this.logActivity('Admin logged in');
                    return { success: true };
                } else {
                    return { success: false, message: 'Invalid admin credentials' };
                }
            } else if (role === 'staff') {
                const staffAccounts = JSON.parse(localStorage.getItem('staffAccounts') || '[]');
                const staff = staffAccounts.find(s => s.userId === userId && s.password === password);
                
                if (staff) {
                    const staffUser = {
                        userId: staff.userId,
                        role: 'staff',
                        name: staff.name,
                        department: staff.department,
                        loginTime: new Date().toISOString()
                    };
                    localStorage.setItem('currentUser', JSON.stringify(staffUser));
                    this.logActivity(`Staff ${staff.name} logged in`);
                    return { success: true };
                } else {
                    return { success: false, message: 'Invalid staff credentials' };
                }
            }
            return { success: false, message: 'Invalid login attempt' };
        },
        
        // Logout function
        logout: function() {
            const user = this.getCurrentUser();
            if (user) {
                this.logActivity(`${user.name || user.userId} logged out`);
            }
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        },

        // Check if user is logged in
        isLoggedIn: function() {
            return localStorage.getItem('currentUser') !== null;
        },

        // Get current user
        getCurrentUser: function() {
            const userStr = localStorage.getItem('currentUser');
            return userStr ? JSON.parse(userStr) : null;
        },

        // Get current user's role
        getRole: function() {
            const user = this.getCurrentUser();
            return user ? user.role : null;
        },

        // Check if current user is admin
        isAdmin: function() {
            const user = this.getCurrentUser();
            return user && user.role === 'admin';
        },

        // Get Admin Credentials (for display)
        getAdminCredentials: function() {
            if (!this.isAdmin()) return null;
            return JSON.parse(localStorage.getItem('adminCredentials'));
        },

        // Update Admin Credentials
        updateAdminCredentials: function(newCreds) {
            if (!this.isAdmin()) {
                return { success: false, message: 'Authorization failed.' };
            }
            if (!newCreds.userId || !newCreds.password) {
                return { success: false, message: 'User ID and Password cannot be empty.'};
            }
            localStorage.setItem('adminCredentials', JSON.stringify(newCreds));
            this.logActivity(`Admin credentials updated by ${this.getCurrentUser().userId}`);
            return { success: true, message: 'Admin credentials updated successfully. Please log in again.' };
        },
        
        // Create staff account (Admin only)
        createStaffAccount: function(staffData) {
            if (!this.isAdmin()) {
                return { success: false, message: 'Only admin can create staff accounts' };
            }

            const staffAccounts = JSON.parse(localStorage.getItem('staffAccounts') || '[]');
            
            // Check if userId already exists
            if (staffAccounts.find(s => s.userId === staffData.userId)) {
                return { success: false, message: 'Staff ID already exists' };
            }

            // Validate required fields
            const requiredFields = ['userId', 'password', 'name'];
            for (let field of requiredFields) {
                if (!staffData[field]) {
                    return { success: false, message: `${field} is required` };
                }
            }

            staffAccounts.push({
                ...staffData,
                createdAt: new Date().toISOString(),
                createdBy: this.getCurrentUser().userId
            });

            localStorage.setItem('staffAccounts', JSON.stringify(staffAccounts));
            this.logActivity(`Created staff account: ${staffData.name}`);
            return { success: true, message: 'Staff account created successfully' };
        },

        // Get all staff accounts (Admin only)
        getAllStaff: function() {
            if (!this.isAdmin()) {
                return [];
            }
            return JSON.parse(localStorage.getItem('staffAccounts') || '[]');
        },

        // Delete staff account (Admin only)
        deleteStaffAccount: function(userId) {
            if (!this.isAdmin()) {
                return { success: false, message: 'Only admin can delete staff accounts' };
            }

            let staffAccounts = JSON.parse(localStorage.getItem('staffAccounts') || '[]');
            staffAccounts = staffAccounts.filter(s => s.userId !== userId);
            localStorage.setItem('staffAccounts', JSON.stringify(staffAccounts));
            this.logActivity(`Deleted staff account: ${userId}`);
            return { success: true, message: 'Staff account deleted successfully' };
        },

        // Update staff account (Admin only)
        updateStaffAccount: function(userId, updates) {
            if (!this.isAdmin()) {
                return { success: false, message: 'Only admin can update staff accounts' };
            }

            let staffAccounts = JSON.parse(localStorage.getItem('staffAccounts') || '[]');
            const index = staffAccounts.findIndex(s => s.userId === userId);
            
            if (index === -1) {
                return { success: false, message: 'Staff account not found' };
            }

            staffAccounts[index] = { ...staffAccounts[index], ...updates };
            localStorage.setItem('staffAccounts', JSON.stringify(staffAccounts));
            this.logActivity(`Updated staff account: ${userId}`);
            return { success: true, message: 'Staff account updated successfully' };
        },
        
        // Log activity
        logActivity: function(activity) {
            const logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
            logs.push({
                activity: activity,
                user: this.getCurrentUser()?.userId || 'System',
                timestamp: new Date().toISOString()
            });
            
            // Keep only last 1000 logs
            if (logs.length > 1000) {
                logs.splice(0, logs.length - 1000);
            }
            
            localStorage.setItem('activityLogs', JSON.stringify(logs));
        },

        // Get activity logs (Admin only)
        getActivityLogs: function(limit = 100) {
            if (!this.isAdmin()) {
                return [];
            }
            const logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
            return logs.slice(-limit).reverse();
        },

        // Check session validity
        checkSession: function() {
            const user = this.getCurrentUser();
            if (!user) return false;
            
            // Check if session is older than 24 hours
            const loginTime = new Date(user.loginTime);
            const now = new Date();
            const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
            
            if (hoursDiff > 24) {
                this.logout();
                return false;
            }
            
            return true;
        },

        // Get today's attendance for a staff member
        getTodaysAttendance: function(staffId) {
            const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
            const today = new Date().toISOString().slice(0, 10);
            return attendance.find(a => a.staff_id === staffId && a.date === today);
        },

        // Record check-in
        checkIn: function(staffId) {
            const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
            const today = new Date().toISOString().slice(0, 10);
            const now = new Date().toISOString();

            if (this.getTodaysAttendance(staffId)) {
                return { success: false, message: 'Already checked in today.' };
            }

            attendance.push({
                id: Date.now(),
                staff_id: staffId,
                date: today,
                check_in: now,
                check_out: null,
                total_hours: 0
            });

            localStorage.setItem('attendance', JSON.stringify(attendance));
            return { success: true, message: 'Checked in successfully.' };
        },

        // Record check-out
        checkOut: function(staffId) {
            const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
            const todaysAttendance = this.getTodaysAttendance(staffId);

            if (!todaysAttendance || todaysAttendance.check_out) {
                return { success: false, message: 'You have not checked in or have already checked out.' };
            }

            todaysAttendance.check_out = new Date().toISOString();
            const checkInTime = new Date(todaysAttendance.check_in);
            const checkOutTime = new Date(todaysAttendance.check_out);
            const hours = (checkOutTime - checkInTime) / 1000 / 60 / 60;
            todaysAttendance.total_hours = hours.toFixed(2);

            localStorage.setItem('attendance', JSON.stringify(attendance));
            return { success: true, message: 'Checked out successfully.' };
        },
        
        // Get attendance records
        getAttendance: function(filters = {}) {
            let attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
            if (filters.staff_id) {
                attendance = attendance.filter(a => a.staff_id === filters.staff_id);
            }
            if (filters.date) {
                attendance = attendance.filter(a => a.date === filters.date);
            }
            return attendance;
        },

        // Update attendance record (Admin only)
        updateAttendance: function(id, updates) {
            if (!this.isAdmin()) {
                return { success: false, message: 'Only admin can update attendance.' };
            }

            let attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
            const index = attendance.findIndex(a => a.id === id);

            if (index === -1) {
                return { success: false, message: 'Attendance record not found.' };
            }

            attendance[index] = { ...attendance[index], ...updates };
            localStorage.setItem('attendance', JSON.stringify(attendance));
            return { success: true, message: 'Attendance updated successfully.' };
        },

        // Get payroll records
        getPayroll: function(month) {
            let payroll = JSON.parse(localStorage.getItem('payroll') || '[]');
            if (month) {
                payroll = payroll.filter(p => p.month === month);
            }
            return payroll;
        },

        // Generate payroll for a month (Admin only)
        generatePayroll: function(month) {
            if (!this.isAdmin()) {
                return { success: false, message: 'Only admin can generate payroll.' };
            }

            const staffAccounts = this.getAllStaff();
            const attendance = this.getAttendance();
            let payroll = this.getPayroll(month);

            staffAccounts.forEach(staff => {
                if (!payroll.find(p => p.staff_id === staff.userId)) {
                    const staffAttendance = attendance.filter(a => a.staff_id === staff.userId && a.date.startsWith(month));
                    const total_hours = staffAttendance.reduce((sum, a) => sum + parseFloat(a.total_hours || 0), 0);
                    let salary_amount = 0;

                    if (staff.salary_type === 'hourly') {
                        salary_amount = total_hours * (staff.salary_rate || 0);
                    } else if (staff.salary_type === 'monthly') {
                        const days_present = staffAttendance.length;
                        const total_working_days = new Date(month.split('-')[0], month.split('-')[1], 0).getDate();
                        salary_amount = (days_present / total_working_days) * (staff.monthly_salary || 0);
                    }
                    
                    payroll.push({
                        id: Date.now() + Math.random(),
                        staff_id: staff.userId,
                        month: month,
                        total_hours: total_hours.toFixed(2),
                        salary_amount: salary_amount.toFixed(2),
                        status: 'Pending'
                    });
                }
            });

            localStorage.setItem('payroll', JSON.stringify(payroll));
            return { success: true, message: 'Payroll generated successfully.' };
        },
        
        // Update payroll status (Admin only)
        updatePayrollStatus: function(id, status) {
            if (!this.isAdmin()) {
                return { success: false, message: 'Only admin can update payroll.' };
            }

            let payroll = JSON.parse(localStorage.getItem('payroll') || '[]');
            const index = payroll.findIndex(p => p.id === id);
            
            if (index === -1) {
                return { success: false, message: 'Payroll record not found.' };
            }

            payroll[index].status = status;
            localStorage.setItem('payroll', JSON.stringify(payroll));
            return { success: true, message: `Payroll status updated to ${status}.` };
        }
    };
})();

// Auto-check session on page load
if (typeof window !== 'undefined' && window.location.pathname.endsWith('login.html') === false) {
    window.addEventListener('load', function() {
        if (!Auth.isLoggedIn() || !Auth.checkSession()) {
            if(Auth.isLoggedIn()) alert('Your session has expired. Please login again.');
            Auth.logout();
        }
    });
}