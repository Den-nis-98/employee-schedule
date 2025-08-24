// Настройки Supabase
const SUPABASE_URL = 'https://olzdllwagjkhnmtwcbet.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9semRsbHdhZ2praG5tdHdjYmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDc5MTQsImV4cCI6MjA3MTUyMzkxNH0.yRDXL5r72ieKXoh8FY44Xcqq8kSxdiJilo4HGvzBYhw';

// Инициализация клиента Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Глобальные переменные
let currentUser = null;
let currentDate = new Date();
let currentEvents = [];

// --- Вспомогательные функции ---
function isValidUsername(username) {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function isValidFullname(fullname) {
    return fullname.trim().length >= 3;
}

function showMessage(text, type = 'error') {
    const messageDiv = document.getElementById('auth-message');
    if (!messageDiv) return;

    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');

    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 3000);
}

function formatTime(timeString) {
    if (!timeString) return '--:--';
    return timeString.includes(':') 
        ? timeString.substring(0, 5) 
        : `${timeString}:00`;
}

// --- Авторизация ---
function showLogin() {
    document.getElementById('login-form')?.classList.remove('hidden');
    document.getElementById('register-form')?.classList.add('hidden');
}

function showRegister() {
    document.getElementById('login-form')?.classList.add('hidden');
    document.getElementById('register-form')?.classList.remove('hidden');
}

async function register() {
    const username = document.getElementById('register-username')?.value.trim();
    const fullname = document.getElementById('register-fullname')?.value.trim();
    const password = document.getElementById('register-password')?.value;
    const confirm = document.getElementById('register-confirm')?.value;

    if (!username || !fullname || !password) {
        showMessage('Заполните все поля', 'error');
        return;
    }

    if (!isValidUsername(username)) {
        showMessage('Никнейм: только латинские буквы, цифры и _ (3-20 символов)', 'error');
        return;
    }

    if (password !== confirm) {
        showMessage('Пароли не совпадают', 'error');
        return;
    }

    if (password.length < 4) {
        showMessage('Пароль должен быть не менее 4 символов', 'error');
        return;
    }

    const email = `${username}@company.com`;

    try {
        showMessage('Регистрация...', 'success');

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username, full_name: fullname } }
        });

        if (authError) {
            showMessage(authError.message.includes('already registered') 
                ? 'Никнейм уже занят' 
                : `Ошибка регистрации: ${authError.message}`, 'error');
            return;
        }

        showMessage('Регистрация успешна! Входим...', 'success');
        setTimeout(() => loginAfterRegister(username, password), 2000);
    } catch (error) {
        showMessage(`Ошибка: ${error.message}`, 'error');
    }
}

async function loginAfterRegister(username, password) {
    const email = `${username}@company.com`;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            showMessage(`Ошибка входа: ${error.message}`, 'error');
        } else {
            currentUser = data.user;
            await checkAuth();
        }
    } catch (error) {
        showMessage(`Ошибка: ${error.message}`, 'error');
    }
}

async function login() {
    const username = document.getElementById('login-username')?.value.trim();
    const password = document.getElementById('login-password')?.value;

    if (!username || !password) {
        showMessage('Заполните все поля', 'error');
        return;
    }

    const email = `${username}@company.com`;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            showMessage('Неверный никнейм или пароль', 'error');
            return;
        }

        currentUser = data.user;
        showMessage('Вход успешен!', 'success');
        await checkAuth();
    } catch (error) {
        showMessage(`Ошибка: ${error.message}`, 'error');
    }
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    showAuth();
}

async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
            currentUser = session.user;
            showApp();
            await loadUserData();
            await loadShifts();
        } else {
            showAuth();
        }
    } catch (error) {
        console.error("Ошибка получения сессии:", error);
        showAuth();
    }
}

// --- UI функции ---
function showAuth() {
    document.getElementById('auth-screen')?.classList.remove('hidden');
    document.getElementById('app')?.classList.add('hidden');
}

function showApp() {
    document.getElementById('auth-screen')?.classList.add('hidden');
    document.getElementById('app')?.classList.remove('hidden');
}

// --- Загрузка данных пользователя ---
async function loadUserData() {
    if (!currentUser) return;

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', currentUser.id)
            .single();

        if (error) throw error;

        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = profile 
                ? `${profile.full_name} (@${profile.username})`
                : `@${currentUser.email.split('@')[0]}`;
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
    }
}

