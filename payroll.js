document.addEventListener('DOMContentLoaded', () => {
    const payrollMonthInput = document.getElementById('payroll-month');
    const generatePayrollBtn = document.getElementById('generate-payroll-btn');
    const payrollTbody = document.getElementById('payroll-tbody');
    const exportPayrollBtn = document.getElementById('export-payroll-btn');

    function loadPayroll() {
        const month = payrollMonthInput.value;
        if (!month) return;

        let payroll = Auth.getPayroll(month);
        const staffList = Auth.getAllStaff();

        payrollTbody.innerHTML = payroll.map(p => {
            const staff = staffList.find(s => s.userId === p.staff_id);
            return `
                <tr>
                    <td>${staff ? staff.name : p.staff_id}</td>
                    <td>${p.total_hours}</td>
                    <td>$${p.salary_amount}</td>
                    <td>${p.status}</td>
                    <td>
                        ${p.status === 'Pending' ? `<button class="btn btn-sm btn-success" onclick="updateStatus(${p.id}, 'Approved')">Approve</button>` : ''}
                        ${p.status === 'Approved' ? `<button class="btn btn-sm btn-primary" onclick="updateStatus(${p.id}, 'Paid')">Mark as Paid</button>` : ''}
                        <button class="btn btn-sm btn-secondary" onclick="downloadSlip(${p.id})">Slip</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.updateStatus = function(id, status) {
        const result = Auth.updatePayrollStatus(id, status);
        alert(result.message);
        loadPayroll();
    };

    window.downloadSlip = function(id) {
        const { jsPDF } = window.jspdf;
        const payroll = Auth.getPayroll().find(p => p.id === id);
        const staff = Auth.getAllStaff().find(s => s.userId === payroll.staff_id);

        if (payroll && staff) {
            const doc = new jsPDF();
            doc.text("Salary Slip", 20, 20);
            doc.text(`Month: ${payroll.month}`, 20, 30);
            doc.text(`Staff: ${staff.name}`, 20, 40);
            doc.text(`Total Hours: ${payroll.total_hours}`, 20, 50);
            doc.text(`Salary Amount: $${payroll.salary_amount}`, 20, 60);
            doc.text(`Status: ${payroll.status}`, 20, 70);
            doc.save(`Salary-Slip-${staff.name}-${payroll.month}.pdf`);
        }
    };

    generatePayrollBtn.addEventListener('click', () => {
        const month = payrollMonthInput.value;
        if (!month) {
            alert('Please select a month.');
            return;
        }
        const result = Auth.generatePayroll(month);
        alert(result.message);
        loadPayroll();
    });
    
    exportPayrollBtn.addEventListener('click', () => {
        const month = payrollMonthInput.value;
        if (!month) {
            alert('Please select a month to export.');
            return;
        }
        const payroll = Auth.getPayroll(month);
        const staffList = Auth.getAllStaff();
        const data = payroll.map(p => {
            const staff = staffList.find(s => s.userId === p.staff_id);
            return {
                'Staff Name': staff ? staff.name : p.staff_id,
                'Total Hours': p.total_hours,
                'Salary Amount': p.salary_amount,
                'Status': p.status
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payroll");
        XLSX.writeFile(wb, `Payroll-${month}.xlsx`);
    });

    payrollMonthInput.addEventListener('change', loadPayroll);
    payrollMonthInput.value = new Date().toISOString().slice(0, 7);
    loadPayroll();
});