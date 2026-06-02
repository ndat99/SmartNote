
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

    // Extract dates from Server via API
    const ctx = (typeof _getContext === 'function') ? _getContext() : 'home';
    fetch(`/api/calendar-dates/?context=${ctx}`)
        .then(res => res.json())
        .then(data => {
            const createdDates = new Set(data.created_dates || []);
            const reminderDates = new Set(data.reminder_dates || []);
            
            // Render current month's days
            const today = new Date();
            for (let i = 1; i <= daysInMonth; i++) {
                const div = document.createElement('div');
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                
                const hasCreated = createdDates.has(dateStr);
                const hasReminder = reminderDates.has(dateStr);
                
                let html = `<span>${i}</span>`;
                if (hasCreated || hasReminder) {
                    html += `<div style="display:flex; justify-content:center; gap:3px; margin-top:2px;">`;
                    if (hasCreated) html += `<span style="width:5px;height:5px;border-radius:50%;background-color:var(--accent, #4e54c8);"></span>`;
                    if (hasReminder) html += `<span style="width:5px;height:5px;border-radius:50%;background-color:var(--warning, #f39c12);"></span>`;
                    html += `</div>`;
                }
                div.innerHTML = html;
                div.style.display = 'flex';
                div.style.flexDirection = 'column';
                div.style.alignItems = 'center';
                div.style.justifyContent = 'center';
                div.style.cursor = 'pointer';
                div.style.padding = '2px 0';
                
                // Highlight today
                if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
                    div.querySelector('span').style.backgroundColor = 'var(--accent)';
                    div.querySelector('span').style.color = '#fff';
                    div.querySelector('span').style.borderRadius = '50%';
                    div.querySelector('span').style.width = '24px';
                    div.querySelector('span').style.height = '24px';
                    div.querySelector('span').style.display = 'flex';
                    div.querySelector('span').style.alignItems = 'center';
                    div.querySelector('span').style.justifyContent = 'center';
                }

                div.classList.add('calendar-day');

                // Highlight selected date
                if (typeof _filters !== 'undefined' && _filters.calendarDate === dateStr) {
                    div.style.backgroundColor = 'var(--bg-hover, #f0f0f0)';
                    div.style.border = '1px solid var(--accent, #4e54c8)';
                    div.style.borderRadius = '8px';
                    div.classList.add('calendar-day-selected');
                }

                // Add click listener to filter
                div.addEventListener('click', () => {
                    if (typeof _filters !== 'undefined') {
                        if (_filters.calendarDate === dateStr) {
                            _filters.calendarDate = null; // Toggle off
                            div.style.backgroundColor = '';
                            div.style.border = '';
                            div.style.borderRadius = '';
                            div.classList.remove('calendar-day-selected');
                        } else {
                            // Reset any previously selected day
                            document.querySelectorAll('.calendar-day-selected').forEach(el => {
                                el.style.backgroundColor = '';
                                el.style.border = '';
                                el.style.borderRadius = '';
                                el.classList.remove('calendar-day-selected');
                            });
                            
                            _filters.calendarDate = dateStr; // Toggle on
                            div.style.backgroundColor = 'var(--bg-hover, #f0f0f0)';
                            div.style.border = '1px solid var(--accent, #4e54c8)';
                            div.style.borderRadius = '8px';
                            div.classList.add('calendar-day-selected');
                        }
                        
                        if (typeof _scheduleSearch === 'function') {
                            _scheduleSearch(true);
                        } else if (typeof _applyFilters === 'function') {
                            _applyFilters();
                        }
                        if (typeof _updateClearBtn === 'function') _updateClearBtn();
                    }
                });
                
                calendarGrid.appendChild(div);
            }
        })
        .catch(err => console.error("Error fetching calendar dates:", err));
}

window.clearCalendarSelection = function() {
    renderCalendar();
};

function changeCalendarMonth(offset) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    renderCalendar();
}

document.addEventListener('DOMContentLoaded', renderCalendar);