// --- Календарь ---
function createDayElement(dayData) {
    const { dayNumber, additionalClass = '', dateStr = '', hasShift = false, shiftData = null } = dayData;
    
    const dayElement = document.createElement('div');
    dayElement.className = `day ${additionalClass}`;
    
    const dayNumberElement = document.createElement('div');
    dayNumberElement.className = 'day-number';
    dayNumberElement.textContent = dayNumber;

    const shiftInfo = document.createElement('div');
    shiftInfo.className = 'shift-info';
    
    if (hasShift && shiftData) {
        shiftInfo.textContent = `${formatTime(shiftData.start_time)}-${formatTime(shiftData.end_time)}`;
        shiftInfo.style.display = 'block';
    }

    dayElement.appendChild(dayNumberElement);
    dayElement.appendChild(shiftInfo);

    if (dateStr) {
        dayElement.dataset.date = dateStr;
        dayElement.addEventListener('click', () => showModal(dateStr));
    }

    return dayElement;
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();

    const currentMonthElement = document.getElementById('current-month');
    if (currentMonthElement) {
        currentMonthElement.textContent = new Date(year, month, 1).toLocaleDateString('ru-RU', {
            month: 'long',
            year: 'numeric'
        });
    }

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const calendarElement = document.getElementById('calendar');
    if (!calendarElement) return;

    calendarElement.innerHTML = '';

    // Дни предыдущего месяца
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
        const dayElement = createDayElement({
            dayNumber: prevMonthLastDay - i,
            additionalClass: 'other-month'
        });
        calendarElement.appendChild(dayElement);
    }

    // Дни текущего месяца
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const userShift = currentEvents.find(event => 
            event.date === dateStr && event.user_id === currentUser?.id
        );
        
        const isToday = year === today.getFullYear() && 
                       month === today.getMonth() && 
                       i === today.getDate();

        const dayElement = createDayElement({
            dayNumber: i,
            dateStr,
            hasShift: !!userShift,
            shiftData: userShift,
            additionalClass: isToday ? 'today' : ''
        });

        if (userShift) dayElement.classList.add('has-shift');
        if (isToday) dayElement.classList.add('today');

        calendarElement.appendChild(dayElement);
    }

    // Дни следующего месяца
    const totalCells = 42;
    const remainingCells = totalCells - (startDay + daysInMonth);
    for (let i = 1; i <= remainingCells; i++) {
        const dayElement = createDayElement({
            dayNumber: i,
            additionalClass: 'other-month'
        });
        calendarElement.appendChild(dayElement);
    }
}

// --- Загрузка смен ---
async function loadShifts() {
    if (!currentUser) return;

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    try {
        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('user_id', currentUser.id)
            .gte('date', startOfMonth.toISOString().split('T')[0])
            .lte('date', endOfMonth.toISOString().split('T')[0]);

        if (error) throw error;

        currentEvents = data || [];
        updateStats();
        renderCalendar();
    } catch (error) {
        console.error('Ошибка загрузки смен:', error);
    }
}

// Обновление статистики
function updateStats() {
    const userShifts = currentEvents.filter(event => event.user_id === currentUser?.id);
    const shiftsCountElement = document.getElementById('shifts-count');
    
    if (shiftsCountElement) {
        shiftsCountElement.textContent = userShifts.length;
    }
}

// --- Модальное окно ---
function showModal(date) {
    if (!currentUser) return;

    const selectedDateElement = document.getElementById('selected-date');
    const startTimeElement = document.getElementById('start-time');
    const endTimeElement = document.getElementById('end-time');
    const deleteShiftElement = document.getElementById('delete-shift');
    const shiftModalElement = document.getElementById('shift-modal');

    if (!selectedDateElement || !startTimeElement || !endTimeElement || !shiftModalElement) return;

    selectedDateElement.textContent = new Date(date).toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const existingShift = currentEvents.find(event =>
        event.date === date && event.user_id === currentUser.id
    );

    if (existingShift) {
        startTimeElement.value = existingShift.start_time;
        endTimeElement.value = existingShift.end_time;
        deleteShiftElement?.classList.remove('hidden');
    } else {
        startTimeElement.value = '09:00';
        endTimeElement.value = '18:00';
        deleteShiftElement?.classList.add('hidden');
    }

    shiftModalElement.dataset.date = date;
    shiftModalElement.classList.remove('hidden');
}

function hideModal() {
    document.getElementById('shift-modal')?.classList.add('hidden');
}

