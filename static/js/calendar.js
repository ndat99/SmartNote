
// ---------------------------------------
//  CALENDAR WIDGET
// ---------------------------------------
let currentCalendarDate = new Date();

function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const monthYearDisplay = document.getElementById('calendarMonthYear');
    if (!calendarGrid || !monthYearDisplay) return;

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // Update Header
    monthYearDisplay.textContent = `Tháng ${month + 1}, ${year}`;

    // Clear previous days (keep the day names)
    const dayNames = Array.from(calendarGrid.children).slice(0, 7);
    calendarGrid.innerHTML = '';
    dayNames.forEach(el => calendarGrid.appendChild(el));

    // Get first day of month (0 = Sunday, 1 = Monday)
    const firstDay = new Date(year, month, 1).getDay();
    // Convert so Monday is 0 and Sunday is 6
    const firstDayOffset = (firstDay === 0) ? 6 : firstDay - 1;

    // Get number of days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get number of days in previous month
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Render previous month's trailing days
    for (let i = 0; i < firstDayOffset; i++) {
        const div = document.createElement('div');
        div.className = 'text-muted opacity-50';
        div.textContent = daysInPrevMonth - firstDayOffset + i + 1;
        calendarGrid.appendChild(div);
    }

    // Render current month's days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.textContent = i;
        
        // Highlight today
        if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
            div.style.backgroundColor = 'var(--accent)';
            div.style.color = '#fff';
            div.style.borderRadius = '50%';
            div.style.width = '24px';
            div.style.height = '24px';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'center';
            div.style.margin = '0 auto';
        }
        
        calendarGrid.appendChild(div);
    }
}

function changeCalendarMonth(offset) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    renderCalendar();
}

document.addEventListener('DOMContentLoaded', renderCalendar);