async function saveShiftHandler() {
    if (!currentUser) return;

    const shiftModalElement = document.getElementById('shift-modal');
    const startTimeElement = document.getElementById('start-time');
    const endTimeElement = document.getElementById('end-time');

    if (!shiftModalElement || !startTimeElement || !endTimeElement) return;

    const date = shiftModalElement.dataset.date;
    const start = startTimeElement.value;
    const end = endTimeElement.value;

    if (!start || !end) {
        showMessage('Заполните все поля', 'error');
        return;
    }

    try {
        const existingShift = currentEvents.find(event =>
            event.date === date && event.user_id === currentUser.id
        );

        if (existingShift) {
            const { error } = await supabase
                .from('shifts')
                .update({ start_time: start, end_time: end, updated_at: new Date().toISOString() })
                .eq('id', existingShift.id);

            if (error) throw error;
            showMessage('Смена обновлена', 'success');
        } else {
            const { error } = await supabase
                .from('shifts')
                .insert({
                    user_id: currentUser.id,
                    date,
                    start_time: start,
                    end_time: end,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            showMessage('Смена добавлена', 'success');
        }

        hideModal();
        await loadShifts();
    } catch (error) {
        showMessage(`Ошибка: ${error.message}`, 'error');
    }
}

async function deleteShiftHandler() {
    if (!currentUser) return;

    const shiftModalElement = document.getElementById('shift-modal');
    if (!shiftModalElement) return;

    const date = shiftModalElement.dataset.date;
    const existingShift = currentEvents.find(event =>
        event.date === date && event.user_id === currentUser.id
    );

    if (!existingShift) return;

    try {
        const { error } = await supabase
            .from('shifts')
            .delete()
            .eq('id', existingShift.id);

        if (error) throw error;

        showMessage('Смена удалена', 'success');
        hideModal();
        await loadShifts();
    } catch (error) {
        showMessage(`Ошибка удаления: ${error.message}`, 'error');
    }
}

async function loadAllShifts() {
    try {
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const { data: shifts, error } = await supabase
            .from('shifts')
            .select(`
                *,
                profile:profiles (full_name, username)
            `)
            .gte('date', startOfMonth.toISOString().split('T')[0])
            .lte('date', endOfMonth.toISOString().split('T')[0])
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) throw error;

        displayAllShifts(shifts || []);
    } catch (error) {
        console.error('Ошибка загрузки всех смен:', error);
        document.getElementById('all-shifts').innerHTML = '<p>Ошибка загрузки смен</p>';
    }
}

function displayAllShifts(shifts) {
    const container = document.getElementById('all-shifts');
    if (!container) return;

    if (!shifts.length) {
        container.innerHTML = '<p>Смены не найдены</p>';
        return;
    }

    // Группируем смены по датам
    const shiftsByDate = shifts.reduce((acc, shift) => {
        const date = shift.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(shift);
        return acc;
    }, {});

    // Создаем HTML для отображения
    let html = '';
    Object.entries(shiftsByDate).forEach(([date, dateShifts]) => {
        html += `
            <div class="date-item">
                <div class="date-header">
                    ${new Date(date).toLocaleDateString('ru-RU', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </div>
        `;

        dateShifts.forEach(shift => {
            html += `
                <div class="shift-item">
                    <strong>${shift.profile.full_name}</strong>
                    <small>${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}</small>
                </div>
            `;
        });

        html += '</div>';
    });

    container.innerHTML = html;
}

// --- Инициализация ---
function initEventListeners() {
    // Навигация по месяцам
    document.getElementById('prev-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
        loadShifts();
    });

    document.getElementById('next-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
        loadShifts();
    });

    // Модальное окно
    document.querySelector('.close')?.addEventListener('click', hideModal);
    document.getElementById('cancel-shift')?.addEventListener('click', hideModal);
    document.getElementById('save-shift')?.addEventListener('click', saveShiftHandler);
    document.getElementById('delete-shift')?.addEventListener('click', deleteShiftHandler);

    // Переключение между режимами
    document.getElementById('personal-view')?.addEventListener('click', () => {
        document.getElementById('personal-view')?.classList.add('active');
        document.getElementById('general-view')?.classList.remove('active');
        document.getElementById('general-schedule')?.classList.add('hidden');
        document.querySelector('.calendar-container')?.classList.remove('hidden');
        document.querySelector('.header h1').textContent = '📅 Мой график работы';
        loadShifts();
    });

    document.getElementById('general-view')?.addEventListener('click', () => {
        document.getElementById('general-view')?.classList.add('active');
        document.getElementById('personal-view')?.classList.remove('active');
        document.getElementById('general-schedule')?.classList.remove('hidden');
        document.querySelector('.calendar-container')?.classList.add('hidden');
        document.querySelector('.header h1').textContent = '👥 Общий график сотрудников';
        loadAllShifts();
    });

    // Авторизация
    document.getElementById('login-button')?.addEventListener('click', login);
    document.getElementById('register-button')?.addEventListener('click', register);
    document.getElementById('show-register')?.addEventListener('click', showRegister);
    document.getElementById('show-login')?.addEventListener('click', showLogin);
    document.getElementById('logout-button')?.addEventListener('click', logout);
}

// --- Запуск приложения ---
document.addEventListener('DOMContentLoaded', async function() {
    initEventListeners();
    await checkAuth();
});
